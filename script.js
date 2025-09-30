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

const SIDES = ["top", "right", "bottom", "left"];
const SPACE_POSITIONS = {
  top: { x: 0.5, y: 0.15 },
  right: { x: 0.85, y: 0.5 },
  bottom: { x: 0.5, y: 0.85 },
  left: { x: 0.15, y: 0.5 },
  middle: { x: 0.5, y: 0.5 }
};
const PHASES = {
  AWAITING_ROLL: "AWAITING_ROLL",
  AWAITING_MOVE: "AWAITING_MOVE",
  AWAITING_SHIFT: "AWAITING_SHIFT",
  BUMP_RELOCATE: "BUMP_RELOCATE",
  GAME_OVER: "GAME_OVER"
};

const PLAYER_COLORS = ["#ef4444", "#3b82f6", "#10b981", "#f97316"];

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

const state = {
  boardState: new Map(),
  players: [],
  playerTokens: new Map(),
  currentPlayerIndex: 0,
  gamePhase: PHASES.AWAITING_ROLL,
  finishRow: 2,
  finishCol: 3,
  dice: { die1: 1, die2: 1 },
  pendingShift: null,
  bumpContext: null,
  awaitingConfirm: false,
  cpuEnabled: false,
  announcerQueue: Promise.resolve(),
  lastBounds: { minRow: 0, maxRow: 5, minCol: 0, maxCol: 5 },
  extraTurnQueued: false
};

const menuButtons = document.querySelectorAll(".menu-buttons button");
menuButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.dataset.mode === "cpu") {
      startGame(2, true);
    } else {
      startGame(Number(btn.dataset.players || "1"), false);
    }
  });
});

rollBtn.addEventListener("click", onRollDice);
confirmPlacementBtn.addEventListener("click", () => confirmShiftPlacement());
skipShiftBtn.addEventListener("click", () => {
  if (currentPlayer().isCPU) return;
  narrate(`${currentPlayer().name} skips the shift.`);
  clearShiftHighlights();
  endShiftPhase(true);
});
restartBtn.addEventListener("click", () => {
  victoryModal.classList.add("hidden");
  menuOverlay.classList.remove("hidden");
  gameContainer.classList.add("hidden");
});

displayDice(1, 1);

function startGame(playerCount, withCpu) {
  state.boardState = new Map();
  state.players = [];
  state.playerTokens = new Map();
  state.currentPlayerIndex = 0;
  state.gamePhase = PHASES.AWAITING_ROLL;
  state.finishRow = 2;
  state.finishCol = 3;
  state.dice = { die1: 1, die2: 1 };
  state.pendingShift = null;
  state.bumpContext = null;
  state.awaitingConfirm = false;
  state.cpuEnabled = withCpu;
  state.extraTurnQueued = false;
  announcerLog.innerHTML = "";
  placementLayer.innerHTML = "";
  boardElement.innerHTML = "";
  buildInitialBoard();
  createPlayers(playerCount, withCpu);
  renderBoard();
  renderTokens();
  updateControls();
  highlightCurrentPlayer();
  menuOverlay.classList.add("hidden");
  gameContainer.classList.remove("hidden");
  narrate(`Welcome to Hey Culligan Man! ${playerCount} player game ready.`);
  if (currentPlayer().isCPU) {
    processCpuTurn();
  }
}

function buildInitialBoard() {
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const tileNumber = `${r + 1}-${c + 1}`;
      const base = TILE_DATA.find((t) => t.tile_number === tileNumber);
      if (!base) continue;
      const tile = createBoardTile(base, r, c, 0);
      state.boardState.set(`${r},${c}`, tile);
    }
  }
  state.lastBounds = { minRow: 0, maxRow: 5, minCol: 0, maxCol: 5 };
}

function createPlayers(count, withCpu) {
  for (let i = 0; i < count; i++) {
    const isCpu = withCpu && i === 1;
    const player = {
      id: i + 1,
      name: isCpu ? "Culligan CPU" : `Player ${i + 1}`,
      color: PLAYER_COLORS[i % PLAYER_COLORS.length],
      pos: null,
      isCPU: isCpu,
      missNextTurn: false
    };
    state.players.push(player);
    const token = document.createElement("div");
    token.className = "token";
    token.style.background = player.color;
    token.textContent = `${player.id}`;
    token.dataset.player = player.id;
    boardElement.appendChild(token);
    state.playerTokens.set(player.id, token);
  }
}

