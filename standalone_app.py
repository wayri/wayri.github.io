#!/usr/bin/env python3
"""
Standalone Desktop Application Launcher for Engineering Suite
Spawns a dedicated standalone application window (no address bar, no tabs, native taskbar integration)
and runs the zero-dependency offline local engine.
"""

import http.server
import socketserver
import subprocess
import threading
import socket
import os
import sys
import time
import shutil

def find_free_port(start_port=8080):
    for port in range(start_port, start_port + 100):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('127.0.0.1', port)) != 0:
                return port
    return 8080

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

def find_standalone_browser():
    """Finds an installed browser that supports --app mode for standalone window rendering."""
    if sys.platform == 'win32':
        candidates = [
            os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
            os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
            os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
            os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
            os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
            os.path.expandvars(r"%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe"),
        ]
        for path in candidates:
            if os.path.exists(path):
                return path
    elif sys.platform == 'darwin':
        candidates = [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
            "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
        ]
        for path in candidates:
            if os.path.exists(path):
                return path
    else: # Linux
        for cmd in ['google-chrome', 'chromium-browser', 'chromium', 'microsoft-edge', 'brave-browser']:
            which = shutil.which(cmd)
            if which:
                return which
    return None

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    port = find_free_port(8420)
    url = f"http://127.0.0.1:{port}/tools/index.html"
    
    print("=" * 65)
    print("  ⚡ ENGINEERING SUITE - STANDALONE DESKTOP APPLICATION")
    print("=" * 65)
    print(f"  • Root Directory : {script_dir}")
    print(f"  • Local Host     : http://127.0.0.1:{port}/")
    print(f"  • App Window     : Dedicated Standalone Desktop Window")
    print("=" * 65)
    
    # Start HTTP daemon
    httpd = socketserver.TCPServer(('127.0.0.1', port), QuietHandler)
    server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    server_thread.start()
    
    browser_exe = find_standalone_browser()
    user_data_dir = os.path.join(os.environ.get('TEMP', '/tmp'), 'eng_tools_standalone_profile')
    
    time.sleep(0.4)
    
    if browser_exe:
        print(f"  Launching in native window via: {os.path.basename(browser_exe)}")
        cmd = [
            browser_exe,
            f"--app={url}",
            "--window-size=1440,920",
            f"--user-data-dir={user_data_dir}",
            "--disable-extensions",
            "--disable-plugins"
        ]
        proc = subprocess.Popen(cmd)
        
        try:
            # Wait for standalone window to close
            proc.wait()
        except KeyboardInterrupt:
            proc.terminate()
        finally:
            print("\nClosing standalone server...")
            httpd.shutdown()
            sys.exit(0)
    else:
        # Fallback to standard webbrowser if no Chromium-based app window engine is found
        import webbrowser
        print("  Opening in default browser window...")
        webbrowser.open(url)
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nClosing server...")
            httpd.shutdown()
            sys.exit(0)

if __name__ == '__main__':
    main()
