"""What the voice engine is told to read for each item (shared by check_pronunciation.py and make_tts.py).

audio/say-overrides.json holds vowel-marked spellings per item ("say"), items no engine reading gets right ("skip"),
and vowel-marked spellings for sentence-builder patterns ("frame_say", keyed "<topic>|<pattern number>").
A builder sentence inherits its word's fix and its pattern's fix, and is skipped when its word is skipped.
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
CFG = json.loads((ROOT / "audio/say-overrides.json").read_text())
SAY, SKIP, FRAME_SAY = CFG["say"], set(CFG["skip"]), CFG.get("frame_say", {})

def is_skipped(it):
    return it["id"] in SKIP or (bool(it.get("frame")) and it["frame"]["wid"] in SKIP)

def say_text(it):
    if it["id"] in SAY:
        return SAY[it["id"]]
    fr = it.get("frame")
    if not fr:
        return it["fa"]
    pattern = FRAME_SAY.get(f'{fr["cat"]}|{fr["k"]}')
    text = pattern.replace("___", fr["word"]) if pattern else it["fa"]
    return text.replace(fr["word"], SAY[fr["wid"]]) if fr["wid"] in SAY else text
