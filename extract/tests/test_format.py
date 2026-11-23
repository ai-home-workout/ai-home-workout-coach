"""좌표 JSON 형식 테스트. mediapipe 없이 돌아가요.  실행: python -m unittest discover extract"""

import json
import unittest
from pathlib import Path
from types import SimpleNamespace

from extract.extract_pose import LANDMARK_COUNT, build_video_doc, guess_view, to_frame

ROOT = Path(__file__).resolve().parents[2]


def fake_landmarks(n=LANDMARK_COUNT):
    return [SimpleNamespace(x=0.5, y=0.4, z=-0.1, visibility=0.9) for _ in range(n)]


class FormatTest(unittest.TestCase):
    def test_frame_keys_match_web_fixture(self):
        """Python 출력이 JS 픽스처와 같은 키를 써요."""
        frame = to_frame(1234.56, fake_landmarks())
        fixture = json.loads((ROOT / "fixtures/side_good.json").read_text(encoding="utf-8"))
        self.assertEqual(set(frame), set(fixture["frames"][0]))
        self.assertEqual(set(frame["landmarks"][0]), set(fixture["frames"][0]["landmarks"][0]))
        self.assertEqual(len(frame["landmarks"]), LANDMARK_COUNT)
        self.assertEqual(frame["t"], 1234.6)

    def test_wrong_landmark_count(self):
        with self.assertRaises(ValueError):
            to_frame(0, fake_landmarks(10))

    def test_video_doc(self):
        doc = build_video_doc("P01_side_good_01.mp4", 30, "side", [])
        self.assertEqual(set(doc), {"video", "fps", "view", "frames"})
        doc = build_video_doc("P01_side_good_01.mp4", 30, "side", [], aspect=1920 / 1080)
        self.assertEqual(doc["aspect"], 1.7778)
        with self.assertRaises(ValueError):
            build_video_doc("x.mp4", 30, "top", [])


    def test_guess_view(self):
        self.assertEqual(guess_view(Path("P01_side_good_01.mp4")), "side")
        self.assertEqual(guess_view(Path("P02_front_valgus_01.MOV")), "front")
        self.assertIsNone(guess_view(Path("sideways.mp4")))


if __name__ == "__main__":
    unittest.main()
