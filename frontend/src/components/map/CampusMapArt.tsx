/**
 * Static, locally drawn illustration that stands in for the interactive campus
 * map during Phase 1. Everything is plain SVG — no tiles, no network requests.
 *
 * Phase 2 swaps this whole file out for a Mapbox GL canvas; nothing outside
 * `CampusMapPlaceholder` should import it.
 */

const VIEW_W = 1000;
const VIEW_H = 936;

interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Softer fill for secondary / off-campus blocks. */
  alt?: boolean;
}

/** Campus buildings, laid out to leave the reference label positions readable. */
const CAMPUS_BUILDINGS: Block[] = [
  { x: 166, y: 122, w: 190, h: 100 },
  { x: 396, y: 122, w: 228, h: 100 }, // Lerner Hall
  { x: 660, y: 122, w: 206, h: 100 },
  { x: 166, y: 246, w: 210, h: 58 }, // Schermerhorn Hall (north wing)
  { x: 664, y: 244, w: 202, h: 88 }, // Uris Hall
  { x: 164, y: 336, w: 216, h: 116 },
  { x: 386, y: 342, w: 248, h: 70 }, // Butler Library
  { x: 672, y: 348, w: 196, h: 112 },
  { x: 150, y: 574, w: 200, h: 130 }, // Hamilton Hall
  { x: 612, y: 574, w: 256, h: 134 }, // Dodge Fitness Center
  { x: 154, y: 714, w: 194, h: 74, alt: true },
  { x: 686, y: 718, w: 182, h: 70, alt: true },
];

const OFFCAMPUS_BUILDINGS: Block[] = [
  { x: 156, y: -70, w: 176, h: 128, alt: true },
  { x: 372, y: -70, w: 188, h: 128, alt: true },
  { x: 604, y: -70, w: 184, h: 128, alt: true },
  { x: 830, y: -70, w: 196, h: 128, alt: true },
  { x: -190, y: 134, w: 252, h: 148, alt: true },
  { x: -190, y: 356, w: 252, h: 162, alt: true },
  { x: -190, y: 596, w: 252, h: 182, alt: true },
  { x: 952, y: 132, w: 244, h: 152, alt: true },
  { x: 952, y: 328, w: 244, h: 186, alt: true },
  { x: 952, y: 560, w: 244, h: 224, alt: true },
  { x: 150, y: 880, w: 214, h: 164, alt: true },
  { x: 418, y: 880, w: 214, h: 164, alt: true },
  { x: 686, y: 880, w: 214, h: 164, alt: true },
];

const LAWNS: Block[] = [
  { x: 378, y: 664, w: 286, h: 108 }, // South Field
  { x: 186, y: 476, w: 152, h: 70 },
  { x: 706, y: 492, w: 140, h: 58 },
];

/** Paved pedestrian corridors between building rows. */
const WALKS: Block[] = [
  { x: 148, y: 222, w: 722, h: 26 },
  { x: 148, y: 456, w: 722, h: 22 },
  { x: 148, y: 562, w: 722, h: 20 },
  { x: 376, y: 112, w: 22, h: 680 },
  { x: 634, y: 112, w: 22, h: 680 },
];

