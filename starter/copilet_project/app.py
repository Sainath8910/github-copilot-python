from flask import Flask, render_template, jsonify, request
import sudoku_logic

app = Flask(__name__)

# Keep a simple in-memory store for current puzzle and solution
CURRENT = {
    'puzzle': None,
    'solution': None
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/new')
def new_game():
    difficulty = request.args.get('difficulty', 'medium')
    try:
        puzzle, solution = sudoku_logic.generate_puzzle_for_difficulty(difficulty)
    except ValueError as error:
        return jsonify({'error': str(error)}), 400

    CURRENT['puzzle'] = puzzle
    CURRENT['solution'] = solution
    return jsonify({'puzzle': puzzle, 'difficulty': difficulty.strip().lower()})

@app.route('/check', methods=['POST'])
def check_solution():
    solution = CURRENT.get('solution')
    if solution is None:
        return jsonify({'error': 'No game in progress'}), 400

    if not request.is_json:
        return jsonify({'error': 'Request must contain JSON'}), 400

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({'error': 'JSON body must be an object'}), 400
    if 'board' not in data:
        return jsonify({'error': 'JSON body must contain a board'}), 400

    board = data['board']
    if not isinstance(board, list) or len(board) != sudoku_logic.SIZE:
        return jsonify({'error': 'Board must contain exactly 9 rows'}), 400
    if any(not isinstance(row, list) or len(row) != sudoku_logic.SIZE for row in board):
        return jsonify({'error': 'Each board row must contain exactly 9 cells'}), 400
    if any(
        not isinstance(cell, int)
        or isinstance(cell, bool)
        or cell < 0
        or cell > sudoku_logic.SIZE
        for row in board
        for cell in row
    ):
        return jsonify({'error': 'Board cells must be integers from 0 through 9'}), 400

    incorrect = []
    for i in range(sudoku_logic.SIZE):
        for j in range(sudoku_logic.SIZE):
            if board[i][j] != solution[i][j]:
                incorrect.append([i, j])
    return jsonify({'incorrect': incorrect})

if __name__ == '__main__':
    app.run(debug=True)