import { useState } from "react";
import { createMatch, GATEWAY } from "./api.ts";

export function Lobby({ onJoin }: { onJoin: (matchId: string, playerId: string) => void }) {
  const [p1, setP1] = useState("white");
  const [p2, setP2] = useState("black");
  const [side, setSide] = useState<"p1" | "p2">("p1");
  const [joinId, setJoinId] = useState("");
  const [joinName, setJoinName] = useState("black");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function create() {
    setBusy(true);
    setErr("");
    try {
      const m = await createMatch("hive", [p1, p2]);
      onJoin(m.id, side === "p1" ? p1 : p2);
    } catch (e) {
      setErr(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lobby">
      <section className="card">
        <h2>Create a match</h2>
        <label>
          Player 1 <input value={p1} onChange={(e) => setP1(e.target.value)} />
        </label>
        <label>
          Player 2 <input value={p2} onChange={(e) => setP2(e.target.value)} />
        </label>
        <label>
          Join as{" "}
          <select value={side} onChange={(e) => setSide(e.target.value as "p1" | "p2")}>
            <option value="p1">{p1 || "Player 1"}</option>
            <option value="p2">{p2 || "Player 2"}</option>
          </select>
        </label>
        <button disabled={busy} onClick={create}>
          {busy ? "Creating…" : "Create & join"}
        </button>
        <p className="hint">
          After creating, copy the match id from the status bar and send it to your
          opponent, who joins on the right (as the other player).
        </p>
      </section>

      <section className="card">
        <h2>Join a match</h2>
        <label>
          Match id{" "}
          <input value={joinId} onChange={(e) => setJoinId(e.target.value)} placeholder="paste id" />
        </label>
        <label>
          Your name <input value={joinName} onChange={(e) => setJoinName(e.target.value)} />
        </label>
        <button disabled={!joinId || !joinName} onClick={() => onJoin(joinId.trim(), joinName.trim())}>
          Join
        </button>
      </section>

      {err && <p className="error">{err}</p>}
      <p className="gateway">gateway: {GATEWAY}</p>
    </div>
  );
}
