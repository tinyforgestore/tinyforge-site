import { AppShell } from './AppShell';
import type { ListEntry } from '@/types';

export const meta = { width: 720 };

const now = Date.now();

const colorItem = { id: 1, kind: 'text' as const, text: '#6C63FF', html: null, rtf: null, image_path: null, source_app: 'com.figma.Desktop', created_at: now - 60000, pinned: false, folder_id: null, qr_text: null, image_width: null, image_height: null };

const visibleEntries: ListEntry[] = [
  { kind: 'item', result: { item: colorItem, highlighted: null, score: 0, folder_name: null } },
  { kind: 'item', result: { item: { id: 2, kind: 'text', text: '#FF6B6B', html: null, rtf: null, image_path: null, source_app: 'com.figma.Desktop', created_at: now - 120000, pinned: false, folder_id: null, qr_text: null, image_width: null, image_height: null }, highlighted: null, score: 0, folder_name: null } },
  { kind: 'item', result: { item: { id: 3, kind: 'text', text: 'rgba(108, 99, 255, 0.8)', html: null, rtf: null, image_path: null, source_app: 'com.figma.Desktop', created_at: now - 180000, pinned: false, folder_id: null, qr_text: null, image_width: null, image_height: null }, highlighted: null, score: 0, folder_name: null } },
];

export default function Scenario() {
  return (
    <AppShell
      width={720}
      clipboard={{ visibleEntries }}
      navigation={{ selectedIndex: 0 }}
      ui={{ previewPanelOpen: true }}
    />
  );
}
