# TODOs — Knight's Path

Development is iterative. Each milestone produces a verifiable result.
The full task list per file is in the Appendix at the end.

The order intentionally builds the playable loop early: by the end of M5 a player can already run a full game with the static checkerboard and see win / dead end. Visual polish (knight sprite, parchment service column, animations, sounds) and the surrender solution come after the loop works.

Process decisions:
- No test framework for V1. Verification is done through the "How to verify" checklist in each milestone.
- Debug controls stay enabled during milestone development. The production switch is decided and implemented in M9.

---

## M1 — HTML + empty Canvas

**Done when:** opening `index.html` in a browser shows a filled green Canvas rectangle.

**Tasks:**
- [ ] `index.html`: base document (charset, viewport, title)
- [ ] `index.html`: `<canvas>` element with id
- [ ] `index.html`: `<noscript>` fallback message; `game.js` checks Canvas support and shows text if unavailable
- [ ] `index.html`: CSS — canvas full-screen, page background black, no scrollbar
- [ ] `game.js`: `safeStorage` — wrapper over `localStorage` with try/catch (fallback: in-memory object)
- [ ] `render.js`: `recomputeLayout(canvas, boardSize)` — computes canvas size from `window.innerWidth/Height`, 4:3 ratio
- [ ] `render.js`: `drawBackground()` — fills `COLOR_BG` (`#1A5C35`)
- [ ] `game.js`: canvas init, calls `recomputeLayout()` and `drawBackground()` on load
- [ ] `game.js`: `window.addEventListener('resize', ...)` → recompute and redraw

**How to verify:**
- Open `index.html` in a browser → green rectangle is visible
- Resize the window → rectangle rescales, 4:3 ratio preserved
- Very wide screen → black letterbox bars on the sides
- Open in private browsing → game loads with no console errors

---

## M2 — Debug mode: layout reference lines

**Done when:** pressing `D` shows all layout lines with labels on the canvas.

**Tasks:**
- [ ] `render.js`: constants for all key X / Y lines as percentages of canvas (per UI_SPEC §1)
- [ ] `render.js`: `drawDebugGrid()` — draws all horizontal and vertical lines, labels each (`y_board_top`, `x_col_left`, etc.)
- [ ] `game.js`: toggle `debugMode` on `D` keypress; if on, call `drawDebugGrid()` after every `render()`

**How to verify:**
- Press `D` → labelled lines appear over the background
- Press `D` again → lines disappear
- Resize window in debug mode → lines recompute correctly
- Visually compare line positions with UI_SPEC §1 (Key Lines)

---

## M3 — Static layout: board, service column, buttons

**Done when:** all components are visible in their places (no colors yet beyond stroke, no logic, no interactivity).

**Tasks:**

*Board:*
- [ ] `render.js`: `drawBoard(boardSize)` — bronze frame + N×N grid of empty cells, board square inscribed in its zone
- [ ] `render.js`: chess-convention checkerboard fill (bottom-left dark)

*Service column (right side, playing screen):*
- [ ] `render.js`: `drawServiceColumn()` — parchment vertical strip with placeholder for step counter, Undo, Give up?

*Bottom service zone (welcome / finished):*
- [ ] `render.js`: `drawServiceArea()` — placeholder for two side-by-side buttons
- [ ] `render.js`: `drawButton(label, x, y, style, disabled?)` — helper: rounded rectangle with label

**How to verify:**
- Open in browser → board visible on the left, parchment column on the right, bottom service band reserved
- With debug grid on, every component sits inside its zone, nothing crosses the safe margins
- Resize → layout scales, board cells stay square

---

## M4 — Colors per spec

**Done when:** everything is colored per UI_SPEC §3; debug mode helps verify positioning.

**Tasks:**
- [ ] `render.js`: full `COLOR` object — background, board cells, bronze, buttons, modal/menu, hint glows, solution overlay (per UI_SPEC §3)
- [ ] `render.js`: `drawCell(cell, x, y)` — fill depends on cell visual state (board-light / board-dark / visited / current / candidate / dead-candidate)
- [ ] `render.js`: `drawBoard()` — bronze frame + chess checkerboard with `BOARD_GRID` separators
- [ ] `render.js`: `drawButton()` — three styles: gold, ghost, give-up; parchment-friendly ghost variant for service column
- [ ] `render.js`: `drawKnight(ctx, cx, cy, size)` — programmatic bronze knight silhouette (placeholder shape OK in this milestone, refined later)

**How to verify:**
- Open in browser → colors match UI_SPEC §3 (compare hex values)
- Debug mode (`D`) — colors did not shift positions
- Subjective: graphics look right against the green background; checkerboard reads as parchment / bronze, not chess black/white

---

## M5a — Welcome screen

