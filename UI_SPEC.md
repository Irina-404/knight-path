# UI Specification — Knight's Path

## 0. Scope

Visual layout, components, colors, and UI states. No game logic here. See `GAME_LOGIC_SPEC.md` for the state machine and `SERIES_STYLE_GUIDE.md` for shared series conventions.

---

## 1. Canvas & Layout

- Aspect ratio: **4:3** (fixed)
- Safe margins: **5%** on all sides
- Origin: top-left (X→right, Y→down) for screen coordinates; the model uses bottom-left origin and the renderer flips Y when drawing the board
- Letterboxing: black bars on wider viewports

### Key Lines (percent of canvas dimensions)

| Name | % | Purpose |
|------|---|---------|
| `y_top` | 5% | safe top |
| `y_header` | 14% | bottom of header band ("Step: N") |
| `y_board_top` | 18% | top edge of board |
| `y_board_bottom` | 90% | bottom edge of board (also bottom of right column) |
| `y_service_mid` | 88% | service zone center (welcome / finished only — buttons live here) |
| `y_bottom` | 95% | safe bottom |

| Name | % | Purpose |
|------|---|---------|
| `x_left` | 5% | safe left |
| `x_board_left` | 8% | board left edge |
| `x_board_right` | 64% | board right edge (board square fills this column) |
| `x_col_left` | 70% | service column left edge |
| `x_col_right` | 92% | service column right edge |
| `x_center` | 50% | canvas center |
| `x_right` | 95% | safe right |

The board is **square**, centered vertically inside `(y_board_top → y_board_bottom)` and horizontally inside `(x_board_left → x_board_right)`. Whichever axis is tighter sets the side; the other axis adds equal padding on both sides.

For welcome and finished screens the right service column is hidden and the bottom service zone (`y_service_mid`) is used for the screen's two action buttons, identical to the sea-battle layout.

### Zones

- Header: `y_top → y_header` (Step counter on playing; result message lines on finished)
- Board: `y_board_top → y_board_bottom`
- Service column (playing only): `x_col_left → x_col_right` × `y_board_top → y_board_bottom`
- Bottom service (welcome / finished): band centered on `y_service_mid`

### Base Units

- `W = x_right - x_left` (usable width)
- `H = y_bottom - y_top` (usable height)
- `boardSide = min(x_board_right - x_board_left, y_board_bottom - y_board_top)`
- `cellSize = boardSide / boardSize` (where `boardSize ∈ 5..8`)
- `d = cellSize` (alias used for knight sprite and effect radii)

### Button Units (series standard)

- `btn_h = 0.08 * H`
- `btn_w = 0.22 * W`
- `btn_radius = 0.25 * btn_h`

The right service column width (`x_col_right - x_col_left ≈ 0.22 W`) is sized to fit the standard `btn_w`. On smaller viewports the column shrinks and buttons follow.

### Minimum Cell Size

`cellSize` stays comfortably above 28 px even at 8×8 on small viewports because the board is the only major component on the screen. On 5×5 cells are very generous (~80–90 px on a typical 800×600 embed).

- Recompute all on resize.

---

## 2. Components

### 2.1 Cell

Square of side `cellSize`. Visual state depends on cell facts (see `GAME_LOGIC_SPEC §1`):

| Visual | Fill | Overlay |
|--------|------|---------|
| board-light (parchment) | `BOARD_LIGHT` | thin separator `BOARD_GRID` |
| board-dark (bronze) | `BOARD_DARK` | thin separator `BOARD_GRID` |
| visited (knight has been here, then left) | base cell color darkened by `VISITED_DIM` overlay | + step number in `STEP_NUMBER` color |
| current (knight is here now) | base cell color, no extra overlay | knight sprite drawn on top — the sprite alone marks the knight's position |
| candidate, hints **on** | base cell color + pulsating `HINT_SHIMMER` (turquoise) overlay | + continuation count numeral in `HINT_NUMBER` color |
| candidate with count `0`, hints **on** | base cell color + pulsating `DEAD_HINT_SHIMMER` (red) overlay | + `0` numeral in `DEAD_HINT_NUMBER` color |
| candidate, hints **off** | base cell color, no overlay | no numeral, no shimmer — looks like any other empty cell |

