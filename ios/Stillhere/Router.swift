// The phone's stand-in for app/server.py: answers the same /api/* requests the shared UI (app/static) makes.
//
// Foundation only, so it can be type-checked on a Mac without the iOS SDK:
//   swiftc -typecheck ios/Stillhere/Router.swift ios/Stillhere/SchemeHandler.swift
//
// Done: chats, pins, location (files in Application Support, same formats as the desktop app).
// Stubbed until the on-device AI, library search and maps land: health, setup, chat, library, maps, videos.

import Foundation

struct Request {
    let method: String
    let path: String
    let query: [String: String]
    let body: Data
}

/// What a route sends back. `.stream` routes write NDJSON lines as they go, like the desktop server.
enum Reply {
    case json(Int, Any)
    case raw(Int, Data, String)
    case stream(String, (_ emit: @escaping (Data) -> Void, _ finish: @escaping () -> Void) -> Void)
}

final class Router {
    let data: URL
    private let chats: URL
    private let pins: URL
    private let me: URL
    private let chatID = try! NSRegularExpression(pattern: "^[a-z0-9-]{8,64}$")

    init(dataFolder: URL) {
        data = dataFolder
        chats = dataFolder.appendingPathComponent("chats", isDirectory: true)
        pins = dataFolder.appendingPathComponent("pins.json")
        me = dataFolder.appendingPathComponent("location.json")
        try? FileManager.default.createDirectory(at: chats, withIntermediateDirectories: true)
    }

    func handle(_ r: Request) -> Reply {
        switch (r.method, r.path) {
        case ("GET", "/api/health"):
            // ollama:false makes the status bar say the AI isn't running, which is true until it's built.
            return .json(200, ["ollama": false, "chat_model": "none", "chat_model_installed": false, "chunks": 0])
        case ("GET", "/api/setup"):
            // ready:true keeps the desktop's model picker closed; the phone gets its own picker later.
            return .json(200, ["ollama": false, "ready": true, "models": [:], "missing": [], "need_bytes": 0,
                               "state": "idle", "done": 0, "total": 0, "chat_model": "none", "chosen": true,
                               "tiers": [], "ram_gb": Double(ProcessInfo.processInfo.physicalMemory) / 1e9])
        case ("POST", "/api/chat"):
            return .stream("application/x-ndjson") { emit, finish in
                emit(Router.line(["type": "sources", "sources": []]))
                emit(Router.line(["type": "error", "message": "The on-device AI isn't built into the phone app yet."]))
                finish()
            }
        case ("GET", "/api/chats"):
            return .json(200, listChats())
        case ("GET", "/api/pins"):
            return .raw(200, (try? Data(contentsOf: pins)) ?? Data("[]".utf8), "application/json")
        case ("PUT", "/api/pins"):
            guard let arr = try? JSONSerialization.jsonObject(with: r.body) as? [Any] else { return .json(400, ["error": "bad pins"]) }
            save(r.body, to: pins)
            return .json(200, ["ok": true, "count": arr.count])
        case ("GET", "/api/location"):
            return .raw(200, (try? Data(contentsOf: me)) ?? Data("null".utf8), "application/json")
        case ("PUT", "/api/location"):
            guard let obj = try? JSONSerialization.jsonObject(with: r.body, options: .fragmentsAllowed) else { return .json(400, ["error": "bad location"]) }
            if obj is NSNull { try? FileManager.default.removeItem(at: me) } else { save(r.body, to: me) }
            return .json(200, ["ok": true])
        case ("GET", "/api/library"):
            return .json(200, ["mine": [], "builtin": [], "hidden": [], "categories": []])
        case ("GET", "/api/maps"):
            return .json(200, ["installed": [], "jobs": [:], "source": "",
                               "catalog_error": "Offline maps aren't in the phone app yet."])
        case ("GET", "/api/search"):
            return .json(200, ["results": []])
        case ("GET", "/api/videos"):
            return .json(200, [])
        default:
            break
        }
        if r.path.hasPrefix("/api/chats/") { return chat(r) }
        return .json(404, ["error": "not found"])
    }

    // MARK: Chats (one JSON file each, same shape as the desktop: {title, turns, updated})

    private func chatFile(_ id: String) -> URL? {
        let ok = chatID.firstMatch(in: id, range: NSRange(id.startIndex..., in: id)) != nil
        return ok ? chats.appendingPathComponent(id + ".json") : nil
    }

    private func listChats() -> [[String: Any]] {
        let files = (try? FileManager.default.contentsOfDirectory(at: chats, includingPropertiesForKeys: nil)) ?? []
        var out: [[String: Any]] = []
        for f in files where f.pathExtension == "json" {
            guard let d = try? JSONSerialization.jsonObject(with: Data(contentsOf: f)) as? [String: Any] else { continue }
            out.append(["id": f.deletingPathExtension().lastPathComponent,
                        "title": (d["title"] as? String).flatMap { $0.isEmpty ? nil : $0 } ?? "Untitled",
                        "updated": d["updated"] as? Double ?? 0])
        }
        return out.sorted { ($0["updated"] as! Double) > ($1["updated"] as! Double) }
    }

    private func chat(_ r: Request) -> Reply {
        guard let f = chatFile(String(r.path.split(separator: "/").last ?? "")) else { return .json(404, ["error": "not found"]) }
        switch r.method {
        case "GET":
            guard let d = try? Data(contentsOf: f) else { return .json(404, ["error": "not found"]) }
            return .raw(200, d, "application/json")
        case "PUT":
            guard let d = try? JSONSerialization.jsonObject(with: r.body) as? [String: Any], let turns = d["turns"] as? [Any] else {
                return .json(400, ["error": "bad chat"])
            }
            let title = String(((d["title"] as? String).flatMap { $0.isEmpty ? nil : $0 } ?? "Untitled").prefix(120))
            let out: [String: Any] = ["title": title, "turns": turns, "updated": Date().timeIntervalSince1970]
            if let bytes = try? JSONSerialization.data(withJSONObject: out) { save(bytes, to: f) }
            return .json(200, ["ok": true])
        case "DELETE":
            try? FileManager.default.removeItem(at: f)
            return .json(200, ["ok": true])
        default:
            return .json(404, ["error": "not found"])
        }
    }

    // MARK: Helpers

    private func save(_ d: Data, to url: URL) { try? d.write(to: url, options: .atomic) }

    static func line(_ obj: Any) -> Data {
        var d = (try? JSONSerialization.data(withJSONObject: obj)) ?? Data("{}".utf8)
        d.append(0x0A)
        return d
    }
}
