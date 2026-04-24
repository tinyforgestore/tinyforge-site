import { AppShell } from './AppShell';
import type { ListEntry } from '@/types';

export const meta = { width: 480 };

const now = Date.now();

const visibleEntries: ListEntry[] = [
  { kind: 'item', result: { item: { id: 1, kind: 'text', text: 'git rebase -i HEAD~3', html: null, rtf: null, image_path: null, source_app: 'com.apple.Terminal', created_at: now - 30000, pinned: false, folder_id: null, qr_text: null, image_width: null, image_height: null }, highlighted: '<b>g</b>it r<b>e</b>base -i HEAD~3', score: 0.9, folder_name: null } },
  { kind: 'item', result: { item: { id: 2, kind: 'text', text: 'git push origin main --force-with-lease', html: null, rtf: null, image_path: null, source_app: 'com.apple.Terminal', created_at: now - 90000, pinned: false, folder_id: null, qr_text: null, image_width: null, image_height: null }, highlighted: '<b>g</b>it push origin main --forc<b>e</b>-with-lease', score: 0.7, folder_name: null } },
  { kind: 'item', result: { item: { id: 3, kind: 'text', text: 'git log --oneline --graph --decorate --all', html: null, rtf: null, image_path: null, source_app: 'com.apple.Terminal', created_at: now - 150000, pinned: false, folder_id: null, qr_text: null, image_width: null, image_height: null }, highlighted: null, score: 0.5, folder_name: null } },
];

export default function Scenario() {
  return (
    <AppShell
      clipboard={{ visibleEntries }}
      navigation={{ query: 'ge', selectedIndex: 0 }}
    />
  );
}
