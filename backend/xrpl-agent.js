import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import xrpl from "xrpl";

const root = dirname(fileURLToPath(import.meta.url));
const WALLET_FILE = join(root, "data", "xrpl-wallets.json");
const NETWORK = process.env.XRPL_NETWORK || "testnet";
const WSS = process.env.XRPL_WSS || "wss://s.altnet.rippletest.net:51233";
const EXPLORER = "https://testnet.xrpl.org";

export const CAUSES = [
  {
    id: "free-food",
    name: "Free Food pantry",
    description: "Helps keep snack and meal events stocked.",
  },
  {
    id: "emergency",
    name: "Student emergency aid",
    description: "Short-term help when a student is in a pinch.",
  },
  {
    id: "events",
    name: "Campus event support",
    description: "Covers supplies for student-posted events.",
  },
];

export const POLICY = {
  agentId: "campus-connect-donation-agent",
  agentName: "Campus Donation Agent",
  parentAgentId: "campus-connect-treasury-agent",
  network: NETWORK,
  minXrp: 0.2,
  maxPerTxXrp: 10,
  dailyCapXrp: 25,
  currency: "XRP",
  kya: {
    kind: "agent",
    campusOnly: true,
    allowlistedDestinationsOnly: true,
    humanMustBeSignedIn: true,
    memoForbidsLinks: true,
  },
};

const RESERVE_BUFFER_XRP = 2;

let clientPromise = null;
let walletsPromise = null;
let sendLock = Promise.resolve();

