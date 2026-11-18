// Stillhere for Mac: a native window around the local app.
//
// On launch it starts two helpers, both bound to 127.0.0.1 only:
//   1. Ollama (the AI engine), with its models in ~/Library/Application Support/Stillhere/models
//   2. the Stillhere server (Python), with user data in ~/Library/Application Support/Stillhere
// then shows the app in a WKWebView. Quitting stops both. If the app crashes, the server notices
// (STILLHERE_PARENT_PID) and stops itself and Ollama.
//
// Two layouts, chosen at runtime:
//   release  Contents/Resources/server/stillhere-server exists (Python frozen with PyInstaller),
//            plus Contents/Resources/{ollama/, library/}
//   dev      Info.plist key StillhereDevRoot points at the repository; runs app-venv/bin/python app/server.py
//            and shares the Ollama models already downloaded in ~/.ollama/models.
//
// Build: desktop/build.sh

import Cocoa
import WebKit

let appName = "Stillhere"   // data folder name in Application Support; keep it so updates find existing data
let displayName = "stillhere"   // the name people see (window, menus, messages)
let serverPreferredPort: UInt16 = 47821   // fixed when free, so the page origin (and its saved settings) stays the same
let ollamaPreferredPort: UInt16 = 47831

// MARK: - Paths

struct Layout {
    let release: Bool
    let serverExe: URL          // the program to run
    let serverArgs: [String]
    let resources: URL          // STILLHERE_RESOURCES: knowledge/, reference-sources/
    let library: URL            // STILLHERE_LIBRARY: library.sqlite
    let ollama: URL
    let models: URL             // OLLAMA_MODELS
    let mapsSource: String?     // OFFGRID_MAPS_SOURCE (nil = server default)

    static func detect() -> Layout? {
        let res = Bundle.main.resourceURL!
        let fm = FileManager.default
        let bundledOllama = res.appendingPathComponent("ollama/ollama")
        let support = Layout.support
        let frozen = res.appendingPathComponent("server/stillhere-server")
        if fm.isExecutableFile(atPath: frozen.path) {
            return Layout(release: true, serverExe: frozen, serverArgs: [],
                          resources: res.appendingPathComponent("library"),
                          library: res.appendingPathComponent("library/library.sqlite"),
                          ollama: bundledOllama,
                          models: support.appendingPathComponent("models"),
                          mapsSource: Bundle.main.object(forInfoDictionaryKey: "StillhereMapsSource") as? String)
        }
        guard let rootPath = Bundle.main.object(forInfoDictionaryKey: "StillhereDevRoot") as? String else { return nil }
        let root = URL(fileURLWithPath: rootPath)
        let ollama = fm.isExecutableFile(atPath: bundledOllama.path) ? bundledOllama : URL(fileURLWithPath: "/usr/local/bin/ollama")
        return Layout(release: false, serverExe: root.appendingPathComponent("app-venv/bin/python"),
                      serverArgs: [root.appendingPathComponent("app/server.py").path],
                      resources: root,
                      library: root.appendingPathComponent("app/data/library.sqlite"),
                      ollama: ollama,
                      models: fm.homeDirectoryForCurrentUser.appendingPathComponent(".ollama/models"),
                      mapsSource: nil)
    }

    static var support: URL {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent(appName)
    }
}

// MARK: - Ports

func canBind(_ port: UInt16) -> Bool {
    let fd = socket(AF_INET, SOCK_STREAM, 0)
    if fd < 0 { return false }
    defer { close(fd) }
    var addr = sockaddr_in()
    addr.sin_len = UInt8(MemoryLayout<sockaddr_in>.size)
    addr.sin_family = sa_family_t(AF_INET)
    addr.sin_port = port.bigEndian
    addr.sin_addr.s_addr = inet_addr("127.0.0.1")
    let r = withUnsafePointer(to: &addr) {
        $0.withMemoryRebound(to: sockaddr.self, capacity: 1) { bind(fd, $0, socklen_t(MemoryLayout<sockaddr_in>.size)) }
    }
    return r == 0
}

