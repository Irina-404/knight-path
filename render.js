(function () {
  "use strict";

  const COLOR = {
    COLOR_BG: "#1A5C35",
  };

  const DEFAULT_BOARD_SIZE = 5;

  const X_LINES = [
    ["x_left", 0.05],
    ["x_board_left", 0.08],
    ["x_board_right", 0.64],
    ["x_col_left", 0.70],
    ["x_col_right", 0.92],
    ["x_center", 0.50],
    ["x_right", 0.95],
  ];

  const Y_LINES = [
    ["y_top", 0.05],
    ["y_header", 0.14],
    ["y_board_top", 0.18],
    ["y_board_bottom", 0.90],
    ["y_service_mid", 0.88],
    ["y_bottom", 0.95],
  ];

  const layout = {
    width: 0,
    height: 0,
    pixelRatio: 1,
    lines: {},
    usableWidth: 0,
    usableHeight: 0,
    btnH: 0,
    btnW: 0,
    btnRadius: 0,
    boardSide: 0,
    cellSize: 0,
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
    layout.lines = {};

    for (const [name, ratio] of X_LINES) {
      layout.lines[name] = Math.round(layout.width * ratio);
    }

    for (const [name, ratio] of Y_LINES) {
      layout.lines[name] = Math.round(layout.height * ratio);
    }

    layout.usableWidth = layout.lines.x_right - layout.lines.x_left;
    layout.usableHeight = layout.lines.y_bottom - layout.lines.y_top;
    layout.btnH = Math.round(0.08 * layout.usableHeight);
    layout.btnW = Math.round(0.22 * layout.usableWidth);
    layout.btnRadius = Math.round(0.25 * layout.btnH);
    layout.boardSide = Math.min(
      layout.lines.x_board_right - layout.lines.x_board_left,
      layout.lines.y_board_bottom - layout.lines.y_board_top,
    );
    layout.cellSize = layout.boardSide / (boardSize || DEFAULT_BOARD_SIZE);

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

  function drawDebugGrid(context) {
    context.save();
    context.lineWidth = 1;
    context.font = "12px Arial, Helvetica, sans-serif";
    context.textBaseline = "top";
    drawDebugLines(context, X_LINES, true);
    drawDebugLines(context, Y_LINES, false);
    context.restore();
  }

  function drawDebugLines(context, definitions, isVertical) {
    const usedPositions = new Map();

    for (const [name] of definitions) {
      const position = layout.lines[name];
      const duplicateIndex = usedPositions.get(position) || 0;
      usedPositions.set(position, duplicateIndex + 1);

      context.strokeStyle = "rgba(255, 225, 0, 0.82)";
      context.fillStyle = "rgba(255, 225, 0, 0.95)";
      context.beginPath();

      if (isVertical) {
        context.moveTo(position + 0.5, 0);
        context.lineTo(position + 0.5, layout.height);
        context.stroke();

        context.save();
        context.translate(position + 4 + duplicateIndex * 15, 6);
        context.rotate(Math.PI / 2);
        context.fillText(name, 0, 0);
        context.restore();
      } else {
        context.moveTo(0, position + 0.5);
        context.lineTo(layout.width, position + 0.5);
        context.stroke();
        context.fillText(name, 6, position + 4 + duplicateIndex * 15);
      }
    }
  }

  window.KnightPathRender = {
    COLOR,
    layout,
    recomputeLayout,
    drawBackground,
    drawDebugGrid,
  };
})();
