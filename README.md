# Khalij Farsi

A Farsi learning app for phone and laptop, built on second-language research: ready-made phrases first, spaced recall, picture-based vocabulary, handwriting the script, a Persian touch-typing trainer, and a notebook for southern (Bandari) speech recorded from native speakers.

- **Web:** the same app runs as a claude.ai artifact, with progress synced to your account.
- **Android:** this repo builds an APK with Capacitor. Progress stays on the phone; use *Today → Move progress between devices* to carry it over.

## Get the APK

On your Android phone, open **https://github.com/Death7310/Parsi/releases/latest/download/khalij-farsi.apk** and tap the file when it finishes downloading. Android will ask you to allow installs from your browser the first time. It's a debug build signed with a throwaway key, which is fine for personal use.

Every push to `main` rebuilds the app and replaces that file, so the same link always gets the newest version. Install over the old one to update; your progress stays.

Builds from other branches are under **Actions**, in each run's Artifacts (a zip with the APK inside).

## Audio, best to worst

1. **Tutor recordings** (`audio/tutor/<speaker>/<item id>.mp3`). These are what your accent should copy. Get them with the recording sheet below.
2. **Synthetic voices** (`audio/tts/<voice>/`), generated in CI with every Persian [Piper](https://github.com/OHF-Voice/piper1-gpl) voice. They sound standard Tehran-style, not southern. They're good for hearing words, not as an accent model.
3. **Device speech.** Android text-to-speech in the app, or the browser's voice on the web. Quality depends on the device.

The app prefers tutor clips, then synthetic ones, and rotates between speakers so you hear more than one voice.

### Checking synthetic pronunciation

Persian script leaves out short vowels, so a voice can read حالت as *hâlat* instead of *hâlet*. `scripts/check_pronunciation.py` compares the voice engine's reading of every item with the app's transliteration and fails CI on any mismatch. Fix one by adding a vowel-marked spelling to `audio/say-overrides.json` under `say`. If no spelling works, put the item under `skip` and get it recorded by a person. The engine reading is only phonemes; **still listen** to the generated clips before you trust them.

### Recording a tutor

1. `node scripts/make-recording-sheet.mjs` writes `docs/recording-sheet.md`: 7 sessions of up to 40 lines.
2. The tutor reads each session as one file, with a 2-second pause between lines.
3. `python scripts/split_recording.py session1.m4a --speaker maryam --session 1` cuts it into one clip per item and rebuilds `audio/manifest.json`. If the number of pieces doesn't match, it writes nothing and shows you the pieces.
4. Commit `audio/tutor/` and push. The next APK includes the recordings.

Needs Python 3 and ffmpeg.

## Editing content

All lessons live in `src/index.html` (`CHUNKS`, `WORDS`, `VOCAB_RAW`, `LETTERS`). After changing them, run `node scripts/export-items.mjs` and `node scripts/make-recording-sheet.mjs` so audio and the recording sheet stay in step.

## Local build (needs Android Studio / SDK)

```
npm ci
npm run apk        # → android/app/build/outputs/apk/debug/app-debug.apk
```
