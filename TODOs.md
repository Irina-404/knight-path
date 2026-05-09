# TODOs — Knight's Path

Development is iterative. Each milestone produces a verifiable result.
The full task list per file is in the Appendix at the end.

The order intentionally builds the playable loop early: by the end of M5 a player can already run a full game with the static checkerboard and see win / dead end. Visual polish (knight sprite, parchment service column, animations, sounds) and the surrender solution come after the loop works.

Process decisions:
- No test framework for V1. Verification is done through the "How to verify" checklist in each milestone.
- Debug controls stay enabled during milestone development. The production switch is decided and implemented in M9.

---

## M1 — HTML + empty Canvas

**Status:** Done — confirmed by user.

**Done when:** opening `index.html` in a browser shows a filled green Canvas rectangle.

**Tasks:**
- [x] `index.html`: base document (charset, viewport, title)
- [x] `index.html`: `<canvas>` element with id
- [x] `index.html`: `<noscript>` fallback message; `game.js` checks Canvas support and shows text if unavailable
- [x] `index.html`: CSS — canvas full-screen, page background black, no scrollbar
- [x] `game.js`: `safeStorage` — wrapper over `localStorage` with try/catch (fallback: in-memory object)
- [x] `render.js`: `recomputeLayout(canvas, boardSize)` — computes canvas size from `window.innerWidth/Height`, 4:3 ratio
- [x] `render.js`: `drawBackground()` — fills `COLOR_BG` (`#1A5C35`)
- [x] `game.js`: canvas init, calls `recomputeLayout()` and `drawBackground()` on load
- [x] `game.js`: `window.addEventListener('resize', ...)` → recompute and redraw

**How to verify:**
- Open `index.html` in a browser → green rectangle is visible
- Resize the window → rectangle rescales, 4:3 ratio preserved
- Very wide screen → black letterbox bars on the sides
- Open in private browsing → game loads with no console errors

---

## M2 — Debug mode: layout reference lines

**Status:** Done — confirmed by user.

**Done when:** pressing `D` shows all layout lines with labels on the canvas.

**Tasks:**
- [x] `render.js`: constants for all key X / Y lines as percentages of canvas (per UI_SPEC §1)
- [x] `render.js`: `drawDebugGrid()` — draws all horizontal and vertical lines, labels each (`y_board_top`, `x_col_left`, etc.)
- [x] `game.js`: toggle `debugMode` on `D` keypress; if on, call `drawDebugGrid()` after every `render()`

**How to verify:**
- Press `D` → labelled lines appear over the background
- Press `D` again → lines disappear
- Resize window in debug mode → lines recompute correctly
- Visually compare line positions with UI_SPEC §1 (Key Lines)

---

## M3 — Static layout: board, service column, buttons

**Status:** Done — confirmed by user.

**Done when:** all components are visible in their places (no colors yet beyond stroke, no logic, no interactivity).

**Tasks:**

*Board:*
- [x] `render.js`: `drawBoard(boardSize)` — bronze frame + N×N grid of empty cells, board square inscribed in its zone
- [x] `render.js`: chess-convention checkerboard fill (bottom-left dark)

*Service column (right side, playing screen):*
- [x] `render.js`: `drawServiceColumn()` — parchment vertical strip with placeholder for step counter, Undo, Give up?

*Bottom service zone (welcome / finished):*
- [x] `render.js`: `drawServiceArea()` — placeholder for two side-by-side buttons
- [x] `render.js`: `drawButton(label, x, y, style, disabled?)` — helper: rounded rectangle with label

**M3 implementation notes / spec adjustments:**
- Static preview renders the playing screen only; `Settings & Rules` and `Start game` are reserved for welcome / finished screens.
- Header text is combined as `Knight's Path: Step 2 / 25`.
- `x_board_left/right` and `y_board_top/bottom` define the inner cell grid, while the square board frame is drawn outward from those lines.
- Board coordinates (`a..e`, `1..5` in the M3 preview) are drawn inside the frame next to the grid.
- The right service area uses a full-width rectangular move-history panel from `x_col_left` to `x_right`, a text `Undo` button in the header band, and a full-width `Give up?` button in the lower service band.

