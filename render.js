(function () {
  "use strict";

  const COLOR = {
    COLOR_BG: "#1A5C35",
  };

  const DEFAULT_BOARD_SIZE = 5;

  const layout = {
    width: 0,
    height: 0,
    pixelRatio: 1,
  };

  function recomputeLayout(canvas, boardSize) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const targetRatio = 4 / 3;

    let cssWidth = viewportWidth;
    let cssHeight = cssWidth / targetRatio;

    if (cssHeight > viewportHeight) {
      cssHeight = viewportHeight;
      cssWidth = cssHeight * targetRatio;
    }

    const pixelRatio = window.devicePixelRatio || 1;
    layout.width = Math.round(cssWidth);
    layout.height = Math.round(cssHeight);
    layout.pixelRatio = pixelRatio;

    canvas.style.width = `${layout.width}px`;
    canvas.style.height = `${layout.height}px`;
    canvas.width = Math.round(layout.width * pixelRatio);
    canvas.height = Math.round(layout.height * pixelRatio);

    const context = canvas.getContext("2d");
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    layout.boardSize = boardSize || DEFAULT_BOARD_SIZE;
  }

  function drawBackground(context) {
    context.fillStyle = COLOR.COLOR_BG;
    context.fillRect(0, 0, layout.width, layout.height);
  }

  window.KnightPathRender = {
    COLOR,
    layout,
    recomputeLayout,
    drawBackground,
  };
})();
