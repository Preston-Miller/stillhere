// Draws the installer window background: an arrow from the app icon to the Applications folder, with one line of text.
// usage: swift make_dmg_background.swift <out-dir>   → background.png (640x400) and background@2x.png
// Icon centers must match the positions build.sh gives Finder: stillhere.app at (170, 190), Applications at (470, 190).
import Cocoa

let out = URL(fileURLWithPath: CommandLine.arguments[1])
let W: CGFloat = 640, H: CGFloat = 400

func draw(scale: CGFloat) -> Data {
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(W * scale), pixelsHigh: Int(H * scale),
                               bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                               colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    rep.size = NSSize(width: W, height: H)
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    // Finder uses top-left coordinates for icon positions; AppKit draws bottom-up.
    func y(_ top: CGFloat) -> CGFloat { H - top }

    NSColor(srgbRed: 0.965, green: 0.961, blue: 0.945, alpha: 1).setFill()
    NSRect(x: 0, y: 0, width: W, height: H).fill()

    // Arrow between the two icons (icons are 128pt; leave room around them).
    let ink = NSColor(srgbRed: 0.114, green: 0.122, blue: 0.11, alpha: 0.55)
    let a = NSBezierPath()
    a.move(to: NSPoint(x: 258, y: y(190))); a.line(to: NSPoint(x: 376, y: y(190)))
    a.lineWidth = 5; a.lineCapStyle = .round; ink.setStroke(); a.stroke()
    let head = NSBezierPath()
    head.move(to: NSPoint(x: 360, y: y(176))); head.line(to: NSPoint(x: 380, y: y(190))); head.line(to: NSPoint(x: 360, y: y(204)))
    head.lineWidth = 5; head.lineCapStyle = .round; head.lineJoinStyle = .round; head.stroke()

    func text(_ s: String, size: CGFloat, weight: NSFont.Weight, alpha: CGFloat, top: CGFloat) {
        let p = NSMutableParagraphStyle(); p.alignment = .center
        let attrs: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: size, weight: weight),
            .foregroundColor: NSColor(srgbRed: 0.114, green: 0.122, blue: 0.11, alpha: alpha),
            .paragraphStyle: p]
        NSAttributedString(string: s, attributes: attrs).draw(in: NSRect(x: 0, y: y(top) - size * 1.4, width: W, height: size * 1.6))
    }
    text("Drag stillhere into Applications", size: 17, weight: .semibold, alpha: 0.85, top: 300)
    text("Then open it from your Applications folder.", size: 13, weight: .regular, alpha: 0.55, top: 328)

    NSGraphicsContext.restoreGraphicsState()
    return rep.representation(using: .png, properties: [:])!
}

try! FileManager.default.createDirectory(at: out, withIntermediateDirectories: true)
try! draw(scale: 1).write(to: out.appendingPathComponent("background.png"))
try! draw(scale: 2).write(to: out.appendingPathComponent("background@2x.png"))