When `game.showCounts === true`, candidate cells get a soft pulsating overlay (a "shimmer") that fills the cell — not a ring. The pulse uses the same rhythm as the gold `Start game` button: a sinusoidal blur/alpha oscillation over ~1.5 s. Turquoise for normal candidates, red for `0`-cells. The continuation count numeral is drawn over the shimmer.

When `game.showCounts === false`, candidate cells receive **no visual treatment at all**. The board is clean: only checkerboard, knight, and visited-cell step numbers are visible. The player must work out reachable cells in their head and discover dead ends only by stepping into them.

The checkerboard pattern follows chess convention: `(x + y) % 2 === 0` is `BOARD_DARK`, else `BOARD_LIGHT`. Bottom-left cell `(0, 0)` is dark.

Step numbers and continuation counts **never appear on the same cell at the same time**. A cell has either:
- the knight on it (no number),
- a candidate shimmer with a continuation count over it — only if `showCounts === true`; if `showCounts === false`, the cell looks plain (no shimmer, no number),
- a step number (already visited, no shimmer).

### 2.2 Board

A `boardSize × boardSize` grid of cells with a bronze frame.

- Frame: rounded rectangle, stroke `BRONZE_OUTLINE`, fill darker bronze inner band
- Frame thickness: `0.20 * cellSize`
- Outer corner radius: `0.35 * cellSize`
- Optional column letters (`a..h`) and row numbers (`1..8`) drawn outside the frame in `MODAL_DARK` at `0.40 * cellSize` size, bold. Coordinates may be omitted in V1; if shown, use chess convention with `a1` at the bottom-left.

### 2.3 Knight Sprite

A pre-rendered raster sprite loaded from `knight.webp` (a stylized dark knight silhouette).

- Source: `knight.webp` in the project folder, preloaded as an `<img>` element and drawn into the canvas via `ctx.drawImage`
- Size: target diameter `~0.80 * cellSize`, centered on the current cell, preserving the sprite's own aspect ratio
- Color of the cell underneath: **no extra glow, ring, or overlay**. The sprite is dark enough to read cleanly on both `BOARD_LIGHT` (parchment) and `BOARD_DARK` (bronze) cells without any cell-level highlight.
- Idle animation: a subtle breathing scale oscillation (small sinusoidal scale around `1.0`, period ~2 s) while waiting for input, so the knight feels alive without relying on a glowing cell.

The rendering function `drawKnight(ctx, cx, cy, size)` is the single point of change if the sprite ever needs to be swapped for a different art style.

### 2.4 Step Number (visited cell)

- Font: bold sans-serif, size `0.45 * cellSize`
- Color: `STEP_NUMBER` (light parchment on bronze cells, deep bronze on parchment cells — automatic contrast pick from cell base color)
- Position: centered on the cell
- Cell underlay: base color + `VISITED_DIM` overlay so visited cells read calmer than active candidates
- Step `1` (the starting cell) is shown the same way as any other visited step

### 2.5 Candidate Shimmer + Continuation Count

When `game.showCounts === true`, each candidate cell gets:

- **Shimmer overlay**: filled rectangle inset by `0.06 * cellSize` from cell edges, fill color `HINT_SHIMMER` (or `DEAD_HINT_SHIMMER` for `0`-cells). Alpha and `shadowBlur` oscillate sinusoidally:
  - Period: `1.5 s` (synced with gold `Start game` button pulse so the welcome and playing screens feel like the same world)
  - Alpha: `0.25 → 0.55 → 0.25`
  - `shadowColor`: same as fill, `shadowBlur` oscillates `8 → 22 → 8` px
- **Numeral** drawn over the shimmer:
  - Font: bold sans-serif, size `0.50 * cellSize`
  - Color: `HINT_NUMBER` for counts `≥ 1`, `DEAD_HINT_NUMBER` for `0`
  - Position: centered on the cell
  - Drawn after the shimmer so it stays legible

When `game.showCounts === false`, neither the shimmer nor the numeral is drawn. Candidate cells are visually identical to non-candidate cells.

The pulse for all candidate cells is computed from a single global phase so they shimmer in sync — not phase-shifted per cell. This reads as a calm, coordinated highlight, not a busy disco.

### 2.6 Service Column (playing screen)

A vertical parchment strip on the right of the board, evoking a route ribbon:

