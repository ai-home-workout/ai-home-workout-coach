"""영상 → 좌표 JSON 추출 (영상이 있을 때만 써요. 기본은 웹 앱 좌표 녹화).

출력 형식은 shared/README.md ①과 같아요. 웹(MediaPipe JS)과 같은 형식이어야 해요.

사용법:
    python extract/extract_pose.py <영상> -o data/coords/P01_side_good_01.json
    python extract/extract_pose.py <영상 폴더> -o data/coords/        (폴더 안 영상 전부)
    python extract/extract_pose.py <영상> --view front -o out.json     (방향 직접 지정)

- 방향(--view)을 안 주면 파일 이름의 `_side_` / `_front_`로 정해요(촬영 가이드의 파일 이름 규칙).
- 모델: models/pose_landmarker_full.task (README의 다운로드 안내)
- 영상 원본은 저장소에 넣지 않아요. 결과 JSON만 data/coords/에 올려요.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

LANDMARK_COUNT = 33
VIEWS = ("side", "front")
VIDEO_EXTS = {".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"}
DEFAULT_MODEL = Path("models/pose_landmarker_full.task")


def to_frame(t_ms: float, landmarks) -> dict:
    """MediaPipe 관절 33개 → 좌표 프레임 dict. landmarks는 x, y, z, visibility 속성을 가진 객체 목록."""
    if len(landmarks) != LANDMARK_COUNT:
        raise ValueError(f"관절이 {LANDMARK_COUNT}개가 아니에요: {len(landmarks)}")
    return {
        "t": round(float(t_ms), 1),
        "landmarks": [
            {
                "x": round(float(lm.x), 4),
                "y": round(float(lm.y), 4),
                "z": round(float(lm.z), 4),
                "visibility": round(float(lm.visibility if lm.visibility is not None else 0.0), 3),
            }
            for lm in landmarks
        ],
    }


def build_video_doc(
    video_name: str, fps: float, view: str, frames: list[dict], aspect: float | None = None
) -> dict:
    """영상 하나의 좌표 JSON 문서. aspect는 화면 너비 ÷ 높이."""
    if view not in VIEWS:
        raise ValueError(f"view는 {VIEWS} 중 하나예요: {view}")
    doc = {"video": video_name, "fps": fps, "view": view}
    if aspect is not None:
        doc["aspect"] = round(float(aspect), 4)
    doc["frames"] = frames
    return doc


def guess_view(path: Path) -> str | None:
    """파일 이름에서 방향 추측: P01_side_good_01.mp4 → 'side'"""
    parts = path.stem.lower().split("_")
    for view in VIEWS:
        if view in parts:
            return view
    return None


def extract_video(video_path: Path, model_path: Path = DEFAULT_MODEL) -> tuple[float, float, list[dict]]:
    """영상 하나에서 프레임마다 관절을 뽑아 (fps, aspect, frames)를 돌려줘요.

    사람이 안 잡힌 프레임은 frames에 넣지 않아요(판정 로직이 t 간격으로 알 수 있어요).
    """
    import cv2  # 무거운 패키지라 실제로 추출할 때만 불러요
    import mediapipe as mp
    from mediapipe.tasks.python import BaseOptions
    from mediapipe.tasks.python import vision

    if not model_path.exists():
        raise FileNotFoundError(f"모델 파일이 없어요: {model_path} (README의 다운로드 안내를 봐요)")

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise OSError(f"영상을 열 수 없어요: {video_path}")
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0

    options = vision.PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=str(model_path)),
        running_mode=vision.RunningMode.VIDEO,
        num_poses=1,
    )
    frames: list[dict] = []
    aspect = None
    index = 0
    with vision.PoseLandmarker.create_from_options(options) as landmarker:
        while True:
            ok, bgr = cap.read()
            if not ok:
                break
            if aspect is None:
                h, w = bgr.shape[:2]  # 스마트폰 세로 영상은 OpenCV가 회전을 반영한 크기를 줘요
                aspect = w / h
            t_ms = index * 1000.0 / fps
            rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
            image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            result = landmarker.detect_for_video(image, int(round(t_ms)))
            if result.pose_landmarks:
                frames.append(to_frame(t_ms, result.pose_landmarks[0]))
            index += 1
    cap.release()
    return fps, aspect or 1.0, frames


def main() -> None:
    parser = argparse.ArgumentParser(description="영상 → 좌표 JSON")
    parser.add_argument("input", type=Path, help="영상 파일 또는 폴더")
    parser.add_argument("--view", choices=VIEWS, help="카메라 방향 (생략하면 파일 이름으로 추측)")
    parser.add_argument("-o", "--out", type=Path, required=True, help="출력 JSON 파일 또는 폴더")
    parser.add_argument("--model", type=Path, default=DEFAULT_MODEL)
    args = parser.parse_args()

    if args.input.is_dir():
        videos = sorted(p for p in args.input.iterdir() if p.suffix.lower() in VIDEO_EXTS)
    else:
        videos = [args.input]
    if not videos:
        parser.error(f"영상이 없어요: {args.input}")
    if len(videos) > 1 and args.out.suffix == ".json":
        parser.error("영상이 여러 개면 -o에 폴더를 줘요")

    for video in videos:
        view = args.view or guess_view(video)
        if view is None:
            print(f"건너뜀 {video.name}: 방향을 알 수 없어요 (--view를 주거나 파일 이름에 _side_/_front_)")
            continue
        fps, aspect, frames = extract_video(video, args.model)
        out = args.out if args.out.suffix == ".json" else args.out / f"{video.stem}.json"
        out.parent.mkdir(parents=True, exist_ok=True)
        doc = build_video_doc(video.name, fps, view, frames, aspect)
        out.write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")
        print(f"{video.name}: {view}, 사람이 잡힌 프레임 {len(frames)}개 → {out}")


if __name__ == "__main__":
    main()
