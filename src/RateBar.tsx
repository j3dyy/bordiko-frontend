import { useState } from "react";
import { rateGame } from "./api.ts";

// A 5-star rater for a game. One rating per user (the server upserts); posting
// again just updates it. Used on the live game screen and the game-detail page.
export function RateBar({ gameId, name }: { gameId: string; name: string }) {
  const [mine, setMine] = useState(0);
  const [hover, setHover] = useState(0);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  async function rate(stars: number) {
    setMine(stars);
    setErr("");
    try {
      await rateGame(gameId, stars);
      setSaved(true);
    } catch (e) {
      setErr(String((e as Error).message ?? e));
    }
  }

  const shown = hover || mine;
  return (
    <div className="ratebar">
      <span className="ratebar-label">{saved ? `Thanks — you rated ${name}` : `Enjoying ${name}? Rate it`}</span>
      <div className="ratebar-stars" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            className={`ratestar${n <= shown ? " on" : ""}`}
            onMouseEnter={() => setHover(n)}
            onClick={() => rate(n)}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
          >
            ★
          </button>
        ))}
      </div>
      {err && <span className="ratebar-err">{err}</span>}
    </div>
  );
}