- X: `x_col_left → x_col_right`
- Y: `y_board_top → y_board_bottom`
- Background: `MODAL_BG` parchment fill, edge texture identical to the settings panel parchment, rounded `0.5 * cellSize`
- Border: `MODAL_BORDER` (2 px)

Contents (top → bottom):

1. **Step counter**: bold, `0.50 * btn_h`, color `MODAL_DARK`. Format: `Step N / TOTAL` where `TOTAL = boardSize * boardSize`. Centered horizontally, top padding equals one button height.
2. **Squares left**: smaller, `0.34 * btn_h`, color `MODAL_BODY`. Format: `Squares left: K`. Drawn directly under the Step counter.
3. **Undo** button (ghost, see §2.8). Centered horizontally. Disabled style when `path.length < 2`.
4. **Give up?** button (muted, see §2.8). Centered horizontally. Bottom padding equals one button height.

If the optional move-history list is added later (post-V1), it occupies the gap between the Step / Squares-left labels and the Undo button.

### 2.7 Header (playing screen)

The header band carries a status line. On the playing screen it is intentionally light:

- "Step: N" — bold, `0.55 * btn_h`, white at 80% opacity, drawn centered horizontally over the board column (`x_board_left + boardSide / 2`), vertical center on `(y_top + y_header) / 2`

The Step counter inside the right column duplicates this number; the header is mainly there to keep visual rhythm with sea-battle's turn-indicator band.

### 2.8 Buttons (series standard)

Three button styles, identical to the coin game and sea-battle:

**Gold button** ("Start game", "New game"):
- Rounded rectangle, `btn_w × btn_h`, radius `btn_radius`
- Gradient fill: top `GOLD_TOP` → mid `GOLD_MID` → bottom `GOLD_BOTTOM`
- Stroke: `GOLD_BORDER`
- Text: bold, `BRONZE_OUTLINE` color, `0.42 * btn_h`
- Animated pulsing glow (`shadowColor: GOLD_MID`, blur oscillates 8–30 px)

**Ghost button** ("Settings & Rules", "Undo"):
- Rounded rectangle, same size
- Fill: `rgba(255,255,255,0.12)`, stroke: `rgba(255,255,255,0.30)`
- Text: `rgba(255,255,255,0.65)`, `0.40 * btn_h`
- On the parchment service column, ghost buttons swap to a parchment-friendly variant: fill `rgba(61, 24, 0, 0.06)`, stroke `MODAL_DARK` at 35% opacity, text `MODAL_DARK`

**Give up? button** (muted):
- Rounded rectangle, same size
- Fill + stroke: `BTN_FINISH` (muted olive)
- Text: `BTN_FINISH_TEXT` (white), `0.38 * btn_h`
- Low visual weight — intentionally de-emphasized

Disabled buttons render with `BTN_DISABLED` fill, no glow, text at 40% opacity, and ignore clicks.

### 2.9 Settings Panel

Spans the full usable width from `y_header` to `y_service_mid`, same pattern as the coin game and sea-battle settings panel:

```
panelX = x_left
panelY = y_header
panelW = x_right - x_left
panelH = y_service_mid - y_header
```

Fill: `MODAL_BG`, border: `MODAL_BORDER` (3 px).
Dim overlay covers entire canvas behind panel: `rgba(0, 0, 0, 0.55)`.
Closes **only** via "Save & Close" button (clicks outside ignored).

Contents (top to bottom):

- Heading: "Rules" (bold, `MODAL_DARK`, `0.52 * btn_h`)
- Three rules (bullet list, `MODAL_BODY`, wrapped, `0.42 * btn_h`):
  - "Move the knight using normal knight moves."
  - "Visit every square exactly once."
  - "Try not to trap yourself."
- Divider line (`MODAL_ACCENT`)
- Settings rows (each row is a label + control on the same line):
  - **Board size** — spinner: white field with `▲ ▼` arrows, value `5..8`, hint "Bigger board → longer puzzle."
  - **Continuation hints** — toggle `On / Off`, default `On`, hint "Show how many continuations each move has."
- Each setting occupies one equal-height section between divider lines; label/hint text and controls are vertically centered within that section.
- All parameter hints are sentence-style with final periods.
- "Save & Close" button (ghost outline, `MODAL_DARK`)
- Keep clear empty space around "Save & Close", at least comparable to the modal heading padding.

