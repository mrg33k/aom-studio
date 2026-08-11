// DictationTests.swift — Corner native iOS
// corner:native-ios R7
//
// The one pure piece of the dictation feature: where the transcript lands relative
// to what was already typed. The mic and the recognizer are Apple's; the seam that
// is OURS — and that silently eats a word when wrong — is the base-join. A missing
// separator glues "call brandon" onto "fix the deck" as "fix the deckcall brandon";
// a doubled one ships "deck  call". These pin the seam.

import XCTest
@testable import Corner

final class DictationTests: XCTestCase {

    func testEmptyDraftHasNoSeparator() {
        XCTAssertEqual(SpeechService.dictationBase(for: ""), "",
                       "dictating into an empty field must not start with a space")
    }

    func testTypedDraftGainsExactlyOneSpace() {
        XCTAssertEqual(SpeechService.dictationBase(for: "fix the deck"), "fix the deck ")
    }

    func testTrailingSpaceIsNotDoubled() {
        XCTAssertEqual(SpeechService.dictationBase(for: "fix the deck "), "fix the deck ")
    }

    func testTrailingNewlineIsRespected() {
        XCTAssertEqual(SpeechService.dictationBase(for: "fix the deck\n"), "fix the deck\n",
                       "a deliberate line break is already a separator")
    }

    /// The full seam as the composer uses it: base + streaming transcript.
    func testTranscriptAppendsAfterTypedText() {
        let base = SpeechService.dictationBase(for: "fix the deck")
        XCTAssertEqual(base + "call brandon", "fix the deck call brandon")
    }
}
