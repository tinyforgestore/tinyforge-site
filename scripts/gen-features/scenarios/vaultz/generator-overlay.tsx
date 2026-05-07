import { useEffect } from 'react';
import { Provider, createStore } from 'jotai';
import { Theme as RadixTheme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import OverlayGenerator from '@/pages/OverlayGenerator';
import { lightTheme } from '@/styles/theme.css';

document.documentElement.classList.add(lightTheme);

// Re-shim invoke so isAuthenticated resolves true and any overlay command is a no-op.
const internals = (window as unknown as { __TAURI_INTERNALS__: { invoke: (cmd: string) => Promise<unknown> } }).__TAURI_INTERNALS__;
internals.invoke = (cmd: string) => {
  if (cmd === 'is_authenticated') return Promise.resolve(true);
  return Promise.resolve(undefined);
};

export const meta = { width: 540 };

export default function Scenario() {
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
            background: 'var(--color-background, #ffffff)',
            border: '1px solid rgba(127, 127, 127, 0.18)',
            borderRadius: 12,
            boxShadow: '0 12px 40px rgba(36, 18, 100, 0.15)',
            overflow: 'hidden',
          }}
        >
          <OverlayGenerator />
        </div>
      </RadixTheme>
    </Provider>
  );
}
