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
  let debugFinishIndex = 0;

  const DEBUG_FINISH_RESULTS = ["win", "deadEnd", "surrender"];

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
  }

  function handlePointerUp(event) {
    const point = canvasPoint(event);
    const { game, initGame, startGame, finishGame, openSettings, saveSettings } = window.KnightPathState;

    if (game.modal === "settings") {
      handleSettingsClick(point, saveSettings);
      return;
    }

    if (game.state === "welcome") {
      handleWelcomeClick(point, initGame, startGame, openSettings);
      return;
    }

    if (game.state === "playing") {
      handlePlayingClick(point, finishGame);
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

  function handlePlayingClick(point, finishGame) {
    const button = window.KnightPathRender.tempFinishButtonRect();
    if (!hitRect(point, button)) {
      return;
    }

    const result = DEBUG_FINISH_RESULTS[debugFinishIndex];
    debugFinishIndex = (debugFinishIndex + 1) % DEBUG_FINISH_RESULTS.length;
    finishGame(result);
    render();
    ensureAnimationLoop();
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
  }

  window.KnightPathGame = {
    safeStorage,
    render,
  };

  window.addEventListener("load", init);
})();
