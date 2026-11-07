# Khalij Farsi

A Farsi learning app for phone and laptop, built on second-language research: ready-made phrases first, spaced recall, picture-based vocabulary, handwriting the script, a Persian touch-typing trainer, and a notebook for southern (Bandari) speech recorded from native speakers.

- **Web:** the same app runs as a claude.ai artifact, with progress synced to your account.
- **Android:** this repo builds an APK with Capacitor. Progress stays on the phone; use *Today → Move progress between devices* to carry it over.

## Get the app

Every push to `main` rebuilds all versions and replaces the files on the [latest release](https://github.com/Death7310/Parsi/releases/latest). The same links always get the newest version.

| Device | File | Install |
|---|---|---|
| Android phone | [khalij-farsi.apk](https://github.com/Death7310/Parsi/releases/latest/download/khalij-farsi.apk) | Open the link in Chrome itself (not inside another app), tap the file, allow installs from Chrome. |
| Mac with Apple Silicon (M1 or later) | [Khalij-Farsi-mac-arm64.dmg](https://github.com/Death7310/Parsi/releases/latest/download/Khalij-Farsi-mac-arm64.dmg) | Open the .dmg and drag the app to Applications. The first time, macOS blocks it: open **System Settings → Privacy & Security**, scroll down, click **Open Anyway**. |
| Mac with Intel | [Khalij-Farsi-mac-x64.dmg](https://github.com/Death7310/Parsi/releases/latest/download/Khalij-Farsi-mac-x64.dmg) | Same as above. |
| Windows PC | [Khalij-Farsi-windows-setup.exe](https://github.com/Death7310/Parsi/releases/latest/download/Khalij-Farsi-windows-setup.exe) | Run it. If Windows shows "Windows protected your PC", click **More info → Run anyway**. |

Those warnings appear because the apps aren't signed with a paid developer certificate (Apple charges $99 a year; Windows certificates cost more). They're safe to bypass for an app you built yourself. Updating means installing the new version over the old one; progress stays.

Builds from other branches are under **Actions → Build apps**, in each run's Artifacts.

## Desktop app (Mac and Windows)

The same app as the web and Android versions, plus features that use the computer's power:

- **Check it: on-device speech recognition.** Record yourself on any card. [whisper.cpp](https://github.com/ggml-org/whisper.cpp) transcribes it locally, using the GPU through Metal on Macs and all CPU cores on Windows, and the app shows which words it understood. Your voice never leaves the computer. Download a model once on the Today page: *large-v3-turbo* (about 550 MB) is recommended.
- **Compare:** a spectrogram and pitch track of your recording next to the model voice, on the same time scale. This also works in the Android app.
- **Every line has recorded audio,** including all sentence-builder combinations. Macs and Windows PCs usually have no Persian voice of their own.

Speech recognition measures how understandable you are to a recogniser trained mostly on standard Persian. It doesn't judge how southern you sound, and it sometimes mishears good speech.

Development: `cd desktop && npm ci && npm start` (put a whisper-cli build in `desktop/bin/<mac|win|linux>-<arch>/` for speech recognition).

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

## IPA view

Every flashcard has an **IPA** button in its top-right corner. It flips the card to show each Persian letter above the IPA sounds it writes, with unwritten vowels and glides (Persian leaves most short vowels out) in a different color. Tapping a sound explains how to make it, plays a Persian example word, and, in the Android app, plays an isolated recording of the sound when one is available. A switch picks broad /…/ or narrow […] transcription.

- The sounds come from each card's transliteration, matched letter by letter to the Persian spelling (`alignIpa` in `src/index.html`). `node scripts/check-ipa.mjs` checks that every card and every sentence-builder combination matches; CI fails if one doesn't. Add `--show` to print them all for review.
- Isolated recordings come from Wikimedia Commons (`scripts/fetch_ipa_audio.py`, run in CI). Only reusable licences are kept, and the credits appear in the app under *Why it works*. The web version can't fetch them, so it shows the explanation and the example word only.

## Editing content

All lessons live in `src/index.html` (`CHUNKS`, `WORDS`, `VOCAB_RAW`, `LETTERS`). After changing them, run `node scripts/export-items.mjs` and `node scripts/make-recording-sheet.mjs` so audio and the recording sheet stay in step.

## Local build (needs Android Studio / SDK)

```
npm ci
npm run apk        # → android/app/build/outputs/apk/debug/app-debug.apk
```
