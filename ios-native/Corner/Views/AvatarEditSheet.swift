// AvatarEditSheet.swift — Corner native iOS
// corner:native-ios — avatar editing (photo, initials, color)
//
// Ports the web's AvatarIdentityDialog.jsx to native SwiftUI. The same three
// fields are offered: a photo from the camera roll, two custom initials, and
// a background color (8 preset swatches + the system color picker).
//
// PHOTO HANDLING: SwiftUI's PhotosPicker (iOS 16+) hands back a
// `PhotosPickerItem` that is read as a UIImage, downscaled to 256×256 and
// compressed to JPEG. The server accepts max 1 MB; the client targets ~100–200 kB
// so there is comfortable headroom. The compressed bytes ride base64 to
// POST /api/dashboard/avatar — the same lane the web uses.
//
// NO PHOTO-LIBRARY PERMISSION IS REQUIRED. PhotosPicker runs out-of-process in
// Apple's own picker UI and does not require NSPhotoLibraryUsageDescription.
// The PrivacyInfo.xcprivacy "Other User Content" entry already covers the photo
// bytes that are uploaded to the server.

import SwiftUI
import PhotosUI

// MARK: - Color presets (web's AVATAR_COLORS from AvatarIdentityDialog.jsx)

private let presetColors: [String] = [
    "#2563EB", // blue
    "#7C3AED", // violet
    "#0F766E", // teal
    "#B45309", // amber
    "#BE185D", // pink
    "#047857", // green
    "#C2410C", // orange
    "#4F46E5", // indigo
]

// MARK: - Sheet

struct AvatarEditSheet: View {
    // Starting identity from the caller (AccountView passes api.userAvatarIdentity).
    let identity: CornerAPI.AvatarIdentity
    /// Called on Save with (draft identity, optional JPEG Data, removeImage flag).
    /// Must throw on failure; success = the returned AvatarIdentity is the live value.
    let onSave: (CornerAPI.AvatarIdentity, Data?, Bool) async throws -> CornerAPI.AvatarIdentity

    @EnvironmentObject private var api: CornerAPI
    @Environment(\.dismiss) private var dismiss

    // Draft state
    @State private var draftInitials: String = ""
    @State private var draftColor: String = "#2563EB"
    @State private var draftLocalImage: UIImage? = nil   // locally picked, not yet uploaded
    @State private var removeExistingImage: Bool = false  // cleared from server

    // Picker
    @State private var pickerItem: PhotosPickerItem? = nil

    // Save state
    @State private var saving: Bool = false
    @State private var notice: String = ""