function createBoardTile(baseTile, row, col, orientation) {
  return {
    base: deepClone(baseTile),
    row,
    col,
    orientation
  };
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function getTileState(boardTile) {
  const { base, orientation } = boardTile;
  const rotated = {
    tile_number: base.tile_number,
    row: boardTile.row,
    col: boardTile.col,
    orientation,
    top: "",
    right: "",
    bottom: "",
    left: "",
    middle: base.middle,
    connections: {}
  };
  SIDES.forEach((side, idx) => {
    const baseSide = SIDES[(idx - orientation + 4) % 4];
    rotated[side] = base[baseSide];
  });
  Object.entries(base.connections).forEach(([from, targets]) => {
    const rotatedFrom = rotatePoint(from, orientation);
    const rotatedTargets = targets.map((t) => rotatePoint(t, orientation));
    if (!rotated.connections[rotatedFrom]) {
      rotated.connections[rotatedFrom] = [];
    }
    rotatedTargets.forEach((target) => {
      if (!rotated.connections[rotatedFrom].includes(target)) {
        rotated.connections[rotatedFrom].push(target);
      }
    });
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
  const bounds = getBoardBounds(extraCells);
  state.lastBounds = bounds;
  const rows = bounds.maxRow - bounds.minRow + 1;
  const cols = bounds.maxCol - bounds.minCol + 1;
  const grid = document.createElement("div");
  grid.className = "board-grid";
  grid.style.display = "grid";
  grid.style.gridTemplateRows = `repeat(${rows}, 72px)`;
  grid.style.gridTemplateColumns = `repeat(${cols}, 72px)`;
  grid.style.gap = "6px";

  const tileElements = new Map();
  for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
    for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
      const key = `${r},${c}`;
      const tile = state.boardState.get(key);
      if (tile) {
        const tileElement = buildTileElement(tile);
        grid.appendChild(tileElement);
        tileElements.set(key, tileElement);
      } else {
        const empty = document.createElement("div");
        empty.className = "empty-cell";
        grid.appendChild(empty);
      }
    }
  }
  boardElement.innerHTML = "";
  boardElement.appendChild(grid);
  boardElement._grid = grid;
  boardElement.dataset.minRow = bounds.minRow;
  boardElement.dataset.minCol = bounds.minCol;
  boardElement.dataset.rows = rows;
  boardElement.dataset.cols = cols;
  renderTokens(tileElements);
}

function buildTileElement(boardTile) {
  const tileState = getTileState(boardTile);
  const tile = document.createElement("div");
  tile.className = "board-tile";
  tile.dataset.row = boardTile.row;
  tile.dataset.col = boardTile.col;
  tile.dataset.tile = tileState.tile_number;
  tile.dataset.orientation = boardTile.orientation;
  const segments = document.createElement("div");
  segments.className = "segments";
  const cells = new Array(9).fill(null).map(() => {
    const div = document.createElement("div");
    div.className = "segment";
    return div;
  });
  const applyType = (space, index) => {
    const seg = cells[index];
    const type = tileState[space];
    if (type === "S") seg.classList.add("soft");
    if (type === "N") seg.classList.add("neutral");
    if (type === "H") seg.classList.add("hard");
    if (tileState.tile_number === "3-4" && space === "middle") {
      seg.classList.add("finish");
      seg.textContent = "Finish";
    }
  };
  applyType("top", 1);
  applyType("left", 3);
  applyType("middle", 4);
  applyType("right", 5);
  applyType("bottom", 7);
  cells.forEach((cell) => segments.appendChild(cell));
  tile.appendChild(segments);
  const label = document.createElement("div");
  label.className = "tile-number";
  label.textContent = tileState.tile_number;
  tile.appendChild(label);

  if (boardTile._animateFrom) {
    const dx = (boardTile._animateFrom.col - boardTile.col) * 78;
    const dy = (boardTile._animateFrom.row - boardTile.row) * 78;
    tile.style.setProperty("--tx", `${dx}px`);
    tile.style.setProperty("--ty", `${dy}px`);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        tile.style.setProperty("--tx", "0px");
        tile.style.setProperty("--ty", "0px");
      });
    });
    delete boardTile._animateFrom;
  } else {
    tile.style.setProperty("--tx", "0px");
    tile.style.setProperty("--ty", "0px");
  }
  tile.style.setProperty("--angle", `${boardTile.orientation * 90}deg`);
  tile.addEventListener("click", () => handleTileClick(boardTile.row, boardTile.col));
  return tile;
}

