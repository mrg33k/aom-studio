import React, { useState, useCallback, useEffect, useRef } from 'react'
import { ArrowLeft, Copy, Check, ChevronDown, ChevronUp, Download } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toPng } from 'html-to-image'
import {
  TemplateSocialIGPost,
  TemplateSocialIGStory,
  TemplateSocialLinkedIn,
  TemplateSocialBeforeAfter,
  TemplateSocialTestimonial,
  TemplateSocialQuickTip,
  TemplatePresentationTitle,
  TemplatePresentationContent,
  TemplatePresentationStats,
} from '../components/templates'

/* ------------------------------------------------------------------ */
/*  AOM Brand Guidelines v5: "Editorial Bold"                          */
/*  Deep visual brand guide. Marks, type, color, patterns, templates.  */
/*  Type: Syne (display/mark) + Fraunces (editorial voice)             */
/*        + Hanken Grotesk (body & system). No mono.                   */
/* ------------------------------------------------------------------ */

const C = {
  cream: '#FDF6EC',
  creamDark: '#EDE7DF',
  black: '#0A0A0A',
  night: '#0C0C0C',
  nightCard: '#151515',
  nightBorder: 'rgba(255,255,255,0.10)',
  nightBorderHover: 'rgba(255,255,255,0.18)',
  orange: '#E85D26',
  orangeHover: '#D14E1C',
  orangeGlow: 'rgba(232,93,38,0.15)',
  gold: '#C9A84C',
  sage: '#7C9A72',
  sageMuted: '#5C7A54',
  warmGray: '#7A7267',
  lightBorder: '#D9D3CB',
  textLight: '#F0ECE6',
  textLightMuted: '#8A847C',
  white: '#FFFFFF',
}

/* ================================================================== */
/*  UTILITIES                                                          */
/* ================================================================== */

/* The brand device: a perfect orange dot. The period in "AOM." Sized in em
   so it scales with the wordmark it sits beside. Round everywhere — never the
   font's squarish period glyph. */
function Dot({ size = '0.14em', color = '#E85D26', ml = '0.02em' }) {
  return (
    <span style={{
      display: 'inline-block',
      width: size,
      height: size,
      borderRadius: 0,
      background: color,
      verticalAlign: 'baseline',
      marginLeft: ml,
    }} />
  )
}

function CopyHex({ hex }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(hex); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      title="Copy hex"
    >
      <span style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: 13, color: 'inherit' }}>{hex}</span>
      {copied ? <Check size={12} /> : <Copy size={12} style={{ opacity: 0.4 }} />}
    </button>
  )
}

function Badge({ children, color = C.black, bg = 'transparent', style = {} }) {
  return (
    <span style={{
      display: 'inline-block',
      fontFamily: '"Hanken Grotesk", sans-serif',
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      color,
      border: `1px solid ${color}`,
      borderRadius: 100,
      padding: '4px 14px',
      background: bg,
      lineHeight: 1.4,
      ...style,
    }}>{children}</span>
  )
}

function SectionHeader({ num, title, subtitle, dark = false }) {
  const textColor = dark ? C.textLight : C.black
  const mutedColor = dark ? C.textLightMuted : C.warmGray
  return (
    <div style={{ marginBottom: 48, position: 'relative' }}>
      <span style={{
        fontFamily: '"Syne", sans-serif',
        fontSize: 120,
        fontWeight: 800,
        lineHeight: 1,
        color: dark ? 'rgba(255,255,255,0.04)' : 'rgba(232,93,38,0.08)',
        position: 'absolute',
        top: -50,
        left: -10,
        userSelect: 'none',
        pointerEvents: 'none',
      }}>{String(num).padStart(2, '0')}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <Badge color={dark ? C.orange : C.orange} style={{ borderColor: C.orange }}>Section {num}</Badge>
      </div>
      <h2 style={{
        fontFamily: '"Syne", sans-serif',
        fontSize: 'clamp(32px, 5vw, 56px)',
        fontWeight: 800,
        color: textColor,
        lineHeight: 1.05,
        letterSpacing: '-0.02em',
        margin: 0,
      }}>{title}</h2>
      {subtitle && (
        <p style={{
          fontFamily: '"Hanken Grotesk", sans-serif',
          fontSize: 16,
          color: mutedColor,
          marginTop: 8,
          maxWidth: 560,
          lineHeight: 1.5,
        }}>{subtitle}</p>
      )}
    </div>
  )
}

function DarkSection({ children, style = {} }) {
  return (
    <section style={{
      background: C.night,
      padding: 'clamp(48px, 8vw, 96px) clamp(24px, 5vw, 80px)',
      color: C.textLight,
      ...style,
    }}>{children}</section>
  )
}

function LightSection({ children, style = {} }) {
  return (
    <section style={{
      background: C.cream,
      padding: 'clamp(48px, 8vw, 96px) clamp(24px, 5vw, 80px)',
      color: C.black,
      ...style,
    }}>{children}</section>
  )
}

function MaxWidth({ children, style = {} }) {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', ...style }}>{children}</div>
  )
}

/* ================================================================== */
/*  SVG PATTERNS (THE MISSING PIECE)                                   */
/* ================================================================== */

function PatternDiagonalLines({ color = C.orange, opacity = 0.12, size = 200 }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: 12,
      overflow: 'hidden',
      border: `1px solid ${C.nightBorder}`,
      background: C.nightCard,
      position: 'relative',
    }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="diag-lines" patternUnits="userSpaceOnUse" width="12" height="12" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="12" stroke={color} strokeWidth="1.5" opacity={opacity * 3} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#diag-lines)" />
      </svg>
    </div>
  )
}

function PatternDotGrid({ color = C.orange, opacity = 0.2, size = 200 }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: 12,
      overflow: 'hidden',
      border: `1px solid ${C.nightBorder}`,
      background: C.nightCard,
      position: 'relative',
    }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="dot-grid" patternUnits="userSpaceOnUse" width="20" height="20">
            <circle cx="10" cy="10" r="1.5" fill={color} opacity={opacity * 2} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dot-grid)" />
      </svg>
    </div>
  )
}

function PatternCrossHatch({ color = C.textLight, opacity = 0.08, size = 200 }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: 12,
      overflow: 'hidden',
      border: `1px solid ${C.nightBorder}`,
      background: C.nightCard,
      position: 'relative',
    }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="cross-hatch" patternUnits="userSpaceOnUse" width="16" height="16">
            <line x1="0" y1="0" x2="16" y2="16" stroke={color} strokeWidth="0.75" opacity={opacity * 4} />
            <line x1="16" y1="0" x2="0" y2="16" stroke={color} strokeWidth="0.75" opacity={opacity * 4} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cross-hatch)" />
      </svg>
    </div>
  )
}

function PatternAngularGrid({ color = C.orange, size = 200 }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: 12,
      overflow: 'hidden',
      border: `1px solid ${C.nightBorder}`,
      background: C.nightCard,
      position: 'relative',
    }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="angular-grid" patternUnits="userSpaceOnUse" width="40" height="40">
            <rect x="0" y="0" width="40" height="40" fill="none" stroke={color} strokeWidth="0.5" opacity="0.15" />
            <line x1="0" y1="0" x2="40" y2="40" stroke={color} strokeWidth="0.5" opacity="0.1" />
            <rect x="15" y="15" width="10" height="10" fill={color} opacity="0.06" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#angular-grid)" />
      </svg>
    </div>
  )
}

function PatternFilmGrain({ size = 200 }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: 12,
      overflow: 'hidden',
      border: `1px solid ${C.nightBorder}`,
      background: C.nightCard,
      position: 'relative',
    }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
        <rect width="100%" height="100%" filter="url(#grain)" opacity="0.15" />
      </svg>
    </div>
  )
}

function PatternOrangeBar({ size = 200 }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: 12,
      overflow: 'hidden',
      border: `1px solid ${C.nightBorder}`,
      background: C.nightCard,
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
    }}>
      {[...Array(7)].map((_, i) => (
        <div key={i} style={{
          width: i % 2 === 0 ? '75%' : '55%',
          height: 3,
          background: C.orange,
          opacity: 0.15 + (i * 0.06),
          borderRadius: 2,
        }} />
      ))}
    </div>
  )
}

/* ================================================================== */
/*  DOWNLOAD PNG BUTTON                                                */
/* ================================================================== */

function DownloadPngButton({ svgConfig, size, label }) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = useCallback(() => {
    setDownloading(true)
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    let svgString
    if (svgConfig.type === 'icon') {
      const padding = Math.round(size * 0.15)
      const innerSize = size - padding * 2
      svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <rect width="${size}" height="${size}" fill="${svgConfig.bg}" rx="${Math.round(size * 0.08)}"/>
        <text x="${padding + innerSize * 0.075}" y="${padding + innerSize * 0.70}" font-family="Syne, Arial, sans-serif" font-size="${innerSize * 0.525}" font-weight="800" fill="${svgConfig.fill}" letter-spacing="0">A</text>
        <rect x="${padding + innerSize * 0.7375}" y="${padding + innerSize * 0.525}" width="${innerSize * 0.175}" height="${innerSize * 0.175}" fill="${svgConfig.dotFill}"/>
      </svg>`
    } else if (svgConfig.type === 'wordmark') {
      canvas.width = size
      canvas.height = Math.round(size * 80 / 330)
      const w = canvas.width
      const h = canvas.height
      svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 330 80">
        ${svgConfig.transparent ? '' : `<rect width="320" height="80" fill="${svgConfig.bg || 'transparent'}"/>`}
        <text x="0" y="66" font-family="Syne, Arial, sans-serif" font-size="76" font-weight="800" fill="${svgConfig.fill}" letter-spacing="-3">AOM</text><rect x="304" y="50" width="16" height="16" fill="${svgConfig.dotFill}" />
      </svg>`
    }

    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      canvas.toBlob((pngBlob) => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(pngBlob)
        a.download = `${svgConfig.filename || 'aom-asset'}-${size}px.png`
        a.click()
        URL.revokeObjectURL(a.href)
        setDownloading(false)
      }, 'image/png')
    }
    img.onerror = () => {
      setDownloading(false)
    }
    img.src = url
  }, [svgConfig, size])

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 10px',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
        color: '#E85D26',
        background: 'rgba(232,93,38,0.1)',
        border: `1px solid rgba(232,93,38,0.2)`,
        cursor: downloading ? 'wait' : 'pointer',
        opacity: downloading ? 0.6 : 1,
        fontFamily: '"Hanken Grotesk", sans-serif',
      }}
    >
      <Download size={10} />
      {label}
    </button>
  )
}

/* Download button that captures a DOM element as PNG via html-to-image */
function DownloadElementPngButton({ targetRef, filename, width, height, label = 'PNG', small = false }) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = useCallback(async () => {
    if (!targetRef.current) return
    setDownloading(true)
    try {
      const dataUrl = await toPng(targetRef.current, {
        width: width || targetRef.current.offsetWidth,
        height: height || targetRef.current.offsetHeight,
        pixelRatio: width ? width / targetRef.current.offsetWidth : 2,
        cacheBust: true,
        style: { transform: 'none', margin: 0 },
      })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `${filename || 'aom-asset'}.png`
      a.click()
    } catch (err) {
      console.error('PNG export failed:', err)
    }
    setDownloading(false)
  }, [targetRef, filename, width, height])

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: small ? '3px 8px' : '4px 10px',
        borderRadius: 6,
        fontSize: small ? 11 : 12,
        fontWeight: 600,
        color: '#E85D26',
        background: 'rgba(232,93,38,0.1)',
        border: '1px solid rgba(232,93,38,0.2)',
        cursor: downloading ? 'wait' : 'pointer',
        opacity: downloading ? 0.6 : 1,
        fontFamily: '"Hanken Grotesk", sans-serif',
      }}
    >
      <Download size={small ? 9 : 10} />
      {label}
    </button>
  )
}

/* Collapsible recreation specs for template cards */
function TemplateSpecs({ specs }) {
  const [open, setOpen] = useState(false)
  if (!specs) return null

  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 8px',
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 600,
          color: C.textLightMuted,
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${C.nightBorder}`,
          cursor: 'pointer',
          fontFamily: '"Hanken Grotesk", sans-serif',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        Specs
        {open ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      </button>
      {open && (
        <div style={{
          marginTop: 8,
          padding: '10px 12px',
          background: 'rgba(0,0,0,0.3)',
          borderRadius: 6,
          border: `1px solid ${C.nightBorder}`,
          fontSize: 11,
          fontFamily: '"Hanken Grotesk", sans-serif',
          color: C.textLightMuted,
          lineHeight: 1.7,
        }}>
          {specs.fonts && (
            <div style={{ marginBottom: 6 }}>
              <span style={{ color: C.orange, fontWeight: 700, fontSize: 10, letterSpacing: '0.1em' }}>FONTS</span>
              <div>{specs.fonts.join(' / ')}</div>
            </div>
          )}
          {specs.colors && (
            <div style={{ marginBottom: 6 }}>
              <span style={{ color: C.orange, fontWeight: 700, fontSize: 10, letterSpacing: '0.1em' }}>COLORS</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
                {specs.colors.map((c, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: c.hex,
                      border: c.hex === '#0C0C0C' || c.hex === '#0A0A0A' ? '1px solid rgba(255,255,255,0.2)' : 'none',
                      flexShrink: 0,
                    }} />
                    <span>{c.hex}</span>
                    {c.label && <span style={{ color: 'rgba(255,255,255,0.3)' }}>({c.label})</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
          {specs.layout && (
            <div>
              <span style={{ color: C.orange, fontWeight: 700, fontSize: 10, letterSpacing: '0.1em' }}>LAYOUT</span>
              <div>{specs.layout}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* Wrapper for inline logo SVGs that adds a transparent PNG download button */
function LogoWithDownload({ children, filename, label, svgConfig, size = 800 }) {
  const ref = useRef(null)
  // If svgConfig is provided, use the existing SVG-to-canvas approach for higher quality
  // Otherwise, use html-to-image on the DOM element
  if (svgConfig) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        {children}
        <DownloadPngButton svgConfig={svgConfig} size={size} label={label || 'PNG'} />
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div ref={ref}>
        {children}
      </div>
      <DownloadElementPngButton targetRef={ref} filename={filename} label={label || 'PNG'} small />
    </div>
  )
}

/* Full-width pattern strip for section dividers */
function PatternStrip({ pattern = 'diagonal', height = 4 }) {
  const patternDefs = {
    diagonal: (
      <pattern id="strip-diag" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="8" stroke={C.orange} strokeWidth="1" opacity="0.3" />
      </pattern>
    ),
    dots: (
      <pattern id="strip-dots" patternUnits="userSpaceOnUse" width="12" height="12">
        <circle cx="6" cy="6" r="1" fill={C.orange} opacity="0.4" />
      </pattern>
    ),
  }
  return (
    <div style={{ width: '100%', height, overflow: 'hidden' }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>{patternDefs[pattern]}</defs>
        <rect width="100%" height="100%" fill={`url(#strip-${pattern === 'diagonal' ? 'diag' : pattern})`} />
      </svg>
    </div>
  )
}

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */

