const SIZE = 9;
const EMPTY = 0;
const DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const LEADERBOARD_STORAGE_KEY = 'sudokuLeaderboard';
const THEME_STORAGE_KEY = 'sudokuTheme';
const LEADERBOARD_LIMIT = 10;

let leaderboardEntries = [];

function createEmptyBoard() {
  return Array.from({length: SIZE}, () => Array(SIZE).fill(EMPTY));
}

const gameState = {
  puzzle: null,
  entries: createEmptyBoard(),
  difficulty: 'medium',
  hintedCells: new Set(),
  hintCount: 0,
  incorrectCells: new Set(),
  hintInProgress: false,
  completed: false,
  scoreSubmitted: false,
  finalElapsedMs: null,
  playerName: '',
  timer: {
    running: false,
    elapsedMs: 0,
    startedAt: null,
    intervalId: null
  },
  requestVersion: 0,
  status: 'idle'
};

const boardElement = document.getElementById('sudoku-board');
const statusElement = document.getElementById('game-status');
const difficultyElement = document.getElementById('difficulty');
const newGameButton = document.getElementById('new-game');
const checkPuzzleButton = document.getElementById('check-puzzle');
const hintButton = document.getElementById('hint-button');
const hintCountElement = document.getElementById('hint-count');
const timerElement = document.getElementById('timer');
const completionDialog = document.getElementById('completion-dialog');
const completionSummary = document.getElementById('completion-summary');
const completionForm = document.getElementById('completion-form');
const playerNameInput = document.getElementById('player-name');
const leaderboardBody = document.getElementById('leaderboard-body');
const themeToggle = document.getElementById('theme-toggle');

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
  themeToggle.textContent = theme === 'dark' ? 'Dark mode: On' : 'Dark mode: Off';
}

function loadTheme() {
  let savedTheme = null;
  try {
    savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  } catch {}

  const theme = savedTheme === 'light' || savedTheme === 'dark'
    ? savedTheme
    : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(theme);
}

function toggleTheme() {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
}

function cellKey(row, column) {
  return row * SIZE + column;
}

function getCellValue(row, column) {
  const given = gameState.puzzle[row][column];
  return given === EMPTY ? gameState.entries[row][column] : given;
}

function announce(message, kind = 'info') {
  statusElement.dataset.kind = kind;
  statusElement.textContent = message;
}

