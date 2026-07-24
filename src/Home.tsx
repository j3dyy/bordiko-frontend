import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createLobby, fetchCatalog, fetchLeaderboard, joinLobby, listLobbies } from "./api.ts";
import { friendlyName, gameMeta, playersLabel } from "./games.ts";
import { useT } from "./i18n.tsx";
import { TableSetup } from "./TableSetup.tsx";
import { seatedCount } from "./wire.ts";
import type { CatalogGame, LeaderRow, Lobby } from "./wire.ts";

export function Home({
  onWaiting,
  onGame,
  onOpen,
  onBlocked,
}: {
  onWaiting: (lobby: Lobby) => void;
  onGame: (matchId: string, gameId: string) => void;
  onOpen: (gameId: string) => void;
  onBlocked?: () => void;
}) {
  const { t } = useT();
  const [catalog, setCatalog] = useState<CatalogGame[]>([]);
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState<string>("");
  const [err, setErr] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [setupFor, setSetupFor] = useState<string>(""); // gameId whose "new table" chooser is open
  const timer = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [c, l] = await Promise.all([fetchCatalog(), listLobbies()]);
      setCatalog(c);
      setLobbies(l);
    } catch (e) {
      setErr(String((e as Error).message ?? e));
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
    timer.current = window.setInterval(refresh, 4000);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [refresh]);

  // The gateway blocks a new/join table while you're still in a match. Don't
  // silently drop into that (possibly unrelated) game — surface it and let the
  // top banner offer Resume / Leave.
  function resumeIfActive(e: unknown): boolean {
    const active = (e as { active?: { matchId: string; gameId: string } }).active;
    if (active) {
      const g = gameMeta(active.gameId);
      setErr(t("home.alreadyInGame", { game: g.name }));
      onBlocked?.();
      return true;
    }
    return false;
  }

  // "New table" always opens the chooser now — every game lets you pick seats
  // (where relevant) and whether the table is public or private.
  function newTable(gameId: string) {
    setErr("");
    setSetupFor(gameId);
  }

  async function create(gameId: string, seats: number, mode: "solo" | "teams", visibility: "public" | "private", password: string, options: Record<string, unknown>) {
    setBusy(gameId);
    setErr("");
    try {
      const lobby = await createLobby(gameId, seats, mode, visibility, password, options);
      setSetupFor("");
      onWaiting(lobby);
    } catch (e) {
      if (!resumeIfActive(e)) setErr(String((e as Error).message ?? e));
    } finally {
      setBusy("");
    }
  }

  async function join(lobby: Lobby) {
    setBusy(lobby.id);
    setErr("");
    try {
      const joined = await joinLobby(lobby.id);
      if (joined.status === "started" && joined.matchId) onGame(joined.matchId, joined.gameId);
      else onWaiting(joined);
    } catch (e) {
      if (!resumeIfActive(e)) setErr(String((e as Error).message ?? e));
    } finally {
      setBusy("");
    }
  }

  const categories = useMemo(() => {
    const set = new Set(catalog.map((c) => gameMeta(c.id).category));
    return [...set].sort();
  }, [catalog]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((c) => {
      const m = gameMeta(c.id);
      if (category && m.category !== category) return false;
      if (!q) return true;
      return [m.name, m.author, m.category, c.id].some((s) => s.toLowerCase().includes(q));
    });
  }, [catalog, search, category]);

  // Featured = most-played, then best-rated, then first.
  const featured = useMemo(() => {
    if (!catalog.length) return null;
    return [...catalog].sort((a, b) => b.plays - a.plays || b.rating - a.rating)[0];
  }, [catalog]);

  if (loaded && catalog.length === 0) {
    return (
      <div className="discover">
        <p className="hint">
          {t("home.emptyCatalog")}{" "}
          <code>REGISTRY=… node tools/publish.mjs games/&lt;id&gt;</code>.
        </p>
      </div>
    );
  }

  const showFeatured = featured && !search && !category;

  return (
    <div className="discover">
      <div className="searchbar">
        <span className="search-ic" aria-hidden>⌕</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("home.searchPlaceholder", { n: catalog.length })}
          aria-label="search games"
        />
      </div>

      <div className="chips">
        <button className={category === "" ? "chip active" : "chip"} onClick={() => setCategory("")}>
          {t("home.allGames")}
        </button>
        {categories.map((c) => (
          <button key={c} className={category === c ? "chip active" : "chip"} onClick={() => setCategory(category === c ? "" : c)}>
            {t(`cat.${c}`, undefined, c)}
          </button>
        ))}
      </div>

      {showFeatured && <Featured game={featured} busy={busy === featured.id} onPlay={() => newTable(featured.id)} />}

      <div className="discover-cols">
        <div className="discover-main">
          <h2 className="section-title">{category ? t(`cat.${category}`, undefined, category) : t("home.allGames")}</h2>
          {filtered.length === 0 ? (
            <p className="hint">{t("home.noMatch", { q: search })}</p>
          ) : (
            <div className="catalog">
              {filtered.map((c) => (
                <GameCard key={c.id} game={c} busy={busy === c.id} onCreate={() => newTable(c.id)} onOpen={() => onOpen(c.id)} />
              ))}
            </div>
          )}
        </div>

        <aside className="discover-rail">
          {featured && <TopPlayers gameId={featured.id} />}
          <LiveNow lobbies={lobbies} busy={busy} onJoin={join} />
        </aside>
      </div>

      {err && <p className="error">{err}</p>}

      {setupFor && (
        <TableSetup
          gameId={setupFor}
          options={catalog.find((c) => c.id === setupFor)?.options}
          realtime={catalog.find((c) => c.id === setupFor)?.realtime}
          busy={busy === setupFor}
          err={err}
          onSubmit={(seats, mode, visibility, password, options) => create(setupFor, seats, mode, visibility, password, options)}
          onClose={() => setSetupFor("")}
        />
      )}
    </div>
  );
}

