// 1. КОНСТАНТИ ТА ДАНІ ГРИ

const BOARD_SIZE = 10;
const CELL_EMPTY = 0;
const CELL_SHIP = 1;
const CELL_HIT = 2;
const CELL_MISS = 3;
const CELL_SUNK = 4;


const ALL_SHIP_TYPES = [
    { id: 'battleship', name: 'Лінкор (4)', size: 4, count: 1 },
    { id: 'cruiser',    name: 'Крейсер (3)', size: 3, count: 2 },
    { id: 'destroyer',  name: 'Есмінець (2)', size: 2, count: 3 },
    { id: 'submarine',  name: 'Підводний човен (1)', size: 1, count: 4 }
];

// 2. ГЛОБАЛЬНІ ЗМІННІ

let player1Board = [];
let player1Ships = [];
let player1ShipsToPlace = [];

let player2Board = [];
let player2Ships = [];
let player2ShipsToPlace = [];

let gameEnded = false;
let gamePhase = 'placement';
let currentPlayerTurn = 1;
let currentPlayerPlacing = 1;
let currentPlacementOrientation = 'horizontal';

// 3. ДОПОМІЖНІ ФУНКЦІЇ

function createEmptyBoard() {
    let board = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
        let row = [];
        for (let c = 0; c < BOARD_SIZE; c++) {
            row.push(CELL_EMPTY);
        }
        board.push(row);
    }
    return board;
}

function isValidCoord(r, c) {
    return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

function isOccupiedOrAdjacent(board, r, c) {
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            const newR = r + dr;
            const newC = c + dc;
            if (isValidCoord(newR, newC) && board[newR][newC] === CELL_SHIP) {
                return true;
            }
        }
    }
    return false;
}


function canPlaceShip(board, size, startRow, startCol, orientation) {
    if (orientation === 'horizontal') {
        if (startCol + size > BOARD_SIZE) return false;
        for (let c = 0; c < size; c++) {
            if (isOccupiedOrAdjacent(board, startRow, startCol + c)) return false;
        }
    } else { // vertical
        if (startRow + size > BOARD_SIZE) return false;
        for (let r = 0; r < size; r++) {
            if (isOccupiedOrAdjacent(board, startRow + r, startCol)) return false;
        }
    }
    return true;
}

// Розміщує корабель на дошці та додає його до списку кораблів
function placeShipOnBoard(board, shipsArray, shipData, startRow, startCol, orientation) {
    const newShip = {
        id: shipData.id, name: shipData.name, size: shipData.size, hits: 0, orientation: orientation,
        startCoords: { row: startRow, col: startCol }, cells: []
    };
    if (orientation === 'horizontal') {
        for (let c = 0; c < shipData.size; c++) {
            board[startRow][startCol + c] = CELL_SHIP;
            newShip.cells.push({ row: startRow, col: startCol + c, hit: false });
        }
    } else { // vertical
        for (let r = 0; r < shipData.size; r++) {
            board[startRow + r][startCol] = CELL_SHIP;
            newShip.cells.push({ row: startRow + r, col: startCol, hit: false });
        }
    }
    shipsArray.push(newShip);
}

// Позначає потоплений корабель та навколо нього
function markSunkShip(board, ship) {
    ship.cells.forEach(cell => {
        board[cell.row][cell.col] = CELL_SUNK;
        // Позначаємо сусідні порожні клітинки як промах
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const newR = cell.row + dr;
                const newC = cell.col + dc;
                if (isValidCoord(newR, newC) && board[newR][newC] === CELL_EMPTY) {
                    board[newR][newC] = CELL_MISS;
                }
            }
        }
    });
}

// Перевіряє, чи всі кораблі потоплені
function checkAllShipsSunk(shipsArray) {
    return shipsArray.every(ship => ship.hits === ship.size);
}

// Оновлення текстових повідомлень
function updateMessage(message) {
    document.getElementById('message').textContent = message;
}



// =================================================================================================
// 4. ФУНКЦІЇ, ЩО КЕРУЮТЬ ГРОЮ ТА ІНТЕРФЕЙСОМ
// =================================================================================================

