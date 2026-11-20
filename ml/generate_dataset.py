#!/usr/bin/env python3
"""
MargAI Road Hazard Dataset Generator
Google Startup Buildathon India 2026

Generates synthetic, physically grounded road perception training and validation datasets
for detecting:
  - Class 0: pothole (asphalt craters, cavities, cracked edges)
  - Class 1: animal (stray cattle, cows, dogs on or near carriageway)
  - Class 2: pedestrian (people crossing, standing on road shoulders)

Includes non-target distractor features (tar patches, flyover shadows, lane dividers)
to train the model to suppress false positives as specified in Slide 05.
"""

import os
import random
import math
import cv2
import numpy as np
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent
DATASET_DIR = BASE_DIR / "datasets" / "margai_hazard"
TRAIN_IMG_DIR = DATASET_DIR / "images" / "train"
VAL_IMG_DIR = DATASET_DIR / "images" / "val"
TRAIN_LBL_DIR = DATASET_DIR / "labels" / "train"
VAL_LBL_DIR = DATASET_DIR / "labels" / "val"
TEST_IMG_DIR = BASE_DIR / "test_samples"

# Classes
CLASS_NAMES = ["pothole", "animal", "pedestrian"]
IMG_W, IMG_H = 640, 640


def ensure_dirs():
    for d in [TRAIN_IMG_DIR, VAL_IMG_DIR, TRAIN_LBL_DIR, VAL_LBL_DIR, TEST_IMG_DIR]:
        d.mkdir(parents=True, exist_ok=True)