**How to verify:**
- Open in browser → board visible on the left, parchment column on the right, bottom service band reserved
- With debug grid on, every component sits inside its zone, nothing crosses the safe margins
- Resize → layout scales, board cells stay square

---

## M4 — Colors per spec

**Status:** Deferred — postponed until cell-state colors can be verified.

**Done when:** everything is colored per UI_SPEC §3; debug mode helps verify positioning.

**Tasks:**
- [ ] `render.js`: full `COLOR` object — background, board cells, bronze, buttons, modal/menu, hint glows, solution overlay (per UI_SPEC §3)
- [ ] `render.js`: `drawCell(cell, x, y)` — fill depends on cell visual state (board-light / board-dark / visited / current / candidate / dead-candidate)
- [ ] `render.js`: `drawBoard()` — bronze frame + chess checkerboard with `BOARD_GRID` separators
- [ ] `render.js`: `drawButton()` — three styles: gold, ghost, give-up; parchment-friendly ghost variant for service column
- [ ] `render.js`: `drawKnight(ctx, cx, cy, size)` — draws the preloaded `knight.webp` sprite into the cell at `~0.80 * cellSize`, preserving aspect ratio. No cell-level glow or ring around the knight; the sprite alone marks the position.

**How to verify:**
- Open in browser → colors match UI_SPEC §3 (compare hex values)
- Debug mode (`D`) — colors did not shift positions
- Subjective: graphics look right against the green background; checkerboard reads as parchment / bronze, not chess black/white

---

## M5a — Welcome screen

**Status:** Done — confirmed by user.

**Done when:** the page opens to a welcome screen; "Start game" leads to a (still inert) playing screen with the knight on `(0, 0)`.

**Tasks:**
- [x] `state.js`: `game` object with `state = "welcome"`, settings loaded from localStorage (default: `boardSize = 5`)
- [x] `state.js`: `loadSettings()`, `saveSettings()`, `safeStorage` (already in `game.js` from M1 — reuse)
- [x] `render.js`: load `knight-path-cover.webp` as `<img>`; draw with cover-fit + dim overlay
- [x] `render.js`: `drawWelcome()` — title "Knight's Path", description, Settings & Rules + Start game buttons
- [x] `render.js`: gold button pulse animation (continuous re-render while `state === "welcome"`)
- [x] `state.js`: `initGame()` — set `startPos = knightPos = (0, 0)`, `path = [(0, 0)]`, `visited = {"0,0"}`, compute `availableMoves`
- [x] `state.js`: `startGame()` — set `state = "playing"`
- [x] `game.js`: click Start game → `initGame()`, `startGame()`, `render()`
- [x] `render.js`: `drawPlaying()` — board + service column + knight on starting cell

**M5a implementation notes:**
- Added `state.js` and wired it before `render.js` / `game.js`.
- Welcome uses `knight-path-cover.webp` with a dark overlay, centered title, centered description, and bottom action buttons.
- `Start game` initializes the route at `(0, 0)` and switches directly to the playing screen.
- The playing screen renders the knight with `knight.webp` instead of a programmatic silhouette.
- The knight has a subtle idle breathing animation while waiting for input; no current-cell outline is drawn.
- The header shows completed moves, so the initial game state displays `Knight's Path: Step 1 / 25`, matching the move history entry `1) a1`.

**How to verify:**
- Open the page → welcome screen with the cover image
- Click Start game → switch to playing screen with knight on the bottom-left cell
- Reload the page → welcome again
- At this stage sound is not requested yet (`AudioContext` lands in M8)

---

## M5b — Settings modal

**Status:** Done — implemented and reviewed.

**Done when:** opening Settings shows the panel with the board-size spinner, continuation-hints toggle, and sound toggle; all values save to localStorage.