// Рендерить одну дошку в DOM
function renderBoard(gridElementId, board, showShips) {
    const gridElement = document.getElementById(gridElementId);
    gridElement.innerHTML = ''; // Очищаємо попередній вміст
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            const cell = document.createElement('div');
            cell.classList.add('board-cell');
            cell.dataset.row = i;
            cell.dataset.col = j;

            const cellState = board[i][j];
            if (showShips && cellState === CELL_SHIP) {
                cell.classList.add('ship');
            } else if (cellState === CELL_HIT) {
                cell.classList.add('hit');
            } else if (cellState === CELL_MISS) {
                cell.classList.add('miss');
            } else if (cellState === CELL_SUNK) {
                cell.classList.add('sunk');
            }
            gridElement.appendChild(cell);
        }
    }
}

// Рендерить обидві дошки залежно від фази гри
function renderAllBoards() {
    if (gamePhase === 'placement') {
        let currentBoard = (currentPlayerPlacing === 1) ? player1Board : player2Board;
        renderBoard('placement-grid', currentBoard, true); // Показуємо кораблі під час розстановки
    } else { // game phase
        // Гравець 1 бачить свою дошку з кораблями і дошку Гравця 2 без кораблів (але з влучаннями)
        // Гравець 2 бачить свою дошку з кораблями і дошку Гравця 1 без кораблів
        renderBoard('player1-grid', player1Board, currentPlayerTurn === 1);
        renderBoard('player2-grid', player2Board, currentPlayerTurn === 2);

        // Підсвічуємо дошку, по якій потрібно стріляти
        if (currentPlayerTurn === 1) {
            document.getElementById('player2-grid').classList.add('active-target-board');
            document.getElementById('player1-grid').classList.remove('active-target-board');
        } else {
            document.getElementById('player1-grid').classList.add('active-target-board');
            document.getElementById('player2-grid').classList.remove('active-target-board');
        }
    }
}

// Оновлює UI для фази розстановки
function updatePlacementUI() {
    const playerShipsToPlace = (currentPlayerPlacing === 1) ? player1ShipsToPlace : player2ShipsToPlace;
    const shipsToPlaceDisplay = document.getElementById('ships-to-place-display');
    const rotateShipBtn = document.getElementById('rotate-ship-btn');
    const confirmPlacementBtn = document.getElementById('confirm-placement-btn');
    const placementGridElement = document.getElementById('placement-grid');

    document.getElementById('placement-player-info').textContent = `Гравець ${currentPlayerPlacing}, розставляйте свої кораблі.`;

    const nextShipToPlace = playerShipsToPlace.find(s => !s.placed);

    if (nextShipToPlace) {
        shipsToPlaceDisplay.textContent = `Поточний корабель: ${nextShipToPlace.name} (${nextShipToPlace.size} клітинок).`;
        rotateShipBtn.disabled = false;
        placementGridElement.style.cursor = 'crosshair';
    } else {
        shipsToPlaceDisplay.textContent = "Всі кораблі розставлені!";
        rotateShipBtn.disabled = true;
        placementGridElement.style.cursor = 'default';
    }

    document.getElementById('current-orientation-display').textContent = currentPlacementOrientation === 'horizontal' ? 'Горизонтально' : 'Вертикально';
    // Кнопка підтвердження активна, якщо всі кораблі розміщені
    confirmPlacementBtn.disabled = !playerShipsToPlace.every(s => s.placed);
    renderAllBoards(); // Оновлюємо відображення дошки розстановки
}