The toggle is the same on/off control style used by `sea-battle` (Islands / Sound). Future toggles (Sound, etc.) plug into the same row layout.

### 2.10 Confirm Modal (Give up)

Compact centered panel. Width: `0.62 * (x_right - x_left)`. Height adapts to content. Same as the coin game and sea-battle.

Contents:
- Dim overlay: `rgba(0, 0, 0, 0.60)`
- Title: "Give up?" — bold, `MODAL_DARK`, `0.52 * btn_h`
- Body: "You'll see one possible path, but it won't count as a win." — `MODAL_BODY`, wrapped, `0.42 * btn_h`
- Two buttons side by side:
  - Left: "Let me think again..." — text-only (no border), dimmed `MODAL_DARK` at 50% opacity
  - Right: "Yes, sorry!" — ghost outline, `MODAL_DARK`

---

## 3. Colors

### Background

| Constant | Value | Used for |
|----------|-------|---------|
| `COLOR_BG` | `#1A5C35` | Canvas fill (series default) |

### Board cells

| Constant | Value | Used for |
|----------|-------|---------|
| `BOARD_LIGHT` | `#E8D9B5` | parchment-light cells (chess "white") |
| `BOARD_DARK` | `#7A4010` | bronze-dark cells (chess "black"); reuses `BRONZE_DARK` |
| `BOARD_GRID` | `rgba(61, 24, 0, 0.25)` | thin cell separators |
| `VISITED_DIM` | `rgba(0, 0, 0, 0.32)` | overlay on visited cells (darken to deemphasise) |
| `HINT_SHIMMER` | `rgba(94, 234, 212, 0.45)` | turquoise pulsating fill on candidate next-move cells (only when `showCounts === true`) |
| `DEAD_HINT_SHIMMER` | `rgba(220, 60, 60, 0.55)` | red pulsating fill on candidates with continuation count `0` (only when `showCounts === true`) |
| `HINT_HOVER` | `rgba(94, 234, 212, 0.18)` | extra brightness bump on the candidate cell currently hovered (only when `showCounts === true`) |

### Numbers on cells

| Constant | Value | Used for |
|----------|-------|---------|
| `STEP_NUMBER` | `#F5ECD7` (on dark cells) / `#3D1800` (on light cells) | step number in visited cells; auto-contrast |
| `HINT_NUMBER` | `#FFE566` | continuation count on regular candidate cells |
| `DEAD_HINT_NUMBER` | `#FFFFFF` | `0` numeral on dead-end candidates |

### Bronze (board frame, separators, accents)

| Constant | Value |
|----------|-------|
| `BRONZE_MID` | `#CD7F32` |
| `BRONZE_LIGHT` | `#E8A855` |
| `BRONZE_DARK` | `#7A4010` |
| `BRONZE_OUTLINE` | `#3D1800` |

### Buttons

| Constant | Value | Description |
|----------|-------|-------------|
| `BTN_DISABLED` | `#9E9E9E` | disabled state |
| `BTN_FINISH` | `#4E6B42` | "Give up?" button (muted olive) |
| `BTN_FINISH_TEXT` | `#FFFFFF` | — |

### Gold buttons

| Constant | Value | Used for |
|----------|-------|---------|
| `GOLD_TOP` | `#FFE566` | gradient top |
| `GOLD_MID` | `#FFB300` | gradient mid + glow |
| `GOLD_BOTTOM` | `#E67E00` | gradient bottom |
| `GOLD_BORDER` | `#FFF0A0` | stroke |

### Modal / Menu / Service column

| Constant | Value | Description |
|----------|-------|-------------|
| `MODAL_BG` | `#F5ECD7` | panel background (parchment); also service column fill |
| `MODAL_BORDER` | `#8B6914` | panel border |
| `MODAL_DARK` | `#3D1800` | headings, button text |
| `MODAL_BODY` | `#5D3A1A` | body text, rule text |
| `MODAL_ACCENT` | `#C8A96E` | spinner arrows, dividers |

### Result text

| Constant | Value | Used for |
|----------|-------|---------|
| `RESULT_GOLD` | `#FFD700` | win line 1 |
| `RESULT_TEXT` | `#FFFFFF` | other result lines |
| `RESULT_TEXT_SOFT` | `rgba(255,255,255,0.88)` | line 2 |

### Solution overlay (after surrender)

