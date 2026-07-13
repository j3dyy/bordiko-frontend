// Tiny synthesized sound effects (Web Audio, no asset files). Each seat gets a
// distinct pitch so every player has a recognizable "voice" when they play, with
// a short chime when a trick is won. Muting is remembered in localStorage.

let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

const MUTE_KEY = "bordiko:muted";
export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}
export function setMuted(m: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, m ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, delay = 0): void {
  const a = ac();
  if (!a || isMuted()) return;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

// A distinct pitch per seat (a "different voice" per player); your own play is a
// touch warmer/louder so you can tell it apart.
const SEAT_FREQS = [523.25, 392.0, 659.25, 466.16]; // C5 · G4 · E5 · Bb4
export function soundCardPlay(seat: number, byMe: boolean): void {
  const f = SEAT_FREQS[(((seat % 4) + 4) % 4)];
  tone(f, byMe ? 0.15 : 0.12, byMe ? "triangle" : "sine", byMe ? 0.2 : 0.13);
}

// A rising two-note chime when a trick is taken.
export function soundTrickWon(): void {
  tone(659.25, 0.12, "triangle", 0.16);
  tone(987.77, 0.2, "triangle", 0.14, 0.1);
}

// "ring ring" — the bell nudge (🔔 emote), two quick bright dings.
export function soundRing(): void {
  tone(1318.51, 0.13, "triangle", 0.18);
  tone(1318.51, 0.15, "triangle", 0.18, 0.17);
}

// A soft blip for any other reaction.
export function soundEmote(): void {
  tone(784.0, 0.09, "sine", 0.11);
}