**Done when:** the page opens to a welcome screen; "Start game" leads to a (still inert) playing screen with the knight on `(0, 0)`.

**Tasks:**
- [ ] `state.js`: `game` object with `state = "welcome"`, settings loaded from localStorage (default: `boardSize = 5`)
- [ ] `state.js`: `loadSettings()`, `saveSettings()`, `safeStorage` (already in `game.js` from M1 — reuse)
- [ ] `render.js`: load `knight-path-cover.webp` as `<img>`; draw with cover-fit + dim overlay
- [ ] `render.js`: `drawWelcome()` — title "Knight's Path", description, Settings & Rules + Start game buttons
- [ ] `render.js`: gold button pulse animation (continuous re-render while `state === "welcome"`)
- [ ] `state.js`: `initGame()` — set `startPos = knightPos = (0, 0)`, `path = [(0, 0)]`, `visited = {"0,0"}`, compute `availableMoves`
- [ ] `state.js`: `startGame()` — set `state = "playing"`
- [ ] `game.js`: click Start game → `initGame()`, `startGame()`, `render()`
- [ ] `render.js`: `drawPlaying()` — board + service column + knight on starting cell

**How to verify:**
- Open the page → welcome screen with the cover image
- Click Start game → switch to playing screen with knight on the bottom-left cell
- Reload the page → welcome again
- Sound is not requested yet (`AudioContext` not created)

---

## M5b — Settings modal

**Done when:** opening Settings shows the panel with the board size spinner; value saves to localStorage.

**Tasks:**
- [ ] `render.js`: `drawSettingsPanel(pending)` — full-width parchment panel with rules, board-size spinner, Save & Close button
- [ ] `render.js`: spinner control (▲▼) for board size, range 5..8
- [ ] `game.js`: click Settings & Rules → `modal = "settings"`, copy current settings into `pending*`
- [ ] `game.js`: clicks inside the panel update `pendingBoardSize`
- [ ] `game.js`: click Save & Close → write `pendingBoardSize` into `game.boardSize`, persist via `safeStorage`, close modal, `state = "welcome"`
- [ ] `game.js`: click outside the panel → ignored (per spec)

**How to verify:**
- Welcome → Settings opens panel
- Change board size, Save & Close → panel closes, board size in next game reflects new value
- Reload page → value restored from localStorage
- Open Settings from finished screen later (see M5c) → Save & Close lands on welcome

---

## M5c — Finished screen (stub)

**Done when:** there is a final screen with the result message and two action buttons; reachable via a temporary button.

**Tasks:**
- [ ] `state.js`: `result` field; `finishGame(result)` sets `state = "finished"` and `result` (no solution generation yet)
- [ ] `render.js`: `drawFinished(game)` — board (with whatever path is on it) + result message + Settings & Rules + New game buttons
- [ ] `game.js`: click New game → `initGame()`, `startGame()` (no welcome bounce)
- [ ] `game.js`: temporary button "→ Finish (win/deadEnd/surrender)" for testing transitions (remove in M7)

**How to verify:**
- Use the temporary button to land on the finished screen, cycle through win / deadEnd / surrender — different texts
- Click Settings & Rules → opens settings → Save & Close → returns to welcome
- Click New game → goes to playing directly

---

## M6 — Knight moves + Warnsdorff hints + win / dead-end

**Done when:** a full game is playable end-to-end. Click candidate cells to move the knight; continuation counts shown; win and dead-end detected and reported.

**Tasks:**
- [ ] `state.js`: `KNIGHT_DELTAS`, `knightMoves(x, y)`, `availableMovesFrom(x, y)`
- [ ] `state.js`: `continuationCount(C)` — Warnsdorff degree of `C` against `visited ∪ {C}`
- [ ] `state.js`: `move(x, y)` — push to path, update visited / knightPos / availableMoves, run end-check (`isWin` first, then `isDeadEnd`), call `finishGame` when due
- [ ] `state.js`: `isWin()`, `isDeadEnd()`
- [ ] `render.js`: candidate cell highlight (`HINT_GLOW` ring) and continuation count numeral on each candidate
- [ ] `render.js`: zero-count cells use `DEAD_HINT_GLOW` red ring + `0` numeral
- [ ] `render.js`: visited cells with step number; knight sprite at `knightPos` with `CURRENT_GLOW`
- [ ] `render.js`: step counter / squares-left labels in the right service column
- [ ] `game.js`: click on board cell → if in `availableMoves`, call `move(x, y)`; else play soft negative tone (sound stubbed in this milestone, real synth in M8)
- [ ] `game.js`: hover highlight on candidate cells; cursor switches between `pointer` / `default`

**M6 implementation notes:** keep the temporary "→ Finish" button from M5c until M7 ships the proper Give up flow.

