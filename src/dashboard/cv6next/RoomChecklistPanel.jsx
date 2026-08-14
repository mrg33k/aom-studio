import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  width: 42, height: 42, minWidth: 42, minHeight: 42, maxWidth: 42, maxHeight: 42,
  aspectRatio: '1 / 1', borderRadius: '50%', padding: 0, boxSizing: 'border-box', lineHeight: 1,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  border: `1px solid ${danger ? 'rgba(229,72,77,.5)' : active ? 'var(--accent)' : 'var(--hair)'}`,
  background: danger ? 'rgba(229,72,77,.16)' : active ? 'var(--accent-weak)' : 'var(--composer-control-solid, var(--surface-2))',
  color: danger ? 'var(--danger, #e5484d)' : active ? 'var(--accent)' : 'var(--muted)',
  cursor: 'pointer', flex: '0 0 auto',
});

function EditableItem({ item, disabled, onEdit, onToggle, onDelete, onPlay, registerInput, onEnter }) {
  const [text, setText] = useState(item.text || '');
  useEffect(() => { setText(item.text || ''); }, [item.text]);
  const commit = () => {
    const next = text.trim();
    if (!next) { setText(item.text || ''); return; }
    if (next !== item.text) onEdit(next);
  };
  return (
    <div data-testid="room-checklist-item" style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0, minHeight: 42 }}>
      <button type="button" aria-label={item.done ? 'Reopen item' : 'Complete item'} disabled={disabled} onClick={onToggle}
        style={{ ...circleButton(item.done), width: 38, height: 38, minWidth: 38, minHeight: 38, maxWidth: 38, maxHeight: 38 }}>
        {item.done ? <span style={{ fontSize: 16, fontWeight: 800 }}>✓</span> : <span style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid currentColor' }} />}
      </button>
      {/* Enter walks DOWN the list (Patrik 2026-08-06): it used to blur, which saved the
          line but dumped you out of the list, so adding five items meant five clicks.
 Now it hands focus to the next item, and past the last one, to the "add item"
          field — so a list can be typed straight through. The save is unchanged: moving
          focus fires the same onBlur commit that blur() did. */}
      <input ref={registerInput} aria-label="Checklist item" aria-keyshortcuts="Enter Control+Enter Meta+Enter Escape" value={text} disabled={disabled} onChange={(event) => setText(event.target.value)} onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); commit(); onPlay?.(text.trim() || item.text); return; }
          if (event.key === 'Enter') { event.preventDefault(); onEnter?.(); return; }
          if (event.key === 'Escape') { event.preventDefault(); setText(item.text || ''); event.currentTarget.blur(); }
        }}
        style={{ flex: 1, minWidth: 0, height: 40, border: 'none', borderBottom: '1px solid var(--hair)', background: 'transparent', color: item.done ? 'var(--faint)' : 'var(--fg)', textDecoration: item.done ? 'line-through' : 'none', outline: 'none', font: '500 13.5px var(--font-sans)', padding: '0 4px' }} />
      <button type="button" aria-label={`Send ${item.text} to agent`} title="Play: send this item to the agent" disabled={disabled} onClick={() => onPlay?.(text.trim() || item.text)}
        style={{ ...circleButton(false), width: 38, height: 38, minWidth: 38, minHeight: 38, maxWidth: 38, maxHeight: 38, color: 'var(--accent)' }}><Icon name="play" size={14}/></button>
      <button type="button" aria-label={`Delete ${item.text}`} title="Delete item" disabled={disabled} onClick={onDelete}
        style={{ ...circleButton(false), width: 38, height: 38, minWidth: 38, minHeight: 38, maxWidth: 38, maxHeight: 38 }}><Icon name="trash" size={14}/></button>
    </div>
  );
}

