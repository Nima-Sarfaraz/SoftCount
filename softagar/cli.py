"""Command-line interface for the Soft Agar colony counter."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Callable, Dict, Iterable, List, Sequence

from softagar.engine import detect_colonies
from softagar import io as io_utils

IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp"}


def build_parser() -> argparse.ArgumentParser:
    """Construct and return the top-level CLI parser."""
    parser = argparse.ArgumentParser(
        prog="softagar",
        description="Run Soft Agar colony detection workflows from the command line.",
    )
    subparsers = parser.add_subparsers(dest="command", metavar="<command>")

    _add_count_parser(subparsers)
    return parser


def _add_count_parser(subparsers: argparse._SubParsersAction[argparse.ArgumentParser]) -> None:
    """Register the `count` subcommand."""
    count_parser = subparsers.add_parser(
        "count",
        help="Detect colonies for a folder of images and export a CSV.",
    )
    count_parser.add_argument(
        "-i",
        "--input",
        type=Path,
        required=True,
        help="Path to an image file or directory containing images.",
    )
    count_parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path("softagar_results.csv"),
        help="Destination CSV path (default: ./softagar_results.csv).",
    )
    count_parser.add_argument(
        "--recursive",
        action="store_true",
        help="Recursively scan sub-directories for images.",
    )

    _add_detection_args(count_parser)

    count_parser.set_defaults(handler=_handle_count)


def _add_detection_args(parser: argparse.ArgumentParser) -> None:
    """Add engine parameter arguments to the provided parser."""
    parser.add_argument("--global-thresh", type=int, default=127, dest="global_thresh")
    parser.add_argument("--adaptive-block-size", type=int, default=21, dest="adaptive_block_size")
    parser.add_argument("--adaptive-C", type=int, default=4, dest="adaptive_C")
    parser.add_argument("--morph-kernel-size", type=int, default=3, dest="morph_kernel_size")
    parser.add_argument("--opening-iterations", type=int, default=2, dest="opening_iterations")
    parser.add_argument("--dilation-iterations", type=int, default=3, dest="dilation_iterations")
    parser.add_argument("--closing-iterations", type=int, default=6, dest="closing_iterations")
    parser.add_argument("--min-area", type=int, default=525, dest="min_area")
    parser.add_argument("--max-area", type=int, default=15000, dest="max_area")
    parser.add_argument("--clahe-clip-limit", type=float, default=2.0, dest="clahe_clip_limit")
    parser.add_argument("--clahe-tile-grid-size", type=int, default=8, dest="clahe_tile_grid_size")


def main(argv: Sequence[str] | None = None) -> int:
    """Entry point for console_scripts."""
    parser = build_parser()
    args = parser.parse_args(argv)

    handler: Callable[[argparse.Namespace], int] | None = getattr(args, "handler", None)
    if handler is None:
        parser.print_help()
        return 1

    try:
        return handler(args)
    except KeyboardInterrupt:
        print("Aborted by user.", file=sys.stderr)
        return 130
    except Exception as exc:  # pragma: no cover - exercised via tests but message irrelevant
        print(f"Error: {exc}", file=sys.stderr)
        return 1


def _handle_count(args: argparse.Namespace) -> int:
    """Implementation for the `softagar count` command."""
    input_path = args.input.expanduser().resolve()
    if not input_path.exists():
        raise FileNotFoundError(f"Input path not found: {input_path}")

    images = _collect_images(input_path, recursive=args.recursive)
    if not images:
        raise ValueError(f"No images found under {input_path}")

    params = _extract_params(args)

    results = []
    for image_path in images:
        img = io_utils.load_image(image_path)
        detection = detect_colonies(img, **params)
        filename = str(image_path.relative_to(input_path) if input_path.is_dir() else image_path.name)
        results.append(
            {
                "filename": filename,
                "count": detection["count"],
                **params,
            }
        )

    output_path = args.output.expanduser().resolve()
    io_utils.write_results_csv(results, output_path)
    print(f"Wrote {len(results)} result(s) to {output_path}")
    return 0


def _collect_images(root: Path, recursive: bool) -> List[Path]:
    """Return a sorted list of image paths starting from root."""
    if root.is_file():
        if _is_image(root):
            return [root]
        raise ValueError(f"Input file is not a supported image: {root}")

    iterator: Iterable[Path]
    iterator = root.rglob("*") if recursive else root.glob("*")
    images = [path for path in iterator if path.is_file() and _is_image(path)]
    return sorted(images)


def _is_image(path: Path) -> bool:
    return path.suffix.lower() in IMAGE_SUFFIXES


def _extract_params(args: argparse.Namespace) -> Dict[str, int | float]:
    """Extract engine parameters from argparse Namespace."""
    return {
        "global_thresh": args.global_thresh,
        "adaptive_block_size": args.adaptive_block_size,
        "adaptive_C": args.adaptive_C,
        "morph_kernel_size": args.morph_kernel_size,
        "opening_iterations": args.opening_iterations,
        "dilation_iterations": args.dilation_iterations,
        "closing_iterations": args.closing_iterations,
        "min_area": args.min_area,
        "max_area": args.max_area,
        "clahe_clip_limit": args.clahe_clip_limit,
        "clahe_tile_grid_size": args.clahe_tile_grid_size,
    }


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())


