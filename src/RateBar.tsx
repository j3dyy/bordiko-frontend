import { useEffect, useState } from "react";
import { fetchMyRating, rateGame } from "./api.ts";
import { useT } from "./i18n.tsx";

// A 5-star rater for a game. One rating per user (the server upserts); posting
// again just updates it. Loads the user's existing rating so it shows filled in.
// Used on the live game screen and the game-detail page.
export function RateBar({ gameId, name }: { gameId: string; name: string }) {
  const { t } = useT();
  const [mine, setMine] = useState(0);
  const [hover, setHover] = useState(0);
  const [rated, setRated] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let live = true;
    fetchMyRating(gameId)
      .then((stars) => {
        if (live && stars > 0) {
          setMine(stars);
          setRated(true);
        }
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [gameId]);

  async function rate(stars: number) {
    const prev = mine;
    setMine(stars);
    setErr("");
    try {
      await rateGame(gameId, stars);
      setRated(true);
    } catch (e) {
      setMine(prev);
      setErr(String((e as Error).message ?? e));
    }
  }

  const shown = hover || mine;
  return (
    <div className="ratebar">
      <span className="ratebar-label">{rated ? t("rate.youRated", { name, stars: mine }) : t("rate.enjoying", { name })}</span>
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
