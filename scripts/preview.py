"""Serve the buildless prototype on an available loopback port."""

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import webbrowser


def main():
    parser = argparse.ArgumentParser(description="Open the Moyobom HTML prototype")
    parser.add_argument("--open", action="store_true", help="open the local preview in a browser")
    parser.add_argument("--port", type=int, default=0, help="optional loopback port; default chooses an available port")
    args = parser.parse_args()
    directory = Path(__file__).resolve().parent.parent / "prototype"
    handler = partial(SimpleHTTPRequestHandler, directory=str(directory))
    with ThreadingHTTPServer(("127.0.0.1", args.port), handler) as server:
        url = f"http://127.0.0.1:{server.server_port}/"
        print(f"Local preview: {url}", flush=True)
        print("Press Ctrl+C to stop.", flush=True)
        if args.open:
            webbrowser.open(url)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
