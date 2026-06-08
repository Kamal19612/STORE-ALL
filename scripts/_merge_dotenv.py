#!/usr/bin/env python3
"""Fusionne ou remplace des clés dans un fichier .env ; préserve les commentaires."""
from __future__ import annotations

import pathlib
import sys


def merge(path: pathlib.Path, updates: dict[str, str]) -> None:
    if not path.is_file():
        path.write_text("")
    raw = path.read_text()
    lines = raw.splitlines()
    keys_done: set[str] = set()
    out: list[str] = []

    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            out.append(line)
            continue
        if "=" not in line:
            out.append(line)
            continue
        key = line.split("=", 1)[0].strip()
        if key in updates:
            out.append(f"{key}={updates[key]}")
            keys_done.add(key)
        else:
            out.append(line)

    for k, v in updates.items():
        if k not in keys_done:
            out.append(f"{k}={v}")

    path.write_text("\n".join(out).rstrip() + "\n")


def main() -> None:
    if len(sys.argv) < 4 or len(sys.argv) % 2 != 0:
        print(
            "Usage: _merge_dotenv.py <path-to-.env> KEY VALUE [KEY VALUE ...]",
            file=sys.stderr,
        )
        sys.exit(1)
    env_path = pathlib.Path(sys.argv[1])
    updates = dict(zip(sys.argv[2::2], sys.argv[3::2]))
    merge(env_path, updates)


if __name__ == "__main__":
    main()
