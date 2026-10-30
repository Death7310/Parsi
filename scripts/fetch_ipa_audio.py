"""Fetch isolated recordings of each IPA sound used in the app from Wikimedia Commons (the files Wikipedia's IPA pages use).

Only files whose licence allows reuse (public domain, CC0, CC BY, CC BY-SA) are kept, and each one's author and licence
go into audio/ipa/index.json, which the app shows as a credit. A title that doesn't exist or has another licence is skipped
and reported; the app then simply offers no "Hear it alone" button for that sound. Never fails the build.
Usage: python scripts/fetch_ipa_audio.py
"""
import json, pathlib, re, subprocess, tempfile, time, urllib.error, urllib.parse, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "audio/ipa"
API = "https://commons.wikimedia.org/w/api.php"
UA = {"User-Agent": "KhalijFarsi/0.2 (personal language-learning app; https://github.com/Death7310/Parsi)"}
OK_LICENCE = re.compile(r"^(public domain|pd\b|cc0|cc[ -]by(-sa)?[ -]\d)", re.I)

# symbol -> Commons file titles to try, in order (the sound names Wikipedia uses)
SOUNDS = {
    "ɒ": ["Open back rounded vowel.ogg"], "æ": ["Near-open front unrounded vowel.ogg"],
    "e": ["Close-mid front unrounded vowel.ogg"], "o": ["Close-mid back rounded vowel.ogg"],
    "i": ["Close front unrounded vowel.ogg"], "u": ["Close back rounded vowel.ogg"],
    "p": ["Voiceless bilabial plosive.ogg"], "b": ["Voiced bilabial plosive.ogg"],
    "t": ["Voiceless dental and alveolar plosives.ogg", "Voiceless alveolar plosive.ogg"],
    "d": ["Voiced dental and alveolar plosives.ogg", "Voiced alveolar plosive.ogg"],
    "k": ["Voiceless velar plosive.ogg"], "ɡ": ["Voiced velar plosive 02.ogg", "Voiced velar plosive.ogg"],
    "c": ["Voiceless palatal plosive.ogg"], "ɟ": ["Voiced palatal plosive.ogg"],
    "ɢ": ["Voiced uvular plosive.ogg", "Voiced uvular stop.oga"], "ɣ": ["Voiced velar fricative.ogg"],
    "ʔ": ["Glottal stop.ogg"], "f": ["Voiceless labiodental fricative.ogg"], "v": ["Voiced labiodental fricative.ogg"],
    "s": ["Voiceless alveolar sibilant.ogg"], "z": ["Voiced alveolar sibilant.ogg"],
    "ʃ": ["Voiceless palato-alveolar sibilant.ogg"], "ʒ": ["Voiced palato-alveolar sibilant.ogg"],
    "x": ["Voiceless velar fricative.ogg"], "h": ["Voiceless glottal fricative.ogg"],
    "tʃ": ["Voiceless palato-alveolar affricate.ogg"], "dʒ": ["Voiced palato-alveolar affricate.ogg"],
    "m": ["Bilabial nasal.ogg"], "n": ["Alveolar nasal.ogg"], "l": ["Alveolar lateral approximant.ogg"],
    "r": ["Alveolar trill.ogg"], "ɾ": ["Alveolar tap.ogg"], "j": ["Palatal approximant.ogg"],
}

def get(url):
    """GET with Wikimedia's etiquette: one request at a time, and back off when told to (HTTP 429/503)."""
    for attempt in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code not in (429, 503) or attempt == 4:
                raise
            wait = int(e.headers.get("Retry-After") or 0) or 5 * 2 ** attempt
            print(f"  rate limited, waiting {wait}s"); time.sleep(min(wait, 60))

def info(title):
    q = urllib.parse.urlencode({"action": "query", "titles": "File:" + title, "prop": "imageinfo",
                                "iiprop": "url|extmetadata", "format": "json"})
    page = next(iter(json.loads(get(f"{API}?{q}"))["query"]["pages"].values()))
    if "imageinfo" not in page:
        return None
    ii = page["imageinfo"][0]; meta = ii.get("extmetadata", {})
    strip = lambda v: re.sub(r"<[^>]+>", "", (meta.get(v) or {}).get("value", "")).strip()
    return {"url": ii["url"], "page": ii.get("descriptionurl", ""), "license": strip("LicenseShortName"), "artist": strip("Artist")}

OUT.mkdir(parents=True, exist_ok=True)
index_path = OUT / "index.json"
index = json.loads(index_path.read_text()) if index_path.exists() else {}
for sym, titles in SOUNDS.items():
    if sym in index and (ROOT / index[sym]["file"]).exists():
        continue
    for title in titles:
        time.sleep(1.5)   # space requests out; Commons rate-limits bursts
        try:
            meta = info(title)
        except Exception as e:
            print(f"{sym}: lookup failed for {title}: {e}"); continue
        if not meta:
            print(f"{sym}: no file named {title}"); continue
        if not OK_LICENCE.match(meta["license"]):
            print(f"{sym}: skipped {title}, licence '{meta['license']}'"); continue
        slug = re.sub(r"[^a-z0-9]+", "-", title.rsplit(".", 1)[0].lower()).strip("-")
        mp3 = OUT / f"{slug}.mp3"
        try:
            with tempfile.NamedTemporaryFile(suffix=".ogg") as tmp:
                tmp.write(get(meta["url"])); tmp.flush()
                subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", tmp.name, "-ac", "1", "-b:a", "64k", str(mp3)], check=True)
        except Exception as e:
            print(f"{sym}: download failed for {title}: {e}"); continue
        index[sym] = {"file": mp3.relative_to(ROOT).as_posix(), "title": title, "license": meta["license"],
                      "artist": meta["artist"][:120], "source": meta["page"]}
        print(f"{sym}: {title} ({meta['license']})")
        break
index_path.write_text(json.dumps(index, ensure_ascii=False, indent=1))
print(f"{len(index)} of {len(SOUNDS)} sounds have an isolated recording")
