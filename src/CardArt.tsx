// Bordiko — Crazy Eights deck. Self-contained SVG card (no deps).
//   <Card r="8" s="H" size={120} />   ·   <Card back size={120} />
// Model:  r ∈ 2 3 4 5 6 7 8 9 10 J Q K A   ·   s ∈ C D H S
import type { CSSProperties } from "react";

/* ---------------- brand ---------------- */
const RED = "#D83A34"; // warm, brand-harmonized red (hearts / diamonds)
const INK = "#16141F"; // clubs / spades
const BACK = "#6C4CF1"; // card back (purple)
const BORDER = "#E4E1E7";
const WILD = ["#6C4CF1", "#17C0A4", "#FFC53D", "#FF6A3D"]; // logo colors: S H C D
const JOKER_COLOR: Record<string, string> = { red: RED, black: INK, brand: BACK };
const col = (s: string) => (s === "H" || s === "D" ? RED : INK);

const STAR = "M50 4 L60.6 35.4 L93.7 35.8 L67.1 55.6 L77 87.2 L50 68 L23 87.2 L32.9 55.6 L6.3 35.8 L39.4 35.4 Z";
function Star({ x, y, sz, fill }: { x: number; y: number; sz: number; fill: string }) {
  return (
    <g transform={`translate(${x},${y}) scale(${sz / 100}) translate(-50,-50)`}>
      <path d={STAR} fill={fill} />
    </g>
  );
}

/* ---------------- suit shapes (drawn in a 0..100 box) ---------------- */
const SUIT: Record<string, string> = {
  H: "M50 84 C20 60 8 41 8 28 C8 15 19 8 29 8 C39 8 46 15 50 22 C54 15 61 8 71 8 C81 8 92 15 92 28 C92 41 80 60 50 84 Z",
  D: "M50 5 L87 50 L50 95 L13 50 Z",
  S: "M50 8 C50 8 90 38 90 60 C90 75 79 83 69 83 C63 83 58 80 55 76 C56 85 60 91 67 95 L33 95 C40 91 44 85 45 76 C42 80 37 83 31 83 C21 83 10 75 10 60 C10 38 50 8 50 8 Z",
};
function Suit({ s, fill }: { s: string; fill: string }) {
  if (s === "C")
    return (
      <g fill={fill}>
        <circle cx="50" cy="30" r="17" />
        <circle cx="29" cy="56" r="17" />
        <circle cx="71" cy="56" r="17" />
        <path d="M44 58 C44 76 40 88 33 96 L67 96 C60 88 56 76 56 58 Z" />
      </g>
    );
  return <path d={SUIT[s]} fill={fill} />;
}
// one glyph at (x,y), scaled to sz, flipped 180° for the lower half
function Pip({ s, x, y, sz, flip, fill }: { s: string; x: number; y: number; sz: number; flip?: boolean; fill?: string }) {
  return (
    <g transform={`translate(${x},${y}) scale(${sz / 100}) ${flip ? "rotate(180)" : ""} translate(-50,-50)`}>
      <Suit s={s} fill={fill ?? col(s)} />
    </g>
  );
}

/* ---------------- pip layout table (240×336 space) ---------------- */
const Lx = 76, Cx = 120, Rx = 164;
const LAYOUT: Record<string, [number, number][]> = {
  "2": [[Cx, 82], [Cx, 254]],
  "3": [[Cx, 82], [Cx, 168], [Cx, 254]],
  "4": [[Lx, 82], [Rx, 82], [Lx, 254], [Rx, 254]],
  "5": [[Lx, 82], [Rx, 82], [Cx, 168], [Lx, 254], [Rx, 254]],
  "6": [[Lx, 82], [Rx, 82], [Lx, 168], [Rx, 168], [Lx, 254], [Rx, 254]],
  "7": [[Lx, 82], [Rx, 82], [Cx, 125], [Lx, 168], [Rx, 168], [Lx, 254], [Rx, 254]],
  "9": [[Lx, 82], [Rx, 82], [Lx, 146], [Rx, 146], [Cx, 168], [Lx, 190], [Rx, 190], [Lx, 254], [Rx, 254]],
  "10": [[Lx, 82], [Rx, 82], [Cx, 114], [Lx, 146], [Rx, 146], [Lx, 190], [Rx, 190], [Cx, 222], [Lx, 254], [Rx, 254]],
};

