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

/** Half-widths — thick enough to read as streets, like the original drawing. */
const AVE = 16;
const BRD = 20;
const ST = 13;

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

function inset(west: number, east: number, north: number, south: number, pad = 10, alt = false): Block {
  return {
    x: west + pad,
    y: north + pad,
    w: Math.max(12, east - west - pad * 2),
    h: Math.max(12, south - north - pad * 2),
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

const southOf = (n: keyof typeof Y) => Y[n] + ST;
const northOf = (n: keyof typeof Y) => Y[n] - ST;

const main = inset(bE, aW, southOf(120), northOf(118));
const lowQuad = inset(bE, aW, southOf(118), northOf(116));
const southRow = inset(bE, aW, southOf(116), northOf(115));
const butlerRow = inset(bE, aW, southOf(115), northOf(114));
const barnard = inset(cE, bW, southOf(120), northOf(116));
const barnardWest = inset(rE, cW, southOf(119), northOf(116));
const eastMid = inset(aE, mW, southOf(118), northOf(116));

const CAMPUS_BUILDINGS: Block[] = [
  { x: X.riverside - 70, y: 16, w: 56, h: 46, alt: true, rx: 18 },
  { x: X.riverside - 66, y: Y[122] + 16, w: 50, h: 78, alt: true },

  slice(inset(bE, aW, southOf(122), northOf(121)), 0.03, 0.12, 0.3, 0.76, true),
  slice(inset(bE, aW, southOf(122), northOf(121)), 0.37, 0.1, 0.28, 0.8),
  slice(inset(bE, aW, southOf(122), northOf(121)), 0.69, 0.14, 0.28, 0.74, true),
  inset(bE, aW, southOf(121), northOf(120)),

  slice(main, 0.03, 0.06, 0.3, 0.4),
  slice(main, 0.37, 0.04, 0.3, 0.42),
  slice(main, 0.71, 0.06, 0.26, 0.4),
  slice(main, 0.03, 0.54, 0.22, 0.4),
  slice(main, 0.29, 0.52, 0.2, 0.42),
  slice(main, 0.53, 0.5, 0.18, 0.44),
  slice(main, 0.75, 0.52, 0.22, 0.42),

  slice(lowQuad, 0.03, 0.08, 0.2, 0.36),
  slice(lowQuad, 0.26, 0.16, 0.14, 0.28),
  { ...slice(lowQuad, 0.43, 0.08, 0.28, 0.44), rx: 10 },
  slice(lowQuad, 0.75, 0.12, 0.22, 0.34),
  slice(lowQuad, 0.03, 0.56, 0.22, 0.38),
  slice(lowQuad, 0.76, 0.56, 0.21, 0.38),

  slice(southRow, 0.03, 0.1, 0.2, 0.8),
  slice(southRow, 0.26, 0.08, 0.18, 0.84),
  slice(southRow, 0.78, 0.1, 0.19, 0.8),
  slice(butlerRow, 0.03, 0.1, 0.22, 0.8),
  { ...slice(butlerRow, 0.29, 0.06, 0.4, 0.88), rx: 7 },
  slice(butlerRow, 0.73, 0.1, 0.24, 0.8),

  inset(bE, aW, southOf(114), northOf(113)),
  inset(bE, aW, southOf(113), northOf(112), 10, true),
  slice(inset(bE, aW, southOf(112), northOf(111), 10, true), 0.03, 0.12, 0.45, 0.76, true),
  slice(inset(bE, aW, southOf(112), northOf(111), 10, true), 0.52, 0.12, 0.45, 0.76, true),
  inset(bE, aW, southOf(111), northOf(110), 10, true),

  slice(barnardWest, 0.06, 0.04, 0.88, 0.28),
  slice(barnardWest, 0.06, 0.38, 0.88, 0.26),
  slice(barnardWest, 0.06, 0.7, 0.88, 0.26),
  slice(barnard, 0.08, 0.05, 0.84, 0.2),
  slice(barnard, 0.1, 0.3, 0.8, 0.22),
  slice(barnard, 0.08, 0.58, 0.4, 0.36),
  slice(barnard, 0.52, 0.58, 0.4, 0.36),

  inset(cE, bW, southOf(116), northOf(115), 10, true),
  inset(cE, bW, southOf(115), northOf(114), 10, true),
  inset(cE, bW, southOf(114), northOf(113), 10, true),
  inset(cE, bW, southOf(113), northOf(112), 10, true),
  inset(cE, bW, southOf(112), northOf(111), 10, true),

  inset(cE, bW, southOf(122), northOf(121), 10, true),
  inset(cE, bW, southOf(121), northOf(120)),
  inset(rE, cW, southOf(121), northOf(120), 10, true),
  inset(rE, cW, southOf(120), northOf(119), 10, true),

  inset(aE, mW, southOf(122), northOf(121), 10, true),
  inset(aE, mW, southOf(121), northOf(120), 10, true),
  inset(aE, mW, southOf(120), northOf(119)),
  inset(aE, mW, southOf(119), northOf(118)),
  slice(eastMid, 0.06, 0.08, 0.56, 0.4),
  slice(eastMid, 0.68, 0.12, 0.26, 0.36),
  slice(eastMid, 0.08, 0.56, 0.5, 0.36),
  inset(aE, mW, southOf(116), northOf(114), 10, true),
  inset(aE, mW, southOf(114), northOf(113), 10, true),
];

const CATHEDRAL: Block = {
  ...inset(aE + 14, mW - 4, southOf(113) + 4, northOf(110) - 8),
  rx: 12,
};

const LAWNS: Block[] = [
  { x: 0, y: 0, w: X.riverside - 8, h: VIEW_H },
  { x: X.morningside + 10, y: 0, w: VIEW_W - X.morningside - 10, h: VIEW_H },
  {
    x: southRow.x + southRow.w * 0.46,
    y: southRow.y + 6,
    w: southRow.w * 0.3,
    h: southRow.h - 12,
  },
  {
    x: lowQuad.x + lowQuad.w * 0.42,
    y: lowQuad.y + lowQuad.h * 0.56,
    w: lowQuad.w * 0.3,
    h: lowQuad.h * 0.36,
  },
  { x: CATHEDRAL.x - 14, y: CATHEDRAL.y - 16, w: CATHEDRAL.w + 28, h: CATHEDRAL.h + 32 },
];

const WALKS: Block[] = [
  { x: bE, y: Y[116] - 8, w: aW - bE, h: 16 },
  { x: (X.broadway + X.amsterdam) / 2 - 8, y: Y[118] + 6, w: 16, h: Y[114] - Y[118] - 12 },
];

function buildTrees() {
  let seed = 20260410;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  const lanes: Array<[number, number, number, number]> = [
    [22, 30, 22, VIEW_H - 24],
    [X.riverside - 26, 40, X.riverside - 26, VIEW_H - 28],
    [X.morningside + 26, 36, X.morningside + 26, VIEW_H - 24],
    [VIEW_W - 18, 28, VIEW_W - 18, VIEW_H - 22],
    [X.broadway - 28, 50, X.broadway - 28, VIEW_H - 30],
    [X.broadway + 28, 50, X.broadway + 28, VIEW_H - 30],
    [X.amsterdam - 26, 50, X.amsterdam - 26, VIEW_H - 30],
    [X.amsterdam + 26, 50, X.amsterdam + 26, VIEW_H - 30],
    [X.broadway + 30, Y[116], X.amsterdam - 30, Y[116]],
    [X.broadway + 36, southRow.y + southRow.h * 0.5, X.amsterdam - 90, southRow.y + southRow.h * 0.5],
    [CATHEDRAL.x - 6, CATHEDRAL.y - 12, CATHEDRAL.x + CATHEDRAL.w + 6, CATHEDRAL.y - 12],
    [CATHEDRAL.x - 6, CATHEDRAL.y + CATHEDRAL.h + 8, CATHEDRAL.x + CATHEDRAL.w + 6, CATHEDRAL.y + CATHEDRAL.h + 8],
  ];

  const trees: Array<{ x: number; y: number; r: number; tone: number }> = [];
  for (const [x0, y0, x1, y1] of lanes) {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const count = Math.round(len / 46);
    for (let i = 0; i < count; i++) {
      if (rand() < 0.32) continue;
      const t = (i + 0.5) / count;
      trees.push({
        x: x0 + (x1 - x0) * t + (rand() - 0.5) * 14,
        y: y0 + (y1 - y0) * t + (rand() - 0.5) * 14,
        r: 5.2 + rand() * 4.2,
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
          opacity={i < 2 ? 0.9 : 1}
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
            x={lowQuad.x + lowQuad.w * 0.43}
            y={lowQuad.y + lowQuad.h * 0.56 + i * 9}
            width={lowQuad.w * 0.28}
            height={4}
            rx={2}
            fill="#DBD6CC"
          />
        ))}
      </g>
      <circle
        cx={lowQuad.x + lowQuad.w * 0.57}
        cy={lowQuad.y + lowQuad.h * 0.94}
        r={15}
        fill="#EFEBE3"
        stroke="#DDD8CF"
        strokeWidth={2}
      />

      {TREES.map((t, i) => (
        <g key={`t-${i}`}>
          <ellipse
            cx={t.x + 1.2}
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

      {CAMPUS_BUILDINGS.map((b, i) => (
        <Building key={`b-${i}`} {...b} />
      ))}
      <Building {...CATHEDRAL} />
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
  const cols = Math.max(2, Math.round(w / 30));
  const rows = Math.max(1, Math.round(h / 34));
  const pad = 10;
  const stepX = (w - pad * 2) / cols;
  const stepY = (h - pad * 2) / rows;

  return (
    <g>
      <rect x={x + 4} y={y + 5} width={w} height={h} rx={rx} fill="#0F2547" opacity={0.1} />
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={rx}
        fill={alt ? "url(#cc-roof-alt)" : "url(#cc-roof)"}
        stroke="var(--color-map-building-edge)"
        strokeWidth={1.6}
      />
      <rect
        x={x + 7}
        y={y + 7}
        width={Math.max(0, w - 14)}
        height={Math.max(0, h - 14)}
        rx={Math.max(2, rx - 1)}
        fill={alt ? "#CBD4E3" : "#D2DCEA"}
      />
      <g opacity={alt ? 0.55 : 0.68}>
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((_, c) => (
            <rect
              key={`${r}-${c}`}
              x={x + pad + c * stepX + stepX * 0.22}
              y={y + pad + r * stepY + stepY * 0.3}
              width={stepX * 0.46}
              height={stepY * 0.3}
              rx={1.2}
              fill="#B5C7E1"
            />
          )),
        )}
      </g>
    </g>
  );
}
