"""Split one long tutor recording into one clip per item, cutting at the pauses.

The tutor reads a recording-sheet session in order with a 2-second pause between items.
Usage: python scripts/split_recording.py session1.m4a --speaker maryam --session 1
Writes audio/tutor/<speaker>/<item id>.mp3, then rebuilds the manifest. If the number of
pieces found doesn't match the number of items, it writes nothing and prints the pieces
so you can adjust --pause or --floor.
"""
import argparse, json, pathlib, re, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
ap = argparse.ArgumentParser()
ap.add_argument("recording"); ap.add_argument("--speaker", required=True)
ap.add_argument("--session", type=int, required=True, help="session number from docs/recording-sheet.md")
ap.add_argument("--pause", type=float, default=1.2, help="seconds of quiet that separate two items")
ap.add_argument("--floor", type=float, default=-35, help="dB level counted as quiet")
args = ap.parse_args()

sessions = json.loads((ROOT / "audio/sessions.json").read_text())
ids = sessions[args.session - 1]

log = subprocess.run(["ffmpeg", "-hide_banner", "-i", args.recording, "-af", f"silencedetect=n={args.floor}dB:d={args.pause}", "-f", "null", "-"],
                     capture_output=True, text=True).stderr
h, m, sec = re.search(r"Duration: (\d+):(\d+):([\d.]+)", log).groups()
dur = int(h) * 3600 + int(m) * 60 + float(sec)
starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)]
ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
# speech runs from each silence end to the next silence start
bounds, t = [], 0.0
for s, e in zip(starts, ends + [dur]):
    if s - t > 0.25:
        bounds.append((t, s))
    t = e
if dur - t > 0.25:
    bounds.append((t, dur))

if len(bounds) != len(ids):
    print(f"Found {len(bounds)} spoken pieces but session {args.session} has {len(ids)} items. Nothing written.")
    for i, (a, b) in enumerate(bounds, 1):
        print(f"  piece {i:3}: {a:7.2f}s to {b:7.2f}s ({b - a:.2f}s)")
    print("Pieces that are too short are coughs or clicks; pieces too long are two items run together (try a lower --pause).")
    sys.exit(1)

out = ROOT / "audio/tutor" / args.speaker
out.mkdir(parents=True, exist_ok=True)
for item_id, (a, b) in zip(ids, bounds):
    a, b = max(0, a - 0.15), min(dur, b + 0.15)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", args.recording, "-ss", f"{a:.3f}", "-to", f"{b:.3f}",
                    "-af", "loudnorm=I=-18", "-ac", "1", "-b:a", "64k", str(out / f"{item_id}.mp3")], check=True)
print(f"Wrote {len(ids)} clips to {out.relative_to(ROOT)}")
subprocess.run([sys.executable, str(ROOT / "scripts/build_manifest.py")], check=True)