    // Computed: what to show in the preview disc
    private var previewHasPhoto: Bool {
        draftLocalImage != nil || (identity.imageURL != nil && !removeExistingImage)
    }
    private var previewImageURL: String? {
        (!removeExistingImage && draftLocalImage == nil) ? identity.imageURL : nil
    }
    private var previewIdentity: CornerAPI.AvatarIdentity {
        CornerAPI.AvatarIdentity(
            initials: draftInitials.isEmpty ? identity.initials : draftInitials,
            hexColor: draftColor,
            imageURL: previewImageURL
        )
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Theme.s5) {

                    // MARK: — Preview
                    HStack {
                        Spacer()
                        AvatarDisc(identity: previewIdentity, size: 88)
                            .localImage(draftLocalImage)
                        Spacer()
                    }
                    .padding(.top, Theme.s4)

                    // MARK: — Photo actions
                    VStack(spacing: Theme.s2) {
                        PhotosPicker(selection: $pickerItem, matching: .images) {
                            Label(previewHasPhoto ? "Replace photo" : "Add photo",
                                  systemImage: "photo")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.bordered)
                        .controlSize(.regular)
                        .onChange(of: pickerItem) { _, item in
                            guard let item else { return }
                            Task { await loadPickedImage(item) }
                        }

                        if previewHasPhoto {
                            Button(role: .destructive) {
                                draftLocalImage = nil
                                removeExistingImage = true
                                notice = "Photo will be removed on save."
                            } label: {
                                Label("Use initials instead", systemImage: "xmark.circle")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.bordered)
                            .controlSize(.regular)
                        }
                    }

                    Divider()

                    // MARK: — Initials
                    VStack(alignment: .leading, spacing: Theme.s2) {
                        Text("Initials")
                            .font(.hkSubheadline.weight(.semibold))
                            .foregroundStyle(Theme.inkSoft)
                        TextField("Two letters", text: $draftInitials)
                            .font(.hanken(22).weight(.bold))
                            .textInputAutocapitalization(.characters)
                            .autocorrectionDisabled()
                            .multilineTextAlignment(.center)
                            .frame(maxWidth: .infinity)
                            .padding(Theme.s3)
                            .background(Theme.raised, in: RoundedRectangle(cornerRadius: Theme.controlRadius, style: .continuous))
                            .onChange(of: draftInitials) { _, newVal in
                                // Mirror the web: strip non-letter/digit, max 2, uppercase.
                                let clean = newVal
                                    .filter { $0.isLetter || $0.isNumber }
                                    .prefix(2)
                                    .uppercased()
                                if draftInitials != clean { draftInitials = clean }
                            }
                        Text("Two letters shown when there is no photo.")
                            .font(.hkCaption)
                            .foregroundStyle(Theme.inkFaint)
                    }

                    Divider()

                    // MARK: — Color
                    VStack(alignment: .leading, spacing: Theme.s3) {
                        Text("Color")
                            .font(.hkSubheadline.weight(.semibold))
                            .foregroundStyle(Theme.inkSoft)
                        // 8 presets in two rows of 4
                        let columns = Array(repeating: GridItem(.flexible(), spacing: Theme.s2), count: 4)
                        LazyVGrid(columns: columns, spacing: Theme.s2) {
                            ForEach(presetColors, id: \.self) { hex in
                                ColorSwatch(hex: hex, selected: draftColor == hex) {
                                    draftColor = hex
                                }
                            }
                        }
                        // System color picker for custom hex
                        ColorPicker("Custom color", selection: Binding(
                            get: { Color(hexString: draftColor) ?? Color(cv6: 0x2563EB) },
                            set: { draftColor = $0.hexString }
                        ))
                        .font(.hkBody)
                    }

                    // MARK: — Notice
                    if !notice.isEmpty {
                        Text(notice)
                            .font(.hkCaption)
                            .foregroundStyle(notice.lowercased().contains("error") || notice.lowercased().contains("could not") || notice.lowercased().contains("failed")
                                ? Theme.warning : Theme.inkSoft)
                            .multilineTextAlignment(.center)
                            .frame(maxWidth: .infinity)
                    }

                    Spacer(minLength: Theme.s5)
                }
                .padding(.horizontal, Theme.s5)
            }
            .scrollContentBackground(.hidden)
            .background(Theme.ground)
            .navigationTitle("Edit profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                        .disabled(saving)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    if saving {
                        ProgressView().controlSize(.small)
                    } else {
                        Button("Save") {
                            Task { await save() }
                        }
                        .fontWeight(.semibold)
                        .disabled(draftInitials.isEmpty)
                    }
                }
            }
        }
        .onAppear {
            draftInitials = identity.initials
            draftColor    = identity.hexColor
            removeExistingImage = false
            draftLocalImage = nil
        }
    }

    // MARK: - Photo loading

    private func loadPickedImage(_ item: PhotosPickerItem) async {
        notice = "Preparing photo…"
        do {
            guard let data = try await item.loadTransferable(type: Data.self),
                  let source = UIImage(data: data) else {
                notice = "That photo could not be read."
                return
            }
            // Downscale to 256×256 centred crop, then JPEG-compress.
            let side = min(source.size.width, source.size.height)
            let cropped = await cropSquare(source, side: side)
            let scaled = await resize(cropped, to: CGSize(width: 256, height: 256))
            draftLocalImage = scaled
            removeExistingImage = false
            notice = "Photo ready. Tap Save to upload it."
        } catch {
            notice = "That photo could not be prepared."
        }
    }

    /// Centre-crop a UIImage to a square of `side` pts.
    private func cropSquare(_ image: UIImage, side: CGFloat) async -> UIImage {
        let scale = image.scale
        let origin = CGPoint(
            x: (image.size.width  - side) / 2,
            y: (image.size.height - side) / 2
        )
        let rect = CGRect(origin: origin, size: CGSize(width: side, height: side))
        guard let cgCrop = image.cgImage?.cropping(to: rect.applying(CGAffineTransform(scaleX: scale, y: scale))) else {
            return image
        }
        return UIImage(cgImage: cgCrop, scale: scale, orientation: image.imageOrientation)
    }

    /// Resize a UIImage to targetSize using UIGraphicsImageRenderer.
    private func resize(_ image: UIImage, to size: CGSize) async -> UIImage {
        UIGraphicsImageRenderer(size: size).image { _ in
            image.draw(in: CGRect(origin: .zero, size: size))
        }
    }

    // MARK: - Save

    private func save() async {
        saving = true
        notice = ""
        let initials = draftInitials.isEmpty ? identity.initials : draftInitials
        let color = draftColor

        // Build optional JPEG bytes for the locally-picked image.
        var jpegData: Data? = nil
        if let local = draftLocalImage {
            jpegData = local.jpegData(compressionQuality: 0.82)
        }

        do {
            _ = try await onSave(
                CornerAPI.AvatarIdentity(initials: initials, hexColor: color, imageURL: nil),
                jpegData,
                draftLocalImage == nil && removeExistingImage
            )
            dismiss()
        } catch {
            notice = (error as? CornerAPI.APIError)?.errorDescription
                ?? error.localizedDescription
            saving = false
        }
    }
}

