import React, { useEffect, useMemo, useState } from 'react';
import { authFetch } from '../lib/authFetch';
import { MODEL_OPTIONS, VOICE_OPTIONS } from '../components/cv3/chat/chatConstants.js';
import { titleForAgent } from './data/agentTitles.js';
import { chatWindowUrl } from './data/chatWindowRoute.js';
import RoomAvatar from './RoomAvatar.jsx';

const TABS = [
  { id: 'general', label: 'General' },
  { id: 'access', label: 'Access' },
  { id: 'history', label: 'History' },
  { id: 'specialist', label: 'Specialist' },
];

function bareMission(room) {
  return String(room?.missionSlug || room?.id || '').split(':').pop();
}

function preferenceKey(room) {
  if (!room?.isProject && !room?.isMission) return room?.id || '';
  return `project:${room?.projectSlug || room?.id || ''}`;
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const input = document.createElement('textarea');
  input.value = value;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  input.remove();
}

function SectionIntro({ title, children }) {
  return (
    <div className="room-settings-intro">
      <div className="room-settings-section-title">{title}</div>
      <div className="room-settings-section-copy">{children}</div>
    </div>
  );
}

function SettingRow({ icon, title, copy, action }) {
  return (
    <div className="room-setting-row">
      <span className="room-setting-icon" aria-hidden="true">{icon}</span>
      <span className="room-setting-copy"><strong>{title}</strong><small>{copy}</small></span>
      {action}
    </div>
  );
}

function SettingIcon({ type }) {
  const common = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (type === 'files') return <svg {...common}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></svg>;
  if (type === 'window') return <svg {...common}><rect x="4" y="8" width="12" height="11" rx="2" /><path d="M9 5h9a2 2 0 0 1 2 2v8" /><path d="m13 11 3-3m0 0v3m0-3h-3" /></svg>;
  if (type === 'link') return <svg {...common}><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" /><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1" /></svg>;
  return <svg {...common}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></svg>;
}

