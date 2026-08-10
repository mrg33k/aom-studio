// FileStore.swift — Corner native iOS
// corner:native-ios Stage 2
//
// Getting a file's real bytes onto the phone's disk, under its real name.
//
// WHY BYTES AND NOT A URL. QuickLook and the share sheet are file-based: they type a
// document by its extension and name the export by its filename. Handing either a
// remote URL gives you a web view and a link, not a preview and a file. So every
// preview goes through a download to a cache path that ends in the file's true name.
//
// THREE SOURCES, IN THE ORDER THE WEB PROVED (useReview.js::downloadDeliverable):
//   1. an absolute store URL          — fetched directly; this is what nearly every
//                                       real attachment carries (metadata.attachment.url
//                                       is `https://rag.aheadofmarket.com/files/…`)
//   2. a corner path via the tunnel   — /project-file-raw, Range-capable, which is why
//                                       images and video already stream from it
//   3. the authed Vercel proxy        — /api/dashboard/project-file?raw=1, which itself
//                                       falls back to the same tunnel
//
// AND A HARD LIMIT ON WHAT SOURCE 2 CAN EVEN ANSWER, verified live 2026-08-10 rather
// than assumed: the tunnel serves ONLY paths shaped `corner/users/<world>/projects|missions/…`
// or `corner/missions/…` (rag-server.py::_handle_project_file_raw) and 404s everything
// else — `corner/users/aom/agents/corner/rooms-2026-08-09.md` returns "not found" even
// though the file is right there on disk. Source 3 has the same ceiling because the
// proxy proxies to the tunnel. So some corner-path references have NO byte source at
// all, and the preview layer's job is to say that plainly instead of spinning forever.
//
// CACHE, NOT LIBRARY. Everything lands in Caches/, which iOS may purge under pressure —
// correct, because the durable copy is the server's. Nothing here writes to Documents;
// a Files-app-visible mirror of every previewed deliverable is a data-retention decision
// nobody made.

import Foundation
import CryptoKit

enum FileStoreError: LocalizedError {
    case noSource(name: String)
    case allSourcesFailed(name: String, lastStatus: Int?)
    case cancelled

    var errorDescription: String? {
        switch self {
        case .noSource(let name):
            return "\(name) has no address to load from — the message named it but carried no link."
        case .allSourcesFailed(let name, let status):
            if let status, status == 404 {
                return "\(name) is not where the message says it is. It may have been moved or cleaned up."
            }
            if let status {
                return "\(name) could not be downloaded (the server said \(status))."
            }
            return "\(name) could not be downloaded. Check your connection and try again."
        case .cancelled:
            return "Download cancelled."
        }
    }
}

/// One candidate byte source for a file.
struct FileSource: Equatable {
    let url: URL
    /// Whether this source needs the user's bearer token. The store and the tunnel are
    /// public hosts; only the Vercel proxy is tenant-gated. Sending the token to the
    /// tunnel would be harmless but pointless, and sending it nowhere would 401 the proxy.
    let authorized: Bool
}

enum FileStore {

    static let tunnelOrigin = URL(string: "https://rag.aheadofmarket.com")!

    // MARK: - Source resolution

    /// Ordered byte sources for one attachment. Empty means there is genuinely nothing
    /// to fetch, which is a real state (a multi-file announcement whose extra names
    /// carried no URL) and not an error to hide.
    static func sources(for attachment: Attachment) -> [FileSource] {
        let raw = attachment.url.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !raw.isEmpty else { return [] }

        if Attachment.isAbsolute(raw) {
            guard let url = encodedURL(raw) else { return [] }
            return [FileSource(url: url, authorized: false)]
        }

        // A corner-relative path. Both remaining sources take it as a query parameter.
        guard let encodedPath = raw.addingPercentEncoding(withAllowedCharacters: .alphanumerics.union(CharacterSet(charactersIn: "-._~"))) else {
            return []
        }
        var out: [FileSource] = []
        if let tunnel = URL(string: "\(tunnelOrigin.absoluteString)/project-file-raw?path=\(encodedPath)") {
            out.append(FileSource(url: tunnel, authorized: false))
        }
        if let proxy = URL(string: "\(Config.apiOrigin.absoluteString)/api/dashboard/project-file?path=\(encodedPath)&raw=1") {
            out.append(FileSource(url: proxy, authorized: true))
        }
        return out
    }

