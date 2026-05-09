# Spec (Code-Oriented): Knight's Path

## 0. Scope

This document defines the game as a **deterministic state machine + UI contract**. It is intended for direct implementation (Canvas + input handling).

All names are canonical. Do not rename in code.

---

## 1. Core Model

### 1.1 Types

```
BoardSize    = 5 | 6 | 7 | 8

GameState =
  | "welcome"   // initial screen, Settings & Rules + Start game
  | "playing"   // active game, board + knight + service column
  | "finished"  // final screen: result message, board with final path, Settings & Rules + New game

ModalState =
  | null              // no modal open
  | "settings"        // settings panel open
  | "confirmGiveUp"   // give-up confirmation popup open

Cell = { x: integer, y: integer }   // x ∈ [0, boardSize), y ∈ [0, boardSize)

GameResult =
  | null          // game not finished yet
  | "win"         // every cell visited exactly once
  | "deadEnd"     // no available moves and unvisited cells remain
  | "surrender"   // player confirmed Give up?
```

Coordinate convention: `(0, 0)` is the **bottom-left** corner of the board (chess convention). `x` increases rightward, `y` increases upward.

The Canvas Y axis increases downward; mapping to screen coordinates is the renderer's job.

---

### 1.2 Game State Object

```
game {
  state: GameState
  modal: ModalState

  // Settings (persisted in localStorage)
  boardSize: BoardSize
  showCounts: bool                 // Warnsdorff hint toggle; default true

  // Pending settings (edited inside settings modal, not yet saved)
  pendingBoardSize: BoardSize
  pendingShowCounts: bool

  // Playing state (cleared on initGame)
  knightPos: Cell                  // current knight cell
  startPos: Cell                   // always (0, 0) in V1
  path: Cell[]                     // ordered list of visited cells; path[0] === startPos
  visited: Set<string>             // "x,y" keys of cells in path; for O(1) membership
  availableMoves: Cell[]           // valid next moves for knightPos (computed)

  // End state
  result: GameResult
  solutionPath: Cell[] | null      // populated only when result === "surrender"

  // Reserved for future extensions, not used in V1
  selectedHistoryStep: integer | null  // selected step in optional history list; always null in V1
}
```

The `visited` Set is derived from `path` (one entry per element). Both must be kept in sync; convenience helpers in `state.js` modify them together.

`availableMoves` is recomputed eagerly after every state-mutating action so `render.js` does not have to compute moves itself.

---

### 1.3 Knight Geometry

Eight candidate offsets:

```
KNIGHT_DELTAS = [
  ( +1, +2 ), ( +2, +1 ),
  ( +2, -1 ), ( +1, -2 ),
  ( -1, -2 ), ( -2, -1 ),
  ( -2, +1 ), ( -1, +2 ),
]
```

```
knightMoves(x, y):
  return all (x + dx, y + dy) for (dx, dy) in KNIGHT_DELTAS
         such that 0 <= x + dx < boardSize and 0 <= y + dy < boardSize
```

```
availableMovesFrom(x, y):
  return [ c in knightMoves(x, y) if !visited.has(key(c)) ]
```

Where `key(c) = c.x + "," + c.y`.

---

### 1.4 Warnsdorff Continuation Count

For a candidate cell `C` (which the knight has not yet entered), the continuation count is **the number of moves the knight would have from `C` after `C` becomes visited**:

```
continuationCount(C):
  // Pretend C is now visited, count C's onward options.
  visitedPrime = visited ∪ { key(C) }
  return count of (x, y) in knightMoves(C.x, C.y) where !visitedPrime.has(key(x, y))
```

Equivalently: the degree of `C` in the graph of unvisited cells **after** removing `C` itself.

Special values shown to the player:
- `0` → cell is a trap: entering it ends the game in a dead end (unless it is the final cell needed for a win)
- `1..8` → number of follow-up moves the knight will have from `C`

When `game.showCounts === true`, the render layer paints each candidate cell with a soft turquoise shimmer (same pulse rhythm as the gold `Start game` button) and draws the continuation count over it. Cells whose count is `0` use a red shimmer instead of turquoise.

When `game.showCounts === false`, candidate cells receive **no visual treatment at all** — no shimmer, no number, no red trap warning. The board is clean: only the knight, the visited cells with step numbers, and the empty cells of the checkerboard are visible. The player must work out reachable cells in their head. The toggle does not affect game logic; it only suppresses rendering.