// Скидає стан гри для нового початку
function resetGame() {
    gameEnded = false;
    gamePhase = 'placement';
    currentPlayerTurn = 1;
    currentPlayerPlacing = 1;
    currentPlacementOrientation = 'horizontal';
    // Скидаємо дошки та кораблі для обох гравців
    player1Board = createEmptyBoard();
    player1Ships = [];
    player1ShipsToPlace = ALL_SHIP_TYPES.flatMap(s =>
     Array.from({ length: s.count }, () => ({id:   s.id, name: s.name, size: s.size, placed: false})));

    player2Board = createEmptyBoard();
    player2Ships = [];
    player2ShipsToPlace = ALL_SHIP_TYPES.flatMap(s =>
        Array.from({ length: s.count }, () => ({id:   s.id, name: s.name, size: s.size, placed: false})));

    // Показуємо секцію розстановки, ховаємо ігрову
    document.getElementById('placement-section').classList.remove('hidden');
    document.getElementById('game-section').classList.add('hidden');

    updateMessage(`Гравець ${currentPlayerPlacing}, розставте свої кораблі.`);
    updatePlacementUI(); // Початковий рендер
}
// Автоматична розстановка кораблів
function autoPlaceShipsForCurrentPlayer() {
    let currentBoard, currentShips, currentShipsToPlace;
    if (currentPlayerPlacing === 1) {
        currentBoard = player1Board;
        currentShips = player1Ships;
        currentShipsToPlace = player1ShipsToPlace;
    } else {
        currentBoard = player2Board;
        currentShips = player2Ships;
        currentShipsToPlace = player2ShipsToPlace;
    }

    // Очищаємо дошку перед автоматичною розстановкою
    currentBoard.forEach((row, rIdx) => row.forEach((_, cIdx) => currentBoard[rIdx][cIdx] = CELL_EMPTY));
    currentShips.length = 0;
    currentShipsToPlace.forEach(s => s.placed = false);

    for (const shipType of ALL_SHIP_TYPES) {
        for (let k = 0; k < shipType.count; k++) {
            let placed = false;
            let attempts = 0;
            const MAX_ATTEMPTS = 1000;

            while (!placed && attempts < MAX_ATTEMPTS) {
                const orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';
                const startRow = Math.floor(Math.random() * BOARD_SIZE);
                const startCol = Math.floor(Math.random() * BOARD_SIZE);

                if (canPlaceShip(currentBoard, shipType.size, startRow, startCol, orientation)) {
                    placeShipOnBoard(currentBoard, currentShips, shipType, startRow, startCol, orientation);
                    placed = true;
                }
                attempts++;
            }
        }
    }
    // Позначаємо всі кораблі як розміщені в shipsToPlace
    currentShipsToPlace.forEach(s => s.placed = true);

    updateMessage("Кораблі автоматично розставлені.");
    updatePlacementUI(); // Оновити UI, щоб кнопка підтвердження стала активною
}

// Обробка кліку на дошку розстановки
function handlePlacementClick(event) {
    const cell = event.target;
    if (!cell.classList.contains('board-cell')) return;

    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);

    const currentBoard = (currentPlayerPlacing === 1) ? player1Board : player2Board;
    const currentShips = (currentPlayerPlacing === 1) ? player1Ships : player2Ships;
    const currentShipsToPlace = (currentPlayerPlacing === 1) ? player1ShipsToPlace : player2ShipsToPlace;

    const nextShipToPlace = currentShipsToPlace.find(s => !s.placed);

    if (!nextShipToPlace) {
        updateMessage("Всі кораблі вже розставлені. Будь ласка, підтвердіть.");
        return;
    }

    if (canPlaceShip(currentBoard, nextShipToPlace.size, row, col, currentPlacementOrientation)) {
        placeShipOnBoard(currentBoard, currentShips, nextShipToPlace, row, col, currentPlacementOrientation);
        nextShipToPlace.placed = true; // Позначаємо корабель як розміщений
        updateMessage(`Розміщено ${nextShipToPlace.name}.`);
        updatePlacementUI();
    } else {
        updateMessage("Не можна розмістити корабель тут. Занадто близько до іншого корабля або виходить за межі.");
    }
}