/* ---------------- centers ---------------- */
function Crest({ r, s }: { r: string; s: string }) {
  const c = col(s);
  return (
    <g>
      <rect x="46" y="66" width="148" height="204" rx="16" fill="#F4F3F0" stroke={c} strokeWidth="2" />
      <rect x="54" y="74" width="132" height="188" rx="11" fill="none" stroke={c} strokeWidth="1" opacity="0.35" />
      <Pip s={s} x={120} y={104} sz={34} />
      <text x="120" y="172" textAnchor="middle" dominantBaseline="central" fontFamily="'Space Grotesk',sans-serif" fontWeight="700" fontSize="108" fill={c}>{r}</text>
      <Pip s={s} x={120} y={232} sz={34} flip />
    </g>
  );
}
function WildRosette() {
  const t = 60, g = 8, ox = 120, oy = 168, faces = ["S", "H", "C", "D"];
  const pos: [number, number][] = [[-t - g / 2, -t - g / 2], [g / 2, -t - g / 2], [-t - g / 2, g / 2], [g / 2, g / 2]];
  return (
    <g>
      {pos.map(([dx, dy], i) => {
        const x = ox + dx, y = oy + dy;
        return (
          <g key={i}>
            <rect x={x} y={y} width={t} height={t} rx="15" fill={WILD[i]} />
            <g transform={`translate(${x + t / 2},${y + t / 2}) scale(0.30) translate(-50,-50)`}>
              <Suit s={faces[i]} fill="#fff" />
            </g>
          </g>
        );
      })}
    </g>
  );
}
function Center({ r, s }: { r: string; s: string }) {
  if (r === "A") return <Pip s={s} x={120} y={168} sz={132} />;
  if (r === "8") return <WildRosette />;
  if (r === "J" || r === "Q" || r === "K") return <Crest r={r} s={s} />;
  return <g>{(LAYOUT[r] ?? []).map((p, i) => <Pip key={i} s={s} x={p[0]} y={p[1]} sz={40} flip={p[1] > 168} />)}</g>;
}
function CornerIndex({ r, s }: { r: string; s: string }) {
  return (
    <g>
      <text x="34" y="40" textAnchor="middle" dominantBaseline="central" fontFamily="'Space Grotesk',sans-serif" fontWeight="700" fontSize={r === "10" ? 30 : 40} fill={col(s)}>{r}</text>
      <Pip s={s} x={34} y={76} sz={26} />
    </g>
  );
}

/* ---------------- back ---------------- */
function Back() {
  const dots = [];
  for (let y = 30; y <= 306; y += 34)
    for (let x = 28; x <= 212; x += 32) dots.push(<rect key={`${x}_${y}`} x={x - 6} y={y - 6} width="12" height="12" rx="3.5" fill="#fff" opacity="0.07" />);
  const em: [number, number][] = [[-39, -39], [5, -39], [-39, 5], [5, 5]];
  return (
    <>
      <rect x="2" y="2" width="236" height="332" rx="20" fill={BACK} stroke="#5638C9" strokeWidth="2" />
      {dots}
      {em.map(([dx, dy], i) => <rect key={i} x={120 + dx} y={168 + dy} width="34" height="34" rx="9" fill="rgba(255,255,255,0.22)" />)}
      <circle cx={120 - 22} cy={168 - 22} r="5" fill="#fff" />
      <circle cx={120 + 22} cy={168 + 22} r="5" fill="#fff" />
    </>
  );
}

/* ---------------- joker (the ultimate wild) ---------------- */
function JokerCorner({ color, flip }: { color: string; flip?: boolean }) {
  const g = (
    <g>
      <Star x={34} y={40} sz={30} fill={color} />
      <text x="34" y="66" textAnchor="middle" dominantBaseline="central" fontFamily="'Space Grotesk',sans-serif" fontWeight="600" fontSize="9" letterSpacing="0.5" fill={color}>JOKER</text>
    </g>
  );
  return flip ? <g transform="rotate(180 120 168)">{g}</g> : g;
}
function JokerFace({ color }: { color: string }) {
  return (
    <>
      <rect x="2" y="2" width="236" height="332" rx="20" fill="#fff" stroke={BORDER} strokeWidth="2" />
      <circle cx="120" cy="150" r="74" fill={color} opacity="0.06" />
      <Star x={120} y={150} sz={150} fill={color} />
      <text x="120" y="254" textAnchor="middle" dominantBaseline="central" fontFamily="'Space Grotesk',sans-serif" fontWeight="700" fontSize="30" letterSpacing="5" fill={INK}>JOKER</text>
      <g>{WILD.map((c, i) => <circle key={i} cx={96 + i * 16} cy="280" r="5" fill={c} />)}</g>
      <JokerCorner color={color} />
      <JokerCorner color={color} flip />
    </>
  );
}

/* ---------------- <Card> ---------------- */
export function Card({
  r,
  s,
  size = 120,
  back = false,
  joker = false,
  style,
}: {
  r?: string;
  s?: string;
  size?: number;
  back?: boolean;
  joker?: boolean | "red" | "black" | "brand";
  style?: CSSProperties;
}) {
  const jokerColor = joker === true ? JOKER_COLOR.red : joker ? JOKER_COLOR[joker] : "";
  return (
    <svg viewBox="0 0 240 336" width={size} height={(size * 336) / 240} style={{ display: "block", ...style }}>
      {joker ? (
        <JokerFace color={jokerColor} />
      ) : back ? (
        <Back />
      ) : (
        <>
          <rect x="2" y="2" width="236" height="332" rx="20" fill="#fff" stroke={BORDER} strokeWidth="2" />
          <Center r={r ?? "A"} s={s ?? "S"} />
          <CornerIndex r={r ?? "A"} s={s ?? "S"} />
          <g transform="rotate(180 120 168)"><CornerIndex r={r ?? "A"} s={s ?? "S"} /></g>
        </>
      )}
    </svg>
  );
}

/* Rule helper: can this card be played on `top` with `activeSuit` in force? */
export const canPlay = (card: { r: string; s: string }, activeSuit: string, top: { r: string; s: string }) =>
  card.s === activeSuit || card.r === top.r || card.r === "8";

// A standalone suit glyph (for the active-suit chip + wild-8 suit picker).
export function SuitGlyph({ s, size = 22 }: { s: string; size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block" }}>
      <Suit s={s} fill={col(s)} />
    </svg>
  );
}

export const SUIT_LETTERS = ["C", "D", "H", "S"];
export const suitColor = col;

export default Card;
