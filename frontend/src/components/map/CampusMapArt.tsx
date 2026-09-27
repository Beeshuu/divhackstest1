import { MAP_ART, PLAN } from "@/lib/geo";

/**
 * Illustrated Morningside Heights campus — same soft buildings, lawns and
 * trees as the original map, laid out on the real street grid (110th–122nd,
 * Riverside Drive to Morningside Drive) so pins match Google and Apple Maps.
 */

const VIEW_W = MAP_ART.width;
const VIEW_H = MAP_ART.height;

const X = {
  riverside: pctX(PLAN.x.riverside),
  claremont: pctX(PLAN.x.claremont),
  broadway: pctX(PLAN.x.broadway),
  amsterdam: pctX(PLAN.x.amsterdam),
  morningside: pctX(PLAN.x.morningside),
};

const Y = {
  122: pctY(PLAN.y[122]),
  121: pctY(PLAN.y[121]),
  120: pctY(PLAN.y[120]),
  119: pctY(PLAN.y[119]),
  118: pctY(PLAN.y[118]),
  116: pctY(PLAN.y[116]),
  115: pctY(PLAN.y[115]),
  114: pctY(PLAN.y[114]),
  113: pctY(PLAN.y[113]),
  112: pctY(PLAN.y[112]),
  111: pctY(PLAN.y[111]),
  110: pctY(PLAN.y[110]),
};

const AVE = 11;
const BRD = 15;
const ST = 9;

function pctX(pct: number) {
  return (pct / 100) * VIEW_W;
}

function pctY(pct: number) {
  return (pct / 100) * VIEW_H;
}

interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  alt?: boolean;
  rx?: number;
}

/** Inset a building inside the block bounded by two avenues and two streets. */
function inset(west: number, east: number, north: number, south: number, pad = 8, alt = false): Block {
  return {
    x: west + pad,
    y: north + pad,
    w: east - west - pad * 2,
    h: south - north - pad * 2,
    alt,
  };
}

function slice(block: Block, left: number, top: number, width: number, height: number, alt = block.alt): Block {
  return {
    x: block.x + block.w * left,
    y: block.y + block.h * top,
    w: block.w * width,
    h: block.h * height,
    alt,
  };
}

const rE = X.riverside + AVE;
const cW = X.claremont - AVE;
const cE = X.claremont + AVE;
const bW = X.broadway - BRD;
const bE = X.broadway + BRD;
const aW = X.amsterdam - AVE;
const aE = X.amsterdam + AVE;
const mW = X.morningside - AVE;
const mE = X.morningside + AVE;

const s = (n: keyof typeof Y, dir: "n" | "s") => Y[n] + (dir === "s" ? ST : -ST);

const barnard = inset(cE, bW, s(120, "s"), s(116, "n"));
const barnardWest = inset(rE, cW, s(119, "s"), s(116, "n"));
const mainN = inset(bE, aW, s(120, "s"), s(118, "n"));
const lowQuad = inset(bE, aW, s(118, "s"), s(116, "n"));
const southRow = inset(bE, aW, s(116, "s"), s(115, "n"));
const butlerRow = inset(bE, aW, s(115, "s"), s(114, "n"));
const eastMid = inset(aE, mW, s(118, "s"), s(116, "n"));
const eastSouth = inset(aE, mW, s(116, "s"), s(114, "n"));

