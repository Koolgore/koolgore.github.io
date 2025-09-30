const TILE_DATA = [
  { "tile_number": "1-1", "top": "S", "left": "", "middle": "N", "right": "N", "bottom": "H", "connections": { "top": ["middle"], "middle": ["top", "right", "bottom"], "right": ["middle"], "bottom": ["middle"] } },
  { "tile_number": "1-2", "top": "", "left": "", "middle": "N", "right": "N", "bottom": "N", "connections": { "middle": ["right", "bottom"], "right": ["middle"], "bottom": ["middle"] } },
  { "tile_number": "1-3", "top": "", "left": "N", "middle": "N", "right": "N", "bottom": "", "connections": { "left": ["middle"], "middle": ["left", "right"], "right": ["middle"] } },
  { "tile_number": "1-4", "top": "", "left": "S", "middle": "S", "right": "S", "bottom": "", "connections": { "left": ["middle"], "middle": ["left", "right"], "right": ["middle"] } },
  { "tile_number": "1-5", "top": "", "left": "N", "middle": "N", "right": "N", "bottom": "", "connections": { "left": ["middle"], "middle": ["left", "right"], "right": ["middle"] } },
  { "tile_number": "1-6", "top": "", "left": "H", "middle": "H", "right": "", "bottom": "H", "connections": { "left": ["middle"], "middle": ["left", "bottom"], "bottom": ["middle"] } },
  { "tile_number": "2-1", "top": "N", "left": "", "middle": "N", "right": "", "bottom": "N", "connections": { "top": ["middle"], "middle": ["top", "bottom"], "bottom": ["middle"] } },
  { "tile_number": "2-2", "top": "S", "left": "S", "middle": "N", "right": "H", "bottom": "H", "connections": { "top": ["middle"], "left": ["middle"], "middle": ["top", "left", "right", "bottom"], "right": ["middle"], "bottom": ["middle"] } },
  { "tile_number": "2-3", "top": "", "left": "", "middle": "N", "right": "N", "bottom": "N", "connections": { "middle": ["right", "bottom"], "right": ["middle"], "bottom": ["middle"] } },
  { "tile_number": "2-4", "top": "", "left": "N", "middle": "N", "right": "N", "bottom": "", "connections": { "left": ["middle"], "middle": ["left", "right"], "right": ["middle"] } },
  { "tile_number": "2-5", "top": "", "left": "N", "middle": "N", "right": "", "bottom": "N", "connections": { "left": ["middle"], "middle": ["left", "bottom"], "bottom": ["middle"] } },
  { "tile_number": "2-6", "top": "N", "left": "", "middle": "N", "right": "", "bottom": "N", "connections": { "top": ["middle"], "middle": ["top", "bottom"], "bottom": ["middle"] } },
  { "tile_number": "3-1", "top": "H", "left": "", "middle": "H", "right": "", "bottom": "H", "connections": { "top": ["middle"], "middle": ["top", "bottom"], "bottom": ["middle"] } },
  { "tile_number": "3-2", "top": "N", "left": "", "middle": "N", "right": "", "bottom": "N", "connections": { "top": ["middle"], "middle": ["top", "bottom"], "bottom": ["middle"] } },
  { "tile_number": "3-3", "top": "S", "left": "S", "middle": "N", "right": "H", "bottom": "H", "connections": { "top": ["middle"], "left": ["middle"], "middle": ["top", "left", "right", "bottom"], "right": ["middle"], "bottom": ["middle"] } },
  { "tile_number": "3-4", "top": "", "left": "", "middle": "N", "right": "", "bottom": "N", "connections": { "middle": ["bottom"], "bottom": ["middle"] } },
  { "tile_number": "3-5", "top": "N", "left": "", "middle": "N", "right": "", "bottom": "N", "connections": { "top": ["middle"], "middle": ["top", "bottom"], "bottom": ["middle"] } },
  { "tile_number": "3-6", "top": "S", "left": "", "middle": "S", "right": "", "bottom": "S", "connections": { "top": ["middle"], "middle": ["top", "bottom"], "bottom": ["middle"] } },
  { "tile_number": "4-1", "top": "N", "left": "", "middle": "N", "right": "", "bottom": "N", "connections": { "top": ["middle"], "middle": ["top", "bottom"], "bottom": ["middle"] } },
  { "tile_number": "4-2", "top": "H", "left": "", "middle": "H", "right": "", "bottom": "H", "connections": { "top": ["middle"], "middle": ["top", "bottom"], "bottom": ["middle"] } },
  { "tile_number": "4-3", "top": "N", "left": "", "middle": "N", "right": "N", "bottom": "", "connections": { "top": ["middle"], "middle": ["top", "right"], "right": ["middle"] } },
  { "tile_number": "4-4", "top": "H", "left": "H", "middle": "N", "right": "S", "bottom": "S", "connections": { "top": ["middle"], "left": ["middle"], "middle": ["top", "left", "right", "bottom"], "right": ["middle"], "bottom": ["middle"] } },
  { "tile_number": "4-5", "top": "H", "left": "", "middle": "H", "right": "", "bottom": "H", "connections": { "top": ["middle"], "middle": ["top", "bottom"], "bottom": ["middle"] } },
  { "tile_number": "4-6", "top": "N", "left": "", "middle": "N", "right": "", "bottom": "N", "connections": { "top": ["middle"], "middle": ["top", "bottom"], "bottom": ["middle"] } },
  { "tile_number": "5-1", "top": "S", "left": "", "middle": "S", "right": "", "bottom": "S", "connections": { "top": ["middle"], "middle": ["top", "bottom"], "bottom": ["middle"] } },
  { "tile_number": "5-2", "top": "N", "left": "", "middle": "N", "right": "N", "bottom": "", "connections": { "top": ["middle"], "middle": ["top", "right"], "right": ["middle"] } },
  { "tile_number": "5-3", "top": "", "left": "S", "middle": "S", "right": "S", "bottom": "", "connections": { "left": ["middle"], "middle": ["left", "right"], "right": ["middle"] } },
  { "tile_number": "5-4", "top": "", "left": "N", "middle": "N", "right": "N", "bottom": "", "connections": { "left": ["middle"], "middle": ["left", "right"], "right": ["middle"] } },
  { "tile_number": "5-5", "top": "H", "left": "H", "middle": "N", "right": "S", "bottom": "S", "connections": { "top": ["middle"], "left": ["middle"], "middle": ["top", "left", "right", "bottom"], "right": ["middle"], "bottom": ["middle"] } },
  { "tile_number": "5-6", "top": "H", "left": "", "middle": "H", "right": "", "bottom": "H", "connections": { "top": ["middle"], "middle": ["top", "bottom"], "bottom": ["middle"] } },
  { "tile_number": "6-1", "top": "N", "left": "", "middle": "N", "right": "N", "bottom": "", "connections": { "top": ["middle"], "middle": ["top", "right"], "right": ["middle"] } },
  { "tile_number": "6-2", "top": "", "left": "H", "middle": "H", "right": "H", "bottom": "", "connections": { "left": ["middle"], "middle": ["left", "right"], "right": ["middle"] } },
  { "tile_number": "6-3", "top": "", "left": "N", "middle": "N", "right": "N", "bottom": "", "connections": { "left": ["middle"], "middle": ["left", "right"], "right": ["middle"] } },
  { "tile_number": "6-4", "top": "", "left": "S", "middle": "S", "right": "S", "bottom": "", "connections": { "left": ["middle"], "middle": ["left", "right"], "right": ["middle"] } },
  { "tile_number": "6-5", "top": "", "left": "N", "middle": "N", "right": "N", "bottom": "", "connections": { "left": ["middle"], "middle": ["left", "right"], "right": ["middle"] } },
  { "tile_number": "6-6", "top": "H", "left": "H", "middle": "N", "right": "S", "bottom": "S", "connections": { "top": ["middle"], "left": ["middle"], "middle": ["top", "left", "right", "bottom"], "right": ["middle"], "bottom": ["middle"] } }
];

