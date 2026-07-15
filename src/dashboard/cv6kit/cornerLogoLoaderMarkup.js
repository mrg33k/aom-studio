const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export function cornerLogoMarkMarkup() {
  return '<span class="cv6-logo-loader__mark" aria-hidden="true">'
    + '<span class="cv6-logo-loader__base"></span>'
    + '<span class="cv6-logo-loader__fill"></span>'
    + '</span>';
}

// Static/template surfaces cannot mount React inside data-html. They use this
// exact markup helper so file/media waits share the same Corner logo primitive
// as FullscreenLoading instead of growing one-off SVG spinners.
export function cornerLogoLoaderMarkup(label, {
  className = '',
  compact = false,
  paper = false,
  mediaWait = false,
  minHeight = 0,
  waitAttribute = '',
} = {}) {
  const classes = [
    'cv6-logo-loader',
    'is-inline',
    compact ? 'is-compact' : '',
    paper ? 'is-paper' : '',
    className,
  ].filter(Boolean).join(' ');
  const height = Number.isFinite(Number(minHeight)) && Number(minHeight) > 0
    ? `min-height:${Number(minHeight)}px;`
    : '';
  const positioning = mediaWait
    ? 'position:absolute;inset:0;pointer-events:none;'
    : '';
  const safeWaitAttribute = /^data-[a-z0-9-]+$/.test(waitAttribute) ? waitAttribute : '';
  const waitAttr = mediaWait ? ' data-media-wait' : (safeWaitAttribute ? ` ${safeWaitAttribute}` : '');
  const safeLabel = escapeHtml(label);

  return `<div class="${escapeHtml(classes)}" data-cv6-logo-loader${waitAttr} role="status" aria-live="polite" aria-label="${safeLabel}" style="${positioning}${height}">`
    + '<div class="cv6-logo-loader__inner">'
    + cornerLogoMarkMarkup()
    + `<div class="cv6-logo-loader__label">${safeLabel}</div>`
    + '</div></div>';
}

export default cornerLogoLoaderMarkup;
