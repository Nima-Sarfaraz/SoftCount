import unittest

import cv2
import numpy as np

from softagar.engine import detect_colonies


class TestDetectColonies(unittest.TestCase):
    def test_detect_colonies_returns_expected_keys(self) -> None:
        img = np.zeros((64, 64, 3), dtype=np.uint8)
        result = detect_colonies(img)
        self.assertIn("count", result)
        self.assertIn("colonies", result)
        self.assertIn("mask", result)
        self.assertIn("annotated", result)
        self.assertEqual(result["mask"].shape, img.shape[:2])
        self.assertEqual(result["annotated"].shape, img.shape)

    def test_detect_colonies_identifies_synthetic_disks(self) -> None:
        img = np.full((256, 256, 3), 240, dtype=np.uint8)
        centers = [(80, 80), (180, 150)]
        for center in centers:
            cv_center = (int(center[0]), int(center[1]))
            radius = 25
            # Dark disks on a light background.
            cv2.circle(img, cv_center, radius, (40, 40, 40), -1)

        result = detect_colonies(
            img,
            global_thresh=150,
            adaptive_block_size=25,
            adaptive_C=2,
            morph_kernel_size=5,
            opening_iterations=1,
            dilation_iterations=1,
            closing_iterations=2,
            min_area=1000,
            max_area=5000,
            clahe_clip_limit=1.5,
            clahe_tile_grid_size=8,
        )

        self.assertGreaterEqual(result["count"], 2)
        self.assertTrue(all("x" in colony and "y" in colony for colony in result["colonies"]))


if __name__ == "__main__":
    unittest.main()


