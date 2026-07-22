import { useEffect, useMemo, useState } from 'react';
import useRoomChecklists from './data/useRoomChecklists.js';
import { roomChecklistKey, roomChecklistLabel } from './data/roomKeys.js';

const Icon = ({ name, size = 16 }) => {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  if (name === 'checklist') return <svg {...common}><path d="M9 6h11M9 12h11M9 18h11"/><path d="m3 6 1.2 1.2L6.5 5M3 12l1.2 1.2L6.5 11M3 18l1.2 1.2L6.5 17"/></svg>;
  if (name === 'plus') return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
  if (name === 'chevron') return <svg {...common}><path d="m9 18 6-6-6-6"/></svg>;
  if (name === 'play') return <svg {...common} fill="currentColor" stroke="none"><path d="M8 5.8v12.4a1 1 0 0 0 1.55.83l9-6.2a1 1 0 0 0 0-1.66l-9-6.2A1 1 0 0 0 8 5.8Z"/></svg>;
  if (name === 'trash') return <svg {...common}><path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 10v7M14 10v7"/></svg>;
  if (name === 'share') return <svg {...common}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/></svg>;
  if (name === 'close') return <svg {...common}><path d="m6 6 12 12M18 6 6 18"/></svg>;
  return null;
};

const circleButton = (active = false, danger = false) => ({
  width: 34, height: 34, minWidth: 34, borderRadius: '50%', padding: 0,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  border: `1px solid ${danger ? 'rgba(229,72,77,.5)' : active ? 'var(--accent)' : 'var(--hair)'}`,
  background: danger ? 'rgba(229,72,77,.12)' : active ? 'var(--accent-weak)' : 'var(--surface-2)',
  color: danger ? 'var(--danger, #e5484d)' : active ? 'var(--accent)' : 'var(--muted)',
  cursor: 'pointer', flex: 'none',
});

function EditableItem({ item, disabled, onEdit, onToggle, onDelete, onPlay }) {
  const [text, setText] = useState(item.text || '');
  useEffect(() => { setText(item.text || ''); }, [item.text]);
  const commit = () => {
    const next = text.trim();
    if (!next) { setText(item.text || ''); return; }
    if (next !== item.text) onEdit(next);
  };
  return (
    <div data-testid="room-checklist-item" style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
      <button type="button" aria-label={item.done ? 'Reopen item' : 'Complete item'} disabled={disabled} onClick={onToggle}
        style={{ ...circleButton(item.done), width: 30, height: 30, minWidth: 30 }}>
        {item.done ? <span style={{ fontSize: 15, fontWeight: 800 }}>✓</span> : <span style={{ width: 12, height: 12, borderRadius: '50%', border: '1.5px solid currentColor' }} />}
      </button>
      <input aria-label="Checklist item" value={text} disabled={disabled} onChange={(event) => setText(event.target.value)} onBlur={commit}
        onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
        style={{ flex: 1, minWidth: 0, height: 34, border: 'none', borderBottom: '1px solid var(--hair)', background: 'transparent', color: item.done ? 'var(--faint)' : 'var(--fg)', textDecoration: item.done ? 'line-through' : 'none', outline: 'none', font: '500 13px var(--font-sans)', padding: '0 3px' }} />
      <button type="button" aria-label={`Send ${item.text} to agent`} title="Play: send this item to the agent" disabled={disabled} onClick={onPlay}
        style={{ ...circleButton(false), width: 30, height: 30, minWidth: 30, color: 'var(--accent)' }}><Icon name="play" size={13}/></button>
      <button type="button" aria-label={`Delete ${item.text}`} title="Delete item" disabled={disabled} onClick={onDelete}
        style={{ ...circleButton(false), width: 30, height: 30, minWidth: 30 }}><Icon name="trash" size={13}/></button>
    </div>
  );
}

