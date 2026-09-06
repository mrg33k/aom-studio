import Foundation
import XCTest
@testable import Corner

/// Test-bundle fixture loading. The JSON comes straight from the backend
/// contract (`convex/contract/v2.native.fixture.json`, copied unedited);
/// these helpers only read it.
enum Fixture {
    static func load(_ name: String) throws -> Data {
        let url = try XCTUnwrap(
            Bundle(for: FixtureBundleMarker.self).url(forResource: name, withExtension: "json"),
            "missing test fixture \(name).json — was it added to the CornerTests target?"
        )
        return try Data(contentsOf: url)
    }

    static func decode<T: Decodable>(_ type: T.Type, from data: Data) throws -> T {
        try JSONDecoder.corner.decode(T.self, from: data)
    }

    /// Decode one nested object (e.g. the fixture's top-level `route`) without
    /// modeling the whole document.
    static func decode<T: Decodable>(_ type: T.Type, from data: Data, atKeyPath keyPath: String) throws -> T {
        let json = try JSONSerialization.jsonObject(with: data)
        guard let dict = json as? [String: Any], let nested = dict[keyPath] else {
            throw FixtureError.missingKeyPath(keyPath)
        }
        let nestedData = try JSONSerialization.data(withJSONObject: nested)
        return try decode(type, from: nestedData)
    }
}

enum FixtureError: Error {
    case missingKeyPath(String)
}

extension Fixture {
    /// The whole backend fixture in one decode.
    static func loadNativeFixture() throws -> NativeFixture {
        try decode(NativeFixture.self, from: load("v2.native.fixture"))
    }
}

final class FixtureBundleMarker: NSObject {}
