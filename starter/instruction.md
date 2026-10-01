# GitHub Copilot Instructions — Flask Sudoku

## Project Goal

Refactor the existing Flask Sudoku application into a maintainable, responsive, accessible Sudoku game while preserving the existing functionality and adding all requirements documented in `README.md`.

The application should remain a Python Flask backend with HTML, CSS, and JavaScript on the frontend unless there is a strong technical reason to change this approach.

## General Development Principles

* Prefer simple, readable, maintainable solutions over unnecessary complexity.
* Use modern Python and JavaScript practices.
* Follow separation of concerns.
* Keep Sudoku/game logic independent from Flask routes where practical.
* Avoid global mutable state for per-game data.
* Reuse functions instead of duplicating logic.
* Use descriptive names for variables, functions, classes, and constants.
* Keep functions focused on one responsibility.
* Add comments only where they clarify non-obvious logic.
* Handle invalid input and unexpected errors gracefully.
* Do not silently ignore errors.
* Do not introduce dependencies unless they provide clear value.

## Python Standards

* Follow PEP 8 conventions.
* Use type hints for new Python functions where practical.
* Keep Sudoku algorithms testable independently from Flask.
* Validate API input before processing it.
* Avoid module-level mutable state for player/game state.
* Use Flask's testing utilities for route/API tests.
* Keep configuration and application logic separate where practical.

## Sudoku Requirements

The application must:

* Generate valid 9×9 Sudoku puzzles.
* Guarantee exactly one solution for every generated puzzle.
* Support Easy, Medium, and Hard difficulties.
* Use difficulty levels to control the number of prefilled cells.
* Keep original/prefilled cells locked.
* Validate user entries.
* Provide immediate feedback for invalid entries.
* Provide a Check Puzzle feature.
* Provide a Hint feature.
* Lock cells populated by hints.
* Detect successful completion.
* Display a completion message.

The unique-solution requirement is critical. Puzzle generation must not assume that randomly removing cells produces a unique puzzle.

## Frontend Requirements

The frontend should:

* Use semantic HTML where appropriate.
* Work on desktop, tablet, and mobile screen sizes.
* Support both light and dark modes.
* Use accessible color contrast.
* Keep the Sudoku grid visually stable without layout shifts.
* Visually distinguish the 3×3 Sudoku blocks.
* Provide clear visual states for:

  * Prefilled cells
  * User-entered cells
  * Incorrect cells
  * Hint cells
  * Focused/selected cells
* Use event delegation for board input handling where appropriate.
* Avoid relying on color alone to communicate important information.
* Support keyboard interaction where practical.

## Game Features

The finished application should include:

* Difficulty selector
* New Game
* Timer
* Check Puzzle
* Hint
* Immediate input validation
* Completion detection
* Player name entry after successful completion
* Top 10 leaderboard
* Difficulty stored with scores
* Completion time stored with scores
* Number of hints stored with scores
* Top 10 persistence using browser localStorage
* Dark mode toggle

## Testing

Tests are required before major refactoring.

When adding or changing functionality:

1. Run the existing tests.
2. Make the smallest reasonable change.
3. Run the relevant tests.
4. Run the complete test suite.
5. Do not knowingly leave failing tests.

Tests should cover:

* Sudoku validity
* Sudoku solving
* Unique solution detection
* Puzzle generation
* Difficulty behavior
* Invalid input handling
* Flask routes
* Solution checking
* Game completion
* Hint behavior
* Score handling

When a browser feature cannot reasonably be tested with Python unit tests, keep the implementation modular and test the underlying logic separately.

## Error Handling

Errors should be handled deliberately.

* Invalid API input should return an appropriate HTTP response.
* Missing game state should produce a useful error.
* Malformed Sudoku boards should not crash the server.
* Client-side network failures should display a useful message.
* Never expose unnecessary internal exceptions to users.

## Copilot Usage

Before implementing a major feature:

* Inspect the existing implementation.
* Explain the proposed approach.
* Prefer incremental changes.
* Do not rewrite unrelated working code.
* Explain unfamiliar APIs or algorithms when requested.
* Evaluate generated code before accepting it.
* Reject suggestions that introduce unnecessary complexity or violate these instructions.

## Code Organization

Prefer a structure where responsibilities are separated approximately as follows:

* Sudoku generation and solving → Sudoku/domain modules
* Flask routing and API validation → Flask application/routes
* Game state and UI behavior → JavaScript
* Presentation → HTML/CSS
* Tests → dedicated test modules

The exact structure can evolve if there is a clear reason.

## Documentation and Code Quality

### Comments

When modifying or creating code:

* Add comments only where they clarify non-obvious logic, algorithms, design decisions, or important edge cases.
* Do not add comments that merely restate obvious code.
* Keep comments concise and technically accurate.
* Maintain a consistent commenting style throughout the project.
* For important implementation decisions, document the reason for the decision rather than merely describing what the code does.

### Modular and Maintainable Design

* Prefer small functions with clear single responsibilities.
* Separate domain logic, Flask/API logic, frontend state, UI rendering, persistence, and utility behavior where practical.
* Reuse existing functions instead of duplicating logic.
* Avoid unnecessary global state.
* Keep game state explicit and avoid using the DOM as the application's source of truth.
* Preserve clear boundaries between frontend and backend responsibilities.

### Error Handling

* Handle API/network failures explicitly.
* Check HTTP response status before assuming a request succeeded.
* Validate external/user-provided data.
* Use graceful fallback behavior for malformed localStorage data.
* Do not allow one failed operation to destroy valid existing game state.
* Keep error/status messages consistent and accessible.
* Use try/catch only where exceptions are actually expected and can be handled meaningfully.

### Testing and Verification

After meaningful changes:

* Run the existing automated test suite.
* Run relevant syntax/static checks.
* Check for whitespace/diff errors.
* Verify the application manually when behavior is UI-related.
* Do not assume Copilot-generated code is correct simply because it compiles.

### Responsible GitHub Copilot Usage

Use Copilot as an assistant rather than blindly accepting generated code.

For each significant milestone:

1. Give Copilot a focused, specific prompt.
2. Review the proposed implementation.
3. Compare it against project requirements.
4. Test the implementation.
5. Modify, reject, or replace suggestions when they are incorrect, unnecessary, inefficient, unsafe, or outside the requested scope.
6. Prefer simpler implementations when they satisfy the requirements.

Document at least one meaningful example where a Copilot suggestion was evaluated and rejected or modified, including why.

### Screenshot Evidence

Maintain descriptive filenames for Copilot evidence screenshots.

Examples:

* `copilot_testing_framework.png`
* `copilot_unique_solution_prompt.png`
* `copilot_top10_scores.png`
* `copilot_grid_styling.png`
* `copilot_evaluation_rejection.png`

Screenshots should clearly show the relevant Copilot prompt/response and, where appropriate, the resulting code or application behavior.

Do not use vague filenames such as:

* `image1.png`
* `screenshot.png`
* `test.png`

### Supporting Documentation

Where appropriate, document relevant external references used to understand implementation concepts, such as:

* GitHub Copilot documentation
* MDN Web APIs
* WCAG accessibility guidance
* Sudoku generation/uniqueness references

Do not claim that an external source was used unless it actually informed the implementation.

## Important Constraint

Do not remove existing functionality while adding new features unless the requirement explicitly calls for replacing it.

Every major refactor should preserve working behavior or have an equivalent tested replacement.
