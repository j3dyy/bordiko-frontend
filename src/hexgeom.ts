// Pointy-top axial hex geometry for the board renderer.

export interface Hex {
  q: number;
  r: number;
}

export function hexKey(h: Hex): string {
  return `${h.q},${h.r}`;
}

export function parseHexKey(k: string): Hex {
  const i = k.indexOf(",");
  return { q: Number(k.slice(0, i)), r: Number(k.slice(i + 1)) };
}

const SQRT3 = Math.sqrt(3);

export function hexToPixel(h: Hex, size: number): { x: number; y: number } {
  return { x: size * SQRT3 * (h.q + h.r / 2), y: size * 1.5 * h.r };
}

/** SVG points string for a pointy-top hexagon centered at (cx, cy). */
export function hexPolygon(cx: number, cy: number, size: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`);
  }
  return pts.join(" ");
}
