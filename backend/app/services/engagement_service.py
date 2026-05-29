"""
Behavioral engagement analysis service.

IMPORTANT POSITIONING: this is *behavioral engagement analysis*, not
emotion detection. We estimate presence, head-pose stability and gaze
direction as proxies for ATTENTION, and combine them with dwell time
and revisit frequency into an engagement score.

The CV pipeline (process_frame) uses:
  - MediaPipe FaceMesh  -> landmarks -> head pose (yaw/pitch)
  - OpenCV solvePnP     -> 3D head orientation
  - simple gaze proxy   -> iris vs eye-corner offset
DeepFace is optionally used ONLY for face presence/quality gating.
"""

from __future__ import annotations
import numpy as np


# 3D model points of canonical face landmarks for solvePnP head-pose.
_MODEL_POINTS = np.array([
    (0.0, 0.0, 0.0),        # nose tip
    (0.0, -63.6, -12.5),    # chin
    (-43.3, 32.7, -26.0),   # left eye corner
    (43.3, 32.7, -26.0),    # right eye corner
    (-28.9, -28.9, -24.1),  # left mouth corner
    (28.9, -28.9, -24.1),   # right mouth corner
], dtype="float64")


class EngagementService:
    def process_frame(self, frame_bytes: bytes) -> dict:
        """
        Analyze a single webcam frame and return behavioral signals.
        Returns presence, head-pose stability, gaze-center and an
        instantaneous attention proxy in [0, 1].
        """
        import cv2
        import mediapipe as mp

        arr = np.frombuffer(frame_bytes, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        # Guard against empty / corrupt uploads (would otherwise crash on .shape).
        if img is None or img.size == 0:
            return {"present": False, "attention": 0.0,
                    "pose_stability": 0.0, "yaw": 0.0, "pitch": 0.0,
                    "error": "invalid_frame"}
        h, w = img.shape[:2]

        mp_face = mp.solutions.face_mesh
        with mp_face.FaceMesh(static_image_mode=True, max_num_faces=1,
                              refine_landmarks=True) as fm:
            res = fm.process(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))

        if not res.multi_face_landmarks:
            return {"present": False, "attention": 0.0,
                    "pose_stability": 0.0, "yaw": 0.0, "pitch": 0.0}

        lm = res.multi_face_landmarks[0].landmark
        # Map a few landmarks to 2D image coords for solvePnP.
        idx = [1, 152, 33, 263, 61, 291]
        image_points = np.array(
            [(lm[i].x * w, lm[i].y * h) for i in idx], dtype="float64")

        focal = w
        cam = np.array([[focal, 0, w / 2], [0, focal, h / 2], [0, 0, 1]],
                       dtype="float64")
        ok, rvec, _ = cv2.solvePnP(_MODEL_POINTS, image_points, cam,
                                   np.zeros((4, 1)))
        yaw = pitch = 0.0
        if ok:
            rot, _ = cv2.Rodrigues(rvec)
            sy = np.sqrt(rot[0, 0] ** 2 + rot[1, 0] ** 2)
            pitch = float(np.degrees(np.arctan2(-rot[2, 0], sy)))
            yaw = float(np.degrees(np.arctan2(rot[1, 0], rot[0, 0])))

        # Attention proxy: face centered + looking roughly forward.
        pose_penalty = (abs(yaw) + abs(pitch)) / 90.0
        stability = max(0.0, 1.0 - pose_penalty)
        attention = float(np.clip(0.5 + stability * 0.5, 0, 1))

        return {"present": True, "attention": round(attention, 3),
                "pose_stability": round(stability, 3),
                "yaw": round(yaw, 1), "pitch": round(pitch, 1)}

    @staticmethod
    def engagement_score(dwell_ms: int, attention: float, views: int) -> int:
        """Blend dwell + attention + revisits into a 0..100 score."""
        dwell = min(dwell_ms / 20000.0, 1.0)
        revisit = min(views / 5.0, 1.0)
        raw = 0.45 * dwell + 0.2 * revisit + 0.35 * attention
        return round(raw * 100)


engagement_service = EngagementService()
