import { Provider, createStore } from 'jotai';
import { Theme as RadixTheme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import PasswordGenerator from '@/components/PasswordGenerator';
import { lightTheme } from '@/styles/theme.css';

document.documentElement.classList.add(lightTheme);

export const meta = { width: 500 };

export default function Scenario() {
  return (
    <Provider store={createStore()}>
      <RadixTheme appearance="light" className={lightTheme}>
        <div
          data-scenario-ready
          style={{ width: 500, padding: 24, background: 'var(--color-background)' }}
        >
          <PasswordGenerator
            isEmbedded={true}
            onUsePassword={() => {}}
            onCancel={() => {}}
          />
        </div>
      </RadixTheme>
    </Provider>
  );
}
