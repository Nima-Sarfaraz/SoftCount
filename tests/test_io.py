import tempfile
from pathlib import Path
import unittest

import cv2
import numpy as np
from PIL import Image

from softagar import io
from softagar.engine import detect_colonies


class TestLoadImage(unittest.TestCase):
    def test_16bit_tiff_is_rescaled_not_clipped(self) -> None:
        # 12-bit data in a 16-bit container, as many microscope cameras save it.
        img16 = np.full((256, 256), 3500, dtype=np.uint16)
        cv2.circle(img16, (128, 128), 25, 600, -1)

        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "plate16.tif"
            Image.fromarray(img16).save(path)
            img = io.load_image(path)

        self.assertEqual(img.dtype, np.uint8)
        self.assertEqual(img.shape, (256, 256, 3))
        self.assertEqual(int(img.max()), 255)
        self.assertEqual(int(img.min()), 0)

        result = detect_colonies(img, min_area=1000, max_area=5000)
        self.assertEqual(result["count"], 1)


if __name__ == "__main__":
    unittest.main()