const CAMPUS_BUILDINGS: Block[] = [
  { x: X.riverside - 62, y: 14, w: 48, h: 42, alt: true, rx: 16 },
  { x: X.riverside - 58, y: Y[122] + 14, w: 44, h: 72, alt: true },

  // Teachers College / 120–122
  slice(inset(bE, aW, s(122, "s"), s(121, "n")), 0.02, 0.12, 0.28, 0.76),
  slice(inset(bE, aW, s(122, "s"), s(121, "n")), 0.34, 0.08, 0.3, 0.82),
  slice(inset(bE, aW, s(122, "s"), s(121, "n")), 0.68, 0.14, 0.3, 0.72),
  inset(bE, aW, s(121, "s"), s(120, "n")),

  // Science / northwest campus 118–120
  slice(mainN, 0.02, 0.04, 0.22, 0.42),
  slice(mainN, 0.28, 0.02, 0.28, 0.46),
  slice(mainN, 0.6, 0.04, 0.18, 0.42),
  slice(mainN, 0.82, 0.06, 0.16, 0.4),
  slice(mainN, 0.02, 0.54, 0.2, 0.42),
  slice(mainN, 0.26, 0.52, 0.2, 0.44),
  slice(mainN, 0.5, 0.5, 0.16, 0.46),
  slice(mainN, 0.7, 0.52, 0.28, 0.44),

  // Low Library quad 116–118
  slice(lowQuad, 0.02, 0.08, 0.16, 0.38),
  slice(lowQuad, 0.2, 0.18, 0.12, 0.28),
  { ...slice(lowQuad, 0.36, 0.1, 0.28, 0.42), rx: 10 },
  slice(lowQuad, 0.68, 0.16, 0.12, 0.32),
  slice(lowQuad, 0.82, 0.12, 0.16, 0.36),
  slice(lowQuad, 0.02, 0.56, 0.2, 0.38),
  slice(lowQuad, 0.26, 0.62, 0.18, 0.3),
  slice(lowQuad, 0.56, 0.58, 0.2, 0.34),
  slice(lowQuad, 0.8, 0.56, 0.18, 0.36),

  // South of College Walk
  slice(southRow, 0.02, 0.1, 0.18, 0.8),
  slice(southRow, 0.22, 0.08, 0.16, 0.84),
  slice(southRow, 0.82, 0.1, 0.16, 0.8),
  slice(butlerRow, 0.02, 0.08, 0.2, 0.84),
  { ...slice(butlerRow, 0.28, 0.04, 0.36, 0.9), rx: 8 },
  slice(butlerRow, 0.68, 0.1, 0.14, 0.8),
  slice(butlerRow, 0.84, 0.08, 0.14, 0.84),

  // Residences 110–114
  inset(bE, aW, s(114, "s"), s(113, "n")),
  inset(bE, aW, s(113, "s"), s(112, "n"), 8, true),
  slice(inset(bE, aW, s(112, "s"), s(111, "n"), 8, true), 0.02, 0.1, 0.46, 0.8, true),
  slice(inset(bE, aW, s(112, "s"), s(111, "n"), 8, true), 0.52, 0.12, 0.46, 0.76, true),
  inset(bE, aW, s(111, "s"), s(110, "n"), 8, true),

  // Barnard
  slice(barnardWest, 0.04, 0.04, 0.92, 0.28),
  slice(barnardWest, 0.04, 0.38, 0.92, 0.28),
  slice(barnardWest, 0.04, 0.72, 0.92, 0.24),
  slice(barnard, 0.06, 0.04, 0.88, 0.18),
  slice(barnard, 0.08, 0.28, 0.84, 0.22),
  slice(barnard, 0.06, 0.56, 0.4, 0.38),
  slice(barnard, 0.52, 0.56, 0.42, 0.38),

  // West of Broadway, south of Barnard
  inset(cE, bW, s(116, "s"), s(115, "n"), 8, true),
  inset(cE, bW, s(115, "s"), s(114, "n"), 8, true),
  inset(cE, bW, s(114, "s"), s(113, "n"), 8, true),
  inset(cE, bW, s(113, "s"), s(112, "n"), 8, true),
  inset(cE, bW, s(112, "s"), s(111, "n"), 8, true),

  // Claremont / Riverside north
  inset(cE, bW, s(122, "s"), s(121, "n"), 8, true),
  inset(cE, bW, s(121, "s"), s(120, "n")),
  inset(rE, cW, s(121, "s"), s(120, "n"), 8, true),
  inset(rE, cW, s(120, "s"), s(119, "n"), 8, true),

  // East of Amsterdam
  inset(aE, mW, s(122, "s"), s(121, "n"), 8, true),
  inset(aE, mW, s(121, "s"), s(120, "n"), 8, true),
  inset(aE, mW, s(120, "s"), s(119, "n")),
  inset(aE, mW, s(119, "s"), s(118, "n")),
  slice(eastMid, 0.04, 0.06, 0.58, 0.42),
  slice(eastMid, 0.68, 0.1, 0.28, 0.36),
  slice(eastMid, 0.06, 0.56, 0.5, 0.38),
  slice(eastSouth, 0.06, 0.08, 0.88, 0.4),
  slice(eastSouth, 0.08, 0.56, 0.84, 0.38),
  inset(aE, mW, s(114, "s"), s(113, "n"), 8, true),
];

