// Draws the Stillhere app icon (roof + light) as an .iconset; build.sh turns it into AppIcon.icns.
// usage: swift make_icon.swift <out.iconset>
import Cocoa

let out = URL(fileURLWithPath: CommandLine.arguments[1])
try? FileManager.default.createDirectory(at: out, withIntermediateDirectories: true)

func draw(_ px: Int) -> Data {
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: px, pixelsHigh: px, bitsPerSample: 8, samplesPerPixel: 4,
                               hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    let s = CGFloat(px) / 1024
    // macOS icon grid: 824pt rounded square centered in 1024, with a soft shadow.
    let body = NSRect(x: 100 * s, y: 100 * s, width: 824 * s, height: 824 * s)
    let shape = NSBezierPath(roundedRect: body, xRadius: 185 * s, yRadius: 185 * s)
    NSGraphicsContext.saveGraphicsState()
    let shadow = NSShadow(); shadow.shadowOffset = NSSize(width: 0, height: -10 * s); shadow.shadowBlurRadius = 24 * s
    shadow.shadowColor = NSColor.black.withAlphaComponent(0.28); shadow.set()
    NSColor(srgbRed: 0.965, green: 0.961, blue: 0.945, alpha: 1).setFill(); shape.fill()
    NSGraphicsContext.restoreGraphicsState()

    // The logo is 330x165 in its own units; scale it to ~600 wide, centered a little below the middle.
    let k = 600 * s / 330, ox = 512 * s - 165 * k, oy = 512 * s + 82 * k - 20 * s   // y flipped: AppKit origin is bottom-left
    func p(_ x: CGFloat, _ y: CGFloat) -> NSPoint { NSPoint(x: ox + x * k, y: oy - y * k) }
    let roof = NSBezierPath()
    roof.move(to: p(18, 138)); roof.line(to: p(165, 20)); roof.line(to: p(312, 138))
    roof.lineWidth = 28 * k; roof.lineCapStyle = .round; roof.lineJoinStyle = .round
    NSColor(srgbRed: 0.114, green: 0.122, blue: 0.11, alpha: 1).setStroke(); roof.stroke()
    let c = p(165, 128), r = 36 * k
    NSColor(srgbRed: 0.957, green: 0.631, blue: 0.173, alpha: 1).setFill()
    NSBezierPath(ovalIn: NSRect(x: c.x - r, y: c.y - r, width: 2 * r, height: 2 * r)).fill()
    NSGraphicsContext.restoreGraphicsState()
    return rep.representation(using: .png, properties: [:])!
}

for (name, px) in [("16x16", 16), ("16x16@2x", 32), ("32x32", 32), ("32x32@2x", 64), ("128x128", 128),
                   ("128x128@2x", 256), ("256x256", 256), ("256x256@2x", 512), ("512x512", 512), ("512x512@2x", 1024)] {
    try! draw(px).write(to: out.appendingPathComponent("icon_\(name).png"))
}
