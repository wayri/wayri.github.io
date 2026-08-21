#!/usr/bin/env python3
"""
Offline Desktop Host & Launcher for Engineering Suite
Launches a local zero-dependency HTTP server and opens the full 60+ tools suite in your browser.
"""

import http.server
import socketserver
import webbrowser
import threading
import socket
import os
import sys
import time

def find_free_port(start_port=8080):
    for port in range(start_port, start_port + 100):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('127.0.0.1', port)) != 0:
                return port
    return 8080

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        # Keep terminal clean
        pass

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    port = find_free_port()
    url = f"http://127.0.0.1:{port}/tools/index.html"
    
    print("=" * 65)
    print("  ⚡ ENGINEERING TOOLS SUITE - OFFLINE DESKTOP HOST")
    print("=" * 65)
    print(f"  • Root Directory : {script_dir}")
    print(f"  • Local Server   : http://127.0.0.1:{port}/")
    print(f"  • Tools URL      : {url}")
    print("=" * 65)
    print("  All 60+ engineering calculators, SMPS tuners, magnetics solvers,")
    print("  and the Harness Designer are active 100% offline.")
    print("  Press Ctrl+C in this terminal to shut down the server.")
    print("=" * 65)
    
    httpd = socketserver.TCPServer(('127.0.0.1', port), QuietHandler)
    
    # Auto open browser in background thread
    def open_browser():
        time.sleep(0.6)
        webbrowser.open(url)

    threading.Thread(target=open_browser, daemon=True).start()
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down offline server...")
        httpd.shutdown()
        sys.exit(0)

if __name__ == '__main__':
    main()
