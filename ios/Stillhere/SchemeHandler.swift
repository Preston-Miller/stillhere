// Serves the shared UI to the web view at stillhere://app/..., with no local network server.
// Static files come from the bundle's web/ folder (copied from app/static at build time); /api/* goes to Router.
// The origin never changes, so the page's localStorage (settings, sidebar state) survives launches.

import Foundation
import WebKit

final class SchemeHandler: NSObject, WKURLSchemeHandler {
    static let scheme = "stillhere"
    static let start = URL(string: "stillhere://app/index.html")!

    private let web: URL
    private let router: Router
    private let queue = DispatchQueue(label: "stillhere.api", qos: .userInitiated, attributes: .concurrent)
    private var stopped = Set<ObjectIdentifier>()   // tasks the page cancelled (Stop button, navigation)
    private let lock = NSLock()

    init(webFolder: URL, router: Router) {
        web = webFolder.standardizedFileURL
        self.router = router
    }

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else { return }
        let path = url.path.isEmpty || url.path == "/" ? "/index.html" : url.path
        if path.hasPrefix("/api/") {
            let req = Request(method: task.request.httpMethod ?? "GET", path: path, query: Self.query(url), body: Self.body(task.request))
            queue.async { self.answer(task, url: url, reply: self.router.handle(req)) }
            return
        }
        let file = web.appendingPathComponent(String(path.dropFirst())).standardizedFileURL
        guard file.path.hasPrefix(web.path + "/"), let d = try? Data(contentsOf: file) else {
            send(task, url: url, status: 404, type: "text/plain", body: Data("not found".utf8)); return
        }
        send(task, url: url, status: 200, type: Self.mime(file.pathExtension), body: d)
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {
        lock.lock(); stopped.insert(ObjectIdentifier(task)); lock.unlock()
    }

    // MARK: Replies

    private func answer(_ task: WKURLSchemeTask, url: URL, reply: Reply) {
        switch reply {
        case .json(let status, let obj):
            let d = (try? JSONSerialization.data(withJSONObject: obj, options: .fragmentsAllowed)) ?? Data()
            send(task, url: url, status: status, type: "application/json", body: d)
        case .raw(let status, let d, let type):
            send(task, url: url, status: status, type: type, body: d)
        case .stream(let type, let run):
            onMain(task) { self.respond(task, url: url, status: 200, type: type, length: nil) }
            run({ chunk in self.onMain(task) { task.didReceive(chunk) } },
                { self.onMain(task) { task.didFinish() } })
        }
    }

    private func send(_ task: WKURLSchemeTask, url: URL, status: Int, type: String, body: Data) {
        onMain(task) {
            self.respond(task, url: url, status: status, type: type, length: body.count)
            task.didReceive(body)
            task.didFinish()
        }
    }

    private func respond(_ task: WKURLSchemeTask, url: URL, status: Int, type: String, length: Int?) {
        var h = ["Content-Type": type, "Cache-Control": "no-cache"]
        if let length { h["Content-Length"] = String(length) }
        task.didReceive(HTTPURLResponse(url: url, statusCode: status, httpVersion: "HTTP/1.1", headerFields: h)!)
    }

    /// WebKit raises an exception if a stopped task is touched, so every call checks first, on the main thread.
    private func onMain(_ task: WKURLSchemeTask, _ f: @escaping () -> Void) {
        DispatchQueue.main.async {
            self.lock.lock(); let gone = self.stopped.contains(ObjectIdentifier(task)); self.lock.unlock()
            if !gone { f() }
        }
    }

    // MARK: Request parsing

    private static func body(_ r: URLRequest) -> Data {
        if let d = r.httpBody { return d }
        guard let s = r.httpBodyStream else { return Data() }
        s.open(); defer { s.close() }
        var out = Data(); var buf = [UInt8](repeating: 0, count: 64 * 1024)
        while s.hasBytesAvailable { let n = s.read(&buf, maxLength: buf.count); if n <= 0 { break }; out.append(buf, count: n) }
        return out
    }

    private static func query(_ url: URL) -> [String: String] {
        var q: [String: String] = [:]
        for item in URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? [] { q[item.name] = item.value ?? "" }
        return q
    }

    private static func mime(_ ext: String) -> String {
        switch ext.lowercased() {
        case "html": return "text/html; charset=utf-8"
        case "js", "mjs": return "text/javascript; charset=utf-8"
        case "css": return "text/css; charset=utf-8"
        case "json", "geojson": return "application/json"
        case "svg": return "image/svg+xml"
        case "png": return "image/png"
        case "pbf": return "application/x-protobuf"
        case "pdf": return "application/pdf"
        default: return "application/octet-stream"
        }
    }
}
