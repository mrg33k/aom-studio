import { useState, useEffect } from 'react'
import { C } from '../../../lib/cv3Colors.js'
import { authFetch } from '../../../lib/authFetch.js'

// R75-d4: Shared room membership UI for owner-side management.
// Displays members list with role selector (member / read_only).
// Read-only members see the list but can't change roles.
//
// Props:
//   projectId: UUID of the project
//   worldId: owner's world ID
//   isOwner: boolean — whether caller is the room owner
//   onClose: optional callback to close the panel

export default function SharedRoomSettings({ projectId, worldId, isOwner, onClose }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviting, setInviting] = useState(false)
  const [confirmDemote, setConfirmDemote] = useState(null) // { id, name, currentRole }

  useEffect(() => {
    loadMembers()
  }, [projectId, worldId])

  async function loadMembers() {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch(
        `/api/dashboard/project-access?project_id=${projectId}&world_id=${worldId}`
      )
      if (!res.ok) {
        const err = await res.json()
        setError(err.error || 'Failed to load members')
        return
      }
      const data = await res.json()
      setMembers(data.members || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    try {
      const res = await authFetch('/api/dashboard/project-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          client_id: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
          world_id: worldId,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.error || 'Failed to invite member')
        return
      }
      const data = await res.json()
      setMembers([...members, data.member])
      setInviteEmail('')
      setInviteRole('member')
    } catch (err) {
      setError(err.message)
    } finally {
      setInviting(false)
    }
  }

  async function handleRoleChange(id, newRole) {
    try {
      const res = await authFetch('/api/dashboard/project-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          client_id: id,
          role: newRole,
          world_id: worldId,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.error || 'Failed to update role')
        return
      }
      setMembers(members.map(m => m.id === id ? { ...m, role: newRole } : m))
      setConfirmDemote(null)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleRemove(id) {
    if (!confirm('Remove this member?')) return
    try {
      const res = await authFetch(
        `/api/dashboard/project-access?id=${id}&world_id=${worldId}`,
        { method: 'DELETE' }
      )
      if (!res.ok) {
        const err = await res.json()
        setError(err.error || 'Failed to remove member')
        return
      }
      setMembers(members.filter(m => m.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div style={{ padding: '16px', background: C.s1, borderRadius: 12 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text }}>
          Members
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              width: 24, height: 24, padding: 0, border: 'none', background: 'none',
              cursor: 'pointer', color: C.muted, fontSize: 18, lineHeight: 1,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {error && (
        <div style={{
          padding: '8px 10px', marginBottom: 12,
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 6, fontSize: 12, color: '#F87171',
        }}>
          {error}
        </div>
      )}

      {/* Invite section (owner only) */}
      {isOwner && (
        <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${C.border2}` }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 8 }}>
            INVITE NEW MEMBER
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <input
              type="email"
              placeholder="Email or handle"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleInvite()
              }}
              style={{
                flex: 1, minWidth: 120,
                padding: '8px 10px', borderRadius: 6,
                background: C.s2, border: `1px solid ${C.border2}`,
                color: C.text, fontSize: 12,
                outline: 'none',
              }}
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value)}
              style={{
                padding: '8px 10px', borderRadius: 6,
                background: C.s2, border: `1px solid ${C.border2}`,
                color: C.text, fontSize: 12,
              }}
            >
              <option value="member">Member</option>
              <option value="read_only">Read-only</option>
            </select>
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
              style={{
                padding: '8px 12px', borderRadius: 6,
                background: 'rgba(16,185,129,0.15)',
                border: '1px solid rgba(16,185,129,0.3)',
                color: '#6EE7B7',
                fontSize: 12, fontWeight: 600,
                cursor: inviting || !inviteEmail.trim() ? 'default' : 'pointer',
                opacity: inviting || !inviteEmail.trim() ? 0.5 : 1,
              }}
            >
              {inviting ? 'Inviting...' : 'Invite'}
            </button>
          </div>
        </div>
      )}

      {/* Confirm demote modal */}
      {confirmDemote && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setConfirmDemote(null)}>
          <div style={{
            background: C.s1, borderRadius: 12, padding: 20,
            border: `1px solid ${C.border2}`,
            maxWidth: 320, boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          }} onClick={e => e.stopPropagation()}>
            <h4 style={{ margin: '0 0 8px', color: C.text, fontSize: 14, fontWeight: 700 }}>
              Demote to read-only?
            </h4>
            <p style={{ margin: '0 0 16px', color: C.muted, fontSize: 12 }}>
              {confirmDemote.name} will lose the ability to send messages and request tasks in this room.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmDemote(null)}
                style={{
                  padding: '8px 12px', borderRadius: 6,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: C.muted, fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleRoleChange(confirmDemote.id, 'read_only')}
                style={{
                  padding: '8px 12px', borderRadius: 6,
                  background: 'rgba(239,68,68,0.15)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#F87171', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Demote
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Members list */}
      <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 8 }}>
        MEMBERS
      </div>
      {loading ? (
        <div style={{ color: C.muted, textAlign: 'center', padding: '20px 0' }}>
          Loading...
        </div>
      ) : members.length === 0 ? (
        <div style={{ color: C.muted, textAlign: 'center', padding: '20px 0' }}>
          No members yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {members.map(member => {
            const displayName = member.client_id || member.id
            const roleLabel = member.role === 'member' ? 'Member' : 'Read-only'
            return (
              <div
                key={member.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 10px', borderRadius: 8,
                  background: C.s2, border: `1px solid ${C.border2}`,
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: C.muted, flexShrink: 0,
                }}>
                  {displayName[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 600, color: C.text,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {displayName}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                    {roleLabel}
                  </div>
                </div>
                {isOwner && (
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {member.role === 'member' ? (
                      <button
                        onClick={() => setConfirmDemote({
                          id: member.id,
                          name: displayName,
                          currentRole: member.role,
                        })}
                        title="Demote to read-only"
                        style={{
                          width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          cursor: 'pointer', color: C.muted,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12,
                        }}
                      >
                        ↓
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRoleChange(member.id, 'member')}
                        title="Promote to member"
                        style={{
                          width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          cursor: 'pointer', color: C.muted,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12,
                        }}
                      >
                        ↑
                      </button>
                    )}
                    <button
                      onClick={() => handleRemove(member.id)}
                      title="Remove member"
                      style={{
                        width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                        background: 'rgba(239,68,68,0.15)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        cursor: 'pointer', color: '#F87171',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