**How to verify:**
- Start game → knight on `(0, 0)`, candidate cells show counts, no zeros (yet)
- Click a candidate → knight moves, step number `2` appears on the previous cell, new candidates and counts shown
- Click a non-candidate → nothing happens (sound comes in M8)
- Play out a full 5×5 tour → "Well done! / The knight found the path!" on finished screen
- Trap yourself on 5×5 (e.g., make poor choices) → "Dead end! / The knight is trapped." on finished screen

---

## M7 — Undo + Give up + solution display

**Done when:** Undo works, Give up shows a confirm modal, and surrendering reveals one valid Knight's Tour for the current board size.

**Tasks:**
- [ ] `state.js`: `undo()` — pop last cell, restore knightPos / visited / availableMoves
- [ ] `state.js`: `surrender()` — set `result = "surrender"`, call `solveTour(boardSize, 0, 0)`, store in `solutionPath`, transition to finished
- [ ] `state.js`: `solveTour(boardSize, startX, startY)` — backtracking with Warnsdorff heuristic; returns ordered list of cells of length `boardSize²` or `null`
- [ ] `render.js`: Undo button (ghost on parchment) and Give up? button (muted) in the right service column
- [ ] `render.js`: confirm modal `drawConfirmModal(title, body, sureLabel)` matching `sea-battle` style
- [ ] `render.js`: solution overlay on finished screen — `solutionTrail` animation, then static faint trail with small numerals in cell corners
- [ ] `game.js`: click Undo → `undo()`; disabled when `path.length < 2`; keyboard `U` (or `Ctrl+Z`) also triggers undo
- [ ] `game.js`: click Give up? → `modal = "confirmGiveUp"`; "Yes, sorry!" → `surrender()`; "Let me think again..." or click outside → `modal = null`
- [ ] Removed temporary "→ Finish" button from M5c

**M7 implementation notes:**

*Solution generator choice:* try the live backtracking solver first. If it stably completes within one frame on all four board sizes from `(0, 0)`, ship it. If it stalls, fall back to a precomputed table (`PRECOMPUTED_TOURS[5..8]`) — see GAME_LOGIC_SPEC §6.3. The public signature `solveTour` does not change.

*Undo affordance:* button uses ghost styling and shows a disabled state (grey, no hover) before the first move. Sound on undo is also stubbed here, real synth lands in M8.

**How to verify:**
- Make 3 moves, click Undo three times → knight returns to `(0, 0)`, all candidate counts recomputed correctly
- Undo when no moves are made → button is disabled, click does nothing
- Press `U` → same as clicking Undo
- Click Give up? → confirm modal appears
- "Let me think again..." → modal closes, game continues from the same position
- "Yes, sorry!" → finished screen with "No worries! / Here is one possible path."; the solution trail animates over the board
- After the trail completes, faint trail and small numerals remain visible alongside the player's own step numbers
- Surrender on each of 5×5, 6×6, 7×7, 8×8 → a full valid tour is shown each time

---

## M8 — Animations + sounds

**Done when:** all gameplay events have the visual + audio feedback described in GAME_LOGIC_SPEC §9 and UI_SPEC §8–9.

**Tasks:**
- [ ] `render.js`: `effects` array; `pushEffect(effect)`; render-loop pass that draws and prunes effects
- [ ] `render.js`: `moveFlash`, `undoFade`, `deadEndPulse`, `victory`, `defeat` effects
- [ ] `render.js`: `solutionTrail` effect (animates the surrender solution; M7 placeholder replaced with real animation)
- [ ] `render.js`: target hover highlight on candidate cells (already shown in M6 — this milestone only adds the moveFlash on click)
- [ ] `render.js`: refined `drawKnight` — bronze gradient + outline silhouette, polished from the M4 placeholder
- [ ] `game.js`: AudioContext created lazily on first user gesture inside the iframe
- [ ] `game.js`: synth functions for wooden knight click, soft negative tone, reverse tone (undo), victory arpeggio, defeat tones
- [ ] `game.js`: input blocked while a board-mutating animation (`moveFlash`, `undoFade`) is running

**How to verify:**
- Click a candidate → knight moves with a soft golden flash on the new cell, wooden click sound
- Click a non-candidate → no move, soft negative tone
- Press Undo → cool-blue fade on the cell that was abandoned, reverse-tone sound
- Win a game → board glows golden, ascending arpeggio
- Trap the knight → red pulses around the trapped cell, descending tones, then "Dead end!" text fades in
- Surrender → solution trail draws cell-by-cell at ~80 ms each, descending tones at the start
- Toggle to a wider window during animation → effect continues over the correct cell
- All sounds gracefully degrade if AudioContext fails (no exceptions thrown)

---

## M9 — Polish

**Done when:** the game behaves correctly across resize, touch, iframe embedding, and looks consistent across the series.

