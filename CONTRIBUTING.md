# Contributing

Thanks for helping make the Soft Agar Colony Counter useful to more scientists!
This guide covers development setup, architecture, and how to contribute.

---

## Architecture Overview

- **Engine (`softagar.engine`)** – OpenCV/NumPy pipeline that accepts in-memory
  images and returns colony metadata (counts, coordinates, masks).
- **CLI (`softagar.cli`)** – Batch processing front-end that walks folders,
  calls the engine, and writes CSV summaries.
- **API (`api.main`)** – FastAPI service that wraps uploads, detection, manual
  annotations, and CSV export for web clients.
- **Web UI (`frontend/`)** – React + Konva.js browser interface.

---

## Development Setup

### Option 1: Pip (recommended)

```bash
git clone https://github.com/Nima-Sarfaraz/SoftCount.git
cd SoftCount
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -e ".[api]"

# Install git hooks (auto-rebuilds frontend on commit)
./scripts/setup-hooks.sh
```

### Option 2: Conda

```bash
conda create -n softagar python=3.11 pip
conda activate softagar
pip install -e ".[api]"
```

### Option 3: Requirements file

Install the exact pinned runtime stack:
```bash
pip install -r requirements.txt
```

---

## CLI Quickstart

The CLI is useful for batch processing without the web interface:

```bash
softagar count \
  --input examples/data/HepG2 \
  --output results.csv \
  --recursive \
  --global-thresh 120 \
  --min-area 400 \
  --max-area 12000
```

- Input can be a single file or a folder.
- Use `--recursive` to scan nested directories.
- All detection parameters are surfaced as flags; omit them to use sensible defaults.

---

## Running the Web UI (Development Mode)

For development with hot-reloading:

```bash
# Terminal 1: Start the API with auto-reload
pip install -e ".[api]"
uvicorn api.main:app --reload --port 8000

# Terminal 2: Start the frontend dev server
cd frontend
npm install
npm run dev
```

- **Dev server:** http://localhost:5173 (with hot reload)
- **Production build:** http://localhost:8000

---

## API Endpoints

For programmatic access and automation:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/upload` | POST | Upload images, returns session_id and image_ids |
| `/process/{image_id}` | POST | Run detection with parameters |
| `/annotations/{image_id}` | POST | Save manual edits |
| `/results/{session_id}` | GET | Download CSV |

---

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

---

## Coding Style

- Use type annotations (PEP 484 style)
- Keep functions small and focused
- The engine (`softagar.engine.detect_colonies`) should remain pure—no UI or
  filesystem side effects
- Write concise docstrings for public functions
- Add inline comments only when logic is non-obvious

Optional linting tools:
```bash
pip install ruff black
```

---

## Release Checklist

1. Bump the version in `pyproject.toml`
2. Update `README.md` and `examples/README.md` if needed
3. Verify `pip install .` works in a clean virtual environment
4. Run the full test suite: `pytest`
5. Tag the release: `git tag v0.X.0 && git push --tags`
6. Create a GitHub release with release notes

---

## Reporting Issues

When reporting bugs, please include:
- Your operating system and Python version
- Steps to reproduce the issue
- Expected vs actual behavior
- Any error messages or screenshots

---

## Code of Conduct

Be respectful, collaborative, and assume positive intent. We follow the
[Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).
Please flag any issues to the maintainers.
