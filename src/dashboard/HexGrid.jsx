import React, { useState } from 'react'
import { Wrench, BarChart3, Palette, Terminal, Megaphone, Video, User, FolderKanban, Shield, Search, Camera, Zap, Mail, Globe, Briefcase, Heart } from 'lucide-react'

const AGENT_ICONS = {
  bobby: Wrench, steve: BarChart3, steffen: Palette,
  elon: Terminal, gary: Megaphone, cleo: Video,
  patrik: Shield, jacob: Mail, colton: Wrench,
  elmo: Search, tony: Camera, mom: Zap,
  alex: Globe, paige: Heart, mark: Camera, pixel: Zap,
}

const PROJECT_ICON = FolderKanban
const SPECIAL_ICON = Briefcase

const HEX_W = 130
const HEX_H = 150
const HEX_GAP_X = 8
const HEX_GAP_Y = -20
const HEX_CLIP = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'

// Row sizes matching CanvasOffice layout order
const ROW_SIZES = [4, 4, 5, 4, 6]

function getHexPosition(index) {
  let remaining = index
  let row = 0
  for (let r = 0; r < ROW_SIZES.length; r++) {
    if (remaining < ROW_SIZES[r]) {
      row = r
      break
    }
    remaining -= ROW_SIZES[r]
    row = r + 1
  }
  const col = remaining
  const colsInRow = ROW_SIZES[row] || 6
  const rowWidth = colsInRow * (HEX_W + HEX_GAP_X)
  const offsetX = (row % 2 === 1) ? (HEX_W + HEX_GAP_X) / 2 : 0

  const x = col * (HEX_W + HEX_GAP_X) + offsetX - rowWidth / 2
  const y = row * (HEX_H + HEX_GAP_Y)

  return { x, y }
}

function HexTile({ room, position, isHovered, isSelected, onHover, onLeave, onClick, agentStatus, isDaytime }) {
  if (!room || room.hidden) return null

  const slug = room.slug || room.id
  const isAgent = room.type === 'agent' || (!room.type && room.role)
  const isProject = room.type === 'project'
  const isSpecial = room.type === 'special'

  const color = room.agentColor || room.color || '#3B82F6'
  const status = agentStatus?.[slug]
  const isActive = status === 'working' || status === 'active'
  const isIdle = status === 'idle'

  const statusColor = isActive ? (room.statusColors?.active || color)
    : isIdle ? (room.statusColors?.idle || color)
    : (room.statusColors?.offline || color)

  const IconComponent = isAgent ? (AGENT_ICONS[slug] || User)
    : isProject ? PROJECT_ICON
    : isSpecial ? SPECIAL_ICON
    : User

  const bgBase = isDaytime ? 'rgba(30, 60, 120, 0.85)' : 'rgba(15, 25, 60, 0.92)'
  const bgHover = isDaytime ? 'rgba(40, 80, 160, 0.9)' : 'rgba(25, 40, 90, 0.95)'

  return (
    <div
      onMouseEnter={() => onHover(slug)}
      onMouseLeave={onLeave}
      onClick={() => onClick(slug)}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: HEX_W,
        height: HEX_H,
        cursor: 'pointer',
        transition: 'transform 200ms ease, filter 200ms ease',
        transform: isHovered ? 'scale(1.08)' : isSelected ? 'scale(1.04)' : 'scale(1)',
        filter: isHovered ? 'brightness(1.15)' : 'brightness(1)',
        zIndex: isHovered ? 10 : isSelected ? 5 : 1,
      }}
    >
      {/* Border / glow layer */}
      <div style={{
        position: 'absolute', inset: -3,
        clipPath: HEX_CLIP,
        background: isSelected
          ? `linear-gradient(135deg, ${statusColor}, ${color})`
          : isHovered
          ? `linear-gradient(135deg, ${statusColor}88, ${color}44)`
          : `linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))`,
        transition: 'background 200ms ease',
      }} />

      {/* Main hex body */}
      <div style={{
        position: 'absolute', inset: 0,
        clipPath: HEX_CLIP,
        background: isHovered ? bgHover : bgBase,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '20px 10px',
      }}>
        {/* Status dot */}
        {isActive && (
          <div style={{
            position: 'absolute', top: 18, right: 28,
            width: 8, height: 8,
            borderRadius: '50%',
            backgroundColor: statusColor,
            boxShadow: `0 0 8px ${statusColor}`,
          }} />
        )}

        {/* Icon */}
        <IconComponent
          size={24}
          color={statusColor}
          strokeWidth={1.8}
          style={{ opacity: isActive ? 1 : 0.6, transition: 'opacity 200ms ease' }}
        />

        {/* Name */}
        <span style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#F0F4FF',
          textAlign: 'center',
          lineHeight: 1.2,
          maxWidth: HEX_W - 30,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          letterSpacing: '0.02em',
        }}>
          {room.name || slug}
        </span>

        {/* Role / type label */}
        <span style={{
          fontSize: 10,
          color: 'rgba(240, 244, 255, 0.5)',
          textAlign: 'center',
          lineHeight: 1.1,
          maxWidth: HEX_W - 20,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {room.role || room.type || ''}
        </span>
      </div>
    </div>
  )
}

export default function HexGrid({ rooms, onRoomClick, isDaytime, agentStatus, selectedRoom, hoveredRoom, setHoveredRoom, isMobile }) {
  const [localHovered, setLocalHovered] = useState(null)
  const hovered = hoveredRoom ?? localHovered

  // Filter out hidden rooms
  const visibleRooms = (rooms || []).filter(r => r && !r.hidden)

  // Calculate grid bounds for centering
  const positions = visibleRooms.map((_, i) => getHexPosition(i))
  const minX = positions.length ? Math.min(...positions.map(p => p.x)) - HEX_W / 2 : 0
  const maxX = positions.length ? Math.max(...positions.map(p => p.x)) + HEX_W * 1.5 : 0
  const minY = positions.length ? Math.min(...positions.map(p => p.y)) : 0
  const maxY = positions.length ? Math.max(...positions.map(p => p.y)) + HEX_H : 0
  const gridW = maxX - minX
  const gridH = maxY - minY

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      overflow: 'auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: isDaytime ? '#0A0F1A' : '#060A14',
    }}>
      <div style={{
        position: 'relative',
        width: gridW,
        height: gridH,
        transform: isMobile ? 'scale(0.7)' : 'scale(0.85)',
        transformOrigin: 'center center',
      }}>
        {visibleRooms.map((room, i) => {
          const pos = positions[i]
          const slug = room.slug || room.id
          return (
            <HexTile
              key={slug}
              room={room}
              position={{ x: pos.x - minX, y: pos.y - minY }}
              isHovered={hovered === slug}
              isSelected={selectedRoom === slug}
              onHover={(s) => {
                setLocalHovered(s)
                if (setHoveredRoom) setHoveredRoom(s)
              }}
              onLeave={() => {
                setLocalHovered(null)
                if (setHoveredRoom) setHoveredRoom(null)
              }}
              onClick={onRoomClick || (() => {})}
              agentStatus={agentStatus}
              isDaytime={isDaytime}
            />
          )
        })}
      </div>
    </div>
  )
}
