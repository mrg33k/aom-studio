import React from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Privacy Policy — Route: /privacy
// Required for App Store submission (Corner iOS) and linked site-wide.
// Standalone, no login. Plain-language policy, truthful to how Corner and
// aheadofmarket.com actually handle data. Same visual DNA as /support:
// calm dark canvas, serif headline, readable body, zero chrome.
// ─────────────────────────────────────────────────────────────────────────────

const INK_TEXT = '#EDE9DE'
const INK_DIM = 'rgba(237,233,222,0.68)'
const INK_FAINT = 'rgba(237,233,222,0.40)'
const AMBER = '#F59E0B'
const SERIF = 'Georgia, "Times New Roman", serif'
const BODY = '"Hanken Grotesk", system-ui, -apple-system, sans-serif'

const sectionTitle = {
  fontFamily: SERIF,
  fontSize: 'clamp(20px, 2.4vw, 26px)',
  fontWeight: 400,
  color: INK_TEXT,
  margin: '40px 0 12px',
  lineHeight: 1.25,
}

const para = {
  fontFamily: BODY,
  fontSize: 16,
  lineHeight: 1.7,
  color: INK_DIM,
  margin: '0 0 16px',
}

const listItem = { ...para, margin: '0 0 8px', paddingLeft: 4 }

export default function PrivacyPolicy() {
  return (
    <div style={{ minHeight: '100vh', background: '#0B0B0E', padding: '0 20px' }}>
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '72px 0 96px' }}>
        <p style={{ fontFamily: BODY, fontSize: 13, letterSpacing: '0.14em', textTransform: 'uppercase', color: INK_FAINT, margin: '0 0 16px' }}>
          Ahead of Market
        </p>
        <h1 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 'clamp(34px, 5vw, 48px)', color: INK_TEXT, margin: '0 0 8px', lineHeight: 1.1 }}>
          Privacy Policy
        </h1>
        <p style={{ ...para, color: INK_FAINT, marginBottom: 8 }}>Effective August 12, 2026</p>
        <p style={para}>
          This policy covers aheadofmarket.com and the Corner app, both operated by
          ADM-INHOUSE LLC ("Ahead of Market", "we"). It describes what we collect,
          why, and the choices you have. The short version: we collect what the
          product needs to work, we don't sell your data, and we don't track you
          across other apps or websites.
        </p>

        <h2 style={sectionTitle}>What we collect</h2>
        <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
          <li style={listItem}>
            <strong style={{ color: INK_TEXT, fontWeight: 600 }}>Account information.</strong>{' '}
            Your name, email address, and login credentials when you create an account.
            Access to Corner is currently by invitation.
          </li>
          <li style={listItem}>
            <strong style={{ color: INK_TEXT, fontWeight: 600 }}>Content you provide.</strong>{' '}
            Messages you send to your assistants, files you share, and the projects and
 tasks you create. This content is the product, it's how your assistants
            know what to work on.
          </li>
          <li style={listItem}>
            <strong style={{ color: INK_TEXT, fontWeight: 600 }}>Device information for notifications.</strong>{' '}
            A push notification token from Apple, so we can tell you when your team has
            something ready for you.
          </li>
          <li style={listItem}>
            <strong style={{ color: INK_TEXT, fontWeight: 600 }}>Basic usage analytics on the website.</strong>{' '}
            aheadofmarket.com uses Google Analytics to understand site traffic. The
            Corner app itself does not include advertising or cross-app tracking SDKs.
          </li>
        </ul>

        <h2 style={sectionTitle}>How we use it</h2>
        <p style={para}>
          We use your information to run the service: delivering your messages to your
          AI assistants and their replies back to you, storing your conversations and
          files so they're there when you return, sending notifications you've enabled,
          and responding when you contact support. We also use it to keep the service
          secure and to fix problems.
        </p>

        <h2 style={sectionTitle}>AI processing</h2>
        <p style={para}>
          Corner is an AI product. Messages you send are processed by AI models
          (including models operated by Anthropic) to generate your assistants'
          responses and to carry out the work you ask for. We do not use your content
          to train AI models, and our AI providers process it under agreements that
          prohibit them from doing so.
        </p>

        <h2 style={sectionTitle}>Who we share it with</h2>
        <p style={para}>
          We do not sell your personal information, and we do not share it with
          advertisers. We share data only with the service providers that run the
          product — hosting (Vercel), data storage (Supabase), AI processing
          (Anthropic), and push notifications (Apple) — and only as needed to provide
          the service. We may also disclose information if the law requires it.
        </p>

        <h2 style={sectionTitle}>Tracking</h2>
        <p style={para}>
          We don't track you across other companies' apps or websites, and we don't use
          your data for targeted advertising. If Apple asks, the answer on the App
          Store label is: data linked to you (contact info and your content, because
          the product needs them), no data used to track you.
        </p>

        <h2 style={sectionTitle}>How long we keep it</h2>
        <p style={para}>
          We keep your account information and content for as long as your account is
          active, so your assistants keep their context. If you delete your account,
          we delete the personal data associated with it.
        </p>

        <h2 style={sectionTitle}>Deleting your account</h2>
        <p style={para}>
          You can delete your account directly in the Corner app under Account
          settings. The app shows you exactly what will be deleted before you confirm.
          You can also email us at{' '}
          <a href="mailto:hello@aom-inhouse.com" style={{ color: AMBER, textDecoration: 'none' }}>
            hello@aom-inhouse.com
          </a>{' '}
          and we'll handle it for you.
        </p>

        <h2 style={sectionTitle}>Security</h2>
        <p style={para}>
          Your data is stored with established infrastructure providers, encrypted in
          transit, and accessible only through authenticated requests. No system is
          perfectly secure, but we treat your conversations the way we'd want ours
          treated.
        </p>

        <h2 style={sectionTitle}>Children</h2>
        <p style={para}>
          Corner and aheadofmarket.com are not directed to children under 13, and we
          do not knowingly collect personal information from them.
        </p>

        <h2 style={sectionTitle}>Changes</h2>
        <p style={para}>
          If we change this policy, we'll update this page and the effective date
          above. Meaningful changes will be announced in the app.
        </p>

        <h2 style={sectionTitle}>Contact</h2>
        <p style={para}>
          Questions about privacy? Email{' '}
          <a href="mailto:hello@aom-inhouse.com" style={{ color: AMBER, textDecoration: 'none' }}>
            hello@aom-inhouse.com
          </a>{' '}
          or reach us through{' '}
          <a href="/support" style={{ color: AMBER, textDecoration: 'none' }}>
            aheadofmarket.com/support
          </a>
          .
        </p>

        <p style={{ ...para, color: INK_FAINT, marginTop: 48, fontSize: 14 }}>
          © 2026 ADM-INHOUSE LLC · Ahead of Market
        </p>
      </main>
    </div>
  )
}