const menuOverlay = document.getElementById("menu");
const gameContainer = document.getElementById("game");
const boardElement = document.getElementById("board");
const placementLayer = document.getElementById("placement-layer");
const announcerLog = document.getElementById("announcer-log");
const diceDisplay = document.getElementById("dice-display");
const rollBtn = document.getElementById("roll-btn");
const confirmPlacementBtn = document.getElementById("confirm-placement");
const skipShiftBtn = document.getElementById("skip-shift");
const victoryModal = document.getElementById("victory-modal");
const victoryTitle = document.getElementById("victory-title");
const victoryMessage = document.getElementById("victory-message");
const restartBtn = document.getElementById("restart-btn");

const PLAYER_COLORS = ["#f87171", "#38bdf8", "#facc15", "#a78bfa"];
const EDGE_SPACE_RATIO = 0.2875;
const SPACE_POSITIONS = {
  top: { x: 0.5, y: EDGE_SPACE_RATIO },
  right: { x: 1 - EDGE_SPACE_RATIO, y: 0.5 },
  bottom: { x: 0.5, y: 1 - EDGE_SPACE_RATIO },
  left: { x: EDGE_SPACE_RATIO, y: 0.5 },
  middle: { x: 0.5, y: 0.5 }
};
const TYPE_CLASS_MAP = { S: "soft", N: "neutral", H: "hard" };
const SIDES = ["top", "right", "bottom", "left"];
const PHASES = {
  AWAITING_ROLL: "AWAITING_ROLL",
  AWAITING_MOVE: "AWAITING_MOVE",
  AWAITING_SHIFT: "AWAITING_SHIFT",
  BUMP_RELOCATE: "BUMP_RELOCATE",
  GAME_OVER: "GAME_OVER"
};

