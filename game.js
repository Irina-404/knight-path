(function () {
  "use strict";

  const safeStorage = {
    _fallback: {},
    get(key) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return this._fallback[key] ?? null;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        this._fallback[key] = value;
      }
    },
  };

  const DEFAULT_BOARD_SIZE = 5;

  let canvas = null;
  let context = null;
  let debugMode = false;
  let animationFrameId = null;
  let modalRegions = null;

  function showCanvasFallback() {
    const fallback = document.getElementById("canvasFallback");
    if (canvas) {
      canvas.classList.add("hidden");
    }
    if (fallback) {
      fallback.classList.remove("hidden");
    }
  }

  function render() {
    const { game } = window.KnightPathState;
    window.KnightPathRender.recomputeLayout(canvas, game.boardSize || DEFAULT_BOARD_SIZE);
    modalRegions = window.KnightPathRender.render(context, game);
    if (debugMode) {
      window.KnightPathRender.drawDebugGrid(context);
    }
  }

  function tick() {
    completeFinishExitIfReady();
    render();
    const { game } = window.KnightPathState;
    if (game.state === "welcome" || game.state === "playing" || game.state === "finished") {
      animationFrameId = window.requestAnimationFrame(tick);
    } else {
      animationFrameId = null;
    }
  }

  function ensureAnimationLoop() {
    if (animationFrameId === null) {
      animationFrameId = window.requestAnimationFrame(tick);
    }
  }

  function stopAnimationLoop() {
    if (animationFrameId !== null) {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  function handleKeyDown(event) {
    if (event.key.toLowerCase() === "d") {
      debugMode = !debugMode;
      render();
    }

    const { game, undo } = window.KnightPathState;
    const isUndoKey = event.key.toLowerCase() === "u" || (event.ctrlKey && event.key.toLowerCase() === "z");
    if (isUndoKey && game.state === "playing" && game.modal === null) {
      if (undo()) {
        event.preventDefault();
        render();
      }
    }
  }

  function handlePointerUp(event) {
    const point = canvasPoint(event);
    const { game, initGame, startGame, openSettings, saveSettings, move, undo, surrender } = window.KnightPathState;

    if (game.modal === "settings") {
      handleSettingsClick(point, saveSettings);
      return;
    }

    if (game.modal === "confirmGiveUp") {
      handleConfirmGiveUpClick(point, surrender);
      return;
    }

    if (game.state === "welcome") {
      handleWelcomeClick(point, initGame, startGame, openSettings);
      return;
    }

    if (game.state === "playing") {
      handlePlayingClick(point, move, undo);
      return;
    }

    if (game.state === "finished") {
      handleFinishedClick(point, initGame, startGame, openSettings);
    }
  }

  function handleWelcomeClick(point, initGame, startGame, openSettings) {
    const buttons = window.KnightPathRender.welcomeButtonRects();

    if (hitRect(point, buttons.settings)) {
      openSettings();
      render();
      return;
    }

    if (hitRect(point, buttons.start)) {
      initGame();
      startGame();
      render();
      ensureAnimationLoop();
    }
  }

  function handlePlayingClick(point, move, undo) {
    const { game } = window.KnightPathState;
    if (game.finishExit) {
      return;
    }

    const buttons = window.KnightPathRender.playingButtonRects();
    if (hitRect(point, buttons.undo)) {
      if (undo()) {
        render();
      }
      return;
    }

    if (hitRect(point, buttons.giveUp)) {
      game.modal = "confirmGiveUp";
      render();
      return;
    }

    const cell = window.KnightPathRender.boardCellAt(point, game.boardSize || DEFAULT_BOARD_SIZE);
    if (!cell) {
      return;
    }

    if (move(cell.x, cell.y)) {
      canvas.style.cursor = "default";
      render();
    } else {
      playNegativeTone();
    }
  }

  function handleFinishedClick(point, initGame, startGame, openSettings) {
    const buttons = window.KnightPathRender.finishedButtonRects();

    if (hitRect(point, buttons.settings)) {
      openSettings();
      render();
      return;
    }

    if (hitRect(point, buttons.newGame)) {
      initGame();
      startGame();
      render();
      ensureAnimationLoop();
    }
  }

  function handleSettingsClick(point, saveSettings) {
    const { game } = window.KnightPathState;

    if (!modalRegions) {
      return;
    }

    if (hitRect(point, modalRegions.spinnerUp)) {
      game.pendingBoardSize = Math.min(8, game.pendingBoardSize + 1);
      render();
      return;
    }

    if (hitRect(point, modalRegions.spinnerDown)) {
      game.pendingBoardSize = Math.max(5, game.pendingBoardSize - 1);
      render();
      return;
    }

    for (const toggle of modalRegions.toggles) {
      if (hitRect(point, toggle)) {
        game[toggle.field] = toggle.value;
        render();
        return;
      }
    }

    if (hitRect(point, modalRegions.saveBtn)) {
      saveSettings(safeStorage);
      render();
    }
  }

  function handleConfirmGiveUpClick(point, surrender) {
    const { game } = window.KnightPathState;
    if (!modalRegions) {
      game.modal = null;
      render();
      return;
    }

    if (hitRect(point, modalRegions.confirmBtn)) {
      surrender();
      render();
      ensureAnimationLoop();
      return;
    }

    if (hitRect(point, modalRegions.cancelBtn) || !hitRect(point, modalRegions.panel)) {
      game.modal = null;
      render();
    }
  }

  function handlePointerMove(event) {
    const point = canvasPoint(event);
    const { game, isAvailableMove } = window.KnightPathState;

    if (game.modal !== null || game.state !== "playing") {
      game.hoverCell = null;
      if (game.modal === "confirmGiveUp" && modalRegions) {
        canvas.style.cursor = (
          hitRect(point, modalRegions.confirmBtn) ||
          hitRect(point, modalRegions.cancelBtn)
        ) ? "pointer" : "default";
        return;
      }
      canvas.style.cursor = "default";
      return;
    }

    if (game.finishExit) {
      game.hoverCell = null;
      canvas.style.cursor = "default";
      return;
    }

    const buttons = window.KnightPathRender.playingButtonRects();
    if (
      (game.path && game.path.length >= 2 && hitRect(point, buttons.undo)) ||
      hitRect(point, buttons.giveUp)
    ) {
      game.hoverCell = null;
      canvas.style.cursor = "pointer";
      return;
    }

    const cell = window.KnightPathRender.boardCellAt(point, game.boardSize || DEFAULT_BOARD_SIZE);
    if (cell && isAvailableMove(cell.x, cell.y)) {
      game.hoverCell = cell;
      canvas.style.cursor = "pointer";
      return;
    }

    game.hoverCell = null;
    canvas.style.cursor = "default";
  }

  function playNegativeTone() {
    // Real audio synthesis lands in M8; M6 only needs the rejected-click hook.
  }

  function completeFinishExitIfReady() {
    const { game, completeFinishExit } = window.KnightPathState;
    if (!game.finishExit) {
      return;
    }

    if (performance.now() - game.finishExit.startedAt >= game.finishExit.duration) {
      completeFinishExit();
    }
  }

  function handleWheel(event) {
    const { game } = window.KnightPathState;
    if (game.state !== "playing" || game.modal !== null) {
      return;
    }

    const point = canvasPoint(event);
    const panel = window.KnightPathRender.historyPanelRect();
    if (!hitRect(point, panel)) {
      return;
    }

    const rowH = Math.max(22, Math.round(window.KnightPathRender.layout.btnH * 0.52));
    const listTop = panel.y + window.KnightPathRender.layout.btnH * 0.32;
    const listBottom = panel.y + panel.h - rowH * 0.35;
    const visibleRows = Math.max(1, Math.floor((listBottom - listTop) / rowH));
    const totalRows = game.path && game.path.length ? game.path.length : 1;
    const maxScroll = Math.max(0, totalRows - visibleRows);
    const direction = event.deltaY > 0 ? 1 : -1;

    game.historyScroll = Math.min(maxScroll, Math.max(0, (game.historyScroll || 0) + direction));
    event.preventDefault();
    render();
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = window.KnightPathRender.layout.width / rect.width;
    const scaleY = window.KnightPathRender.layout.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  function hitRect(point, rect) {
    return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
  }

  function init() {
    canvas = document.getElementById("gameCanvas");
    if (!canvas || !canvas.getContext) {
      showCanvasFallback();
      return;
    }

    context = canvas.getContext("2d");
    if (!context) {
      showCanvasFallback();
      return;
    }

    window.KnightPathState.loadSettings(safeStorage);
    render();
    ensureAnimationLoop();
    window.addEventListener("resize", render);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("knightPathRenderAssetLoaded", render);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("wheel", handleWheel, { passive: false });
  }

  window.KnightPathGame = {
    safeStorage,
    render,
  };

  window.addEventListener("load", init);
})();