    /// Store URLs routinely carry spaces and other unencoded characters in the filename
    /// (`…/Q3 report final.pdf`). `URL(string:)` returns nil for those, which used to
    /// read as "the file is broken" when the file was fine and the string was raw.
    static func encodedURL(_ raw: String) -> URL? {
        if let direct = URL(string: raw) { return direct }
        guard let escaped = raw.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) else { return nil }
        return URL(string: escaped)
    }

    // MARK: - Cache paths

    /// Caches/CornerFiles/<digest of the identity>/<real filename>.
    ///
    /// The digest is of the ATTACHMENT URL, not the name: two agents can both deliver
    /// `report.pdf` and they are different files. The filename is preserved as the last
    /// path component because QuickLook types documents by extension and the share sheet
    /// exports under that exact name.
    static func cacheLocation(for attachment: Attachment) -> URL {
        let digest = SHA256.hash(data: Data(identity(of: attachment).utf8))
            .map { String(format: "%02x", $0) }
            .joined()
            .prefix(20)
        let folder = cacheRoot.appendingPathComponent(String(digest), isDirectory: true)
        return folder.appendingPathComponent(safeFilename(attachment.name), isDirectory: false)
    }

    static var cacheRoot: URL {
        let base = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        return base.appendingPathComponent("CornerFiles", isDirectory: true)
    }

    static func identity(of attachment: Attachment) -> String {
        attachment.url.isEmpty ? attachment.name : attachment.url
    }

    /// A filename from a server is untrusted input. Path separators would write outside
    /// the intended folder; a leading dot hides the file from the very APIs meant to
    /// read it back. The extension is preserved because it is load-bearing for preview.
    static func safeFilename(_ raw: String) -> String {
        var name = raw
            .replacingOccurrences(of: "/", with: "-")
            .replacingOccurrences(of: "\\", with: "-")
            .replacingOccurrences(of: ":", with: "-")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        while name.hasPrefix(".") { name.removeFirst() }
        if name.isEmpty { name = "file" }
        // 200 leaves room for the cache folder in a 255-byte filesystem limit.
        if name.count > 200 {
            let ext = (name as NSString).pathExtension
            let stem = String(name.prefix(180))
            name = ext.isEmpty ? stem : "\(stem).\(ext)"
        }
        return name
    }

    static func cachedFile(for attachment: Attachment) -> URL? {
        let location = cacheLocation(for: attachment)
        guard FileManager.default.fileExists(atPath: location.path) else { return nil }
        return location
    }

    /// Everything this app has downloaded, in bytes. Shown on the account screen so a
    /// cache the user cannot see is not a cache the user cannot clear.
    static func cacheSize() -> Int64 {
        guard let e = FileManager.default.enumerator(at: cacheRoot, includingPropertiesForKeys: [.fileSizeKey]) else { return 0 }
        var total: Int64 = 0
        for case let url as URL in e {
            let size = (try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
            total += Int64(size)
        }
        return total
    }

    static func clearCache() {
        try? FileManager.default.removeItem(at: cacheRoot)
    }

    static func humanSize(_ bytes: Int64) -> String {
        if bytes <= 0 { return "0 KB" }
        if bytes < 1024 { return "\(bytes) B" }
        if bytes < 1024 * 1024 { return "\(Int((Double(bytes) / 1024).rounded())) KB" }
        return String(format: "%.1f MB", Double(bytes) / 1_048_576)
    }

    // MARK: - Download

    /// Fetch the file to its cache location, trying each source in order.
    ///
    /// Progress is reported for the source actually being used. A failure on source N
    /// is NOT the user's error message — only when every source has failed does the
    /// caller hear about it, carrying the last status the server gave, because "404" and
    /// "no connection" are different problems with different next steps.
    static func download(
        _ attachment: Attachment,
        onProgress: (@Sendable (Double) -> Void)? = nil
    ) async throws -> URL {
        if let cached = cachedFile(for: attachment) { return cached }

        let candidates = sources(for: attachment)
        guard !candidates.isEmpty else { throw FileStoreError.noSource(name: attachment.name) }

        let destination = cacheLocation(for: attachment)
        try FileManager.default.createDirectory(
            at: destination.deletingLastPathComponent(),
            withIntermediateDirectories: true
        )

        var lastStatus: Int?
        for source in candidates {
            do {
                var request = URLRequest(url: source.url)
                request.timeoutInterval = 60
                if source.authorized {
                    let token = try await CornerAPI.shared.currentAccessToken()
                    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                }
                let observer = DownloadProgressObserver(onProgress: onProgress)
                let (tempURL, response) = try await URLSession.shared.download(for: request, delegate: observer)
                let status = (response as? HTTPURLResponse)?.statusCode ?? 0
                guard (200..<300).contains(status) else {
                    lastStatus = status
                    try? FileManager.default.removeItem(at: tempURL)
                    continue
                }
                // The temp file evaporates when this scope ends, so the move is not
                // optional cleanup — it is the download.
                if FileManager.default.fileExists(atPath: destination.path) {
                    try? FileManager.default.removeItem(at: destination)
                }
                try FileManager.default.moveItem(at: tempURL, to: destination)
                return destination
            } catch is CancellationError {
                throw FileStoreError.cancelled
            } catch {
                lastStatus = lastStatus ?? (error as NSError).code
                continue
            }
        }
        throw FileStoreError.allSourcesFailed(name: attachment.name, lastStatus: lastStatus)
    }
}

/// URLSession's async `download(for:delegate:)` streams to disk (never into memory,
/// which matters the first time someone opens a 400MB cut on cellular) and the delegate
/// is the only way to see progress while it does.
private final class DownloadProgressObserver: NSObject, URLSessionTaskDelegate, URLSessionDownloadDelegate, @unchecked Sendable {
    private let onProgress: (@Sendable (Double) -> Void)?

    init(onProgress: (@Sendable (Double) -> Void)?) {
        self.onProgress = onProgress
    }

    func urlSession(
        _ session: URLSession,
        downloadTask: URLSessionDownloadTask,
        didWriteData bytesWritten: Int64,
        totalBytesWritten: Int64,
        totalBytesExpectedToWrite: Int64
    ) {
        // A chunked response reports -1 for the expected total. Reporting 0% forever is
        // worse than reporting nothing, so an unknown total leaves progress alone and
        // the UI keeps its indeterminate spinner.
        guard totalBytesExpectedToWrite > 0 else { return }
        onProgress?(Double(totalBytesWritten) / Double(totalBytesExpectedToWrite))
    }

    func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didFinishDownloadingTo location: URL) {
        // The async API takes ownership of the temp file; nothing to do here, but the
        // delegate method must exist for the protocol.
    }
}