func pickPort(_ preferred: UInt16, avoiding: Set<UInt16> = []) -> UInt16 {
    for p in preferred..<(preferred + 9) where !avoiding.contains(p) && canBind(p) { return p }
    for _ in 0..<200 {
        let p = UInt16.random(in: 49152...65000)
        if !avoiding.contains(p) && canBind(p) { return p }
    }
    return preferred
}

// MARK: - Helper processes

final class Helpers {
    var ollama: Process?
    var server: Process?
    let pidFile = Layout.support.appendingPathComponent("helpers.pid")

    /// Stop helpers left behind by a previous run that did not shut down cleanly.
    func reapStale() {
        guard let text = try? String(contentsOf: pidFile, encoding: .utf8) else { return }
        for pid in text.split(separator: "\n").compactMap({ Int32($0) }) where pid > 1 {
            var buf = [CChar](repeating: 0, count: 4096)
            if proc_pidpath(pid, &buf, UInt32(buf.count)) > 0 {
                let path = String(cString: buf)
                if path.hasSuffix("/ollama") || path.contains("python") || path.hasSuffix("stillhere-server") { kill(pid, SIGTERM) }
            }
        }
        try? FileManager.default.removeItem(at: pidFile)
    }

    func savePids() {
        let pids = [ollama, server].compactMap { $0?.processIdentifier }.map(String.init).joined(separator: "\n")
        try? pids.write(to: pidFile, atomically: true, encoding: .utf8)
    }

    func start(_ layout: Layout, serverPort: UInt16, ollamaPort: UInt16, onServerExit: @escaping (Int32) -> Void) throws {
        let fm = FileManager.default
        let logs = Layout.support.appendingPathComponent("logs")
        try fm.createDirectory(at: logs, withIntermediateDirectories: true)
        try fm.createDirectory(at: layout.models, withIntermediateDirectories: true)

        let o = Process()
        o.executableURL = layout.ollama
        o.arguments = ["serve"]
        var oenv = ProcessInfo.processInfo.environment
        oenv["OLLAMA_HOST"] = "127.0.0.1:\(ollamaPort)"
        oenv["OLLAMA_MODELS"] = layout.models.path
        oenv["OLLAMA_NOPRUNE"] = "1"
        oenv["OLLAMA_NO_CLOUD"] = "1"          // local models only; nothing leaves the Mac
        o.environment = oenv
        o.standardOutput = try logHandle(logs.appendingPathComponent("ollama.log"))
        o.standardError = o.standardOutput
        try o.run()
        ollama = o

        let s = Process()
        s.executableURL = layout.serverExe
        s.arguments = layout.serverArgs + [String(serverPort)]
        var senv = ProcessInfo.processInfo.environment
        senv["STILLHERE_DATA"] = Layout.support.path
        senv["STILLHERE_RESOURCES"] = layout.resources.path
        senv["STILLHERE_LIBRARY"] = layout.library.path
        senv["STILLHERE_OLLAMA"] = "127.0.0.1:\(ollamaPort)"
        senv["STILLHERE_PARENT_PID"] = String(getpid())
        senv["STILLHERE_OLLAMA_PID"] = String(o.processIdentifier)
        senv["PYTHONUNBUFFERED"] = "1"
        if let m = layout.mapsSource { senv["OFFGRID_MAPS_SOURCE"] = m }
        // The frozen Python looks for certificates where python.org's installer puts them, which buyers won't have.
        // macOS keeps a system bundle here; without it, HTTPS map downloads fail.
        if senv["SSL_CERT_FILE"] == nil, FileManager.default.fileExists(atPath: "/etc/ssl/cert.pem") { senv["SSL_CERT_FILE"] = "/etc/ssl/cert.pem" }
        s.environment = senv
        s.standardOutput = try logHandle(logs.appendingPathComponent("server.log"))
        s.standardError = s.standardOutput
        s.terminationHandler = { p in DispatchQueue.main.async { onServerExit(p.terminationStatus) } }
        try s.run()
        server = s
        savePids()
    }