function renderTokens(tileElements = new Map()) {
  state.players.forEach((player, idx) => {
    const token = state.playerTokens.get(player.id);
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
      const spacePos = SPACE_POSITIONS[player.pos.space];
      token.style.left = `${spacePos.x * 100}%`;
      token.style.top = `${spacePos.y * 100}%`;
    }
    token.classList.toggle("active", idx === state.currentPlayerIndex);
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
  state.boardState.forEach((tile) => {
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
    return { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 };
  }
  return { minRow, maxRow, minCol, maxCol };
}

function onRollDice() {
  if (state.gamePhase !== PHASES.AWAITING_ROLL) return;
  const die1 = 1 + Math.floor(Math.random() * 6);
  const die2 = 1 + Math.floor(Math.random() * 6);
  state.dice = { die1, die2 };
  displayDice(die1, die2);
  narrate(`${currentPlayer().name} rolled ${die1} + ${die2} = ${die1 + die2}.`);
  state.gamePhase = PHASES.AWAITING_MOVE;
  updateControls();
  handleMovementPhase();
}

function displayDice(d1, d2) {
  const faces = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  const spans = diceDisplay.querySelectorAll("span");
  spans[0].textContent = faces[d1];
  spans[1].textContent = faces[d2];
  spans[2].textContent = `= ${d1 + d2}`;
}

function handleMovementPhase() {
  const player = currentPlayer();
  const total = state.dice.die1 + state.dice.die2;
  const paths = findAllPaths(player, total);
  if (paths.length === 0) {
    narrate(`${player.name} cannot move ${total} spaces.`);
    endMovementPhase(false);
    return;
  }
  if (player.isCPU) {
    chooseCpuMovement(paths);
  } else {
    enablePathSelection(paths);
  }
}

function findAllPaths(player, total) {
  const start = player.pos || { row: 0, col: 0, space: "middle" };
  const steps = player.pos ? total : Math.max(total - 1, 0);
  if (steps <= 0) return [];
  const paths = [];
  const visited = new Set([posKey(start)]);
  depthFirstSearch(start, steps, [start], visited, paths, player);
  return paths;
}

function depthFirstSearch(node, stepsRemaining, path, visited, paths, player) {
  if (stepsRemaining === 0) {
    paths.push([...path]);
    return;
  }
  const neighbors = getNeighbors(node, player);
  neighbors.forEach((neighbor) => {
    const key = posKey(neighbor);
    if (visited.has(key)) return;
    visited.add(key);
    path.push(neighbor);
    depthFirstSearch(neighbor, stepsRemaining - 1, path, visited, paths, player);
    path.pop();
    visited.delete(key);
  });
}

function getNeighbors(position, player) {
  const key = `${position.row},${position.col}`;
  const boardTile = state.boardState.get(key);
  if (!boardTile) return [];
  const tileState = getTileState(boardTile);
  const connections = tileState.connections[position.space] || [];
  const results = [];
  connections.forEach((target) => {
    if (target === "middle" || SIDES.includes(target)) {
      results.push({ row: position.row, col: position.col, space: target });
    }
  });
  SIDES.forEach((side) => {
    if (!connections.includes(side)) return;
    const [dr, dc] = sideDelta(side);
    const neighborTile = state.boardState.get(`${position.row + dr},${position.col + dc}`);
    if (!neighborTile) return;
    const neighborState = getTileState(neighborTile);
    const opposite = oppositeSide(side);
    if (!neighborState[opposite]) return;
    results.push({ row: position.row + dr, col: position.col + dc, space: opposite });
  });
  return results;
}

function sideDelta(side) {
  if (side === "top") return [-1, 0];
  if (side === "bottom") return [1, 0];
  if (side === "left") return [0, -1];
  if (side === "right") return [0, 1];
  return [0, 0];
}

function posKey(pos) {
  return `${pos.row},${pos.col},${pos.space}`;
}

function enablePathSelection(paths) {
  const endpoints = new Map();
  paths.forEach((path) => {
    const end = path[path.length - 1];
    const key = posKey(end);
    if (!endpoints.has(key)) {
      endpoints.set(key, []);
    }
    endpoints.get(key).push(path);
  });
  createOverlay(endpoints, (path) => executeMovement(path));
}

function createOverlay(endpointMap, callback) {
  placementLayer.innerHTML = "";
  const bounds = state.lastBounds;
  const rows = bounds.maxRow - bounds.minRow + 1;
  const cols = bounds.maxCol - bounds.minCol + 1;
  const overlay = document.createElement("div");
  overlay.className = "bump-overlay";
  const grid = document.createElement("div");
  grid.className = "bump-grid";
  grid.style.display = "grid";
  grid.style.gridTemplateRows = `repeat(${rows}, 72px)`;
  grid.style.gridTemplateColumns = `repeat(${cols}, 72px)`;
  grid.style.gap = "6px";
  for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
    for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
      const cell = document.createElement("div");
      cell.className = "empty-cell";
      const key = `${r},${c}`;
      const tileKey = `${r},${c}`;
      if (endpointMap) {
        const match = Array.from(endpointMap.keys()).find((pos) => {
          const [er, ec] = pos.split(",");
          return Number(er) === r && Number(ec) === c;
        });
        if (match) {
          const button = document.createElement("button");
          button.className = "bump-target";
          const [, , space] = match.split(",");
          button.textContent = space;
          button.addEventListener("click", () => {
            placementLayer.innerHTML = "";
            callback(endpointMap.get(match)[0]);
          });
          cell.textContent = "";
          cell.appendChild(button);
        }
      }
      grid.appendChild(cell);
    }
  }
  overlay.appendChild(grid);
  placementLayer.appendChild(overlay);
  placementLayer.style.pointerEvents = "auto";
}

