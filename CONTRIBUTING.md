# Contributing

Thanks for helping make the Soft Agar Colony Counter useful to more scientists!
This guide explains how to set up a development environment, propose changes,
and prepare releases.

## Getting Started

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Colony_Counter.git
   cd Colony_Counter
   ```

2. Create a dedicated virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -e ".[api]"
   ```

3. (Optional) Install linting/formatting tools:
   ```bash
   pip install ruff black
   ```

## Development Workflow

### Branch & PR Guidelines

- Create a feature branch for your changes (`git checkout -b feature/my-feature`)
- Keep changes focused and atomic
- Update documentation when behavior or commands change
- Add or extend tests under `tests/` to cover new functionality

### Running Tests

```bash
pytest
```

Or with verbose output:
```bash
python -m pytest -v
```

### Manual Verification Checklist

Before submitting a PR, verify that these workflows still function:

- **Web UI:** Start the server with `./start.sh` (or `start.bat` on Windows),
  upload images, run detection, and verify CSV export works.
- **CLI:** Run `softagar count` against `examples/data/` and confirm the CSV
  output is correct.

## Coding Style

- Use type annotations (PEP 484 style)
- Keep functions small and focused
- The engine (`softagar.engine.detect_colonies`) should remain pure—no UI or
  filesystem side effects
- Write concise docstrings for public functions
- Add inline comments only when logic is non-obvious

## Release Checklist

1. Bump the version in `pyproject.toml`
2. Update `README.md` and `examples/README.md` if needed
3. Verify `pip install .` works in a clean virtual environment
4. Run the full test suite: `pytest`
5. Tag the release: `git tag v0.X.0 && git push --tags`
6. Create a GitHub release with release notes

## Reporting Issues

When reporting bugs, please include:
- Your operating system and Python version
- Steps to reproduce the issue
- Expected vs actual behavior
- Any error messages or screenshots

## Code of Conduct

Be respectful, collaborative, and assume positive intent. We follow the
[Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).
Please flag any issues to the maintainers.