`continuationCount` is still computed when `showCounts === false` (e.g., for debug-info overlay), but its value is not visible to the player.

---

## 2. Initialization

### 2.0 Entry State

```
on page load:
  state = "welcome"
  loadSettings()   // boardSize and showCounts from localStorage; defaults below
```

Defaults if nothing stored:

```
boardSize  = 5
showCounts = true
```

`boardSize` is validated to one of `5 | 6 | 7 | 8` on load; any invalid value falls back to the default. `showCounts` is parsed from the strings `"on"` / `"off"`; any other value falls back to `true`.

Transitions:

```
on Start game:
  initGame()
  startGame()       // state = "playing"

on New game (from finished screen):
  initGame()
  startGame()
```

---

### 2.1 initGame()

```
startPos    = { x: 0, y: 0 }
knightPos   = { x: 0, y: 0 }
path        = [ { x: 0, y: 0 } ]
visited     = new Set([ "0,0" ])
availableMoves = availableMovesFrom(0, 0)

modal       = null
result      = null
solutionPath = null
```

The starting cell `(0, 0)` is the bottom-left corner. Open Knight's Tours from this cell exist for every `boardSize ∈ {5, 6, 7, 8}`, so the puzzle is always solvable.

---

## 3. Playing Phase

### 3.1 Preconditions for a player move

```
state === "playing"
modal === null
no animation in progress
target cell (x, y) is in availableMoves
```

If the click is on a cell outside `availableMoves` (visited, current, or non-knight-reachable), the move is rejected and a soft negative tone plays. No state change.

### 3.2 move(x, y)

```
assert (x, y) is in availableMoves
assert no blocking animation

path.push({ x, y })
visited.add(key(x, y))
knightPos = { x, y }
availableMoves = availableMovesFrom(x, y)

play wooden knight click sound
schedule "moveFlash" effect on (x, y)

if isWin():
  finishGame("win")
else if isDeadEnd():
  finishGame("deadEnd")
```

### 3.3 undo()

```
preconditions:
  state === "playing"
  modal === null
  path.length >= 2          // can't undo past the starting cell
  no animation in progress

last = path.pop()
visited.delete(key(last))
knightPos = path[path.length - 1]
availableMoves = availableMovesFrom(knightPos.x, knightPos.y)

play soft reverse tone
schedule "undoFade" effect on `last`
```

`Undo` is disabled (button greyed out) when `path.length < 2`.

**One click = one move undone.** Each call to `undo()` pops exactly one cell off `path`. The button may be pressed repeatedly; each press undoes one further move. There is no fixed depth limit — the player may undo the entire route back to the starting cell. The disabled state at `path.length < 2` is the only stop condition.

### 3.4 isWin / isDeadEnd

```
isWin():
  return path.length === boardSize * boardSize

isDeadEnd():
  return availableMoves.length === 0 && !isWin()
```

End-check runs inside `move()` after the state mutation. Order matters: `isWin()` is checked first because the very last move of a winning tour also empties `availableMoves`.

### 3.5 finishGame(result)

```
game.result = result
game.state  = "finished"

if result === "win":
  play victory arpeggio
  schedule "victory" effect
else if result === "deadEnd":
  play soft descending tones
  schedule "deadEnd" effect on knightPos
else if result === "surrender":
  solutionPath = solveTour(boardSize, 0, 0)   // see §6
  play soft descending tones
  schedule "solutionTrail" effect that animates solutionPath over the board
```

The player's own `path` is preserved on the finished screen. On surrender the solution is rendered **on top of** the player's path with an animated trail (see UI_SPEC §8).

### 3.6 Give up

```
on Give up?:
  if state === "playing" and modal === null:
    modal = "confirmGiveUp"

on "Yes, sorry!":
  surrender()

on "Let me think again..." or click outside:
  modal = null   (no state change)
```

`surrender()`:

```
modal = null
finishGame("surrender")
```

`Restart` button does not exist; this is a series rule (`SERIES_STYLE_GUIDE.md` §5.5).

---

## 4. State Transitions

### 4.0 Transition Diagram

