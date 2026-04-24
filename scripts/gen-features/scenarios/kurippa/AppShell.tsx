import { MemoryRouter } from 'react-router-dom';
import {
  ClipboardStoreContext, type ClipboardStore,
  FoldersStoreContext, type FoldersStore,
  NavigationStoreContext, type NavigationStore,
  UIStoreContext, type UIStore,
  SettingsStoreContext, type SettingsStore,
  MultiSelectStoreContext, type MultiSelectStore,
} from '@/store';
import App from '@/components/App';

const DEFAULT_CLIPBOARD: ClipboardStore = {
  allItems: [],
  results: [],
  visibleEntries: [],
  liftingId: null,
  landingId: null,
  deletingId: null,
};

const DEFAULT_FOLDERS: FoldersStore = {
  folders: [],
  maxFoldersToast: false,
  folderNameInputValue: '',
};

const DEFAULT_NAVIGATION: NavigationStore = {
  query: '',
  selectedIndex: 0,
  expandedSection: null,
  inPinnedSection: false,
  expandedFolderId: null,
};

const DEFAULT_UI: UIStore = {
  previewPanelOpen: false,
  pasteAsPreviewText: null,
  clearConfirmShow: false,
  updateInfo: null,
};

const DEFAULT_SETTINGS: SettingsStore = {
  defaultSeparator: 'newline',
};

const DEFAULT_MULTI_SELECT: MultiSelectStore = {
  active: false,
  selections: [],
  flashingId: null,
  maxToastVisible: false,
};

interface AppShellProps {
  clipboard?: Partial<ClipboardStore>;
  folders?: Partial<FoldersStore>;
  navigation?: Partial<NavigationStore>;
  ui?: Partial<UIStore>;
  settings?: Partial<SettingsStore>;
  multiSelect?: Partial<MultiSelectStore>;
  initialRoute?: string | { pathname: string; state: unknown };
  width?: number;
  height?: number;
}

export function AppShell({
  clipboard,
  folders,
  navigation,
  ui,
  settings,
  multiSelect,
  initialRoute = '/',
  width = 480,
  height = 560,
}: AppShellProps) {
  const clipboardVal = { ...DEFAULT_CLIPBOARD, ...clipboard };
  const foldersVal = { ...DEFAULT_FOLDERS, ...folders };
  const navigationVal = { ...DEFAULT_NAVIGATION, ...navigation };
  const uiVal = { ...DEFAULT_UI, ...ui };
  const settingsVal = { ...DEFAULT_SETTINGS, ...settings };
  const multiSelectVal = { ...DEFAULT_MULTI_SELECT, ...multiSelect };

  return (
    <div
      data-scenario-ready
      style={{ width, height, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
    >
      <ClipboardStoreContext.Provider value={clipboardVal}>
        <FoldersStoreContext.Provider value={foldersVal}>
          <NavigationStoreContext.Provider value={navigationVal}>
            <UIStoreContext.Provider value={uiVal}>
              <SettingsStoreContext.Provider value={settingsVal}>
                <MultiSelectStoreContext.Provider value={multiSelectVal}>
                  <MemoryRouter initialEntries={[initialRoute]}>
                    <App />
                  </MemoryRouter>
                </MultiSelectStoreContext.Provider>
              </SettingsStoreContext.Provider>
            </UIStoreContext.Provider>
          </NavigationStoreContext.Provider>
        </FoldersStoreContext.Provider>
      </ClipboardStoreContext.Provider>
    </div>
  );
}