const CATHEDRAL = {
  ...inset(aE + 18, mW - 6, s(113, "s") + 6, s(110, "n") - 10),
  rx: 14,
};

const LAWNS: Block[] = [
  { x: 0, y: 0, w: X.riverside - 6, h: VIEW_H },
  { x: X.morningside + 8, y: 0, w: VIEW_W - X.morningside - 8, h: VIEW_H },
  slice(southRow, 0.4, 0.12, 0.4, 0.76),
  { x: lowQuad.x + lowQuad.w * 0.34, y: lowQuad.y + lowQuad.h * 0.54, w: lowQuad.w * 0.32, h: lowQuad.h * 0.38 },
  { x: barnard.x + 10, y: barnard.y + barnard.h * 0.3, w: barnard.w - 20, h: 22 },
  { x: CATHEDRAL.x - 16, y: CATHEDRAL.y - 18, w: CATHEDRAL.w + 32, h: CATHEDRAL.h + 36 },
  { x: X.riverside - 40, y: 8, w: 52, h: 46 },
];

const WALKS: Block[] = [
  { x: bE, y: Y[116] - 7, w: aW - bE, h: 14 },
  { x: bE + 8, y: lowQuad.y + lowQuad.h * 0.52, w: aW - bE - 16, h: 8 },
  { x: (X.broadway + X.amsterdam) / 2 - 7, y: Y[118] + 4, w: 14, h: Y[114] - Y[118] - 8 },
];

function buildTrees() {
  let seed = 20260410;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  const lanes: Array<[number, number, number, number]> = [
    [18, 20, 18, VIEW_H - 20],
    [X.riverside - 22, 30, X.riverside - 22, VIEW_H - 24],
    [X.riverside + 20, 40, X.riverside + 20, VIEW_H - 30],
    [X.claremont - 18, 80, X.claremont - 18, Y[110] - 10],
    [X.claremont + 18, 80, X.claremont + 18, Y[110] - 10],
    [X.broadway - 22, 40, X.broadway - 22, VIEW_H - 20],
    [X.broadway + 22, 40, X.broadway + 22, VIEW_H - 20],
    [X.amsterdam - 20, 40, X.amsterdam - 20, VIEW_H - 20],
    [X.amsterdam + 20, 40, X.amsterdam + 20, VIEW_H - 20],
    [X.morningside - 20, 30, X.morningside - 20, VIEW_H - 20],
    [X.morningside + 22, 20, X.morningside + 22, VIEW_H - 16],
    [VIEW_W - 16, 24, VIEW_W - 16, VIEW_H - 20],
    [40, Y[122], X.morningside - 10, Y[122]],
    [40, Y[120], X.morningside - 10, Y[120]],
    [X.broadway + 16, Y[116], X.amsterdam - 16, Y[116]],
    [X.broadway + 20, Y[115], X.amsterdam - 20, Y[115]],
    [X.broadway + 24, Y[114], X.amsterdam - 24, Y[114]],
    [80, Y[110], X.amsterdam - 10, Y[110]],
    [lowQuad.x + 20, lowQuad.y + lowQuad.h * 0.7, lowQuad.x + lowQuad.w - 20, lowQuad.y + lowQuad.h * 0.7],
    [CATHEDRAL.x - 8, CATHEDRAL.y - 10, CATHEDRAL.x + CATHEDRAL.w + 8, CATHEDRAL.y - 10],
    [CATHEDRAL.x - 8, CATHEDRAL.y + CATHEDRAL.h + 10, CATHEDRAL.x + CATHEDRAL.w + 8, CATHEDRAL.y + CATHEDRAL.h + 10],
  ];

  const trees: Array<{ x: number; y: number; r: number; tone: number }> = [];
  for (const [x0, y0, x1, y1] of lanes) {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const count = Math.round(len / 32);
    for (let i = 0; i < count; i++) {
      if (rand() < 0.18) continue;
      const t = (i + 0.5) / count;
      trees.push({
        x: x0 + (x1 - x0) * t + (rand() - 0.5) * 18,
        y: y0 + (y1 - y0) * t + (rand() - 0.5) * 18,
        r: 6 + rand() * 6.5,
        tone: rand(),
      });
    }
  }
  return trees;
}

