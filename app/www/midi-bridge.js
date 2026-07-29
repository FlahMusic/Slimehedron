// midi-bridge.js — connects the native MIDI plugin to the web app.
// The web app (index.html) exposes window.slimeMidiIn(bytes); this file feeds native MIDI into it.
// In a plain browser (no Capacitor) this does nothing — the app still runs on Web MIDI / on-screen keys.
(function () {
  function connect() {
    if (!window.Capacitor || !window.Capacitor.Plugins || !window.Capacitor.Plugins.NativeMidi) return false;
    var NM = window.Capacitor.Plugins.NativeMidi;
    // every incoming MIDI message -> straight into the app's existing midiMsg()
    NM.addListener('midi', function (e) {
      if (window.slimeMidiIn && e && e.bytes) window.slimeMidiIn(e.bytes);
    });
    NM.start();               // open CoreMIDI (iOS) / android.media.midi (Android) and start listening
    window.__nativeMidiOn = true;
    return true;
  }
  // Capacitor injects window.Capacitor before the page scripts run; retry a few times just in case.
  if (!connect()) {
    var tries = 0, t = setInterval(function () { if (connect() || ++tries > 20) clearInterval(t); }, 200);
  }
})();