let boardState = new Map();
let players = [];
let playerTokens = new Map();
let currentPlayerIndex = 0;
let gamePhase = PHASES.AWAITING_ROLL;
let finishRow = 2;
let finishCol = 3;
let diceResult = { die1: 1, die2: 1 };
let pendingShift = null;
let bumpContext = null;
let announcerQueue = Promise.resolve();
let cpuEnabled = false;
let awaitingConfirm = false;

const menuButtons = document.querySelectorAll(".menu-buttons button");
menuButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.dataset.mode === "cpu") {
      startGame(2, true);
    } else {
      startGame(Number(btn.dataset.players || 1), false);
    }
  });
});

rollBtn.addEventListener("click", onRollDice);
confirmPlacementBtn.addEventListener("click", confirmShiftPlacement);
skipShiftBtn.addEventListener("click", () => {
  if (isCurrentPlayerCPU()) return;
  endShiftPhase(false);
});
restartBtn.addEventListener("click", () => {
  victoryModal.classList.add("hidden");
  menuOverlay.classList.remove("hidden");
  gameContainer.classList.add("hidden");
});

displayDice(1, 1);

function clearPlacementLayer() {
  placementLayer.innerHTML = "";
  placementLayer.style.pointerEvents = "none";
}

function startGame(playerCount, withCpu) {
  cpuEnabled = withCpu;
  boardState = new Map();
  players = [];
  playerTokens = new Map();
  currentPlayerIndex = 0;
  gamePhase = PHASES.AWAITING_ROLL;
  finishRow = 2;
  finishCol = 3;
  diceResult = { die1: 1, die2: 1 };
  pendingShift = null;
  bumpContext = null;
  awaitingConfirm = false;
  clearPlacementLayer();
  clearAnnouncer();
  buildInitialBoard();
  createPlayers(playerCount, withCpu);
  renderBoard();
  renderTokens();
  highlightCurrentPlayer();
  updateControls();
  menuOverlay.classList.add("hidden");
  gameContainer.classList.remove("hidden");
  narrate(`Welcome to Hey Culligan Man! ${players.length} player game ready.`);
  if (isCurrentPlayerCPU()) {
    processCpuTurn();
  }
}

function buildInitialBoard() {
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const tileNumber = `${r + 1}-${c + 1}`;
      const baseTile = TILE_DATA.find((t) => t.tile_number === tileNumber);
      if (!baseTile) continue;
      const tileState = createBoardTile(baseTile, 0, r, c);
      boardState.set(`${r},${c}`, tileState);
    }
  }
}

function createPlayers(playerCount, withCpu) {
  for (let i = 0; i < playerCount; i++) {
    const isCpu = withCpu && i === 1;
    const player = {
      id: i + 1,
      name: isCpu ? "Culligan CPU" : `Player ${i + 1}`,
      color: PLAYER_COLORS[i % PLAYER_COLORS.length],
      pos: null,
      isCPU: isCpu,
      missNextTurn: false
    };
    players.push(player);
    const token = document.createElement("div");
    token.className = "token";
    token.style.background = player.color;
    token.textContent = `${player.id}`;
    token.dataset.player = player.id;
    boardElement.appendChild(token);
    playerTokens.set(player.id, token);
  }
}

function createBoardTile(baseTile, orientation, row, col) {
  return {
    base: structuredClone(baseTile),
    orientation,
    row,
    col
  };
}

function getTileState(boardTile) {
  const { base, orientation } = boardTile;
  const rotated = {
    tile_number: base.tile_number,
    row: boardTile.row,
    col: boardTile.col,
    orientation,
    top: base.top,
    right: base.right,
    bottom: base.bottom,
    left: base.left,
    middle: base.middle,
    connections: {}
  };
  for (let i = 0; i < SIDES.length; i++) {
    const side = SIDES[i];
    const baseSide = SIDES[(i - orientation + 4) % 4];
    rotated[side] = base[baseSide];
  }
  rotated.middle = base.middle;
  const points = ["top", "right", "bottom", "left", "middle"];
  points.forEach((point) => {
    if (!base.connections[point]) return;
    const newPoint = rotatePoint(point, orientation);
    rotated.connections[newPoint] = base.connections[point].map((p) => rotatePoint(p, orientation));
  });
  return rotated;
}

function rotatePoint(point, orientation) {
  if (point === "middle") return "middle";
  const idx = SIDES.indexOf(point);
  if (idx === -1) return point;
  return SIDES[(idx + orientation) % 4];
}

