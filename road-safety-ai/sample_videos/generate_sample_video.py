"""
Generates a realistic test video for Road Safety AI validation.
Includes curved road geometry, lane markings, approaching vehicle,
crossing animal, pedestrian, and potholes for full end-to-end pipeline testing.
"""

import os
import cv2
import numpy as np

def generate_road_sample_video(
    output_path: str = "road-safety-ai/sample_videos/road_sample.mp4",
    num_frames: int = 150,
    fps: int = 30,
    width: int = 640,
    height: int = 360
):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    print(f"Synthesizing {num_frames} frames of road driving scenario to {output_path}...")

    # Road perspective parameters
    horizon_y = int(height * 0.52)

    for i in range(num_frames):
        frame = np.zeros((height, width, 3), dtype=np.uint8)
        
        # 1. Sky & Ground
        frame[:horizon_y, :] = (180, 160, 140) # Daylight hazy sky
        frame[horizon_y:, :] = (50, 52, 54)     # Asphalt road surface

        # 2. Road boundaries with subtle curving dynamics
        t = i / float(num_frames)
        curve_offset = int(40 * np.sin(t * 3.1415 * 2))
        
        # Left and Right road edges
        left_top = (int(width * 0.44 + curve_offset), horizon_y)
        left_bot = (int(width * 0.08), height)
        right_top = (int(width * 0.56 + curve_offset), horizon_y)
        right_bot = (int(width * 0.92), height)

        road_poly = np.array([left_top, right_top, right_bot, left_bot], dtype=np.int32)
        cv2.fillPoly(frame, [road_poly], (65, 68, 70))

        # Lane markings (dashed center line)
        for d in range(8):
            seg_t = ((d * 0.125) + (i * 0.04)) % 1.0
            y1 = int(horizon_y + (height - horizon_y) * (seg_t ** 1.8))
            y2 = int(horizon_y + (height - horizon_y) * (min(1.0, seg_t + 0.05) ** 1.8))
            if y1 >= height or y2 >= height or y1 < horizon_y:
                continue
            
            x_center = int((width * 0.50 + curve_offset * (1.0 - seg_t)))
            thickness = max(1, int(1 + 4 * seg_t))
            cv2.line(frame, (x_center, y1), (x_center, y2), (255, 255, 255), thickness)

        # 3. Dynamic Hazard 1: Approaching Pothole on Right Lane
        # Appears around frame 20, grows as vehicle approaches
        if 20 <= i <= 90:
            p_t = (i - 20) / 70.0
            py = int(horizon_y + (height - horizon_y) * (p_t ** 1.6))
            px = int(width * 0.62 + (width * 0.12) * p_t)
            prad_x = int(6 + 28 * p_t)
            prad_y = int(3 + 14 * p_t)
            cv2.ellipse(frame, (px, py), (prad_x, prad_y), 0, 0, 360, (20, 20, 20), -1)
            cv2.ellipse(frame, (px, py), (prad_x, prad_y), 0, 0, 360, (10, 10, 10), 2)

        # 4. Dynamic Hazard 2: Animal Crossing from Left Shoulder into Road
        # Active between frames 60 and 140
        if 60 <= i <= 140:
            a_t = (i - 60) / 80.0
            ay = int(horizon_y + (height - horizon_y) * 0.65)
            # Moves from x = 0.15 to x = 0.55 (crossing lane)
            ax = int(width * (0.15 + 0.40 * a_t))
            aw = 36
            ah = 28
            # Draw cow/animal shape (torso + head)
            cv2.rectangle(frame, (ax - aw//2, ay - ah), (ax + aw//2, ay), (130, 110, 80), -1)
            cv2.circle(frame, (ax + aw//2 + 4, ay - ah + 6), 8, (120, 100, 75), -1)

        # 5. Dynamic Hazard 3: Pedestrian Walking along Right Shoulder
        if 10 <= i <= 120:
            ped_t = (i - 10) / 110.0
            pedy = int(horizon_y + (height - horizon_y) * (0.4 + 0.5 * ped_t))
            pedx = int(width * (0.82 + 0.05 * ped_t))
            ped_h = int(18 + 35 * ped_t)
            ped_w = int(ped_h * 0.35)
            # Body & head
            cv2.rectangle(frame, (pedx - ped_w//2, pedy - ped_h), (pedx + ped_w//2, pedy), (40, 60, 180), -1)
            cv2.circle(frame, (pedx, pedy - ped_h - int(ped_w * 0.6)), int(ped_w * 0.6), (200, 180, 160), -1)

        out.write(frame)

    out.release()
    print(f"Sample road video generated successfully: {output_path}")

if __name__ == "__main__":
    generate_road_sample_video()
