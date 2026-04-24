import { AppShell } from './AppShell';
import type { ListEntry } from '@/types';

export const meta = { width: 480 };

const now = Date.now();

const pasteItem = { id: 1, kind: 'text' as const, text: 'The deployment pipeline runs unit tests, integration tests, and a smoke test against staging before promoting to production.', html: null, rtf: null, image_path: null, source_app: 'com.notion.id', created_at: now - 60000, pinned: false, folder_id: null, qr_text: null, image_width: null, image_height: null };

const visibleEntries: ListEntry[] = [
  { kind: 'item', result: { item: pasteItem, highlighted: null, score: 0, folder_name: null } },
];

export default function Scenario() {
  return (
    <AppShell
      clipboard={{ visibleEntries }}
      initialRoute={{ pathname: '/paste-as', state: { item: pasteItem } }}
    />
  );
}
