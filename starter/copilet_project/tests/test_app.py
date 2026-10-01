import pytest

import app as sudoku_app


SOLUTION = [
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
    [4, 5, 6, 7, 8, 9, 1, 2, 3],
    [7, 8, 9, 1, 2, 3, 4, 5, 6],
    [2, 3, 4, 5, 6, 7, 8, 9, 1],
    [5, 6, 7, 8, 9, 1, 2, 3, 4],
    [8, 9, 1, 2, 3, 4, 5, 6, 7],
    [3, 4, 5, 6, 7, 8, 9, 1, 2],
    [6, 7, 8, 9, 1, 2, 3, 4, 5],
    [9, 1, 2, 3, 4, 5, 6, 7, 8],
]


@pytest.fixture
def client():
    sudoku_app.CURRENT.update({'puzzle': None, 'solution': None})
    with sudoku_app.app.test_client() as test_client:
        yield test_client
    sudoku_app.CURRENT.update({'puzzle': None, 'solution': None})


def test_index_returns_http_200(client):
    response = client.get('/')

    assert response.status_code == 200


def test_new_without_difficulty_defaults_to_medium(client):
    response = client.get('/new')
    data = response.get_json()

    assert response.status_code == 200
    assert data['difficulty'] == 'medium'
    assert len(data['puzzle']) == 9
    assert all(len(row) == 9 for row in data['puzzle'])
    assert sum(cell != 0 for row in data['puzzle'] for cell in row) == 35


@pytest.mark.parametrize(
    ('difficulty', 'expected_clues'),
    [('easy', 45), ('medium', 35), ('hard', 30)],
)
def test_new_returns_requested_difficulty_and_clue_count(
    client, difficulty, expected_clues
):
    response = client.get(f'/new?difficulty={difficulty}')
    data = response.get_json()

    assert response.status_code == 200
    assert data['difficulty'] == difficulty
    assert sum(cell != 0 for row in data['puzzle'] for cell in row) == expected_clues


@pytest.mark.parametrize('difficulty', ['', 'expert', '45'])
def test_new_rejects_invalid_difficulty(client, difficulty):
    response = client.get(f'/new?difficulty={difficulty}')

    assert response.status_code == 400
    assert 'error' in response.get_json()


def test_check_without_active_game_returns_expected_error(client):
    response = client.post('/check', json={'board': []})

    assert response.status_code == 400
    assert response.get_json() == {'error': 'No game in progress'}


def test_check_correct_solution_returns_no_incorrect_cells(client):
    sudoku_app.CURRENT['solution'] = SOLUTION

    response = client.post('/check', json={'board': SOLUTION})

    assert response.status_code == 200
    assert response.get_json() == {'incorrect': []}


def test_check_reports_changed_cell_coordinate(client):
    sudoku_app.CURRENT['solution'] = SOLUTION
    changed_board = [row.copy() for row in SOLUTION]
    changed_board[0][0] = 9

    response = client.post('/check', json={'board': changed_board})

    assert response.status_code == 200
    assert response.get_json() == {'incorrect': [[0, 0]]}


def test_check_rejects_non_json_request_with_active_game(client):
    sudoku_app.CURRENT['solution'] = SOLUTION

    response = client.post('/check', data='not json')

    assert response.status_code == 400
    assert 'error' in response.get_json()


def test_check_rejects_malformed_json_with_active_game(client):
    sudoku_app.CURRENT['solution'] = SOLUTION

    response = client.post('/check', data='{"board":', content_type='application/json')

    assert response.status_code == 400
    assert 'error' in response.get_json()


@pytest.mark.parametrize('payload', [{}, []])
def test_check_rejects_missing_board_or_non_object_json(client, payload):
    sudoku_app.CURRENT['solution'] = SOLUTION

    response = client.post('/check', json=payload)

    assert response.status_code == 400
    assert 'error' in response.get_json()


@pytest.mark.parametrize(('row_count', 'column_count'), [(8, 9), (10, 9), (9, 8), (9, 10)])
def test_check_rejects_incorrect_board_dimensions(client, row_count, column_count):
    sudoku_app.CURRENT['solution'] = SOLUTION
    board = [[1 for _ in range(column_count)] for _ in range(row_count)]

    response = client.post('/check', json={'board': board})

    assert response.status_code == 400
    assert 'error' in response.get_json()


@pytest.mark.parametrize(
    'invalid_value', ['1', 1.5, None, True, False, -1, 10],
    ids=['string', 'float', 'null', 'true', 'false', 'below-zero', 'above-nine'],
)
def test_check_rejects_invalid_cell_values(client, invalid_value):
    sudoku_app.CURRENT['solution'] = SOLUTION
    board = [row.copy() for row in SOLUTION]
    board[0][0] = invalid_value

    response = client.post('/check', json={'board': board})

    assert response.status_code == 400
    assert 'error' in response.get_json()


def test_check_missing_game_takes_precedence_over_malformed_board(client):
    response = client.post('/check', json={'board': [[True]]})

    assert response.status_code == 400
    assert response.get_json() == {'error': 'No game in progress'}