function withSendLock(task) {
  const run = sendLock.then(task, task);
  sendLock = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function loadWalletsFile() {
  if (!existsSync(WALLET_FILE)) return null;
  try {
    return JSON.parse(readFileSync(WALLET_FILE, "utf8"));
  } catch {
    return null;
  }
}

function saveWalletsFile(store) {
  mkdirSync(dirname(WALLET_FILE), { recursive: true });
  writeFileSync(WALLET_FILE, JSON.stringify(store, null, 2));
}

async function getClient() {
  if (clientPromise) {
    const existing = await clientPromise;
    if (existing.isConnected()) return existing;
    clientPromise = null;
  }
  clientPromise = (async () => {
    const client = new xrpl.Client(WSS);
    await client.connect();
    return client;
  })();
  try {
    return await clientPromise;
  } catch (error) {
    clientPromise = null;
    throw error;
  }
}

async function fundedWallet(client, existing) {
  if (existing?.seed) {
    const wallet = xrpl.Wallet.fromSeed(existing.seed);
    try {
      const info = await client.request({
        command: "account_info",
        account: wallet.classicAddress,
        ledger_index: "validated",
      });
      const xrp = Number(xrpl.dropsToXrp(info.result.account_data.Balance));
      if (xrp < 5) await client.fundWallet(wallet);
      return wallet;
    } catch {
      await client.fundWallet(wallet);
      return wallet;
    }
  }
  const funded = await client.fundWallet();
  return funded.wallet;
}

async function ensureWallets() {
  if (walletsPromise) return walletsPromise;
  walletsPromise = (async () => {
    const client = await getClient();
    const stored = loadWalletsFile() ?? {};
    const treasury = await fundedWallet(client, stored.treasury);
    const donationAgent = await fundedWallet(client, stored.donationAgent);
    const causes = {};
    for (const cause of CAUSES) {
      const prior = stored.causes?.[cause.id];
      causes[cause.id] = prior?.seed ? xrpl.Wallet.fromSeed(prior.seed) : xrpl.Wallet.generate();
    }
    const next = {
      network: NETWORK,
      treasury: { address: treasury.classicAddress, seed: treasury.seed },
      donationAgent: { address: donationAgent.classicAddress, seed: donationAgent.seed },
      causes: Object.fromEntries(
        CAUSES.map((cause) => [
          cause.id,
          { address: causes[cause.id].classicAddress, seed: causes[cause.id].seed },
        ]),
      ),
    };
    saveWalletsFile(next);

    for (const cause of CAUSES) {
      const dest = causes[cause.id];
      try {
        await client.request({
          command: "account_info",
          account: dest.classicAddress,
          ledger_index: "validated",
        });
      } catch {
        await submitPayment(client, treasury, dest.classicAddress, 2, "Activate campus fund");
      }
    }
    return { treasury, donationAgent, causes, public: publicWallets(next) };
  })();
  try {
    return await walletsPromise;
  } catch (error) {
    walletsPromise = null;
    throw error;
  }
}

function publicWallets(store) {
  return {
    network: store.network,
    treasury: store.treasury.address,
    donationAgent: store.donationAgent.address,
    causes: Object.fromEntries(
      Object.entries(store.causes).map(([id, row]) => [id, row.address]),
    ),
  };
}

async function accountXrp(client, address) {
  const info = await client.request({
    command: "account_info",
    account: address,
    ledger_index: "validated",
  });
  return Number(xrpl.dropsToXrp(info.result.account_data.Balance));
}

function memoBlob(text) {
  return Buffer.from(text, "utf8").toString("hex").toUpperCase();
}

async function submitPayment(client, wallet, destination, amountXrp, memo) {
  const tx = {
    TransactionType: "Payment",
    Account: wallet.classicAddress,
    Destination: destination,
    Amount: xrpl.xrpToDrops(String(amountXrp)),
    Memos: memo
      ? [
          {
            Memo: {
              MemoType: memoBlob("campus-donate"),
              MemoData: memoBlob(memo.slice(0, 80)),
            },
          },
        ]
      : undefined,
  };
  const prepared = await client.autofill(tx);
  const signed = wallet.sign(prepared);
  const result = await client.submitAndWait(signed.tx_blob);
  const meta = result.result.meta;
  const code = typeof meta === "object" && meta ? meta.TransactionResult : result.result.engine_result;
  if (code !== "tesSUCCESS") {
    throw new Error(`XRPL payment failed (${code ?? "unknown"}).`);
  }
  return {
    hash: result.result.hash,
    ledgerIndex: result.result.ledger_index,
    feeDrops: prepared.Fee,
    explorerUrl: `${EXPLORER}/transactions/${result.result.hash}`,
  };
}

export function utcDay(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function dailySpentXrp(db, userId) {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(CAST(amount_xrp AS REAL)), 0) AS total
         FROM donation_audit
        WHERE user_id = ? AND decision = 'settled' AND substr(created_at, 1, 10) = ?`,
    )
    .get(userId, utcDay());
  return Number(row?.total ?? 0);
}

export function evaluateDonationPolicy({ user, causeId, amountXrp, memo, spentTodayXrp }) {
  const checks = [];
  const deny = (code, message) => ({
    allowed: false,
    code,
    message,
    checks,
    policy: POLICY,
  });

  if (!user?.id) {
    checks.push({ id: "identity", ok: false, label: "Signed-in campus student" });
    return deny("identity", "Sign in so the donation agent can attach a campus identity.");
  }
  checks.push({ id: "identity", ok: true, label: "Signed-in campus student" });

  const cause = CAUSES.find((item) => item.id === causeId);
  if (!cause) {
    checks.push({ id: "destination", ok: false, label: "Allowlisted campus fund" });
    return deny("destination", "That fund is not on the campus allowlist.");
  }
  checks.push({ id: "destination", ok: true, label: `Allowlisted: ${cause.name}` });

  if (typeof memo === "string" && /https?:\/\/|<|>|javascript:/i.test(memo)) {
    checks.push({ id: "compliance", ok: false, label: "Memo has no links or markup" });
    return deny("compliance", "Memos cannot include links or markup.");
  }
  checks.push({ id: "compliance", ok: true, label: "Memo has no links or markup" });

  if (!Number.isFinite(amountXrp) || amountXrp < POLICY.minXrp) {
    checks.push({ id: "amount", ok: false, label: `At least ${POLICY.minXrp} XRP` });
    return deny("amount", `Gifts start at ${POLICY.minXrp} XRP.`);
  }
  if (amountXrp > POLICY.maxPerTxXrp) {
    checks.push({ id: "limit", ok: false, label: `Under ${POLICY.maxPerTxXrp} XRP per gift` });
    return deny("limit", `Campus policy caps a single gift at ${POLICY.maxPerTxXrp} XRP.`);
  }
  checks.push({ id: "limit", ok: true, label: `Under ${POLICY.maxPerTxXrp} XRP per gift` });

  if (spentTodayXrp + amountXrp > POLICY.dailyCapXrp) {
    checks.push({
      id: "daily",
      ok: false,
      label: `Under ${POLICY.dailyCapXrp} XRP per student per day`,
    });
    return deny(
      "limit",
      `Daily campus gift cap is ${POLICY.dailyCapXrp} XRP. You've used ${spentTodayXrp.toFixed(2)} XRP today.`,
    );
  }
  checks.push({
    id: "daily",
    ok: true,
    label: `${Math.max(0, POLICY.dailyCapXrp - spentTodayXrp).toFixed(2)} XRP remaining today`,
  });

  return { allowed: true, code: "allowed", message: "Policy passed. Agent will settle on XRPL Testnet.", checks, policy: POLICY, cause };
}

