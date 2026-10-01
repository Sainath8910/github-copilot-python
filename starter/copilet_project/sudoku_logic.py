import copy
import random

SIZE = 9
EMPTY = 0
MIN_CLUES = 17
MAX_GENERATION_ATTEMPTS = 50
EASY_CLUES = 45
MEDIUM_CLUES = 35
HARD_CLUES = 30

def deep_copy(board):
    return copy.deepcopy(board)

def create_empty_board():
    return [[EMPTY for _ in range(SIZE)] for _ in range(SIZE)]

def is_safe(board, row, col, num):
    # Check row and column
    for x in range(SIZE):
        if board[row][x] == num or board[x][col] == num:
            return False
    # Check 3x3 box
    start_row = row - row % 3
    start_col = col - col % 3
    for i in range(3):
        for j in range(3):
            if board[start_row + i][start_col + j] == num:
                return False
    return True

def fill_board(board):
    for row in range(SIZE):
        for col in range(SIZE):
            if board[row][col] == EMPTY:
                possible = list(range(1, SIZE + 1))
                random.shuffle(possible)
                for candidate in possible:
                    if is_safe(board, row, col, candidate):
                        board[row][col] = candidate
                        if fill_board(board):
                            return True
                        board[row][col] = EMPTY
                return False
    return True


def remove_cells(board, clues):
    attempts = SIZE * SIZE - clues
    while attempts > 0:
        row = random.randrange(SIZE)
        col = random.randrange(SIZE)
        if board[row][col] != EMPTY:
            board[row][col] = EMPTY
            attempts -= 1


def count_solutions(board, limit=2):
    if not isinstance(limit, int) or isinstance(limit, bool) or limit < 1:
        raise ValueError('limit must be a positive integer')

    try:
        if len(board) != SIZE or any(len(row) != SIZE for row in board):
            return 0
        working_board = [list(row) for row in board]
    except TypeError:
        return 0

    for row in range(SIZE):
        for col in range(SIZE):
            value = working_board[row][col]
            if value == EMPTY:
                continue
            if (
                not isinstance(value, int)
                or isinstance(value, bool)
                or value < 1
                or value > SIZE
            ):
                return 0
            working_board[row][col] = EMPTY
            is_valid = is_safe(working_board, row, col, value)
            working_board[row][col] = value
            if not is_valid:
                return 0

    solution_count = 0

    def search():
        nonlocal solution_count
        if solution_count >= limit:
            return

        for row in range(SIZE):
            for col in range(SIZE):
                if working_board[row][col] == EMPTY:
                    for candidate in range(1, SIZE + 1):
                        if is_safe(working_board, row, col, candidate):
                            working_board[row][col] = candidate
                            search()
                            working_board[row][col] = EMPTY
                            if solution_count >= limit:
                                return
                    return

        solution_count += 1

    search()
    return solution_count

def generate_puzzle(clues=35):
    if (
        not isinstance(clues, int)
        or isinstance(clues, bool)
        or clues < MIN_CLUES
        or clues > SIZE * SIZE
    ):
        raise ValueError(
            f'clues must be an integer between {MIN_CLUES} and {SIZE * SIZE}'
        )

    for _ in range(MAX_GENERATION_ATTEMPTS):
        solution = create_empty_board()
        if not fill_board(solution):
            continue

        puzzle = deep_copy(solution)
        positions = [
            (row, col)
            for row in range(SIZE)
            for col in range(SIZE)
        ]
        random.shuffle(positions)
        clue_count = SIZE * SIZE

        for row, col in positions:
            if clue_count == clues:
                break

            original_value = puzzle[row][col]
            puzzle[row][col] = EMPTY
            if count_solutions(puzzle, limit=2) != 1:
                puzzle[row][col] = original_value
            else:
                clue_count -= 1

        if clue_count == clues:
            return puzzle, solution

    raise RuntimeError(
        f'could not generate a unique puzzle with exactly {clues} clues '
        f'in {MAX_GENERATION_ATTEMPTS} attempts'
    )


def generate_puzzle_for_difficulty(difficulty):
    if not isinstance(difficulty, str):
        raise ValueError('difficulty must be easy, medium, or hard')

    normalized_difficulty = difficulty.strip().lower()
    if normalized_difficulty == 'easy':
        clues = EASY_CLUES
    elif normalized_difficulty == 'medium':
        clues = MEDIUM_CLUES
    elif normalized_difficulty == 'hard':
        clues = HARD_CLUES
    else:
        raise ValueError('difficulty must be easy, medium, or hard')

    return generate_puzzle(clues=clues)
