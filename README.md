# @bordiko/frontend

The web client — React + Vite + TypeScript. Talks to the **gateway** (REST for
lobby, WebSocket for play); the gateway forwards to the authoritative game-host.

## What's here (Phase 4)

- **Lobby** (`Lobby.tsx`) — create a Hive match (or join one by id).
- **WS client** (`useMatch.ts`) — one socket per player/match; renders the latest
  redacted state the server pushes, sends move intents (never trusts local state).
- **Hex board** (`HexBoard.tsx` + `hexgeom.ts`) — SVG pointy-top renderer for
  Hive: draws the stacks, highlights the server-provided legal moves, and lets
  you place from your hand or move a piece by clicking. Beetles show a stack
  count (`B·2`). A **Pass** button appears when the server says there are no
  legal moves.
- **Status bar** (`Game.tsx`) — connection dot, match id, whose turn, result.

The wire types in `wire.ts` mirror `@bordiko/shared`'s protocol (the canonical
spec) plus the Hive state shape the renderer needs.

## Run it

```bash
# Easiest — the whole stack (game-host + gateway + this) in one command:
npm run dev                    # from repo root; open http://localhost:5173 in two tabs

# Or just the web dev server (point it at a running gateway):
npm run web:dev                # VITE_GATEWAY_URL defaults to http://localhost:8080

# Production build:
npm run web:build              # → packages/frontend/dist
```

Two-player local test: open `http://localhost:5173` in two tabs. In tab 1, pick
a side and **Create & join**; copy the match id from the status bar; in tab 2,
**Join** with that id as the other player. Play Hive.

## Notes

- Custom third-party game UIs (Phase 6) run in a sandboxed iframe; the built-in
  hex/board renderers (like this Hive board) are first-party and render directly.
- No client-side game logic: legal moves come from the server, so the client
  can't desync or cheat.
