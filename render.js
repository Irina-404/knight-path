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
  };

  const DEFAULT_BOARD_SIZE = 5;
  const welcomeImage = createImage("knight-path-cover.webp");
  const knightImage = createImage("knight.webp");

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
    } else {
      drawPlaying(context, game);
    }

    if (game.modal === "settings") {
      return drawSettingsPanel(context, game);
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
    drawBoard(context, game.boardSize || DEFAULT_BOARD_SIZE);
    if (game.knightPos) {
      drawKnight(context, game.knightPos, game.boardSize || DEFAULT_BOARD_SIZE);
    }
    drawServiceColumn(context, game);
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

  function drawKnight(context, cell, boardSize) {
    const center = cellCenter(cell, boardSize);
    const breath = Math.sin(performance.now() / 900);
    const size = layout.cellSize * (0.76 + breath * 0.012);
    const lift = layout.cellSize * breath * 0.012;
    const drawX = center.x - size / 2;
    const drawY = center.y - size / 2 - lift;

    context.save();
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

    context.save();
    drawButton(context, "Undo", centerX, headerY, "ghost", false, w);
    drawMoveHistory(context, panel, game);
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

  function drawMoveHistory(context, panel, game) {
    const pad = Math.round(layout.btnH * 0.28);
    const rowH = Math.max(22, Math.round(layout.btnH * 0.52));
    const scrollW = Math.max(24, Math.round(panel.w * 0.12));

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
    for (let index = 0; index < path.length; index += 1) {
      const rowY = panel.y + rowH * 0.85 + index * rowH;
      if (rowY > panel.y + panel.h - rowH * 0.5) break;
      context.fillText(`${index + 1}) ${cellName(path[index])}`, panel.x + pad * 0.65, rowY);
    }

    context.fillStyle = "rgba(255, 255, 255, 0.32)";
    context.fillRect(panel.x + panel.w - scrollW - 3, panel.y + 3, scrollW, panel.h - 6);
    context.fillStyle = "rgba(255, 255, 255, 0.54)";
    context.fillRect(panel.x + panel.w - scrollW - 3, panel.y + 3, scrollW, Math.max(rowH * 1.6, panel.h * 0.22));
    context.restore();
  }

  function cellName(cell) {
    return `${"abcdefgh"[cell.x]}${cell.y + 1}`;
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

  function welcomeButtonRects() {
    return {
      settings: buttonRect(layout.lines.x_left + layout.btnW / 2, layout.lines.y_service_mid),
      start: buttonRect(layout.lines.x_right - layout.btnW / 2, layout.lines.y_service_mid),
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
    welcomeButtonRects,
  };
})();