// MARK: - Color swatch

private struct ColorSwatch: View {
    let hex: String
    let selected: Bool
    let choose: () -> Void

    var body: some View {
        Button(action: choose) {
            Circle()
                .fill(Color(hexString: hex) ?? .blue)
                .frame(height: 40)
                .overlay(
                    Group {
                        if selected {
                            Image(systemName: "checkmark")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(.white)
                        }
                    }
                )
                .overlay(
                    Circle()
                        .strokeBorder(selected ? Color.white.opacity(0.6) : Color.clear, lineWidth: 2)
                )
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Color \(hex)")
        .accessibilityAddTraits(selected ? [.isSelected] : [])
    }
}

// MARK: - AvatarDisc.localImage helper

/// Convenience modifier so callers can inject a locally-picked UIImage without a
/// separate struct property. Used only by AvatarEditSheet's preview disc.
extension AvatarDisc {
    func localImage(_ image: UIImage?) -> AvatarDisc {
        var copy = self
        copy.localImage = image
        return copy
    }
}

// MARK: - Color hex export

private extension Color {
    /// Export to "#RRGGBB" for storage in user_metadata. Uses UIColor for reliable
    /// RGB components across any display colour space. Falls back to "#2563EB" when
    /// resolution fails (shouldn't happen for the swatch + system-picker colours).
    var hexString: String {
        let ui = UIColor(self)
        var r: CGFloat = 0; var g: CGFloat = 0; var b: CGFloat = 0
        guard ui.getRed(&r, green: &g, blue: &b, alpha: nil) else { return "#2563EB" }
        let ri = Int(max(0, min(r, 1)) * 255)
        let gi = Int(max(0, min(g, 1)) * 255)
        let bi = Int(max(0, min(b, 1)) * 255)
        return String(format: "#%02X%02X%02X", ri, gi, bi)
    }
}