/* ================================================================== */
/*  TABLE OF CONTENTS SECTIONS                                         */
/* ================================================================== */

const TOC_SECTIONS = [
  { id: 'brand-mark', num: '01', label: 'Brand Mark' },
  { id: 'color-system', num: '02', label: 'Color' },
  { id: 'typography', num: '03', label: 'Typography' },
  { id: 'patterns', num: '04', label: 'Patterns' },
  { id: 'spacing', num: '05', label: 'Spacing' },
  { id: 'components', num: '06', label: 'Components' },
  { id: 'photography', num: '07', label: 'Photography' },
  { id: 'voice-tone', num: '08', label: 'Voice & Tone' },
  { id: 'template-kit', num: '09', label: 'Template Kit' },
]

/* ================================================================== */
/*  TEMPLATE CARD WRAPPER                                              */
/* ================================================================== */

function TemplateCard({ children, name, dimensions, usage, specs, exportWidth, exportHeight, exportFilename }) {
  const [hovered, setHovered] = useState(false)
  const previewRef = useRef(null)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: C.nightCard,
        border: `1px solid ${hovered ? 'rgba(232,93,38,0.2)' : C.nightBorder}`,
        padding: 32,
        transition: 'border-color 0.25s, transform 0.25s',
        transform: hovered ? 'translateY(-2px)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div
        ref={previewRef}
        style={{
          width: '100%',
          maxWidth: 320,
          margin: '0 auto',
          overflow: 'hidden',
          border: `1px solid ${C.nightBorder}`,
        }}
      >
        {children}
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{
            fontFamily: '"Hanken Grotesk", sans-serif',
            fontSize: 16,
            fontWeight: 600,
            color: C.textLight,
          }}>{name}</div>
          <DownloadElementPngButton
            targetRef={previewRef}
            filename={exportFilename || `aom-${name.toLowerCase().replace(/[\s/]+/g, '-')}`}
            width={exportWidth}
            height={exportHeight}
            label="PNG"
            small
          />
        </div>
        <div style={{
          fontFamily: '"Hanken Grotesk", sans-serif',
          fontSize: 11,
          fontWeight: 500,
          color: C.textLightMuted,
          marginBottom: 4,
        }}>{dimensions}</div>
        <div style={{
          fontFamily: '"Hanken Grotesk", sans-serif',
          fontSize: 14,
          color: C.textLightMuted,
          lineHeight: 1.5,
        }}>{usage}</div>
        <TemplateSpecs specs={specs} />
      </div>
    </div>
  )
}

/* ================================================================== */
/*  STICKY TABLE OF CONTENTS                                           */
/* ================================================================== */

function TableOfContents({ activeSection }) {
  return (
    <nav style={{
      position: 'fixed',
      left: 24,
      top: '50%',
      transform: 'translateY(-50%)',
      width: 140,
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
    }}>
      {TOC_SECTIONS.map((section, i) => {
        const isActive = activeSection === section.id
        return (
          <a
            key={section.id}
            href={`#${section.id}`}
            onClick={(e) => {
              e.preventDefault()
              document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' })
            }}
            style={{
              fontFamily: '"Hanken Grotesk", sans-serif',
              fontSize: 13,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? C.orange : C.textLightMuted,
              textDecoration: 'none',
              padding: '8px 0',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              position: 'relative',
              transition: 'color 0.2s',
            }}
          >
            {/* Connecting line */}
            {i < TOC_SECTIONS.length - 1 && (
              <div style={{
                position: 'absolute',
                left: 8,
                top: 24,
                width: 1,
                height: '100%',
                background: 'rgba(255,255,255,0.06)',
              }} />
            )}
            <span style={{
              width: 16,
              height: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: '"Hanken Grotesk", sans-serif',
              fontSize: 8,
              fontWeight: 700,
              flexShrink: 0,
              position: 'relative',
              zIndex: 1,
            }}>{section.num}</span>
            <span>{section.label}</span>
          </a>
        )
      })}
    </nav>
  )
}

/* ================================================================== */
/*  PRINT PREVIEW CARD                                                 */
/* ================================================================== */

function PrintPreviewCard({ type = 'business-card' }) {
  const isBizCard = type === 'business-card'

  return (
    <TemplateCard
      name={isBizCard ? 'Business Card' : 'Letterhead'}
      dimensions={isBizCard ? '3.5" x 2"' : '8.5" x 11"'}
      usage={isBizCard
        ? 'Standard business card. Front: logo centered on Night. Back: contact info on Cream.'
        : 'Standard letterhead. AOM stacked lockup top-left, pattern strip at top edge, footer with contact info.'
      }
    >
      {isBizCard ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Front */}
          <div style={{
            aspectRatio: '3.5 / 2',
            background: C.night,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{
              fontFamily: '"Syne", sans-serif',
              fontSize: 20,
              fontWeight: 800,
              color: C.textLight,
            }}>AOM<span style={{ color: C.orange }}>.</span></span>
          </div>
          {/* Back */}
          <div style={{
            aspectRatio: '3.5 / 2',
            background: C.cream,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}>
            <div style={{
              fontFamily: '"Syne", sans-serif',
              fontSize: 11,
              fontWeight: 700,
              color: '#0A0A0A',
              marginBottom: 2,
            }}>Patrik Matheson</div>
            <div style={{
              fontFamily: '"Hanken Grotesk", sans-serif',
              fontSize: 8,
              fontWeight: 400,
              color: C.warmGray,
              marginBottom: 6,
            }}>Creative Director</div>
            <div style={{
              fontFamily: '"Hanken Grotesk", sans-serif',
              fontSize: 7,
              color: C.warmGray,
              lineHeight: 1.6,
            }}>
              hello@aom-inhouse.com<br/>
              aheadofmarket.com<br/>
              Phoenix, AZ
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          aspectRatio: '8.5 / 11',
          background: C.cream,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Pattern strip */}
          <div style={{
            height: 3,
            background: `repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(232,93,38,0.25) 4px, rgba(232,93,38,0.25) 5px)`,
          }} />

          {/* Logo */}
          <div style={{ padding: '12px 16px' }}>
            <span style={{
              fontFamily: '"Syne", sans-serif',
              fontSize: 12,
              fontWeight: 800,
              color: '#0A0A0A',
            }}>AOM<span style={{ color: C.orange }}>.</span></span>
            <div style={{
              fontFamily: '"Hanken Grotesk", sans-serif',
              fontSize: 6,
              color: C.warmGray,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>AHEAD OF MARKET</div>
          </div>

          {/* Body zone placeholder */}
          <div style={{ flex: 1, padding: '8px 16px' }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{
                height: 3,
                background: i < 4 ? 'rgba(0,0,0,0.06)' : 'transparent',
                marginBottom: 5,
                width: i === 3 ? '60%' : '100%',
              }} />
            ))}
          </div>

          {/* Footer */}
          <div style={{
            padding: '6px 16px',
            borderTop: '1px solid rgba(0,0,0,0.06)',
          }}>
            <div style={{
              fontFamily: '"Hanken Grotesk", sans-serif',
              fontSize: 5,
              color: C.textLightMuted,
            }}>hello@aom-inhouse.com | aheadofmarket.com | Phoenix, AZ</div>
          </div>
        </div>
      )}
    </TemplateCard>
  )
}

/* ================================================================== */
/*  LOCKUP GRID (uses refs for html-to-image downloads)                */
/* ================================================================== */

