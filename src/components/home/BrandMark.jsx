import React, { useId } from 'react';
import { GLOBE_SVG, MONO_SVG } from './brandMarks';

/**
 * BrandMark -- renders the AOM globe or monogram inline so CSS `color` recolors
 * it (fill=currentColor). Each instance rewrites the internal <mask> id to a
 * unique value so multiple marks on one page do not collide.
 */
export default function BrandMark({ kind = 'globe', color, className = '', style = {} }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const raw = kind === 'mono' ? MONO_SVG : GLOBE_SVG;
  const base = kind === 'mono' ? 'm_aom_monogram_svg' : 'm_aom_globe_svg';
  const html = raw.split(base).join(`${base}_${uid}`);
  return (
    <span
      className={className}
      style={{ display: 'block', lineHeight: 0, color, ...style }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
