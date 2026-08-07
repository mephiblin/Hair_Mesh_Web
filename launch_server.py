from __future__ import annotations

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Timer
import webbrowser


HOST = "127.0.0.1"
ENTRY_FILE = "curve_mesh_hair_tool_v4.html"


class LocalServer(ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Launch the 3D Web Paint local server.")
    parser.add_argument("--port", type=int, default=0, help="Port to use; 0 selects a free port.")
    parser.add_argument("--no-browser", action="store_true", help="Do not open the default browser.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    project_dir = Path(__file__).resolve().parent
    entry_path = project_dir / ENTRY_FILE
    if not entry_path.is_file():
        print(f"Missing app file: {entry_path}")
        return 1

    handler = partial(SimpleHTTPRequestHandler, directory=str(project_dir))
    try:
        server = LocalServer((HOST, args.port), handler)
    except OSError as error:
        print(f"Could not start the local server: {error}")
        return 1

    port = server.server_address[1]
    url = f"http://{HOST}:{port}/{ENTRY_FILE}"
    print("3D Web Paint is running.")
    print(f"Open: {url}")
    print("Close this window or press Ctrl+C to stop the server.")

    if not args.no_browser:
        browser_timer = Timer(0.35, webbrowser.open_new_tab, args=(url,))
        browser_timer.daemon = True
        browser_timer.start()

    try:
        with server:
            server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