function renderBoard(extraCells = []) {
  boardElement.innerHTML = "";
  const { minRow, maxRow, minCol, maxCol } = getBoardBounds(extraCells);
  const rows = maxRow - minRow + 1;
  const cols = maxCol - minCol + 1;
  const boardGrid = document.createElement("div");
  boardGrid.className = "board-grid";
  boardGrid.style.gridTemplateRows = `repeat(${rows}, var(--tile-size))`;
  boardGrid.style.gridTemplateColumns = `repeat(${cols}, var(--tile-size))`;
  const tileElements = new Map();

  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      const key = `${r},${c}`;
      const boardTile = boardState.get(key);
      if (boardTile) {
        const tileElement = buildTileElement(boardTile);
        boardGrid.appendChild(tileElement);
        tileElements.set(key, tileElement);
      } else {
        const empty = document.createElement("div");
        empty.className = "empty-cell";
        boardGrid.appendChild(empty);
      }
    }
  }
  boardElement.appendChild(boardGrid);
  boardGrid.dataset.minRow = minRow;
  boardGrid.dataset.minCol = minCol;
  boardElement.dataset.minRow = minRow;
  boardElement.dataset.minCol = minCol;
  boardElement.dataset.rows = rows;
  boardElement.dataset.cols = cols;
  boardElement._grid = boardGrid;
  renderTokens(tileElements);
}

function buildTileElement(boardTile) {
  const tileState = getTileState(boardTile);
  const tile = document.createElement("div");
  tile.className = "board-tile";
  tile.dataset.row = boardTile.row;
  tile.dataset.col = boardTile.col;
  tile.dataset.tile = boardTile.base.tile_number;
  tile.dataset.orientation = boardTile.orientation;
  const segments = document.createElement("div");
  segments.className = "segments";
  const spaces = [...SIDES, "middle"];
  spaces.forEach((space) => {
    const slot = document.createElement("div");
    slot.className = `slot slot-${space}`;
    slot.dataset.space = space;
    const type = tileState[space];
    if (type) {
      const typeClass = TYPE_CLASS_MAP[type];
      if (typeClass) {
        slot.classList.add(typeClass);
      }
      slot.dataset.type = type;
      slot.setAttribute("aria-label", `${space} ${type}`);
    } else {
      slot.classList.add("empty");
    }
    if (tileState.tile_number === "3-4" && space === "middle") {
      slot.classList.add("finish");
      slot.textContent = "Finish";
    }
    segments.appendChild(slot);
  });

  const connectedToMiddle = (side) => {
    return (
      (tileState.connections.middle && tileState.connections.middle.includes(side)) ||
      (tileState.connections[side] && tileState.connections[side].includes("middle"))
    );
  };

  SIDES.forEach((side) => {
    if (!connectedToMiddle(side)) return;
    const pipe = document.createElement("div");
    pipe.className = `pipe pipe-${side}`;
    const type = tileState[side] || tileState.middle;
    const typeClass = TYPE_CLASS_MAP[type];
    if (typeClass) {
      pipe.classList.add(typeClass);
    }
    segments.appendChild(pipe);
  });

  tile.appendChild(segments);
  const label = document.createElement("div");
  label.className = "tile-number";
  label.textContent = tileState.tile_number;
  tile.appendChild(label);

  tile.addEventListener("click", () => {
    onTileClicked(boardTile.row, boardTile.col);
  });
  return tile;
}

function renderTokens(tileElements = new Map()) {
  players.forEach((player, idx) => {
    const token = playerTokens.get(player.id);
    if (!token) return;
    if (!player.pos) {
      token.style.display = "none";
      return;
    }
    token.style.display = "flex";
    const key = `${player.pos.row},${player.pos.col}`;
    const tileElement = tileElements.get(key) || findTileElement(key);
    if (tileElement) {
      tileElement.appendChild(token);
      const space = SPACE_POSITIONS[player.pos.space];
      token.style.left = `${space.x * 100}%`;
      token.style.top = `${space.y * 100}%`;
    }
    token.classList.toggle("active", idx === currentPlayerIndex);
  });
}

function findTileElement(key) {
  const grid = boardElement._grid;
  if (!grid) return null;
  const [row, col] = key.split(",");
  return grid.querySelector(`.board-tile[data-row="${row}"][data-col="${col}"]`);
}

function getBoardBounds(extraCells = []) {
  let minRow = Infinity;
  let maxRow = -Infinity;
  let minCol = Infinity;
  let maxCol = -Infinity;
  boardState.forEach((tile) => {
    minRow = Math.min(minRow, tile.row);
    maxRow = Math.max(maxRow, tile.row);
    minCol = Math.min(minCol, tile.col);
    maxCol = Math.max(maxCol, tile.col);
  });
  extraCells.forEach((cell) => {
    minRow = Math.min(minRow, cell.row);
    maxRow = Math.max(maxRow, cell.row);
    minCol = Math.min(minCol, cell.col);
    maxCol = Math.max(maxCol, cell.col);
  });
  if (!isFinite(minRow)) {
    minRow = 0;
    maxRow = 0;
    minCol = 0;
    maxCol = 0;
  }
  return { minRow, maxRow, minCol, maxCol };
}

