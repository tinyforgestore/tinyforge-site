import { AppShell } from './AppShell';
import type { ListEntry } from '@/types';

export const meta = { width: 480 };

const now = Date.now();

const visibleEntries: ListEntry[] = [
  { kind: 'item', result: { item: { id: 1, kind: 'text', text: 'ssh -i ~/.ssh/prod.pem ubuntu@10.0.1.42', html: null, rtf: null, image_path: null, source_app: 'com.apple.Terminal', created_at: now - 60000, pinned: true, folder_id: null, qr_text: null, image_width: null, image_height: null }, highlighted: null, score: 0, folder_name: null } },
  { kind: 'item', result: { item: { id: 2, kind: 'text', text: 'git push origin main --force-with-lease', html: null, rtf: null, image_path: null, source_app: 'com.apple.Terminal', created_at: now - 120000, pinned: true, folder_id: null, qr_text: null, image_width: null, image_height: null }, highlighted: null, score: 0, folder_name: null } },
  { kind: 'folder-header', folderId: 1, name: 'Snippets', count: 3, expanded: false },
  { kind: 'folder-header', folderId: 2, name: 'Credentials', count: 2, expanded: false },
  { kind: 'item', result: { item: { id: 3, kind: 'text', text: 'docker compose up --build -d', html: null, rtf: null, image_path: null, source_app: 'com.apple.Terminal', created_at: now - 300000, pinned: false, folder_id: null, qr_text: null, image_width: null, image_height: null }, highlighted: null, score: 0, folder_name: null } },
  { kind: 'item', result: { item: { id: 4, kind: 'text', text: 'curl -X POST https://api.stripe.com/v1/charges -H "Authorization: Bearer sk_test_…"', html: null, rtf: null, image_path: null, source_app: 'com.apple.Terminal', created_at: now - 360000, pinned: false, folder_id: null, qr_text: null, image_width: null, image_height: null }, highlighted: null, score: 0, folder_name: null } },
];

export default function Scenario() {
  return (
    <AppShell
      clipboard={{ visibleEntries }}
      folders={{
        folders: [
          { id: 1, name: 'Snippets', created_at: now - 86400000, position: 0 },
          { id: 2, name: 'Credentials', created_at: now - 172800000, position: 1 },
        ],
      }}
      navigation={{ selectedIndex: 0, expandedSection: null }}
    />
  );
}
