import { createRoot } from 'react-dom/client'
import CommandDeckHome from '../src/dashboard/cv5/CommandDeckHome.jsx'

const ago = (min) => new Date(Date.now() - min * 60000).toISOString()
const props = {
  user: { user_metadata: { full_name: 'Patrik Matheson' }, email: 'patrikmatheson@gmail.com' },
  worldId: 'aom',
  agents: [
    { slug: 'elon', name: 'Elon', is_ea: true, is_terminal: true },
    { slug: 'gary', name: 'Gary', is_ea: true },
    { slug: 'steffen', name: 'Steffen' },
    { slug: 'bobby', name: 'Bobby' },
    { slug: 'cleo', name: 'Cleo' },
  ],
  projectRooms: [
    { slug: 'space-rising', name: 'Space Rising', last_message_at: ago(2) },
    { slug: 'corner', name: 'Corner', last_message_at: ago(14) },
    { slug: 'aom', name: 'AOM', last_message_at: ago(48) },
    { slug: 'conrad-foundation', name: 'Conrad Foundation', last_message_at: ago(180) },
    { slug: 'ambition', name: 'Ambition', last_message_at: ago(2880) },
  ],
  needsYou: [
    { key: 'sr', label: 'Space Rising brand: pick the logo route', detail: 'Steffen left two directions and a recommendation. Two minutes to decide, then it ships.', onOpen: () => {} },
  ],
  onSelectAgent: () => {}, onSelectProject: () => {}, onOpenSearch: () => {},
}
createRoot(document.getElementById('root')).render(<CommandDeckHome {...props} />)