**Tasks:**
- [x] `render.js`: `drawSettingsPanel(pending)` — full-width parchment panel with rules, board-size spinner, continuation-hints toggle, sound toggle, Save & Close button
- [x] `render.js`: spinner control (▲▼) for board size, range 5..8
- [x] `render.js`: on/off toggle control for `Continuation hints` (same style as `sea-battle` toggles); hint text under the toggle: "Show how many continuations each move has."
- [x] `render.js`: on/off toggle control for `Sound`; hint text under the toggle: "Play sounds during the game."
- [x] `state.js`: `loadSettings()` parses `knightPath_showCounts` from `"on"` / `"off"`, defaults to `true`, validates
- [x] `state.js`: `saveSettings()` writes `knightPath_showCounts` as `"on"` / `"off"`
- [x] `state.js`: `loadSettings()` / `saveSettings()` parse and write `knightPath_soundEnabled` as `"on"` / `"off"`
- [x] `game.js`: click Settings & Rules → `modal = "settings"`, copy `boardSize`, `showCounts`, `soundEnabled` into pending settings
- [x] `game.js`: clicks inside the panel update `pendingBoardSize`, `pendingShowCounts`, and `pendingSoundEnabled`
- [x] `game.js`: click Save & Close → write pending settings into `game.boardSize`, `game.showCounts`, `game.soundEnabled`, persist via `safeStorage`, close modal, `state = "welcome"`
- [x] `game.js`: click outside the panel → ignored (per spec)

**M5b implementation notes:**
- Settings panel style and interaction model follow `sea-battle`: parchment panel over a dim overlay, section dividers, spinner arrows, segmented toggle, and centered `Save & Close`.
- `Continuation hints` is wired into state and persistence now; the visible gameplay effect of hiding candidate shimmer/counts lands in M6 when hints are rendered.
- `Sound` was added after M8 introduced Web Audio effects; when Off, no AudioContext is created/resumed and synth playback is skipped.

**How to verify:**
- Welcome → Settings opens panel with both controls visible
- Change board size, Save & Close → panel closes, board size in next game reflects new value
- Toggle Continuation hints to Off, Save & Close → next game's board is clean: candidate cells receive no shimmer, no numerals, and no red highlight on traps
- Toggle back to On, Save & Close → turquoise shimmer with numerals reappears on candidate cells; red shimmer reappears on `0`-count traps
- Toggle Sound to Off, Save & Close → gameplay remains silent; toggle back On → sounds play again
- Reload page → values restored from localStorage (`knightPath_boardSize`, `knightPath_showCounts`, `knightPath_soundEnabled`)
- Corrupt the localStorage value (e.g., set `knightPath_showCounts = "garbage"` in DevTools), reload → falls back to On
- Open Settings from finished screen later (see M5c) → Save & Close lands on welcome

---

## M5c — Finished screen (stub)

**Status:** Done — implemented with temporary debug-finish button.

**Done when:** there is a final screen with the result message and two action buttons; reachable via a temporary button.

**Tasks:**
- [x] `state.js`: `result` field; `finishGame(result)` sets `state = "finished"` and `result` (no solution generation yet)
- [x] `render.js`: `drawFinished(game)` — board (with whatever path is on it) + result message + Settings & Rules + New game buttons
- [x] `game.js`: click New game → `initGame()`, `startGame()` (no welcome bounce)
- [x] `game.js`: temporary button "→ Finish (win/deadEnd/surrender)" for testing transitions (remove in M7)

**M5c implementation notes:**
- Temporary `→ Finish` button was used for M5c result-screen testing; it was removed in M6 once real move / win / dead-end flow became playable.
- Surrender result shows only the stub text in M5c; solution-path generation and overlay are deferred to M7.

**How to verify:**
- Use the temporary button to land on the finished screen, cycle through win / deadEnd / surrender — different texts
- Click Settings & Rules → opens settings → Save & Close → returns to welcome
- Click New game → goes to playing directly

---

## M6 — Knight moves + Warnsdorff hints + win / dead-end