function ChecklistList({ list, roomOptions, currentRoomKey, disabled, mutate, onPlay, onNotice }) {
  const [title, setTitle] = useState(list.title || 'New list');
  const [newItem, setNewItem] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [targetRoom, setTargetRoom] = useState('');
  const [deleteArmed, setDeleteArmed] = useState(false);
  useEffect(() => { setTitle(list.title || 'New list'); }, [list.title]);
  useEffect(() => { setShareOpen(false); setDeleteArmed(false); }, [list.id]);

  const saveTitle = () => {
    const next = title.trim();
    if (!next) { setTitle(list.title || 'New list'); return; }
    if (next !== list.title) mutate('rename-list', { list_id: list.id, title: next });
  };
  const addItem = async (event) => {
    event.preventDefault();
    const text = newItem.trim();
    if (!text) return;
    const saved = await mutate('add-item', { list_id: list.id, text });
    if (saved) setNewItem('');
  };
  const share = async (mode) => {
    if (!targetRoom) return;
    const result = await mutate('share-list', { list_id: list.id, target_room: targetRoom, mode });
    if (!result) return;
    const destination = roomOptions.find((entry) => roomChecklistKey(entry) === targetRoom);
    onNotice(`${mode === 'move' ? 'Moved' : 'Copied'} “${list.title}” to ${roomChecklistLabel(destination)}.`);
    setShareOpen(false);
    setTargetRoom('');
  };
  const openCount = (list.items || []).filter((item) => !item.done).length;

  return (
    <section data-testid="room-checklist-list" style={{ border: '1px solid var(--hair)', borderRadius: 15, background: 'var(--surface-2)', overflow: 'hidden' }}>
      <div style={{ minHeight: 46, display: 'flex', alignItems: 'center', gap: 6, padding: '5px 7px 5px 10px' }}>
        <button type="button" aria-label={list.collapsed ? `Expand ${list.title}` : `Collapse ${list.title}`} aria-expanded={!list.collapsed} disabled={disabled}
          onClick={() => mutate('toggle-list', { list_id: list.id })} style={{ ...circleButton(false), width: 30, height: 30, minWidth: 30, background: 'transparent', borderColor: 'transparent', transform: list.collapsed ? 'none' : 'rotate(90deg)', transition: 'transform .15s' }}>
          <Icon name="chevron" size={14}/>
        </button>
        <input aria-label="List title" value={title} disabled={disabled} onChange={(event) => setTitle(event.target.value)} onBlur={saveTitle}
          onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
          style={{ flex: 1, minWidth: 0, height: 34, border: 'none', background: 'transparent', color: 'var(--fg)', outline: 'none', font: '700 13px var(--font-sans)' }} />
        <span aria-label={`${openCount} open items`} style={{ font: '600 10.5px var(--font-mono)', color: 'var(--faint)', whiteSpace: 'nowrap' }}>{openCount} open</span>
        <button type="button" aria-label={`Share ${list.title}`} title="Copy or move this list" disabled={disabled} onClick={() => { setShareOpen((open) => !open); setDeleteArmed(false); }}
          style={{ ...circleButton(shareOpen), width: 30, height: 30, minWidth: 30 }}><Icon name="share" size={13}/></button>
        <button type="button" aria-label={deleteArmed ? `Confirm delete ${list.title}` : `Delete ${list.title}`} title={deleteArmed ? 'Press again to delete this list' : 'Delete list'} disabled={disabled}
          onClick={() => { if (deleteArmed) mutate('delete-list', { list_id: list.id }); else { setDeleteArmed(true); setShareOpen(false); } }}
          style={{ ...circleButton(false, deleteArmed), width: 30, height: 30, minWidth: 30 }}><Icon name="trash" size={13}/></button>
      </div>

      {shareOpen ? (
        <div data-testid="room-checklist-share" style={{ margin: '0 10px 9px', padding: 10, borderRadius: 12, border: '1px solid var(--hair)', background: 'var(--surface)', display: 'grid', gap: 8 }}>
          <label style={{ display: 'grid', gap: 5, color: 'var(--muted)', font: '600 11px var(--font-sans)' }}>
            Send this list to
            <select aria-label="Destination room" value={targetRoom} onChange={(event) => setTargetRoom(event.target.value)} disabled={disabled}
              style={{ width: '100%', height: 38, borderRadius: 10, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--fg)', padding: '0 10px', font: '500 13px var(--font-sans)', outline: 'none' }}>
              <option value="">Choose a room…</option>
              {roomOptions.filter((entry) => roomChecklistKey(entry) !== currentRoomKey).map((entry) => {
                const key = roomChecklistKey(entry);
                const kind = key.split(':')[0];
                return <option key={key} value={key}>{roomChecklistLabel(entry)} · {kind}</option>;
              })}
            </select>
          </label>
          <div style={{ color: 'var(--faint)', font: '500 11px/1.4 var(--font-sans)' }}>Copy keeps it in both rooms. Move removes it from this room after transfer.</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" disabled={disabled || !targetRoom} onClick={() => share('copy')}
              style={{ flex: 1, height: 36, borderRadius: 18, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: targetRoom ? 'var(--fg)' : 'var(--faint)', font: '700 11.5px var(--font-sans)', cursor: targetRoom ? 'pointer' : 'default' }}>Copy</button>
            <button type="button" disabled={disabled || !targetRoom} onClick={() => share('move')}
              style={{ flex: 1, height: 36, borderRadius: 18, border: '1px solid var(--accent)', background: targetRoom ? 'var(--accent)' : 'var(--surface-2)', color: targetRoom ? '#fff' : 'var(--faint)', font: '700 11.5px var(--font-sans)', cursor: targetRoom ? 'pointer' : 'default' }}>Move</button>
          </div>
        </div>
      ) : null}

      {!list.collapsed ? (
        <div style={{ padding: '3px 10px 10px', display: 'grid', gap: 7 }}>
          {(list.items || []).map((item) => (
            <EditableItem key={item.id} item={item} disabled={disabled}
              onEdit={(text) => mutate('edit-item', { list_id: list.id, item_id: item.id, text })}
              onToggle={() => mutate('toggle-item', { list_id: list.id, item_id: item.id })}
              onDelete={() => mutate('delete-item', { list_id: list.id, item_id: item.id })}
              onPlay={async () => {
                const ok = await onPlay(item.text);
                onNotice(ok === false ? 'Could not reach the agent. The item is still here.' : `Sent “${item.text}” to the agent.`);
              }} />
          ))}
          <form onSubmit={addItem} style={{ display: 'flex', gap: 7, alignItems: 'center', marginTop: 2 }}>
            <input aria-label={`Add item to ${list.title}`} value={newItem} disabled={disabled} onChange={(event) => setNewItem(event.target.value)} placeholder="Add a note or next step…"
              style={{ flex: 1, minWidth: 0, height: 36, borderRadius: 11, border: '1px solid var(--hair)', background: 'var(--surface)', color: 'var(--fg)', padding: '0 11px', outline: 'none', font: '500 13px var(--font-sans)' }} />
            <button type="submit" aria-label={`Add item to ${list.title}`} disabled={disabled || !newItem.trim()} style={{ ...circleButton(Boolean(newItem.trim())), width: 34, height: 34, minWidth: 34 }}><Icon name="plus" size={15}/></button>
          </form>
        </div>
      ) : null}
    </section>
  );
}

export default function RoomChecklistPanel({ room, worldId, roomOptions = [], onPlay, onClose }) {
  const roomKey = roomChecklistKey(room);
  const { lists, status, error, mutate } = useRoomChecklists(worldId, roomKey);
  const [newListOpen, setNewListOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => { setNewListOpen(false); setNewTitle(''); setNotice(''); }, [roomKey]);
  useEffect(() => {
    if (!notice) return undefined;
    const timeout = setTimeout(() => setNotice(''), 4200);
    return () => clearTimeout(timeout);
  }, [notice]);

  const options = useMemo(() => {
    const seen = new Set();
    return [room, ...(roomOptions || [])].filter((entry) => {
      const key = roomChecklistKey(entry);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [room, roomOptions]);
  const disabled = status === 'saving';
  const createList = async (event) => {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    const saved = await mutate('create-list', { title });
    if (saved) { setNewTitle(''); setNewListOpen(false); }
  };

  return (
    <div data-testid="room-checklist-panel" style={{ display: 'grid', gap: 9, maxHeight: 'min(52dvh, 470px)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '1px 2px' }}>
        <span style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--accent-weak)', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Icon name="checklist"/></span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', color: 'var(--fg)', font: '700 13px var(--font-sans)' }}>Room lists</span>
          <span style={{ display: 'block', color: 'var(--faint)', font: '500 10.5px var(--font-sans)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{roomChecklistLabel(room)} · private until you press Play</span>
        </span>
        <button type="button" aria-label="Create a new list" title="New list" onClick={() => setNewListOpen((open) => !open)} style={circleButton(newListOpen)}><Icon name="plus"/></button>
        <button type="button" aria-label="Close checklist mode" title="Back to chat" onClick={onClose} style={circleButton(false)}><Icon name="close"/></button>
      </div>

      {newListOpen ? (
        <form onSubmit={createList} style={{ display: 'flex', gap: 7 }}>
          <input autoFocus aria-label="New list title" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="List title…"
            style={{ flex: 1, minWidth: 0, height: 38, borderRadius: 12, border: '1px solid var(--accent)', background: 'var(--surface-2)', color: 'var(--fg)', padding: '0 12px', outline: 'none', font: '600 13px var(--font-sans)' }} />
          <button type="submit" disabled={disabled || !newTitle.trim()} style={{ height: 38, padding: '0 14px', borderRadius: 19, border: 'none', background: newTitle.trim() ? 'var(--accent)' : 'var(--surface-2)', color: newTitle.trim() ? '#fff' : 'var(--faint)', font: '700 11.5px var(--font-sans)' }}>Create</button>
        </form>
      ) : null}

      <div style={{ minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', display: 'grid', gap: 8, paddingRight: 1 }}>
        {status === 'loading' ? <div style={{ padding: '18px 8px', textAlign: 'center', color: 'var(--faint)', font: '500 12px var(--font-sans)' }}>Opening your room lists…</div> : null}
        {status !== 'loading' && !lists.length ? (
          <button type="button" onClick={() => setNewListOpen(true)} style={{ minHeight: 84, borderRadius: 15, border: '1px dashed var(--hair)', background: 'var(--surface-2)', color: 'var(--muted)', padding: 14, cursor: 'pointer', font: '600 12.5px/1.5 var(--font-sans)' }}>
            Start a list for notes, reminders, or work you may send later.
          </button>
        ) : null}
        {lists.map((list) => <ChecklistList key={list.id} list={list} roomOptions={options} currentRoomKey={roomKey} disabled={disabled} mutate={mutate} onPlay={onPlay} onNotice={setNotice} />)}
      </div>
      {(error || notice || disabled) ? (
        <div aria-live="polite" style={{ color: error ? 'var(--danger, #e5484d)' : notice ? 'var(--accent)' : 'var(--faint)', font: '600 10.5px var(--font-sans)', padding: '0 3px' }}>
          {error || notice || 'Saving…'}
        </div>
      ) : null}
    </div>
  );
}
