import { useEffect } from 'react';
import { Provider, createStore } from 'jotai';
import { Theme as RadixTheme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import OverlaySearch from '@/pages/OverlaySearch';
import { lightTheme } from '@/styles/theme.css';

document.documentElement.classList.add(lightTheme);

const mockEntries = [
  { id: '1', name: 'GitHub Personal',     username: 'alex.r@gmail.com',   password: '••••••••', folderId: null },
  { id: '2', name: 'Stripe Dashboard',    username: 'alex@studio.dev',     password: '••••••••', folderId: null },
  { id: '3', name: 'DigitalOcean',        username: 'alex@studio.dev',     password: '••••••••', folderId: null },
  { id: '4', name: 'Spotify Family',      username: 'alex.r@gmail.com',   password: '••••••••', folderId: null },
  { id: '5', name: 'Booking.com',         username: 'alex.r@gmail.com',   password: '••••••••', folderId: null },
  { id: '6', name: 'Discord',             username: 'alex.r@gmail.com',   password: '••••••••', folderId: null },
];

// Re-shim invoke so the overlay's hook resolves with realistic data instead
// of the capture script's blanket reject.
const internals = (window as unknown as { __TAURI_INTERNALS__: { invoke: (cmd: string) => Promise<unknown> } }).__TAURI_INTERNALS__;
internals.invoke = (cmd: string) => {
  if (cmd === 'is_authenticated') return Promise.resolve(true);
  if (cmd === 'get_passwords' || cmd === 'search_passwords') return Promise.resolve(mockEntries);
  return Promise.resolve(undefined);
};

export const meta = { width: 540 };

export default function Scenario() {
  // Wait one tick for the overlay's async loads, then expose the
  // scenario-ready marker so the capture script screenshots the populated state.
  useEffect(() => {
    const t = setTimeout(() => {
      const root = document.getElementById('scenario-root');
      if (root) root.setAttribute('data-scenario-ready', 'true');
    }, 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <Provider store={createStore()}>
      <RadixTheme appearance="light" className={lightTheme}>
        <div
          id="scenario-root"
          style={{
            width: 520,
            height: 380,
            background: 'var(--color-background, #ffffff)',
            border: '1px solid rgba(127, 127, 127, 0.18)',
            borderRadius: 12,
            boxShadow: '0 12px 40px rgba(36, 18, 100, 0.15)',
            overflow: 'hidden',
          }}
        >
          <OverlaySearch />
        </div>
      </RadixTheme>
    </Provider>
  );
}
