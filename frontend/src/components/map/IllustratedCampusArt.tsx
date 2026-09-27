import type { CampusBlock, CampusDefinition } from "@/lib/campuses";
import { MAP_ART } from "@/lib/geo";

const VIEW_W = MAP_ART.width;
const VIEW_H = MAP_ART.height;
const AVE = 16;
const BRD = 20;
const ST = 13;

function pxX(pct: number) {
  return (pct / 100) * VIEW_W;
}

function pxY(pct: number) {
  return (pct / 100) * VIEW_H;
}

function pxBlock(block: CampusBlock): CampusBlock {
  return {
    x: pxX(block.x),
    y: pxY(block.y),
    w: pxX(block.w),
    h: pxY(block.h),
    alt: block.alt,
    rx: block.rx != null ? pxX(block.rx) : 4,
  };
}

/**
 * Same soft roofs, lawns, streets and trees as the Columbia drawing, laid out
 * from another college's street grid.
 */
export function IllustratedCampusArt({ campus }: { campus: CampusDefinition }) {
  const { spec, layout } = campus;
  const prefix = `cc-${spec.id}`;

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="none"
      className="pointer-events-none block h-full w-full"
      role="img"
      aria-label={spec.ariaLabel}
    >
      <defs>
        <linearGradient id={`${prefix}-roof`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#DFE7F2" />
          <stop offset="1" stopColor="#C6D1E2" />
        </linearGradient>
        <linearGradient id={`${prefix}-roof-alt`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#D9E1ED" />
          <stop offset="1" stopColor="#C0CADB" />
        </linearGradient>
        <radialGradient id={`${prefix}-tree`} cx="0.36" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#AFCF9B" />
          <stop offset="1" stopColor="#85B070" />
        </radialGradient>
        <radialGradient id={`${prefix}-tree-cool`} cx="0.36" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#A9CA9C" />
          <stop offset="1" stopColor="#7CA97B" />
        </radialGradient>
      </defs>

      <rect width={VIEW_W} height={VIEW_H} fill="var(--color-map-ground)" />

      {spec.lawns.map((lawn, i) => {
        const block = pxBlock(lawn);
        return (
          <rect
            key={`lawn-${i}`}
            x={block.x}
            y={block.y}
            width={block.w}
            height={block.h}
            rx={lawn.rx != null ? pxX(lawn.rx) : i < 2 ? 0 : 8}
            fill="var(--color-map-lawn)"
            opacity={lawn.x <= 1 || lawn.x + lawn.w >= 99 ? 0.9 : 1}
          />
        );
      })}

      {spec.streets.map((street) => (
        <Street key={`h-${street.name}`} x={-40} y={pxY(street.y) - ST} w={VIEW_W + 80} h={ST * 2} />
      ))}

      {spec.avenues.map((avenue) => {
        const half = avenue.wide ? BRD : AVE;
        return (
          <Street
            key={`v-${avenue.name}`}
            x={pxX(avenue.x) - half}
            y={-40}
            w={half * 2}
            h={VIEW_H + 80}
            vertical
          />
        );
      })}

      {(spec.walks ?? []).map((walk, i) => {
        const block = pxBlock(walk);
        return <rect key={`walk-${i}`} x={block.x} y={block.y} width={block.w} height={block.h} fill="#F4F1EA" />;
      })}

      {layout.trees.map((tree, i) => {
        const x = pxX(tree.x);
        const y = pxY(tree.y);
        const r = pxX(tree.r);
        return (
          <g key={`t-${i}`}>
            <ellipse cx={x + 1.2} cy={y + r * 0.6} rx={r * 0.85} ry={r * 0.4} fill="#0F2547" opacity={0.055} />
            <circle cx={x} cy={y} r={r} fill={tree.tone > 0.55 ? `url(#${prefix}-tree-cool)` : `url(#${prefix}-tree)`} />
            <circle cx={x - r * 0.26} cy={y - r * 0.28} r={r * 0.44} fill="#C2DBAC" opacity={0.5} />
          </g>
        );
      })}

      {layout.buildings.map((building, i) => (
        <Building key={`b-${i}`} {...pxBlock(building)} roofId={`${prefix}-roof`} roofAltId={`${prefix}-roof-alt`} />
      ))}
    </svg>
  );
}

function Street({
  x,
  y,
  w,
  h,
  vertical = false,
}: CampusBlock & { vertical?: boolean }) {
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

function Building({
  x,
  y,
  w,
  h,
  alt = false,
  rx = 4,
  roofId,
  roofAltId,
}: CampusBlock & { roofId: string; roofAltId: string }) {
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
        fill={alt ? `url(#${roofAltId})` : `url(#${roofId})`}
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
              width={Math.max(2, stepX * 0.46)}
              height={Math.max(2, stepY * 0.3)}
              rx={1.2}
              fill="#B5C7E1"
            />
          )),
        )}
      </g>
    </g>
  );
}
