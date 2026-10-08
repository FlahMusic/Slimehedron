# Slimehedron — native app (Capacitor)

Wraps the **exact same** web app (`www/`, copied from the parent `index.html` + `learn.js` + `sw.js`)
into a real iOS/iPadOS and Android app. The reason we're doing this: it unlocks **real MIDI keyboards**,
which mobile Safari's Web MIDI can't do. Same slime code, now with CoreMIDI (iOS) / android.media.midi.

## One-time setup (on your computer)

You need **Node** (installed) plus, per platform:
- **iOS:** a Mac with **Xcode** + CocoaPods (`sudo gem install cocoapods`).
- **Android:** **Android Studio** (gives you the SDK + emulator).

```bash
cd app
npm install
npx cap add ios       # Mac only
npx cap add android
```

## Every time you change the web app

Re-copy the latest web files into `www/`, then sync into the native projects:

```bash
# from the plinky folder:
cp index.html learn.js sw.js manifest.json icon-192.png icon-512.png app/www/
cd app && npx cap sync
```

## Run it

```bash
npx cap open ios       # opens Xcode -> press ▶ to run on a device/simulator
npx cap open android   # opens Android Studio -> press ▶
```

## Wiring up native MIDI (the whole point)

The web app already exposes a hook: `window.slimeMidiIn(bytes)`. Two pieces connect to it:

1. **`native-midi/midi-bridge.js`** — already loaded by `www/index.html`. It listens to the native
   plugin and forwards messages into `window.slimeMidiIn`. No-op in a plain browser.

2. **`native-midi/NativeMidiPlugin.swift`** — the iOS CoreMIDI plugin. After `npx cap add ios`:
   - In Xcode, drag `NativeMidiPlugin.swift` into the `App/App` group (check "Copy items if needed").
   - Build & run. On launch the app connects to every MIDI source and streams notes into the slimes.
   - No Info.plist permission is needed for CoreMIDI input.

   **Android** (parallel, same idea, do after iOS works): a small Kotlin plugin using
   `android.media.midi.MidiManager` that opens inputs and calls `notifyListeners("midi", {bytes})`.
   Ask Claude to generate `NativeMidi.kt` when you're ready.

## Notes
- App id: `io.flahmusic.slimehedron` — change in `capacitor.config.json` before store submission.
- MIDI **out** and **clock** already work through the same web code once native MIDI in is bridged.
- Everything else (audio, touch keybed, recording via the WAV path) already works in the webview.

## www/ is built, not edited

`www/` used to hold a hand-copied fork of the app. By 2026-10-08 it was four months behind
(202KB index.html against the live 603KB, plus a learn.js older than the one that got deleted),
so anyone building from it shipped a different app than the website. It is empty now except
`midi-bridge.js`, which is the native shim and has no root equivalent.

Before a capacitor build, copy the current files in from the project root:

    index.html  learn2.js  sw.js  manifest.json  icon-192.png  icon-512.png
    kits/  minis/  fonts/  teachers/  *.png  *.jpg

Do not edit anything in `www/` by hand.
