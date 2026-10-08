"""Sert apps/web/public en HTTP sur le réseau local, sans cache : on modifie, on relance l'appli sur le Hub, sans déployer.

  uv run apps/cast/serve.py            # puis URL du récepteur dans la console Cast : http://<IP du Mac>:8799/cast/

HTTP n'est accepté par Cast que pour une appli non publiée, avec l'IP du réseau (pas localhost).
"""

import functools
import http.server
import pathlib
import socket

PORT = 8799
ROOT = pathlib.Path(__file__).resolve().parents[1] / "web" / "public"


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def lan_ip() -> str:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("192.168.0.1", 80))
        return s.getsockname()[0]
    finally:
        s.close()


if __name__ == "__main__":
    handler = functools.partial(NoCache, directory=str(ROOT))
    print(f"Récepteur : http://{lan_ip()}:{PORT}/cast/   (aperçu : …/cast/?preview)")
    http.server.ThreadingHTTPServer(("0.0.0.0", PORT), handler).serve_forever()
