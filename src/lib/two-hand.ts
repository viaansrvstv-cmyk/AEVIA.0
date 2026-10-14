export type Point2D = { x: number; y: number };
export type OrbDuoState = { expanded: boolean; l: Point2D; r: Point2D };

export const EXPAND_AT = 0.42;
export const COLLAPSE_AT = 0.28;

const distance = (a: Point2D, b: Point2D) => Math.hypot(a.x - b.x, a.y - b.y);

export function twoHandState(
  palms: Point2D[],
  wasExpanded: boolean,
): { expanded: boolean; l?: Point2D; r?: Point2D } {
  if (palms.length < 2) return { expanded: false };
  const sorted = [...palms].sort((a, b) => a.x - b.x);
  const l = sorted[0];
  const r = sorted[1];
  if (!l || !r || !(l.x < 0.5 && r.x > 0.5)) return { expanded: false };
  const gap = distance(l, r);
  return { expanded: wasExpanded ? gap > COLLAPSE_AT : gap > EXPAND_AT, l, r };
}

export function updateOrbDuo(palms: Point2D[], previous: OrbDuoState): OrbDuoState {
  const next = twoHandState(palms, previous.expanded);
  if (!next.expanded || !next.l || !next.r) {
    return { ...previous, expanded: false };
  }
  return { expanded: true, l: next.l, r: next.r };
}