function ChecklistList({ list, roomOptions, currentRoomKey, disabled, mutate, onPlay, onPlayList, onNotice }) {
  const [title, setTitle] = useState(list.title || 'New list');
  const [newItem, setNewItem] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [targetRoom, setTargetRoom] = useState('');
  const [deleteArmed, setDeleteArmed] = useState(false);
  useEffect(() => { setTitle(list.title || 'New list'); }, [list.title]);
  useEffect(() => { setShareOpen(false); setDeleteArmed(false); }, [list.id]);
  useEffect(() => {
    if (!deleteArmed) return undefined;
    const timeout = setTimeout(() => setDeleteArmed(false), 4200);
    return () => clearTimeout(timeout);
  }, [deleteArmed]);
  // Enter-walks-down (Patrik 2026-08-06). Keyed by item id, not index: items get
  // deleted and re-ordered while the panel is open, and a positional array hands
  // back a stale node after a delete — focus would land on the wrong line.
  const itemInputs = useRef(new Map());
  const addInputRef = useRef(null);
  const registerItemInput = useCallback((id) => (el) => {
    if (el) itemInputs.current.set(id, el); else itemInputs.current.delete(id);
  }, []);
  const focusAfter = useCallback((id) => {
    const items = list.items || [];
    const index = items.findIndex((entry) => entry.id === id);
    const next = index >= 0 ? items[index + 1] : null;
    const el = next ? itemInputs.current.get(next.id) : null;
    // Past the last item, the "add item" field is the next line — so typing a list
    // straight through never needs the mouse.
    const target = el || addInputRef.current;
    if (!target) return;
    target.focus();
    // Caret at the end, not a full select: Enter here means "carry on", and a
    // selected line means the next keystroke wipes an item the user meant to keep.
    const end = target.value ? target.value.length : 0;
    if (typeof target.setSelectionRange === 'function') target.setSelectionRange(end, end);
  }, [list.items]);
  // Returns false when there is nowhere to go — a COLLAPSED list mounts no item
  // inputs, and silently swallowing Enter there would leave the retitle unsaved.
  const focusFirstItem = useCallback(() => {
    const first = (list.items || [])[0];
    const el = first ? itemInputs.current.get(first.id) : null;
    const target = el || addInputRef.current;
    if (!target) return false;
    target.focus();
    return true;
  }, [list.items]);

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
    // Stay in the add field after a save so Enter keeps adding lines. The re-render
    // that lands the new item can steal focus on slower saves, so put it back.
    if (saved) { setNewItem(''); addInputRef.current?.focus(); }
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
  const totalCount = (list.items || []).length;
  const doneCount = totalCount - openCount;
  const progress = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <section className="cv6-checklist-list" data-testid="room-checklist-list" aria-label={`${list.title}, ${doneCount} of ${totalCount} complete`} style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', border: '1px solid var(--hair)', borderRadius: 18, background: 'var(--composer-card-solid, #202026)', overflow: 'hidden', boxShadow: '0 10px 26px -22px rgba(0,0,0,.9)' }}>
      <div className="cv6-checklist-heading" data-role="checklist-heading" style={{ minWidth: 0, minHeight: 60, display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px 9px 12px', boxSizing: 'border-box' }}>
        <button type="button" aria-label={list.collapsed ? `Expand ${list.title}` : `Collapse ${list.title}`} aria-expanded={!list.collapsed} disabled={disabled}
          onClick={() => mutate('toggle-list', { list_id: list.id })} style={{ ...circleButton(false), width: 36, height: 36, minWidth: 36, minHeight: 36, maxWidth: 36, maxHeight: 36, background: 'transparent', borderColor: 'transparent', transform: list.collapsed ? 'none' : 'rotate(90deg)', transition: 'transform .15s' }}>
          <Icon name="chevron" size={15}/>
        </button>
        {/* Same gesture from the title: Enter drops into the first item (or the add
            field on an empty list), so a new list is one continuous typing run. */}
        <input aria-label="List title" value={title} disabled={disabled} onChange={(event) => setTitle(event.target.value)} onBlur={saveTitle}
          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); if (!focusFirstItem()) event.currentTarget.blur(); } }}
          style={{ flex: '1 1 auto', minWidth: 0, height: 40, border: 'none', background: 'transparent', color: 'var(--fg)', outline: 'none', font: '700 14px var(--font-sans)', textOverflow: 'ellipsis' }} />
        <span aria-label={`${doneCount} of ${totalCount} items complete`} style={{ flex: 'none', font: '600 10.5px var(--font-mono)', color: doneCount && doneCount === totalCount ? 'var(--success)' : 'var(--faint)', whiteSpace: 'nowrap' }}>{doneCount}/{totalCount}</span>
        <button type="button" aria-label={`Send ${list.title} to agent`} title={openCount ? 'Play: send the whole list to the agent' : 'Nothing open to send'} disabled={disabled || !openCount}
          onClick={async () => {
            const ok = await onPlayList(list);
            onNotice(ok === false ? 'Could not reach the agent. The list is still here.' : `Sent “${list.title}” to the agent.`);
          }}
          style={{ ...circleButton(false), width: 38, height: 38, minWidth: 38, minHeight: 38, maxWidth: 38, maxHeight: 38, color: openCount ? 'var(--accent)' : 'var(--faint)', cursor: openCount && !disabled ? 'pointer' : 'not-allowed' }}><Icon name="play" size={15}/></button>
        <button type="button" aria-label={`Share ${list.title}`} title="Copy or move this list" disabled={disabled} onClick={() => { setShareOpen((open) => !open); setDeleteArmed(false); }}
          style={{ ...circleButton(shareOpen), width: 38, height: 38, minWidth: 38, minHeight: 38, maxWidth: 38, maxHeight: 38 }}><Icon name="share" size={15}/></button>
        <button type="button" aria-label={deleteArmed ? `Confirm delete ${list.title}` : `Delete ${list.title}`} title={deleteArmed ? 'Press again to delete this list' : 'Delete list'} disabled={disabled}
          onClick={() => { if (deleteArmed) mutate('delete-list', { list_id: list.id }); else { setDeleteArmed(true); setShareOpen(false); } }}
          style={{ ...circleButton(false, deleteArmed), width: 38, height: 38, minWidth: 38, minHeight: 38, maxWidth: 38, maxHeight: 38 }}><Icon name="trash" size={15}/></button>
      </div>

      <div className="cv6-checklist-progress" role="progressbar" aria-label={`${list.title} progress`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}>
        <span style={{ width: `${progress}%` }} />
      </div>

      {shareOpen ? (
        <div data-testid="room-checklist-share" style={{ margin: '0 12px 12px', padding: 14, borderRadius: 14, border: '1px solid var(--hair)', background: 'var(--composer-solid, #131317)', display: 'grid', gap: 10 }}>
          <label style={{ display: 'grid', gap: 5, color: 'var(--muted)', font: '600 11px var(--font-sans)' }}>
            Send this list to
            <select aria-label="Destination room" value={targetRoom} onChange={(event) => setTargetRoom(event.target.value)} disabled={disabled}
              style={{ width: '100%', minWidth: 0, height: 42, boxSizing: 'border-box', borderRadius: 11, border: '1px solid var(--hair)', background: 'var(--composer-card-solid, #202026)', color: 'var(--fg)', padding: '0 11px', font: '500 13px var(--font-sans)', outline: 'none' }}>
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
              style={{ flex: 1, height: 40, borderRadius: 20, border: '1px solid var(--hair)', background: 'var(--composer-control-solid, var(--surface-2))', color: targetRoom ? 'var(--fg)' : 'var(--faint)', font: '700 11.5px var(--font-sans)', cursor: targetRoom ? 'pointer' : 'default' }}>Copy</button>
            <button type="button" disabled={disabled || !targetRoom} onClick={() => share('move')}
              style={{ flex: 1, height: 40, borderRadius: 20, border: '1px solid var(--accent)', background: targetRoom ? 'var(--accent)' : 'var(--composer-control-solid, var(--surface-2))', color: targetRoom ? '#fff' : 'var(--faint)', font: '700 11.5px var(--font-sans)', cursor: targetRoom ? 'pointer' : 'default' }}>Move</button>
          </div>
        </div>
      ) : null}

      {!list.collapsed ? (
        <div className="cv6-checklist-body" style={{ padding: '8px 12px 14px', display: 'grid', gap: 10 }}>
          {(list.items || []).map((item) => (
            <EditableItem key={item.id} item={item} disabled={disabled}
              registerInput={registerItemInput(item.id)} onEnter={() => focusAfter(item.id)}
              onEdit={(text) => mutate('edit-item', { list_id: list.id, item_id: item.id, text })}
              onToggle={() => mutate('toggle-item', { list_id: list.id, item_id: item.id })}
              onDelete={() => mutate('delete-item', { list_id: list.id, item_id: item.id })}
              onPlay={async (text = item.text) => {
                const ok = await onPlay(text);
                onNotice(ok === false ? 'Could not reach the agent. The item is still here.' : `Sent “${text}” to the agent.`);
              }} />
          ))}
          <form onSubmit={addItem} style={{ display: 'flex', gap: 7, alignItems: 'center', marginTop: 2 }}>
            <input ref={addInputRef} aria-label={`Add item to ${list.title}`} value={newItem} disabled={disabled} onChange={(event) => setNewItem(event.target.value)} placeholder="Add a note or next step…"
              style={{ flex: 1, minWidth: 0, height: 42, borderRadius: 12, border: '1px solid var(--hair)', background: 'var(--composer-solid, #131317)', color: 'var(--fg)', padding: '0 12px', outline: 'none', font: '500 13px var(--font-sans)' }} />
            <button type="submit" aria-label={`Add item to ${list.title}`} disabled={disabled || !newItem.trim()} style={circleButton(Boolean(newItem.trim()))}><Icon name="plus" size={17}/></button>
          </form>
        </div>
      ) : null}
    </section>
  );
}

