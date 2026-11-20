"""
Road Safety AI - Interactive Real-Time Monitoring Dashboard
Features:
- Live video stream monitoring (webcam, uploaded video, mobile RTSP stream, or test samples)
- Automotive HUD overlay with bounding boxes, track IDs, velocity vectors, and road curve polygons
- Real-time hazard statistics (Potholes, Animals, Accidents, Sharp Curves, Pedestrians, Debris)
- Multi-factor risk breakdown (Low, Medium, High, Critical)
- Interactive GPS Hazard Map with color-coded markers and popups
- Filterable Event History Audit Table with CSV export
"""

import os
import sys
import time
import cv2
import pandas as pd
import numpy as np
import streamlit as st
from pathlib import Path
from PIL import Image

# Add root directory to sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))
parent_dir = ROOT_DIR.parent
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

from road_safety_ai.inference.pipeline import RoadSafetyPipeline
from road_safety_ai.alerts.alert_manager import AlertManager

# Page Configuration
st.set_page_config(
    page_title="Road Safety AI - Real-Time Road Hazard Command Center",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Styling (Dark Automotive Command Center)
st.markdown("""
<style>
    .stApp {
        background-color: #090D16;
        color: #E2E8F0;
    }
    .metric-card {
        background: rgba(30, 41, 59, 0.7);
        border: 1px solid #334155;
        border-radius: 8px;
        padding: 12px 16px;
        text-align: center;
    }
    .metric-val {
        font-size: 26px;
        font-weight: 700;
        margin: 4px 0;
    }
    .metric-label {
        font-size: 12px;
        color: #94A3B8;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    .alert-critical {
        background: rgba(234, 67, 53, 0.2);
        border-left: 4px solid #EA4335;
        padding: 8px 12px;
        border-radius: 4px;
        margin-bottom: 8px;
    }
    .alert-high {
        background: rgba(251, 188, 5, 0.2);
        border-left: 4px solid #FBBC05;
        padding: 8px 12px;
        border-radius: 4px;
        margin-bottom: 8px;
    }
    .alert-medium {
        background: rgba(66, 133, 244, 0.2);
        border-left: 4px solid #4285F4;
        padding: 8px 12px;
        border-radius: 4px;
        margin-bottom: 8px;
    }
</style>
""", unsafe_allow_html=True)

@st.cache_resource
def load_pipeline():
    weights_path = ROOT_DIR / "models" / "best.pt"
    w_str = str(weights_path) if weights_path.exists() else "yolo11n.pt"
    return RoadSafetyPipeline(model_path=w_str, conf_threshold=0.35)

def main():
    st.title("🛡️ Road Safety AI — Real-Time Hazard Command Center")
    st.caption("AI-Powered Real-Time Detection of Potholes, Animals, Accidents, Sharp Curves & Pedestrians")

    pipeline = load_pipeline()
    alert_mgr = AlertManager()

    # Sidebar Controls
    st.sidebar.header("🕹️ Stream Configuration")
    input_source = st.sidebar.selectbox(
        "Video Input Source",
        ["Sample Road Video", "Upload Video File", "Live Laptop Webcam", "Single Test Image", "Mobile / RTSP Stream"]
    )

    conf_slider = st.sidebar.slider("Confidence Threshold", 0.15, 0.90, 0.35, 0.05)
    pipeline.conf_thresh = conf_slider

    enable_audio = st.sidebar.checkbox("Enable Acoustic Warnings", value=True)
    pipeline.sound_manager.enabled = enable_audio

    st.sidebar.markdown("---")
    st.sidebar.subheader("📡 Hardware & Edge Telemetry")
    st.sidebar.info("Device: Apple Silicon MPS (Metal Performance Shaders)\nResolution: 320x320\nTarget Latency: <15ms")

    # Main Dashboard Tabs
    tab1, tab2, tab3 = st.tabs(["📺 Live Monitoring & HUD", "🗺️ Interactive GPS Hazard Map", "📋 Audit Event History"])

    with tab1:
        col_video, col_telemetry = st.columns([7, 3])

        # Prepare Video Source
        cap = None
        sample_img = None
        video_path = None

        if input_source == "Sample Road Video":
            # Check if sample video exists, else generate synthetic road drive
            sample_dir = ROOT_DIR / "sample_videos"
            sample_vid_path = sample_dir / "road_sample.mp4"
            if not sample_vid_path.exists():
                # Provide real test images loop or fallback
                img_candidates = list((ROOT_DIR / "datasets" / "road_hazard" / "images" / "val").glob("*.jpg"))
                if img_candidates:
                    sample_img = cv2.imread(str(img_candidates[0]))
            else:
                cap = cv2.VideoCapture(str(sample_vid_path))
        elif input_source == "Upload Video File":
            uploaded = st.sidebar.file_uploader("Upload MP4 / AVI Video", type=["mp4", "avi", "mov"])
            if uploaded is not None:
                tmp_path = str(ROOT_DIR / "sample_videos" / "uploaded_temp.mp4")
                with open(tmp_path, "wb") as f:
                    f.write(uploaded.read())
                cap = cv2.VideoCapture(tmp_path)
        elif input_source == "Live Laptop Webcam":
            cap = cv2.VideoCapture(0)
        elif input_source == "Single Test Image":
            img_candidates = list((ROOT_DIR / "datasets" / "road_hazard" / "images" / "val").glob("*.jpg"))
            if img_candidates:
                selected_img = st.sidebar.selectbox("Select Validation Image", [p.name for p in img_candidates])
                sample_img = cv2.imread(str(ROOT_DIR / "datasets" / "road_hazard" / "images" / "val" / selected_img))
        elif input_source == "Mobile / RTSP Stream":
            rtsp_url = st.sidebar.text_input("RTSP / HTTP Stream URL", "rtsp://192.168.1.100:8554/live")
            if st.sidebar.button("Connect Stream"):
                cap = cv2.VideoCapture(rtsp_url)

        # Video Display Frame
        with col_video:
            frame_placeholder = st.empty()
            
        with col_telemetry:
            st.subheader("📊 Live Telemetry & Risk")
            kpi_cols = st.columns(2)
            fps_metric = kpi_cols[0].empty()
            lat_metric = kpi_cols[1].empty()
            
            st.markdown("---")
            st.subheader("🚨 Active Hazard Alerts")
            alerts_container = st.empty()

        # Run frame processing
        if sample_img is not None:
            annotated, hazards, telemetry = pipeline.process_frame(sample_img)
            # Convert BGR to RGB for Streamlit
            rgb_frame = cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB)
            frame_placeholder.image(rgb_frame, use_container_width=True)
            
            fps_metric.metric("Measured FPS", f"{telemetry['fps']:.1f}")
            lat_metric.metric("Latency", f"{telemetry['latency_ms']:.1f} ms")
            
            # Display active hazards
            with alerts_container.container():
                recent_alerts = alert_mgr.active_alerts[:5]
                if recent_alerts:
                    for a in recent_alerts:
                        css_class = f"alert-{a.risk_level.lower()}"
                        st.markdown(f"""
                        <div class="{css_class}">
                            <strong>{a.hazard_type}</strong> | <small>{a.risk_level}</small><br/>
                            <span style="font-size:11px;">{a.recommended_action}</span>
                        </div>
                        """, unsafe_allow_html=True)
                else:
                    st.success("Clear road path ahead. No immediate risks.")

        elif cap is not None and cap.isOpened():
            stop_btn = st.sidebar.button("⏹️ Stop Stream")
            while cap.isOpened() and not stop_btn:
                ret, frame = cap.read()
                if not ret:
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue

                annotated, hazards, telemetry = pipeline.process_frame(frame)
                rgb_frame = cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB)
                frame_placeholder.image(rgb_frame, use_container_width=True)

                fps_metric.metric("Measured FPS", f"{telemetry['fps']:.1f}")
                lat_metric.metric("Latency", f"{telemetry['latency_ms']:.1f} ms")

                with alerts_container.container():
                    recent_alerts = alert_mgr.active_alerts[:5]
                    if recent_alerts:
                        for a in recent_alerts:
                            css_class = f"alert-{a.risk_level.lower()}"
                            st.markdown(f"""
                            <div class="{css_class}">
                                <strong>{a.hazard_type}</strong> | <small>{a.risk_level}</small><br/>
                                <span style="font-size:11px;">{a.recommended_action}</span>
                            </div>
                            """, unsafe_allow_html=True)
                    else:
                        st.success("Clear road path ahead. No immediate risks.")

                time.sleep(0.01)
            cap.release()
        else:
            frame_placeholder.info("Select a valid video input source or image from the left sidebar to start monitoring.")

    # TAB 2: Interactive GPS Map
    with tab2:
        st.subheader("🗺️ Geospatial Hazard Corridor Map")
        events = alert_mgr.get_event_history(limit=100)
        
        map_points = []
        for e in events:
            if e['gps_lat'] is not None and e['gps_lng'] is not None:
                map_points.append({
                    "lat": e['gps_lat'],
                    "lon": e['gps_lng'],
                    "hazard": e['hazard_type'],
                    "risk": e['risk_level'],
                    "time": e['timestamp']
                })

        if map_points:
            df_map = pd.DataFrame(map_points)
            st.map(df_map, zoom=13)
            st.dataframe(df_map, use_container_width=True)
        else:
            # Show default corridor
            default_df = pd.DataFrame([{"lat": 12.9716, "lon": 77.5946, "status": "Vehicle Position"}])
            st.map(default_df, zoom=14)
            st.caption("Active monitoring position centered on road corridor.")

    # TAB 3: Event History & Audit Table
    with tab3:
        st.subheader("📋 Historic Hazard Event Audit Log")
        
        col_f1, col_f2 = st.columns(2)
        cat_filter = col_f1.selectbox("Filter by Category", ["ALL", "POTHOLE", "ANIMAL", "ACCIDENT", "SHARP_CURVE", "PEDESTRIAN", "DEBRIS"])
        sev_filter = col_f2.selectbox("Filter by Severity", ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"])

        filtered_events = alert_mgr.get_event_history(category=cat_filter, severity=sev_filter, limit=200)

        if filtered_events:
            df_events = pd.DataFrame(filtered_events)
            st.dataframe(
                df_events[[
                    "alert_id", "timestamp", "hazard_type", "risk_level",
                    "confidence", "collision_probability", "distance_meters",
                    "gps_lat", "gps_lng", "recommended_action"
                ]],
                use_container_width=True
            )
            
            # Export CSV
            csv_data = df_events.to_csv(index=False).encode('utf-8')
            st.download_button(
                "📥 Export Audit Log to CSV",
                data=csv_data,
                file_name="road_safety_events.csv",
                mime="text/csv"
            )
        else:
            st.info("No recorded events matching the selected filter criteria.")

if __name__ == "__main__":
    main()