function formatElapsedTime(elapsedMs) {
  const totalSeconds = Math.floor(Math.max(0, elapsedMs) / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(totalMinutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function compareLeaderboardEntries(first, second) {
  return first.time - second.time || first.hints - second.hints;
}

function isLeaderboardEntry(entry) {
  return entry !== null
    && typeof entry === 'object'
    && typeof entry.name === 'string'
    && entry.name.trim().length > 0
    && Number.isFinite(entry.time)
    && entry.time >= 0
    && DIFFICULTIES.has(entry.difficulty)
    && Number.isInteger(entry.hints)
    && entry.hints >= 0;
}

function loadLeaderboard() {
  try {
    const storedValue = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
    if (storedValue === null) {
      leaderboardEntries = [];
      return;
    }

    const parsed = JSON.parse(storedValue);
    if (!Array.isArray(parsed)) {
      throw new Error('Leaderboard data must be an array.');
    }

    leaderboardEntries = parsed.filter(isLeaderboardEntry)
      .map(({name, time, difficulty, hints}) => ({name, time, difficulty, hints}))
      .sort(compareLeaderboardEntries)
      .slice(0, LEADERBOARD_LIMIT);
    saveLeaderboard();
    renderLeaderboard();
  } catch {
    leaderboardEntries = [];
    try {
      localStorage.removeItem(LEADERBOARD_STORAGE_KEY);
    } catch {
      // Storage can be unavailable; the in-memory leaderboard remains usable.
    }
  }
  renderLeaderboard();
}

function saveLeaderboard() {
  try {
    localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(leaderboardEntries));
    return true;
  } catch {
    return false;
  }
}

function addLeaderboardEntry() {
  if (gameState.scoreSubmitted) return false;

  leaderboardEntries.push({
    name: gameState.playerName,
    time: gameState.finalElapsedMs,
    difficulty: gameState.difficulty,
    hints: gameState.hintCount
  });
  leaderboardEntries.sort(compareLeaderboardEntries);
  leaderboardEntries = leaderboardEntries.slice(0, LEADERBOARD_LIMIT);
  gameState.scoreSubmitted = true;
  const saved = saveLeaderboard();
  renderLeaderboard();
  return saved;
}

function renderLeaderboard() {
  const fragment = document.createDocumentFragment();
  if (leaderboardEntries.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.className = 'empty-state';
    cell.textContent = 'No completed games yet.';
    row.appendChild(cell);
    fragment.appendChild(row);
  } else {
    leaderboardEntries.forEach(entry => {
      const row = document.createElement('tr');
      const values = [
        String(fragment.childElementCount + 1),
        entry.name,
        formatElapsedTime(entry.time),
        capitalize(entry.difficulty),
        String(entry.hints)
      ];
      for (const value of values) {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.appendChild(cell);
      }
      fragment.appendChild(row);
    });
  }
  leaderboardBody.replaceChildren(fragment);
}

function updateTimerDisplay() {
  const timer = gameState.timer;
  const elapsedMs = timer.elapsedMs + (timer.running && timer.startedAt !== null
    ? Math.max(0, performance.now() - timer.startedAt)
    : 0);
  timerElement.textContent = formatElapsedTime(elapsedMs);
}

function stopTimer() {
  const timer = gameState.timer;
  if (timer.intervalId !== null) {
    clearInterval(timer.intervalId);
    timer.intervalId = null;
  }

  if (timer.running && timer.startedAt !== null) {
    timer.elapsedMs += Math.max(0, performance.now() - timer.startedAt);
  }
  timer.running = false;
  timer.startedAt = null;
  updateTimerDisplay();
}

function resetTimer() {
  stopTimer();
  gameState.timer.elapsedMs = 0;
  updateTimerDisplay();
}

function startTimer() {
  stopTimer();
  const timer = gameState.timer;
  timer.running = true;
  timer.startedAt = performance.now();
  updateTimerDisplay();
  timer.intervalId = setInterval(updateTimerDisplay, 1000);
}

function isPuzzle(value) {
  return Array.isArray(value)
    && value.length === SIZE
    && value.every(row => Array.isArray(row)
      && row.length === SIZE
      && row.every(cell => Number.isInteger(cell) && cell >= 0 && cell <= SIZE));
}

function renderBoard() {
  const fragment = document.createDocumentFragment();

  for (let row = 0; row < SIZE; row++) {
    for (let column = 0; column < SIZE; column++) {
      const given = gameState.puzzle[row][column];
      const key = cellKey(row, column);
      const hinted = gameState.hintedCells.has(key);
      const input = document.createElement('input');

      input.type = 'text';
      input.inputMode = 'numeric';
      input.pattern = '[1-9]';
      input.maxLength = 1;
      input.autocomplete = 'off';
      input.className = 'sudoku-cell';
      input.dataset.row = String(row);
      input.dataset.col = String(column);
      input.setAttribute('aria-label', `Row ${row + 1}, column ${column + 1}`);
      input.value = getCellValue(row, column) || '';

      if (column === 2 || column === 5) input.classList.add('cell--box-right');
      if (row === 2 || row === 5) input.classList.add('cell--box-bottom');

      if (given !== EMPTY) {
        input.disabled = true;
        input.classList.add('cell--given');
        input.setAttribute('aria-label', `Row ${row + 1}, column ${column + 1}, given ${given}`);
      } else if (hinted) {
        input.disabled = true;
        input.classList.add('cell--hint');
        input.setAttribute('aria-label', `Row ${row + 1}, column ${column + 1}, hinted value ${getCellValue(row, column)}, locked`);
      } else {
        input.disabled = gameState.completed;
        if (gameState.entries[row][column] !== EMPTY) {
          input.classList.add('cell--user');
        }
      }

      if (!hinted && gameState.incorrectCells.has(key)) {
        input.classList.add('cell--error');
        input.setAttribute('aria-invalid', 'true');
        input.setAttribute('aria-describedby', 'game-status');
      }

      fragment.appendChild(input);
    }
  }

  boardElement.replaceChildren(fragment);
}

async function readJsonResponse(response) {
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('The server returned an unreadable response.');
  }

  if (!response.ok) {
    throw new Error(data?.error || `Request failed (${response.status}).`);
  }
  return data;
}

async function newGame() {
  if (gameState.status === 'loading' || gameState.hintInProgress) return;

  const requestedDifficulty = difficultyElement.value;
  const previousStatus = gameState.status;
  gameState.requestVersion += 1;
  gameState.status = 'loading';
  newGameButton.disabled = true;
  hintButton.disabled = true;
  checkPuzzleButton.disabled = true;
  difficultyElement.disabled = true;
  announce('Starting a new puzzle…');

  try {
    const query = new URLSearchParams({difficulty: requestedDifficulty});
    const response = await fetch(`/new?${query}`);
    const data = await readJsonResponse(response);

    if (!isPuzzle(data.puzzle) || !DIFFICULTIES.has(data.difficulty)) {
      throw new Error('The server returned an invalid puzzle.');
    }

    gameState.puzzle = data.puzzle.map(row => row.slice());
    gameState.entries = createEmptyBoard();
    gameState.difficulty = data.difficulty;
    gameState.hintedCells = new Set();
    gameState.hintCount = 0;
    gameState.incorrectCells = new Set();
    gameState.completed = false;
    gameState.scoreSubmitted = false;
    gameState.finalElapsedMs = null;
    gameState.playerName = '';
    gameState.status = 'playing';
    resetTimer();
    startTimer();

    difficultyElement.value = gameState.difficulty;
    updateHintCount();
    hintButton.disabled = false;
    renderBoard();
    announce(`${capitalize(gameState.difficulty)} puzzle ready.`);
  } catch (error) {
    gameState.status = gameState.puzzle ? previousStatus : 'error';
    announce(error.message || 'Could not start a new puzzle.', 'error');
  } finally {
    newGameButton.disabled = false;
    difficultyElement.disabled = false;
    checkPuzzleButton.disabled = !gameState.puzzle || gameState.completed;
    hintButton.disabled = !gameState.puzzle || gameState.completed;
  }
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function handleBoardInput(event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || !input.matches('.sudoku-cell')) return;

  const row = Number(input.dataset.row);
  const column = Number(input.dataset.col);
  if (!Number.isInteger(row) || !Number.isInteger(column)
      || row < 0 || row >= SIZE || column < 0 || column >= SIZE
        || !gameState.puzzle) return;

      if (gameState.completed) return;

  const key = cellKey(row, column);
  if (gameState.hintInProgress || gameState.puzzle[row][column] !== EMPTY || gameState.hintedCells.has(key)) {
    input.value = String(getCellValue(row, column) || '');
    return;
  }

  if (!/^[1-9]?$/.test(input.value)) {
    input.value = String(gameState.entries[row][column] || '');
    announce('Enter a digit from 1 to 9, or clear the cell.', 'error');
    return;
  }

  const value = input.value === '' ? EMPTY : Number(input.value);
  gameState.entries[row][column] = value;
  gameState.incorrectCells.delete(key);
  gameState.status = 'playing';
  input.classList.toggle('cell--user', value !== EMPTY);
  input.classList.remove('cell--error');
  input.removeAttribute('aria-invalid');
  input.removeAttribute('aria-describedby');

  if (value === EMPTY) {
    gameState.requestVersion += 1;
    announce('Entry cleared.');
  } else {
    validateCurrentEntries(row, column);
  }
}

function boardFromState() {
  return gameState.puzzle.map((row, rowIndex) => row.map((given, columnIndex) => (
    given === EMPTY ? gameState.entries[rowIndex][columnIndex] : given
  )));
}

function isBoardFull(board = boardFromState()) {
  return board.every(row => row.every(value => value >= 1 && value <= SIZE));
}

function completeGame() {
  if (gameState.completed) return;

  gameState.requestVersion += 1;
  stopTimer();
  gameState.finalElapsedMs = gameState.timer.elapsedMs;
  gameState.completed = true;
  gameState.status = 'completed';
  renderBoard();

  newGameButton.disabled = true;
  difficultyElement.disabled = true;
  hintButton.disabled = true;
  checkPuzzleButton.disabled = true;
  playerNameInput.value = '';
  playerNameInput.setCustomValidity('');
  const time = document.createElement('span');
  time.className = 'completion-time';
  time.textContent = formatElapsedTime(gameState.finalElapsedMs);
  const details = document.createElement('span');
  details.textContent = `${capitalize(gameState.difficulty)} difficulty | ${gameState.hintCount} hint${gameState.hintCount === 1 ? '' : 's'} used`;
  completionSummary.replaceChildren(time, details);
  completionDialog.showModal();
  playerNameInput.focus();
  announce('Puzzle completed. Enter your name to continue.', 'success');
}

function confirmCompletion(event) {
  event.preventDefault();
  if (!gameState.completed) return;

  const name = playerNameInput.value.trim();
  if (!name) {
    playerNameInput.setCustomValidity('Enter a name before continuing.');
    playerNameInput.reportValidity();
    playerNameInput.focus();
    return;
  }

  playerNameInput.setCustomValidity('');
  gameState.playerName = name;
  const saved = addLeaderboardEntry();
  completionDialog.close();
  newGameButton.disabled = false;
  difficultyElement.disabled = false;
  announce(saved
    ? 'Score added to the leaderboard. Start a new game when ready.'
    : 'Score added for this session, but browser storage is unavailable.', 'success');
}

function getIncorrectCoordinates(data) {
  if (!Array.isArray(data.incorrect) || data.incorrect.some(coordinate => (
    !Array.isArray(coordinate)
    || coordinate.length !== 2
    || !Number.isInteger(coordinate[0])
    || !Number.isInteger(coordinate[1])
    || coordinate[0] < 0 || coordinate[0] >= SIZE
    || coordinate[1] < 0 || coordinate[1] >= SIZE
  ))) {
    throw new Error('The server returned an invalid check result.');
  }

  return data.incorrect;
}

function updateHintCount() {
  hintCountElement.value = String(gameState.hintCount);
  hintCountElement.setAttribute('aria-label', `Hints used: ${gameState.hintCount}`);
}

function updateCellErrorStates() {
  for (const input of boardElement.querySelectorAll('.sudoku-cell')) {
    const key = cellKey(Number(input.dataset.row), Number(input.dataset.col));
    const isIncorrect = gameState.incorrectCells.has(key) && !gameState.hintedCells.has(key);
    input.classList.toggle('cell--error', isIncorrect);
    if (isIncorrect) {
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', 'game-status');
    } else {
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
    }
  }
}

async function postBoardForCheck(board) {
  const response = await fetch('/check', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({board})
  });
  return readJsonResponse(response);
}

