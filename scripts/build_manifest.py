"""Index every clip in audio/tts/<voice>/ and audio/tutor/<speaker>/ into audio/manifest.json, which the app reads.

Keys are "<Persian text>|<transliteration>" so homographs (کی ki / key) stay apart.
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
items = {it["id"]: it for it in json.loads((ROOT / "audio/items.json").read_text())}
manifest = {}
for kind in ("tutor", "tts"):
    for clip in sorted((ROOT / "audio" / kind).glob("*/*.mp3")):
        it = items.get(clip.stem)
        if not it:
            print("no item for", clip); continue
        entry = manifest.setdefault(f'{it["fa"]}|{it["tr"]}', {"tutor": [], "tts": []})
        entry[kind].append(clip.relative_to(ROOT).as_posix())
(ROOT / "audio/manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=0))
n_tutor = sum(bool(e["tutor"]) for e in manifest.values())
print(f"manifest: {len(manifest)} of {len(items)} items have audio; {n_tutor} have a tutor recording")
