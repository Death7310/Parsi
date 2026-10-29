"""Generate synthetic audio for every item with every Persian Piper voice (several voices = more variety to train your ear).

Needs internet access to huggingface.co (GitHub Actions has it) plus ffmpeg.
Usage: python scripts/make_tts.py [--voices fa_IR-amir-medium ...]
Output: audio/tts/<voice>/<item id>.mp3, then audio/manifest.json is rebuilt.
"""
import argparse, json, pathlib, subprocess, sys, tempfile, wave
from urllib.request import urlopen
from piper import PiperVoice
from piper.config import SynthesisConfig
from piper.download_voices import VOICES_JSON, download_voice

ROOT = pathlib.Path(__file__).resolve().parent.parent
ap = argparse.ArgumentParser()
ap.add_argument("--voices", nargs="*", help="default: every fa_IR voice in the Piper catalogue")
ap.add_argument("--slower", type=float, default=1.1, help="length scale; above 1 is slower")
args = ap.parse_args()

items = json.loads((ROOT / "audio/items.json").read_text())
cfg = json.loads((ROOT / "audio/say-overrides.json").read_text())
say, skip = cfg["say"], set(cfg["skip"])

voices = args.voices
if not voices:
    with urlopen(VOICES_JSON) as r:
        voices = sorted(v for v in json.load(r) if v.startswith("fa_IR-"))
print("voices:", ", ".join(voices))

vdir = ROOT / ".voices"; vdir.mkdir(exist_ok=True)
for name in voices:
    download_voice(name, vdir)
    voice = PiperVoice.load(vdir / f"{name}.onnx")
    out = ROOT / "audio/tts" / name.split("-")[1]
    out.mkdir(parents=True, exist_ok=True)
    made = 0
    for it in items:
        mp3 = out / f'{it["id"]}.mp3'
        if it["id"] in skip or mp3.exists():
            continue
        with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
            with wave.open(tmp.name, "wb") as wf:
                voice.synthesize_wav(say.get(it["id"], it["fa"]), wf, syn_config=SynthesisConfig(length_scale=args.slower))
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", tmp.name, "-ac", "1", "-b:a", "48k", str(mp3)], check=True)
        made += 1
    print(f"{name}: {made} new clips")

subprocess.run([sys.executable, str(ROOT / "scripts/build_manifest.py")], check=True)