export default function RoomChecklistPanel({ room, worldId, roomOptions = [], onPlay, onPlayList, onClose }) {
  const roomKey = roomChecklistKey(room);
  const { lists, status, error, mutate } = useRoomChecklists(worldId, roomKey);
  const [newListOpen, setNewListOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => { setNewListOpen(false); setNewTitle(''); setNotice(''); }, [roomKey]);
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape' && !event.defaultPrevented) onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
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
  const summary = useMemo(() => {
    const items = lists.flatMap((list) => list.items || []);
    return { total: items.length, done: items.filter((item) => item.done).length };
  }, [lists]);
  const createList = async (event) => {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    const saved = await mutate('create-list', { title });
    if (saved) { setNewTitle(''); setNewListOpen(false); }
  };

  return (
    <div className="cv6-checklist-panel" data-testid="room-checklist-panel" role="region" aria-label={`Room checklists for ${roomChecklistLabel(room)}`} data-swipe-guard="" data-cv6-gesture-lock="" style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', display: 'grid', gap: 13, maxHeight: 'min(52dvh, 470px)', overflow: 'hidden' }}>
      <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 11, padding: '2px 3px 3px', boxSizing: 'border-box' }}>
        <span style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--accent-weak)', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Icon name="checklist"/></span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', color: 'var(--fg)', font: '700 13px var(--font-sans)' }}>Room lists</span>
          <span style={{ display: 'block', color: 'var(--faint)', font: '500 10.5px var(--font-sans)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{roomChecklistLabel(room)} · {summary.total ? `${summary.done} of ${summary.total} complete` : 'private until you press Play'}</span>
        </span>
        <button type="button" aria-label="Create a new list" title="New list" onClick={() => setNewListOpen((open) => !open)} style={circleButton(newListOpen)}><Icon name="plus" size={18}/></button>
        <button type="button" aria-label="Close checklist mode" title="Back to chat" onClick={onClose} style={circleButton(false)}><Icon name="close" size={18}/></button>
      </div>

      {newListOpen ? (
        <form onSubmit={createList} style={{ display: 'flex', gap: 9 }}>
          <input autoFocus aria-label="New list title" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="List title…"
            style={{ flex: 1, minWidth: 0, height: 42, borderRadius: 13, border: '1px solid var(--accent)', background: 'var(--composer-card-solid, #202026)', color: 'var(--fg)', padding: '0 13px', outline: 'none', font: '600 13px var(--font-sans)' }} />
          <button type="submit" disabled={disabled || !newTitle.trim()} style={{ height: 42, padding: '0 16px', borderRadius: 21, border: 'none', background: newTitle.trim() ? 'var(--accent)' : 'var(--composer-control-solid, var(--surface-2))', color: newTitle.trim() ? '#fff' : 'var(--faint)', font: '700 11.5px var(--font-sans)' }}>Create</button>
        </form>
      ) : null}

      <div style={{ width: '100%', minWidth: 0, minHeight: 0, boxSizing: 'border-box', overflowX: 'hidden', overflowY: 'auto', overscrollBehavior: 'contain', display: 'grid', gap: 12, padding: '2px 3px 3px' }}>
        {status === 'loading' ? <div style={{ padding: '18px 8px', textAlign: 'center', color: 'var(--faint)', font: '500 12px var(--font-sans)' }}>Opening your room lists…</div> : null}
        {status !== 'loading' && !lists.length ? (
          <button type="button" onClick={() => setNewListOpen(true)} style={{ minHeight: 104, borderRadius: 18, border: '1px dashed var(--hair)', background: 'var(--composer-card-solid, #202026)', color: 'var(--muted)', padding: 18, cursor: 'pointer', font: '600 12.5px/1.55 var(--font-sans)' }}>
            Start a list for notes, reminders, or work you may send later.
          </button>
        ) : null}
        {lists.map((list) => <ChecklistList key={list.id} list={list} roomOptions={options} currentRoomKey={roomKey} disabled={disabled} mutate={mutate} onPlay={onPlay} onPlayList={onPlayList} onNotice={setNotice} />)}
      </div>
      {(error || notice || disabled) ? (
        <div aria-live="polite" style={{ color: error ? 'var(--danger, #e5484d)' : notice ? 'var(--accent)' : 'var(--faint)', font: '600 10.5px var(--font-sans)', padding: '0 3px' }}>
          {error || notice || 'Saving…'}
        </div>
      ) : null}
    </div>
  );
}