export function publicDonateStatus(db, user) {
  const stored = loadWalletsFile();
  const spentTodayXrp = user ? dailySpentXrp(db, user.id) : 0;
  return {
    policy: POLICY,
    causes: CAUSES,
    wallets: stored
      ? publicWallets(stored)
      : { network: NETWORK, treasury: null, donationAgent: null, causes: {} },
    spentTodayXrp,
    remainingTodayXrp: Math.max(0, POLICY.dailyCapXrp - spentTodayXrp),
    explorer: EXPLORER,
    agent: {
      id: POLICY.agentId,
      parentId: POLICY.parentAgentId,
      name: POLICY.agentName,
      credential: "KYA · campus donation agent · allowlisted destinations only",
    },
  };
}

export function listDonationAudit(db, userId, limit = 8) {
  return db
    .prepare(
      `SELECT id, cause_id, amount_xrp, destination, decision, reason, payment_hash, funding_hash,
              explorer_url, created_at
         FROM donation_audit
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT ?`,
    )
    .all(userId, limit);
}

export async function settleDonation(db, { user, causeId, amountXrp, memo }) {
  const spentTodayXrp = dailySpentXrp(db, user.id);
  const verdict = evaluateDonationPolicy({ user, causeId, amountXrp, memo, spentTodayXrp });
  const insert = db.prepare(
    `INSERT INTO donation_audit
       (user_id, cause_id, amount_xrp, destination, decision, reason, policy_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  if (!verdict.allowed) {
    insert.run(
      user.id,
      causeId ?? "",
      String(amountXrp ?? ""),
      "",
      "denied",
      verdict.message,
      JSON.stringify(verdict),
      new Date().toISOString(),
    );
    return { ...verdict, audit: "denied" };
  }

  return withSendLock(async () => {
    const ready = await ensureWallets();
    const client = await getClient();
    const destination = ready.causes[causeId].classicAddress;
    const agentBalance = await accountXrp(client, ready.donationAgent.classicAddress);
    let funding = null;
    if (agentBalance < amountXrp + RESERVE_BUFFER_XRP) {
      const topUp = Math.max(10, amountXrp + 5);
      funding = await submitPayment(
        client,
        ready.treasury,
        ready.donationAgent.classicAddress,
        topUp,
        "Treasury funds donation agent",
      );
    }
    const payment = await submitPayment(
      client,
      ready.donationAgent,
      destination,
      amountXrp,
      memo?.trim() || `Campus gift · ${verdict.cause.name}`,
    );
    db.prepare(
      `INSERT INTO donation_audit
         (user_id, cause_id, amount_xrp, destination, decision, reason, policy_json,
          funding_hash, payment_hash, ledger_index, explorer_url, created_at)
       VALUES (?, ?, ?, ?, 'settled', ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      user.id,
      causeId,
      String(amountXrp),
      destination,
      "Agent settled on XRPL Testnet",
      JSON.stringify({ ...verdict, funding, payment }),
      funding?.hash ?? null,
      payment.hash,
      payment.ledgerIndex ?? null,
      payment.explorerUrl,
      new Date().toISOString(),
    );
    return {
      allowed: true,
      code: "settled",
      message: `The campus agent sent ${amountXrp} XRP to ${verdict.cause.name}.`,
      checks: verdict.checks,
      policy: POLICY,
      cause: verdict.cause,
      destination,
      payment,
      funding,
      explorerUrl: payment.explorerUrl,
    };
  });
}