function onRollDice() {
  if (gamePhase !== PHASES.AWAITING_ROLL) return;
  const die1 = 1 + Math.floor(Math.random() * 6);
  const die2 = 1 + Math.floor(Math.random() * 6);
  diceResult = { die1, die2 };
  displayDice(die1, die2);
  narrate(`${currentPlayer().name} rolled ${die1} + ${die2} = ${die1 + die2}.`);
  gamePhase = PHASES.AWAITING_MOVE;
  updateControls();
  handleMovementPhase();
}

function displayDice(d1, d2) {
  const diceFaces = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  const [span1, span2, sum] = diceDisplay.querySelectorAll("span");
  span1.textContent = diceFaces[d1];
  span2.textContent = diceFaces[d2];
  sum.textContent = `= ${d1 + d2}`;
}

function handleMovementPhase() {
  const player = currentPlayer();
  const total = diceResult.die1 + diceResult.die2;
  const startPos = player.pos;
  const paths = findAllPaths(player, total);
  if (paths.length === 0) {
    narrate(`${player.name} cannot move ${total} spaces.`);
    endMovementPhase(null);
    return;
  }
  if (player.isCPU) {
    chooseCpuMovement(paths);
  } else {
    enablePathSelection(paths);
  }
}

function findAllPaths(player, total) {
  const targetSteps = player.pos ? total : Math.max(total - 1, 0);
  if (targetSteps <= 0) {
    return [];
  }
  const startNodes = player.pos
    ? [player.pos]
    : [{ row: 0, col: 0, space: "middle" }];
  const paths = [];
  startNodes.forEach((start) => {
    depthSearch(start, targetSteps, [start], new Set([posKey(start)]), paths);
  });
  return paths;
}

function depthSearch(node, stepsRemaining, path, visited, outPaths) {
  if (stepsRemaining === 0) {
    outPaths.push([...path]);
    return;
  }
  const neighbors = getNeighbors(node);
  neighbors.forEach((neighbor) => {
    const key = posKey(neighbor);
    if (visited.has(key)) return;
    const newVisited = new Set(visited);
    newVisited.add(key);
    path.push(neighbor);
    depthSearch(neighbor, stepsRemaining - 1, path, newVisited, outPaths);
    path.pop();
  });
}

function getNeighbors(position) {
  const tileKey = `${position.row},${position.col}`;
  const boardTile = boardState.get(tileKey);
  if (!boardTile) return [];
  const tileState = getTileState(boardTile);
  const connectionTargets = tileState.connections[position.space] || [];
  const results = [];
  connectionTargets.forEach((target) => {
    if (target === "middle") {
      results.push({ row: position.row, col: position.col, space: target });
    } else if (SIDES.includes(target)) {
      const neighbor = getNeighborTile(position.row, position.col, target);
      if (!neighbor) return;
      const neighborState = getTileState(neighbor);
      const opposite = SIDES[(SIDES.indexOf(target) + 2) % 4];
      if (!neighborState[opposite]) return;
      const neighborConnections = neighborState.connections[opposite] || [];
      if (!neighborConnections.includes("middle")) {
        results.push({ row: neighbor.row, col: neighbor.col, space: opposite });
      } else {
        results.push({ row: neighbor.row, col: neighbor.col, space: "middle" });
      }
    }
  });
  return results;
}

function getNeighborTile(row, col, side) {
  const offsets = { top: [-1, 0], right: [0, 1], bottom: [1, 0], left: [0, -1] };
  const delta = offsets[side];
  const key = `${row + delta[0]},${col + delta[1]}`;
  return boardState.get(key);
}

function posKey(pos) {
  return `${pos.row},${pos.col},${pos.space}`;
}

function enablePathSelection(paths) {
  if (!boardElement._grid || !paths.length) return;
  const overlays = document.createElement("div");
  overlays.className = "overlay-grid";
  overlays.style.gridTemplateRows = boardElement._grid.style.gridTemplateRows;
  overlays.style.gridTemplateColumns = boardElement._grid.style.gridTemplateColumns;
  clearPlacementLayer();
  placementLayer.appendChild(overlays);
  placementLayer.style.pointerEvents = "auto";
  const endPositions = new Map();
  paths.forEach((path) => {
    const end = path[path.length - 1];
    const key = `${end.row},${end.col},${end.space}`;
    if (!endPositions.has(key)) {
      endPositions.set(key, []);
    }
    endPositions.get(key).push(path);
  });
  const minRow = Number(boardElement.dataset.minRow || 0);
  const minCol = Number(boardElement.dataset.minCol || 0);
  endPositions.forEach((pathOptions, key) => {
    const [rowStr, colStr, space] = key.split(",");
    const row = Number(rowStr);
    const col = Number(colStr);
    const boardTile = boardState.get(`${row},${col}`);
    const tileState = boardTile ? getTileState(boardTile) : null;
    const typeClass = tileState ? TYPE_CLASS_MAP[tileState[space]] : null;
    const target = document.createElement("button");
    target.type = "button";
    target.className = `bump-target target-${space}`;
    target.style.gridRowStart = row - minRow + 1;
    target.style.gridColumnStart = col - minCol + 1;
    target.dataset.space = space;
    target.setAttribute("aria-label", `Move to ${space}`);
    if (typeClass) {
      target.classList.add(typeClass);
    }
    target.addEventListener("click", () => {
      clearPlacementLayer();
      executeMovement(pathOptions[0]);
    });
    overlays.appendChild(target);
  });
}