**Status:** Done — confirmed by user.

**Done when:** a full game is playable end-to-end. Click candidate cells to move the knight; continuation counts shown; win and dead-end detected and reported.

**Tasks:**
- [x] `state.js`: `KNIGHT_DELTAS`, `knightMoves(x, y)`, `availableMovesFrom(x, y)`
- [x] `state.js`: `continuationCount(C)` — Warnsdorff degree of `C` against `visited ∪ {C}`
- [x] `state.js`: `move(x, y)` — push to path, update visited / knightPos / availableMoves, run end-check (`isWin` first, then `isDeadEnd`), call `finishGame` when due
- [x] `state.js`: `isWin()`, `isDeadEnd()`
- [x] `render.js`: candidate cell shimmer — pulsating turquoise `HINT_SHIMMER` overlay (alpha `0.25 ↔ 0.55`, blur `8 ↔ 22 px`, ~1.5 s sinusoid synced with the gold-button pulse) — only when `game.showCounts === true`. When `showCounts === false`, candidate cells receive **no visual treatment at all** (no shimmer, no number, no red).
- [x] `render.js`: continuation count numeral drawn over the shimmer in `HINT_NUMBER` color — only when `game.showCounts === true`
- [x] `render.js`: zero-count cells use red `DEAD_HINT_SHIMMER` overlay + `0` numeral in `DEAD_HINT_NUMBER` — only when `game.showCounts === true`
- [x] `render.js`: shimmer phase is global (single `t = (now / 1500) * 2π` source) so all candidate cells pulse in sync, not phase-shifted per cell
- [x] `render.js`: visited cells with step number; knight sprite at `knightPos` (no extra glow on the cell — the sprite itself marks the position)
- [x] `render.js`: step counter / squares-left labels in the right service column
- [x] `game.js`: click on board cell → if in `availableMoves`, call `move(x, y)`; else play soft negative tone (sound stubbed in this milestone, real synth in M8)
- [x] `game.js`: hover on candidate cells switches cursor to `pointer` regardless of `showCounts`; visible brightness bump (`HINT_HOVER`) only when `showCounts === true`. Non-candidate cells: cursor `default`, no highlight.

**M6 implementation notes:**
- Rejected-click audio is wired as a stub (`playNegativeTone`) until the Web Audio synths land in M8.
- Temporary `→ Finish` from M5c was removed once real move / win / dead-end flow became playable.
- Move history panel now contains only moves and supports wheel scrolling when the path is longer than the visible area.
- Finished transitions now play a short knight exit: the knight jumps out of the final cell toward the right service area, then the finished screen appears with the final cell numbered.

**How to verify:**
- Start game with hints On → knight on `(0, 0)`, candidate cells shimmer in turquoise with continuation counts, no zeros (yet); pulse rhythm matches the gold-button pulse on the welcome screen
- Click a candidate → knight moves, step number `2` appears on the previous cell, new candidates and counts shown
- Click a non-candidate → nothing happens (sound comes in M8)
- Make a sequence of moves that creates a `0`-count candidate → that cell shimmers red with a `0` numeral
- Set hints to Off in settings, start a new game → board is clean: only the knight, the checkerboard, and (after the first move) step numbers are visible; no shimmer, no numerals, no red highlights anywhere
- In hints-Off mode, hover over a candidate cell → cursor changes to `pointer` but the cell does **not** brighten; clicks still work
- In hints-Off mode, intentionally step into a cell that would have been a `0` → it accepts the click and the next state is a dead end (game ends correctly without prior visual warning)
- Play out a full 5×5 tour → "Well done! / The knight found the path!" on finished screen
- Trap yourself on 5×5 (e.g., make poor choices) → "Dead end! / The knight is trapped." on finished screen

---

## M7 — Undo + Give up + solution display

**Done when:** Undo works, Give up shows a confirm modal, and surrendering reveals one valid Knight's Tour for the current board size.

