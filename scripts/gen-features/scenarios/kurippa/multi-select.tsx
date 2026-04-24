import { AppShell } from './AppShell';
import type { ListEntry } from '@/types';

export const meta = { width: 480 };

const now = Date.now();

const visibleEntries: ListEntry[] = [
  { kind: 'item', result: { item: { id: 1, kind: 'text', text: 'NEXT_PUBLIC_API_URL=https://api.staging.example.com', html: null, rtf: null, image_path: null, source_app: 'com.microsoft.VSCode', created_at: now - 30000, pinned: false, folder_id: null, qr_text: null, image_width: null, image_height: null }, highlighted: null, score: 0, folder_name: null } },
  { kind: 'item', result: { item: { id: 2, kind: 'text', text: 'DATABASE_URL=postgres://user:password@localhost:5432/myapp', html: null, rtf: null, image_path: null, source_app: 'com.microsoft.VSCode', created_at: now - 90000, pinned: false, folder_id: null, qr_text: null, image_width: null, image_height: null }, highlighted: null, score: 0, folder_name: null } },
  { kind: 'item', result: { item: { id: 3, kind: 'text', text: 'STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxx', html: null, rtf: null, image_path: null, source_app: 'com.microsoft.VSCode', created_at: now - 150000, pinned: false, folder_id: null, qr_text: null, image_width: null, image_height: null }, highlighted: null, score: 0, folder_name: null } },
  { kind: 'item', result: { item: { id: 4, kind: 'text', text: 'REDIS_URL=redis://localhost:6379', html: null, rtf: null, image_path: null, source_app: 'com.microsoft.VSCode', created_at: now - 210000, pinned: false, folder_id: null, qr_text: null, image_width: null, image_height: null }, highlighted: null, score: 0, folder_name: null } },
  { kind: 'item', result: { item: { id: 5, kind: 'text', text: 'JWT_SECRET=s3cr3t-k3y-f0r-t0k3n-s1gning', html: null, rtf: null, image_path: null, source_app: 'com.microsoft.VSCode', created_at: now - 270000, pinned: false, folder_id: null, qr_text: null, image_width: null, image_height: null }, highlighted: null, score: 0, folder_name: null } },
];

export default function Scenario() {
  return (
    <AppShell
      clipboard={{ visibleEntries }}
      navigation={{ selectedIndex: 2 }}
      multiSelect={{ active: true, selections: [1, 2, 3], flashingId: null, maxToastVisible: false }}
    />
  );
}
