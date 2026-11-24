"""Where Stillhere reads and writes. The Mac app sets these through environment variables; development uses
the defaults, which point inside this repository.

  STILLHERE_RESOURCES  read-only: Final_Sources/ (the files sources link to)           default: repo root
  STILLHERE_LIBRARY    read-only: the built library index                                     default: app/data/library.sqlite
  STILLHERE_DATA       writable: chats, pins, maps, added documents                           default: app/data
                       (the Mac app uses ~/Library/Application Support/Stillhere, so updates never touch it)
  STILLHERE_OLLAMA     host:port of the Ollama server                                         default: 127.0.0.1:11434
"""
import os
from pathlib import Path

APP=Path(__file__).resolve().parent
RESOURCES=Path(os.environ.get('STILLHERE_RESOURCES') or APP.parent)
LIBRARY_DB=Path(os.environ.get('STILLHERE_LIBRARY') or APP/'data'/'library.sqlite')
DATA=Path(os.environ.get('STILLHERE_DATA') or APP/'data')
DATA.mkdir(parents=True,exist_ok=True)
_host,_,_port=(os.environ.get('STILLHERE_OLLAMA') or '127.0.0.1:11434').rpartition(':')
OLLAMA=(_host or '127.0.0.1',int(_port))