/* -------------------------------- pieces ---------------------------------- */

function Stars({ rating, count }: { rating: number; count: number }) {
  const { t } = useT();
  if (count === 0) return <span className="gc-unrated">{t("home.new")}</span>;
  return (
    <span className="gc-rating" title={`${rating.toFixed(2)} from ${count} rating${count === 1 ? "" : "s"}`}>
      <span className="star">★</span> {rating.toFixed(1)} <span className="gc-count">({count.toLocaleString()})</span>
    </span>
  );
}

function GameCard({ game, busy, onCreate, onOpen }: { game: CatalogGame; busy: boolean; onCreate: () => void; onOpen: () => void }) {
  const { t } = useT();
  const m = gameMeta(game.id);
  return (
    <article className="game-card" style={{ ["--accent" as string]: m.accent }}>
      <div className="gc-open" onClick={onOpen} role="button" tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen()}>
        <div className="gc-top">
          <div className="game-emoji">{m.emoji}</div>
          <span className="cat-pill">{t(`cat.${m.category}`, undefined, m.category)}</span>
        </div>
        <div className="gc-body">
          <h3 className="gc-title">
            {m.name}
            {!game.ownerName && m.verified && <span className="verified" title="Verified creator">✓</span>}
          </h3>
          <div className="gc-creator">{game.ownerName ? `@${game.ownerName}` : m.author}</div>
          <p className="gc-blurb">{t(`gm.${game.id}.blurb`, undefined, m.blurb)}</p>
        </div>
        <div className="gc-stats">
          <Stars rating={game.rating} count={game.ratingCount} />
          <span className="gc-plays">{t("home.plays", { n: game.plays.toLocaleString() })}</span>
          {game.live > 0 && <span className="gc-live">{t("home.live", { n: game.live })}</span>}
        </div>
      </div>
      <button disabled={busy} onClick={onCreate}>
        {busy ? t("home.creating") : t("home.newTable")}
      </button>
    </article>
  );
}

