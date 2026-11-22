export interface Point {
  x: number;
  y: number;
}

/**
 * A PACS arrow annotation — the mark a radiologist drops on a study to say "look here":
 * a straight shaft with a solid head, haloed so it reads over any background. Drawn in like
 * an annotation being placed; render inside an <svg> laid over the viewport.
 */
export function AnnotationArrow({ from, to }: { from: Point; to: Point }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const head = 13;
  const wing = 6.5;
  const bx = to.x - ux * head;
  const by = to.y - uy * head;
  const points = `${to.x},${to.y} ${bx - uy * wing},${by + ux * wing} ${bx + uy * wing},${by - ux * wing}`;
  const shaft = { x1: from.x, y1: from.y, x2: bx + ux * 2, y2: by + uy * 2 };

  return (
    <g>
      <line
        {...shaft}
        pathLength={1}
        strokeDasharray={1}
        stroke="rgb(4 8 16 / 0.75)"
        strokeWidth={6.5}
        strokeLinecap="round"
        className="animate-draw"
      />
      <line
        {...shaft}
        pathLength={1}
        strokeDasharray={1}
        stroke="rgb(var(--localizer))"
        strokeWidth={2.5}
        strokeLinecap="round"
        className="animate-draw"
      />
      <polygon
        points={points}
        fill="rgb(var(--localizer))"
        stroke="rgb(4 8 16 / 0.75)"
        strokeWidth={2}
        strokeLinejoin="round"
        paintOrder="stroke"
        className="animate-fade [animation-delay:0.34s]"
      />
    </g>
  );
}
