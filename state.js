(function () {
  "use strict";

  const STORAGE_KEYS = {
    boardSize: "knightPath_boardSize",
  };

  const DEFAULT_SETTINGS = {
    boardSize: 5,
  };

  const KNIGHT_DELTAS = [
    { x: 1, y: 2 },
    { x: 2, y: 1 },
    { x: 2, y: -1 },
    { x: 1, y: -2 },
    { x: -1, y: -2 },
    { x: -2, y: -1 },
    { x: -2, y: 1 },
    { x: -1, y: 2 },
  ];

  const game = {
    state: "welcome",
    modal: null,

    boardSize: DEFAULT_SETTINGS.boardSize,
    pendingBoardSize: DEFAULT_SETTINGS.boardSize,

    knightPos: null,
    startPos: null,
    path: [],
    visited: new Set(),
    availableMoves: [],

    result: null,
    solutionPath: null,

    showCounts: true,
    selectedHistoryStep: null,
  };

  function key(cell) {
    return `${cell.x},${cell.y}`;
  }

  function normalizeBoardSize(value) {
    const size = Number.parseInt(value, 10);
    if (size >= 5 && size <= 8) return size;
    return DEFAULT_SETTINGS.boardSize;
  }

  function loadSettings(storage) {
    game.boardSize = normalizeBoardSize(storage.get(STORAGE_KEYS.boardSize));
    game.pendingBoardSize = game.boardSize;
  }

  function saveSettings(storage) {
    game.boardSize = normalizeBoardSize(game.pendingBoardSize);
    storage.set(STORAGE_KEYS.boardSize, String(game.boardSize));
  }

  function initGame() {
    const start = { x: 0, y: 0 };
    game.startPos = start;
    game.knightPos = { x: start.x, y: start.y };
    game.path = [{ x: start.x, y: start.y }];
    game.visited = new Set([key(start)]);
    game.availableMoves = availableMovesFrom(start.x, start.y);
    game.modal = null;
    game.result = null;
    game.solutionPath = null;
    game.selectedHistoryStep = null;
  }

  function startGame() {
    game.state = "playing";
  }

  function knightMoves(x, y) {
    const moves = [];
    for (const delta of KNIGHT_DELTAS) {
      const next = { x: x + delta.x, y: y + delta.y };
      if (next.x >= 0 && next.x < game.boardSize && next.y >= 0 && next.y < game.boardSize) {
        moves.push(next);
      }
    }
    return moves;
  }

  function availableMovesFrom(x, y) {
    return knightMoves(x, y).filter((cell) => !game.visited.has(key(cell)));
  }

  window.KnightPathState = {
    game,
    key,
    loadSettings,
    saveSettings,
    initGame,
    startGame,
    knightMoves,
    availableMovesFrom,
  };
})();
