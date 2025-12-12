import csv
import tempfile
from pathlib import Path
from typing import List
import unittest

import numpy as np

from softagar import io
from softagar import cli


class TestCLI(unittest.TestCase):
    def setUp(self) -> None:
        self.tmpdir = tempfile.TemporaryDirectory()
        self.tmp_path = Path(self.tmpdir.name)

    def tearDown(self) -> None:
        self.tmpdir.cleanup()

    def _create_dummy_image(self, path: Path) -> None:
        data = np.zeros((32, 32, 3), dtype=np.uint8)
        path.parent.mkdir(parents=True, exist_ok=True)
        io.save_image(path, data)

    def test_count_command_writes_csv(self) -> None:
        input_dir = self.tmp_path / "images"
        self._create_dummy_image(input_dir / "plate_1.png")
        self._create_dummy_image(input_dir / "nested" / "plate_2.png")

        output_csv = self.tmp_path / "results.csv"
        exit_code = cli.main(
            [
                "count",
                "--input",
                str(input_dir),
                "--output",
                str(output_csv),
                "--recursive",
            ]
        )

        self.assertEqual(exit_code, 0)
        self.assertTrue(output_csv.exists())

        with output_csv.open() as handle:
            rows: List[List[str]] = list(csv.reader(handle))

        self.assertGreater(len(rows), 1)
        header = rows[0]
        self.assertIn("filename", header)
        self.assertIn("count", header)

    def test_count_command_errors_without_images(self) -> None:
        empty_dir = self.tmp_path / "empty"
        empty_dir.mkdir()
        exit_code = cli.main(["count", "--input", str(empty_dir)])
        self.assertNotEqual(exit_code, 0)


if __name__ == "__main__":
    unittest.main()


