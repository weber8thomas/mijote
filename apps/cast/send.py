# /// script
# requires-python = ">=3.11"
# dependencies = ["pychromecast>=14"]
# ///
"""Essai Nest Hub : lance le récepteur Mijoté sur un écran Cast et lui envoie une recette.

  uv run apps/cast/send.py --list
  npx tsx apps/cast/payload.ts boeuf-carottes-mijote | uv run apps/cast/send.py --app ABCD1234 --device "Écran cuisine"
  uv run apps/cast/send.py --app ABCD1234 --device "Écran cuisine"     # sans recette : la démo du récepteur
  uv run apps/cast/send.py --app ABCD1234 --device "Écran cuisine" --quit

Le script se déconnecte après l'envoi : l'écran doit garder la recette (c'est l'un des points de l'essai).
"""

import argparse
import json
import sys
import threading
import time

import pychromecast
from pychromecast.controllers import BaseController

NS = "urn:x-cast:app.mijote"


class Mijote(BaseController):
    def __init__(self, app_id: str) -> None:
        super().__init__(NS, app_id)
        self.acked = threading.Event()

    def receive_message(self, _message, data: dict) -> bool:
        print(f"Écran : {data}")
        if data.get("type") == "ok":
            self.acked.set()
        return True


def find(args):
    hosts = [args.host] if args.host else None
    if args.list:
        casts, browser = pychromecast.get_chromecasts(known_hosts=hosts)
    else:
        casts, browser = pychromecast.get_listed_chromecasts(friendly_names=[args.device], known_hosts=hosts)
    return casts, browser


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--list", action="store_true", help="liste les appareils Cast du réseau")
    p.add_argument("--app", help="App ID du récepteur (console Cast)")
    p.add_argument("--device", help="nom de l'écran dans Google Home")
    p.add_argument("--host", help="IP de l'écran, si la découverte mDNS ne le trouve pas")
    p.add_argument("--page", type=int, default=0, help="page de départ (0 = ingrédients)")
    p.add_argument("--quit", action="store_true", help="ferme l'appli sur l'écran")
    args = p.parse_args()

    if not args.list and not (args.app and args.device):
        p.error("--app et --device sont requis (ou --list)")

    recipe = None
    if not args.list and not args.quit and not sys.stdin.isatty():
        recipe = json.load(sys.stdin)

    casts, browser = find(args)
    try:
        if args.list:
            for c in casts:
                i = c.cast_info
                print(f"{i.friendly_name!r:32} {i.model_name:24} {i.host}")
            return 0
        if not casts:
            print(f"Écran introuvable : {args.device!r} (essaie --list, ou --host)", file=sys.stderr)
            return 1

        cast = casts[0]
        cast.wait()
        if args.quit:
            cast.quit_app()
            print("Appli fermée.")
            return 0

        ctrl = Mijote(args.app)
        cast.register_handler(ctrl)
        launched = threading.Event()
        ctrl.launch(callback_function=lambda ok, _resp: launched.set())
        launched.wait(20)
        deadline = time.time() + 20
        while not ctrl.is_active and time.time() < deadline:
            time.sleep(0.2)
        if not ctrl.is_active:
            print("Le récepteur ne répond pas (App ID ? écran enregistré dans la console ? redémarré ?)", file=sys.stderr)
            return 1
        print(f"Récepteur lancé sur {cast.cast_info.friendly_name}.")

        if recipe:
            ctrl.send_message({"type": "recipe", "recipe": recipe, "page": args.page})
            if ctrl.acked.wait(10):
                print(f"Recette affichée : {recipe['title']}")
            else:
                print("Recette envoyée, sans accusé de réception.", file=sys.stderr)
        else:
            print("Pas de recette sur l'entrée standard : le récepteur affiche sa démo.")
        return 0
    finally:
        browser.stop_discovery()


if __name__ == "__main__":
    sys.exit(main())
