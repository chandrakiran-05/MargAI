"""
Top-Level Application Entry Point for Road Safety AI
Runs the Streamlit dashboard or CLI when invoked.
"""

import os
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from road_safety_ai.dashboard.app import main

if __name__ == "__main__":
    main()