async function executeMovement(path) {
  placementLayer.innerHTML = "";
  placementLayer.style.pointerEvents = "none";
  const player = currentPlayer();
  for (let i = 1; i < path.length; i++) {
    await moveTokenTo(player, path[i]);
    await wait(150);
  }
  const destination = path[path.length - 1];
  const occupant = state.players.find((p) => p !== player && p.pos && posKey(p.pos) === posKey(destination));
  player.pos = { ...destination };
  renderTokens();
  if (destination.row === state.finishRow && destination.col === state.finishCol && destination.space === "middle") {
    endGame(player);
    return;
  }
  if (occupant) {
    narrate(`${player.name} bumped ${occupant.name}!`);
    startBumpSequence(player, occupant);
    return;
  }
  applyLandingEffect(player, destination);
}

async function moveTokenTo(player, target) {
  player.pos = { ...target };
  renderTokens();
  await wait(200);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function applyLandingEffect(player, destination) {
  const tile = state.boardState.get(`${destination.row},${destination.col}`);
  if (!tile) {
    endMovementPhase(false);
    return;
  }
  const tileState = getTileState(tile);
  const type = tileState[destination.space];
  if (type === "S") {
    narrate(`${player.name} landed on Soft water and gets another turn after shifting.`);
    endMovementPhase(true);
  } else if (type === "H") {
    player.missNextTurn = true;
    narrate(`${player.name} landed on Hard water and will miss next turn.`);
    endMovementPhase(false);
  } else {
    endMovementPhase(false);
  }
}

function endMovementPhase(extraTurn) {
  state.gamePhase = PHASES.AWAITING_SHIFT;
  state.pendingShift = { extraTurn };
  state.extraTurnQueued = extraTurn;
  updateControls();
  beginShiftPhase();
}

function beginShiftPhase() {
  const player = currentPlayer();
  const { die1, die2 } = state.dice;
  const targetNumbers = new Set([`${die1}-${die2}`, `${die2}-${die1}`]);
  const availableTiles = Array.from(state.boardState.values()).filter((tile) => targetNumbers.has(tile.base.tile_number));
  if (availableTiles.length === 0) {
    narrate(`${player.name} cannot shift any tiles.`);
    endShiftPhase(true);
    return;
  }
  if (player.isCPU) {
    cpuHandleShift(availableTiles);
  } else {
    narrate(`${player.name} may shift tile ${Array.from(targetNumbers).join(" or ")}.`);
    highlightShiftableTiles(availableTiles.map((t) => `${t.row},${t.col}`));
  }
}

function highlightShiftableTiles(keys) {
  const grid = boardElement._grid;
  if (!grid) return;
  keys.forEach((key) => {
    const tile = findTileElement(key);
    if (tile) {
      tile.classList.add("shift-highlight");
      tile.addEventListener("click", handleShiftTileSelection, { once: true });
    }
  });
}

function clearShiftHighlights() {
  const grid = boardElement._grid;
  if (!grid) return;
  grid.querySelectorAll(".shift-highlight").forEach((tile) => {
    tile.classList.remove("shift-highlight");
  });
}

function handleShiftTileSelection(event) {
  const tileElement = event.currentTarget;
  clearShiftHighlights();
  const row = Number(tileElement.dataset.row);
  const col = Number(tileElement.dataset.col);
  startShift(row, col);
}

function handleTileClick(row, col) {
  if (state.gamePhase === PHASES.AWAITING_SHIFT && state.pendingShift && state.pendingShift.tile && !currentPlayer().isCPU) {
    if (state.pendingShift.placed && row === state.pendingShift.tile.row && col === state.pendingShift.tile.col) {
      rotatePlacedTile();
    } else if (!state.pendingShift.pickedUp) {
      startShift(row, col);
    } else {
      placeTileAt(row, col);
    }
  }
}

function startShift(row, col) {
  clearShiftHighlights();
  const tile = state.boardState.get(`${row},${col}`);
  if (!tile) return;
  const allowed = new Set([`${state.dice.die1}-${state.dice.die2}`, `${state.dice.die2}-${state.dice.die1}`]);
  if (!allowed.has(tile.base.tile_number)) return;
  state.pendingShift = {
    tile,
    originRow: row,
    originCol: col,
    pickedUp: true,
    placed: false,
    extraTurn: state.pendingShift ? state.pendingShift.extraTurn : false,
    rotationOptions: [],
    removedPlayers: getPlayersOnTile(row, col)
  };
  narrate(`${currentPlayer().name} picked up tile ${tile.base.tile_number}.`);
  state.boardState.delete(`${row},${col}`);
  state.pendingShift.removedPlayers.forEach((p) => {
    p.pos = null;
  });
  renderBoard();
  renderTokens();
  showPlacementOptions();
}

function getPlayersOnTile(row, col) {
  return state.players.filter((p) => p.pos && p.pos.row === row && p.pos.col === col);
}

function showPlacementOptions() {
  if (!state.pendingShift || !state.pendingShift.tile) return;
  const options = computePlacementOptions(state.pendingShift.tile);
  placementLayer.innerHTML = "";
  renderBoard(options.map((o) => ({ row: o.row, col: o.col })));
  const bounds = state.lastBounds;
  const rows = bounds.maxRow - bounds.minRow + 1;
  const cols = bounds.maxCol - bounds.minCol + 1;
  const grid = document.createElement("div");
  grid.className = "placement-grid";
  grid.style.display = "grid";
  grid.style.gridTemplateRows = `repeat(${rows}, 72px)`;
  grid.style.gridTemplateColumns = `repeat(${cols}, 72px)`;
  grid.style.gap = "6px";
  for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
    for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
      const option = options.find((o) => o.row === r && o.col === c);
      const cell = document.createElement("div");
      cell.className = "placement-cell";
      if (!option || option.rotations.length === 0) {
        cell.classList.add("invalid");
      } else {
        cell.addEventListener("click", () => placeTileAt(option.row, option.col, option.rotations));
      }
      grid.appendChild(cell);
    }
  }
  placementLayer.appendChild(grid);
  placementLayer.style.pointerEvents = "auto";
}

