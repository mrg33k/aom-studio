import React, { useState } from 'react';
import { StatusDot, Badge, Avatar, Card, Button, IconButton, ToolTile, RoomRow, SideRail, MessageBubble, CatchUpCard } from './kit/index.js';

// KitGallery — the verification surface for the CV6 kit. Renders every ported
// piece so we can screenshot it and compare against the design's component cards
// (components/*/*.card.html). Preview at /cv6kit?screen=kit (add &theme=dark|light|glass).
// This is a test surface, not a product screen.

const FolderIcon = (c) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c || 'var(--violet-400)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></svg>
);
const SearchIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
const HomeIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-7 9 7" /><path d="M5 9.8V20h14V9.8" /></svg>;
const ChatIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11.5a7.5 7.5 0 0 1-10.5 6.8L5 19.5l1.2-4A7.5 7.5 0 1 1 20 11.5Z" /></svg>;

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 10 }}>{title}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>{children}</div>
    </div>
  );
}

export default function KitGallery({ theme = 'glass' }) {
  const [tab, setTab] = useState('chat');
  return (
    <div data-cv6kit data-theme={theme} style={{ position: 'fixed', inset: 0, overflowY: 'auto', background: 'var(--ground)', fontFamily: 'var(--font-sans)', color: 'var(--fg)' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: 'calc(env(safe-area-inset-top,0px) + 20px) 18px 60px' }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.02em', marginBottom: 4 }}>CV6 Kit</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 22 }}>The design system pieces, ported. Theme: {theme}</div>

        <Section title="StatusDot">
          <StatusDot status="online" /><StatusDot status="working" /><StatusDot status="attention" /><StatusDot status="ready" />
        </Section>

        <Section title="Badge">
          <Badge>4</Badge><Badge tone="solid">3</Badge><Badge tone="chip">12</Badge>
        </Section>

        <Section title="Avatar">
          <Avatar initial="P" /><Avatar initial="EL" size={48} ring /><Avatar initial="R" size={32} />
        </Section>

        <Section title="Button">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="accentWeak">Accent weak</Button>
        </Section>

        <Section title="IconButton">
          <IconButton tone="surface">{SearchIcon}</IconButton>
          <IconButton tone="accent">{SearchIcon}</IconButton>
          <IconButton tone="ghost" badge>{ChatIcon}</IconButton>
        </Section>

        <Section title="Card">
          <Card style={{ width: '100%' }}><div style={{ fontSize: 14, color: 'var(--fg)' }}>A frosted base surface. Most content blocks sit on a Card.</div></Card>
        </Section>

        <Section title="ToolTile (tile / compact / rail)">
          <ToolTile layout="tile" icon={HomeIcon} label="Home" active />
          <ToolTile layout="tile" icon={ChatIcon} label="Chat" />
          <ToolTile layout="compact" icon={ChatIcon} label="Chat" active />
          <ToolTile layout="rail" icon={ChatIcon} label="Chat" active />
          <ToolTile layout="rail" icon={HomeIcon} label="Home" />
        </Section>

        <Section title="RoomRow">
          <div style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 'var(--radius-card)', padding: 6 }} className="glassy">
            <RoomRow status="online" name="Elon" tag="AGENT" active />
            <RoomRow status="working" name="Rex" tag="AGENT" />
            <RoomRow leading={FolderIcon('var(--violet-400)')} name="Space Rising" subtitle="28 missions" count={28} chevron />
            <RoomRow leading={FolderIcon('var(--accent)')} name="Mission /007" subtitle="narrowing the retry loop" unread={3} />
          </div>
        </Section>

        <Section title="MessageBubble">
          <div style={{ width: '100%' }}>
            <MessageBubble from="agent" author="Elon" initials="EL" time="9:24">Pulled the latest numbers. The launch deck is ready whenever you want to look.</MessageBubble>
            <MessageBubble from="me">Looks good. Send it once the cover slide is updated.</MessageBubble>
          </div>
        </Section>

        <Section title="CatchUpCard">
          <CatchUpCard style={{ width: '100%' }} project="Space Rising" mission="Mission /007" time="22m" glyphColor="var(--violet-400)" text="Elon flagged a scope item on the Acme thread for your follow up." />
        </Section>

        <Section title="SideRail">
          <div style={{ height: 360, width: 72, borderRadius: 16, overflow: 'hidden', border: '1px solid var(--hair)' }}>
            <SideRail
              active={tab}
              onSelect={setTab}
              items={[
                { key: 'home', label: 'Home', icon: HomeIcon },
                { key: 'chat', label: 'Chat', icon: ChatIcon },
                { key: 'organize', label: 'Files', icon: FolderIcon('currentColor') },
              ]}
            />
          </div>
        </Section>
      </div>
    </div>
  );
}
