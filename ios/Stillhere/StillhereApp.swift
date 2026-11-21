// Stillhere for iPhone: a full-screen web view around the same UI as the Mac and Windows apps.
// Everything runs inside the app process; there is no local server. See ios/README.md.

import SwiftUI
import WebKit

@main
struct StillhereApp: App {
    var body: some Scene {
        WindowGroup {
            WebView().ignoresSafeArea(.container, edges: .bottom)
        }
    }
}

struct WebView: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        let support = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Stillhere", isDirectory: true)
        let web = Bundle.main.resourceURL!.appendingPathComponent("web", isDirectory: true)

        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(SchemeHandler(webFolder: web, router: Router(dataFolder: support)), forURLScheme: SchemeHandler.scheme)
        config.allowsInlineMediaPlayback = true

        let view = WKWebView(frame: .zero, configuration: config)
        view.isOpaque = false
        view.backgroundColor = .systemBackground
        view.scrollView.contentInsetAdjustmentBehavior = .never
        #if DEBUG
        view.isInspectable = true   // Safari > Develop > Simulator, for debugging the page
        #endif
        view.load(URLRequest(url: SchemeHandler.start))
        return view
    }

    func updateUIView(_ view: WKWebView, context: Context) {}
}