    func stop() {
        for p in [server, ollama].compactMap({ $0 }) where p.isRunning {
            p.terminationHandler = nil
            p.terminate()
        }
        let deadline = Date().addingTimeInterval(3)
        for p in [server, ollama].compactMap({ $0 }) {
            while p.isRunning && Date() < deadline { usleep(50_000) }
            if p.isRunning { kill(p.processIdentifier, SIGKILL) }
        }
        try? FileManager.default.removeItem(at: pidFile)
    }

    private func logHandle(_ url: URL) throws -> FileHandle {
        FileManager.default.createFile(atPath: url.path, contents: nil)   // a fresh log each launch
        return try FileHandle(forWritingTo: url)
    }
}

// MARK: - Pages shown before the app is up

let logoSVG = """
<svg viewBox="0 0 330 165" width="120"><path d="M18 138 L165 20 L312 138" fill="none" stroke="currentColor" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/><circle cx="165" cy="128" r="36" fill="#f4a12c"/></svg>
"""

func notice(_ title: String, _ body: String) -> String {
    """
    <!doctype html><meta charset="utf-8"><style>
    :root{color-scheme:light dark;--bg:#f6f5f1;--ink:#1d1f1c;--muted:#6a6d66}
    @media (prefers-color-scheme:dark){:root{--bg:#151714;--ink:#e7e8e3;--muted:#9a9e95}}
    html,body{height:100%;margin:0}body{background:var(--bg);color:var(--ink);font:15px/1.5 -apple-system,system-ui,sans-serif;
    display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 32px;-webkit-user-select:none;cursor:default}
    h1{font-size:19px;margin:22px 0 6px}p{color:var(--muted);margin:0;max-width:440px}
    </style><body>\(logoSVG)<h1>\(title)</h1><p>\(body)</p></body>
    """
}