async function validateCurrentEntries(row, column) {
  const requestVersion = ++gameState.requestVersion;
  const key = cellKey(row, column);

  try {
    const data = await postBoardForCheck(boardFromState());
    if (requestVersion !== gameState.requestVersion) return;

    const incorrectCoordinates = getIncorrectCoordinates(data);
    gameState.incorrectCells = new Set(incorrectCoordinates
      .filter(([incorrectRow, incorrectColumn]) => (
        gameState.puzzle[incorrectRow][incorrectColumn] === EMPTY
        && gameState.entries[incorrectRow][incorrectColumn] !== EMPTY
        && !gameState.hintedCells.has(cellKey(incorrectRow, incorrectColumn))
      ))
      .map(([incorrectRow, incorrectColumn]) => cellKey(incorrectRow, incorrectColumn)));

    updateCellErrorStates();
    if (isBoardFull() && incorrectCoordinates.length === 0) {
      completeGame();
      return;
    }
    if (gameState.incorrectCells.has(key)) {
      announce(`The entry in row ${row + 1}, column ${column + 1} is incorrect.`, 'error');
    } else {
      announce(`The entry in row ${row + 1}, column ${column + 1} is correct.`, 'success');
    }
  } catch (error) {
    if (requestVersion === gameState.requestVersion) {
      announce(error.message || 'Could not validate the entry.', 'error');
    }
  }
}

