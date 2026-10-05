#!/bin/sh
# Le dossier de données monté (./data) appartient souvent à root : on le confie à l'utilisateur « node »,
# puis le serveur tourne sans les droits root.
set -e
if [ "$(id -u)" = "0" ]; then
  mkdir -p "${DATA_DIR:-/data}"
  chown -R node:node "${DATA_DIR:-/data}"
  exec setpriv --reuid=node --regid=node --init-groups "$@"
fi
exec "$@"