function Featured({ game, busy, onPlay }: { game: CatalogGame; busy: boolean; onPlay: () => void }) {
  const { t } = useT();
  const m = gameMeta(game.id);
  return (
    <section className="featured" style={{ ["--accent" as string]: m.accent }}>
      <div className="featured-info">
        <span className="featured-eyebrow">{t("home.featured")}</span>
        <h2 className="featured-title">{m.name}</h2>
        <p className="featured-blurb">{t(`gm.${game.id}.blurb`, undefined, m.blurb)}</p>
        <div className="featured-cta">
          <button disabled={busy} onClick={onPlay}>
            {busy ? t("home.creating") : t("home.playNow")}
          </button>
          <span className="featured-meta">
            {t("home.playersMeta", { author: game.ownerName ? `@${game.ownerName}` : m.author, players: playersLabel(m), plays: game.plays.toLocaleString() })}
            {game.ratingCount > 0 && <> · ★ {game.rating.toFixed(1)}</>}
          </span>
        </div>
      </div>
      <div className="featured-art" aria-hidden>{m.emoji}</div>
    </section>
  );
}

function TopPlayers({ gameId }: { gameId: string }) {
  const { t } = useT();
  const [rows, setRows] = useState<LeaderRow[]>([]);
  useEffect(() => {
    let live = true;
    const load = () =>
      fetchLeaderboard(gameId)
        .then((r) => live && setRows(r.slice(0, 5)))
        .catch(() => live && setRows([]));
    void load();
    // Poll so ratings refresh after games finish (otherwise Top players goes stale).
    const id = window.setInterval(load, 8000);
    return () => {
      live = false;
      window.clearInterval(id);
    };
  }, [gameId]);

  return (
    <div className="rail-card">
      <div className="rail-head">
        <h4>{t("home.topPlayers")}</h4>
        <span className="rail-tag">{gameMeta(gameId).name}</span>
      </div>
      {rows.length === 0 ? (
        <p className="hint">{t("home.noRanked")}</p>
      ) : (
        <ol className="rail-ranks">
          {rows.map((r, i) => (
            <li key={r.userId}>
              <span className={`rank-badge r${i + 1}`}>{i + 1}</span>
              {r.avatarUrl ? (
                <img className="rail-avatar" src={r.avatarUrl} alt="" />
              ) : (
                <span className="rail-avatar ph">{initial(friendlyName(r.displayName))}</span>
              )}
              <span className="rail-name">{friendlyName(r.displayName)}</span>
              <span className="rail-rating">{r.rating}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function LiveNow({ lobbies, busy, onJoin }: { lobbies: Lobby[]; busy: string; onJoin: (l: Lobby) => void }) {
  const { t } = useT();
  return (
    <div className="rail-card">
      <div className="rail-head">
        <span className="live-dot" />
        <h4>{t("home.liveNow")}</h4>
      </div>
      {lobbies.length === 0 ? (
        <p className="hint">{t("home.noTables")}</p>
      ) : (
        <div className="live-list">
          {lobbies.map((l) => {
            const m = gameMeta(l.gameId);
            const seats = l.seats ?? [];
            const hostName = seats.find((s) => s.player?.id === l.host)?.player?.name ?? seats.find((s) => s.player)?.player?.name ?? "?";
            return (
              <div className="live-row" key={l.id}>
                <span className="live-emoji">{m.emoji}</span>
                <div className="live-meta">
                  <div className="live-game">
                    {m.name}
                    {l.mode === "teams" && <span className="live-mode">{t("home.teams")}</span>}
                  </div>
                  <div className="live-seats">
                    {t("home.seatsHost", { seated: seatedCount(l), total: seats.length, host: hostName })}
                  </div>
                </div>
                <button className="small" disabled={busy === l.id} onClick={() => onJoin(l)}>
                  {busy === l.id ? "…" : t("home.join")}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function initial(name: string): string {
  return (name.trim()[0] ?? "?").toUpperCase();
}