// Обробка наведення миші для попереднього перегляду розміщення
function handlePlacementHover(event) {
    // Якщо кнопка підтвердження вже активна, не показувати попередній перегляд
    if (!document.getElementById('confirm-placement-btn').disabled) return;

    const cell = event.target;
    if (!cell.classList.contains('board-cell')) return;

    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);

    const currentBoard = (currentPlayerPlacing === 1) ? player1Board : player2Board;
    const currentShipsToPlace = (currentPlayerPlacing === 1) ? player1ShipsToPlace : player2ShipsToPlace;
    const nextShipToPlace = currentShipsToPlace.find(s => !s.placed);

    const placementGridElement = document.getElementById('placement-grid');
    // Очищаємо попередні підсвічування
    placementGridElement.querySelectorAll('.preview-valid, .preview-invalid, .hovered').forEach(c => {
        c.classList.remove('preview-valid', 'preview-invalid', 'hovered');
    });

    if (!nextShipToPlace) return; // Немає кораблів для розміщення

    const isValid = canPlaceShip(currentBoard, nextShipToPlace.size, row, col, currentPlacementOrientation);
    const cellsToHighlight = [];

    if (currentPlacementOrientation === 'horizontal') {
        for (let c = 0; c < nextShipToPlace.size; c++) {
            if (isValidCoord(row, col + c)) {
                cellsToHighlight.push(placementGridElement.querySelector(`[data-row="${row}"][data-col="${col + c}"]`));
            }
        }
    } else { // vertical
        for (let r = 0; r < nextShipToPlace.size; r++) {
            if (isValidCoord(row + r, col)) {
                cellsToHighlight.push(placementGridElement.querySelector(`[data-row="${row + r}"][data-col="${col}"]`));
            }
        }
    }

    cellsToHighlight.forEach(c => {
        if (c) {
            c.classList.add('hovered');
            c.classList.add(isValid ? 'preview-valid' : 'preview-invalid');
        }
    });
}

// Обробка виведення миші з дошки розстановки
function handlePlacementOut() {
    document.getElementById('placement-grid').querySelectorAll('.preview-valid, .preview-invalid, .hovered').forEach(c => {
        c.classList.remove('preview-valid', 'preview-invalid', 'hovered');
    });
}

// Підтвердження розстановки
function handleConfirmPlacement() {
    const playerShipsToPlace = (currentPlayerPlacing === 1) ? player1ShipsToPlace : player2ShipsToPlace;
    const allShipsPlaced = playerShipsToPlace.every(s => s.placed);

    if (!allShipsPlaced) {
        updateMessage("Будь ласка, розставте всі кораблі перед підтвердженням.");
        return;
    }

    if (currentPlayerPlacing === 1) {
        currentPlayerPlacing = 2; // Перехід до розстановки Гравця 2
        updateMessage(`Гравець 1 розставив кораблі. Тепер хід Гравця 2!`);
        updatePlacementUI();
    } else {
        gamePhase = 'game'; // Перехід до ігрової фази
        document.getElementById('placement-section').classList.add('hidden');
        document.getElementById('game-section').classList.remove('hidden');
        updateMessage("Обидва гравці розставили кораблі! Гравець 1, стріляйте по дошці Гравця 2.");
        // Запуск ігрової фази
        currentPlayerTurn = 1;
        document.getElementById('player1-board-label').textContent = `Дошка Гравця 1`;
        document.getElementById('player2-board-label').textContent = `Дошка Гравця 2`;
        renderAllBoards(); // Оновлюємо відображення дощок в ігровому режимі
    }
}