**Tasks:**
- [x] `state.js`: `undo()` — pop last cell, restore knightPos / visited / availableMoves
- [x] `state.js`: `surrender()` — set `result = "surrender"`, call `solveTour(boardSize, 0, 0)`, store in `solutionPath`, transition to finished
- [x] `state.js`: `solveTour(boardSize, startX, startY)` — backtracking with Warnsdorff heuristic; returns ordered list of cells of length `boardSize²` or `null`
- [x] `render.js`: Undo button (ghost on parchment) and Give up? button (muted) in the right service column
- [x] `render.js`: confirm modal `drawConfirmModal(title, body, sureLabel)` matching `sea-battle` style
- [x] `render.js`: solution overlay on finished screen — `solutionTrail` animation, then static faint trail with small numerals in cell corners
- [x] `game.js`: click Undo → `undo()`; disabled when `path.length < 2`; keyboard `U` (or `Ctrl+Z`) also triggers undo
- [x] `game.js`: click Give up? → `modal = "confirmGiveUp"`; "Yes, sorry!" → `surrender()`; "Let me think again..." or click outside → `modal = null`
- [x] Removed temporary "→ Finish" button from M5c

**Status:** Done — confirmed by user.

**Implemented changes:**
- Undo is wired to the right-column button, `U`, and `Ctrl+Z`; it restores the knight position, visited set, available moves, hover state, and history scroll.
- Give up opens a Sea Battle-style confirmation modal; cancel/outside click returns to the current game, confirm finishes as surrender.
- Surrender computes a live Warnsdorff/backtracking tour from `a1` for board sizes 5..8 and stores it as `solutionPath`.
- The surrender finished screen clears the player's partial path and animates the solution trail on a clean board, with large bright step numbers.

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
- After the trail completes, the solution trail remains visible on a clean board with large bright step numbers
- Surrender on each of 5×5, 6×6, 7×7, 8×8 → a full valid tour is shown each time

---

## M8 — Animations + sounds

**Done when:** remaining gameplay events have visual + audio feedback: move/undo flashes, victory starfall, and lightweight synth sounds.

**Tasks:**
- [x] `render.js`: `effects` array; `pushEffect(effect)`; render-loop pass that draws and prunes effects
- [x] `render.js`: `moveFlash` and `undoFade` effects
- [x] `render.js`: target hover highlight on candidate cells (already shown in M6 — this milestone only adds the moveFlash on click)
- [x] `render.js`: knight idle breathing animation — implemented earlier; kept as-is in M8
- [x] `render.js`: finished-screen result illustrations in the right service area — static image selected by `game.result` (`finish-win.webp`, `finish-dead-end.webp`, `finish-surrender.webp`), drawn with contain-fit between the result message and action buttons
- [x] `render.js`: subtle `starfall` effect for `result === "win"` only — small gold stars drifting/twinkling over the right service area illustration; no route/path animation involved
- [x] `game.js`: AudioContext created lazily on first user gesture inside the iframe
- [x] `game.js`: synth functions for wooden knight click, soft negative tone, reverse tone (undo), victory arpeggio, defeat tones
- [x] `game.js`: input blocked while a board-mutating animation (`moveFlash`, `undoFade`) is running
- [x] `game.js` / `render.js`: move-history scrollbar thumb can be dragged directly, in addition to wheel/touch scroll

**Status:** Done — confirmed by user.

**Scope notes:**
- `deadEndPulse`, `defeat`, and the old board-glow `victory` effect were removed from M8 scope. The game now uses the existing knight exit animation before finished screens.
- `solutionTrail` was completed in M7 and remains unchanged in M8.
- Victory feedback is the right-panel `starfall` effect plus a short arpeggio.
- Move-history scrolling now supports mouse/thumb dragging on the right scrollbar.