export default function RoomSettingsDialog({
  room,
  worldId,
  projectId,
  following: followingProp,
  onToggleFollowing,
  onClose,
  onRenamed,
  onOpenFiles,
  archivedMessages = [],
  onClearRoom,
}) {
  const [tab, setTab] = useState('general');
  const [title, setTitle] = useState(room?.name || '');
  const [nameState, setNameState] = useState({ busy: false, error: '', saved: false });
  const [localFollowing, setLocalFollowing] = useState(() => {
    try {
      const muted = JSON.parse(localStorage.getItem('cv6.mutedRooms') || '{}');
      return !muted[room?.id || room?.missionSlug || room?.name || ''];
    } catch { return true; }
  });
  const following = followingProp ?? localFollowing;
  const [shareState, setShareState] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteState, setInviteState] = useState({ busy: false, message: '', error: false });
  const [collaborators, setCollaborators] = useState([]);
  const [collaboratorsLoading, setCollaboratorsLoading] = useState(false);
  const [prefs, setPrefs] = useState({ model: 'default', voice: 'kore', loading: true, saving: '' });
  const [clearState, setClearState] = useState({ confirm: false, busy: false, error: '', done: false });
  const isAgent = !room?.isProject && !room?.isMission;
  const prefKey = preferenceKey(room);
  const roomUrl = useMemo(() => {
    try { return chatWindowUrl(room, window.location.href); } catch { return ''; }
  }, [room]);

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (tab !== 'access' || !projectId) return undefined;
    let alive = true;
    setCollaboratorsLoading(true);
    authFetch(`/api/dashboard/project-invite?project_id=${encodeURIComponent(projectId)}`)
      .then((response) => response.json().then((data) => ({ response, data })))
      .then(({ response, data }) => {
        if (!alive) return;
        if (!response.ok) throw new Error(data?.error || 'Could not load room access.');
        setCollaborators(Array.isArray(data?.collaborators) ? data.collaborators : []);
      })
      .catch((error) => { if (alive) setInviteState({ busy: false, message: error?.message || 'Could not load room access.', error: true }); })
      .finally(() => { if (alive) setCollaboratorsLoading(false); });
    return () => { alive = false; };
  }, [tab, projectId]);

  useEffect(() => {
    if (!prefKey || tab !== 'specialist') return undefined;
    let alive = true;
    setPrefs((prev) => ({ ...prev, loading: true }));
    Promise.all([
      authFetch(`/api/dashboard/agent-model?client=${encodeURIComponent(worldId)}`).then((r) => r.ok ? r.json() : { models: {} }),
      authFetch(`/api/dashboard/agent-voice?client=${encodeURIComponent(worldId)}`).then((r) => r.ok ? r.json() : { voices: {} }),
    ]).then(([modelsData, voicesData]) => {
      if (!alive) return;
      setPrefs({ model: modelsData?.models?.[prefKey] || 'default', voice: voicesData?.voices?.[prefKey] || 'kore', loading: false, saving: '' });
    }).catch(() => { if (alive) setPrefs((prev) => ({ ...prev, loading: false })); });
    return () => { alive = false; };
  }, [tab, prefKey, worldId]);

  const saveName = async (event) => {
    event?.preventDefault?.();
    const next = title.replace(/\s+/g, ' ').trim();
    if (!next) { setNameState({ busy: false, error: 'Give the room a name.', saved: false }); return; }
    if (next.length > 80) { setNameState({ busy: false, error: 'Keep the name to 80 characters or fewer.', saved: false }); return; }
    setNameState({ busy: true, error: '', saved: false });
    try {
      let url = '/api/dashboard/room-title';
      let body = { client_id: worldId, agent: room.id, title: next };
      if (room.isProject && !room.isMission) {
        url = '/api/dashboard/project-update';
        body = { client_id: worldId, slug: room.id, name: next };
      } else if (room.isMission) {
        url = '/api/dashboard/mission-update';
        body = { client_id: worldId, project_slug: room.projectSlug, mission_slug: bareMission(room), name: next, path: room.path || undefined };
      }
      const response = await authFetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) throw new Error(data?.error || 'Could not rename this room.');
      onRenamed?.(next, { reset: false });
      setNameState({ busy: false, error: '', saved: true });
    } catch (error) {
      setNameState({ busy: false, error: error?.message || 'Could not rename this room.', saved: false });
    }
  };

  const resetName = async () => {
    setNameState({ busy: true, error: '', saved: false });
    try {
      const response = await authFetch('/api/dashboard/room-title', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: worldId, agent: room.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) throw new Error(data?.error || 'Could not reset this name.');
      const next = room.specialistTitle || titleForAgent(room.id);
      setTitle(next);
      onRenamed?.(next, { reset: true });
      setNameState({ busy: false, error: '', saved: true });
    } catch (error) {
      setNameState({ busy: false, error: error?.message || 'Could not reset this name.', saved: false });
    }
  };

  const toggleFollowing = () => {
    if (onToggleFollowing) { onToggleFollowing(); return; }
    setLocalFollowing((prev) => {
      const next = !prev;
      try {
        const key = room?.id || room?.missionSlug || room?.name || '';
        const muted = JSON.parse(localStorage.getItem('cv6.mutedRooms') || '{}');
        if (next) delete muted[key]; else muted[key] = 1;
        localStorage.setItem('cv6.mutedRooms', JSON.stringify(muted));
      } catch { /* in-memory state still changes */ }
      return next;
    });
  };

  const [archiveState, setArchiveState] = useState({ busy: false, error: '' });
  const archiveRoom = async () => {
    if (!confirm(`Archive "${room?.name || room?.id}"? It will be hidden from the room list and can be restored.`)) return;
    setArchiveState({ busy: true, error: '' });
    try {
      const isProj = room.isProject && !room.isMission;
      const isMission = !!room.isMission;
      let url = '/api/dashboard/project-update';
      let body = { client_id: worldId, slug: room.id, is_active: false };
      if (isMission) {
        url = '/api/dashboard/mission-update';
        body = { client_id: worldId, project_slug: room.projectSlug, mission_slug: bareMission(room), is_active: false };
      } else if (!isProj && !isMission) {
        // agent rooms: hide via room-title hidden flag
        url = '/api/dashboard/room-title';
        body = { client_id: worldId, agent: room.id, hidden: true };
      }
      const r = await authFetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.ok === false) throw new Error(d?.error || 'Could not archive');
      setArchiveState({ busy: false, error: '' });
      onClose?.();
      // remove stale card from recentMap-driven lists immediately
      try { localStorage.setItem('cv6.archivedAt.' + (room.id || room.missionSlug || ''), Date.now().toString()); } catch {}
      window.dispatchEvent(new CustomEvent('cv6:room-archived', { detail: { roomId: room.id || room.missionSlug } }));
    } catch (e) {
      setArchiveState({ busy: false, error: e?.message || 'Archive failed' });
    }
  };

  const copyRoomLink = async () => {
    try {
      await copyText(roomUrl);
      setShareState('Room link copied');
      setTimeout(() => setShareState(''), 1800);
    } catch { setShareState('Could not copy the link'); }
  };

  const invite = async (event) => {
    event?.preventDefault?.();
    const email = inviteEmail.trim();
    if (!email || !projectId) return;
    setInviteState({ busy: true, message: '', error: false });
    try {
      const response = await authFetch('/api/dashboard/project-invite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) throw new Error(data?.error || 'Could not invite that person.');
      const person = data?.invited?.display_name || data?.invited?.email || email;
      setInviteEmail('');
      setCollaborators((prev) => [...prev, { id: `${data?.invited?.world || email}`, email: data?.invited?.email || email, display_name: data?.invited?.display_name || '', role: 'member' }]);
      setInviteState({ busy: false, message: `${person} now has access.`, error: false });
    } catch (error) {
      setInviteState({ busy: false, message: error?.message || 'Could not invite that person.', error: true });
    }
  };

  const savePreference = async (kind, value) => {
    const previous = prefs[kind];
    setPrefs((prev) => ({ ...prev, [kind]: value, saving: kind }));
    try {
      const endpoint = kind === 'model' ? 'agent-model' : 'agent-voice';
      const response = await authFetch(`/api/dashboard/${endpoint}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: prefKey, [kind]: value, client_id: worldId }),
      });
      if (!response.ok) throw new Error('Preference save failed');
      setPrefs((prev) => ({ ...prev, saving: '' }));
      if (kind === 'model') window.dispatchEvent(new Event('aom-model-pref-changed'));
    } catch {
      setPrefs((prev) => ({ ...prev, [kind]: previous, saving: '' }));
    }
  };

  const roomKind = room?.isMission ? 'Mission room' : room?.isProject ? 'Project room' : `${room?.specialistTitle || titleForAgent(room?.id)} specialist`;

  const clearRoom = async () => {
    if (!clearState.confirm) { setClearState({ confirm: true, busy: false, error: '', done: false }); return; }
    setClearState({ confirm: true, busy: true, error: '', done: false });
    const ok = await onClearRoom?.();
    if (!ok) { setClearState({ confirm: false, busy: false, error: 'Could not clear this room. Nothing was removed.', done: false }); return; }
    setClearState({ confirm: false, busy: false, error: '', done: true });
    setTab('history');
  };

  return (
    <div className="room-settings-layer" role="dialog" aria-modal="true" aria-labelledby="room-settings-title" data-testid="room-settings-dialog">
      <button type="button" className="room-settings-scrim" aria-label="Close room settings" onClick={onClose} />
      <section className="room-settings-panel">
        <header className="room-settings-header">
          <RoomAvatar room={room} worldId={worldId} size={48} editable={false} className="room-settings-avatar" />
          <div className="room-settings-heading">
            <div className="room-settings-kicker">Room settings</div>
            <h2 id="room-settings-title">{room?.name}</h2>
            <p>{roomKind}</p>
          </div>
          <button type="button" className="room-settings-close" aria-label="Close room settings" onClick={onClose}>×</button>
        </header>

        <nav className="room-settings-tabs" aria-label="Room settings sections">
          {TABS.map((item) => <button type="button" key={item.id} data-testid={`room-settings-tab-${item.id}`} aria-current={tab === item.id ? 'page' : undefined} onClick={() => setTab(item.id)}>{item.label}</button>)}
        </nav>

        <div className="room-settings-body">
          {tab === 'general' ? (
            <>
              <SectionIntro title="Room identity">Change what this room is called without changing its history or specialist.</SectionIntro>
              <form className="room-settings-card" onSubmit={saveName}>
                <label htmlFor="room-settings-name">Room name</label>
                <div className="room-settings-name-row">
                  <input id="room-settings-name" aria-label="Chat name" value={title} maxLength={80} disabled={nameState.busy} onChange={(event) => { setTitle(event.target.value); setNameState((prev) => ({ ...prev, saved: false, error: '' })); }} />
                  <button type="submit" className="room-settings-primary" disabled={nameState.busy || title.trim() === room?.name}>{nameState.busy ? 'Saving…' : 'Save'}</button>
                </div>
                <div className="room-settings-form-foot">
                  <span className={nameState.error ? 'is-error' : nameState.saved ? 'is-saved' : ''}>{nameState.error || (nameState.saved ? 'Name saved' : 'Up to 80 characters')}</span>
                  {isAgent && room?.hasCustomTitle ? <button type="button" onClick={resetName} disabled={nameState.busy}>Reset to specialist</button> : null}
                </div>
              </form>

              <SectionIntro title="Room behavior">Keep the controls that change this room together.</SectionIntro>
              <div className="room-settings-card room-settings-stack">
                <SettingRow icon={<SettingIcon type="updates" />} title={following ? 'Following this room' : 'Updates muted'} copy={following ? 'Activity can surface on Home.' : 'The room stays available without update nudges.'} action={<button type="button" role="switch" aria-checked={following} className={`room-settings-switch${following ? ' is-on' : ''}`} onClick={toggleFollowing}><span /></button>} />
                {onOpenFiles ? <SettingRow icon={<SettingIcon type="files" />} title="Room files" copy="Everything sent by you and the specialist." action={<button type="button" className="room-settings-link" onClick={() => { onClose?.(); onOpenFiles?.(); }}>Open</button>} /> : null}
                <SettingRow icon={<SettingIcon type="window" />} title="Archive this room" copy="Hides it from the room list. Files and history stay." action={<button type="button" className="room-settings-danger" onClick={archiveRoom} disabled={archiveState.busy}>{archiveState.busy ? 'Archiving…' : 'Archive'}</button>} />
                {archiveState.error ? <div className="room-settings-note is-error">{archiveState.error}</div> : null}
              </div>
            </>
          ) : null}

          {tab === 'access' ? (
            <>
              <SectionIntro title="Invite and share">Room links require sign-in. Project access is granted to the selected person’s Corner account.</SectionIntro>
              <div className="room-settings-card room-settings-stack">
                <SettingRow icon={<SettingIcon type="link" />} title="Copy room link" copy="Send a direct link to this exact conversation." action={<button type="button" className="room-settings-link" onClick={copyRoomLink}>{shareState || 'Copy'}</button>} />
              </div>

              {room?.isProject || room?.isMission ? (
                <>
                  <SectionIntro title="Project collaborators">Mission access follows its parent project so the work stays synchronized.</SectionIntro>
                  <div className="room-settings-card">
                    {projectId ? (
                      <form className="room-settings-invite" onSubmit={invite}>
                        <input type="email" aria-label="Invite by email" placeholder="teammate@company.com" value={inviteEmail} onChange={(event) => { setInviteEmail(event.target.value); setInviteState({ busy: false, message: '', error: false }); }} />
                        <button type="submit" className="room-settings-primary" disabled={inviteState.busy || !inviteEmail.trim()}>{inviteState.busy ? 'Inviting…' : 'Invite'}</button>
                      </form>
                    ) : <div className="room-settings-note">Project access is still resolving. The room link is ready to copy now.</div>}
                    {inviteState.message ? <div className={`room-settings-note${inviteState.error ? ' is-error' : ' is-saved'}`}>{inviteState.message}</div> : null}
                    <div className="room-settings-people">
                      {collaboratorsLoading ? <div className="room-settings-note">Loading collaborators…</div> : collaborators.map((person) => (
                        <div className="room-settings-person" key={person.id || person.client_id || person.email}>
                          <span>{String(person.display_name || person.email || person.client_id || '?').slice(0, 1).toUpperCase()}</span>
                          <div><strong>{person.display_name || person.client_id || person.email}</strong>{person.email && person.display_name ? <small>{person.email}</small> : null}</div>
                          <em>{person.role || 'member'}</em>
                        </div>
                      ))}
                      {!collaboratorsLoading && !collaborators.length ? <div className="room-settings-note">No collaborators yet.</div> : null}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <SectionIntro title="Workspace access">Direct specialist rooms are shared with signed-in members of this Corner workspace.</SectionIntro>
                  <div className="room-settings-card">
                    <div className="room-settings-note">Add a new workspace member first, then send them the room link above.</div>
                  </div>
                </>
              )}
            </>
          ) : null}

          {tab === 'history' ? (
            <>
              <SectionIntro title="Archived room history">Clear starts a fresh screen and agent session. Earlier messages stay here and the room keeps its project memories and files.</SectionIntro>
              <div className="room-settings-card room-settings-stack">
                {archivedMessages.length ? archivedMessages.slice().reverse().map((message) => (
                  <div className="room-history-message" key={message.id || `${message.ts}-${message.text}`}>
                    <div><strong>{message.agentName || (message.isUser ? 'You' : 'Specialist')}</strong><span>{message.time || ''}</span></div>
                    <p>{message.text || 'Attachment or structured result'}</p>
                  </div>
                )) : <div className="room-settings-note">No archived sessions yet. Clearing the room will move the current conversation here.</div>}
              </div>
              {onClearRoom ? (
                <div className="room-settings-card room-clear-card">
                  <div><strong>{clearState.confirm ? 'Clear the current screen?' : 'Start a fresh room session'}</strong><p>{clearState.confirm ? 'Messages will move to History and the agent will receive a scoped reset. Files and memories are kept.' : 'Useful when the current thread is finished but this room should remain.'}</p></div>
                  <button type="button" className="room-settings-danger" onClick={clearRoom} disabled={clearState.busy}>{clearState.busy ? 'Clearing…' : clearState.confirm ? 'Confirm clear' : 'Clear chat'}</button>
                  {clearState.confirm ? <button type="button" className="room-settings-link" onClick={() => setClearState({ confirm: false, busy: false, error: '', done: false })}>Cancel</button> : null}
                  {clearState.error ? <div className="room-settings-note is-error">{clearState.error}</div> : null}
                  {clearState.done ? <div className="room-settings-note is-saved">Room cleared. The previous session is archived above.</div> : null}
                </div>
              ) : null}
            </>
          ) : null}

          {tab === 'specialist' ? (
            <>
              <SectionIntro title="Specialist behavior">These are the working preferences restored from CV4. Changes persist for this {room?.isMission ? 'project and its missions' : 'room'}.</SectionIntro>
              <div className="room-settings-card">
                <label htmlFor="room-settings-model">Model</label>
                <select id="room-settings-model" value={prefs.model} disabled={prefs.loading || prefs.saving === 'model'} onChange={(event) => savePreference('model', event.target.value)}>
 {MODEL_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}, {option.desc}</option>)}
                </select>
                <label htmlFor="room-settings-voice">Voice</label>
                <select id="room-settings-voice" value={prefs.voice} disabled={prefs.loading || prefs.saving === 'voice'} onChange={(event) => savePreference('voice', event.target.value)}>
 {VOICE_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}, {option.desc}</option>)}
                </select>
                <div className="room-settings-note">{prefs.loading ? 'Loading room preferences…' : prefs.saving ? 'Saving preference…' : 'Preferences are saved automatically.'}</div>
              </div>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}