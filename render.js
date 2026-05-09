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
    HISTORY_FILL: "rgba(255, 255, 255, 0.08)",
    HISTORY_STROKE: "rgba(255, 255, 255, 0.34)",
    COORD_TEXT: "rgba(255, 255, 255, 0.84)",
    MODAL_BG: "#F5ECD7",
    MODAL_BORDER: "#8B6914",
    MODAL_DARK: "#3D1800",
    MODAL_BODY: "#5D3A1A",
    MODAL_ACCENT: "#C8A96E",
    MODAL_SELECTED_TEXT: "#FFFFFF",
    RESULT_GOLD: "#FFD700",
    RESULT_TEXT: "#FFFFFF",
    RESULT_TEXT_SOFT: "rgba(255, 255, 255, 0.78)",
    STEP_NUMBER: "#FFFFFF",
    VISITED_CELL: "#3F3F3F",
    HINT_SHIMMER: "rgba(94, 234, 212, 0.45)",
    DEAD_HINT_SHIMMER: "rgba(220, 60, 60, 0.55)",
    HINT_HOVER: "rgba(94, 234, 212, 0.18)",
    HINT_NUMBER: "rgba(255, 245, 180, 0.18)",
    DEAD_HINT_NUMBER: "rgba(255, 255, 255, 0.24)",
    WIN_HINT_SHIMMER: "rgba(255, 211, 64, 0.55)",
    CROWN_GOLD: "#FFD700",
    CROWN_GOLD_DARK: "#B77900",
    SOLUTION_TRAIL: "rgba(255, 215, 96, 0.70)",
    SOLUTION_TRAIL_SOFT: "rgba(255, 245, 190, 0.62)",
  };

  const DEFAULT_BOARD_SIZE = 5;
  const welcomeImage = createImage("knight-path-cover.webp");
  const knightImage = createImage("knight.webp");
  const finishImages = {
    win: createImage("finish-win.webp"),
    deadEnd: createImage("finish-dead-end.webp"),
    surrender: createImage("finish-surrender.webp"),
  };

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

  function render(context, game) {
    drawBackground(context);
    if (game.state === "welcome") {
      drawWelcome(context);
    } else if (game.state === "finished") {
      drawFinished(context, game);
    } else {
      drawPlaying(context, game);
    }

    if (game.modal === "settings") {
      return drawSettingsPanel(context, game);
    }

    if (game.modal === "confirmGiveUp") {
      return drawConfirmModal(
        context,
        "Give up?",
        "You will see one possible path from the start.",
        "Yes, sorry!",
      );
    }

    return null;
  }

  function drawWelcome(context) {
    drawCoverImage(context, welcomeImage);
    context.fillStyle = "rgba(0, 0, 0, 0.58)";
    context.fillRect(0, 0, layout.width, layout.height);

    const titleSize = Math.round(layout.btnH * 1.1);
    context.save();
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = `bold ${titleSize}px Arial, Helvetica, sans-serif`;
    context.shadowColor = "#FFB300";
    context.shadowBlur = 18;
    context.fillStyle = "#FFD700";
    context.fillText("Knight's Path", layout.lines.x_center, layout.lines.y_header + (layout.lines.y_board_top - layout.lines.y_header) / 2);

    const bodySize = Math.round(layout.btnH * 0.65);
    const lineHeight = bodySize * 1.7;
    const lines = [
      "Help the knight visit",
      "every square exactly once.",
    ];
    const centerY = (layout.lines.y_header + layout.lines.y_service_mid) / 2 + layout.btnH * 0.35;
    const totalHeight = (lines.length - 1) * lineHeight;
    context.font = `${bodySize}px Arial, Helvetica, sans-serif`;
    context.fillStyle = COLOR.PLACEHOLDER_TEXT;
    context.shadowBlur = 10;
    for (let index = 0; index < lines.length; index += 1) {
      context.fillText(lines[index], layout.lines.x_center, centerY - totalHeight / 2 + index * lineHeight);
    }
    context.restore();

    const buttons = welcomeButtonRects();
    drawButton(context, "Settings & Rules", buttons.settings.x + buttons.settings.w / 2, buttons.settings.y + buttons.settings.h / 2, "ghost");
    drawButton(context, "Start game", buttons.start.x + buttons.start.w / 2, buttons.start.y + buttons.start.h / 2, "gold");
  }

  function drawPlaying(context, game) {
    drawHeader(context, game);
    drawBoard(context, game.boardSize || DEFAULT_BOARD_SIZE, game, false);
    drawPlayerPath(context, game);
    drawCandidateHints(context, game);
    drawBoardGrid(context, game.boardSize || DEFAULT_BOARD_SIZE);
    if (game.knightPos) {
      drawKnight(context, game.knightPos, game.boardSize || DEFAULT_BOARD_SIZE, game);
    }
    drawServiceColumn(context, game);
  }

  function drawFinished(context, game) {
    const showPlayerPath = game.result !== "surrender";
    drawBoard(context, game.boardSize || DEFAULT_BOARD_SIZE, showPlayerPath ? game : null, true);
    if (showPlayerPath) {
      drawPlayerPath(context, game, false);
    }
    drawSolutionOverlay(context, game);
    drawBoardGrid(context, game.boardSize || DEFAULT_BOARD_SIZE);
    if (game.state === "playing" && game.knightPos) {
      drawKnight(context, game.knightPos, game.boardSize || DEFAULT_BOARD_SIZE);
    }
    drawFinishedServiceColumn(context, game);
  }

  function drawFinishedServiceColumn(context, game) {
    const x = layout.lines.x_col_left;
    const w = layout.lines.x_right - layout.lines.x_col_left;
    const buttons = finishedButtonRects();
    const centerX = x + w / 2;

    context.save();
    drawResultBlock(context, game.result, centerX, w);
    drawResultIllustration(context, game.result, resultIllustrationRect());
    drawButton(context, "Settings & Rules", buttons.settings.x + buttons.settings.w / 2, buttons.settings.y + buttons.settings.h / 2, "ghost", false, w);
    drawButton(context, "New game", buttons.newGame.x + buttons.newGame.w / 2, buttons.newGame.y + buttons.newGame.h / 2, "gold", false, w);
    context.restore();
  }

  function drawResultBlock(context, result, centerX, width) {
    const lines = resultLines(result);
    const line1Size = Math.round(layout.btnH * 0.75);
    const line2Size = Math.round(layout.btnH * 0.52);
    const centerY = (layout.lines.y_top + layout.lines.y_header) / 2;

    context.save();
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = `bold ${line1Size}px Arial, Helvetica, sans-serif`;
    if (result === "win") {
      context.fillStyle = COLOR.RESULT_GOLD;
      context.shadowColor = "#FFB300";
      context.shadowBlur = 14;
    } else {
      context.fillStyle = COLOR.RESULT_TEXT;
    }
    fillTextFit(context, lines[0], centerX, centerY, width, line1Size);

    context.shadowBlur = 0;
    context.font = `${line2Size}px Arial, Helvetica, sans-serif`;
    context.fillStyle = COLOR.RESULT_TEXT_SOFT;
    fillTextFit(context, lines[1], centerX, centerY + line1Size * 0.72, width, line2Size);
    context.restore();
  }

  function resultLines(result) {
    if (result === "win") {
      return ["Well done!", "The knight found the path!"];
    }
    if (result === "surrender") {
      return ["No worries!", "Here is one possible path."];
    }
    return ["Dead end!", "The knight is trapped."];
  }

  function drawResultIllustration(context, result, rect) {
    const image = finishImages[result];
    if (!image || !image.complete || image.naturalWidth <= 0) {
      return;
    }

    context.save();
    drawImageContain(context, image, rect.x, rect.y, rect.w, rect.h);
    context.restore();
  }

  function drawHeader(context, game) {
    const step = game.path && game.path.length ? game.path.length : 1;
    const total = (game.boardSize || DEFAULT_BOARD_SIZE) ** 2;
    context.save();
    context.fillStyle = COLOR.PLACEHOLDER_TEXT;
    context.font = `bold ${Math.round(layout.btnH * 0.55)}px Arial, Helvetica, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(`Knight's Path: Step ${step} / ${total}`, layout.boardX + layout.boardSide / 2, (layout.lines.y_top + layout.lines.y_header) / 2);
    context.restore();
  }

  function drawBoard(context, boardSize, game, includeCurrentVisited) {
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
        context.fillStyle = isVisitedForBoard(game, x, y, includeCurrentVisited)
          ? COLOR.VISITED_CELL
          : ((x + y) % 2 === 0 ? COLOR.CELL_DARK : COLOR.CELL_LIGHT);
        context.fillRect(cellX, cellY, layout.cellSize, layout.cellSize);
      }
    }

    drawBoardGrid(context, boardSize);
    context.strokeStyle = COLOR.FRAME_STROKE;
    context.lineWidth = Math.max(2, Math.round(frame * 0.35));
    context.strokeRect(layout.boardX, layout.boardY, layout.boardSide, layout.boardSide);
    drawBoardCoordinates(context, boardSize, labelSize, labelGap);
    context.restore();
  }

  function isVisitedForBoard(game, x, y, includeCurrentVisited) {
    if (!game || !game.path || !game.path.length) return false;
    if (
      includeCurrentVisited !== true &&
      game.knightPos &&
      game.knightPos.x === x &&
      game.knightPos.y === y
    ) {
      return false;
    }

    return game.path.some((cell) => cell.x === x && cell.y === y);
  }

  function drawBoardGrid(context, boardSize) {
    const size = boardSize || DEFAULT_BOARD_SIZE;

    context.save();
    context.strokeStyle = COLOR.GRID_LINE;
    context.lineWidth = 1;
    context.beginPath();

    for (let index = 0; index <= size; index += 1) {
      const x = layout.boardX + index * layout.cellSize;
      context.moveTo(x, layout.boardY);
      context.lineTo(x, layout.boardY + layout.boardSide);

      const y = layout.boardY + index * layout.cellSize;
      context.moveTo(layout.boardX, y);
      context.lineTo(layout.boardX + layout.boardSide, y);
    }

    context.stroke();
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

  function drawKnight(context, cell, boardSize, game) {
    const center = cellCenter(cell, boardSize);
    const breath = Math.sin(performance.now() / 900);
    const exit = finishExitTransform(game);
    const size = layout.cellSize * (0.76 + breath * 0.012) * exit.scale;
    const lift = layout.cellSize * breath * 0.012 + exit.y;
    const drawX = center.x - size / 2 + exit.x;
    const drawY = center.y - size / 2 - lift;

    context.save();
    context.globalAlpha = exit.alpha;
    if (knightImage.complete && knightImage.naturalWidth > 0) {
      context.drawImage(knightImage, drawX, drawY, size, size);
    } else {
      context.fillStyle = "rgba(255, 220, 120, 0.82)";
      context.beginPath();
      context.arc(center.x, center.y - lift, size * 0.34, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }

  function finishExitTransform(game) {
    if (!game || !game.finishExit) {
      return { x: 0, y: 0, scale: 1, alpha: 1 };
    }

    const elapsed = performance.now() - game.finishExit.startedAt;
    const progress = Math.min(1, Math.max(0, elapsed / game.finishExit.duration));
    const ease = 1 - (1 - progress) ** 3;
    const arc = Math.sin(progress * Math.PI);

    return {
      x: ease * (layout.lines.x_col_left - layout.boardX),
      y: arc * layout.cellSize * 0.78 - ease * layout.cellSize * 0.18,
      scale: 1 + arc * 0.10,
      alpha: 1 - Math.max(0, progress - 0.72) / 0.28,
    };
  }

  function cellCenter(cell, boardSize) {
    return {
      x: layout.boardX + cell.x * layout.cellSize + layout.cellSize / 2,
      y: layout.boardY + (boardSize - 1 - cell.y) * layout.cellSize + layout.cellSize / 2,
    };
  }

  function drawServiceColumn(context, game) {
    const x = layout.lines.x_col_left;
    const w = layout.lines.x_right - layout.lines.x_col_left;
    const centerX = x + w / 2;
    const headerY = (layout.lines.y_top + layout.lines.y_header) / 2;
    const panel = historyPanelRect();
    const buttons = playingButtonRects();
    const undoDisabled = !game.path || game.path.length < 2 || Boolean(game.finishExit);

    context.save();
    drawButton(context, "Undo", centerX, headerY, "ghost", undoDisabled, w);
    drawMoveHistory(context, panel, game);
    drawButton(context, "Give up?", buttons.giveUp.x + buttons.giveUp.w / 2, buttons.giveUp.y + buttons.giveUp.h / 2, "muted", Boolean(game.finishExit), panel.w);
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

  function drawMoveHistory(context, panel, game) {
    const pad = Math.round(layout.btnH * 0.28);
    const rowH = Math.max(22, Math.round(layout.btnH * 0.52));
    const scrollW = Math.max(24, Math.round(panel.w * 0.12));
    const listTop = panel.y + layout.btnH * 0.32;
    const listBottom = panel.y + panel.h - rowH * 0.35;
    const visibleRows = Math.max(1, Math.floor((listBottom - listTop) / rowH));

    context.save();
    context.fillStyle = COLOR.HISTORY_FILL;
    drawRoundRect(context, panel.x, panel.y, panel.w, panel.h, layout.btnRadius);
    context.fill();
    context.strokeStyle = COLOR.HISTORY_STROKE;
    context.lineWidth = 2;
    context.stroke();

    context.fillStyle = COLOR.COORD_TEXT;
    context.font = `${Math.round(layout.btnH * 0.44)}px Arial, Helvetica, sans-serif`;
    context.textAlign = "left";
    context.textBaseline = "middle";
    const path = game.path && game.path.length ? game.path : [{ x: 0, y: 0 }];
    const maxScroll = Math.max(0, path.length - visibleRows);
    const scroll = Math.min(maxScroll, Math.max(0, game.historyScroll || 0));
    for (let row = 0; row < visibleRows; row += 1) {
      const index = scroll + row;
      if (index >= path.length) break;
      const rowY = listTop + rowH * 0.35 + row * rowH;
      if (rowY > panel.y + panel.h - rowH * 0.5) break;
      context.fillText(`${index + 1}) ${cellName(path[index])}`, panel.x + pad * 0.65, rowY);
    }

    drawHistoryScrollbar(context, panel, scrollW, rowH, path.length, visibleRows, scroll);
    context.restore();
  }

  function drawHistoryScrollbar(context, panel, scrollW, rowH, totalRows, visibleRows, scroll) {
    const trackX = panel.x + panel.w - scrollW - 3;
    const trackY = panel.y + 3;
    const trackH = panel.h - 6;
    const maxScroll = Math.max(0, totalRows - visibleRows);
    const thumbH = maxScroll === 0
      ? trackH
      : Math.max(rowH * 1.4, trackH * (visibleRows / totalRows));
    const thumbY = maxScroll === 0
      ? trackY
      : trackY + (trackH - thumbH) * (scroll / maxScroll);

    context.fillStyle = "rgba(255, 255, 255, 0.24)";
    context.fillRect(trackX, trackY, scrollW, trackH);
    context.fillStyle = "rgba(255, 255, 255, 0.50)";
    context.fillRect(trackX, thumbY, scrollW, thumbH);
  }

  function cellName(cell) {
    return `${"abcdefgh"[cell.x]}${cell.y + 1}`;
  }

  function drawPlayerPath(context, game, skipCurrent) {
    const path = game.path || [];
    if (!path.length) return;

    context.save();
    for (let index = 0; index < path.length; index += 1) {
      const cell = path[index];
      if (skipCurrent !== false && game.knightPos && cell.x === game.knightPos.x && cell.y === game.knightPos.y) {
        continue;
      }
      drawVisitedCell(context, cell, game.boardSize || DEFAULT_BOARD_SIZE, index + 1);
    }
    context.restore();
  }

  function drawVisitedCell(context, cell, boardSize, step) {
    const cellX = layout.boardX + cell.x * layout.cellSize;
    const cellY = layout.boardY + (boardSize - 1 - cell.y) * layout.cellSize;
    context.fillStyle = COLOR.STEP_NUMBER;
    context.font = `bold ${Math.round(layout.cellSize * 0.36)}px Arial, Helvetica, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(step), cellX + layout.cellSize / 2, cellY + layout.cellSize / 2);
  }

  function drawCandidateHints(context, game) {
    if (!game.showCounts || !game.availableMoves || !game.availableMoves.length) {
      return;
    }

    const phase = (performance.now() / 1500) * Math.PI * 2;
    const pulse = 0.5 + 0.5 * Math.sin(phase);
    const alpha = 0.25 + 0.30 * pulse;
    const blur = 8 + 14 * pulse;

    context.save();
    for (const cell of game.availableMoves) {
      const count = window.KnightPathState.continuationCount(cell);
      const isFinalWin = isWinningCandidate(game, cell);
      drawCandidateCell(context, cell, game.boardSize || DEFAULT_BOARD_SIZE, count, alpha, blur, isFinalWin);
    }

    if (game.hoverCell && isCandidateCell(game, game.hoverCell)) {
      drawCandidateHover(context, game.hoverCell, game.boardSize || DEFAULT_BOARD_SIZE);
    }
    context.restore();
  }

  function drawCandidateCell(context, cell, boardSize, count, alpha, blur, isFinalWin) {
    const rect = boardCellRect(cell.x, cell.y, boardSize);
    const inset = layout.cellSize * 0.06;
    const isDead = count === 0;

    context.save();
    context.globalAlpha = alpha;
    context.fillStyle = isFinalWin
      ? COLOR.WIN_HINT_SHIMMER
      : (isDead ? COLOR.DEAD_HINT_SHIMMER : COLOR.HINT_SHIMMER);
    context.shadowColor = context.fillStyle;
    context.shadowBlur = blur;
    context.fillRect(rect.x + inset, rect.y + inset, rect.w - inset * 2, rect.h - inset * 2);
    context.restore();

    if (isFinalWin) {
      drawCrown(context, rect);
      return;
    }

    context.fillStyle = isDead ? COLOR.DEAD_HINT_NUMBER : COLOR.HINT_NUMBER;
    context.font = `bold ${Math.round(layout.cellSize * 0.86)}px Arial, Helvetica, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(count), rect.x + rect.w / 2, rect.y + rect.h / 2);
  }

  function drawCandidateHover(context, cell, boardSize) {
    const rect = boardCellRect(cell.x, cell.y, boardSize);
    context.save();
    context.fillStyle = COLOR.HINT_HOVER;
    context.fillRect(rect.x, rect.y, rect.w, rect.h);
    context.restore();
  }

  function drawSolutionOverlay(context, game) {
    const path = game.solutionPath || [];
    if (game.result !== "surrender" || path.length < 2) {
      return;
    }

    const startedAt = game.solutionRevealStartedAt || performance.now();
    const elapsed = Math.max(0, performance.now() - startedAt);
    const visibleCount = Math.min(path.length, Math.floor(elapsed / 80) + 1);
    const boardSize = game.boardSize || DEFAULT_BOARD_SIZE;
    const centers = path.slice(0, visibleCount).map((cell) => cellCenter(cell, boardSize));
    const completed = visibleCount === path.length;

    context.save();
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = COLOR.SOLUTION_TRAIL;
    context.lineWidth = Math.max(3, layout.cellSize * 0.055);
    context.shadowColor = "#FFD700";
    context.shadowBlur = completed ? 8 : 14;
    context.beginPath();
    for (let index = 0; index < centers.length; index += 1) {
      const point = centers[index];
      if (index === 0) {
        context.moveTo(point.x, point.y);
      } else {
        context.lineTo(point.x, point.y);
      }
    }
    context.stroke();
    context.shadowBlur = 0;

    const labelSize = Math.round(layout.cellSize * 0.36);
    context.font = `bold ${labelSize}px Arial, Helvetica, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = COLOR.STEP_NUMBER;
    context.shadowColor = "rgba(0, 0, 0, 0.45)";
    context.shadowBlur = 4;
    for (let index = 0; index < visibleCount; index += 1) {
      const center = centers[index];
      context.fillText(String(index + 1), center.x, center.y);
    }
    context.shadowBlur = 0;

    if (!completed) {
      const active = centers[centers.length - 1];
      context.fillStyle = "rgba(255, 215, 96, 0.24)";
      context.beginPath();
      context.arc(active.x, active.y, layout.cellSize * 0.28, 0, Math.PI * 2);
      context.fill();
    }

    context.restore();
  }

  function isCandidateCell(game, target) {
    return game.availableMoves.some((cell) => cell.x === target.x && cell.y === target.y);
  }

  function isWinningCandidate(game, cell) {
    const total = (game.boardSize || DEFAULT_BOARD_SIZE) ** 2;
    return game.path.length + 1 === total && isCandidateCell(game, cell);
  }

  function drawCrown(context, rect) {
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    const w = rect.w * 0.46;
    const h = rect.h * 0.30;
    const x = cx - w / 2;
    const y = cy - h / 2;
    const baseH = h * 0.28;

    context.save();
    context.shadowColor = COLOR.CROWN_GOLD;
    context.shadowBlur = rect.w * 0.10;

    const gradient = context.createLinearGradient(x, y, x, y + h);
    gradient.addColorStop(0, "#FFF2A0");
    gradient.addColorStop(0.55, COLOR.CROWN_GOLD);
    gradient.addColorStop(1, COLOR.CROWN_GOLD_DARK);

    context.fillStyle = gradient;
    context.strokeStyle = COLOR.CROWN_GOLD_DARK;
    context.lineWidth = Math.max(1.5, rect.w * 0.012);

    context.beginPath();
    context.moveTo(x, y + h);
    context.lineTo(x, y + h * 0.35);
    context.lineTo(x + w * 0.25, y + h * 0.66);
    context.lineTo(x + w * 0.50, y);
    context.lineTo(x + w * 0.75, y + h * 0.66);
    context.lineTo(x + w, y + h * 0.35);
    context.lineTo(x + w, y + h);
    context.closePath();
    context.fill();
    context.stroke();

    drawRoundRect(context, x + w * 0.08, y + h - baseH, w * 0.84, baseH, baseH * 0.35);
    context.fillStyle = "#FFB300";
    context.fill();
    context.stroke();

    context.fillStyle = "#FFF7C2";
    for (const point of [0.0, 0.5, 1.0]) {
      const jewelX = x + w * point;
      const jewelY = point === 0.5 ? y : y + h * 0.35;
      context.beginPath();
      context.arc(jewelX, jewelY, Math.max(2, rect.w * 0.025), 0, Math.PI * 2);
      context.fill();
      context.stroke();
    }

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
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 420);
      const gradient = context.createLinearGradient(x, y, x, y + layout.btnH);
      gradient.addColorStop(0, "#FFE566");
      gradient.addColorStop(0.55, "#FFB300");
      gradient.addColorStop(1, "#E67E00");
      context.fillStyle = gradient;
      context.strokeStyle = "rgba(255, 240, 160, 0.85)";
      context.shadowColor = "#FFB300";
      context.shadowBlur = 8 + 22 * pulse;
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
    context.shadowBlur = 0;
    context.fillStyle = style === "muted" ? "rgba(255, 255, 255, 0.82)" : COLOR.PLACEHOLDER_TEXT;
    context.font = `${Math.round(layout.btnH * 0.38)}px Arial, Helvetica, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label, centerX, centerY);
    context.restore();
  }

  function fillTextFit(context, text, centerX, centerY, maxWidth, preferredSize) {
    let size = preferredSize;
    context.font = context.font.replace(/\d+px/, `${size}px`);
    while (context.measureText(text).width > maxWidth && size > 12) {
      size -= 1;
      context.font = context.font.replace(/\d+px/, `${size}px`);
    }
    context.fillText(text, centerX, centerY);
  }

  function drawSettingsPanel(context, pending) {
    const panelX = layout.lines.x_left;
    const panelY = layout.lines.y_header;
    const panelW = layout.lines.x_right - layout.lines.x_left;
    const panelBottom = layout.lines.y_service_mid;
    const panelH = panelBottom - panelY;
    const panelR = panelW * 0.03;
    const margin = panelW * 0.055;
    const pad = panelH * 0.04;
    const textX = panelX + margin;
    const textMaxW = panelW - margin * 2;
    const regions = {
      panel: { x: panelX, y: panelY, w: panelW, h: panelH },
      toggles: [],
    };

    context.save();
    context.fillStyle = "rgba(0, 0, 0, 0.55)";
    context.fillRect(0, 0, layout.width, layout.height);

    drawRoundRect(context, panelX, panelY, panelW, panelH, panelR);
    context.fillStyle = COLOR.MODAL_BG;
    context.fill();
    context.strokeStyle = COLOR.MODAL_BORDER;
    context.lineWidth = 3;
    context.stroke();

    const headSize = Math.round(layout.btnH * 0.52);
    const ruleSize = Math.round(layout.btnH * 0.36);
    const hintSize = Math.round(layout.btnH * 0.28);
    const labelSize = Math.round(layout.btnH * 0.31);
    const rowH = layout.btnH * 0.78;
    const hintLineH = hintSize * 1.25;
    let y = panelY + pad + headSize / 2;

    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = COLOR.MODAL_DARK;
    context.font = `bold ${headSize}px Arial, Helvetica, sans-serif`;
    context.fillText("Rules", layout.lines.x_center, y);

    y += headSize * 0.85;
    context.textAlign = "left";
    context.textBaseline = "top";
    context.fillStyle = COLOR.MODAL_BODY;
    context.font = `${ruleSize}px Arial, Helvetica, sans-serif`;
    y = drawBulletList(context, [
      "Move the knight using normal knight moves.",
      "Visit every square exactly once.",
      "Try not to trap yourself.",
    ], textX, y, textMaxW, ruleSize * 1.32);

    const controlLeft = panelX + panelW * 0.44;
    const controlRight = panelX + panelW * 0.90;
    const labelX = textX;
    const dividerX = panelX + panelW * 0.05;
    const dividerW = panelW * 0.90;
    const saveW = layout.btnW;
    const saveH = layout.btnH;
    const saveX = layout.lines.x_center - saveW / 2;
    const saveY = panelBottom - pad - saveH;
    const naturalSettingsTop = y + pad * 0.70;
    const maxSectionH = Math.max(rowH * 1.35, layout.btnH * 1.28);
    const settingsAreaH = maxSectionH * 2;
    const settingsTop = naturalSettingsTop;
    const settingsBottom = settingsTop + settingsAreaH;
    const sectionH = settingsAreaH / 2;

    for (let index = 0; index <= 2; index += 1) {
      drawSettingDivider(context, dividerX, dividerW, settingsTop + sectionH * index);
    }

    y = settingsTop + sectionH * 0.5;
    drawSettingTextBlock(context, "Board size", "Bigger board -> longer puzzle.", labelX, y, labelSize, hintSize, hintLineH);
    const spinnerRegions = drawBoardSizeRow(context, controlLeft, y - rowH / 2, rowH, pending.pendingBoardSize);
    regions.spinnerUp = spinnerRegions.spinnerUp;
    regions.spinnerDown = spinnerRegions.spinnerDown;

    y = settingsTop + sectionH * 1.5;
    drawSettingTextBlock(context, "Continuation hints", "Show how many continuations each move has.", labelX, y, labelSize, hintSize, hintLineH);
    drawToggleRow(context, regions, "pendingShowCounts", [
      [false, "Off"],
      [true, "On"],
    ], pending.pendingShowCounts, controlLeft, controlRight, y - rowH / 2, rowH);

    drawModalButton(context, "Save & Close", saveX, saveY, saveW, saveH);
    regions.saveBtn = { x: saveX, y: saveY, w: saveW, h: saveH };

    context.restore();
    return regions;
  }

  function drawBulletList(context, items, x, y, maxWidth, lineHeight) {
    const bullet = "\u2022 ";
    const bulletW = context.measureText(bullet).width;

    for (const item of items) {
      const lines = wrapText(context, item, maxWidth - bulletW);
      for (let index = 0; index < lines.length; index += 1) {
        if (index === 0) {
          context.fillText(bullet, x, y);
        }
        context.fillText(lines[index], x + bulletW, y);
        y += lineHeight;
      }
      y += lineHeight * 0.12;
    }

    return y;
  }

  function drawBoardSizeRow(context, controlLeft, y, rowH, value) {
    const spinH = rowH;
    const arrowW = spinH * 0.52;
    const fieldW = spinH * 1.75;
    const centerY = y + rowH / 2;

    drawRoundRect(context, controlLeft, y, fieldW, spinH, spinH * 0.12);
    context.fillStyle = "#FFFFFF";
    context.fill();
    context.strokeStyle = COLOR.MODAL_BORDER;
    context.lineWidth = 2;
    context.stroke();
    context.fillStyle = COLOR.MODAL_DARK;
    context.font = `bold ${Math.round(spinH * 0.50)}px Arial, Helvetica, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(value), controlLeft + fieldW / 2, centerY);

    const up = { x: controlLeft + fieldW, y, w: arrowW, h: spinH / 2 };
    const down = { x: controlLeft + fieldW, y: y + spinH / 2, w: arrowW, h: spinH / 2 };
    drawSpinnerArrow(context, up, "\u25B2");
    drawSpinnerArrow(context, down, "\u25BC");

    return {
      spinnerUp: up,
      spinnerDown: down,
    };
  }

  function drawSpinnerArrow(context, rect, arrow) {
    drawRoundRect(context, rect.x, rect.y, rect.w, rect.h, 4);
    context.fillStyle = COLOR.MODAL_ACCENT;
    context.fill();
    context.strokeStyle = COLOR.MODAL_BORDER;
    context.lineWidth = 1.5;
    context.stroke();
    context.fillStyle = COLOR.MODAL_DARK;
    context.font = `bold ${Math.round(rect.h * 0.62)}px Arial, Helvetica, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(arrow, rect.x + rect.w / 2, rect.y + rect.h / 2);
  }

  function drawToggleRow(context, regions, field, options, currentValue, controlLeft, controlRight, y, rowH) {
    const gap = Math.max(6, layout.btnH * 0.12);
    const buttonW = (controlRight - controlLeft - gap * (options.length - 1)) / options.length;
    for (let index = 0; index < options.length; index += 1) {
      const [value, text] = options[index];
      const x = controlLeft + index * (buttonW + gap);
      const selected = value === currentValue;
      drawToggleButton(context, text, x, y, buttonW, rowH, selected);
      regions.toggles.push({ x, y, w: buttonW, h: rowH, field, value });
    }
  }

  function drawSettingTextBlock(context, label, hint, x, centerY, labelSize, hintSize, hintLineH) {
    const gap = hintSize * 0.15;
    const blockH = labelSize + gap + hintLineH;
    const top = centerY - blockH / 2;
    drawSettingLabel(context, label, x, top + labelSize / 2, labelSize);
    drawSettingHint(context, hint, x, top + labelSize + gap, hintSize, hintLineH);
  }

  function drawSettingLabel(context, label, x, y, size) {
    context.fillStyle = COLOR.MODAL_BODY;
    context.font = `${size}px Arial, Helvetica, sans-serif`;
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillText(label, x, y);
  }

  function drawSettingHint(context, hint, x, y, size, lineHeight) {
    context.fillStyle = COLOR.MODAL_BORDER;
    context.font = `${size}px Arial, Helvetica, sans-serif`;
    context.textAlign = "left";
    context.textBaseline = "top";
    context.fillText(hint, x, y + lineHeight * 0.08);
  }

  function drawSettingDivider(context, x, width, y) {
    context.strokeStyle = COLOR.MODAL_ACCENT;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + width, y);
    context.stroke();
  }

  function drawToggleButton(context, label, x, y, width, height, selected) {
    drawRoundRect(context, x, y, width, height, layout.btnRadius * 0.7);
    context.fillStyle = selected ? COLOR.MODAL_DARK : "rgba(255, 255, 255, 0)";
    context.fill();
    context.strokeStyle = COLOR.MODAL_DARK;
    context.lineWidth = 1.5;
    context.stroke();
    context.fillStyle = selected ? COLOR.MODAL_SELECTED_TEXT : COLOR.MODAL_DARK;
    context.font = `${Math.round(height * 0.38)}px Arial, Helvetica, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label, x + width / 2, y + height / 2);
  }

  function drawModalButton(context, label, x, y, width, height) {
    drawRoundRect(context, x, y, width, height, layout.btnRadius);
    context.strokeStyle = COLOR.MODAL_DARK;
    context.lineWidth = 1.5;
    context.stroke();
    context.fillStyle = COLOR.MODAL_DARK;
    context.font = `${Math.round(height * 0.40)}px Arial, Helvetica, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label, x + width / 2, y + height / 2);
  }

  function drawConfirmModal(context, title, body, sureLabel) {
    const pad = layout.btnH * 0.38;
    const titleSize = Math.round(layout.btnH * 0.44);
    const bodySize = Math.round(layout.btnH * 0.32);
    const btnGap = layout.btnH * 0.22;
    const modalBtnW = layout.btnW * 1.6;
    const panelW = modalBtnW + pad * 2;
    const bodyLines = wrapTextForWidth(context, body, modalBtnW, bodySize);
    const bodyH = bodyLines.length * bodySize * 1.35;
    const panelH = pad + titleSize * 1.4 + bodyH + pad + layout.btnH + btnGap + layout.btnH + pad;
    const panelX = layout.lines.x_center - panelW / 2;
    const centerY = (layout.lines.y_top + layout.lines.y_bottom) / 2;
    const panelY = Math.round(centerY - panelH / 2);
    const panelR = Math.round(layout.btnH * 0.18);

    context.save();
    context.fillStyle = "rgba(0, 0, 0, 0.52)";
    context.fillRect(0, 0, layout.width, layout.height);

    drawRoundRect(context, panelX, panelY, panelW, panelH, panelR);
    context.fillStyle = COLOR.MODAL_BG;
    context.fill();
    context.strokeStyle = COLOR.MODAL_BORDER;
    context.lineWidth = 2.5;
    context.stroke();

    let y = panelY + pad;
    context.textAlign = "center";
    context.textBaseline = "top";
    context.font = `bold ${titleSize}px Arial, Helvetica, sans-serif`;
    context.fillStyle = COLOR.MODAL_DARK;
    context.fillText(title, layout.lines.x_center, y);
    y += titleSize * 1.4;

    context.font = `${bodySize}px Arial, Helvetica, sans-serif`;
    context.fillStyle = COLOR.MODAL_BODY;
    for (const line of bodyLines) {
      context.fillText(line, layout.lines.x_center, y);
      y += bodySize * 1.35;
    }
    y += pad;

    const confirmBtnY = y;
    const cancelBtnY = y + layout.btnH + btnGap;

    drawButton(context, sureLabel, layout.lines.x_center, confirmBtnY + layout.btnH / 2, "gold", false, modalBtnW);
    drawButton(context, "Let me think again...", layout.lines.x_center, cancelBtnY + layout.btnH / 2, "ghost", false, modalBtnW);

    context.restore();

    return {
      panel: { x: panelX, y: panelY, w: panelW, h: panelH },
      confirmBtn: { x: layout.lines.x_center - modalBtnW / 2, y: confirmBtnY, w: modalBtnW, h: layout.btnH },
      cancelBtn: { x: layout.lines.x_center - modalBtnW / 2, y: cancelBtnY, w: modalBtnW, h: layout.btnH },
    };
  }

  function wrapTextForWidth(context, text, maxWidth, fontSize) {
    context.save();
    context.font = `${fontSize}px Arial, Helvetica, sans-serif`;
    const lines = wrapText(context, text, maxWidth);
    context.restore();
    return lines;
  }

  function wrapText(context, text, maxWidth) {
    const words = text.split(" ");
    const lines = [];
    let line = "";

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      if (context.measureText(testLine).width <= maxWidth || !line) {
        line = testLine;
      } else {
        lines.push(line);
        line = word;
      }
    }

    if (line) {
      lines.push(line);
    }

    return lines;
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

  function createImage(src) {
    const image = new Image();
    image.addEventListener("load", () => {
      window.dispatchEvent(new Event("knightPathRenderAssetLoaded"));
    });
    image.src = src;
    return image;
  }

  function drawCoverImage(context, image) {
    if (image.complete && image.naturalWidth > 0) {
      drawImageCover(context, image, 0, 0, layout.width, layout.height);
      return;
    }
    drawBackground(context);
  }

  function drawImageCover(context, image, x, y, width, height) {
    const sourceRatio = image.naturalWidth / image.naturalHeight;
    const targetRatio = width / height;
    let sourceWidth = image.naturalWidth;
    let sourceHeight = image.naturalHeight;
    let sourceX = 0;
    let sourceY = 0;

    if (sourceRatio > targetRatio) {
      sourceWidth = sourceHeight * targetRatio;
      sourceX = (image.naturalWidth - sourceWidth) / 2;
    } else {
      sourceHeight = sourceWidth / targetRatio;
      sourceY = (image.naturalHeight - sourceHeight) / 2;
    }

    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
  }

  function drawImageContain(context, image, x, y, width, height) {
    const sourceRatio = image.naturalWidth / image.naturalHeight;
    const targetRatio = width / height;
    let drawWidth = width;
    let drawHeight = height;

    if (sourceRatio > targetRatio) {
      drawHeight = drawWidth / sourceRatio;
    } else {
      drawWidth = drawHeight * sourceRatio;
    }

    context.drawImage(
      image,
      x + (width - drawWidth) / 2,
      y + (height - drawHeight) / 2,
      drawWidth,
      drawHeight,
    );
  }

  function welcomeButtonRects() {
    return {
      settings: buttonRect(layout.lines.x_left + layout.btnW / 2, layout.lines.y_service_mid),
      start: buttonRect(layout.lines.x_right - layout.btnW / 2, layout.lines.y_service_mid),
    };
  }

  function finishedButtonRects() {
    const w = layout.lines.x_right - layout.lines.x_col_left;
    const centerX = layout.lines.x_col_left + w / 2;
    return {
      settings: buttonRect(centerX, layout.lines.y_service_mid - layout.btnH * 0.68, w),
      newGame: buttonRect(centerX, layout.lines.y_service_mid + layout.btnH * 0.68, w),
    };
  }

  function playingButtonRects() {
    const w = layout.lines.x_right - layout.lines.x_col_left;
    const centerX = layout.lines.x_col_left + w / 2;
    const panel = historyPanelRect();
    return {
      undo: buttonRect(centerX, (layout.lines.y_top + layout.lines.y_header) / 2, w),
      giveUp: buttonRect(centerX, (layout.lines.y_service_mid + layout.lines.y_bottom) / 2, panel.w),
    };
  }

  function boardCellRect(x, y, boardSize) {
    const size = boardSize || layout.boardSize || DEFAULT_BOARD_SIZE;
    const screenY = size - 1 - y;
    return {
      x: layout.boardX + x * layout.cellSize,
      y: layout.boardY + screenY * layout.cellSize,
      w: layout.cellSize,
      h: layout.cellSize,
    };
  }

  function boardCellAt(point, boardSize) {
    const size = boardSize || layout.boardSize || DEFAULT_BOARD_SIZE;
    if (
      point.x < layout.boardX ||
      point.x > layout.boardX + layout.boardSide ||
      point.y < layout.boardY ||
      point.y > layout.boardY + layout.boardSide
    ) {
      return null;
    }

    const x = Math.floor((point.x - layout.boardX) / layout.cellSize);
    const screenY = Math.floor((point.y - layout.boardY) / layout.cellSize);
    const y = size - 1 - screenY;

    if (x < 0 || x >= size || y < 0 || y >= size) {
      return null;
    }

    return { x, y };
  }

  function resultIllustrationRect() {
    const w = layout.lines.x_right - layout.lines.x_col_left;
    const x = layout.lines.x_col_left;
    const buttons = finishedButtonRects();
    const top = layout.lines.y_header + layout.btnH * 0.90;
    const bottom = buttons.settings.y - layout.btnH * 0.50;
    return {
      x,
      y: top,
      w,
      h: Math.max(layout.btnH, bottom - top),
    };
  }

  function buttonRect(centerX, centerY, width) {
    const buttonW = width || layout.btnW;
    return {
      x: centerX - buttonW / 2,
      y: centerY - layout.btnH / 2,
      w: buttonW,
      h: layout.btnH,
    };
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
    render,
    drawDebugGrid,
    drawSettingsPanel,
    drawConfirmModal,
    welcomeButtonRects,
    playingButtonRects,
    finishedButtonRects,
    historyPanelRect,
    boardCellRect,
    boardCellAt,
  };
})();
