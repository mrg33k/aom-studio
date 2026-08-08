import { useEffect, useId, useRef, useState } from 'react';

export const AVATAR_COLORS = ['#2563EB', '#7C3AED', '#0F766E', '#B45309', '#BE185D', '#047857', '#C2410C', '#4F46E5'];

export function prepareAvatarImage(file) {
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

export default function AvatarIdentityDialog({
  open,
  identity,
  saving = false,
  subjectName = 'this room',
  eyebrow = 'Room picture',
  title = `Make ${subjectName} recognizable`,
  idleMessage = 'Changes update this room everywhere in Corner.',
  successMessage = 'Room identity saved.',
  localSuccessMessage = 'Saved on this device. Workspace sync is unavailable.',
  failureMessage = 'This identity cannot be customized yet.',
  onClose,
  onSave,
  testId,
}) {
  const titleId = useId();
  const [draft, setDraft] = useState(identity);
  const [notice, setNotice] = useState('');
  const fileRef = useRef(null);
  const initialsRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setDraft(identity);
      setNotice('');
    }
  }, [identity, open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose?.(); }
    };
    window.addEventListener('keydown', onKey);
    requestAnimationFrame(() => initialsRef.current?.focus());
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const chooseImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setNotice('Preparing picture…');
    try {
      const image = await prepareAvatarImage(file);
      setDraft((current) => ({ ...current, image }));
      setNotice('Picture ready. Save to use it.');
    } catch (error) {
      setNotice(error?.message || 'Could not use that picture.');
    }
  };

  const submit = async (event) => {
    event?.preventDefault?.();
    try {
      const result = await onSave?.(draft);
      if (!result?.ok) { setNotice(result?.error || failureMessage); return; }
      setNotice(result.synced === false ? localSuccessMessage : successMessage);
      setTimeout(() => onClose?.(), result.synced === false ? 900 : 360);
    } catch (error) {
      setNotice(error?.message || failureMessage);
    }
  };

  return (
    <div className="cv6-room-identity-layer" role="dialog" aria-modal="true" aria-labelledby={titleId}
      data-testid={testId} data-avatar-editor={eyebrow === 'Your profile' ? 'profile' : 'room'} data-swipe-guard="" data-cv6-gesture-lock=""
      onClick={(event) => event.stopPropagation()}>
      <button type="button" className="cv6-room-identity-scrim" aria-label="Close picture editor" onClick={() => onClose?.()} />
      <form className="cv6-room-identity-card" onSubmit={submit}>
        <div className="cv6-room-identity-head">
          <div>
            <span>{eyebrow}</span>
            <h2 id={titleId}>{title}</h2>
          </div>
          <button type="button" aria-label="Close picture editor" onClick={() => onClose?.()}>×</button>
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
            {AVATAR_COLORS.map((color) => (
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
          <span aria-live="polite">{notice || idleMessage}</span>
          <button type="submit" disabled={saving || !draft.initials}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}