```text
[first load]
    ↓
welcome
  ├─ Settings & Rules → modal = "settings"
  └─ Start game       → initGame(), startGame() → state = "playing"

playing
  ├─ click on availableMove cell  → move(x, y); end-check inside
  ├─ click on non-candidate cell  → reject + negative tone
  ├─ Undo                         → undo()
  └─ Give up?                     → modal = "confirmGiveUp"

confirmGiveUp modal
  ├─ "Yes, sorry!"                          → surrender(), state = "finished"
  └─ "Let me think again..." / outside click → modal = null

settings modal
  ├─ change Board size spinner       → pendingBoardSize updated
  ├─ toggle Continuation hints       → pendingShowCounts updated
  └─ Save & Close                    → saveSettings(), modal = null, state = "welcome"

finished
  ├─ Settings & Rules → modal = "settings"
  └─ New game         → initGame(), startGame() → state = "playing"
```

`Save & Close` from settings always returns to the welcome screen, regardless of where settings was opened from. (Same rule as in `sea-battle`.)

`New game` from the finished screen goes directly to `playing` with the same settings — it does NOT return to welcome.

---

## 5. Game End

### 5.1 Result Evaluation

```
result is set inside finishGame():
  - path covers all cells                                   → "win"
  - availableMoves empty and unvisited cells remain         → "deadEnd"
  - player confirmed Give up?                               → "surrender"
```

### 5.2 Result Messages

Displayed on the finished screen (two lines):

| result | line 1 | line 2 |
|--------|--------|--------|
| win | "Well done!" | "The knight found the path!" |
| deadEnd | "Dead end!" | "The knight is trapped." |
| surrender | "No worries!" | "Here is one possible path." |

Sound on result:
- `win` → ascending arpeggio C4-E4-G4-C5
- `deadEnd`, `surrender` → two descending tones G4-C4

---

## 6. Solution Generator

### 6.1 Purpose

When the player surrenders, the game must show one valid full Knight's Tour starting at `(0, 0)` for the current `boardSize`. The displayed tour is informative; it does not need to match any particular reference solution.

### 6.2 Primary algorithm: Warnsdorff backtracking

```
solveTour(boardSize, startX, startY):
  path = [ (startX, startY) ]
  visited = { key(startX, startY) }
  total = boardSize * boardSize

  function step(current):
    if path.length === total: return true

    candidates = availableMovesFrom(current.x, current.y)
    // Sort by Warnsdorff degree ascending (fewest onward options first).
    // Tie-break by KNIGHT_DELTAS order for determinism.
    candidates.sort((a, b) => degreeAfter(a) - degreeAfter(b))

    for next in candidates:
      path.push(next); visited.add(key(next))
      if step(next): return true
      path.pop();    visited.delete(key(next))

    return false

  return step(path[0]) ? path : null
```

`degreeAfter(C)` is `continuationCount` computed against the in-progress `visited` set.

The algorithm runs synchronously inside `surrender()`. On boards 5×5 through 8×8 from `(0, 0)` it terminates in milliseconds.

### 6.3 Fallback: precomputed tours

If timing or stability becomes an issue, `solveTour` may be replaced by a lookup into a precomputed table:

```
PRECOMPUTED_TOURS = {
  5: [ (0,0), (1,2), (2,0), (0,1), ... ],   // length 25
  6: [ ... ],                               // length 36
  7: [ ... ],                               // length 49
  8: [ ... ],                               // length 64
}
```

The choice between live solver and precomputed table is made during M7 implementation; the public signature `solveTour(boardSize, startX, startY)` does not change.

### 6.4 Failure handling

`solveTour` should not return `null` for the V1 board sizes / start cell, because tours are known to exist. If it ever does (e.g., regression in the algorithm), the finished screen still appears with the player's own path and the result message; the solution overlay is simply skipped.

---

## 7. Rendering Contract

### 7.1 Render Order (playing screen)

```
1. background fill (COLOR_BG)
2. header band (Step counter)
3. board:
     a. cells (board-dark / board-light checkerboard)
     b. visited cells overlay (dimmed, with step number)
     c. candidate cells turquoise shimmer — only if `game.showCounts === true`
     d. continuation count numerals over the shimmer — only if `game.showCounts === true`
     e. zero-count cells: red shimmer (replaces turquoise) — only if `game.showCounts === true`
     f. knight sprite at knightPos
4. right service column (parchment strip):
     a. step counter ("Step: N / total")
     b. Undo button (ghost; disabled style if path.length < 2)
     c. Give up? button (muted)
5. active animation effects above their cells (moveFlash, undoFade)
6. modal overlay + panel (if open)
7. debug grid (if D key active)
8. debug info (if I key active)
```

