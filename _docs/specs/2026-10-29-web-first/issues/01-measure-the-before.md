# 01 Measure the before

Status: ready
Spec: `../spec.md` (every "after 01" number), brief section 5

Go down brief section 5 line by line and write `../before.md`: for each line, is it handled, which suite proves it
(or none), and the number on the MSI (Chrome, Windows) and, where Flah can run it, on his phone. No fixes in this
ticket. It includes:
- notes a bar at spin 0 and spin 14 with the walls working by hand (the target for 02)
- every `setTimeout` / `setInterval` that plays a sound (the list for 06)
- the WAV take's sample rate and bit depth; true peak of the loudest kit's export
- render capacity and underruns in the worst case (12 balls, band, full goo)
- dropped frames in the worst case at 120 Hz (MSI) and 60 Hz (phone)
- the MIDI clock out's tick spacing; how early MIDI out lands against the audio (loopback or virtual port)
- which browsers start sound from a MIDI key with no click first
- every animation's easing and duration (the list 10 enforces)

Flah's device checks go in a short list at the end of `before.md`: KeyStep 37 by USB and through his interface,
Bluetooth headphones, an iPhone on silent, an iPad.
