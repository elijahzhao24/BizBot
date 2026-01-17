import cv2
import numpy as np
import json
import os
from datetime import datetime
from ultralytics import YOLO
from sklearn.cluster import DBSCAN

# --------------------
# Config
# --------------------
PERSON_CLASS_ID = 0
GROUP_DISTANCE = 150
PHOTO_AREA_THRESHOLD = 0.35
OBSTACLE_AREA_THRESHOLD = 0.50
EDGE_DENSITY_THRESHOLD = 0.15
OUTPUT_DIR = "cv_output"

# Create output directory if it doesn't exist
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Open log file for writing
log_file = os.path.join(OUTPUT_DIR, "detection_log.json")
log_fp = open(log_file, "w")

# --------------------
# Load model
# --------------------
model = YOLO("yolov8s.pt")
cap = cv2.VideoCapture(0)

print("CV system running. Press Q to quit.")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    h, w, _ = frame.shape
    frame_area = h * w

    results = model(frame, verbose=False)[0]

    people_boxes = []
    obstacle_boxes = []

    # --------------------
    # Separate people & obstacles
    # --------------------
    for box in results.boxes:
        cls = int(box.cls[0])
        x1, y1, x2, y2 = map(int, box.xyxy[0])

        if cls == PERSON_CLASS_ID:
            people_boxes.append((x1, y1, x2, y2))
        else:
            obstacle_boxes.append((x1, y1, x2, y2))

    # --------------------
    # Group detection
    # --------------------
    centroids = [
        [(x1 + x2) // 2, (y1 + y2) // 2]
        for x1, y1, x2, y2 in people_boxes
    ]

    group_detected = False
    if len(centroids) >= 2:
        clustering = DBSCAN(eps=GROUP_DISTANCE, min_samples=2).fit(centroids)
        labels = clustering.labels_
        group_detected = any(label != -1 for label in labels)

    # --------------------
    # Distance estimation
    # --------------------
    total_people_area = sum(
        (x2 - x1) * (y2 - y1)
        for x1, y1, x2, y2 in people_boxes
    )

    # --------------------
    # Obstacle detection (bbox-based)
    # --------------------
    obstacle_area = sum(
        (x2 - x1) * (y2 - y1)
        for x1, y1, x2, y2 in obstacle_boxes
    )
    obstacle_close = obstacle_area > OBSTACLE_AREA_THRESHOLD * frame_area

    # --------------------
    # Obstacle detection (edge-based)
    # --------------------
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 100, 200)
    edge_density = np.sum(edges > 0) / frame_area
    wall_detected = edge_density > EDGE_DENSITY_THRESHOLD

    # --------------------
    # Decision Logic
    # --------------------
    action = "SEARCH"

    if obstacle_close or wall_detected:
        action = "TURN_RIGHT"
    elif group_detected and total_people_area > PHOTO_AREA_THRESHOLD * frame_area and len(people_boxes) >= 5:
        action = "TAKE_PHOTO"
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        photo_path = os.path.join(OUTPUT_DIR, f"group_photo_{timestamp}.jpg")
        cv2.imwrite(photo_path, frame)
    elif group_detected:
        action = "MOVE_CLOSER"
    elif len(people_boxes) > 0:
        action = "MOVE_CLOSER"

    # --------------------
    # Visuals for demo
    # --------------------
    for x1, y1, x2, y2 in people_boxes:
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

    for x1, y1, x2, y2 in obstacle_boxes:
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)

    cv2.putText(
        frame,
        f"Action: {action}",
        (20, 40),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (255, 255, 255),
        2
    )

    cv2.imshow("BizBot Demo", frame)

    # log output as JSON
    log_data = {
        "people_count": len(people_boxes),
        "group_detected": group_detected,
        "edge_density": round(edge_density, 2),
        "obstacle_close": bool(obstacle_close),
        "wall_detected": bool(wall_detected),
        "action": action
    }
    print(json.dumps(log_data))
    log_fp.write(json.dumps(log_data) + "\n")
    log_fp.flush()

    # exit on'Q'
    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

# clean
cap.release()
cv2.destroyAllWindows()
log_fp.close()