async function checkPuzzle() {
  if (!gameState.puzzle || gameState.hintInProgress) {
    announce('Start a new puzzle before checking it.', 'error');
    return;
  }

  const requestVersion = ++gameState.requestVersion;
  checkPuzzleButton.disabled = true;
  gameState.status = 'checking';
  announce('Checking puzzle…');

  const board = boardFromState();

  try {
    const data = await postBoardForCheck(board);
    if (requestVersion !== gameState.requestVersion) return;

    const incorrectCoordinates = getIncorrectCoordinates(data);
    gameState.incorrectCells = new Set(incorrectCoordinates
      .filter(([row, column]) => (
        gameState.puzzle[row][column] === EMPTY
        && !gameState.hintedCells.has(cellKey(row, column))
      ))
      .map(([row, column]) => cellKey(row, column)));
    updateCellErrorStates();

    if (isBoardFull(board) && incorrectCoordinates.length === 0) {
      completeGame();
      return;
    }

    if (gameState.incorrectCells.size === 0) {
      announce('All entries match the solution.', 'success');
    } else {
      announce(`${gameState.incorrectCells.size} cell${gameState.incorrectCells.size === 1 ? '' : 's'} need correction.`, 'error');
    }
    gameState.status = 'playing';
  } catch (error) {
    if (requestVersion === gameState.requestVersion) {
      gameState.status = 'playing';
      announce(error.message || 'Could not check the puzzle.', 'error');
    }
  } finally {
    checkPuzzleButton.disabled = gameState.completed || !gameState.puzzle;
  }
}

