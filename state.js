(function () {
  "use strict";

  const STORAGE_KEYS = {
    boardSize: "knightPath_boardSize",
    showCounts: "knightPath_showCounts",
  };

  const DEFAULT_SETTINGS = {
    boardSize: 5,
    showCounts: true,
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
    showCounts: DEFAULT_SETTINGS.showCounts,
    pendingBoardSize: DEFAULT_SETTINGS.boardSize,
    pendingShowCounts: DEFAULT_SETTINGS.showCounts,

    knightPos: null,
    startPos: null,
    path: [],
    visited: new Set(),
    availableMoves: [],
    hoverCell: null,
    historyScroll: 0,
    finishExit: null,

    result: null,
    solutionPath: null,

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

  function normalizeShowCounts(value) {
    if (value === "on") return true;
    if (value === "off") return false;
    return DEFAULT_SETTINGS.showCounts;
  }

  function loadSettings(storage) {
    game.boardSize = normalizeBoardSize(storage.get(STORAGE_KEYS.boardSize));
    game.showCounts = normalizeShowCounts(storage.get(STORAGE_KEYS.showCounts));
    game.pendingBoardSize = game.boardSize;
    game.pendingShowCounts = game.showCounts;
  }

  function openSettings() {
    game.pendingBoardSize = game.boardSize;
    game.pendingShowCounts = game.showCounts;
    game.modal = "settings";
  }

  function saveSettings(storage) {
    game.boardSize = normalizeBoardSize(game.pendingBoardSize);
    game.showCounts = Boolean(game.pendingShowCounts);
    storage.set(STORAGE_KEYS.boardSize, String(game.boardSize));
    storage.set(STORAGE_KEYS.showCounts, game.showCounts ? "on" : "off");
    game.modal = null;
    game.state = "welcome";
  }

  function initGame() {
    const start = { x: 0, y: 0 };
    game.startPos = start;
    game.knightPos = { x: start.x, y: start.y };
    game.path = [{ x: start.x, y: start.y }];
    game.visited = new Set([key(start)]);
    game.availableMoves = availableMovesFrom(start.x, start.y);
    game.hoverCell = null;
    game.historyScroll = 0;
    game.finishExit = null;
    game.modal = null;
    game.result = null;
    game.solutionPath = null;
    game.selectedHistoryStep = null;
  }

  function startGame() {
    game.state = "playing";
  }

  function finishGame(result) {
    game.result = result;
    game.state = "finished";
    game.modal = null;
    game.hoverCell = null;
    game.finishExit = null;
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

  function continuationCount(cell) {
    return knightMoves(cell.x, cell.y).filter((next) => {
      return !game.visited.has(key(next)) && !(next.x === cell.x && next.y === cell.y);
    }).length;
  }

  function isAvailableMove(x, y) {
    return game.availableMoves.some((cell) => cell.x === x && cell.y === y);
  }

  function move(x, y) {
    if (game.state !== "playing" || game.modal !== null || !isAvailableMove(x, y)) {
      return false;
    }

    const next = { x, y };
    game.path.push(next);
    game.visited.add(key(next));
    game.knightPos = next;
    game.availableMoves = availableMovesFrom(x, y);
    game.hoverCell = null;

    if (isWin()) {
      startFinishExit("win");
    } else if (isDeadEnd()) {
      startFinishExit("deadEnd");
    }

    return true;
  }

  function startFinishExit(result) {
    game.finishExit = {
      result,
      startedAt: performance.now(),
      duration: 620,
      from: { x: game.knightPos.x, y: game.knightPos.y },
    };
    game.hoverCell = null;
  }

  function completeFinishExit() {
    if (!game.finishExit) return false;
    finishGame(game.finishExit.result);
    return true;
  }

  function isWin() {
    return game.path.length === game.boardSize * game.boardSize;
  }

  function isDeadEnd() {
    return game.availableMoves.length === 0 && !isWin();
  }

  window.KnightPathState = {
    game,
    key,
    loadSettings,
    openSettings,
    saveSettings,
    initGame,
    startGame,
    finishGame,
    completeFinishExit,
    knightMoves,
    availableMovesFrom,
    continuationCount,
    isAvailableMove,
    move,
    isWin,
    isDeadEnd,
  };
})();