function computePlacementOptions(tile) {
  const options = [];
  const seen = new Set();
  state.boardState.forEach((other) => {
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => {
      const row = other.row + dr;
      const col = other.col + dc;
      const key = `${row},${col}`;
      if (state.boardState.has(key) || seen.has(key)) return;
      seen.add(key);
      const rotations = getValidRotations(tile.base, row, col);
      options.push({ row, col, rotations });
    });
  });
  return options;
}

function getValidRotations(baseTile, row, col) {
  const rotations = [];
  for (let orientation = 0; orientation < 4; orientation++) {
    const rotated = getTileState({ base: baseTile, orientation, row, col });
    if (isPlacementValid(rotated)) {
      rotations.push(orientation);
    }
  }
  return rotations;
}

function isPlacementValid(tileState) {
  let hasNeighbor = false;
  for (const side of SIDES) {
    const [dr, dc] = sideDelta(side);
    const neighbor = state.boardState.get(`${tileState.row + dr},${tileState.col + dc}`);
    if (!neighbor) continue;
    hasNeighbor = true;
    const neighborState = getTileState(neighbor);
    const opposite = oppositeSide(side);
    if (tileState[side] && neighborState[opposite]) {
      return true;
    }
  }
  return hasNeighbor;
}

function placeTileAt(row, col, rotationOptions = null) {
  if (!state.pendingShift || !state.pendingShift.tile) return;
  const rotations = rotationOptions || getValidRotations(state.pendingShift.tile.base, row, col);
  if (rotations.length === 0) {
    narrate("No valid orientation there.");
    return;
  }
  const orientation = rotations[0];
  const tile = state.pendingShift.tile;
  tile.row = row;
  tile.col = col;
  tile._animateFrom = { row: state.pendingShift.originRow, col: state.pendingShift.originCol };
  tile.orientation = orientation;
  state.boardState.set(`${row},${col}`, tile);
  if (tile.base.tile_number === "3-4") {
    state.finishRow = row;
    state.finishCol = col;
  }
  state.pendingShift.rotationOptions = rotations;
  state.pendingShift.pickedUp = true;
  state.pendingShift.placed = true;
  placementLayer.innerHTML = "";
  renderBoard();
  renderTokens();
  state.awaitingConfirm = true;
  updateControls();
  if (rotations.length > 1) {
    narrate("Click the placed tile to cycle orientations, then confirm placement.");
  } else {
    narrate("Only one orientation fits here. Confirm placement when ready.");
  }
}

function rotatePlacedTile() {
  if (!state.pendingShift || !state.pendingShift.placed) return;
  const rotations = state.pendingShift.rotationOptions;
  const tile = state.pendingShift.tile;
  if (rotations.length <= 1) {
    const element = findTileElement(`${tile.row},${tile.col}`);
    if (element) {
      element.classList.add("rotating");
      element.style.setProperty("--angle", `${tile.orientation * 90 + 360}deg`);
      setTimeout(() => {
        element.classList.remove("rotating");
        element.style.setProperty("--angle", `${tile.orientation * 90}deg`);
      }, 400);
    }
    return;
  }
  const idx = rotations.indexOf(tile.orientation);
  const next = rotations[(idx + 1) % rotations.length];
  const previous = tile.orientation;
  tile.orientation = next;
  const element = findTileElement(`${tile.row},${tile.col}`);
  if (element) {
    element.classList.add("rotating");
    element.style.setProperty("--angle", `${previous * 90}deg`);
    requestAnimationFrame(() => {
      element.style.setProperty("--angle", `${next * 90}deg`);
      setTimeout(() => element.classList.remove("rotating"), 350);
    });
  }
  adjustTokensForRotation(tile, previous, next);
}

