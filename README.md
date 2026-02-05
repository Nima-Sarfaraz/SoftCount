# Soft Agar Colony Counter

Automated colony counting for soft agar assays. Upload your images, adjust detection parameters with live preview, manually add or remove colonies as needed, and export your counts to CSV.

![App Screenshot](assets/Preview.png)

---

## Citation

If you use Soft Agar Colony Counter in a publication, please cite:

> Sarfaraz, N. (2025). *Soft Agar Colony Counter* (Version 1.0.1) [Software].
> https://github.com/Nima-Sarfaraz/Soft-Agar-Colony-Counter

BibTeX:

```bibtex
@software{sarfaraz2025softagar,
  author  = {Sarfaraz, Nima},
  title   = {Soft Agar Colony Counter},
  year    = {2025},
  version = {1.0.1},
  url     = {https://github.com/Nima-Sarfaraz/Soft-Agar-Colony-Counter}
}
```
---
## Installation Guide

Choose the method that works best for you. **Option 1 (Python Script)** is recommended for most users.

### Option 1: Python Script (Recommended)

This method uses a simple script that sets everything up automatically.

#### Step 1: Install Python

You need Python 3.10 or newer installed on your computer.

<details>
<summary><strong>macOS</strong></summary>

1. Open **Terminal** (press `Cmd + Space`, type "Terminal", press Enter)
2. Check if Python is installed by typing: `python3 --version`
3. If not installed, download from [python.org/downloads](https://www.python.org/downloads/) and run the installer
4. During installation, check the box that says "Add Python to PATH"

</details>

<details>
<summary><strong>Windows</strong></summary>

1. Download Python from [python.org/downloads](https://www.python.org/downloads/)
2. Run the installer
3. **Important:** Check the box that says "Add Python to PATH" before clicking Install
4. Click "Install Now"

</details>

<details>
<summary><strong>Linux (Ubuntu/Debian)</strong></summary>

Open a terminal and run:
```bash
sudo apt update
sudo apt install python3 python3-pip python3-venv
```

</details>

#### Step 2: Download the Software

**Option A: Download ZIP (easiest)**
1. Click the green **Code** button at the top of this page
2. Click **Download ZIP**
3. Extract the ZIP file to a folder (e.g., your Desktop or Documents)

**Option B: Using Git (if you have it installed)**
```bash
git clone https://github.com/Nima-Sarfaraz/Soft-Agar-Colony-Counter.git
```

#### Step 3: Run the Application

<details>
<summary><strong>macOS / Linux</strong></summary>

1. Open **Terminal**
2. Navigate to the folder where you extracted the files:
   ```bash
   cd ~/Desktop/Soft-Agar-Colony-Counter-master
   ```
   > **Note:** The folder may be named `Soft-Agar-Colony-Counter-master` or `Soft-Agar-Colony-Counter` depending on how you downloaded it.
3. Make the script executable (first time only):
   ```bash
   chmod +x start.sh
   ```
4. Run the application:
   ```bash
   ./start.sh
   ```
5. Your browser will open automatically to the app

</details>

<details>
<summary><strong>Windows</strong></summary>

1. Open the folder where you extracted the files
2. Double-click **`start.bat`**
3. A command window will open and set things up (this may take a minute the first time)
4. Your browser will open automatically to the app

**Alternative:** If double-clicking doesn't work:
1. Press `Win + R`, type `cmd`, press Enter
2. Navigate to the folder:
   ```
   cd C:\Users\YourName\Desktop\Soft-Agar-Colony-Counter-master
   ```
   > **Note:** The folder may be named `Soft-Agar-Colony-Counter-master` or `Soft-Agar-Colony-Counter` depending on how you downloaded it.
3. Run: `start.bat`

</details>

The script automatically:
- Creates an isolated Python environment
- Installs all dependencies
- Starts the server
- Opens your web browser to the app

**To stop the application:** Press `Ctrl + C` in the terminal/command window.

---

### Option 2: Docker (Alternative)

Docker is a containerization platform that packages the app with all its dependencies. This is useful if you're familiar with Docker or want complete isolation.

#### Step 1: Install Docker

1. Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. Start Docker Desktop and wait for it to fully load

#### Step 2: Download the Software

**Option A: Download ZIP (easiest)**
1. Click the green **Code** button at the top of this page
2. Click **Download ZIP**
3. Extract the ZIP file to a folder (e.g., your Desktop or Documents)

**Option B: Using Git (if you have it installed)**
```bash
git clone https://github.com/Nima-Sarfaraz/Soft-Agar-Colony-Counter.git
```

#### Step 3: Run with Docker

<details>
<summary><strong>macOS / Linux</strong></summary>

1. Open **Terminal**
2. Navigate to the folder where you extracted the files:
   ```bash
   cd ~/Desktop/Soft-Agar-Colony-Counter-master
   ```
   > **Note:** The folder may be named `Soft-Agar-Colony-Counter-master` or `Soft-Agar-Colony-Counter` depending on how you downloaded it.
3. Run Docker:
   ```bash
   docker compose up
   ```
4. Open http://localhost:8000 in your browser

</details>

<details>
<summary><strong>Windows</strong></summary>

1. Press `Win + R`, type `cmd`, press Enter
2. Navigate to the folder where you extracted the files:
   ```
   cd C:\Users\YourName\Desktop\Soft-Agar-Colony-Counter-master
   ```
   > **Note:** The folder may be named `Soft-Agar-Colony-Counter-master` or `Soft-Agar-Colony-Counter` depending on how you downloaded it.
3. Run Docker:
   ```
   docker compose up
   ```
4. Open http://localhost:8000 in your browser

</details>

**To stop:** Press `Ctrl + C` in the terminal.

---

## How to Use

Once the application is running in your browser:

1. **Upload Images** — Drag and drop your TIFF, PNG, or JPG files into the upload area (or click to browse)
2. **Adjust Parameters** — Use the sliders on the left to tune detection sensitivity. Changes preview live.
3. **Review & Edit** — Switch between View/Add/Remove modes to manually correct any missed or false colonies by clicking on the annotation image itself (left). Counts are updated on the right side.
4. **Move Between Files** - Click on the next file/image on the file browser to the right
5. **Export Results** — Click "Export CSV" to download a spreadsheet with colony counts for all images when finished with all files/images

**Tips:**
- Use the **Split View** to see both your image and the detection mask side-by-side
- The mask shows what the algorithm "sees" — white regions are potential colonies
- Parameters are saved per-image, so you can tune each one individually

---

## Features

- **Web UI:** Browser-based interface with drag-and-drop upload, live parameter tuning, and manual annotation
- **CLI:** Batch processing for automated workflows (see [CONTRIBUTING.md](CONTRIBUTING.md) for CLI usage)
- **FastAPI Backend:** REST API for programmatic access

---

## Example Data

`examples/data/` contains sample HepG2 and Huh7 plate images for testing and demos.
See `examples/README.md` for tutorials.

---

## Security & Privacy

This application runs entirely on your local machine — your images are never uploaded to external servers.

### Built-in Protections

- **Local-only**: Server binds to `127.0.0.1` (not accessible from other computers)
- **Pre-built frontend**: No need to run `npm install` — we include the compiled files
- **Locked dependencies**: All packages pinned to exact, verified versions
- **Isolated environment**: Python runs in its own virtual environment

---

## Troubleshooting

**Port already in use:**
```bash
# Find and kill the process using port 8000
lsof -i :8000
kill -9 <PID>
```

**Docker build fails:**
- Ensure Docker Desktop is running
- Try `docker compose build --no-cache`

**Frontend not loading:**
- Check that `frontend/dist/` exists
- Try stopping and re-running `start.sh` or `start.bat`

**Python dependency issues:**
```bash
# Clean reinstall
rm -rf .venv
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[api]"
```

---

## Contributing

Want to contribute or use the CLI? See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development setup
- Architecture overview
- CLI usage
- API endpoints
- Coding standards

We welcome bug reports, feature requests, and pull requests!

---

## License

MIT License - see [LICENSE](LICENSE) for details.
