import Foundation
import Capacitor
import CoreMIDI

// Slimehedron native MIDI-in for iOS/iPadOS.
// Opens a CoreMIDI virtual input, connects to every MIDI source on the device (USB, BLE, network),
// and forwards each message to JS as { bytes: [status, data1, data2, ...] } -> window.slimeMidiIn().
// This is what gets you real MIDI keyboards on iPad, which mobile Safari's Web MIDI cannot.
@objc(NativeMidiPlugin)
public class NativeMidiPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeMidiPlugin"
    public let jsName = "NativeMidi"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise)
    ]

    var client = MIDIClientRef()
    var inPort = MIDIPortRef()
    var started = false

    @objc func start(_ call: CAPPluginCall) {
        if started { call.resolve(); return }
        started = true

        MIDIClientCreateWithBlock("SlimehedronMIDI" as CFString, &client) { [weak self] notification in
            // a device was plugged in / removed — reconnect all sources
            self?.connectAllSources()
        }

        // modern packet-list block reader (iOS 14+)
        MIDIInputPortCreateWithProtocol(client, "SlimehedronIn" as CFString, ._1_0, &inPort) { [weak self] evtList, _ in
            let list = evtList.unsafeSequence()
            for packet in list {
                let words = packet.wordsArray()   // UMP 32-bit words
                var bytes: [UInt8] = []
                for w in words {
                    // extract the 3 payload bytes from a MIDI 1.0 UMP channel-voice word
                    bytes.append(UInt8((w >> 16) & 0xFF))
                    bytes.append(UInt8((w >> 8) & 0xFF))
                    bytes.append(UInt8(w & 0xFF))
                }
                if !bytes.isEmpty {
                    self?.notifyListeners("midi", data: ["bytes": bytes])
                }
            }
        }

        connectAllSources()
        call.resolve()
    }

    func connectAllSources() {
        let count = MIDIGetNumberOfSources()
        for i in 0..<count {
            let src = MIDIGetSource(i)
            MIDIPortConnectSource(inPort, src, nil)
        }
    }
}

// UMP word helper
private extension MIDIEventPacket {
    func wordsArray() -> [UInt32] {
        var out: [UInt32] = []
        withUnsafeBytes(of: self.words) { raw in
            let ptr = raw.bindMemory(to: UInt32.self)
            let n = Int(self.wordCount)
            for i in 0..<min(n, ptr.count) { out.append(ptr[i]) }
        }
        return out
    }
}