function adjustTokensForRotation(tile, fromOrientation, toOrientation) {
  const steps = ((toOrientation - fromOrientation + 4) % 4);
  if (steps === 0) return;
  const affected = state.players.filter((p) => p.pos && p.pos.row === tile.row && p.pos.col === tile.col);
  affected.forEach((player) => {
    if (player.pos.space === "middle") return;
    const idx = SIDES.indexOf(player.pos.space);
    const newSpace = SIDES[(idx + steps) % 4];
    player.pos = { row: tile.row, col: tile.col, space: newSpace };
  });
  renderTokens();
}

function confirmShiftPlacement() {
  if (!state.pendingShift || !state.pendingShift.placed) return;
  state.awaitingConfirm = false;
  updateControls();
  placementLayer.innerHTML = "";
  if (state.pendingShift.removedPlayers && state.pendingShift.removedPlayers.length) {
    relocateRemovedPlayers([...state.pendingShift.removedPlayers]);
  } else {
    endShiftPhase(true);
  }
}

function relocateRemovedPlayers(queue) {
  if (queue.length === 0) {
    endShiftPhase(true);
    return;
  }
  const victim = queue.shift();
  const neutrals = collectNeutralSpaces();
  if (neutrals.length === 0) {
    victim.pos = null;
    relocateRemovedPlayers(queue);
    return;
  }
  if (currentPlayer().isCPU) {
    const target = chooseCpuNeutral(victim, neutrals);
    narrate(`CPU relocates ${victim.name} to (${target.row},${target.col}) ${target.space}.`, 400);
    victim.pos = target;
    renderTokens();
    offerRotationAfterBump(victim, () => relocateRemovedPlayers(queue));
  } else {
    narrate(`Select a neutral space to relocate ${victim.name}.`);
    highlightNeutralSpaces(neutrals, (choice) => {
      victim.pos = choice;
      renderTokens();
      offerRotationAfterBump(victim, () => relocateRemovedPlayers(queue));
    });
  }
}

function collectNeutralSpaces() {
  const spaces = [];
  state.boardState.forEach((tile) => {
    const tileState = getTileState(tile);
    ["top", "right", "bottom", "left", "middle"].forEach((space) => {
      if (tileState[space] === "N") {
        spaces.push({ row: tile.row, col: tile.col, space });
      }
    });
  });
  return spaces;
}

function highlightNeutralSpaces(neutrals, callback) {
  placementLayer.innerHTML = "";
  const bounds = state.lastBounds;
  const rows = bounds.maxRow - bounds.minRow + 1;
  const cols = bounds.maxCol - bounds.minCol + 1;
  const grid = document.createElement("div");
  grid.className = "bump-grid";
  grid.style.display = "grid";
  grid.style.gridTemplateRows = `repeat(${rows}, 72px)`;
  grid.style.gridTemplateColumns = `repeat(${cols}, 72px)`;
  grid.style.gap = "6px";
  for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
    for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
      const cell = document.createElement("div");
      cell.className = "empty-cell";
      const choices = neutrals.filter((p) => p.row === r && p.col === c);
      if (choices.length) {
        choices.forEach((choice) => {
          const button = document.createElement("button");
          button.className = "bump-target";
          button.textContent = choice.space;
          button.addEventListener("click", () => {
            placementLayer.innerHTML = "";
            callback({ ...choice });
          });
          cell.appendChild(button);
        });
      }
      grid.appendChild(cell);
    }
  }
  placementLayer.appendChild(grid);
  placementLayer.style.pointerEvents = "auto";
}

function offerRotationAfterBump(victim, onComplete) {
  placementLayer.innerHTML = "";
  placementLayer.style.pointerEvents = "none";
  if (!victim.pos) {
    onComplete();
    return;
  }
  const tile = state.boardState.get(`${victim.pos.row},${victim.pos.col}`);
  if (!tile) {
    onComplete();
    return;
  }
  const actor = currentPlayer();
  if (actor.isCPU) {
    rotateTileWithDecision(tile, actor);
    onComplete();
  } else {
    const info = document.createElement("div");
    info.className = "status-inline";
    info.textContent = "Optional: click the relocated tile to rotate it, or press Skip.";
    announcerLog.appendChild(info);
    announcerLog.scrollTop = announcerLog.scrollHeight;
    const skip = document.createElement("button");
    skip.textContent = "Skip Rotation";
    const controls = document.querySelector(".controls .control-buttons");
    controls.appendChild(skip);
    let active = true;
    const attach = () => {
      if (!active) return;
      const el = findTileElement(`${tile.row},${tile.col}`);
      if (!el) return;
      el.addEventListener(
        "click",
        () => {
          if (!active) return;
          rotateTileInstant(tile, (tile.orientation + 1) % 4);
          attach();
        },
        { once: true }
      );
    };
    attach();
    skip.addEventListener("click", () => {
      active = false;
      skip.remove();
      info.remove();
      placementLayer.innerHTML = "";
      placementLayer.style.pointerEvents = "none";
      onComplete();
    });
    setTimeout(() => {
      if (active) {
        skip.click();
      }
    }, 4000);
  }
}

