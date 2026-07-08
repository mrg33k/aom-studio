import React from 'react';

/**
 * JsonLd component: renders schema.org structured data
 * Takes a JS object, converts to JSON-LD script tag
 *
 * Usage:
 *   <JsonLd schema={{
 *     "@context": "https://schema.org",
 *     "@type": "CreativeWork",
 *     name: "...",
 *     ...
 *   }} />
 */
export default function JsonLd({ schema }) {
  if (!schema) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema),
      }}
    />
  );
}
