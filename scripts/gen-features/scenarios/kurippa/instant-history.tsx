import { AppShell } from './AppShell';
import type { ListEntry } from '@/types';

export const meta = { width: 480 };

const now = Date.now();

const visibleEntries: ListEntry[] = [
  { kind: 'item', result: { item: { id: 1, kind: 'text', text: 'git rebase -i HEAD~3', html: null, rtf: null, image_path: null, source_app: 'com.apple.Terminal', created_at: now - 30000, pinned: false, folder_id: null, qr_text: null, image_width: null, image_height: null }, highlighted: null, score: 0, folder_name: null } },
  { kind: 'item', result: { item: { id: 2, kind: 'text', text: 'https://github.com/anthropics/anthropic-sdk-python/releases/tag/v0.40.0', html: null, rtf: null, image_path: null, source_app: 'com.google.Chrome', created_at: now - 90000, pinned: false, folder_id: null, qr_text: null, image_width: null, image_height: null }, highlighted: null, score: 0, folder_name: null } },
  { kind: 'item', result: { item: { id: 3, kind: 'text', text: 'useEffect(() => { fetchData(); }, [query, page])', html: null, rtf: null, image_path: null, source_app: 'com.microsoft.VSCode', created_at: now - 150000, pinned: false, folder_id: null, qr_text: null, image_width: null, image_height: null }, highlighted: null, score: 0, folder_name: null } },
  { kind: 'item', result: { item: { id: 4, kind: 'text', text: 'SELECT id, email, created_at FROM users WHERE plan = \'pro\' ORDER BY created_at DESC LIMIT 50', html: null, rtf: null, image_path: null, source_app: 'com.tableplus.TablePlus', created_at: now - 210000, pinned: false, folder_id: null, qr_text: null, image_width: null, image_height: null }, highlighted: null, score: 0, folder_name: null } },
  { kind: 'item', result: { item: { id: 5, kind: 'text', text: '#6C63FF', html: null, rtf: null, image_path: null, source_app: 'com.figma.Desktop', created_at: now - 270000, pinned: false, folder_id: null, qr_text: null, image_width: null, image_height: null }, highlighted: null, score: 0, folder_name: null } },
  { kind: 'item', result: { item: { id: 6, kind: 'text', text: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3ItMDEyIn0', html: null, rtf: null, image_path: null, source_app: 'com.insomnia.app', created_at: now - 330000, pinned: false, folder_id: null, qr_text: null, image_width: null, image_height: null }, highlighted: null, score: 0, folder_name: null } },
];

export default function Scenario() {
  return (
    <AppShell
      clipboard={{ visibleEntries }}
      navigation={{ selectedIndex: 0 }}
    />
  );
}