async function useHint() {
  if (!gameState.puzzle || gameState.status === 'loading' || gameState.status === 'checking') return;
  if (gameState.hintInProgress) return;

  gameState.hintInProgress = true;
  gameState.requestVersion += 1;
  hintButton.disabled = true;
  newGameButton.disabled = true;
  checkPuzzleButton.disabled = true;
  for (const input of boardElement.querySelectorAll('.sudoku-cell')) {
    input.disabled = true;
  }
  announce('Finding a hint…');

  try {
    const currentBoard = boardFromState();
    const currentData = await postBoardForCheck(currentBoard);
    const incorrectCoordinates = getIncorrectCoordinates(currentData);
    let target = null;

    for (let row = 0; row < SIZE && target === null; row++) {
      for (let column = 0; column < SIZE; column++) {
        const key = cellKey(row, column);
        if (gameState.puzzle[row][column] === EMPTY
            && gameState.entries[row][column] === EMPTY
            && !gameState.hintedCells.has(key)) {
          target = {row, column, key};
          break;
        }
      }
    }

    if (target === null) {
      for (const [row, column] of incorrectCoordinates) {
        const key = cellKey(row, column);
        if (gameState.puzzle[row][column] === EMPTY
            && gameState.entries[row][column] !== EMPTY
            && !gameState.hintedCells.has(key)) {
          target = {row, column, key};
          break;
        }
      }
    }

    if (target === null) {
      announce('No hint is needed. The puzzle is already full and correct.', 'success');
      return;
    }

    let correctValue = null;
    for (let value = 1; value <= SIZE; value++) {
      const candidateBoard = currentBoard.map(row => row.slice());
      candidateBoard[target.row][target.column] = value;
      const candidateData = await postBoardForCheck(candidateBoard);
      const candidateIncorrect = getIncorrectCoordinates(candidateData);
      if (!candidateIncorrect.some(([row, column]) => row === target.row && column === target.column)) {
        correctValue = value;
        break;
      }
    }

    if (correctValue === null) {
      throw new Error('Could not determine a safe hint. Please try again.');
    }

    gameState.entries[target.row][target.column] = correctValue;
    gameState.hintedCells.add(target.key);
    gameState.incorrectCells = new Set(incorrectCoordinates
      .filter(([row, column]) => (
        gameState.puzzle[row][column] === EMPTY
        && gameState.entries[row][column] !== EMPTY
        && !gameState.hintedCells.has(cellKey(row, column))
      ))
      .map(([row, column]) => cellKey(row, column)));
    gameState.hintCount += 1;
    updateHintCount();
    renderBoard();

    if (isBoardFull()) {
      const completedBoardData = await postBoardForCheck(boardFromState());
      const completedBoardIncorrect = getIncorrectCoordinates(completedBoardData);
      gameState.incorrectCells = new Set(completedBoardIncorrect
        .filter(([row, column]) => (
          gameState.puzzle[row][column] === EMPTY
          && !gameState.hintedCells.has(cellKey(row, column))
        ))
        .map(([row, column]) => cellKey(row, column)));
      updateCellErrorStates();
      if (completedBoardIncorrect.length === 0) {
        completeGame();
        return;
      }
    }

    announce(`Hint used: row ${target.row + 1}, column ${target.column + 1} filled and locked.`);
  } catch (error) {
    announce(error.message || 'Could not get a hint. Please try again.', 'error');
  } finally {
    gameState.hintInProgress = false;
    newGameButton.disabled = gameState.completed;
    checkPuzzleButton.disabled = !gameState.puzzle || gameState.completed;
    hintButton.disabled = !gameState.puzzle || gameState.completed;
    difficultyElement.disabled = gameState.completed;
    renderBoard();
  }
}

completionForm.addEventListener('submit', confirmCompletion);
playerNameInput.addEventListener('input', () => playerNameInput.setCustomValidity(''));
completionDialog.addEventListener('cancel', event => event.preventDefault());
themeToggle.addEventListener('click', toggleTheme);
boardElement.addEventListener('input', handleBoardInput);
newGameButton.addEventListener('click', newGame);
checkPuzzleButton.addEventListener('click', checkPuzzle);
hintButton.addEventListener('click', useHint);
window.addEventListener('pagehide', stopTimer);
loadTheme();
loadLeaderboard();
newGame();