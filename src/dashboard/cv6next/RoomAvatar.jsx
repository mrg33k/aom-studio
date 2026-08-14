import { useState } from 'react';
import AvatarIdentityDialog from './AvatarIdentityDialog.jsx';
import { isActiveRoomStatus, useRoomIdentity } from './data/roomIdentity.js';

export default function RoomAvatar({ room, worldId, size = 40, editable = true, className = '' }) {
  const { identity, saving, save } = useRoomIdentity(room, worldId);
  const [open, setOpen] = useState(false);
  const active = isActiveRoomStatus(room);

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

      <AvatarIdentityDialog open={open} identity={identity} saving={saving}
        subjectName={room?.name || 'this room'} onClose={() => setOpen(false)} onSave={save} />
    </>
  );
}