function executeMovement(path) {
  const player = currentPlayer();
  const start = player.pos;
  const end = path[path.length - 1];
  player.pos = { ...end };
  renderBoard();
  renderTokens();
  narrate(`${player.name} moved to (${end.row}, ${end.col}) ${end.space}.`);
  clearPlacementLayer();
  handleLandingEffects(player, end);
}

function handleLandingEffects(player, endPosition) {
  const tileState = getTileState(boardState.get(`${endPosition.row},${endPosition.col}`));
  const spaceType = tileState[endPosition.space];
  const occupant = getPlayerAt(endPosition, player.id);
  const finishReached = endPosition.row === finishRow && endPosition.col === finishCol && endPosition.space === "middle";
  if (finishReached) {
    endGame(player);
    return;
  }
  if (occupant) {
    triggerBump(player, occupant, endPosition);
    return;
  }
  if (spaceType === "S") {
    narrate(`${player.name} landed on Soft water and gains another turn!`);
    endMovementPhase(true);
  } else if (spaceType === "H") {
    player.missNextTurn = true;
    narrate(`${player.name} landed on Hard water and will miss their next turn.`);
    endMovementPhase(false);
  } else {
    endMovementPhase(false);
  }
}

function getPlayerAt(position, excludeId) {
  return players.find((p) => p.id !== excludeId && p.pos && p.pos.row === position.row && p.pos.col === position.col && p.pos.space === position.space);
}

function triggerBump(active, victim, position) {
  narrate(`${active.name} bumped ${victim.name}! Choose a neutral space for relocation.`);
  gamePhase = PHASES.BUMP_RELOCATE;
  bumpContext = { activeId: active.id, victimId: victim.id };
  if (victim.isCPU) {
    chooseCpuBump(active, victim);
  } else if (active.isCPU) {
    chooseCpuBump(active, victim);
  } else {
    highlightNeutralSpaces((target) => {
      relocatePlayer(victim, target);
      allowOptionalRotation(victim);
    });
  }
}

function highlightNeutralSpaces(callback) {
  if (!boardElement._grid) return;
  const overlay = document.createElement("div");
  overlay.className = "overlay-grid";
  overlay.style.gridTemplateRows = boardElement._grid.style.gridTemplateRows;
  overlay.style.gridTemplateColumns = boardElement._grid.style.gridTemplateColumns;
  clearPlacementLayer();
  placementLayer.appendChild(overlay);
  placementLayer.style.pointerEvents = "auto";
  const minRow = Number(boardElement.dataset.minRow || 0);
  const minCol = Number(boardElement.dataset.minCol || 0);
  boardState.forEach((boardTile) => {
    const tileState = getTileState(boardTile);
    const neutralSpaces = SIDES.concat("middle").filter((space) => tileState[space] === "N");
    neutralSpaces.forEach((space) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `bump-target target-${space} neutral`;
      button.style.gridRowStart = boardTile.row - minRow + 1;
      button.style.gridColumnStart = boardTile.col - minCol + 1;
      button.dataset.space = space;
      button.setAttribute("aria-label", `Relocate to ${space}`);
      button.addEventListener("click", () => {
        clearPlacementLayer();
        callback({ row: boardTile.row, col: boardTile.col, space });
      });
      overlay.appendChild(button);
    });
  });
}

function relocatePlayer(player, position) {
  player.pos = { ...position };
  renderBoard();
  renderTokens();
  narrate(`${player.name} relocated to (${position.row}, ${position.col}) ${position.space}.`);
}

function allowOptionalRotation(targetPlayer) {
  const tileKey = `${targetPlayer.pos.row},${targetPlayer.pos.col}`;
  const boardTile = boardState.get(tileKey);
  if (!boardTile) {
    endMovementPhase(false);
    return;
  }
  narrate(`You may rotate tile ${boardTile.base.tile_number} that ${targetPlayer.name} landed on.`);
  const tileElement = findTileElement(tileKey);
  const rotationHandler = () => {
    rotateBoardTile(boardTile, 1);
    updateTokenAfterRotation(targetPlayer, 1);
    renderBoard();
    renderTokens();
  };
  tileElement?.addEventListener("click", rotationHandler, { once: true });
  endMovementPhase(false);
}

function updateTokenAfterRotation(player, steps) {
  if (!player.pos) return;
  const order = ["top", "right", "bottom", "left"];
  let index = order.indexOf(player.pos.space);
  if (index === -1) return;
  index = (index + steps) % 4;
  player.pos.space = order[index];
}

