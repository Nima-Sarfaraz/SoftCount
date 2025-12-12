# Examples

This folder contains sample soft agar colony images that make it easy to try the
Web UI and CLI without your own assay data.

## Included Samples

- `data/HepG2/20231109 HepG2 B1_1.tif`
- `data/HepG2/20231109 HepG2 F1_1.tif`
- `data/Huh7/20231122 B1_1.tif`
- `data/Huh7/20231122 F1_1.tif`

These sample images can be used for testing and demos. Replace them with your
own `.tif`, `.png`, or `.jpg` plates for real experiments.

## Web UI Quickstart

The easiest way to get started:

```bash
# From the repository root
./start.sh        # macOS/Linux
# or
start.bat         # Windows
```

This opens the web interface at http://localhost:8000. Simply drag and drop the
sample images from `examples/data/` into the browser to start counting colonies.

## CLI Quickstart

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .

softagar count \
  --input examples/data/HepG2 \
  --output examples/results.csv \
  --recursive \
  --global-thresh 120 \
  --min-area 400 \
  --max-area 12000
```

The CSV written to `examples/results.csv` lists one row per image along with the
parameters that produced it. Swap `--input` for `examples/data/Huh7` to process
the Huh7 replicate images instead.