// MARK: - App

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate {
    var window: NSWindow!
    var web: WKWebView!
    let helpers = Helpers()
    var serverPort: UInt16 = 0
    var ollamaPort: UInt16 = 0
    var appURL: URL { URL(string: "http://127.0.0.1:\(serverPort)/")! }
    var quitting = false

    func applicationDidFinishLaunching(_ note: Notification) {
        buildMenu()
        buildWindow()
        web.loadHTMLString(notice("Starting stillhere…", "Getting the AI ready. This can take up to half a minute."), baseURL: nil)

        guard let layout = Layout.detect() else {
            return fail("stillhere is damaged", "Part of the app is missing. Download stillhere again and replace this copy.")
        }
        do { try FileManager.default.createDirectory(at: Layout.support, withIntermediateDirectories: true) }
        catch { return fail("stillhere can't save its data", "Your Mac didn't allow creating a folder in Application Support.") }
        helpers.reapStale()
        ollamaPort = pickPort(ollamaPreferredPort)
        serverPort = pickPort(serverPreferredPort, avoiding: [ollamaPort])
        do {
            try helpers.start(layout, serverPort: serverPort, ollamaPort: ollamaPort) { [weak self] status in
                guard let self, !self.quitting else { return }
                self.fail("stillhere stopped unexpectedly", "Quit stillhere and open it again. If it keeps happening, the details are in the logs folder inside ~/Library/Application Support/Stillhere.")
            }
        } catch {
            return fail("stillhere couldn't start", error.localizedDescription)
        }
        waitForOllama(until: Date().addingTimeInterval(45))
    }

    /// Ollama's first answer after launch can take several seconds (GPU discovery, reading the model list).
    /// Waiting here keeps the page from flashing "AI isn't running" on a normal start. If it never answers,
    /// the page shows that message itself.
    func waitForOllama(until deadline: Date) {
        var req = URLRequest(url: URL(string: "http://127.0.0.1:\(ollamaPort)/api/tags")!)
        req.timeoutInterval = 15
        URLSession.shared.dataTask(with: req) { [weak self] _, resp, _ in
            DispatchQueue.main.async {
                guard let self, !self.quitting else { return }
                if (resp as? HTTPURLResponse)?.statusCode == 200 || Date() >= deadline {
                    self.waitForServer(until: Date().addingTimeInterval(90))
                } else {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { self.waitForOllama(until: deadline) }
                }
            }
        }.resume()
    }

    func waitForServer(until deadline: Date) {
        var req = URLRequest(url: appURL.appendingPathComponent("index.html"))
        req.timeoutInterval = 1
        URLSession.shared.dataTask(with: req) { [weak self] _, resp, _ in
            DispatchQueue.main.async {
                guard let self, !self.quitting else { return }
                if (resp as? HTTPURLResponse)?.statusCode == 200 {
                    self.web.load(URLRequest(url: self.appURL))
                } else if Date() < deadline {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { self.waitForServer(until: deadline) }
                } else {
                    self.fail("stillhere is taking too long to start", "Quit stillhere and open it again.")
                }
            }
        }.resume()
    }

    func fail(_ title: String, _ body: String) {
        web.loadHTMLString(notice(title, body), baseURL: nil)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ app: NSApplication) -> Bool { true }

    func applicationWillTerminate(_ note: Notification) {
        quitting = true
        helpers.stop()
    }

    // MARK: Window

    func buildWindow() {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.preferences.isElementFullscreenEnabled = true
        config.mediaTypesRequiringUserActionForPlayback = []
        #if DEBUG
        config.preferences.setValue(true, forKey: "developerExtrasEnabled")
        #endif
        if (Bundle.main.object(forInfoDictionaryKey: "StillhereDevRoot") as? String) != nil {
            config.preferences.setValue(true, forKey: "developerExtrasEnabled")   // right-click > Inspect Element in dev builds
        }
        web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = self
        web.uiDelegate = self
        web.allowsBackForwardNavigationGestures = false
        web.allowsMagnification = true
        web.underPageBackgroundColor = NSColor(name: nil) { a in
            a.bestMatch(from: [.darkAqua]) == .darkAqua ? NSColor(srgbRed: 0.082, green: 0.09, blue: 0.078, alpha: 1)
                                                        : NSColor(srgbRed: 0.965, green: 0.961, blue: 0.945, alpha: 1)
        }
        web.setValue(false, forKey: "drawsBackground")

        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1240, height: 820),
                          styleMask: [.titled, .closable, .miniaturizable, .resizable],
                          backing: .buffered, defer: false)
        window.title = displayName
        window.minSize = NSSize(width: 720, height: 520)
        window.backgroundColor = web.underPageBackgroundColor
        window.contentView = web
        window.center()
        window.setFrameAutosaveName("StillhereMain")
        window.tabbingMode = .disallowed
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    func isLocal(_ url: URL) -> Bool {
        if ["about", "data", "blob"].contains(url.scheme ?? "") { return true }
        return url.host == "127.0.0.1" && url.port == Int(serverPort)
    }

    // Links to the internet open in the default browser; the window only ever shows the local app.
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else { return decisionHandler(.cancel) }
        if isLocal(url) { return decisionHandler(.allow) }
        if action.targetFrame?.isMainFrame ?? true, ["http", "https", "mailto"].contains(url.scheme ?? "") {
            NSWorkspace.shared.open(url)
        }
        decisionHandler(.cancel)
    }

    // target=_blank and window.open
    func webView(_ webView: WKWebView, createWebViewWith config: WKWebViewConfiguration,
                 for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = action.request.url {
            if isLocal(url) { webView.load(URLRequest(url: url)) } else { NSWorkspace.shared.open(url) }
        }
        return nil
    }

    // <input type=file>
    func webView(_ webView: WKWebView, runOpenPanelWith params: WKOpenPanelParameters,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping ([URL]?) -> Void) {
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = params.allowsMultipleSelection
        panel.canChooseDirectories = false
        panel.canChooseFiles = true
        panel.beginSheetModal(for: window) { r in completionHandler(r == .OK ? panel.urls : nil) }
    }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let a = NSAlert(); a.messageText = message; a.addButton(withTitle: "OK")
        a.beginSheetModal(for: window) { _ in completionHandler() }
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let a = NSAlert(); a.messageText = message; a.addButton(withTitle: "OK"); a.addButton(withTitle: "Cancel")
        a.beginSheetModal(for: window) { r in completionHandler(r == .alertFirstButtonReturn) }
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        if !quitting { webView.load(URLRequest(url: appURL)) }
    }

    // MARK: Menu

    @objc func reloadPage() { web.reload() }
    @objc func actualSize() { web.magnification = 1 }
    @objc func zoomIn() { web.magnification = min(web.magnification + 0.1, 2) }
    @objc func zoomOut() { web.magnification = max(web.magnification - 0.1, 0.6) }
    @objc func openDataFolder() { NSWorkspace.shared.open(Layout.support) }

    func buildMenu() {
        let main = NSMenu()
        func item(_ menu: NSMenu, _ title: String, _ action: Selector?, _ key: String, _ mods: NSEvent.ModifierFlags = .command, target: AnyObject? = nil) {
            let i = NSMenuItem(title: title, action: action, keyEquivalent: key)
            i.keyEquivalentModifierMask = mods
            i.target = target
            menu.addItem(i)
        }
        func sub(_ title: String) -> NSMenu {
            let top = NSMenuItem(); let m = NSMenu(title: title); top.submenu = m; main.addItem(top); return m
        }

        let app = sub(displayName)
        item(app, "About \(displayName)", #selector(NSApplication.orderFrontStandardAboutPanel(_:)), "")
        app.addItem(.separator())
        item(app, "Hide \(displayName)", #selector(NSApplication.hide(_:)), "h")
        item(app, "Hide Others", #selector(NSApplication.hideOtherApplications(_:)), "h", [.command, .option])
        item(app, "Show All", #selector(NSApplication.unhideAllApplications(_:)), "")
        app.addItem(.separator())
        item(app, "Quit \(displayName)", #selector(NSApplication.terminate(_:)), "q")

        let edit = sub("Edit")
        item(edit, "Undo", Selector(("undo:")), "z")
        item(edit, "Redo", Selector(("redo:")), "z", [.command, .shift])
        edit.addItem(.separator())
        item(edit, "Cut", #selector(NSText.cut(_:)), "x")
        item(edit, "Copy", #selector(NSText.copy(_:)), "c")
        item(edit, "Paste", #selector(NSText.paste(_:)), "v")
        item(edit, "Select All", #selector(NSText.selectAll(_:)), "a")

        let view = sub("View")
        item(view, "Reload", #selector(reloadPage), "r", target: self)
        view.addItem(.separator())
        item(view, "Actual Size", #selector(actualSize), "0", target: self)
        item(view, "Zoom In", #selector(zoomIn), "+", target: self)
        item(view, "Zoom Out", #selector(zoomOut), "-", target: self)
        view.addItem(.separator())
        item(view, "Enter Full Screen", #selector(NSWindow.toggleFullScreen(_:)), "f", [.command, .control])

        let win = sub("Window")
        item(win, "Minimize", #selector(NSWindow.performMiniaturize(_:)), "m")
        item(win, "Zoom", #selector(NSWindow.performZoom(_:)), "")
        item(win, "Close", #selector(NSWindow.performClose(_:)), "w")
        NSApp.windowsMenu = win

        let help = sub("Help")
        item(help, "Show stillhere's Data Folder", #selector(openDataFolder), "", target: self)

        NSApp.mainMenu = main
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
signal(SIGPIPE, SIG_IGN)
app.run()