| Constant | Value | Used for |
|----------|-------|---------|
| `SOLUTION_TRAIL` | `rgba(255, 220, 120, 0.85)` | bright bronze trail line connecting tour cells |
| `SOLUTION_GLOW` | `rgba(255, 180, 80, 0.55)` | soft glow under each lit cell during animation |

---

## 4. Screens

### 4.1 Welcome

Background: `knight-path-cover.webp` (cover-fit, cropped to center), with `rgba(0, 0, 0, 0.58)` dark overlay on top.

Elements:
- Title "Knight's Path": bold, size `1.1 * btn_h`, gold `RESULT_GOLD`, glow `GOLD_MID` blur 18
  - Center: `(x_center, y_header + (y_board_top - y_header) / 2)`
- Description (2 lines, centered):
  - Line 1: "Help the knight visit"
  - Line 2: "every square exactly once."
  - Size `0.65 * btn_h`, white with shadow, line height `1.7 × bodySize`
  - Lines centered around `y_board_bottom - 0.5 * btn_h`
- Buttons on `y = y_service_mid`:
  - "Settings & Rules" (ghost): center `(x_left + btn_w/2, y_service_mid)`
  - "Start game" (gold, pulsing): center `(x_right - btn_w/2, y_service_mid)`

The welcome screen continuously re-renders for the gold button animation until the player leaves.

### 4.2 Settings (modal over welcome or finished)

Settings panel as in §2.9, opened with a dim overlay. Behind the overlay, the previous screen (welcome or finished) remains drawn but inert. After "Save & Close", state goes to `welcome` regardless of where the modal was opened from.

### 4.3 Playing

Layout:
- Header (`y_top → y_header`): "Step: N" centered over the board column
- Board: square, inscribed in `(x_board_left → x_board_right)` × `(y_board_top → y_board_bottom)`
- Service column on the right (§2.6): step counter, squares left, Undo, Give up?

No "Settings & Rules" button is shown during play — settings are only reachable from welcome and finished, per series convention. As a result, `game.showCounts` is fixed for the duration of a single game; toggling it mid-game is not possible.

Hover behavior depends on `showCounts`:
- `showCounts === true`: cells in `availableMoves` get a subtle brightness bump (`HINT_HOVER`) on hover; cursor switches to `pointer`.
- `showCounts === false`: cursor still switches to `pointer` on candidate cells (so clicks feel responsive), but no visible brightness bump — the board stays clean. The player learns where the knight can move only by clicking.
- Non-candidate cells in both modes: cursor stays `default`, no highlight.

### 4.4 Finished