function rotateTileWithDecision(tile, actor) {
  const rotations = [0, 1, 2, 3].map((step) => (tile.orientation + step) % 4);
  let best = tile.orientation;
  let bestScore = -Infinity;
  rotations.forEach((orientation) => {
    const score = evaluateRotation(tile, orientation, actor);
    if (score > bestScore) {
      bestScore = score;
      best = orientation;
    }
  });
  if (best !== tile.orientation) {
    const prev = tile.orientation;
    tile.orientation = best;
    adjustTokensForRotation(tile, prev, best);
    renderBoard();
    renderTokens();
    narrate(`CPU rotates tile ${tile.base.tile_number}.`, 500);
  }
}

function evaluateRotation(tile, orientation, actor) {
  const temp = tile.orientation;
  tile.orientation = orientation;
  const actorDist = shortestPathLength(actor);
  tile.orientation = temp;
  return actorDist === null ? -Infinity : -actorDist;
}

function rotateTileInstant(tile, newOrientation) {
  const previous = tile.orientation;
  tile.orientation = newOrientation;
  adjustTokensForRotation(tile, previous, newOrientation);
  renderBoard();
  renderTokens();
}

function endShiftPhase(skipAnnounce) {
  const grantExtra = state.extraTurnQueued;
  state.pendingShift = null;
  state.extraTurnQueued = false;
  placementLayer.innerHTML = "";
  placementLayer.style.pointerEvents = "none";
  state.awaitingConfirm = false;
  updateControls();
  if (grantExtra) {
    narrate(`${currentPlayer().name} takes an extra turn!`);
    state.gamePhase = PHASES.AWAITING_ROLL;
    highlightCurrentPlayer();
    updateControls();
    if (currentPlayer().isCPU) {
      processCpuTurn();
    }
    return;
  }
  advanceTurn();
}

function advanceTurn() {
  let nextIndex = state.currentPlayerIndex;
  let loops = 0;
  do {
    nextIndex = (nextIndex + 1) % state.players.length;
    const candidate = state.players[nextIndex];
    if (candidate.missNextTurn) {
      candidate.missNextTurn = false;
      narrate(`${candidate.name} misses this turn.`);
      loops++;
      continue;
    }
    break;
  } while (loops < state.players.length);
  state.currentPlayerIndex = nextIndex;
  state.gamePhase = PHASES.AWAITING_ROLL;
  highlightCurrentPlayer();
  updateControls();
  if (currentPlayer().isCPU) {
    processCpuTurn();
  }
}

function startBumpSequence(active, victim) {
  state.gamePhase = PHASES.BUMP_RELOCATE;
  const neutrals = collectNeutralSpaces();
  if (neutrals.length === 0) {
    victim.pos = null;
    state.gamePhase = PHASES.AWAITING_SHIFT;
    endMovementPhase(false);
    return;
  }
  if (active.isCPU) {
    const target = chooseCpuNeutral(victim, neutrals);
    narrate(`CPU relocates ${victim.name} to (${target.row},${target.col}) ${target.space}.`, 600).then(() => {
      victim.pos = target;
      renderTokens();
      offerRotationAfterBump(victim, () => applyLandingEffect(active, active.pos));
    });
  } else {
    narrate(`Select a neutral space to move ${victim.name}.`);
    highlightNeutralSpaces(neutrals, (choice) => {
      victim.pos = choice;
      renderTokens();
      offerRotationAfterBump(victim, () => applyLandingEffect(active, active.pos));
    });
  }
}

function chooseCpuNeutral(victim, neutrals) {
  let best = neutrals[0];
  let bestScore = -Infinity;
  neutrals.forEach((space) => {
    const score = scoreNeutralPlacement(victim, space);
    if (score > bestScore) {
      bestScore = score;
      best = space;
    }
  });
  return { ...best };
}

function scoreNeutralPlacement(victim, space) {
  const original = victim.pos;
  victim.pos = space;
  const distance = shortestPathLength(victim);
  victim.pos = original;
  return distance === null ? 999 : distance;
}

function highlightCurrentPlayer() {
  state.players.forEach((player, idx) => {
    const token = state.playerTokens.get(player.id);
    if (token) {
      token.classList.toggle("active", idx === state.currentPlayerIndex);
    }
  });
}

