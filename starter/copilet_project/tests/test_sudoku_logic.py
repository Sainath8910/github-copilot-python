import pytest

import sudoku_logic


def assert_valid_completed_board(board):
    expected = set(range(1, sudoku_logic.SIZE + 1))

    assert len(board) == sudoku_logic.SIZE
    assert all(len(row) == sudoku_logic.SIZE for row in board)
    assert all(set(row) == expected for row in board)
    assert all(
        {board[row][column] for row in range(sudoku_logic.SIZE)} == expected
        for column in range(sudoku_logic.SIZE)
    )
    assert all(
        {
            board[box_row + row][box_column + column]
            for row in range(3)
            for column in range(3)
        }
        == expected
        for box_row in range(0, sudoku_logic.SIZE, 3)
        for box_column in range(0, sudoku_logic.SIZE, 3)
    )


def test_create_empty_board_returns_nine_by_nine_zeroes():
    board = sudoku_logic.create_empty_board()

    assert len(board) == 9
    assert all(len(row) == 9 for row in board)
    assert all(cell == 0 for row in board for cell in row)


def test_is_safe_accepts_non_conflicting_number():
    board = sudoku_logic.create_empty_board()
    board[0][0] = 1

    assert sudoku_logic.is_safe(board, 0, 1, 2)


def test_is_safe_rejects_row_conflict():
    board = sudoku_logic.create_empty_board()
    board[0][0] = 5

    assert not sudoku_logic.is_safe(board, 0, 4, 5)


def test_is_safe_rejects_column_conflict():
    board = sudoku_logic.create_empty_board()
    board[0][0] = 5

    assert not sudoku_logic.is_safe(board, 4, 0, 5)


def test_is_safe_rejects_box_conflict():
    board = sudoku_logic.create_empty_board()
    board[0][0] = 5

    assert not sudoku_logic.is_safe(board, 1, 1, 5)


def test_fill_board_completes_a_valid_board():
    board = sudoku_logic.create_empty_board()

    assert sudoku_logic.fill_board(board)
    assert_valid_completed_board(board)


def test_count_solutions_returns_one_for_uniquely_solvable_puzzle():
    puzzle = [
        [5, 3, 0, 0, 7, 0, 0, 0, 0],
        [6, 0, 0, 1, 9, 5, 0, 0, 0],
        [0, 9, 8, 0, 0, 0, 0, 6, 0],
        [8, 0, 0, 0, 6, 0, 0, 0, 3],
        [4, 0, 0, 8, 0, 3, 0, 0, 1],
        [7, 0, 0, 0, 2, 0, 0, 0, 6],
        [0, 6, 0, 0, 0, 0, 2, 8, 0],
        [0, 0, 0, 4, 1, 9, 0, 0, 5],
        [0, 0, 0, 0, 8, 0, 0, 7, 9],
    ]
    original = [row.copy() for row in puzzle]

    assert sudoku_logic.count_solutions(puzzle) == 1
    assert puzzle == original


def test_count_solutions_stops_at_two_for_multiple_solutions():
    puzzle = sudoku_logic.create_empty_board()

    assert sudoku_logic.count_solutions(puzzle, limit=2) == 2


def test_count_solutions_returns_zero_for_unsolvable_puzzle():
    puzzle = sudoku_logic.create_empty_board()
    puzzle[0][0] = 5
    puzzle[0][1] = 5

    assert sudoku_logic.count_solutions(puzzle) == 0


def test_generate_puzzle_returns_default_puzzle_and_matching_solution():
    puzzle, solution = sudoku_logic.generate_puzzle()

    assert len(puzzle) == 9
    assert all(len(row) == 9 for row in puzzle)
    assert_valid_completed_board(solution)
    assert sum(cell != 0 for row in puzzle for cell in row) == 35
    assert sudoku_logic.count_solutions(puzzle) == 1
    assert all(
        puzzle[row][column] == 0 or puzzle[row][column] == solution[row][column]
        for row in range(9)
        for column in range(9)
    )


def test_generate_puzzle_preserves_requested_clue_count():
    puzzle, _ = sudoku_logic.generate_puzzle(clues=40)

    assert sum(cell != 0 for row in puzzle for cell in row) == 40
    assert sudoku_logic.count_solutions(puzzle) == 1


@pytest.mark.parametrize('clues', [16, 82, -1, '35', 35.0, True])
def test_generate_puzzle_rejects_invalid_clue_counts(clues):
    with pytest.raises(ValueError, match='clues must be an integer'):
        sudoku_logic.generate_puzzle(clues=clues)


@pytest.mark.parametrize(
    ('difficulty', 'expected_clues'),
    [('easy', 45), ('Medium', 35), ('HARD', 30)],
)
def test_generate_puzzle_for_difficulty_returns_unique_puzzle(
    difficulty, expected_clues
):
    puzzle, solution = sudoku_logic.generate_puzzle_for_difficulty(difficulty)

    assert sum(cell != 0 for row in puzzle for cell in row) == expected_clues
    assert sudoku_logic.count_solutions(puzzle) == 1
    assert all(
        puzzle[row][column] == 0 or puzzle[row][column] == solution[row][column]
        for row in range(sudoku_logic.SIZE)
        for column in range(sudoku_logic.SIZE)
    )


@pytest.mark.parametrize('difficulty', [None, '', 'expert', 1])
def test_generate_puzzle_for_difficulty_rejects_invalid_value(difficulty):
    with pytest.raises(ValueError, match='difficulty must be easy, medium, or hard'):
        sudoku_logic.generate_puzzle_for_difficulty(difficulty)