/** Deterministic pseudo-random tree placement (stable across SSR + client). */
function buildTrees() {
  let seed = 20260410;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  // Tree rows hug sidewalks and the corridors between buildings, so the
  // building footprints stay legible — as they do in the reference.
  const lanes: Array<[number, number, number, number]> = [
    [-180, 58, 1180, 58],
    [-180, 126, 1180, 126],
    [-180, 786, 1180, 786],
    [-180, 852, 1180, 852],
    [72, 130, 72, 782],
    [154, 130, 154, 782],
    [864, 130, 864, 782],
    [944, 130, 944, 782],
    [170, 234, 862, 234],
    [170, 466, 862, 466],
    [170, 572, 862, 572],
    [386, 240, 386, 566],
    [645, 240, 645, 566],
    [386, 600, 386, 780],
    [645, 600, 645, 780],
    [196, 306, 350, 306],
    [690, 336, 850, 336],
    [200, 460, 340, 460],
    [700, 470, 850, 470],
    [400, 640, 640, 640],
    [400, 780, 640, 780],
  ];

  const trees: Array<{ x: number; y: number; r: number; tone: number }> = [];
  for (const [x0, y0, x1, y1] of lanes) {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const count = Math.round(len / 34);
    for (let i = 0; i < count; i++) {
      // Leaving gaps in each row reads as planted clusters rather than a chain.
      if (rand() < 0.2) continue;
      const t = (i + 0.5) / count;
      trees.push({
        x: x0 + (x1 - x0) * t + (rand() - 0.5) * 22,
        y: y0 + (y1 - y0) * t + (rand() - 0.5) * 22,
        r: 7 + rand() * 7,
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
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      role="img"
      aria-label="Stylised map of the Columbia University Morningside campus"
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

      {/* The whole grid is tilted slightly, like the reference map view. */}
      <g transform="rotate(-5 500 468)">
        <rect x={148} y={112} width={722} height={680} fill="var(--color-map-walk)" />

        <Street x={-220} y={70} w={1440} h={42} />
        <Street x={-220} y={792} w={1440} h={42} />
        <Street x={86} y={-220} w={54} h={1380} vertical />
        <Street x={878} y={-220} w={54} h={1380} vertical />
        <Street x={-220} y={296} w={366} h={32} />
        <Street x={-220} y={532} w={366} h={32} />

        {WALKS.map((walk, i) => (
          <rect
            key={`walk-${i}`}
            x={walk.x}
            y={walk.y}
            width={walk.w}
            height={walk.h}
            fill="#F4F1EA"
          />
        ))}

        {LAWNS.map((lawn, i) => (
          <rect
            key={`lawn-${i}`}
            x={lawn.x}
            y={lawn.y}
            width={lawn.w}
            height={lawn.h}
            rx={8}
            fill="var(--color-map-lawn)"
          />
        ))}

        {/* Low Steps terracing */}
        <g opacity={0.55}>
          {[0, 1, 2, 3, 4].map((i) => (
            <rect
              key={`step-${i}`}
              x={402}
              y={492 + i * 12}
              width={228}
              height={5}
              rx={2.5}
              fill="#DBD6CC"
            />
          ))}
        </g>

        {/* Alma Mater plaza */}
        <circle cx={476} cy={607} r={20} fill="#EFEBE3" stroke="#DDD8CF" strokeWidth={2} />

        {[...OFFCAMPUS_BUILDINGS, ...CAMPUS_BUILDINGS].map((b, i) => (
          <Building key={`b-${i}`} {...b} />
        ))}

        {TREES.map((t, i) => (
          <g key={`t-${i}`}>
            <ellipse
              cx={t.x + 1.5}
              cy={t.y + t.r * 0.6}
              rx={t.r * 0.85}
              ry={t.r * 0.4}
              fill="#0F2547"
              opacity={0.055}
            />
            <circle
              cx={t.x}
              cy={t.y}
              r={t.r}
              fill={t.tone > 0.55 ? "url(#cc-tree-cool)" : "url(#cc-tree)"}
            />
            <circle
              cx={t.x - t.r * 0.26}
              cy={t.y - t.r * 0.28}
              r={t.r * 0.44}
              fill="#C2DBAC"
              opacity={0.5}
            />
          </g>
        ))}
      </g>
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

function Building({ x, y, w, h, alt = false }: Block) {
  const cols = Math.max(2, Math.round(w / 30));
  const rows = Math.max(1, Math.round(h / 34));
  const pad = 10;
  const stepX = (w - pad * 2) / cols;
  const stepY = (h - pad * 2) / rows;

  return (
    <g>
      <rect x={x + 4} y={y + 5} width={w} height={h} rx={4} fill="#0F2547" opacity={0.1} />
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={4}
        fill={alt ? "url(#cc-roof-alt)" : "url(#cc-roof)"}
        stroke="var(--color-map-building-edge)"
        strokeWidth={1.6}
      />
      <rect
        x={x + 7}
        y={y + 7}
        width={w - 14}
        height={h - 14}
        rx={3}
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