function LockupGrid() {
  const hzDarkRef = useRef(null)
  const stackDarkRef = useRef(null)
  const hzLightRef = useRef(null)
  const stackLightRef = useRef(null)

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
      gap: 24,
      marginBottom: 48,
    }}>
      {/* Full wordmark / Horizontal */}
      <div style={{
        background: C.nightCard,
        borderRadius: 16,
        padding: '40px 32px',
        border: `1px solid ${C.nightBorder}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 160,
      }}>
        <div ref={hzDarkRef} style={{ display: 'inline-flex', alignItems: 'center', gap: 14, padding: '4px 0', whiteSpace: 'nowrap' }}>
          <span style={{ fontFamily: '"Syne", sans-serif', fontSize: 38, fontWeight: 800, color: '#F0ECE6', letterSpacing: '-0.04em', lineHeight: 1, whiteSpace: 'nowrap' }}>
            AOM<Dot size="0.14em" color="#E85D26" />
          </span>
          <span style={{ width: 1, height: 26, background: 'rgba(255,255,255,0.18)', flexShrink: 0 }} />
          <span style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: 10.5, fontWeight: 600, color: '#8A847C', letterSpacing: '0.16em', whiteSpace: 'nowrap' }}>AHEAD OF MARKET</span>
        </div>
        <div style={{ marginTop: 16, fontSize: 12, color: C.textLightMuted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Horizontal Lockup</div>
        <div style={{ marginTop: 6 }}>
          <DownloadElementPngButton targetRef={hzDarkRef} filename="aom-horizontal-lockup-dark" label="PNG" small />
        </div>
      </div>

      {/* Stacked */}
      <div style={{
        background: C.nightCard,
        borderRadius: 16,
        padding: '40px 32px',
        border: `1px solid ${C.nightBorder}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 160,
      }}>
        <div ref={stackDarkRef} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: '4px 0' }}>
          <span style={{ fontFamily: '"Syne", sans-serif', fontSize: 68, fontWeight: 800, color: '#F0ECE6', letterSpacing: '-0.04em', lineHeight: 1 }}>
            AOM<Dot size="0.14em" color="#E85D26" />
          </span>
          <span style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: 12, fontWeight: 600, color: '#8A847C', letterSpacing: '0.33em', paddingLeft: 2 }}>AHEAD OF MARKET</span>
        </div>
        <div style={{ marginTop: 16, fontSize: 12, color: C.textLightMuted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Stacked Lockup</div>
        <div style={{ marginTop: 6 }}>
          <DownloadElementPngButton targetRef={stackDarkRef} filename="aom-stacked-lockup-dark" label="PNG" small />
        </div>
      </div>

      {/* Full wordmark on light */}
      <div style={{
        background: C.cream,
        borderRadius: 16,
        padding: '40px 32px',
        border: `1px solid ${C.lightBorder}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 160,
      }}>
        <div ref={hzLightRef} style={{ display: 'inline-flex', alignItems: 'center', gap: 14, padding: '4px 0', whiteSpace: 'nowrap' }}>
          <span style={{ fontFamily: '"Syne", sans-serif', fontSize: 38, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.04em', lineHeight: 1, whiteSpace: 'nowrap' }}>
            AOM<Dot size="0.14em" color="#E85D26" />
          </span>
          <span style={{ width: 1, height: 26, background: '#D9D3CB', flexShrink: 0 }} />
          <span style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: 10.5, fontWeight: 600, color: '#0A0A0A', letterSpacing: '0.16em', whiteSpace: 'nowrap' }}>AHEAD OF MARKET</span>
        </div>
        <div style={{ marginTop: 16, fontSize: 12, color: C.warmGray, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Horizontal / Light</div>
        <div style={{ marginTop: 6 }}>
          <DownloadElementPngButton targetRef={hzLightRef} filename="aom-horizontal-lockup-light" label="PNG" small />
        </div>
      </div>

      {/* Stacked on light */}
      <div style={{
        background: C.cream,
        borderRadius: 16,
        padding: '40px 32px',
        border: `1px solid ${C.lightBorder}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 160,
      }}>
        <div ref={stackLightRef} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: '4px 0' }}>
          <span style={{ fontFamily: '"Syne", sans-serif', fontSize: 68, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.04em', lineHeight: 1 }}>
            AOM<Dot size="0.14em" color="#E85D26" />
          </span>
          <span style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: 12, fontWeight: 600, color: '#7A7267', letterSpacing: '0.33em', paddingLeft: 2 }}>AHEAD OF MARKET</span>
        </div>
        <div style={{ marginTop: 16, fontSize: 12, color: C.warmGray, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Stacked / Light</div>
        <div style={{ marginTop: 6 }}>
          <DownloadElementPngButton targetRef={stackLightRef} filename="aom-stacked-lockup-light" label="PNG" small />
        </div>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */

export default function BrandGuidelinesV4() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('')
  const sectionRefs = useRef({})

  // IntersectionObserver for sticky TOC active state
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
    )

    TOC_SECTIONS.forEach((section) => {
      const el = document.getElementById(section.id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <div style={{ background: C.night, minHeight: '100vh', fontFamily: '"Hanken Grotesk", sans-serif' }}>

      {/* Sticky TOC sidebar (hidden below 1280px) */}
      <style>{`
        @media (max-width: 1279px) {
          .brand-toc-sidebar { display: none !important; }
        }
      `}</style>
      <div className="brand-toc-sidebar" style={{ display: 'block' }}>
        <TableOfContents activeSection={activeSection} />
      </div>

      {/* ============================================================ */}
      {/*  HERO / COVER                                                 */}
      {/* ============================================================ */}
      <section style={{
        background: C.night,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 'clamp(48px, 8vw, 96px) clamp(24px, 5vw, 80px)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background pattern layer */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04 }}>
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="hero-grid" patternUnits="userSpaceOnUse" width="60" height="60">
                <rect x="0" y="0" width="60" height="60" fill="none" stroke={C.textLight} strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-grid)" />
          </svg>
        </div>

        <MaxWidth>
          {/* Nav */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 80 }}>
            <a
              href="/"
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                textDecoration: 'none', color: C.textLight,
                fontFamily: '"Syne", sans-serif', fontSize: 24, fontWeight: 800,
                letterSpacing: '-0.03em',
              }}
            >
              AOM<span style={{ color: C.orange }}>.</span>
            </a>
            <Badge color={C.orange} style={{ borderColor: C.orange }}>v5.0</Badge>
          </div>

          {/* Title block */}
          <div style={{ position: 'relative' }}>
            <div style={{ marginBottom: 24 }}>
              <Badge color={C.textLightMuted}>Brand System</Badge>
            </div>

            {/* AOM wordmark large */}
            <h1 style={{
              fontFamily: '"Syne", sans-serif',
              fontSize: 'clamp(72px, 15vw, 200px)',
              fontWeight: 800,
              color: C.textLight,
              lineHeight: 0.9,
              letterSpacing: '-0.04em',
              margin: 0,
              position: 'relative',
            }}>
              AOM
              <span style={{
                display: 'inline-block',
                width: '0.15em',
                height: '0.15em',
                borderRadius: 0,
                background: C.orange,
                verticalAlign: 'baseline',
                marginLeft: '0.03em',
              }} />
            </h1>

            {/* Editorial voice line — Syne mark meets Fraunces voice */}
            <p style={{
              fontFamily: '"Fraunces", serif',
              fontSize: 'clamp(24px, 3.6vw, 44px)',
              fontWeight: 400,
              fontStyle: 'italic',
              color: C.textLight,
              lineHeight: 1.22,
              letterSpacing: '-0.01em',
              margin: '32px 0 0',
              maxWidth: 760,
            }}>
              Everything we make, made to look like it came from one team<span style={{ color: C.orange, fontStyle: 'normal' }}>.</span>
            </p>

            <div style={{
              display: 'flex', gap: 32, marginTop: 40, flexWrap: 'wrap',
              borderTop: `1px solid ${C.nightBorder}`, paddingTop: 32,
            }}>
              <div>
                <div style={{ fontSize: 12, color: C.textLightMuted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Full Name</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: C.textLight }}>Ahead of Market</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: C.textLightMuted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Founded</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: C.textLight }}>2020</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: C.textLightMuted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Direction</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: C.textLight }}>Editorial Bold</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: C.textLightMuted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Version</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: C.orange }}>5.0</div>
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div style={{ marginTop: 80, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 40, height: 1, background: C.orange }} />
            <span style={{ fontSize: 12, color: C.textLightMuted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Scroll to explore</span>
          </div>
        </MaxWidth>
      </section>

      <PatternStrip pattern="diagonal" height={3} />

      {/* ============================================================ */}
      {/*  01. BRAND MARK                                               */}
      {/* ============================================================ */}
      <DarkSection style={{ position: 'relative' }}>
        <div id="brand-mark" style={{ position: 'absolute', top: -80 }} />
        <MaxWidth>
          <SectionHeader num={1} title="Brand Mark" subtitle="The locked AOM. wordmark. Syne ExtraBold, orange dot (#E85D26). All variations, clear space, minimum sizes, and usage rules." dark />

          {/* ---- PRIMARY VARIATIONS ---- */}
          <h3 style={{ fontFamily: '"Syne", sans-serif', fontSize: 24, fontWeight: 700, color: C.textLight, marginBottom: 20 }}>Primary Variations</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24,
            marginBottom: 48,
          }}>
            {/* 1. Primary on dark */}
            <div style={{
              background: C.nightCard,
              borderRadius: 16,
              padding: 48,
              border: `1px solid ${C.nightBorder}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 200,
            }}>
              <svg viewBox="0 0 330 80" width={200} aria-label="AOM Primary on dark">
                <text x="0" y="66" fontFamily="Syne, sans-serif" fontSize="76" fontWeight="800" fill="#F0ECE6" letterSpacing="-3">AOM</text><rect x="304" y="50" width="16" height="16" fill="#E85D26" />
              </svg>
              <div style={{ marginTop: 16, fontSize: 12, color: C.textLightMuted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Primary / Light on Dark</div>
              <div style={{ marginTop: 8 }}>
                <DownloadPngButton svgConfig={{ type: 'wordmark', fill: '#F0ECE6', dotFill: '#E85D26', transparent: true, filename: 'aom-primary-light-on-dark' }} size={800} label="PNG" />
              </div>
            </div>

            {/* 2. Primary on light */}
            <div style={{
              background: C.cream,
              borderRadius: 16,
              padding: 48,
              border: `1px solid ${C.lightBorder}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 200,
            }}>
              <svg viewBox="0 0 330 80" width={200} aria-label="AOM Primary on light">
                <text x="0" y="66" fontFamily="Syne, sans-serif" fontSize="76" fontWeight="800" fill="#0A0A0A" letterSpacing="-3">AOM</text><rect x="304" y="50" width="16" height="16" fill="#E85D26" />
              </svg>
              <div style={{ marginTop: 16, fontSize: 12, color: C.warmGray, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Primary / Dark on Light</div>
              <div style={{ marginTop: 8 }}>
                <DownloadPngButton svgConfig={{ type: 'wordmark', fill: '#0A0A0A', dotFill: '#E85D26', transparent: true, filename: 'aom-primary-dark-on-light' }} size={800} label="PNG" />
              </div>
            </div>

            {/* 3. Monochrome black */}
            <div style={{
              background: C.cream,
              borderRadius: 16,
              padding: 48,
              border: `1px solid ${C.lightBorder}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 200,
            }}>
              <svg viewBox="0 0 330 80" width={200} aria-label="AOM Monochrome black">
                <text x="0" y="66" fontFamily="Syne, sans-serif" fontSize="76" fontWeight="800" fill="#0A0A0A" letterSpacing="-3">AOM</text><rect x="304" y="50" width="16" height="16" fill="#0A0A0A" />
              </svg>
              <div style={{ marginTop: 16, fontSize: 12, color: C.warmGray, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Monochrome / Black</div>
              <div style={{ marginTop: 8 }}>
                <DownloadPngButton svgConfig={{ type: 'wordmark', fill: '#0A0A0A', dotFill: '#0A0A0A', transparent: true, filename: 'aom-mono-black' }} size={800} label="PNG" />
              </div>
            </div>

            {/* 4. Monochrome white */}
            <div style={{
              background: C.nightCard,
              borderRadius: 16,
              padding: 48,
              border: `1px solid ${C.nightBorder}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 200,
            }}>
              <svg viewBox="0 0 330 80" width={200} aria-label="AOM Monochrome white">
                <text x="0" y="66" fontFamily="Syne, sans-serif" fontSize="76" fontWeight="800" fill="#F0ECE6" letterSpacing="-3">AOM</text><rect x="304" y="50" width="16" height="16" fill="#F0ECE6" />
              </svg>
              <div style={{ marginTop: 16, fontSize: 12, color: C.textLightMuted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Monochrome / White</div>
              <div style={{ marginTop: 8 }}>
                <DownloadPngButton svgConfig={{ type: 'wordmark', fill: '#F0ECE6', dotFill: '#F0ECE6', transparent: true, filename: 'aom-mono-white' }} size={800} label="PNG" />
              </div>
            </div>
          </div>

          {/* ---- ICON MARK ---- */}
          <h3 style={{ fontFamily: '"Syne", sans-serif', fontSize: 24, fontWeight: 700, color: C.textLight, marginBottom: 20 }}>Icon Mark</h3>
          <p style={{ fontSize: 14, color: C.textLightMuted, lineHeight: 1.6, marginBottom: 24, maxWidth: 560 }}>
            The "A" with the orange dot. Used for favicons, app icons, social avatars, and anywhere the full wordmark is too small to be legible.
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 16,
            marginBottom: 48,
          }}>
            {[
              { bg: C.nightCard, border: C.nightBorder, fill: '#F0ECE6', label: 'Dark', dotFill: '#E85D26', filename: 'aom-icon-dark' },
              { bg: C.cream, border: C.lightBorder, fill: '#0A0A0A', label: 'Light', dotFill: '#E85D26', filename: 'aom-icon-light' },
              { bg: C.cream, border: C.lightBorder, fill: '#0A0A0A', mono: true, label: 'Mono Dark', dotFill: '#0A0A0A', filename: 'aom-icon-mono-dark' },
              { bg: '#0A0A0A', border: C.nightBorder, fill: '#F0ECE6', mono: true, label: 'Mono Light', dotFill: '#F0ECE6', filename: 'aom-icon-mono-light' },
            ].map((v, i) => (
              <div key={i} style={{
                background: v.bg,
                borderRadius: 12,
                padding: 24,
                border: `1px solid ${v.border}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <svg viewBox="0 0 80 80" width={56} aria-label={`Icon mark ${v.label}`}>
                  <text x="6" y="56" fontFamily="Syne, sans-serif" fontSize="42" fontWeight="800" fill={v.fill} letterSpacing="0">A</text>
                  <rect x="59" y="42" width="14" height="14" fill={v.mono ? v.fill : '#E85D26'} />
                </svg>
                <div style={{ marginTop: 10, fontSize: 12, color: v.bg === C.cream ? C.warmGray : C.textLightMuted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{v.label}</div>
                <div style={{ marginTop: 6 }}>
                  <DownloadPngButton svgConfig={{ type: 'icon', bg: v.bg === C.nightCard ? '#0C0C0C' : v.bg, fill: v.fill, dotFill: v.dotFill, filename: v.filename }} size={512} label="PNG" />
                </div>
              </div>
            ))}
          </div>

          {/* ---- LOCKUPS ---- */}
          <h3 style={{ fontFamily: '"Syne", sans-serif', fontSize: 24, fontWeight: 700, color: C.textLight, marginBottom: 20 }}>Lockups</h3>
          <LockupGrid />

          {/* ---- CLEAR SPACE & MIN SIZES ---- */}
          <h3 style={{ fontFamily: '"Syne", sans-serif', fontSize: 24, fontWeight: 700, color: C.textLight, marginBottom: 20 }}>Clear Space & Minimum Sizes</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: 24,
            marginBottom: 48,
          }}>
            <div style={{
              background: C.nightCard,
              borderRadius: 16,
              padding: 32,
              border: `1px solid ${C.nightBorder}`,
            }}>
              <h4 style={{ fontFamily: '"Syne", sans-serif', fontSize: 20, fontWeight: 700, color: C.textLight, marginBottom: 12 }}>Clear Space</h4>
              <p style={{ fontSize: 14, color: C.textLightMuted, lineHeight: 1.6, marginBottom: 16 }}>
                Minimum clear space equals the height of the "O" in AOM. No elements, text, or edges should invade this zone. Apply to all variations.
              </p>
              <div style={{
                background: C.night,
                borderRadius: 8,
                padding: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px dashed rgba(255,92,26,0.25)`,
                position: 'relative',
              }}>
                <svg viewBox="0 0 330 80" width={140}>
                  <text x="0" y="66" fontFamily="Syne, sans-serif" fontSize="76" fontWeight="800" fill="#F0ECE6" letterSpacing="-3">AOM</text><rect x="304" y="50" width="16" height="16" fill="#E85D26" />
                </svg>
                <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', fontSize: 9, color: '#E85D26', letterSpacing: '0.15em', fontFamily: '"Hanken Grotesk", sans-serif' }}>x</div>
                <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', fontSize: 9, color: '#E85D26', letterSpacing: '0.15em', fontFamily: '"Hanken Grotesk", sans-serif' }}>x</div>
                <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: '#E85D26', letterSpacing: '0.15em', fontFamily: '"Hanken Grotesk", sans-serif' }}>x</div>
                <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: '#E85D26', letterSpacing: '0.15em', fontFamily: '"Hanken Grotesk", sans-serif' }}>x</div>
              </div>
            </div>

            <div style={{
              background: C.nightCard,
              borderRadius: 16,
              padding: 32,
              border: `1px solid ${C.nightBorder}`,
            }}>
              <h4 style={{ fontFamily: '"Syne", sans-serif', fontSize: 20, fontWeight: 700, color: C.textLight, marginBottom: 12 }}>Minimum Sizes</h4>
              <p style={{ fontSize: 14, color: C.textLightMuted, lineHeight: 1.6, marginBottom: 16 }}>
                Below these minimums, switch to the icon mark (A.).
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { context: 'Print (full wordmark)', size: '24mm wide' },
                  { context: 'Digital (full wordmark)', size: '80px wide' },
                  { context: 'Stacked lockup', size: '120px wide' },
                  { context: 'Horizontal lockup', size: '200px wide' },
                  { context: 'Favicon / App Icon', size: 'Icon mark only' },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: C.night, borderRadius: 8 }}>
                    <span style={{ fontSize: 13, color: C.textLightMuted }}>{row.context}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: C.textLight }}>{row.size}</span>
                  </div>
                ))}
              </div>

              {/* Actual size demo */}
              <div style={{ marginTop: 20, display: 'flex', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <svg viewBox="0 0 330 80" width={200}>
                    <text x="0" y="66" fontFamily="Syne, sans-serif" fontSize="76" fontWeight="800" fill="#F0ECE6" letterSpacing="-3">AOM</text><rect x="304" y="50" width="16" height="16" fill="#E85D26" />
                  </svg>
                  <div style={{ fontSize: 12, color: C.textLightMuted, marginTop: 4 }}>200px</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <svg viewBox="0 0 330 80" width={120}>
                    <text x="0" y="66" fontFamily="Syne, sans-serif" fontSize="76" fontWeight="800" fill="#F0ECE6" letterSpacing="-3">AOM</text><rect x="304" y="50" width="16" height="16" fill="#E85D26" />
                  </svg>
                  <div style={{ fontSize: 12, color: C.textLightMuted, marginTop: 4 }}>120px</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <svg viewBox="0 0 330 80" width={80}>
                    <text x="0" y="66" fontFamily="Syne, sans-serif" fontSize="76" fontWeight="800" fill="#F0ECE6" letterSpacing="-3">AOM</text><rect x="304" y="50" width="16" height="16" fill="#E85D26" />
                  </svg>
                  <div style={{ fontSize: 12, color: '#E85D26', marginTop: 4 }}>80px min</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <svg viewBox="0 0 80 80" width={32}>
                    <text x="6" y="56" fontFamily="Syne, sans-serif" fontSize="42" fontWeight="800" fill="#F0ECE6" letterSpacing="0">A</text>
                    <rect x="59" y="42" width="14" height="14" fill="#E85D26" />
                  </svg>
                  <div style={{ fontSize: 12, color: C.textLightMuted, marginTop: 4 }}>32px icon</div>
                </div>
              </div>
            </div>
          </div>

          {/* ---- DO / DON'T ---- */}
          <h3 style={{ fontFamily: '"Syne", sans-serif', fontSize: 24, fontWeight: 700, color: C.textLight, marginBottom: 20 }}>Do / Don't</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24,
            marginBottom: 48,
          }}>
            {/* DO examples */}
            {[
              { type: 'do', label: 'Use on solid, clean backgrounds', bg: C.nightCard, logoBg: C.night },
              { type: 'do', label: 'Maintain clear space around the mark', bg: C.nightCard, logoBg: C.night },
              { type: 'do', label: 'Use the correct variation for the background', bg: C.nightCard, logoBg: C.night },
            ].map((item, i) => (
              <div key={`do-${i}`} style={{
                background: item.bg,
                borderRadius: 16,
                overflow: 'hidden',
                border: `1px solid ${C.nightBorder}`,
              }}>
                <div style={{
                  background: item.logoBg,
                  padding: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 100,
                }}>
                  <svg viewBox="0 0 330 80" width={120}>
                    <text x="0" y="66" fontFamily="Syne, sans-serif" fontSize="76" fontWeight="800" fill="#F0ECE6" letterSpacing="-3">AOM</text><rect x="304" y="50" width="16" height="16" fill="#E85D26" />
                  </svg>
                </div>
                <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, color: C.sage, fontWeight: 700 }}>DO</span>
                  <span style={{ fontSize: 13, color: C.textLightMuted }}>{item.label}</span>
                </div>
              </div>
            ))}

            {/* DON'T examples */}
            <div style={{
              background: C.nightCard,
              borderRadius: 16,
              overflow: 'hidden',
              border: `1px solid ${C.nightBorder}`,
            }}>
              <div style={{
                background: C.night,
                padding: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 100,
              }}>
                {/* Stretched */}
                <svg viewBox="0 0 330 80" width={160} height={40} preserveAspectRatio="none" style={{ opacity: 0.5 }}>
                  <text x="0" y="66" fontFamily="Syne, sans-serif" fontSize="76" fontWeight="800" fill="#F0ECE6" letterSpacing="-3">AOM</text><rect x="304" y="50" width="16" height="16" fill="#E85D26" />
                </svg>
              </div>
              <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, color: '#E85D26', fontWeight: 700 }}>DON'T</span>
                <span style={{ fontSize: 13, color: C.textLightMuted }}>Stretch or distort the wordmark</span>
              </div>
            </div>

            <div style={{
              background: C.nightCard,
              borderRadius: 16,
              overflow: 'hidden',
              border: `1px solid ${C.nightBorder}`,
            }}>
              <div style={{
                background: C.night,
                padding: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 100,
              }}>
                {/* Wrong color dot */}
                <svg viewBox="0 0 330 80" width={120} style={{ opacity: 0.5 }}>
                  <text x="0" y="66" fontFamily="Syne, sans-serif" fontSize="76" fontWeight="800" fill="#F0ECE6" letterSpacing="-3">AOM</text><rect x="304" y="50" width="16" height="16" fill="#4488FF" />
                </svg>
              </div>
              <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, color: '#E85D26', fontWeight: 700 }}>DON'T</span>
                <span style={{ fontSize: 13, color: C.textLightMuted }}>Change the dot color</span>
              </div>
            </div>

            <div style={{
              background: C.nightCard,
              borderRadius: 16,
              overflow: 'hidden',
              border: `1px solid ${C.nightBorder}`,
            }}>
              <div style={{
                background: C.night,
                padding: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 100,
              }}>
                {/* Rotated */}
                <svg viewBox="0 0 330 80" width={120} style={{ opacity: 0.5, transform: 'rotate(-15deg)' }}>
                  <text x="0" y="66" fontFamily="Syne, sans-serif" fontSize="76" fontWeight="800" fill="#F0ECE6" letterSpacing="-3">AOM</text><rect x="304" y="50" width="16" height="16" fill="#E85D26" />
                </svg>
              </div>
              <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, color: '#E85D26', fontWeight: 700 }}>DON'T</span>
                <span style={{ fontSize: 13, color: C.textLightMuted }}>Rotate or tilt the mark</span>
              </div>
            </div>

            <div style={{
              background: C.nightCard,
              borderRadius: 16,
              overflow: 'hidden',
              border: `1px solid ${C.nightBorder}`,
            }}>
              <div style={{
                background: C.night,
                padding: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 100,
              }}>
                {/* Drop shadow */}
                <svg viewBox="0 0 330 80" width={120} style={{ opacity: 0.5, filter: 'drop-shadow(4px 4px 8px rgba(255,92,26,0.6))' }}>
                  <text x="0" y="66" fontFamily="Syne, sans-serif" fontSize="76" fontWeight="800" fill="#F0ECE6" letterSpacing="-3">AOM</text><rect x="304" y="50" width="16" height="16" fill="#E85D26" />
                </svg>
              </div>
              <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, color: '#E85D26', fontWeight: 700 }}>DON'T</span>
                <span style={{ fontSize: 13, color: C.textLightMuted }}>Add drop shadows or effects</span>
              </div>
            </div>

            <div style={{
              background: C.nightCard,
              borderRadius: 16,
              overflow: 'hidden',
              border: `1px solid ${C.nightBorder}`,
            }}>
              <div style={{
                background: C.night,
                padding: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 100,
              }}>
                {/* No dot */}
                <svg viewBox="0 0 240 80" width={110} style={{ opacity: 0.5 }}>
                  <text x="0" y="66" fontFamily="Syne, sans-serif" fontSize="76" fontWeight="800" fill="#F0ECE6" letterSpacing="-3">AOM</text>
                </svg>
              </div>
              <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, color: '#E85D26', fontWeight: 700 }}>DON'T</span>
                <span style={{ fontSize: 13, color: C.textLightMuted }}>Remove the period/dot</span>
              </div>
            </div>

            <div style={{
              background: C.nightCard,
              borderRadius: 16,
              overflow: 'hidden',
              border: `1px solid ${C.nightBorder}`,
            }}>
              <div style={{
                backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\'%3E%3Crect fill=\'%23333\' width=\'10\' height=\'10\'/%3E%3Crect fill=\'%23555\' x=\'10\' width=\'10\' height=\'10\'/%3E%3Crect fill=\'%23555\' y=\'10\' width=\'10\' height=\'10\'/%3E%3Crect fill=\'%23333\' x=\'10\' y=\'10\' width=\'10\' height=\'10\'/%3E%3C/svg%3E")',
                padding: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 100,
              }}>
                <svg viewBox="0 0 330 80" width={120} style={{ opacity: 0.5 }}>
                  <text x="0" y="66" fontFamily="Syne, sans-serif" fontSize="76" fontWeight="800" fill="#F0ECE6" letterSpacing="-3">AOM</text><rect x="304" y="50" width="16" height="16" fill="#E85D26" />
                </svg>
              </div>
              <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, color: '#E85D26', fontWeight: 700 }}>DON'T</span>
                <span style={{ fontSize: 13, color: C.textLightMuted }}>Place on busy backgrounds without overlay</span>
              </div>
            </div>
          </div>

          {/* ---- COLOR ON BACKGROUND MATRIX ---- */}
          <h3 style={{ fontFamily: '"Syne", sans-serif', fontSize: 24, fontWeight: 700, color: C.textLight, marginBottom: 20 }}>Background Matrix</h3>
          <p style={{ fontSize: 14, color: C.textLightMuted, lineHeight: 1.6, marginBottom: 24, maxWidth: 560 }}>
            Which logo variation to use on each background color.
          </p>
          <div style={{
            background: C.nightCard,
            borderRadius: 16,
            padding: 24,
            border: `1px solid ${C.nightBorder}`,
            overflowX: 'auto',
            marginBottom: 48,
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 600 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.nightBorder}` }}>
                  {['Background', 'Color', 'Use This Variation', 'Preview'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '10px 12px',
                      color: C.textLightMuted, fontWeight: 500, fontSize: 12,
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Night / Black', hex: '#0C0C0C', variation: 'Primary (light on dark)', textFill: '#F0ECE6', dotFill: '#E85D26' },
                  { name: 'Cream / White', hex: '#FDF6EC', variation: 'Primary (dark on light)', textFill: '#0A0A0A', dotFill: '#E85D26' },
                  { name: 'Orange', hex: '#E85D26', variation: 'Monochrome white', textFill: '#FFFFFF', dotFill: '#FFFFFF' },
                  { name: 'Photography (dark)', hex: '#1A1A1A', variation: 'Monochrome white', textFill: '#F0ECE6', dotFill: '#F0ECE6' },
                  { name: 'Photography (light)', hex: '#E8E0D8', variation: 'Monochrome black', textFill: '#0A0A0A', dotFill: '#0A0A0A' },
                  { name: 'Sage', hex: '#7C9A72', variation: 'Monochrome white', textFill: '#FFFFFF', dotFill: '#FFFFFF' },
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.nightBorder}` }}>
                    <td style={{ padding: '12px 12px', color: C.textLight, fontWeight: 500 }}>{row.name}</td>
                    <td style={{ padding: '12px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 4, background: row.hex, border: `1px solid ${C.nightBorder}` }} />
                        <span style={{ fontSize: 12, color: C.textLightMuted, fontFamily: '"Hanken Grotesk", sans-serif' }}>{row.hex}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 12px', color: C.textLightMuted }}>{row.variation}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ background: row.hex, borderRadius: 6, padding: '8px 16px', display: 'inline-flex', border: `1px solid ${C.nightBorder}` }}>
                        <svg viewBox="0 0 330 80" width={60}>
                          <text x="0" y="66" fontFamily="Syne, sans-serif" fontSize="76" fontWeight="800" fill={row.textFill} letterSpacing="-3">AOM</text><rect x="304" y="50" width="16" height="16" fill={row.dotFill} />
                        </svg>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ---- BRAND TOOLKIT / DOWNLOADS ---- */}
          <div style={{ marginTop: 64, paddingTop: 48, borderTop: `1px solid ${C.nightBorder}` }}>
            <SectionHeader num="DL" title="Brand Toolkit" subtitle="Download production-ready assets for social profiles, documents, presentations, and print. PNG exports at multiple sizes, plus original SVG vectors." dark />

            {/* Use case sections */}

            {/* Social Profile Pictures */}
            <div style={{
              background: C.nightCard,
              borderRadius: 16,
              padding: 32,
              border: `1px solid ${C.nightBorder}`,
              marginBottom: 24,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <Badge color={C.orange} style={{ borderColor: C.orange }}>Social</Badge>
                <h4 style={{ fontFamily: '"Syne", sans-serif', fontSize: 20, fontWeight: 700, color: C.textLight, margin: 0 }}>Profile Pictures</h4>
              </div>
              <p style={{ fontSize: 14, color: C.textLightMuted, lineHeight: 1.6, marginBottom: 20 }}>
                Square icon marks optimized for social media avatars. Available in all four background/color combinations at 512px and 1024px.
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 16,
              }}>
                {[
                  { label: 'Orange on Dark', bg: '#0C0C0C', fill: '#E85D26', dotFill: '#E85D26', filename: 'aom-icon-orange-dark' },
                  { label: 'White on Dark', bg: '#0C0C0C', fill: '#F0ECE6', dotFill: '#F0ECE6', filename: 'aom-icon-white-dark' },
                  { label: 'Dark on Light', bg: '#FDF6EC', fill: '#0A0A0A', dotFill: '#E85D26', filename: 'aom-icon-dark-light' },
                  { label: 'Orange on Light', bg: '#FDF6EC', fill: '#E85D26', dotFill: '#E85D26', filename: 'aom-icon-orange-light' },
                ].map((variant, i) => (
                  <div key={i} style={{
                    background: C.night,
                    borderRadius: 12,
                    border: `1px solid ${C.nightBorder}`,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      background: variant.bg,
                      padding: 24,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      aspectRatio: '1',
                      border: variant.bg === '#FDF6EC' ? `1px solid ${C.lightBorder}` : 'none',
                      borderRadius: '11px 11px 0 0',
                    }}>
                      <svg viewBox="0 0 120 120" width={64}>
                        <rect width="120" height="120" fill={variant.bg} />
                        <text x="9" y="84" fontFamily="Syne, sans-serif" fontSize="63" fontWeight="800" fill={variant.fill} letterSpacing="0">A</text>
                        <rect x="88.5" y="63" width="21" height="21" fill={variant.dotFill} />
                      </svg>
                    </div>
                    <div style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.textLight, marginBottom: 8 }}>{variant.label}</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <DownloadPngButton svgConfig={{ type: 'icon', ...variant }} size={512} label="512px" />
                        <DownloadPngButton svgConfig={{ type: 'icon', ...variant }} size={1024} label="1024px" />
                        <a href={`/brand/aom-icon-mark${variant.fill === '#F0ECE6' || variant.fill === '#E85D26' && variant.bg === '#0C0C0C' ? '-white' : ''}.svg`} download style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                          color: C.textLightMuted, background: 'transparent',
                          border: `1px solid ${C.nightBorder}`, textDecoration: 'none',
                          cursor: 'pointer',
                        }}>SVG</a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Transparent for Documents */}
            <div style={{
              background: C.nightCard,
              borderRadius: 16,
              padding: 32,
              border: `1px solid ${C.nightBorder}`,
              marginBottom: 24,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <Badge color={C.sage} style={{ borderColor: C.sage }}>Docs</Badge>
                <h4 style={{ fontFamily: '"Syne", sans-serif', fontSize: 20, fontWeight: 700, color: C.textLight, margin: 0 }}>Transparent Wordmarks</h4>
              </div>
              <p style={{ fontSize: 14, color: C.textLightMuted, lineHeight: 1.6, marginBottom: 20 }}>
                PNG wordmarks with transparent backgrounds for documents, presentations, and overlays. Both dark and light versions for any background.
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 16,
              }}>
                {[
                  { label: 'Light Wordmark (for dark bg)', fill: '#F0ECE6', dotFill: '#E85D26', previewBg: C.night, filename: 'aom-wordmark-light-transparent' },
                  { label: 'Dark Wordmark (for light bg)', fill: '#0A0A0A', dotFill: '#E85D26', previewBg: '#E0DAD2', filename: 'aom-wordmark-dark-transparent' },
                  { label: 'Mono White (for overlays)', fill: '#FFFFFF', dotFill: '#FFFFFF', previewBg: '#333', filename: 'aom-wordmark-mono-white-transparent' },
                  { label: 'Mono Black (for print)', fill: '#0A0A0A', dotFill: '#0A0A0A', previewBg: '#E8E4DE', filename: 'aom-wordmark-mono-black-transparent' },
                ].map((variant, i) => (
                  <div key={i} style={{
                    background: C.night,
                    borderRadius: 12,
                    border: `1px solid ${C.nightBorder}`,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      background: `${variant.previewBg} repeating-conic-gradient(rgba(128,128,128,0.08) 0% 25%, transparent 0% 50%) 50% / 16px 16px`,
                      padding: '32px 24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: 100,
                    }}>
                      <svg viewBox="0 0 330 80" width={180}>
                        <text x="0" y="66" fontFamily="Syne, sans-serif" fontSize="76" fontWeight="800" fill={variant.fill} letterSpacing="-3">AOM</text><rect x="304" y="50" width="16" height="16" fill={variant.dotFill} />
                      </svg>
                    </div>
                    <div style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.textLight, marginBottom: 8 }}>{variant.label}</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <DownloadPngButton svgConfig={{ type: 'wordmark', fill: variant.fill, dotFill: variant.dotFill, transparent: true }} size={800} label="PNG" />
                        <a href={`/brand/aom-primary-${variant.fill === '#F0ECE6' || variant.fill === '#FFFFFF' ? 'dark' : 'light'}.svg`} download style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                          color: C.textLightMuted, background: 'transparent',
                          border: `1px solid ${C.nightBorder}`, textDecoration: 'none',
                          cursor: 'pointer',
                        }}>SVG</a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* All SVG Variations */}
            <div style={{
              background: C.nightCard,
              borderRadius: 16,
              padding: 32,
              border: `1px solid ${C.nightBorder}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <Badge color={C.textLightMuted}>Vector</Badge>
                <h4 style={{ fontFamily: '"Syne", sans-serif', fontSize: 20, fontWeight: 700, color: C.textLight, margin: 0 }}>All SVG Source Files</h4>
              </div>
              <p style={{ fontSize: 14, color: C.textLightMuted, lineHeight: 1.6, marginBottom: 20 }}>
                Original vector files. Scale to any size without quality loss. Use these for print production, large format, and custom exports.
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 12,
              }}>
                {[
                  { file: 'aom-primary-dark.svg', label: 'Primary (dark bg)' },
                  { file: 'aom-primary-light.svg', label: 'Primary (light bg)' },
                  { file: 'aom-mono-black.svg', label: 'Mono Black' },
                  { file: 'aom-mono-white.svg', label: 'Mono White' },
                  { file: 'aom-icon-mark.svg', label: 'Icon Mark' },
                  { file: 'aom-icon-mark-white.svg', label: 'Icon Mark (white)' },
                  { file: 'aom-stacked.svg', label: 'Stacked Lockup' },
                  { file: 'aom-stacked-white.svg', label: 'Stacked (white)' },
                  { file: 'aom-horizontal.svg', label: 'Horizontal Lockup' },
                  { file: 'aom-horizontal-white.svg', label: 'Horizontal (white)' },
                  { file: 'aom-wordmark-full.svg', label: 'Full Wordmark' },
                ].map(d => (
                  <a
                    key={d.file}
                    href={`/brand/${d.file}`}
                    download={d.file}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 14px',
                      background: C.night,
                      borderRadius: 8,
                      border: `1px solid ${C.nightBorder}`,
                      color: C.textLight,
                      textDecoration: 'none',
                      fontSize: 13,
                      fontWeight: 500,
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <Download size={14} color={C.orange} />
                    {d.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </MaxWidth>
      </DarkSection>

      <PatternStrip pattern="dots" height={3} />

      {/* ============================================================ */}
      {/*  02. COLOR SYSTEM                                             */}
      {/* ============================================================ */}
      <LightSection style={{ position: 'relative' }}>
        <div id="color-system" style={{ position: 'absolute', top: -80 }} />
        <MaxWidth>
          <SectionHeader num={2} title="Color System" subtitle="Primary, secondary, and accent colors with contrast ratios. Dark and light mode palettes." />

          {/* Primary palette */}
          <h3 style={{ fontFamily: '"Syne", sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Primary Palette</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 48,
          }}>
            {[
              { name: 'Night', hex: '#0C0C0C', text: C.textLight, desc: 'Primary dark surface' },
              { name: 'Black', hex: '#0A0A0A', text: C.textLight, desc: 'Text on light' },
              { name: 'Cream', hex: '#FDF6EC', text: C.black, desc: 'Primary light surface' },
              { name: 'Cream Dark', hex: '#EDE7DF', text: C.black, desc: 'Secondary light' },
              { name: 'Orange', hex: '#E85D26', text: C.white, desc: 'Brand accent' },
              { name: 'Sage', hex: '#7C9A72', text: C.white, desc: 'Secondary accent' },
            ].map(c => (
              <div key={c.hex} style={{
                borderRadius: 12,
                overflow: 'hidden',
                border: `1px solid ${C.lightBorder}`,
              }}>
                <div style={{
                  background: c.hex,
                  height: 100,
                  display: 'flex',
                  alignItems: 'flex-end',
                  padding: 14,
                }}>
                  <span style={{ color: c.text, fontWeight: 700, fontSize: 14 }}>{c.name}</span>
                </div>
                <div style={{ padding: '12px 14px', background: C.white }}>
                  <div style={{ color: C.black }}><CopyHex hex={c.hex} /></div>
                  <div style={{ fontSize: 12, color: C.warmGray, marginTop: 4 }}>{c.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Extended palette */}
          <h3 style={{ fontFamily: '"Syne", sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Extended Palette</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 12,
            marginBottom: 48,
          }}>
            {[
              { name: 'Night Card', hex: '#151515', text: C.textLight },
              { name: 'Charcoal', hex: '#141412', text: C.textLight },
              { name: 'Surface', hex: '#1A1A17', text: C.textLight },
              { name: 'Page BG', hex: '#0A0A08', text: C.textLight },
              { name: 'Orange Hover', hex: '#D14E1C', text: C.white },
              { name: 'Gold', hex: '#C9A84C', text: C.black },
              { name: 'Warm White', hex: '#F5F0EB', text: C.black },
              { name: 'Warm Gray', hex: '#7A7267', text: C.white },
              { name: 'Dim Text', hex: '#A89F96', text: C.black },
              { name: 'Text Light', hex: '#F0ECE6', text: C.black },
              { name: 'Text Muted', hex: '#8A847C', text: C.white },
              { name: 'Night Border', hex: '#292524', text: C.textLight },
            ].map(c => (
              <div key={c.hex} style={{
                borderRadius: 8,
                overflow: 'hidden',
                border: `1px solid ${C.lightBorder}`,
              }}>
                <div style={{
                  background: c.hex,
                  height: 56,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <span style={{ color: c.text, fontSize: 12, fontWeight: 600, letterSpacing: '0.08em' }}>{c.name}</span>
                </div>
                <div style={{ padding: '8px 10px', background: C.white, textAlign: 'center' }}>
                  <div style={{ color: C.black, fontSize: 12 }}><CopyHex hex={c.hex} /></div>
                </div>
              </div>
            ))}
          </div>

          {/* Contrast ratio examples */}
          <h3 style={{ fontFamily: '"Syne", sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Contrast Pairings</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}>
            {[
              { bg: C.night, fg: C.textLight, label: 'Night / Text Light', ratio: '16.2:1', pass: true },
              { bg: C.night, fg: C.orange, label: 'Night / Orange', ratio: '4.8:1', pass: true },
              { bg: C.cream, fg: C.black, label: 'Cream / Black', ratio: '15.8:1', pass: true },
              { bg: C.cream, fg: C.orange, label: 'Cream / Orange', ratio: '3.9:1', pass: false },
              { bg: C.orange, fg: C.white, label: 'Orange / White', ratio: '3.4:1', pass: false },
              { bg: C.night, fg: C.sage, label: 'Night / Sage', ratio: '5.1:1', pass: true },
            ].map((pair, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: 16,
                background: pair.bg,
                borderRadius: 10,
                border: `1px solid ${pair.bg === C.cream ? C.lightBorder : C.nightBorder}`,
              }}>
                <span style={{
                  fontFamily: '"Syne", sans-serif',
                  fontSize: 28,
                  fontWeight: 800,
                  color: pair.fg,
                }}>Aa</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: pair.fg, fontWeight: 600 }}>{pair.label}</div>
                  <div style={{ fontSize: 12, color: pair.fg, opacity: 0.6 }}>{pair.ratio}</div>
                </div>
                <Badge
                  color={pair.pass ? C.sage : C.orange}
                  style={{ borderColor: pair.pass ? C.sage : C.orange, fontSize: 9 }}
                >
                  {pair.pass ? 'AA PASS' : 'LARGE ONLY'}
                </Badge>
              </div>
            ))}
          </div>
        </MaxWidth>
      </LightSection>

      <PatternStrip pattern="diagonal" height={3} />

      {/* ============================================================ */}
      {/*  03. TYPOGRAPHY                                               */}
      {/* ============================================================ */}
      <DarkSection style={{ position: 'relative' }}>
        <div id="typography" style={{ position: 'absolute', top: -80 }} />
        <MaxWidth>
 <SectionHeader num={3} title="Typography" subtitle="Three faces, one system. Syne sets the mark and the headlines. Fraunces carries the editorial voice. Hanken Grotesk does the work, body, labels, and spec. No mono." dark />

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: 32,
            marginBottom: 48,
          }}>
            {/* Syne specimen */}
            <div style={{
              background: C.nightCard,
              borderRadius: 16,
              padding: 40,
              border: `1px solid ${C.nightBorder}`,
            }}>
              <Badge color={C.orange} style={{ borderColor: C.orange, marginBottom: 24 }}>Display / The Mark</Badge>
              <div style={{
                fontFamily: '"Syne", sans-serif',
                fontSize: 80,
                fontWeight: 800,
                color: C.textLight,
                lineHeight: 0.92,
                letterSpacing: '-0.03em',
                marginBottom: 20,
              }}>
                Syne<span style={{ color: C.orange }}>.</span>
              </div>
              <div style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: 14, color: C.textLightMuted, lineHeight: 1.65, marginBottom: 24 }}>
                The face of the logo itself. Headlines, section titles, big display numbers, and the wordmark. ExtraBold (800) is primary; Bold (700) on dark grounds to stop the weight from blooming. The orange period belongs to the mark — never decoration.
              </div>
              <div style={{ borderTop: `1px solid ${C.nightBorder}`, paddingTop: 20 }}>
                {[
                  { label: 'H1', size: 56, weight: 800, tracking: '-0.03em' },
                  { label: 'H2', size: 40, weight: 800, tracking: '-0.02em' },
                  { label: 'H3', size: 28, weight: 700, tracking: '-0.01em' },
                  { label: 'H4', size: 22, weight: 700, tracking: '0' },
                ].map(h => (
                  <div key={h.label} style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 16,
                    marginBottom: 12,
                    borderBottom: `1px solid ${C.nightBorder}`,
                    paddingBottom: 12,
                  }}>
                    <span style={{
                      fontSize: 12, color: C.orange, fontWeight: 700, letterSpacing: '0.15em',
                      width: 32, flexShrink: 0,
                    }}>{h.label}</span>
                    <span style={{
                      fontFamily: '"Syne", sans-serif',
                      fontSize: Math.min(h.size, 40),
                      fontWeight: h.weight,
                      color: C.textLight,
                      letterSpacing: h.tracking,
                      lineHeight: 1.1,
                    }}>
                      Ahead of Market
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Fraunces — Editorial Voice specimen */}
            <div style={{
              background: C.nightCard,
              borderRadius: 16,
              padding: 40,
              border: `1px solid ${C.nightBorder}`,
            }}>
              <Badge color={C.gold} style={{ borderColor: C.gold, marginBottom: 24 }}>Editorial Voice</Badge>
              <div style={{
                fontFamily: '"Fraunces", serif',
                fontSize: 80,
                fontWeight: 500,
                fontStyle: 'italic',
                color: C.textLight,
                lineHeight: 0.95,
                letterSpacing: '-0.01em',
                marginBottom: 20,
              }}>
                Fraunces
              </div>
              <div style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: 14, color: C.textLightMuted, lineHeight: 1.65, marginBottom: 24 }}>
 The voice in the room. Used sparingly, pull quotes, statements, the line a section opens on. Its optical contrast against Syne's geometry is what keeps the system feeling crafted instead of generated.
              </div>
              <div style={{ borderTop: `1px solid ${C.nightBorder}`, paddingTop: 24 }}>
                <p style={{
                  fontFamily: '"Fraunces", serif',
                  fontSize: 30,
                  fontWeight: 400,
                  fontStyle: 'italic',
                  color: C.textLight,
                  lineHeight: 1.3,
                  letterSpacing: '-0.01em',
                  margin: 0,
                }}>
                  “We get it. We make things that impact — and every piece looks like it came from the same team.”
                </p>
                <span style={{
                  fontFamily: '"Hanken Grotesk", sans-serif', fontSize: 12, fontWeight: 600,
                  color: C.gold, letterSpacing: '0.15em', textTransform: 'uppercase',
                  display: 'block', marginTop: 18,
                }}>
                  Fraunces 400 Italic · Pull quote
                </span>
              </div>
            </div>
          </div>

          {/* Hanken Grotesk — Body & System specimen */}
          <div style={{
            background: C.nightCard,
            borderRadius: 16,
            padding: 40,
            border: `1px solid ${C.nightBorder}`,
            marginTop: 24,
          }}>
            <Badge color={C.sage} style={{ borderColor: C.sage, marginBottom: 24 }}>Body &amp; System</Badge>
            <div style={{
              fontFamily: '"Hanken Grotesk", sans-serif',
              fontSize: 56,
              fontWeight: 600,
              color: C.textLight,
              lineHeight: 1,
              marginBottom: 20,
              letterSpacing: '-0.02em',
            }}>
              Hanken Grotesk
            </div>
            <div style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: 14, color: C.textLightMuted, lineHeight: 1.65, marginBottom: 24, maxWidth: 620 }}>
              The workhorse — body copy, labels, navigation, data, and spec. Regular (400) for body, Medium (500) for labels, SemiBold (600) for emphasis. It also retires the old code font: where the brand used to reach for a mono, it now uses Hanken in tracked uppercase. One fewer voice, more discipline.
            </div>
            <div style={{
              background: C.night,
              borderRadius: 8,
              padding: '20px 24px',
              marginBottom: 24,
              border: `1px solid ${C.nightBorder}`,
            }}>
              <p style={{
                fontFamily: '"Hanken Grotesk", sans-serif',
                fontSize: 12,
                fontWeight: 600,
                color: C.orange,
                lineHeight: 1.6,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                margin: 0,
              }}>
                Phoenix, AZ · Video · Web · Brand · Social · AI
              </p>
            </div>
            <div style={{ borderTop: `1px solid ${C.nightBorder}`, paddingTop: 24 }}>
              {[
 { label: 'Body / 16px / 400', size: 16, weight: 400, tracking: '0', sample: 'We make things that impact. Video, web, brand, social, and AI-powered workflows, every piece looks like it came from the same team, because it did.', transform: 'none', color: C.textLight },
                { label: 'Label / 12px / 600', size: 12, weight: 600, tracking: '0.18em', sample: 'CREATIVE PRODUCTION + AI SYSTEMS', transform: 'uppercase', color: C.sage },
                { label: 'Spec / 12px / 500 (replaces mono)', size: 12, weight: 500, tracking: '0.14em', sample: 'SECTION 01 · STATUS: ACTIVE · #E85D26', transform: 'uppercase', color: C.textLightMuted, note: 'Tracked uppercase carries the spec role. No monospace anywhere in the system.' },
              ].map(t => (
                <div key={t.label} style={{
                  marginBottom: 16,
                  paddingBottom: 16,
                  borderBottom: `1px solid ${C.nightBorder}`,
                }}>
                  <span style={{
                    fontFamily: '"Hanken Grotesk", sans-serif',
                    fontSize: 11, color: t.color, fontWeight: 700, letterSpacing: '0.16em',
                    textTransform: 'uppercase', opacity: 0.85,
                    display: 'block', marginBottom: 8,
                  }}>{t.label}</span>
                  <span style={{
                    fontFamily: '"Hanken Grotesk", sans-serif',
                    fontSize: t.size,
                    fontWeight: t.weight,
                    color: t.color,
                    lineHeight: 1.5,
                    letterSpacing: t.tracking,
                    textTransform: t.transform,
                  }}>
                    {t.sample}
                  </span>
                  {t.note && (
                    <span style={{
                      display: 'block', marginTop: 4,
                      fontSize: 12, color: C.textLightMuted, fontStyle: 'italic',
                    }}>{t.note}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Type scale table */}
          <div style={{
            background: C.nightCard,
            borderRadius: 16,
            padding: 32,
            border: `1px solid ${C.nightBorder}`,
            overflowX: 'auto',
          }}>
            <h3 style={{ fontFamily: '"Syne", sans-serif', fontSize: 20, fontWeight: 700, color: C.textLight, marginBottom: 20 }}>Type Scale</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.nightBorder}` }}>
                  {['Element', 'Font', 'Size', 'Weight', 'Line Height', 'Tracking'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '10px 12px',
                      color: C.textLightMuted, fontWeight: 500, fontSize: 12,
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Display', 'Syne', '56-200px', '800', '0.9', '-0.04em'],
                  ['H1', 'Syne', '48-56px', '800', '1.05', '-0.03em'],
                  ['H2', 'Syne', '32-40px', '800', '1.05', '-0.02em'],
                  ['H3', 'Syne', '24-28px', '700', '1.1', '-0.01em'],
                  ['H4', 'Syne', '20-22px', '700', '1.2', '0'],
                  ['Pull quote', 'Fraunces Italic', '24-40px', '400', '1.3', '-0.01em'],
                  ['Lead / intro', 'Fraunces', '18-22px', '400-500', '1.5', '0'],
                  ['Body', 'Hanken Grotesk', '16px', '400', '1.6', '0'],
                  ['Body Sm', 'Hanken Grotesk', '14px', '400', '1.5', '0'],
                  ['Label', 'Hanken Grotesk', '11-12px', '600', '1.4', '0.16em'],
                  ['Spec / Badge', 'Hanken Grotesk', '10-12px', '500-700', '1.4', '0.14-0.2em'],
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.nightBorder}` }}>
                    {row.map((cell, j) => (
                      <td key={j} style={{
                        padding: '10px 12px',
                        color: j === 0 ? C.textLight : C.textLightMuted,
                        fontWeight: j === 0 ? 600 : 400,
                      }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </MaxWidth>
      </DarkSection>

      <PatternStrip pattern="dots" height={3} />

      {/* ============================================================ */}
      {/*  04. PATTERNS                                                 */}
      {/* ============================================================ */}
      <DarkSection style={{ background: C.nightCard, position: 'relative' }}>
        <div id="patterns" style={{ position: 'absolute', top: -80 }} />
        <MaxWidth>
          <SectionHeader num={4} title="Pattern Library" subtitle="Geometric and textural patterns that extend the Bold Graphic identity. Use as section backgrounds, card textures, dividers, and overlay elements." dark />

          {/* Pattern grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 24,
            marginBottom: 48,
          }}>
            {[
              { name: 'Diagonal Lines', desc: 'Section dividers, card accents', Component: PatternDiagonalLines, css: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(232,93,38,0.08) 5px, rgba(232,93,38,0.08) 6px)' },
              { name: 'Dot Grid', desc: 'Background texture, card fills', Component: PatternDotGrid, css: 'radial-gradient(circle, #E85D26 1px, transparent 1px) 0 0 / 20px 20px' },
              { name: 'Cross Hatch', desc: 'Industrial texture, overlays', Component: PatternCrossHatch, css: 'repeating-linear-gradient(45deg, ...) + repeating-linear-gradient(-45deg, ...)' },
              { name: 'Angular Grid', desc: 'Technical drawings, blueprints', Component: PatternAngularGrid, css: 'Grid + diagonal SVG pattern' },
              { name: 'Film Grain', desc: 'Video overlays, photo treatment', Component: PatternFilmGrain, css: 'SVG feTurbulence filter' },
              { name: 'Orange Bar Stack', desc: 'Data visualization, rhythm', Component: PatternOrangeBar, css: 'Stacked width-varying bars' },
            ].map(p => (
              <div key={p.name} style={{ textAlign: 'center' }}>
                <p.Component size={200} />
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.textLight }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: C.textLightMuted, marginTop: 2 }}>{p.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Pattern usage examples */}
          <h3 style={{ fontFamily: '"Syne", sans-serif', fontSize: 24, fontWeight: 700, color: C.textLight, marginBottom: 20 }}>Pattern Application</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 24,
          }}>
            {/* Section divider example */}
            <div style={{
              background: C.night,
              borderRadius: 16,
              overflow: 'hidden',
              border: `1px solid ${C.nightBorder}`,
            }}>
              <div style={{ padding: '32px 24px', background: C.night }}>
                <div style={{ fontSize: 14, color: C.textLightMuted, marginBottom: 4 }}>Section Above</div>
              </div>
              <div style={{ height: 4, position: 'relative' }}>
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="ex-diag" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                      <line x1="0" y1="0" x2="0" y2="8" stroke={C.orange} strokeWidth="1" opacity="0.35" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#ex-diag)" />
                </svg>
              </div>
              <div style={{ padding: '32px 24px', background: C.nightCard }}>
                <div style={{ fontSize: 14, color: C.textLightMuted, marginBottom: 4 }}>Section Below</div>
              </div>
              <div style={{ padding: '12px 24px', borderTop: `1px solid ${C.nightBorder}` }}>
                <Badge color={C.textLightMuted}>Section Divider</Badge>
              </div>
            </div>

            {/* Card with pattern background */}
            <div style={{
              background: C.night,
              borderRadius: 16,
              overflow: 'hidden',
              border: `1px solid ${C.nightBorder}`,
            }}>
              <div style={{ padding: 24, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, opacity: 0.4 }}>
                  <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="ex-dots" patternUnits="userSpaceOnUse" width="20" height="20">
                        <circle cx="10" cy="10" r="1" fill={C.orange} opacity="0.2" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#ex-dots)" />
                  </svg>
                </div>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ fontSize: 12, color: C.orange, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Featured</div>
                  <div style={{ fontFamily: '"Syne", sans-serif', fontSize: 24, fontWeight: 800, color: C.textLight, marginBottom: 8 }}>Card Title</div>
                  <div style={{ fontSize: 14, color: C.textLightMuted }}>Dot grid pattern at low opacity creates subtle texture depth.</div>
                </div>
              </div>
              <div style={{ padding: '12px 24px', borderTop: `1px solid ${C.nightBorder}` }}>
                <Badge color={C.textLightMuted}>Card Background</Badge>
              </div>
            </div>

            {/* Hero overlay example */}
            <div style={{
              borderRadius: 16,
              overflow: 'hidden',
              border: `1px solid ${C.nightBorder}`,
              position: 'relative',
              background: `linear-gradient(135deg, ${C.night} 0%, #1a1208 100%)`,
            }}>
              <div style={{ position: 'absolute', inset: 0 }}>
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <filter id="ex-grain">
                      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" />
                      <feColorMatrix type="saturate" values="0" />
                    </filter>
                  </defs>
                  <rect width="100%" height="100%" filter="url(#ex-grain)" opacity="0.08" />
                </svg>
              </div>
              <div style={{ padding: 24, position: 'relative', zIndex: 1, minHeight: 120, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{ fontFamily: '"Syne", sans-serif', fontSize: 36, fontWeight: 800, color: C.textLight, lineHeight: 1 }}>
                  IMPOSSIBLE<br/>TO IGNORE<span style={{ color: C.orange }}>.</span>
                </div>
              </div>
              <div style={{ padding: '12px 24px', borderTop: `1px solid ${C.nightBorder}`, position: 'relative', zIndex: 1 }}>
                <Badge color={C.textLightMuted}>Film Grain Overlay</Badge>
              </div>
            </div>
          </div>

          {/* CSS snippets */}
          <div style={{
            background: C.night,
            borderRadius: 16,
            padding: 32,
            border: `1px solid ${C.nightBorder}`,
            marginTop: 32,
          }}>
            <h3 style={{ fontFamily: '"Syne", sans-serif', fontSize: 20, fontWeight: 700, color: C.textLight, marginBottom: 16 }}>CSS Pattern Recipes</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
              {[
                { name: 'Diagonal Lines', code: `background: repeating-linear-gradient(\n  45deg,\n  transparent,\n  transparent 5px,\n  rgba(232,93,38,0.08) 5px,\n  rgba(232,93,38,0.08) 6px\n);` },
                { name: 'Dot Grid', code: `background: radial-gradient(\n  circle,\n  #E85D26 1px,\n  transparent 1px\n);\nbackground-size: 20px 20px;` },
                { name: 'Cross Hatch', code: `background:\n  repeating-linear-gradient(\n    45deg, rgba(255,255,255,0.03) 0px,\n    rgba(255,255,255,0.03) 1px,\n    transparent 1px, transparent 8px\n  ),\n  repeating-linear-gradient(\n    -45deg, rgba(255,255,255,0.03) 0px,\n    rgba(255,255,255,0.03) 1px,\n    transparent 1px, transparent 8px\n  );` },
              ].map(s => (
                <div key={s.name}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.orange, marginBottom: 8, letterSpacing: '0.08em' }}>{s.name}</div>
                  <pre style={{
                    background: '#0a0a0a',
                    borderRadius: 8,
                    padding: 16,
                    fontSize: 12,
                    color: C.textLightMuted,
                    lineHeight: 1.5,
                    overflow: 'auto',
                    margin: 0,
                    border: `1px solid ${C.nightBorder}`,
                  }}>{s.code}</pre>
                </div>
              ))}
            </div>
          </div>
        </MaxWidth>
      </DarkSection>

      <PatternStrip pattern="diagonal" height={3} />

      {/* ============================================================ */}
      {/*  05. SPACING & GRID                                           */}
      {/* ============================================================ */}
      <LightSection style={{ position: 'relative' }}>
        <div id="spacing" style={{ position: 'absolute', top: -80 }} />
        <MaxWidth>
          <SectionHeader num={5} title="Spacing & Grid" subtitle="The 12-column system, section spacing rules, and the spacing scale that keeps everything aligned." />

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: 32,
            marginBottom: 48,
          }}>
            {/* Grid system */}
            <div style={{
              background: C.white,
              borderRadius: 16,
              padding: 32,
              border: `1px solid ${C.lightBorder}`,
            }}>
              <h3 style={{ fontFamily: '"Syne", sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 16 }}>12-Column Grid</h3>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 4, marginBottom: 8 }}>
                  {[...Array(12)].map((_, i) => (
                    <div key={i} style={{
                      height: 40,
                      background: i % 2 === 0 ? `${C.orange}15` : `${C.orange}0A`,
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 9,
                      color: C.warmGray,
                    }}>{i + 1}</div>
                  ))}
                </div>
              </div>
              <div style={{ fontSize: 13, color: C.warmGray, lineHeight: 1.6 }}>
                Max width: 1200px. Gutters: 24px. Side padding: 24px (mobile) to 80px (desktop). Content areas snap to column boundaries.
              </div>
            </div>

            {/* Spacing scale */}
            <div style={{
              background: C.white,
              borderRadius: 16,
              padding: 32,
              border: `1px solid ${C.lightBorder}`,
            }}>
              <h3 style={{ fontFamily: '"Syne", sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Spacing Scale</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: '4px', name: 'Micro', use: 'Inline gaps, icon padding' },
                  { label: '8px', name: 'XS', use: 'Tight element spacing' },
                  { label: '12px', name: 'SM', use: 'Card padding (compact)' },
                  { label: '16px', name: 'MD', use: 'Standard gap, grid gutter' },
                  { label: '24px', name: 'LG', use: 'Section sub-groups' },
                  { label: '32px', name: 'XL', use: 'Card padding, element groups' },
                  { label: '48px', name: '2XL', use: 'Section padding (mobile)' },
                  { label: '64px', name: '3XL', use: 'Section spacing' },
                  { label: '96px', name: '4XL', use: 'Section padding (desktop)' },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: parseInt(s.label),
                      height: 8,
                      background: C.orange,
                      borderRadius: 2,
                      flexShrink: 0,
                      minWidth: 4,
                      maxWidth: 96,
                      opacity: 0.6,
                    }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.black, width: 36, flexShrink: 0 }}>{s.label}</span>
                    <span style={{ fontSize: 12, color: C.warmGray }}>{s.name} / {s.use}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section spacing rules */}
          <div style={{
            background: C.white,
            borderRadius: 16,
            padding: 32,
            border: `1px solid ${C.lightBorder}`,
          }}>
            <h3 style={{ fontFamily: '"Syne", sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Section Spacing Rules</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24 }}>
              {[
                { label: 'Section Padding', value: '48px - 96px', desc: 'Scales with viewport. clamp(48px, 8vw, 96px).' },
                { label: 'Between Sections', value: '0px', desc: 'Sections are flush. Pattern strips handle transitions.' },
                { label: 'Section Header MB', value: '48px', desc: 'Space below section headers before content.' },
                { label: 'Card Grid Gap', value: '16-24px', desc: '16px for compact grids, 24px for feature cards.' },
                { label: 'Max Content Width', value: '1200px', desc: 'All content centered within this max-width.' },
              ].map(r => (
                <div key={r.label}>
                  <div style={{ fontSize: 12, color: C.orange, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{r.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, fontFamily: '"Syne", sans-serif', marginBottom: 4 }}>{r.value}</div>
                  <div style={{ fontSize: 13, color: C.warmGray, lineHeight: 1.5 }}>{r.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </MaxWidth>
      </LightSection>

      <PatternStrip pattern="dots" height={3} />

      {/* ============================================================ */}
      {/*  06. COMPONENT LIBRARY                                        */}
      {/* ============================================================ */}
      <DarkSection style={{ position: 'relative' }}>
        <div id="components" style={{ position: 'absolute', top: -80 }} />
        <MaxWidth>
          <SectionHeader num={6} title="Component Library" subtitle="Buttons, badges, cards, dividers, and section headers. Every building block of the AOM visual system." dark />

          {/* Buttons */}
          <h3 style={{ fontFamily: '"Syne", sans-serif', fontSize: 24, fontWeight: 700, color: C.textLight, marginBottom: 20 }}>Buttons</h3>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            marginBottom: 48,
            padding: 32,
            background: C.nightCard,
            borderRadius: 16,
            border: `1px solid ${C.nightBorder}`,
          }}>
            {/* Primary */}
            <button style={{
              fontFamily: '"Hanken Grotesk", sans-serif',
              fontSize: 14,
              fontWeight: 600,
              color: C.white,
              background: C.orange,
              border: 'none',
              borderRadius: 8,
              padding: '14px 28px',
              cursor: 'pointer',
              boxShadow: `0 4px 24px ${C.orangeGlow}`,
            }}>Primary CTA</button>

            {/* Secondary */}
            <button style={{
              fontFamily: '"Hanken Grotesk", sans-serif',
              fontSize: 14,
              fontWeight: 600,
              color: C.textLight,
              background: 'transparent',
              border: `1px solid rgba(255,255,255,0.2)`,
              borderRadius: 8,
              padding: '14px 28px',
              cursor: 'pointer',
            }}>Secondary</button>

            {/* Ghost */}
            <button style={{
              fontFamily: '"Hanken Grotesk", sans-serif',
              fontSize: 14,
              fontWeight: 600,
              color: C.orange,
              background: 'transparent',
              border: 'none',
              padding: '14px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>Learn more <span style={{ fontSize: 18 }}>&rarr;</span></button>

            {/* Small */}
            <button style={{
              fontFamily: '"Hanken Grotesk", sans-serif',
              fontSize: 12,
              fontWeight: 600,
              color: C.white,
              background: C.orange,
              border: 'none',
              borderRadius: 6,
              padding: '8px 16px',
              cursor: 'pointer',
            }}>Small CTA</button>

            {/* Sage variant */}
            <button style={{
              fontFamily: '"Hanken Grotesk", sans-serif',
              fontSize: 14,
              fontWeight: 600,
              color: C.white,
              background: C.sage,
              border: 'none',
              borderRadius: 8,
              padding: '14px 28px',
              cursor: 'pointer',
            }}>Sage Accent</button>
          </div>

          {/* Badges */}
          <h3 style={{ fontFamily: '"Syne", sans-serif', fontSize: 24, fontWeight: 700, color: C.textLight, marginBottom: 20 }}>Badges / Pills</h3>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 48,
            padding: 32,
            background: C.nightCard,
            borderRadius: 16,
            border: `1px solid ${C.nightBorder}`,
          }}>
            <Badge color={C.textLight}>Default</Badge>
            <Badge color={C.orange} style={{ borderColor: C.orange }}>Orange</Badge>
            <Badge color={C.sage} style={{ borderColor: C.sage }}>Sage</Badge>
            <Badge color={C.gold} style={{ borderColor: C.gold }}>Gold</Badge>
            <Badge color={C.white} bg="rgba(255,255,255,0.06)">Filled</Badge>
            <Badge color={C.orange} bg={C.orangeGlow} style={{ borderColor: 'transparent' }}>Glow</Badge>
            <span style={{
              display: 'inline-block',
              fontFamily: '"Hanken Grotesk", sans-serif',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: C.black,
              border: `1px solid ${C.lightBorder}`,
              borderRadius: 100,
              padding: '4px 14px',
              background: C.cream,
              lineHeight: 1.4,
            }}>On Light</span>
          </div>

          {/* Cards */}
          <h3 style={{ fontFamily: '"Syne", sans-serif', fontSize: 24, fontWeight: 700, color: C.textLight, marginBottom: 20 }}>Cards</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 20,
            marginBottom: 48,
          }}>
            {/* Dark card */}
            <div style={{
              background: C.nightCard,
              borderRadius: 16,
              padding: 28,
              border: `1px solid ${C.nightBorder}`,
            }}>
              <Badge color={C.orange} style={{ borderColor: C.orange, marginBottom: 16 }}>Video</Badge>
              <h4 style={{ fontFamily: '"Syne", sans-serif', fontSize: 20, fontWeight: 700, color: C.textLight, marginBottom: 8 }}>Dark Card</h4>
              <p style={{ fontSize: 14, color: C.textLightMuted, lineHeight: 1.5 }}>Standard card on dark backgrounds. Subtle border, slight background lift.</p>
            </div>

            {/* Frosted card */}
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderRadius: 16,
              padding: 28,
              border: `1px solid rgba(255,255,255,0.08)`,
            }}>
              <Badge color={C.sage} style={{ borderColor: C.sage, marginBottom: 16 }}>AI</Badge>
              <h4 style={{ fontFamily: '"Syne", sans-serif', fontSize: 20, fontWeight: 700, color: C.textLight, marginBottom: 8 }}>Frosted Card</h4>
              <p style={{ fontSize: 14, color: C.textLightMuted, lineHeight: 1.5 }}>Backdrop blur for overlaying video or image backgrounds.</p>
            </div>

            {/* Orange accent card */}
            <div style={{
              background: C.nightCard,
              borderRadius: 16,
              padding: 28,
              border: `2px solid ${C.orange}40`,
              boxShadow: `0 8px 32px ${C.orangeGlow}`,
            }}>
              <Badge color={C.orange} style={{ borderColor: C.orange, marginBottom: 16 }}>Featured</Badge>
              <h4 style={{ fontFamily: '"Syne", sans-serif', fontSize: 20, fontWeight: 700, color: C.textLight, marginBottom: 8 }}>Accent Card</h4>
              <p style={{ fontSize: 14, color: C.textLightMuted, lineHeight: 1.5 }}>Orange border glow for featured or proof elements.</p>
            </div>

            {/* Light card (for cream sections) */}
            <div style={{
              background: C.white,
              borderRadius: 16,
              padding: 28,
              border: `1px solid ${C.lightBorder}`,
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
            }}>
              <Badge color={C.black} style={{ marginBottom: 16 }}>Web</Badge>
              <h4 style={{ fontFamily: '"Syne", sans-serif', fontSize: 20, fontWeight: 700, color: C.black, marginBottom: 8 }}>Light Card</h4>
              <p style={{ fontSize: 14, color: C.warmGray, lineHeight: 1.5 }}>For cream/light sections. White surface, soft shadow, warm border.</p>
            </div>
          </div>

          {/* Dividers */}
          <h3 style={{ fontFamily: '"Syne", sans-serif', fontSize: 24, fontWeight: 700, color: C.textLight, marginBottom: 20 }}>Dividers & Accents</h3>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            padding: 32,
            background: C.nightCard,
            borderRadius: 16,
            border: `1px solid ${C.nightBorder}`,
          }}>
            {/* Orange bar */}
            <div>
              <div style={{ fontSize: 12, color: C.textLightMuted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Orange Bar (12px)</div>
              <div style={{ width: 48, height: 2, background: C.orange, borderRadius: 1 }} />
            </div>
            {/* Subtle border */}
            <div>
              <div style={{ fontSize: 12, color: C.textLightMuted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Subtle Border</div>
              <div style={{ width: '100%', height: 1, background: C.nightBorder }} />
            </div>
            {/* Pattern strip */}
            <div>
              <div style={{ fontSize: 12, color: C.textLightMuted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Pattern Strip</div>
              <PatternStrip pattern="diagonal" height={4} />
            </div>
            {/* Orange glow line */}
            <div>
              <div style={{ fontSize: 12, color: C.textLightMuted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Orange Glow Line</div>
              <div style={{ width: '40%', height: 1, background: `linear-gradient(90deg, ${C.orange}, transparent)` }} />
            </div>
          </div>
        </MaxWidth>
      </DarkSection>

      <PatternStrip pattern="diagonal" height={3} />

      {/* ============================================================ */}
      {/*  07. PHOTOGRAPHY STYLE                                        */}
      {/* ============================================================ */}
      <LightSection style={{ position: 'relative' }}>
        <div id="photography" style={{ position: 'absolute', top: -80 }} />
        <MaxWidth>
          <SectionHeader num={7} title="Photography Style" subtitle="How we treat, crop, and present photography across all brand touchpoints." />

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24,
          }}>
            {[
              {
                title: 'Dramatic Lighting',
                desc: 'High contrast. Side lighting. Shadows are a feature, not a flaw. Reference: jobsite photography at golden hour, interview setups with motivated light.',
                rule: 'Never use flat, even lighting. Every frame has a clear light source.',
              },
              {
                title: 'Real Environments',
                desc: 'No stock. No green screen. Every photo comes from a real jobsite, real office, real production. The texture of the environment is part of the brand.',
                rule: 'Zero tolerance for generic stock photography.',
              },
              {
                title: 'Cropping Rules',
                desc: 'Crops are intentional. Full-bleed hero images. Tight portrait crops at 4:5 for social. 16:9 for web hero and video. Never center-crop a face.',
                rule: 'Aspect ratios: 16:9 (hero), 4:5 (social portrait), 1:1 (thumbnail), 3:4 (card).',
              },
              {
                title: 'Photo Treatment',
                desc: 'On dark sections: photos get a 2px border in rgba(255,255,255,0.10) with 8px border-radius. On light sections: 1px border in #D9D3CB.',
                rule: 'Film grain overlay at 4-5% opacity on hero and featured images.',
              },
              {
                title: 'Color Grade',
                desc: 'Warm, slightly desaturated. Not orange-tinted, but not clinical. Blacks should be rich and deep. Whites warm, never blue.',
                rule: 'Apply AOM LUT before export. Consistent grade across all deliverables.',
              },
              {
                title: 'People',
                desc: 'Candid over posed. Show people in the middle of doing their work. The camera should feel like it belongs there, not like it interrupted.',
                rule: 'Action over standing. Work over smiling at camera.',
              },
            ].map(item => (
              <div key={item.title} style={{
                background: C.white,
                borderRadius: 16,
                padding: 28,
                border: `1px solid ${C.lightBorder}`,
              }}>
                <h4 style={{ fontFamily: '"Syne", sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{item.title}</h4>
                <p style={{ fontSize: 14, color: C.warmGray, lineHeight: 1.6, marginBottom: 12 }}>{item.desc}</p>
                <div style={{
                  fontSize: 12,
                  color: C.orange,
                  fontWeight: 600,
                  padding: '8px 12px',
                  background: `${C.orange}08`,
                  borderRadius: 6,
                  borderLeft: `2px solid ${C.orange}`,
                }}>
                  {item.rule}
                </div>
              </div>
            ))}
          </div>
        </MaxWidth>
      </LightSection>

      <PatternStrip pattern="dots" height={3} />

      {/* ============================================================ */}
      {/*  08. VOICE & TONE                                             */}
      {/* ============================================================ */}
      <DarkSection style={{ position: 'relative' }}>
        <div id="voice-tone" style={{ position: 'absolute', top: -80 }} />
        <MaxWidth>
          <SectionHeader num={8} title="Voice & Tone" subtitle="How AOM sounds. The energy behind every word." dark />

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24,
            marginBottom: 48,
          }}>
            {[
              { label: 'Confident', desc: '"We get it." Not arrogant. Just experienced. We\'ve been in the room. We know what works and what doesn\'t.', do: 'We deliver in days, not weeks.', dont: 'We strive to meet our delivery targets.' },
              { label: 'Human', desc: 'Anti-corporate. Anti-BS. Write like you\'d talk to someone you respect. Warm, direct, no filler.', do: 'Small team. Big output. No layers.', dont: 'Our streamlined organizational structure enables maximum efficiency.' },
              { label: 'Alive', desc: 'There\'s energy in every piece. The brand doesn\'t sit still. Even the quiet moments have tension.', do: 'Impossible to ignore.', dont: 'High-quality content solutions.' },
            ].map(v => (
              <div key={v.label} style={{
                background: C.nightCard,
                borderRadius: 16,
                padding: 32,
                border: `1px solid ${C.nightBorder}`,
              }}>
                <div style={{
                  fontFamily: '"Syne", sans-serif',
                  fontSize: 32,
                  fontWeight: 800,
                  color: C.textLight,
                  marginBottom: 12,
                }}>{v.label}<span style={{ color: C.orange }}>.</span></div>
                <p style={{ fontSize: 14, color: C.textLightMuted, lineHeight: 1.6, marginBottom: 20 }}>{v.desc}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.sage, marginBottom: 4 }}>Do</div>
                    <div style={{ fontSize: 15, color: C.textLight, fontStyle: 'italic' }}>"{v.do}"</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8A4A3A', marginBottom: 4 }}>Don't</div>
                    <div style={{ fontSize: 15, color: C.textLightMuted, fontStyle: 'italic', textDecoration: 'line-through', textDecorationColor: 'rgba(232,93,38,0.3)' }}>"{v.dont}"</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Writing rules */}
          <div style={{
            background: C.nightCard,
            borderRadius: 16,
            padding: 32,
            border: `1px solid ${C.nightBorder}`,
          }}>
            <h3 style={{ fontFamily: '"Syne", sans-serif', fontSize: 24, fontWeight: 700, color: C.textLight, marginBottom: 20 }}>Copy Rules</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
              {[
                'Bullet points over paragraphs.',
                'Short sentences. Scannable.',
                'No em dashes. Period.',
                'Headlines: Syne, all caps or title case. Never sentence case.',
                'Body: Hanken Grotesk. 16px min on web.',
                'CTAs: Action verbs. "Get started" not "Submit".',
                'Numbers are display elements. Make them big.',
                'If it sounds like a LinkedIn post from 2019, rewrite it.',
              ].map((rule, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  fontSize: 14,
                  color: C.textLightMuted,
                  lineHeight: 1.5,
                }}>
                  <span style={{ color: C.orange, fontWeight: 700, flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                  {rule}
                </div>
              ))}
            </div>
          </div>
        </MaxWidth>
      </DarkSection>

      <PatternStrip pattern="diagonal" height={3} />

      {/* ============================================================ */}
      {/*  09. TEMPLATE KIT                                             */}
      {/* ============================================================ */}
      <DarkSection style={{ position: 'relative' }}>
        <div id="template-kit" style={{ position: 'absolute', top: -80 }} />
        <MaxWidth>
          <SectionHeader num={9} title="Template Kit" subtitle="Production-ready layouts for social, print, and digital. Drag content in, brand stays consistent." dark />

          {/* ---- SOCIAL MEDIA TEMPLATES ---- */}
          <h3 style={{ fontFamily: '"Syne", sans-serif', fontSize: 24, fontWeight: 700, color: C.textLight, marginBottom: 20 }}>Social Media</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 24,
            marginBottom: 48,
          }}>
            <TemplateCard
              name="Instagram Post"
              dimensions="1080 x 1080 (1:1)"
              usage="Type-forward poster. Bold Syne headline on night, an oversized brand dot bled off the corner, Fraunces voice line. For announcements, case studies, proof."
              exportWidth={1080}
              exportHeight={1080}
              exportFilename="aom-ig-post"
              specs={{
                fonts: ['Syne 800 (headline)', 'Hanken Grotesk 400 (body)', 'Hanken Grotesk 700 caps (labels)'],
                colors: [
                  { hex: '#0C0C0C', label: 'bg' },
                  { hex: '#E85D26', label: 'accent' },
                  { hex: '#FDF6EC', label: 'headline' },
                  { hex: '#8A847C', label: 'body' },
                ],
                layout: 'Headline-led, edge-bled brand dot, Hanken footer rule',
              }}
            >
              <TemplateSocialIGPost />
            </TemplateCard>

            <TemplateCard
              name="Instagram Story / Reel Cover"
              dimensions="1080 x 1920 (9:16)"
              usage="Vertical type poster. Headline anchored low under an orange rule, brand dot bled top-right."
              exportWidth={1080}
              exportHeight={1920}
              exportFilename="aom-ig-story"
              specs={{
                fonts: ['Syne 800 (headline)', 'Hanken Grotesk 700 caps (category)'],
                colors: [
                  { hex: '#0C0C0C', label: 'bg' },
                  { hex: '#E85D26', label: 'label' },
                  { hex: '#FDF6EC', label: 'headline' },
                ],
                layout: 'Headline low-anchored, orange rule, bled brand dot',
              }}
            >
              <TemplateSocialIGStory />
            </TemplateCard>

            <TemplateCard
              name="LinkedIn Post"
              dimensions="1200 x 628 (~1.91:1)"
              usage="Orange brand panel left, statement right with Fraunces support line and arrow CTA. For thought leadership."
              exportWidth={1200}
              exportHeight={628}
              exportFilename="aom-linkedin-post"
              specs={{
                fonts: ['Syne 800 (headline)', 'Hanken Grotesk 400 (body)', 'Hanken Grotesk 600 (CTA)'],
                colors: [
                  { hex: '#0C0C0C', label: 'bg' },
                  { hex: '#E85D26', label: 'CTA strip' },
                  { hex: '#FDF6EC', label: 'headline' },
                ],
                layout: '38% orange brand panel / statement right',
              }}
            >
              <TemplateSocialLinkedIn />
            </TemplateCard>

            <TemplateCard
              name="Before / After Split"
              dimensions="1080 x 1080 (1:1)"
              usage="Split frame with an orange seam, B / A markers, project strip below. For site work and brand redesigns."
              exportWidth={1080}
              exportHeight={1080}
              exportFilename="aom-before-after"
              specs={{
                fonts: ['Hanken Grotesk 700 caps (labels)', 'Hanken Grotesk 600 (project name)'],
                colors: [
                  { hex: '#0C0C0C', label: 'bg' },
                  { hex: '#E85D26', label: 'divider' },
                  { hex: '#F0ECE6', label: 'text' },
                ],
                layout: '50/50 split, orange seam, project strip',
              }}
            >
              <TemplateSocialBeforeAfter />
            </TemplateCard>

            <TemplateCard
              name="Testimonial Card"
              dimensions="1080 x 1080 (1:1)"
              usage="Fraunces quote led with an oversized quote mark, orange rule, attribution and mark. For client proof."
              exportWidth={1080}
              exportHeight={1080}
              exportFilename="aom-testimonial"
              specs={{
                fonts: ['Syne 800 (quote mark)', 'Fraunces 400 italic (quote)', 'Hanken Grotesk 600 (name)'],
                colors: [
                  { hex: '#0C0C0C', label: 'bg' },
                  { hex: '#E85D26', label: 'accent line + quote mark' },
                  { hex: '#F0ECE6', label: 'text' },
                ],
                layout: 'Quote-led Fraunces, oversized quote mark, attribution row',
              }}
            >
              <TemplateSocialTestimonial />
            </TemplateCard>

            <TemplateCard
              name="Quick Tip / Educational"
              dimensions="1080 x 1080 (1:1)"
              usage="Full dark background with category label, watermark number, headline, and body. For tips, educational content, and authority posts."
              exportWidth={1080}
              exportHeight={1080}
              exportFilename="aom-quick-tip"
              specs={{
                fonts: ['Syne 900 (watermark number)', 'Syne 800 (headline)', 'Hanken Grotesk 400 (body)', 'Hanken Grotesk 700 caps (category)'],
                colors: [
                  { hex: '#0C0C0C', label: 'bg' },
                  { hex: '#E85D26', label: 'category + number watermark' },
                  { hex: '#FDF6EC', label: 'headline' },
                ],
                layout: 'Category top-left, watermark number background, content centered',
              }}
            >
              <TemplateSocialQuickTip />
            </TemplateCard>
          </div>

          {/* ---- PRESENTATION TEMPLATES ---- */}
          <h3 style={{ fontFamily: '"Syne", sans-serif', fontSize: 24, fontWeight: 700, color: C.textLight, marginBottom: 20 }}>Presentation Slides</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: 24,
            marginBottom: 48,
          }}>
            <TemplateCard
              name="Title Slide"
              dimensions="1920 x 1080 (16:9)"
              usage="Opening slide. AOM logo top-left, title centered, subtitle below, presenter and date bottom-left with pattern strip."
              exportWidth={1920}
              exportHeight={1080}
              exportFilename="aom-presentation-title"
              specs={{
                fonts: ['Syne 800 (title)', 'Hanken Grotesk 400 (subtitle)', 'Hanken Grotesk 500 caps (date)'],
                colors: [
                  { hex: '#0C0C0C', label: 'bg' },
                  { hex: '#E85D26', label: 'pattern strip' },
                  { hex: '#F0ECE6', label: 'title' },
                  { hex: '#8A847C', label: 'subtitle' },
                ],
                layout: 'Logo top-left, title centered, pattern strip bottom',
              }}
            >
              <TemplatePresentationTitle />
            </TemplateCard>

            <TemplateCard
              name="Content Slide"
              dimensions="1920 x 1080 (16:9)"
              usage="Standard content layout. Section label top-left in orange, headline, body text, page number bottom-right."
              exportWidth={1920}
              exportHeight={1080}
              exportFilename="aom-presentation-content"
              specs={{
                fonts: ['Syne 800 (headline)', 'Hanken Grotesk 400 (body)', 'Hanken Grotesk 700 caps (section label)', 'Hanken Grotesk 400 caps (page number)'],
                colors: [
                  { hex: '#0C0C0C', label: 'bg' },
                  { hex: '#E85D26', label: 'section label' },
                  { hex: '#F0ECE6', label: 'headline' },
                  { hex: '#8A847C', label: 'body' },
                ],
                layout: 'Section label top-left, headline + body centered, page number bottom-right',
              }}
            >
              <TemplatePresentationContent />
            </TemplateCard>

            <TemplateCard
              name="Data / Stats Slide"
              dimensions="1920 x 1080 (16:9)"
              usage="Three stat blocks in a row with left orange border. For KPIs, results, and proof numbers."
              exportWidth={1920}
              exportHeight={1080}
              exportFilename="aom-presentation-stats"
              specs={{
                fonts: ['Syne 900 (stat numbers)', 'Hanken Grotesk 600 (labels)', 'Hanken Grotesk 700 caps (section label)'],
                colors: [
                  { hex: '#0C0C0C', label: 'bg' },
                  { hex: '#E85D26', label: 'numbers + section label' },
                  { hex: '#8A847C', label: 'stat labels' },
                ],
                layout: '3 stat blocks, 2px orange left border each',
              }}
            >
              <TemplatePresentationStats />
            </TemplateCard>
          </div>

          {/* ---- PRINT TEMPLATES ---- */}
          <h3 style={{ fontFamily: '"Syne", sans-serif', fontSize: 24, fontWeight: 700, color: C.textLight, marginBottom: 20 }}>Print</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 24,
            marginBottom: 48,
          }}>
            <PrintPreviewCard type="business-card" />
            <PrintPreviewCard type="letterhead" />
          </div>

          {/* Template usage notes */}
          <div style={{
            background: C.nightCard,
            padding: 32,
            border: `1px solid ${C.nightBorder}`,
          }}>
            <h3 style={{ fontFamily: '"Syne", sans-serif', fontSize: 20, fontWeight: 700, color: C.textLight, marginBottom: 16 }}>Template Usage</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {[
                { label: 'Prop-Driven', desc: 'Every template accepts props (headline, body, stat, image, category). Swap content in, brand stays consistent.' },
                { label: 'Agent-Ready', desc: 'Structured for eventual API integration. Agents will populate these templates with JSON data to generate brand-consistent social posts.' },
                { label: 'Aspect-Correct', desc: 'Each template renders at the exact aspect ratio of its target platform. What you see is what gets published.' },
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}>
                  <span style={{ color: C.orange, fontWeight: 700, flexShrink: 0, fontFamily: '"Hanken Grotesk", sans-serif', fontSize: 12 }}>{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.textLight, marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 14, color: C.textLightMuted, lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </MaxWidth>
      </DarkSection>

      {/* ============================================================ */}
      {/*  FOOTER                                                       */}
      {/* ============================================================ */}
      <section style={{
        background: C.black,
        padding: '48px clamp(24px, 5vw, 80px)',
        borderTop: `2px solid ${C.orange}`,
      }}>
        <MaxWidth>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{
                fontFamily: '"Syne", sans-serif',
                fontSize: 24,
                fontWeight: 800,
                color: C.textLight,
              }}>AOM<span style={{ color: C.orange }}>.</span></div>
              <div style={{ fontSize: 12, color: C.textLightMuted, marginTop: 4 }}>Brand Guidelines v4.0 / Bold Graphic System</div>
            </div>
            <div style={{ fontSize: 12, color: C.textLightMuted }}>
              Ahead of Market / Phoenix, AZ / 2026
            </div>
          </div>
        </MaxWidth>
      </section>
    </div>
  )
}