**Tasks:**
- [ ] Resize: change window size during welcome, playing, finished — layout recomputes, state preserved
- [ ] Touch: tap-to-move, Undo, Give up?, settings spinner work in DevTools touch emulation and on a real phone
- [ ] iframe: embed in a host page at 800×600 and smaller; verify aspect ratio + letterbox
- [ ] localStorage: settings round-trip (set, reload, verify) for `boardSize`
- [ ] Animations: timings feel right; nothing blocks input longer than expected
- [ ] Debug keys: `D` and `I` do not collide with gameplay shortcuts (`U` for undo is the only game-level shortcut; check it is not the same key elsewhere in the series)
- [ ] Visual polish: bronze frames, parchment service column and modals, gold buttons match `puzzle-coins` and `sea-battle` so the games feel like one series
- [ ] Strings: every piece of UI text is in `strings.en` so future localization is mechanical
- [ ] Production build: ensure debug handlers are not registered by default
- [ ] Knight sprite: review the programmatic silhouette against the cover art aesthetic; replace with raster asset if needed (single point of change in `drawKnight`)

---

## Appendix — full task list per file

<details>
<summary>state.js</summary>

- Type aliases: `BoardSize`, `GameState`, `ModalState`, `GameResult`
- `Cell` shape `{ x, y }`
- `game` object with all fields from GAME_LOGIC_SPEC §1.2
- `KNIGHT_DELTAS`
- `key(c)` helper (`"x,y"` for `visited` Set membership)
- `safeStorage` wrapper
- `loadSettings()`, `saveSettings()`
- `initGame()` — set startPos / knightPos / path / visited / availableMoves; clear modal / result / solutionPath
- `startGame()` — `state = "playing"`
- `knightMoves(x, y)`
- `availableMovesFrom(x, y)`
- `continuationCount(C)` — Warnsdorff degree against `visited ∪ {C}`
- `move(x, y)` — apply move, update state, run end-check
- `undo()` — pop path, restore previous state
- `isWin()`, `isDeadEnd()`
- `finishGame(result)` — set result + state, generate solution on surrender
- `surrender()` — modal=null, finishGame("surrender")
- `solveTour(boardSize, startX, startY)` — Warnsdorff backtracking; precomputed fallback if needed
- `PRECOMPUTED_TOURS` table (only if backtracking proves unstable)

</details>

<details>
<summary>render.js</summary>

- `recomputeLayout(canvas, boardSize)`: all constants from canvas dimensions
- `COLOR` object (full)
- `effects` array, `pushEffect()`, render-loop integration
- `drawBackground()`
- `drawDebugGrid()`
- `drawDebugInfo()` (I key)
- `drawCell(x, y)` — checkerboard base + visited / current / candidate / dead-candidate overlay
- `drawBoard()` with frame
- `drawKnight(ctx, cx, cy, size)` — bronze knight silhouette (single point of change for future raster swap)
- `drawStepNumber(x, y, n)` (visited cells)
- `drawContinuationCount(x, y, n)` (candidate cells; red variant for `0`)
- `drawServiceColumn()` — parchment strip + step counter + Undo + Give up?
- `drawHeader()` — "Step: N" status line
- `drawButton(label, x, y, style, disabled?)` — gold / ghost / parchment-ghost / give-up styles
- `drawWelcome()` (with cover image + dim overlay)
- `drawPlaying()` (board + service column + header)
- `drawFinished()` (board with player path + solution overlay if surrender + result message + buttons)
- `drawSettingsPanel(pending)` with spinner
- `drawConfirmModal(title, body, sureLabel)`
- `drawToast(text)`
- `drawTargetHover(cell)`
- Animation effect renderers: moveFlash, undoFade, deadEndPulse, solutionTrail, victory, defeat
- `render()`: top-level dispatcher by `state` and `modal`

</details>

<details>
<summary>game.js</summary>

- Canvas setup + resize listener
- Image preload for `knight-path-cover.webp`
- AudioContext lazy creation on first gesture
- Synth functions: wooden knight click, soft negative tone, reverse tone, victory arpeggio, defeat tones — all stubbed in M6, real synthesis in M8
- Hit-test helpers: `hitButton`, `hitBoardCell`, `hitMenuButton`
- Click handlers: Settings & Rules, Save & Close, Start game, New game, Undo, Give up?, modal buttons
- Board click → `move(x, y)` if valid, negative tone otherwise
- Hover handler: highlight candidate cells, switch cursor
- Keyboard: `U` / Ctrl+Z (undo, playing only), `D` (debug grid), `I` (debug info)
- Animation loop: requestAnimationFrame, advance effects, redraw, block input while board-mutating effect is active
- Initialization on load: `loadSettings()`, `state = "welcome"`, `render()`
- Debug toggles registered only in dev builds

</details>
