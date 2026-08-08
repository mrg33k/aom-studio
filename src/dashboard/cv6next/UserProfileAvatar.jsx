import { useEffect, useState } from 'react';
import AvatarIdentityDialog from './AvatarIdentityDialog.jsx';

export default function UserProfileAvatar({ profile, onSave, size = 56 }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [identity, setIdentity] = useState(() => ({
    initials: profile?.initials || '·',
    color: profile?.color || '#2563EB',
    image: profile?.image || '',
  }));

  useEffect(() => {
    if (open) return;
    setIdentity({
      initials: profile?.initials || '·',
      color: profile?.color || '#2563EB',
      image: profile?.image || '',
    });
  }, [open, profile?.color, profile?.image, profile?.initials]);

  const save = async (draft) => {
    setSaving(true);
    try {
      const result = await onSave?.(draft);
      if (result?.ok) setIdentity(result.identity || draft);
      return result || { ok: false };
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button type="button" className="cv6-room-avatar-button cv6-user-profile-avatar" style={{
        width: size,
        height: size,
        '--room-avatar-color': identity.color,
        backgroundColor: identity.color,
        backgroundImage: identity.image ? `url(${identity.image})` : 'none',
      }} aria-label="Edit your profile picture" title="Edit your profile picture"
        onClick={() => setOpen(true)} data-cv6-gesture-lock="">
        {!identity.image ? <span>{identity.initials}</span> : null}
        <i className="cv6-room-avatar-edit" aria-hidden="true"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg></i>
      </button>
      <AvatarIdentityDialog open={open} identity={identity} saving={saving}
        subjectName="your profile" eyebrow="Your profile" title="Make your profile recognizable"
        idleMessage="Your picture, initials, and color follow your signed-in account."
        successMessage="Profile identity saved." failureMessage="Your profile could not be updated."
        onClose={() => setOpen(false)} onSave={save} testId="profile-avatar-editor" />
    </>
  );
}