function endMovementPhase(repeatTurn) {
  clearPlacementLayer();
  gamePhase = PHASES.AWAITING_SHIFT;
  awaitingConfirm = false;
  pendingShift = null;
  if (repeatTurn) {
    narrate(`${currentPlayer().name} rolls again!`);
  }
  updateControls();
  if (currentPlayer().isCPU) {
    processCpuShift();
  }
}

function endShiftPhase(skipped) {
  narrate(skipped ? `${currentPlayer().name} skipped the shift.` : `${currentPlayer().name} completed the shift.`);
  advanceTurn();
}

function advanceTurn() {
  clearPlacementLayer();
  awaitingConfirm = false;
  pendingShift = null;
  bumpContext = null;
  let nextIndex = currentPlayerIndex;
  do {
    nextIndex = (nextIndex + 1) % players.length;
    if (!players[nextIndex].missNextTurn) break;
    players[nextIndex].missNextTurn = false;
    narrate(`${players[nextIndex].name} misses this turn.`);
  } while (nextIndex !== currentPlayerIndex);
  currentPlayerIndex = nextIndex;
  gamePhase = PHASES.AWAITING_ROLL;
  highlightCurrentPlayer();
  updateControls();
  if (isCurrentPlayerCPU()) {
    processCpuTurn();
  }
}

function currentPlayer() {
  return players[currentPlayerIndex];
}

function isCurrentPlayerCPU() {
  return currentPlayer().isCPU;
}

function highlightCurrentPlayer() {
  players.forEach((player, idx) => {
    const token = playerTokens.get(player.id);
    if (token) {
      token.classList.toggle("active", idx === currentPlayerIndex);
    }
  });
}

function updateControls() {
  rollBtn.disabled = gamePhase !== PHASES.AWAITING_ROLL || isCurrentPlayerCPU();
  confirmPlacementBtn.classList.toggle("hidden", !awaitingConfirm);
  skipShiftBtn.classList.toggle("hidden", isCurrentPlayerCPU() || gamePhase !== PHASES.AWAITING_SHIFT);
}

function clearAnnouncer() {
  announcerLog.innerHTML = "";
}

function narrate(message, delay = 0) {
  announcerQueue = announcerQueue.then(
    () =>
      new Promise((resolve) => {
        setTimeout(() => {
          const p = document.createElement("p");
          p.textContent = message;
          announcerLog.appendChild(p);
          announcerLog.scrollTop = announcerLog.scrollHeight;
          resolve();
        }, delay);
      })
  );
  return announcerQueue;
}

function onTileClicked(row, col) {
  if (gamePhase === PHASES.AWAITING_SHIFT && currentPlayer().pos) {
    if (!pendingShift) {
      const tile = boardState.get(`${row},${col}`);
      if (!tile) return;
      pickupTile(tile);
    } else if (pendingShift && pendingShift.tile) {
      placeTileAt(row, col);
    }
  }
}

function pickupTile(tile) {
  const key = `${tile.row},${tile.col}`;
  if (!boardState.has(key)) return;
  pendingShift = {
    tile,
    originRow: tile.row,
    originCol: tile.col,
    removedPlayers: getPlayersOnTile(tile.row, tile.col)
  };
  boardState.delete(key);
  pendingShift.removedPlayers.forEach((player) => {
    player.pos = null;
  });
  narrate(`${currentPlayer().name} picked up tile ${tile.base.tile_number}.`);
  renderBoard();
  renderTokens();
  showPlacementOptions();
}

function getPlayersOnTile(row, col) {
  return players.filter((p) => p.pos && p.pos.row === row && p.pos.col === col);
}

function showPlacementOptions() {
  if (!pendingShift) return;
  const options = computePlacementOptions(pendingShift.tile);
  clearPlacementLayer();
  const { minRow, maxRow, minCol, maxCol } = getBoardBounds(options);
  renderBoard(options);
  const rows = maxRow - minRow + 1;
  const cols = maxCol - minCol + 1;
  const overlay = document.createElement("div");
  overlay.className = "board-grid";
  overlay.style.gridTemplateRows = `repeat(${rows}, var(--tile-size))`;
  overlay.style.gridTemplateColumns = `repeat(${cols}, var(--tile-size))`;
  options.forEach((cell) => {
    const cellDiv = document.createElement("div");
    cellDiv.className = "placement-cell";
    if (!cell.valid) cellDiv.classList.add("invalid");
    if (cell.highlight) cellDiv.classList.add("highlight");
    cellDiv.addEventListener("click", () => {
      if (!cell.valid) return;
      pendingShift.target = cell;
      placeTileAt(cell.row, cell.col);
    });
    overlay.appendChild(cellDiv);
  });
  placementLayer.appendChild(overlay);
  placementLayer.style.pointerEvents = "auto";
}