Layout:
- Header line 1: result message — bold, `0.75 * btn_h`, color `RESULT_GOLD` for win (with `GOLD_MID` glow blur 14) or `RESULT_TEXT` otherwise
- Header line 2: `0.52 * btn_h`, `RESULT_TEXT_SOFT`, immediately below line 1
- Board remains visible at the same position as in playing, with the player's path preserved (step numbers on visited cells, knight on final cell)
- If `result === "surrender"`: solution path is rendered on top of the board with a `solutionTrail` animation (see §8). After the animation completes, the trail stays as a faint bronze line + numbers in `MODAL_BODY` color (smaller than step numbers, drawn in cell corners to coexist with player's own steps where they overlap)
- The right service column collapses: only the Step / Squares left labels remain; Undo and Give up? are hidden
- Service zone (`y_service_mid`):
  - "Settings & Rules" (ghost): center `(x_left + btn_w/2, y_service_mid)`
  - "New game" (gold, pulsing): center `(x_right - btn_w/2, y_service_mid)`

`New game` goes directly to a fresh `playing` phase with the same `boardSize`.

---

## 5. Interaction States (UI mapping)

| State | Click on board | Hover highlight | Settings | Give up? | Notes |
|-------|----------------|-----------------|----------|----------|-------|
| welcome | n/a | n/a | available | n/a | Gold button animates |
| playing | only `availableMoves` cells move; others play negative tone | enabled (candidate cells) | n/a | available | Undo gated on `path.length >= 2` |
| finished | n/a | n/a | available | n/a | New game button shown |

Modal blocks all interaction while open. Input blocked while a board-mutating animation runs.

---

## 6. Click-to-Move (UI)

- Single tap / click on a candidate cell → call `move(x, y)`
- Single tap / click on a non-candidate cell → soft negative tone, no state change
- No drag, no two-step "select-then-confirm" — every move is a single tap
- Sound on move: wooden / chess-piece click; on rejected click: soft negative tone

The knight is not draggable; this matches the "thinking puzzle" feel of the chapter.

---

## 7. Toasts

Non-blocking text message centered between header and board.

Geometry:
- Center Y: `(y_header + y_board_top) / 2 + 0.3 * btn_h`
- Center X: `x_board_left + boardSide / 2`
- Background: `rgba(20, 20, 20, 0.82)`, rounded rectangle
- Text: white, bold, size `0.45 * btn_h`
- Duration: 1500 ms, then disappears (no fade animation)
- At most one toast visible at a time

Example messages (used sparingly):
- "Cannot move there" (click on non-candidate cell — usually omitted, the negative tone is enough)

---

## 8. Animations

See `GAME_LOGIC_SPEC §9` for parameters. Recap of visual specs:

| Effect | Visual |
|--------|--------|
| `moveFlash` | Soft golden ring expanding on the cell the knight just landed on, alpha `0.6 → 0` over 180–240 ms |
| `undoFade` | Soft cool-blue ring on the cell that was unvisited (not the cell the knight returned to), alpha `0.5 → 0` over 180–240 ms |
| `starfall` | On the win finished screen only, small gold stars drift and twinkle over the right service-area illustration |

`solutionTrail` is non-blocking; the player can press `New game` or `Settings & Rules` while the trail is still drawing — the animation aborts cleanly.

---

## 9. Sound

All sounds synthesized via Web Audio API (no files). `AudioContext` created lazily on the first user gesture inside the iframe. (V1 has no `Sound: Off` toggle; future versions will gate all sounds on a setting.)

| Event | Sound parameters |
|-------|------------------|
| Knight move | Wooden chess click — single tone 220–320 Hz, 50–80 ms, sharp attack/fast decay, gain 0.10–0.16 |
| Click on non-candidate cell | Soft negative tone — descending two-step 280 → 220 Hz, 80–120 ms total, gain 0.06–0.10, smooth decay (intentionally non-harsh) |
| Undo | Reverse tone — ascending-then-cut 200 → 320 Hz, 60–90 ms, gain 0.06–0.10 |
| Win | Ascending arpeggio C4-E4-G4-C5 (261/329/392/523 Hz), 110–140 ms note, 80–120 ms spacing |
| Dead end | Two descending tones G4-C4 (392/261 Hz), 180–240 ms note, 120–160 ms spacing |
| Surrender | Two descending tones G4-C4, same as dead end |
| Hover | none |

---

## 10. Input Rules (UI)

- Disabled buttons ignore clicks (styled disabled, grey)
- Modal blocks all background interaction
- Input blocked during board-mutating animations (`moveFlash`, `undoFade`)
- Touch and mouse both supported
- Tap on touchscreen handled via `touchend` (not click event)
- Hover highlight only drawn during `playing`, only on candidate cells, and only when `showCounts === true`. Cursor still switches to `pointer` on candidates regardless of `showCounts`.

---

## 11. Responsive

- Canvas resizes to fill window while maintaining 4:3 ratio
- Letterbox: black bars outside canvas
- All layout constants recomputed from canvas pixel dimensions on resize
- All font sizes derived from `btn_h`, all cell-relative sizes from `cellSize`
- Active animations survive resize because effects reference cells by `(x, y)`, not pixels

---

## 12. Notes

- All visuals are Canvas-drawn; the only DOM elements besides `<canvas>` are two `<img>` elements preloaded from project files: `knight-path-cover.webp` (welcome screen background) and `knight.webp` (knight sprite). Both are drawn into the canvas via `ctx.drawImage` and never appear in the DOM as visible elements.
- Colors and sizes as named constants (`COLOR.*`, `layout.*`) for easy tuning
- Debug grid (`D` key) draws all named layout lines with labels in yellow
- Debug labels for vertical guide lines are rotated 90° so close X-lines do not overlap
- Debug info (`I` key) prints `phase`, `boardSize`, `showCounts`, `knightPos`, `path.length`, `availableMoves.length`, continuation counts of all candidates (regardless of `showCounts`), `isWin()` / `isDeadEnd()` flags in the top-right corner
- All UI strings are kept in a single `strings.en` object so future localization changes do not touch render logic