const TREES = buildTrees();

export function CampusMapArt() {
  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="none"
      className="pointer-events-none block h-full w-full"
      role="img"
      aria-label="Illustrated map of Columbia University, Barnard College, and Teachers College in Morningside Heights, from 110th to 122nd Street between Riverside Drive and Morningside Drive."
    >
      <defs>
        <linearGradient id="cc-roof" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#DFE7F2" />
          <stop offset="1" stopColor="#C6D1E2" />
        </linearGradient>
        <linearGradient id="cc-roof-alt" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#D9E1ED" />
          <stop offset="1" stopColor="#C0CADB" />
        </linearGradient>
        <radialGradient id="cc-tree" cx="0.36" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#AFCF9B" />
          <stop offset="1" stopColor="#85B070" />
        </radialGradient>
        <radialGradient id="cc-tree-cool" cx="0.36" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#A9CA9C" />
          <stop offset="1" stopColor="#7CA97B" />
        </radialGradient>
      </defs>

      <rect width={VIEW_W} height={VIEW_H} fill="var(--color-map-ground)" />

      {LAWNS.map((lawn, i) => (
        <rect
          key={`lawn-${i}`}
          x={lawn.x}
          y={lawn.y}
          width={lawn.w}
          height={lawn.h}
          rx={i < 2 ? 0 : 8}
          fill="var(--color-map-lawn)"
          opacity={i < 2 ? 0.88 : 1}
        />
      ))}

      <Street x={-40} y={Y[122] - ST} w={VIEW_W + 80} h={ST * 2} />
      <Street x={-40} y={Y[121] - ST} w={VIEW_W + 80} h={ST * 2} />
      <Street x={-40} y={Y[120] - ST} w={VIEW_W + 80} h={ST * 2} />
      <Street x={-40} y={Y[119] - ST} w={VIEW_W + 80} h={ST * 2} />
      <Street x={-40} y={Y[118] - ST} w={VIEW_W + 80} h={ST * 2} />
      <Street x={-40} y={Y[116] - ST} w={VIEW_W + 80} h={ST * 2} />
      <Street x={-40} y={Y[115] - ST} w={VIEW_W + 80} h={ST * 2} />
      <Street x={-40} y={Y[114] - ST} w={VIEW_W + 80} h={ST * 2} />
      <Street x={-40} y={Y[113] - ST} w={VIEW_W + 80} h={ST * 2} />
      <Street x={-40} y={Y[112] - ST} w={VIEW_W + 80} h={ST * 2} />
      <Street x={-40} y={Y[111] - ST} w={VIEW_W + 80} h={ST * 2} />
      <Street x={-40} y={Y[110] - ST} w={VIEW_W + 80} h={ST * 2} />

      <Street x={X.riverside - AVE} y={-40} w={AVE * 2} h={VIEW_H + 80} vertical />
      <Street x={X.claremont - AVE} y={-40} w={AVE * 2} h={VIEW_H + 80} vertical />
      <Street x={X.broadway - BRD} y={-40} w={BRD * 2} h={VIEW_H + 80} vertical />
      <Street x={X.amsterdam - AVE} y={-40} w={AVE * 2} h={VIEW_H + 80} vertical />
      <Street x={X.morningside - AVE} y={-40} w={AVE * 2} h={VIEW_H + 80} vertical />

      {WALKS.map((walk, i) => (
        <rect key={`walk-${i}`} x={walk.x} y={walk.y} width={walk.w} height={walk.h} fill="#F4F1EA" />
      ))}

      <g opacity={0.55}>
        {[0, 1, 2, 3, 4].map((i) => (
          <rect
            key={`step-${i}`}
            x={lowQuad.x + lowQuad.w * 0.36}
            y={lowQuad.y + lowQuad.h * 0.54 + i * 10}
            width={lowQuad.w * 0.28}
            height={4}
            rx={2}
            fill="#DBD6CC"
          />
        ))}
      </g>
      <circle
        cx={lowQuad.x + lowQuad.w * 0.5}
        cy={lowQuad.y + lowQuad.h * 0.92}
        r={16}
        fill="#EFEBE3"
        stroke="#DDD8CF"
        strokeWidth={2}
      />

      {CAMPUS_BUILDINGS.map((b, i) => (
        <Building key={`b-${i}`} {...b} />
      ))}
      <Building {...CATHEDRAL} />

      {TREES.map((t, i) => (
        <g key={`t-${i}`}>
          <ellipse
            cx={t.x + 1.4}
            cy={t.y + t.r * 0.6}
            rx={t.r * 0.85}
            ry={t.r * 0.4}
            fill="#0F2547"
            opacity={0.055}
          />
          <circle cx={t.x} cy={t.y} r={t.r} fill={t.tone > 0.55 ? "url(#cc-tree-cool)" : "url(#cc-tree)"} />
          <circle cx={t.x - t.r * 0.26} cy={t.y - t.r * 0.28} r={t.r * 0.44} fill="#C2DBAC" opacity={0.5} />
        </g>
      ))}
    </svg>
  );
}