**How to verify:**
- Click a candidate → knight moves with a soft golden flash on the new cell, wooden click sound
- Click a non-candidate → no move, soft negative tone
- Press Undo → cool-blue fade on the cell that was abandoned, reverse-tone sound
- Win a game → knight exits, finished screen appears, victory arpeggio plays, and starfall drifts over the win illustration
- Trap the knight → knight exits, finished screen appears, and a short descending tone plays
- Surrender → existing M7 solution trail still draws cell-by-cell at ~80 ms each
- Finished screen → the right service area shows the correct static illustration for win / deadEnd / surrender
- Win finished screen → a light starfall plays over the illustration; deadEnd and surrender illustrations remain static
- Toggle to a wider window during animation → effect continues over the correct cell
- Drag the move-history scrollbar thumb → history scroll position follows the thumb
- All sounds gracefully degrade if AudioContext fails (no exceptions thrown)

---

## M9 — Polish

**Done when:** the game behaves correctly across resize, touch, iframe embedding, and looks consistent across the series.

**Tasks:**
- [ ] Resize: change window size during welcome, playing, finished — layout recomputes, state preserved
- [ ] Touch: tap-to-move, Undo, Give up?, settings spinner work in DevTools touch emulation and on a real phone
- [ ] iframe: embed in a host page at 800×600 and smaller; verify aspect ratio + letterbox
- [ ] localStorage: settings round-trip (set, reload, verify) for both `knightPath_boardSize` and `knightPath_showCounts`
- [ ] Animations: timings feel right; nothing blocks input longer than expected
- [ ] Debug keys: `D` and `I` do not collide with gameplay shortcuts (`U` for undo is the only game-level shortcut; check it is not the same key elsewhere in the series)
- [ ] Visual polish: bronze frames, parchment service column and modals, gold buttons match `puzzle-coins` and `sea-battle` so the games feel like one series
- [ ] Strings: every piece of UI text is in `strings.en` so future localization is mechanical
- [ ] Production build: ensure debug handlers are not registered by default
- [ ] Knight sprite: visual review of `knight.webp` against the cover art and the bronze/parchment board on every board size (5×5..8×8); swap the asset if needed — `drawKnight` is the single point of change

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
- `drawKnight(ctx, cx, cy, size)` — draws the preloaded `knight.webp` sprite at `~0.80 * cellSize`, preserves aspect ratio, no cell-level glow (single point of change if the sprite is ever swapped)
- `drawStepNumber(x, y, n)` (visited cells)
- `drawContinuationCount(x, y, n)` (candidate cells; red variant for `0`)
- `drawServiceColumn()` — parchment strip + step counter + Undo + Give up?
- `drawHeader()` — "Step: N" status line
- `drawButton(label, x, y, style, disabled?)` — gold / ghost / parchment-ghost / give-up styles
- `drawWelcome()` (with cover image + dim overlay)
- `drawPlaying()` (board + service column + header)
- `drawFinished()` (board with player path + solution overlay if surrender + result message + buttons)
- `drawSettingsPanel(pending)` with board-size spinner and continuation-hints toggle
- `drawConfirmModal(title, body, sureLabel)`
- `drawToast(text)`
- `drawTargetHover(cell)`
- Animation effect renderers: moveFlash, undoFade, starfall
- `render()`: top-level dispatcher by `state` and `modal`

</details>

<details>
<summary>game.js</summary>

- Canvas setup + resize listener
- Image preload for `knight-path-cover.webp` and `knight.webp`
- AudioContext lazy creation on first gesture
- Synth functions: wooden knight click, soft negative tone, reverse tone, victory arpeggio, defeat tones
- Hit-test helpers: `hitButton`, `hitBoardCell`, `hitMenuButton`
- Click handlers: Settings & Rules, Save & Close, Start game, New game, Undo, Give up?, modal buttons
- Board click → `move(x, y)` if valid, negative tone otherwise
- Hover handler: highlight candidate cells, switch cursor
- Keyboard: `U` / Ctrl+Z (undo, playing only), `D` (debug grid), `I` (debug info)
- Animation loop: requestAnimationFrame, advance effects, redraw, block input while board-mutating effect is active
- Initialization on load: `loadSettings()`, `state = "welcome"`, `render()`
- Debug toggles registered only in dev builds

</details>