function updateControls() {
  rollBtn.disabled = state.gamePhase !== PHASES.AWAITING_ROLL || currentPlayer().isCPU;
  confirmPlacementBtn.classList.toggle("hidden", !state.awaitingConfirm);
  skipShiftBtn.classList.toggle(
    "hidden",
    currentPlayer().isCPU || state.gamePhase !== PHASES.AWAITING_SHIFT || (state.pendingShift && !state.pendingShift.pickedUp)
  );
}

function currentPlayer() {
  return state.players[state.currentPlayerIndex];
}

function narrate(message, delay = 0) {
  state.announcerQueue = state.announcerQueue.then(
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
  return state.announcerQueue;
}

function endGame(player) {
  state.gamePhase = PHASES.GAME_OVER;
  narrate(`${player.name} reaches the Finish!`);
  victoryTitle.textContent = `${player.name} Wins!`;
  victoryMessage.textContent = `${player.name} connected the system first.`;
  victoryModal.classList.remove("hidden");
}

function processCpuTurn() {
  rollBtn.disabled = true;
  wait(700).then(() => onRollDice());
}

function chooseCpuMovement(paths) {
  const scored = paths.map((path) => ({ path, score: scoreCpuPath(path) }));
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0].path;
  narrate("CPU evaluates movement options...", 600).then(() => executeMovement(best));
}

function scoreCpuPath(path) {
  const end = path[path.length - 1];
  const distanceToFinish = Math.abs(end.row - state.finishRow) + Math.abs(end.col - state.finishCol);
  let score = -distanceToFinish;
  const tile = state.boardState.get(`${end.row},${end.col}`);
  if (tile) {
    const tileState = getTileState(tile);
    const type = tileState[end.space];
    if (type === "S") score += 2;
    if (type === "H") score -= 2;
  }
  return score;
}

function shortestPathLength(player) {
  if (!player.pos) return null;
  const queue = [{ pos: player.pos, dist: 0 }];
  const visited = new Set([posKey(player.pos)]);
  while (queue.length) {
    const { pos, dist } = queue.shift();
    if (pos.row === state.finishRow && pos.col === state.finishCol && pos.space === "middle") {
      return dist;
    }
    const neighbors = getNeighbors(pos, player);
    neighbors.forEach((next) => {
      const key = posKey(next);
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ pos: next, dist: dist + 1 });
      }
    });
  }
  return null;
}

function cpuHandleShift(tiles) {
  wait(600).then(() => {
    const decision = evaluateCpuShift(tiles);
    if (!decision) {
      narrate("CPU skips the shift.");
      endShiftPhase(true);
      return;
    }
    const { tile, placement, orientation } = decision;
    startShift(tile.row, tile.col);
    wait(600).then(() => {
      placeTileAt(placement.row, placement.col, [orientation]);
      wait(600).then(() => confirmShiftPlacement());
    });
  });
}

function evaluateCpuShift(tiles) {
  let best = null;
  let bestScore = -Infinity;
  tiles.forEach((tile) => {
    const placements = computePlacementOptions(tile);
    placements.forEach((option) => {
      option.rotations.forEach((orientation) => {
        const score = scoreShift(tile, option, orientation);
        if (score > bestScore) {
          bestScore = score;
          best = { tile, placement: option, orientation };
        }
      });
    });
  });
  if (bestScore <= 0) {
    const reachable = shortestPathLength(currentPlayer());
    if (reachable !== null) {
      return null;
    }
  }
  return best;
}

function scoreShift(tile, option, orientation) {
  const removed = state.boardState.get(`${option.row},${option.col}`);
  const originalRow = tile.row;
  const originalCol = tile.col;
  state.boardState.delete(`${tile.row},${tile.col}`);
  const copyTile = createBoardTile(tile.base, option.row, option.col, orientation);
  state.boardState.set(`${option.row},${option.col}`, copyTile);
  const cpuPlayer = currentPlayer();
  const cpuDistance = shortestPathLength(cpuPlayer);
  let humanPenalty = 0;
  state.players.forEach((player) => {
    if (player.isCPU) return;
    const dist = shortestPathLength(player);
    if (dist === null) {
      humanPenalty += 5;
    } else {
      humanPenalty += dist;
    }
  });
  state.boardState.delete(`${option.row},${option.col}`);
  if (removed) {
    state.boardState.set(`${option.row},${option.col}`, removed);
  }
  state.boardState.set(`${originalRow},${originalCol}`, tile);
  if (cpuDistance === null) return -999;
  return -cpuDistance - humanPenalty * 0.1;
}

function oppositeSide(side) {
  if (side === "top") return "bottom";
  if (side === "bottom") return "top";
  if (side === "left") return "right";
  if (side === "right") return "left";
  return side;
}