function computePlacementOptions(tile) {
  const options = [];
  const visited = new Set();
  boardState.forEach((other) => {
    const neighbors = [
      { row: other.row - 1, col: other.col },
      { row: other.row + 1, col: other.col },
      { row: other.row, col: other.col - 1 },
      { row: other.row, col: other.col + 1 }
    ];
    neighbors.forEach((n) => {
      const key = `${n.row},${n.col}`;
      if (boardState.has(key) || visited.has(key)) return;
      visited.add(key);
      const rotations = getValidRotations(tile, n.row, n.col);
      options.push({ row: n.row, col: n.col, valid: rotations.length > 0, rotations });
    });
  });
  return options;
}

function getValidRotations(tile, row, col) {
  const valid = [];
  for (let orientation = 0; orientation < 4; orientation++) {
    const rotated = getTileState({ base: tile.base, orientation, row, col });
    if (checkConnectivity(rotated)) {
      valid.push(orientation);
    }
  }
  return valid;
}

function checkConnectivity(tileState) {
  const neighbors = [
    { row: tileState.row - 1, col: tileState.col, side: "top" },
    { row: tileState.row + 1, col: tileState.col, side: "bottom" },
    { row: tileState.row, col: tileState.col - 1, side: "left" },
    { row: tileState.row, col: tileState.col + 1, side: "right" }
  ];
  return neighbors.some((neighbor) => {
    const boardTile = boardState.get(`${neighbor.row},${neighbor.col}`);
    if (!boardTile) return false;
    const neighborState = getTileState(boardTile);
    const opposite = SIDES[(SIDES.indexOf(neighbor.side) + 2) % 4];
    return tileState[neighbor.side] && neighborState[opposite];
  });
}

function placeTileAt(row, col) {
  if (!pendingShift) return;
  const rotationOptions = getValidRotations(pendingShift.tile, row, col);
  if (rotationOptions.length === 0) {
    narrate("No valid orientation for that placement.");
    return;
  }
  pendingShift.tile.row = row;
  pendingShift.tile.col = col;
  pendingShift.tile.orientation = rotationOptions[0];
  boardState.set(`${row},${col}`, pendingShift.tile);
  if (pendingShift.tile.base.tile_number === "3-4") {
    finishRow = row;
    finishCol = col;
  }
  narrate(`${currentPlayer().name} placed tile ${pendingShift.tile.base.tile_number} at (${row}, ${col}).`);
  awaitingConfirm = true;
  updateControls();
  clearPlacementLayer();
  renderBoard();
  renderTokens();
  confirmPlacementBtn.onclick = () => finalizePlacement(rotationOptions);
}

function finalizePlacement(rotations) {
  confirmPlacementBtn.onclick = null;
  awaitingConfirm = false;
  updateControls();
  if (pendingShift && pendingShift.removedPlayers) {
    pendingShift.removedPlayers.forEach((player) => {
      highlightNeutralSpaces((pos) => {
        player.pos = pos;
        renderBoard();
        renderTokens();
        endShiftPhase(false);
      });
    });
  } else {
    endShiftPhase(false);
  }
}

function confirmShiftPlacement() {
  if (!pendingShift) return;
  finalizePlacement([pendingShift.tile.orientation]);
}

function rotateBoardTile(tile, steps) {
  tile.orientation = (tile.orientation + steps) % 4;
}

function endGame(player) {
  gamePhase = PHASES.GAME_OVER;
  narrate(`${player.name} reached the Finish!`);
  victoryTitle.textContent = `${player.name} Wins!`;
  victoryMessage.textContent = `Congratulations to ${player.name} for navigating the Culligan network first.`;
  victoryModal.classList.remove("hidden");
}

function processCpuTurn() {
  if (gamePhase !== PHASES.AWAITING_ROLL) return;
  rollBtn.disabled = true;
  setTimeout(() => {
    onRollDice();
  }, 1000);
}

function chooseCpuMovement(paths) {
  paths.sort((a, b) => scoreMovementPath(b) - scoreMovementPath(a));
  const best = paths[0];
  narrate(`CPU evaluating ${paths.length} paths...`, 500).then(() => {
    executeMovement(best);
  });
}

function scoreMovementPath(path) {
  const end = path[path.length - 1];
  const distance = manhattanDistance(end, { row: finishRow, col: finishCol });
  return -distance;
}

function chooseCpuBump(active, victim) {
  const neutrals = [];
  boardState.forEach((tile) => {
    const state = getTileState(tile);
    SIDES.concat("middle").forEach((space) => {
      if (state[space] === "N") {
        neutrals.push({ row: tile.row, col: tile.col, space });
      }
    });
  });
  const target = neutrals[0];
  relocatePlayer(victim, target);
  endMovementPhase(false);
}

function processCpuShift() {
  setTimeout(() => {
    endShiftPhase(true);
  }, 800);
}

function manhattanDistance(a, b) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

function chooseCpuShift() {}

function enableShiftSkip() {}

function onCpuSkip() {}

function allowRotationForPlacement(rotations) {}

