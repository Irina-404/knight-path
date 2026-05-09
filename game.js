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
  let audioContext = null;
  let historyDrag = null;

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
    if (isUndoKey && game.state === "playing" && game.modal === null && !isInputBlocked()) {
      if (performUndo(undo)) {
        event.preventDefault();
      }
    }
  }

  function handlePointerUp(event) {
    resumeAudioIfEnabled();
    const point = canvasPoint(event);
    const { game, initGame, startGame, openSettings, saveSettings, move, undo, surrender } = window.KnightPathState;

    if (historyDrag) {
      updateHistoryDrag(point);
      stopHistoryDrag(event);
      return;
    }

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

  function handlePointerDown(event) {
    const { game } = window.KnightPathState;
    if (game.state !== "playing" || game.modal !== null || game.finishExit || isInputBlocked()) {
      return;
    }

    const point = canvasPoint(event);
    const regions = window.KnightPathRender.historyScrollbarHitRegions(game);
    if (!regions || regions.maxScroll <= 0 || !hitRect(point, regions.thumb)) {
      return;
    }

    historyDrag = {
      pointerId: event.pointerId,
      offsetY: point.y - regions.thumb.y,
    };
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = "grabbing";
    event.preventDefault();
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
    if (game.finishExit || isInputBlocked()) {
      return;
    }

    const buttons = window.KnightPathRender.playingButtonRects();
    if (hitRect(point, buttons.undo)) {
      performUndo(undo);
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
      window.KnightPathRender.pushEffect({ type: "moveFlash", x: cell.x, y: cell.y });
      playMoveTone();
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

    if (historyDrag) {
      updateHistoryDrag(point);
      canvas.style.cursor = "grabbing";
      event.preventDefault();
      return;
    }

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

    if (game.finishExit || isInputBlocked()) {
      game.hoverCell = null;
      canvas.style.cursor = "default";
      return;
    }

    const buttons = window.KnightPathRender.playingButtonRects();
    const historyScroll = window.KnightPathRender.historyScrollbarHitRegions(game);
    if (
      (game.path && game.path.length >= 2 && hitRect(point, buttons.undo)) ||
      hitRect(point, buttons.giveUp) ||
      (historyScroll.maxScroll > 0 && hitRect(point, historyScroll.thumb))
    ) {
      game.hoverCell = null;
      canvas.style.cursor = hitRect(point, historyScroll.thumb) ? "grab" : "pointer";
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

  function handlePointerCancel(event) {
    if (historyDrag) {
      stopHistoryDrag(event);
    }
  }

  function updateHistoryDrag(point) {
    const { game } = window.KnightPathState;
    const regions = window.KnightPathRender.historyScrollbarHitRegions(game);
    if (!regions || regions.maxScroll <= 0) {
      return;
    }

    const travel = regions.track.h - regions.thumb.h;
    if (travel <= 0) {
      game.historyScroll = 0;
      render();
      return;
    }

    const thumbY = Math.min(
      regions.track.y + travel,
      Math.max(regions.track.y, point.y - historyDrag.offsetY),
    );
    const ratio = (thumbY - regions.track.y) / travel;
    game.historyScroll = Math.round(ratio * regions.maxScroll);
    render();
  }

  function stopHistoryDrag(event) {
    if (historyDrag && event.pointerId === historyDrag.pointerId && canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    historyDrag = null;
    canvas.style.cursor = "default";
  }

  function performUndo(undo) {
    const { game } = window.KnightPathState;
    if (!game.path || game.path.length < 2) {
      return false;
    }

    const abandoned = game.path[game.path.length - 1];
    if (!undo()) {
      return false;
    }

    window.KnightPathRender.pushEffect({ type: "undoFade", x: abandoned.x, y: abandoned.y });
    playUndoTone();
    render();
    return true;
  }

  function isInputBlocked() {
    return window.KnightPathRender.hasBlockingEffect();
  }

  function playMoveTone() {
    playToneSequence([
      { frequency: 190, start: 0, duration: 0.045, type: "square", gain: 0.035 },
      { frequency: 95, start: 0.018, duration: 0.060, type: "triangle", gain: 0.030 },
    ]);
  }

  function playNegativeTone() {
    playToneSequence([
      { frequency: 130, start: 0, duration: 0.110, type: "sine", gain: 0.030 },
    ]);
  }

  function playUndoTone() {
    playToneSequence([
      { frequency: 330, start: 0, duration: 0.060, type: "triangle", gain: 0.026 },
      { frequency: 220, start: 0.055, duration: 0.085, type: "triangle", gain: 0.024 },
    ]);
  }

  function playVictoryTone() {
    playToneSequence([
      { frequency: 392, start: 0, duration: 0.100, type: "triangle", gain: 0.032 },
      { frequency: 494, start: 0.090, duration: 0.110, type: "triangle", gain: 0.032 },
      { frequency: 659, start: 0.190, duration: 0.150, type: "triangle", gain: 0.030 },
      { frequency: 784, start: 0.320, duration: 0.210, type: "sine", gain: 0.024 },
    ]);
  }

  function playDefeatTone() {
    playToneSequence([
      { frequency: 220, start: 0, duration: 0.120, type: "triangle", gain: 0.030 },
      { frequency: 165, start: 0.110, duration: 0.150, type: "triangle", gain: 0.028 },
    ]);
  }

  function playToneSequence(notes) {
    const audio = resumeAudioIfEnabled();
    if (!audio) {
      return;
    }

    const now = audio.currentTime;
    for (const note of notes) {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const start = now + note.start;
      const end = start + note.duration;

      oscillator.type = note.type;
      oscillator.frequency.setValueAtTime(note.frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(note.gain, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);

      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(end + 0.02);
    }
  }

  function resumeAudioIfEnabled() {
    const { game } = window.KnightPathState;
    if (!game.soundEnabled) {
      return null;
    }

    try {
      if (!audioContext) {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtor) {
          return null;
        }
        audioContext = new AudioCtor();
      }

      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      return audioContext;
    } catch {
      return null;
    }
  }

  function completeFinishExitIfReady() {
    const { game, completeFinishExit } = window.KnightPathState;
    if (!game.finishExit) {
      return;
    }

    if (performance.now() - game.finishExit.startedAt >= game.finishExit.duration) {
      const result = game.finishExit.result;
      completeFinishExit();
      if (result === "win") {
        playVictoryTone();
      } else if (result === "deadEnd") {
        playDefeatTone();
      }
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
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointercancel", handlePointerCancel);
    canvas.addEventListener("wheel", handleWheel, { passive: false });
  }

  window.KnightPathGame = {
    safeStorage,
    render,
  };

  window.addEventListener("load", init);
})();
