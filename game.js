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
    window.KnightPathRender.recomputeLayout(canvas, DEFAULT_BOARD_SIZE);
    window.KnightPathRender.drawBackground(context);
    if (debugMode) {
      window.KnightPathRender.drawDebugGrid(context);
    }
  }

  function handleKeyDown(event) {
    if (event.key.toLowerCase() === "d") {
      debugMode = !debugMode;
      render();
    }
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

    render();
    window.addEventListener("resize", render);
    window.addEventListener("keydown", handleKeyDown);
  }

  window.KnightPathGame = {
    safeStorage,
    render,
  };

  window.addEventListener("load", init);
})();
