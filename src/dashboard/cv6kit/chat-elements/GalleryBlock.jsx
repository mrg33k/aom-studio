import React from 'react';

/**
 * CV6 kit Chat — Gallery Block. Renders many images as a tidy grid with a +N overlay.
 * Faithful to design-system-2026-06-21/ui_kits/agent-chat/gallery.html.
 *
 * Props:
 *   images[]     = { id?, src?, alt? }
 *   maxVisible   = number of thumbnails to show before the +N overlay (default 4)
 *   showCaption  = true/false to show the "N images · X MB" footer (default true)
 *   totalSize    = size string like "4.2 MB" (default calculated or "size not available")
 *   onGalleryOpen = callback when "Open gallery" button is clicked
 *   onReview     = callback when Review is tapped
 *   onSave       = callback when Save is tapped
 */

export function GalleryBlock({
  images = [
    { id: '1', src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzI2MzAzZiIvPjwvc3ZnPg==', alt: 'Gallery item' },
    { id: '2', src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzE2MWIyNiIvPjwvc3ZnPg==', alt: 'Gallery item' },
    { id: '3', src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzI2MzAzZiIvPjwvc3ZnPg==', alt: 'Gallery item' },
    { id: '4', src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzE2MWIyNiIvPjwvc3ZnPg==', alt: 'Gallery item' },
    { id: '5', src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzI2MzAzZiIvPjwvc3ZnPg==', alt: 'Gallery item' },
    { id: '6', src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzE2MWIyNiIvPjwvc3ZnPg==', alt: 'Gallery item' },
  ],
  maxVisible = 4,
  showCaption = true,
  totalSize = '4.2 MB',
  onGalleryOpen,
  onReview,
  onSave,
}) {
  const photoIconSVG = (
    <svg className="phglyph" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.6" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );

  const galleryIconSVG = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.6" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );

  const visibleImages = images.slice(0, maxVisible);
  const hiddenCount = Math.max(0, images.length - maxVisible);

  return (
    <div className="cblk" style={{ paddingBottom: '13px' }}>
      {/* Gallery grid — faithful to the design HTML structure */}
      <div className="cgal">
        {visibleImages.map((img, idx) => {
          const isFirst = idx === 0;
          return (
            <div
              key={img.id || idx}
              className={`ph ${isFirst ? 'span2' : ''}`}
              style={{
                backgroundImage: img.src ? `url(${img.src})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {!img.src && photoIconSVG}
            </div>
          );
        })}

        {hiddenCount > 0 && (
          <div className="ph">
            <div className="more">+{hiddenCount}</div>
          </div>
        )}
      </div>

 {/* Caption footer, "N images · X MB" */}
      {showCaption && (
        <div className="gal-cap">
          {galleryIconSVG}
          <span>{images.length} {images.length === 1 ? 'image' : 'images'} · {totalSize}</span>
        </div>
      )}

      {/* Action chips — Open gallery, Send to Review, Save to Organize */}
      <div className="chips">
        <button
          className="chip-btn is-primary"
          onClick={onGalleryOpen}
        >
          Open gallery
        </button>
        <button
          className="chip-btn"
          onClick={onReview}
        >
          Send to Review
        </button>
        <button
          className="chip-btn"
          onClick={onSave}
        >
          Save to Organize
        </button>
      </div>
    </div>
  );
}