import { useEffect, useRef, useState } from 'react';
import { isActiveRoomStatus, useRoomIdentity } from './data/roomIdentity.js';

const COLORS = ['#2563EB', '#7C3AED', '#0F766E', '#B45309', '#BE185D', '#047857', '#C2410C', '#4F46E5'];

function imageData(file) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith('image/')) { reject(new Error('Choose an image file.')); return; }
    if (file.size > 10 * 1024 * 1024) { reject(new Error('Choose an image smaller than 10 MB.')); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('That image could not be read.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('That image could not be opened.'));
      image.onload = () => {
        const side = Math.min(image.naturalWidth, image.naturalHeight);
        const canvas = document.createElement('canvas');
        canvas.width = 192;
        canvas.height = 192;
        const context = canvas.getContext('2d');
        if (!context) { reject(new Error('That image could not be prepared.')); return; }
        context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, 192, 192);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function RoomAvatar({ room, worldId, size = 40, editable = true, className = '' }) {
  const { identity, saving, save } = useRoomIdentity(room, worldId);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(identity);
  const [notice, setNotice] = useState('');
  const fileRef = useRef(null);
  const initialsRef = useRef(null);
  const active = isActiveRoomStatus(room?.status);

  useEffect(() => { if (!open) setDraft(identity); }, [identity, open]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    requestAnimationFrame(() => initialsRef.current?.focus());
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const chooseImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setNotice('Preparing picture…');
    try {
      const image = await imageData(file);
      setDraft((current) => ({ ...current, image }));
      setNotice('Picture ready. Save to use it.');
    } catch (error) { setNotice(error?.message || 'Could not use that picture.'); }
  };

  const submit = async (event) => {
    event?.preventDefault?.();
    const result = await save(draft);
    if (!result.ok) { setNotice('This room cannot be customized yet.'); return; }
    setNotice(result.synced ? 'Room identity saved.' : 'Saved on this device. Workspace sync is unavailable.');
    setTimeout(() => setOpen(false), result.synced ? 360 : 900);
  };

  const avatarStyle = {
    width: size,
    height: size,
    '--room-avatar-color': identity.color,
    backgroundColor: identity.color,
    backgroundImage: identity.image ? `url(${identity.image})` : 'none',
  };

  return (
    <>
      <button type="button" className={`cv6-room-avatar-button${className ? ` ${className}` : ''}`} style={avatarStyle}
        aria-label={editable ? `Edit ${room?.name || 'room'} picture` : `${room?.name || 'Room'} picture`}
        title={editable ? 'Edit room picture' : room?.name} onClick={(event) => { event.stopPropagation(); if (editable) setOpen(true); }}
        data-cv6-gesture-lock="" disabled={!editable}>
        {!identity.image ? <span>{identity.initials}</span> : null}
        {active ? <i className="cv6-room-presence" aria-label="Active" title="Active" /> : null}
        {editable ? <i className="cv6-room-avatar-edit" aria-hidden="true"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg></i> : null}
      </button>

      {open ? (
        <div className="cv6-room-identity-layer" role="dialog" aria-modal="true" aria-labelledby="cv6-room-identity-title" data-swipe-guard="" data-cv6-gesture-lock="" onClick={(event) => event.stopPropagation()}>
          <button type="button" className="cv6-room-identity-scrim" aria-label="Close room picture editor" onClick={() => setOpen(false)} />
          <form className="cv6-room-identity-card" onSubmit={submit}>
            <div className="cv6-room-identity-head">
              <div>
                <span>Room picture</span>
                <h2 id="cv6-room-identity-title">Make {room?.name || 'this room'} recognizable</h2>
              </div>
              <button type="button" aria-label="Close room picture editor" onClick={() => setOpen(false)}>×</button>
            </div>
            <div className="cv6-room-identity-preview" style={{ backgroundColor: draft.color, backgroundImage: draft.image ? `url(${draft.image})` : 'none' }}>
              {!draft.image ? <span>{draft.initials}</span> : null}
            </div>
            <label className="cv6-room-identity-field">
              <span>Two initials</span>
              <input ref={initialsRef} value={draft.initials} maxLength={2} inputMode="text" autoCapitalize="characters"
                onChange={(event) => setDraft((current) => ({ ...current, initials: event.target.value.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase() }))} />
            </label>
            <fieldset className="cv6-room-identity-colors">
              <legend>Color</legend>
              <div>
                {COLORS.map((color) => (
                  <button key={color} type="button" aria-label={`Use color ${color}`} aria-pressed={draft.color === color}
                    style={{ '--swatch': color }} onClick={() => setDraft((current) => ({ ...current, color }))} />
                ))}
                <label title="Choose a custom color"><input type="color" value={draft.color} onChange={(event) => setDraft((current) => ({ ...current, color: event.target.value }))} /><span>Custom</span></label>
              </div>
            </fieldset>
            <div className="cv6-room-identity-picture">
              <input ref={fileRef} type="file" accept="image/*" onChange={chooseImage} />
              <button type="button" onClick={() => fileRef.current?.click()}>{draft.image ? 'Replace picture' : 'Add picture'}</button>
              {draft.image ? <button type="button" onClick={() => setDraft((current) => ({ ...current, image: '' }))}>Use initials</button> : null}
            </div>
            <div className="cv6-room-identity-foot">
              <span aria-live="polite">{notice || 'Changes update this room everywhere in Corner.'}</span>
              <button type="submit" disabled={saving || !draft.initials}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