function Street({ x, y, w, h, vertical = false }: Block & { vertical?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="var(--color-map-street)" />
      {vertical ? (
        <>
          <rect x={x + w / 2 - 1} y={y} width={2} height={h} fill="#F8F9FA" />
          <rect x={x} y={y} width={2} height={h} fill="var(--color-map-street-line)" />
          <rect x={x + w - 2} y={y} width={2} height={h} fill="var(--color-map-street-line)" />
        </>
      ) : (
        <>
          <rect x={x} y={y + h / 2 - 1} width={w} height={2} fill="#F8F9FA" />
          <rect x={x} y={y} width={w} height={2} fill="var(--color-map-street-line)" />
          <rect x={x} y={y + h - 2} width={w} height={2} fill="var(--color-map-street-line)" />
        </>
      )}
    </g>
  );
}

function Building({ x, y, w, h, alt = false, rx = 4 }: Block) {
  const cols = Math.max(2, Math.round(w / 28));
  const rows = Math.max(1, Math.round(h / 32));
  const pad = Math.min(9, Math.max(5, w * 0.08));
  const stepX = (w - pad * 2) / cols;
  const stepY = (h - pad * 2) / rows;

  return (
    <g>
      <rect x={x + 3} y={y + 4} width={w} height={h} rx={rx} fill="#0F2547" opacity={0.1} />
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={rx}
        fill={alt ? "url(#cc-roof-alt)" : "url(#cc-roof)"}
        stroke="var(--color-map-building-edge)"
        strokeWidth={1.5}
      />
      <rect x={x + 6} y={y + 6} width={Math.max(0, w - 12)} height={Math.max(0, h - 12)} rx={Math.max(2, rx - 1)} fill={alt ? "#CBD4E3" : "#D2DCEA"} />
      <g opacity={alt ? 0.55 : 0.68}>
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((_, c) => (
            <rect
              key={`${r}-${c}`}
              x={x + pad + c * stepX + stepX * 0.22}
              y={y + pad + r * stepY + stepY * 0.3}
              width={stepX * 0.46}
              height={Math.max(2.4, stepY * 0.28)}
              rx={1.1}
              fill="#B5C7E1"
            />
          )),
        )}
      </g>
    </g>
  );
}