def draw_road_background(w, h, time_of_day="day"):
    """Renders a perspective road carriageway with horizon and lane lines."""
    img = np.zeros((h, w, 3), dtype=np.uint8)

    # Sky gradient
    if time_of_day == "day":
        sky_top = (235, 206, 135)     # Soft blue
        sky_bot = (250, 240, 210)     # Hazy horizon
        asphalt_base = (75, 75, 75)
        shoulder_color = (60, 90, 70)  # Vegetated verge
    elif time_of_day == "dusk":
        sky_top = (110, 80, 160)      # Purple/orange dusk
        sky_bot = (70, 130, 220)
        asphalt_base = (50, 50, 55)
        shoulder_color = (40, 55, 45)
    else:  # "rainy/monsoon"
        sky_top = (120, 125, 130)     # Overcast grey
        sky_bot = (145, 150, 155)
        asphalt_base = (40, 42, 45)   # Wet dark asphalt
        shoulder_color = (45, 60, 50)

    horizon_y = int(h * 0.40)

    # Fill sky
    for y in range(horizon_y):
        t = y / max(1, horizon_y)
        col = tuple(int(sky_top[c] * (1 - t) + sky_bot[c] * t) for c in range(3))
        img[y, :] = col

    # Fill ground / shoulders
    img[horizon_y:, :] = shoulder_color

    # Add road carriageway trapezoid
    road_top_w = int(w * 0.22)
    road_bot_w = int(w * 0.88)
    road_center = w // 2

    road_pts = np.array([
        [road_center - road_top_w // 2, horizon_y],
        [road_center + road_top_w // 2, horizon_y],
        [road_center + road_bot_w // 2, h],
        [road_center - road_bot_w // 2, h],
    ], dtype=np.int32)

    cv2.fillPoly(img, [road_pts], asphalt_base)

    # Asphalt noise / texture
    noise = np.random.normal(0, 7, (h - horizon_y, w, 3)).astype(np.int16)
    road_mask = np.zeros((h, w), dtype=np.uint8)
    cv2.fillPoly(road_mask, [road_pts], 255)
    road_crop = img[horizon_y:, :].astype(np.int16) + noise
    road_crop = np.clip(road_crop, 0, 255).astype(np.uint8)
    img[horizon_y:, :] = np.where(road_mask[horizon_y:, :, None] == 255, road_crop, img[horizon_y:, :])

    # Road shoulder solid lines
    cv2.line(img, (road_center - road_top_w // 2, horizon_y), (road_center - road_bot_w // 2, h), (240, 240, 240), 3)
    cv2.line(img, (road_center + road_top_w // 2, horizon_y), (road_center + road_bot_w // 2, h), (40, 200, 240), 3)  # Yellow curb line

    # Broken center lane dashes
    num_dashes = 9
    for i in range(num_dashes):
        t0 = i / num_dashes
        t1 = (i + 0.5) / num_dashes
        y0 = int(horizon_y * (1 - t0) + h * t0)
        y1 = int(horizon_y * (1 - t1) + h * t1)
        thickness = max(2, int(2 + 6 * t0))
        cv2.line(img, (road_center, y0), (road_center, y1), (250, 250, 250), thickness)

    # Distractor 1: Tar Patches (Smooth black bitumen - NOT a pothole)
    if random.random() < 0.4:
        ty = random.randint(int(h * 0.55), int(h * 0.85))
        tx = random.randint(int(w * 0.35), int(w * 0.65))
        tw = random.randint(40, 90)
        th = random.randint(15, 35)
        tar_overlay = img.copy()
        cv2.ellipse(tar_overlay, (tx, ty), (tw // 2, th // 2), random.randint(-15, 15), 0, 360, (25, 25, 28), -1)
        cv2.addWeighted(tar_overlay, 0.7, img, 0.3, 0, img)

    # Distractor 2: Diagonal Flyover / Tree Shadows (NOT a pothole)
    if random.random() < 0.45:
        shadow_overlay = img.copy()
        sy = random.randint(int(h * 0.45), int(h * 0.80))
        sh_poly = np.array([
            [0, sy],
            [w, sy - random.randint(30, 80)],
            [w, sy + random.randint(40, 90)],
            [0, sy + random.randint(70, 130)],
        ], dtype=np.int32)
        cv2.fillPoly(shadow_overlay, [sh_poly], (15, 18, 22))
        cv2.addWeighted(shadow_overlay, 0.45, img, 0.55, 0, img)

    return img, (horizon_y, road_pts)


def draw_pothole(img, cx, cy, rx, ry, monsoon=False):
    """Renders a realistic road surface pothole cavity with depth shading."""
    overlay = img.copy()

    # Outer cracked irregular rim
    angle = random.randint(0, 180)
    cv2.ellipse(overlay, (cx, cy), (int(rx * 1.15), int(ry * 1.15)), angle, 0, 360, (30, 30, 30), 2)

    # Outer crater contour
    crater_col = (20, 20, 22) if not monsoon else (15, 25, 30)
    cv2.ellipse(overlay, (cx, cy), (rx, ry), angle, 0, 360, crater_col, -1)

    # Inner deep cavity shadow (depth indicator)
    core_rx = max(3, int(rx * 0.65))
    core_ry = max(2, int(ry * 0.65))
    core_cy = cy + int(ry * 0.15)
    cv2.ellipse(overlay, (cx, core_cy), (core_rx, core_ry), angle, 0, 360, (8, 8, 10), -1)

    # Water reflection if monsoon
    if monsoon or random.random() < 0.25:
        cv2.ellipse(overlay, (cx, core_cy), (int(core_rx * 0.7), int(core_ry * 0.5)), angle, 0, 180, (85, 105, 115), -1)

    # Blend crater naturally into asphalt
    cv2.addWeighted(overlay, 0.92, img, 0.08, 0, img)

    # Compute bounding box
    bbox_w = int(rx * 2.3)
    bbox_h = int(ry * 2.3)
    x1 = max(0, cx - bbox_w // 2)
    y1 = max(0, cy - bbox_h // 2)
    x2 = min(IMG_W - 1, cx + bbox_w // 2)
    y2 = min(IMG_H - 1, cy + bbox_h // 2)

    return x1, y1, x2, y2


def draw_animal(img, cx, cy, scale=1.0, animal_type="cow"):
    """Renders a realistic animal silhouette (cow/cattle or stray dog)."""
    overlay = img.copy()
    h, w, _ = img.shape

    # Cast shadow on ground
    shadow_w = int(45 * scale)
    shadow_h = int(12 * scale)
    cv2.ellipse(overlay, (cx, cy + int(20 * scale)), (shadow_w, shadow_h), 0, 0, 360, (15, 15, 20), -1)
    cv2.addWeighted(overlay, 0.55, img, 0.45, 0, img)

    # Colors
    if animal_type == "cow":
        body_cols = [(190, 195, 200), (45, 45, 50), (90, 60, 40), (140, 110, 80)]
        body_col = random.choice(body_cols)
        # Cow body (barrel)
        bw = int(38 * scale)
        bh = int(22 * scale)
        cv2.ellipse(img, (cx, cy), (bw, bh), 0, 0, 360, body_col, -1)
        # Head & neck
        direction = 1 if random.random() < 0.5 else -1
        head_x = cx + int(bw * 0.9 * direction)
        head_y = cy - int(bh * 0.5)
        cv2.circle(img, (head_x, head_y), int(12 * scale), body_col, -1)
        # Horns
        cv2.line(img, (head_x, head_y - int(6 * scale)), (head_x + int(4 * direction * scale), head_y - int(15 * scale)), (210, 210, 215), max(1, int(2 * scale)))
        # Legs
        leg_col = tuple(max(0, c - 20) for c in body_col)
        leg_h = int(24 * scale)
        leg_offsets = [-int(bw * 0.6), -int(bw * 0.3), int(bw * 0.3), int(bw * 0.6)]
        for off in leg_offsets:
            lx = cx + off
            ly0 = cy + int(bh * 0.6)
            ly1 = ly0 + leg_h
            cv2.line(img, (lx, ly0), (lx, ly1), leg_col, max(2, int(3 * scale)))

        # Bounding box
        total_w = int((bw * 2 + 18) * scale)
        total_h = int((bh * 2 + leg_h + 12) * scale)
        x1 = max(0, cx - total_w // 2 - int(5 * scale))
        y1 = max(0, head_y - int(16 * scale))
        x2 = min(w - 1, cx + total_w // 2 + int(5 * scale))
        y2 = min(h - 1, cy + int(bh * 0.6) + leg_h + 2)

    else:  # stray dog
        body_col = random.choice([(45, 75, 115), (35, 40, 45), (140, 160, 180)])
        bw = int(22 * scale)
        bh = int(12 * scale)
        cv2.ellipse(img, (cx, cy), (bw, bh), 0, 0, 360, body_col, -1)
        direction = 1 if random.random() < 0.5 else -1
        head_x = cx + int(bw * 0.85 * direction)
        head_y = cy - int(bh * 0.4)
        cv2.circle(img, (head_x, head_y), int(7 * scale), body_col, -1)
        # Legs
        for off in [-int(bw * 0.6), -int(bw * 0.2), int(bw * 0.2), int(bw * 0.6)]:
            cv2.line(img, (cx + off, cy + int(bh * 0.5)), (cx + off, cy + int(bh * 0.5) + int(14 * scale)), body_col, max(1, int(2 * scale)))

        total_w = int((bw * 2 + 12) * scale)
        total_h = int((bh * 2 + 16 * scale))
        x1 = max(0, cx - total_w // 2)
        y1 = max(0, head_y - int(8 * scale))
        x2 = min(w - 1, cx + total_w // 2)
        y2 = min(h - 1, cy + int(bh * 0.5) + int(14 * scale))

    return x1, y1, x2, y2


def draw_pedestrian(img, cx, cy, scale=1.0):
    """Renders a walking/standing pedestrian silhouette."""
    h, w, _ = img.shape
    overlay = img.copy()

    # Ground shadow
    shadow_w = int(14 * scale)
    shadow_h = int(6 * scale)
    cv2.ellipse(overlay, (cx, cy + int(36 * scale)), (shadow_w, shadow_h), 0, 0, 360, (20, 20, 20), -1)
    cv2.addWeighted(overlay, 0.6, img, 0.4, 0, img)

    # Clothing colors
    shirt_cols = [(210, 80, 50), (45, 140, 220), (220, 220, 225), (60, 160, 80), (180, 60, 160)]
    shirt_col = random.choice(shirt_cols)
    skin_col = (130, 165, 205)
    pants_col = (40, 45, 55)

    head_r = max(3, int(6 * scale))
    head_y = cy - int(24 * scale)

    # Head
    cv2.circle(img, (cx, head_y), head_r, skin_col, -1)

    # Torso
    torso_top = head_y + head_r
    torso_bot = torso_top + int(24 * scale)
    torso_w = max(4, int(10 * scale))
    cv2.rectangle(img, (cx - torso_w // 2, torso_top), (cx + torso_w // 2, torso_bot), shirt_col, -1)

    # Legs (walking stride)
    stride = int(7 * scale)
    leg_bot = torso_bot + int(28 * scale)
    cv2.line(img, (cx - 2, torso_bot), (cx - stride, leg_bot), pants_col, max(2, int(3 * scale)))
    cv2.line(img, (cx + 2, torso_bot), (cx + stride, leg_bot), pants_col, max(2, int(3 * scale)))

    # Arms
    cv2.line(img, (cx - torso_w // 2, torso_top + 2), (cx - stride - 2, torso_top + int(16 * scale)), shirt_col, max(1, int(2 * scale)))
    cv2.line(img, (cx + torso_w // 2, torso_top + 2), (cx + stride + 2, torso_top + int(16 * scale)), shirt_col, max(1, int(2 * scale)))

    # Bounding box
    total_w = max(16, int(24 * scale))
    total_h = max(30, int(62 * scale))
    x1 = max(0, cx - total_w // 2)
    y1 = max(0, head_y - head_r - 2)
    x2 = min(w - 1, cx + total_w // 2)
    y2 = min(h - 1, leg_bot + 2)

    return x1, y1, x2, y2


def convert_to_yolo(x1, y1, x2, y2, img_w, img_h):
    """Converts pixel bounding box [x1, y1, x2, y2] to YOLO normalized [xc, yc, w, h]."""
    bw = max(2, x2 - x1)
    bh = max(2, y2 - y1)
    xc = (x1 + x2) / 2.0 / img_w
    yc = (y1 + y2) / 2.0 / img_h
    nw = bw / img_w
    nh = bh / img_h
    return round(xc, 6), round(yc, 6), round(nw, 6), round(nh, 6)


def generate_scene(split="train", sample_id=0):
    time_choices = ["day", "day", "dusk", "rainy"]
    time_of_day = random.choice(time_choices)
    img, (horizon_y, road_pts) = draw_road_background(IMG_W, IMG_H, time_of_day)

    labels = []

    # Number of objects in this frame (1 to 4)
    num_objects = random.randint(1, 4)
    placed_types = set()

    # Ensure a good distribution of pothole, animal, pedestrian
    choices = [0, 1, 2]
    random.shuffle(choices)

    for i in range(num_objects):
        obj_class = choices[i % len(choices)]
        # Y position on road (perspective scale: lower in image = closer to camera = larger scale)
        y_norm = random.uniform(0.48, 0.90)
        cy = int(IMG_H * y_norm)

        # Scale based on perspective distance
        persp_scale = 0.45 + (y_norm - 0.45) * 1.6  # 0.45 at horizon to 1.15 near bottom

        # X position roughly within carriageway or near shoulder
        road_spread = int((IMG_W * 0.25) * (0.5 + 1.2 * (y_norm - 0.45)))
        cx = IMG_W // 2 + random.randint(-road_spread, road_spread)
        cx = max(int(IMG_W * 0.15), min(int(IMG_W * 0.85), cx))

        if obj_class == 0:  # pothole
            rx = int(random.randint(18, 48) * persp_scale)
            ry = int(random.randint(9, 24) * persp_scale)
            monsoon = (time_of_day == "rainy")
            x1, y1, x2, y2 = draw_pothole(img, cx, cy, rx, ry, monsoon=monsoon)
            xc, yc, nw, nh = convert_to_yolo(x1, y1, x2, y2, IMG_W, IMG_H)
            labels.append(f"0 {xc} {yc} {nw} {nh}")

        elif obj_class == 1:  # animal
            animal_type = "cow" if random.random() < 0.7 else "dog"
            x1, y1, x2, y2 = draw_animal(img, cx, cy, scale=persp_scale, animal_type=animal_type)
            xc, yc, nw, nh = convert_to_yolo(x1, y1, x2, y2, IMG_W, IMG_H)
            labels.append(f"1 {xc} {yc} {nw} {nh}")

        elif obj_class == 2:  # pedestrian
            x1, y1, x2, y2 = draw_pedestrian(img, cx, cy, scale=persp_scale)
            xc, yc, nw, nh = convert_to_yolo(x1, y1, x2, y2, IMG_W, IMG_H)
            labels.append(f"2 {xc} {yc} {nw} {nh}")

    # Save image and label
    filename = f"road_scene_{sample_id:04d}"
    if split == "train":
        img_path = TRAIN_IMG_DIR / f"{filename}.jpg"
        lbl_path = TRAIN_LBL_DIR / f"{filename}.txt"
    elif split == "val":
        img_path = VAL_IMG_DIR / f"{filename}.jpg"
        lbl_path = VAL_LBL_DIR / f"{filename}.txt"
    else:
        img_path = TEST_IMG_DIR / f"{filename}.jpg"
        lbl_path = None

    cv2.imwrite(str(img_path), img, [cv2.IMWRITE_JPEG_QUALITY, 92])
    if lbl_path:
        with open(lbl_path, "w") as f:
            f.write("\n".join(labels) + "\n")

    return img_path, labels


def write_yaml_config():
    """Writes data.yaml for YOLO training."""
    yaml_content = f"""# MargAI Road Hazard Perception Dataset
# Google Startup Buildathon India 2026

path: {DATASET_DIR.resolve()}
train: images/train
val: images/val

# Classes
names:
  0: pothole
  1: animal
  2: pedestrian

nc: 3
"""
    yaml_path = BASE_DIR / "data.yaml"
    with open(yaml_path, "w") as f:
        f.write(yaml_content)
    print(f"✓ Config written to: {yaml_path}")


def main():
    print("=" * 65)
    print("🚦 MargAI Road Hazard Dataset Generator (Pothole, Animal, Pedestrian)")
    print("=" * 65)
    ensure_dirs()

    train_count = 180
    val_count = 45
    test_count = 15

    print(f"Generating {train_count} training samples...")
    for i in range(train_count):
        generate_scene("train", i)

    print(f"Generating {val_count} validation samples...")
    for i in range(val_count):
        generate_scene("val", 1000 + i)

    print(f"Generating {test_count} standalone test benchmark samples...")
    for i in range(test_count):
        generate_scene("test", 2000 + i)

    write_yaml_config()
    print("=" * 65)
    print(f"✓ Dataset generation complete!")
    print(f"  Train: {train_count} images -> {TRAIN_IMG_DIR}")
    print(f"  Val:   {val_count} images   -> {VAL_IMG_DIR}")
    print(f"  Test:  {test_count} images  -> {TEST_IMG_DIR}")
    print("=" * 65)


if __name__ == "__main__":
    main()
