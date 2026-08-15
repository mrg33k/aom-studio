// ConvexService.swift — Corner native iOS
// corner:native-ios Convex backend (BRIEF 04)
//
// Raw HTTP Convex client. Convex exposes REST endpoints at
// https://neat-pony-216.convex.cloud/api/query and
// https://neat-pony-216.convex.cloud/api/mutation
//
// If an official Convex Swift SDK becomes available, this file is the
// single seam to swap to it — call sites use ConvexService.shared only.

import Foundation

final class ConvexService {
    static let shared = ConvexService()

    let baseURL = URL(string: "https://neat-pony-216.convex.cloud")!

    private init() {}

    // MARK: - Query

    func query<T: Decodable>(_ functionName: String, args: [String: Any] = [:]) async throws -> T {
        var request = URLRequest(url: baseURL.appendingPathComponent("api/query"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 30
        let body: [String: Any] = ["path": functionName, "args": args, "format": "json"]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await URLSession.shared.data(for: request)
        if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            let msg = String(data: data.prefix(500), encoding: .utf8) ?? "HTTP \(http.statusCode)"
            throw ConvexError.badResponse(status: http.statusCode, message: msg)
        }
        return try ConvexService.decodeQueryResponse(data)
    }

    // MARK: - Mutation

    func mutation(_ functionName: String, args: [String: Any] = [:]) async throws {
        var request = URLRequest(url: baseURL.appendingPathComponent("api/mutation"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 30
        let body: [String: Any] = ["path": functionName, "args": args, "format": "json"]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await URLSession.shared.data(for: request)
        if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            let msg = String(data: data.prefix(500), encoding: .utf8) ?? "HTTP \(http.statusCode)"
            throw ConvexError.badResponse(status: http.statusCode, message: msg)
        }
    }

    // MARK: - Mutation with return value

    func mutationWithResult<T: Decodable>(_ functionName: String, args: [String: Any] = [:]) async throws -> T {
        var request = URLRequest(url: baseURL.appendingPathComponent("api/mutation"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 30
        let body: [String: Any] = ["path": functionName, "args": args, "format": "json"]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await URLSession.shared.data(for: request)
        if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            let msg = String(data: data.prefix(500), encoding: .utf8) ?? "HTTP \(http.statusCode)"
            throw ConvexError.badResponse(status: http.statusCode, message: msg)
        }
        return try ConvexService.decodeQueryResponse(data)
    }

    // MARK: - Polling helper

    /// Poll a query every `interval` seconds, calling `onUpdate` with each result.
    /// Returns the Task so the caller can cancel it when the view disappears.
    @discardableResult
    func pollQuery<T: Decodable>(
        _ functionName: String,
        args: [String: Any] = [:],
        interval: TimeInterval = 2.0,
        onUpdate: @escaping (Result<T, Error>) -> Void
    ) -> Task<Void, Never> {
        Task {
            while !Task.isCancelled {
                do {
                    let result: T = try await query(functionName, args: args)
                    if Task.isCancelled { break }
                    onUpdate(.success(result))
                } catch {
                    if Task.isCancelled { break }
                    onUpdate(.failure(error))
                }
                try? await Task.sleep(nanoseconds: UInt64(interval * 1_000_000_000))
            }
        }
    }

    // MARK: - Decoding

    /// Convex query responses are wrapped: {"status":"success","value":<T>} or
    /// {"value":<T>}. Try unwrapping before falling back to direct decode so the
    /// same call works against both the brief's simplified mock and the real Convex cloud.
    private static func decodeQueryResponse<T: Decodable>(_ data: Data) throws -> T {
        // Fast path: direct decode (brief's assumption)
        if let direct = try? JSONDecoder().decode(T.self, from: data) {
            return direct
        }
        // Wrapped forms: { "value": T }, { "data": T }, { "result": T }
        if let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            for key in ["value", "data", "result"] {
                if let inner = obj[key] {
                    let innerData: Data
                    // NSNull means empty result — try to decode as empty array if T is array
                    if inner is NSNull {
                        innerData = "null".data(using: .utf8)!
                    } else {
                        innerData = try JSONSerialization.data(withJSONObject: inner)
                    }
                    if let decoded = try? JSONDecoder().decode(T.self, from: innerData) {
                        return decoded
                    }
                    // Handle null -> empty array fallback for [MessageRow] etc
                    if inner is NSNull, let empty = try? JSONDecoder().decode(T.self, from: "[]".data(using: .utf8)!) {
                        return empty
                    }
                }
            }
            // Some Convex responses wrap as { "value": ..., "status": "success" }
            // If value is missing but the whole object IS the value (e.g. array direct)
            // we already tried direct decode above.
        }
        // Last resort: try decoding with keyDecodingStrategy / date handling leniently
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        // Give a clear error if nothing matched
        return try decoder.decode(T.self, from: data)
    }

    // MARK: - Errors

    enum ConvexError: LocalizedError {
        case badResponse(status: Int, message: String)

        var errorDescription: String? {
            switch self {
            case .badResponse(let status, let message):
                if message.isEmpty { return "Convex returned \(status)." }
                return message
            }
        }
    }
}
