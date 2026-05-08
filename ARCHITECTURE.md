# Architecture — Knight's Path

## Technology Stack

- **Vanilla JavaScript** — no frameworks, no dependencies
- **HTML5 Canvas API** — all visuals drawn programmatically
- **Web Audio API** — sound synthesis (no audio files)
- **localStorage** — persisting user settings (board size only in V1)
- **Deployment** — static files, no server required
- **Embedding** — via `<iframe>` in WordPress, Notion, or any HTML page

## File Structure

```
knight-path/
  index.html               — entry point, canvas element, loads scripts
  state.js                 — game state object, logic, state machine (see GAME_LOGIC_SPEC.md)
  render.js                — all drawing, layout constants, colors, animations (see UI_SPEC.md)
  game.js                  — initialization, event handling, game loop, wires state ↔ render
  knight-path-cover.webp   — background image for the welcome screen
```

The knight piece itself is drawn programmatically as a bronze silhouette (no asset file), to match the bronze-on-parchment aesthetic of the series. A future iteration may swap it for a hand-drawn asset; the rendering function `drawKnight(ctx, x, y, size)` is the single point of change.

## Responsibilities

| File | Responsibility |
|------|---------------|
| `index.html` | HTML skeleton, `<canvas>` element, script tags |
| `state.js` | Game state object, board generation, knight moves, Warnsdorff counts, undo, win/dead-end detection, solution generation, settings persistence |
| `render.js` | Canvas drawing, layout constants, colors, animations, all draw functions |
| `game.js` | Entry point, input handling (mouse/touch/keyboard), animation loop, connects state and render |
| `knight-path-cover.webp` | Atmospheric background for welcome screen (loaded as `<img>`, drawn with cover-fit) |

## Architectural Rules

- `state.js` has no knowledge of Canvas or DOM — pure data and logic
- `render.js` reads game state but never modifies it
- `game.js` is the only place that handles input and calls both state and render
- All layout constants live in a single `layout` object in `render.js`, recomputed on every resize
- All colors live in a single `COLOR` object in `render.js`
- Active animation effects live in a single `effects` array in `render.js`, items reference cells by `(x, y)` — never pixel coordinates — so resize is safe
- All comments in code: English only

## Data Flow

```
user input (mouse / touch / keyboard)
        ↓
     game.js
     ↙     ↘
state.js  render.js
```

`game.js` receives input → calls `state.js` to update state → calls `render.js` to redraw.

## Public API Surface

`game.js` calls these functions from `state.js`:

| Function | Description |
|----------|-------------|
| `loadSettings()` | Read settings from localStorage, fall back to defaults, validate / clamp |
| `saveSettings()` | Persist current pending settings to localStorage |
| `initGame()` | Initialise a new game from current settings: place knight on the start cell `(0, 0)`, reset path / visited / availableMoves, clear modal and result |
| `startGame()` | Transition `state = "playing"` after `initGame()` (called from welcome and from `New game`) |
| `knightMoves(x, y)` | Returns the 8 candidate knight moves from `(x, y)` that are inside the board (geometry only, ignores `visited`) |
| `availableMovesFrom(x, y)` | Returns moves from `knightMoves(x, y)` filtered to cells not in `visited` |
| `continuationCount(x, y)` | Warnsdorff count: number of available moves **from** `(x, y)` after `(x, y)` is marked visited |
| `move(x, y)` | Apply a player move to a candidate cell: push to `path`, add to `visited`, update `knightPos`, recompute `availableMoves`, run end-check |
| `undo()` | Pop the last move, restore previous `knightPos`, `visited`, `availableMoves` |
| `surrender()` | Set `result = "surrender"`, transition to `"finished"`, compute or load a valid full Knight's Tour from `(0, 0)` for the current `boardSize` and store it in `solutionPath` |
| `solveTour(boardSize, startX, startY)` | Returns one valid Knight's Tour as an ordered array of `(x, y)` cells, or `null` on failure. Uses backtracking with Warnsdorff heuristic. May fall back to a precomputed table — see GAME_LOGIC_SPEC §6.3 |
| `isWin()` | Returns true when `path.length === boardSize * boardSize` |
| `isDeadEnd()` | Returns true when `availableMoves.length === 0` and `!isWin()` |

`game.js` reads the `game` object (and `layout` object) directly.

`game.js` calls these functions from `render.js`:

| Function | Description |
|----------|-------------|
| `recomputeLayout(canvas, boardSize)` | Recompute all layout constants from canvas size and current board size |
| `render()` | Full redraw of current state |
| `drawSettingsPanel(pending)` | Returns hit regions for settings panel |
| `drawConfirmModal(title, body, sureLabel)` | Returns hit regions for confirm popup |
| `drawDebugGrid(ctx)` | Draw layout reference lines |
| `drawDebugInfo(ctx)` | Draw debug text overlay |
| `boardCellRect(x, y)` | Returns screen rect for a board cell |
| `pushEffect(effect)` | Schedules an animation effect (move-flash, undo-fade, dead-end pulse, solution-trail, victory, defeat) |

## Settings Persistence

User settings are stored in `localStorage` under these keys:

| Key | Values | Default |
|-----|--------|---------|
| `knightPath_boardSize` | `5..8` | `5` |

Game progress (current path, visited cells) is **not persisted**. A page reload returns the game to the welcome screen.

Falls back to an in-memory object if `localStorage` is unavailable (private browsing). Values are validated and clamped on load.

```js
const safeStorage = {
  _fallback: {},
  get(key) { try { return localStorage.getItem(key); } catch { return this._fallback[key] ?? null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { this._fallback[key] = value; } },
};
```

## Sound

All sounds are synthesized via the Web Audio API — no audio files needed.
`AudioContext` is created lazily on the first user gesture inside the iframe (browser autoplay policy). Gestures in the parent page do not count.

A future `Sound: On / Off` setting will gate the synth functions; in V1 sound is always on.

| Trigger | Sound |
|---------|-------|
| Knight move (valid click on candidate cell) | Wooden / chess-piece click |
| Click on a non-candidate cell | Soft negative tone (short, non-harsh) |
| Undo | Soft reverse tone |
| Win (full board covered) | Ascending arpeggio C-E-G-C |
| Dead end | Two soft descending tones G-C |
| Surrender | Two soft descending tones G-C (same family as dead end) |

## Embedding

```html
<iframe src="knight-path/index.html" width="800" height="600"
        style="border:none; aspect-ratio:4/3;">
</iframe>
```

The canvas maintains a 4:3 aspect ratio and recomputes layout on resize.
Letterboxing (black bars) appears on viewports wider than 4:3.

## Debug Modes

Two debug modes toggled by keyboard. Debug controls stay enabled during milestone development. The production switch is decided and implemented in M9, so production embeds can avoid key collisions with other games of the series.

| Key | Effect |
|-----|--------|
| `D` | Draw all named layout lines with labels (yellow overlay) |
| `I` | Show debug info: `phase`, `boardSize`, `knightPos`, `path.length`, `availableMoves.length`, continuation counts of all candidates, `isWin()` / `isDeadEnd()` flags |
