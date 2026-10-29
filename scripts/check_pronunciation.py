"""Compare how the speech engine will read each item against the app's transliteration.

Persian script leaves out short vowels, so a voice can read حالت as hâlat instead of hâlet.
This flags every mismatch; fix one by adding a vowel-marked spelling to audio/say-overrides.json,
keyed by item id, e.g. "c03": "حالِت چطوره؟". Items in "skip" get no synthetic audio. Usage: python scripts/check_pronunciation.py
"""
import json, re, sys, pathlib
import piper
from piper.phonemize_espeak import EspeakPhonemizer

ROOT = pathlib.Path(__file__).resolve().parent.parent
items = json.loads((ROOT / "audio/items.json").read_text())
cfg = json.loads((ROOT / "audio/say-overrides.json").read_text())
say, skip, accepted = cfg["say"], set(cfg["skip"]), set(cfg["accepted"])
ph = EspeakPhonemizer(pathlib.Path(piper.__file__).parent / "espeak-ng-data")

# Map espeak IPA and our transliteration onto one coarse alphabet; vowel length and stress are ignored.
IPA = [("tʃ", "C"), ("dʒ", "j"), ("q1", "G"), ("ʃ", "S"), ("ʒ", "Z"), ("x", "X"), ("ɣ", "G"), ("q", "G"), ("ɑ", "A"),
       ("ʔ", ""), ("ɡ", "g"), ("ː", ""), ("ˈ", ""), ("ˌ", ""), ("1", "")]
TR = [("ch", "C"), ("sh", "S"), ("zh", "Z"), ("kh", "X"), ("gh", "G"), ("â", "A"), ("y", "j"), ("'", "")]

def norm(s, table):
    s = s.lower()
    for a, b in table:
        s = s.replace(a, b)
    s = re.sub(r"(.)\1+", r"\1", s)        # doubled letters (tokhmmorgh) count once
    return re.sub(r"[^a-zA-Z]", "", s)

bad = 0
for it in items:
    if it["id"] in skip or it["id"] in accepted:
        continue
    text = say.get(it["id"], it["fa"])
    got = norm("".join("".join(x) for x in ph.phonemize("fa", text)), IPA)
    want = norm(it["tr"].split("(")[0], TR)
    if got != want:
        bad += 1
        print(f'{it["id"]:8} {it["fa"]:<22} want {it["tr"]:<24} engine reads {got}')
print(f"\n{bad} of {len(items)} items need a vowel-marked spelling; {len(skip)} skipped for human recording", file=sys.stderr)
sys.exit(1 if bad else 0)