// Обробка пострілу
function handleShotAttempt(event) {
    if (gameEnded || gamePhase !== 'game') return;

    const cell = event.target;
    if (!cell.classList.contains('board-cell')) return;

    const targetGridElement = cell.parentNode;
    let targetBoard, targetShips;

    // Визначаємо, по якій дошці стріляли і хто її власник
    if (currentPlayerTurn === 1 && targetGridElement.id === 'player2-grid') {
        targetBoard = player2Board;
        targetShips = player2Ships;
    } else if (currentPlayerTurn === 2 && targetGridElement.id === 'player1-grid') {
        targetBoard = player1Board;
        targetShips = player1Ships;
    } else {
        updateMessage("Клікніть на дошку опонента!");
        return;
    }

    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);

    // Перевірка, чи вже стріляли сюди
    if ([CELL_HIT, CELL_MISS, CELL_SUNK].includes(targetBoard[row][col])) {
        updateMessage("Ви вже стріляли сюди!");
        return;
    }

    let isHit = false;
    let message = "";

    if (targetBoard[row][col] === CELL_SHIP) {
        targetBoard[row][col] = CELL_HIT;
        isHit = true;
        message = `Влучання!`;

        // Знаходимо корабель, в який влучили
        const hitShip = targetShips.find(ship =>
            ship.cells.some(cell => cell.row === row && cell.col === col && !cell.hit)
        );

        if (hitShip) {
            const hitCell = hitShip.cells.find(cell => cell.row === row && cell.col === col);
            if (hitCell) {
                hitCell.hit = true;
                hitShip.hits++;
                if (hitShip.hits === hitShip.size) {
                    message += ` Ви потопили ${hitShip.name} опонента!`;
                    markSunkShip(targetBoard, hitShip); // Позначаємо корабель як потоплений на дошці
                }
            }
        }
    } else {
        targetBoard[row][col] = CELL_MISS;
        message = `Промах!`;
    }

    updateMessage(`Гравець ${currentPlayerTurn}: ${message}`);
    renderAllBoards(); // Оновлюємо відображення дощок

    // Перевіряємо, чи всі кораблі потоплені (кінець гри)
    if (checkAllShipsSunk(targetShips)) {
        gameEnded = true;
        updateMessage(`Гравець ${currentPlayerTurn} переміг! Кінець гри.`);
        document.getElementById('player1-grid').classList.remove('active-target-board');
        document.getElementById('player2-grid').classList.remove('active-target-board');
        return;
    }

    // Передача ходу, якщо це був промах і гра не закінчилась
    if (!isHit && !gameEnded) {
        currentPlayerTurn = (currentPlayerTurn === 1) ? 2 : 1;
        const newCurrentPlayerId = currentPlayerTurn;
        setTimeout(() => {
            alert(`Передайте керування Гравцю ${newCurrentPlayerId}! Натисніть ОК, щоб продовжити.`);
            updateMessage(`Гравець ${newCurrentPlayerId}, ваш хід! Стріляйте по дошці опонента.`);
            renderAllBoards();
        }, 500);
    } else if (isHit && !gameEnded) {
        // Якщо влучання, поточний гравець стріляє знову
        updateMessage(`Гравець ${currentPlayerTurn}: ${message} Стріляйте знову!`);
    }
}
// 5. ІНІЦІАЛІЗАЦІЯ ГРИ (Прив'язка подій)

document.addEventListener('DOMContentLoaded', () => {
    // Прив'язка кнопок
    document.getElementById('new-game-btn').addEventListener('click', resetGame);
    document.getElementById('theme-toggle-btn').addEventListener('click', () => document.body.classList.toggle('dark-theme'));
    document.getElementById('rotate-ship-btn').addEventListener('click', () => {
        currentPlacementOrientation = (currentPlacementOrientation === 'horizontal') ? 'vertical' : 'horizontal';
        updatePlacementUI();
        // Якщо є наведена клітинка, оновити попередній перегляд
        const hoveredCell = document.getElementById('placement-grid').querySelector('.board-cell.hovered');
        if (hoveredCell) {
            handlePlacementHover({ target: hoveredCell });
        }
    });
    document.getElementById('auto-place-ships-btn').addEventListener('click', autoPlaceShipsForCurrentPlayer);
    document.getElementById('confirm-placement-btn').addEventListener('click', handleConfirmPlacement);

    // Прив'язка подій до сіток
    document.getElementById('placement-grid').addEventListener('click', handlePlacementClick);
    document.getElementById('placement-grid').addEventListener('mouseover', handlePlacementHover);
    document.getElementById('placement-grid').addEventListener('mouseout', handlePlacementOut);

    document.getElementById('player1-grid').addEventListener('click', handleShotAttempt);
    document.getElementById('player2-grid').addEventListener('click', handleShotAttempt);


    resetGame();
});