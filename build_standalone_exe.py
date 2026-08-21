#!/usr/bin/env python3
"""
Local Standalone Binary Packager
Packages standalone_app.py and all offline web assets into a single portable Windows .exe
using PyInstaller.
"""

import subprocess
import sys
import os
import shutil

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    print("=" * 65)
    print("  ⚡ BUILDING PORTABLE STANDALONE EXECUTABLE (.EXE)")
    print("=" * 65)

    # Check if pyinstaller is installed
    try:
        import PyInstaller
    except ImportError:
        print("  Installing PyInstaller...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])

    cmd = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--noconfirm",
        "--onedir",
        "--windowed",
        "--name=EngineeringToolsSuite",
        "--add-data=assets;assets",
        "--add-data=manifest.json;.",
        "--add-data=service-worker.js;.",
        "standalone_app.py"
    ]

    print("  Running PyInstaller build command...")
    subprocess.check_call(cmd)

    dist_path = os.path.join(script_dir, "dist", "EngineeringToolsSuite")
    print("=" * 65)
    print(f"  [SUCCESS] Standalone Executable built in: {dist_path}")
    print("=" * 65)

if __name__ == '__main__':
    main()
