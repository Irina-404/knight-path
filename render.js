(function () {
  "use strict";

  const COLOR = {
    COLOR_BG: "#1A5C35",
    PLACEHOLDER_FILL: "rgba(255, 255, 255, 0.08)",
    PLACEHOLDER_STROKE: "rgba(255, 255, 255, 0.34)",
    PLACEHOLDER_TEXT: "rgba(255, 255, 255, 0.72)",
    FRAME_STROKE: "rgba(61, 24, 0, 0.88)",
    CELL_DARK: "rgba(122, 64, 16, 0.72)",
    CELL_LIGHT: "rgba(232, 217, 181, 0.72)",
    GRID_LINE: "rgba(61, 24, 0, 0.35)",
    SERVICE_FILL: "rgba(245, 236, 215, 0.72)",
    SERVICE_STROKE: "rgba(139, 105, 20, 0.78)",
    SERVICE_TEXT: "rgba(61, 24, 0, 0.72)",
    HISTORY_FILL: "rgba(61, 24, 0, 0.16)",
    HISTORY_STROKE: "rgba(255, 255, 255, 0.62)",
    COORD_TEXT: "rgba(255, 255, 255, 0.84)",
  };

  const DEFAULT_BOARD_SIZE = 5;

  const X_LINES = [
    ["x_left", 0.05],
    ["x_board_left", 0.08],
    ["x_board_right", 0.64],
    ["x_col_left", 0.72],
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
    boardX: 0,
    boardY: 0,
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

    layout.boardSide = Math.round(Math.min(
      layout.lines.x_board_right - layout.lines.x_board_left,
      layout.lines.y_board_bottom - layout.lines.y_board_top,
    ));
    layout.lines.x_board_right = layout.lines.x_board_left + layout.boardSide;
    layout.lines.y_board_bottom = layout.lines.y_board_top + layout.boardSide;

    layout.usableWidth = layout.lines.x_right - layout.lines.x_left;
    layout.usableHeight = layout.lines.y_bottom - layout.lines.y_top;
    layout.btnH = Math.round(0.08 * layout.usableHeight);
    layout.btnW = Math.round(0.22 * layout.usableWidth);
    layout.btnRadius = Math.round(0.25 * layout.btnH);
    layout.lines.y_service_mid = layout.lines.y_board_bottom - layout.btnH / 2;
    layout.cellSize = layout.boardSide / (boardSize || DEFAULT_BOARD_SIZE);
    layout.boardX = layout.lines.x_board_left;
    layout.boardY = layout.lines.y_board_top;

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

  function drawStaticLayout(context, boardSize) {
    drawHeaderPlaceholder(context);
    drawBoard(context, boardSize || DEFAULT_BOARD_SIZE);
    drawServiceColumn(context);
  }

  function drawHeaderPlaceholder(context) {
    context.save();
    context.fillStyle = COLOR.PLACEHOLDER_TEXT;
    context.font = `bold ${Math.round(layout.btnH * 0.55)}px Arial, Helvetica, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("Knight's Path: Step 2 / 25", layout.boardX + layout.boardSide / 2, (layout.lines.y_top + layout.lines.y_header) / 2);
    context.restore();
  }

  function drawBoard(context, boardSize) {
    const labelSize = boardLabelSize();
    const labelGap = boardLabelGap();
    const frame = Math.ceil(labelSize + labelGap * 2);
    const outerX = layout.boardX - frame;
    const outerY = layout.boardY - frame;
    const outerSize = layout.boardSide + frame * 2;

    context.save();
    context.fillStyle = COLOR.FRAME_STROKE;
    context.fillRect(outerX, outerY, outerSize, outerSize);

    for (let y = 0; y < boardSize; y += 1) {
      for (let x = 0; x < boardSize; x += 1) {
        const screenY = boardSize - 1 - y;
        const cellX = layout.boardX + x * layout.cellSize;
        const cellY = layout.boardY + screenY * layout.cellSize;
        context.fillStyle = (x + y) % 2 === 0 ? COLOR.CELL_DARK : COLOR.CELL_LIGHT;
        context.fillRect(cellX, cellY, layout.cellSize, layout.cellSize);
        context.strokeStyle = COLOR.GRID_LINE;
        context.lineWidth = 1;
        context.strokeRect(cellX + 0.5, cellY + 0.5, layout.cellSize - 1, layout.cellSize - 1);
      }
    }

    context.strokeStyle = COLOR.FRAME_STROKE;
    context.lineWidth = Math.max(2, Math.round(frame * 0.35));
    context.strokeRect(layout.boardX, layout.boardY, layout.boardSide, layout.boardSide);
    drawBoardCoordinates(context, boardSize, labelSize, labelGap);
    context.restore();
  }

  function boardLabelSize() {
    return Math.max(12, Math.round(layout.cellSize * 0.20));
  }

  function boardLabelGap() {
    return Math.max(3, Math.round(layout.cellSize * 0.045));
  }

  function drawBoardCoordinates(context, boardSize, labelSize, labelGap) {
    const letters = "abcdefgh";

    context.save();
    context.fillStyle = COLOR.COORD_TEXT;
    context.font = `bold ${labelSize}px Arial, Helvetica, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "top";

    for (let x = 0; x < boardSize; x += 1) {
      const centerX = layout.boardX + x * layout.cellSize + layout.cellSize / 2;
      context.fillText(letters[x], centerX, layout.boardY + layout.boardSide + labelGap);
    }

    context.textAlign = "right";
    context.textBaseline = "middle";
    for (let y = 0; y < boardSize; y += 1) {
      const screenY = boardSize - 1 - y;
      const centerY = layout.boardY + screenY * layout.cellSize + layout.cellSize / 2;
      context.fillText(String(y + 1), layout.boardX - labelGap, centerY);
    }

    context.restore();
  }

  function drawServiceColumn(context) {
    const x = layout.lines.x_col_left;
    const w = layout.lines.x_right - layout.lines.x_col_left;
    const centerX = x + w / 2;
    const headerY = (layout.lines.y_top + layout.lines.y_header) / 2;
    const panel = historyPanelRect();

    context.save();
    drawButton(context, "Undo", centerX, headerY, "ghost", false, w);
    drawMoveHistory(context, panel);
    drawButton(context, "Give up?", centerX, (layout.lines.y_service_mid + layout.lines.y_bottom) / 2, "muted", false, panel.w);
    context.restore();
  }

  function historyPanelRect() {
    const panelX = layout.lines.x_col_left;
    const panelY = layout.boardY;
    const panelW = layout.lines.x_right - layout.lines.x_col_left;
    const topGap = panelY - layout.lines.y_header;
    const panelBottom = layout.lines.y_service_mid - topGap;
    return {
      x: panelX,
      y: panelY,
      w: panelW,
      h: panelBottom - panelY,
    };
  }

  function drawMoveHistory(context, panel) {
    const pad = Math.round(layout.btnH * 0.28);
    const rowH = Math.max(18, Math.round(layout.btnH * 0.40));
    const scrollW = Math.max(24, Math.round(panel.w * 0.12));

    context.save();
    context.fillStyle = COLOR.HISTORY_FILL;
    context.fillRect(panel.x, panel.y, panel.w, panel.h);
    context.strokeStyle = COLOR.HISTORY_STROKE;
    context.lineWidth = 2;
    context.strokeRect(panel.x, panel.y, panel.w, panel.h);

    context.fillStyle = COLOR.COORD_TEXT;
    context.font = `${Math.round(layout.btnH * 0.44)}px Arial, Helvetica, sans-serif`;
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillText("1) a1", panel.x + pad * 0.65, panel.y + rowH * 0.9);

    context.fillStyle = "rgba(255, 255, 255, 0.32)";
    context.fillRect(panel.x + panel.w - scrollW - 3, panel.y + 3, scrollW, panel.h - 6);
    context.fillStyle = "rgba(255, 255, 255, 0.54)";
    context.fillRect(panel.x + panel.w - scrollW - 3, panel.y + 3, scrollW, Math.max(rowH * 1.6, panel.h * 0.22));
    context.restore();
  }

  function drawButton(context, label, centerX, centerY, style, disabled, width) {
    const buttonW = width || layout.btnW;
    const x = centerX - buttonW / 2;
    const y = centerY - layout.btnH / 2;

    context.save();
    drawRoundRect(context, x, y, buttonW, layout.btnH, layout.btnRadius);

    if (disabled) {
      context.fillStyle = "rgba(158, 158, 158, 0.5)";
      context.strokeStyle = "rgba(158, 158, 158, 0.7)";
    } else if (style === "gold") {
      context.fillStyle = "rgba(255, 179, 0, 0.35)";
      context.strokeStyle = "rgba(255, 240, 160, 0.85)";
    } else if (style === "muted") {
      context.fillStyle = "rgba(78, 107, 66, 0.55)";
      context.strokeStyle = "rgba(78, 107, 66, 0.78)";
    } else {
      context.fillStyle = COLOR.PLACEHOLDER_FILL;
      context.strokeStyle = COLOR.PLACEHOLDER_STROKE;
    }

    context.lineWidth = 2;
    context.fill();
    context.stroke();
    context.fillStyle = style === "muted" ? "rgba(255, 255, 255, 0.82)" : COLOR.PLACEHOLDER_TEXT;
    context.font = `${Math.round(layout.btnH * 0.38)}px Arial, Helvetica, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label, centerX, centerY);
    context.restore();
  }

  function drawRoundRect(context, x, y, width, height, radius) {
    const safeRadius = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + safeRadius, y);
    context.lineTo(x + width - safeRadius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
    context.lineTo(x + width, y + height - safeRadius);
    context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
    context.lineTo(x + safeRadius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
    context.lineTo(x, y + safeRadius);
    context.quadraticCurveTo(x, y, x + safeRadius, y);
    context.closePath();
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
    drawStaticLayout,
    drawDebugGrid,
  };
})();