### 7.2 Render Order (welcome screen)

```
1. cover image (knight-path-cover.webp), cover-fit, cropped to center
2. dim overlay (rgba(0, 0, 0, 0.58))
3. title "Knight's Path"
4. description (two lines)
5. buttons: Settings & Rules (ghost), Start game (gold, pulsing)
6. modal overlay + panel (if settings modal open)
```

### 7.3 Render Order (finished screen)

```
1. background fill
2. header band: result line 1, result line 2 below
3. board:
     a. cells (checkerboard)
     b. player's path: visited cells with step numbers
     c. knight sprite at final knightPos
     d. if result === "surrender":
          solution path animated as a glowing trail (see UI_SPEC §8 "solutionTrail")
4. right service column (collapsed: only Step / "Squares left" status, no buttons)
5. service zone at bottom for Settings & Rules + New game
6. modal overlay + panel (if open)
```

---

## 8. Resize Behavior

```
on resize:
  recompute all layout constants from canvas dimensions
  re-render current state
```

Canvas maintains 4:3 aspect ratio with letterboxing (black bars) on wider viewports. Active animation effects survive resize because they reference cells by `(x, y)`, not pixel coordinates.

The board is square; its side equals the smaller of (vertical space available between header and bottom safe margin) and (horizontal space allocated to the board column). On 4:3 with the right service column (~0.24 W), vertical space is the tighter constraint at all `boardSize`.

---

## 9. Animations

All animations are short, event-driven, and stored in a single `effects` array:

```
effect {
  type:        "moveFlash" | "undoFade"
  x, y:        integer cell coordinates
  startTime:   ms
  duration:    ms
  // type-specific fields
}
```

The render loop advances `t = (now - startTime) / duration`, draws the effect, and removes it once `t >= 1`.
The win finished screen also has a procedural `starfall` animation over the right service-area illustration; it is visual-only and does not block input.

| Effect | Duration | Description |
|--------|----------|-------------|
| `moveFlash` | 180–240 ms | Soft golden ring expanding on the cell the knight just landed on; alpha `0.6 → 0` |
| `undoFade` | 180–240 ms | Soft cool-blue ring on the cell that was unvisited; alpha `0.5 → 0` |
| `starfall` | continuous on win screen | Small gold stars drift and twinkle over the win illustration in the right service area |

Input is blocked while a board-mutating animation (`moveFlash`, `undoFade`) is running. End-game screens use the existing knight exit animation before the finished screen; no separate dead-end pulse, defeat overlay, or board-glow victory effect is used.

---

## 10. Input Rules

### 10.1 General

```
disabled buttons ignore clicks
modal blocks all background interaction
input blocked during board-mutating animations
hover on availableMoves cells:
  - cursor switches to pointer (always, regardless of showCounts)
  - visible brightness bump on the cell — only if showCounts === true
hover on non-candidate cells: cursor stays default, no highlight
```

### 10.2 Touch & Mouse

Both supported with the same handlers. Tap on touchscreen handled via `touchend`, not `click`.

### 10.3 Keyboard

```
U key (or Ctrl+Z) → undo (playing only)
D key             → toggle debug grid (dev builds only)
I key             → toggle debug info (dev builds only)
```

---

## 11. Invariants

```
path[0] === startPos at all times during playing
path.length === visited.size
knightPos === path[path.length - 1]
visited cells are pairwise distinct
0 <= path.length <= boardSize * boardSize
availableMoves matches availableMovesFrom(knightPos.x, knightPos.y) at all times
result === null while state === "playing"
result !== null while state === "finished"
solutionPath !== null only when result === "surrender"
```

---

## 12. Non-Goals

- No alternative knight start cells in V1 (always `(0, 0)`)
- No timer, no scoring, no leaderboard
- No move history list with click-to-undo (`Undo to selected`) in V1
- No exit / door cell, no "perfect victory" achievement
- No multiplayer
- No server or external storage (localStorage only)
- No achievement system
- No randomness during play

---

## 13. Summary

This is a **pure state machine**:
- Deterministic: same `boardSize` + same player clicks → same result
- Event-driven during play
- UI is a projection of state

No hidden logic outside this spec is allowed.
