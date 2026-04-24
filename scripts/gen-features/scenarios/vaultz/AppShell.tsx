import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, createStore } from 'jotai';
import { Theme as RadixTheme } from '@radix-ui/themes';
import {
  SessionStoreContext,
  LicenseStoreContext,
  PasswordsStoreContext,
  FoldersStoreContext,
} from '@/store';
import type {
  SessionStore,
  LicenseStore,
  PasswordsStore,
  FoldersStore,
} from '@/store';
import type { Password, Folder } from '@/types';
// NOTE: Jotai pre-seeding is required here because usePasswordDetails reads
// allPasswordsAtom and foldersAtom directly via useAtomValue instead of using
// the store context layer. This is the only place Jotai is referenced in AppShell.
import { allPasswordsAtom } from '@/atoms/passwords';
import { foldersAtom } from '@/atoms/folders';
import { SPECIAL_FOLDERS, VIRTUAL_FOLDERS } from '@/constants/folders';
import Dashboard from '@/pages/Dashboard';
import SettingsPage from '@/pages/SettingsPage';
import PasswordDetailsPage from '@/pages/PasswordDetailsPage';
import { lightTheme } from '@/styles/theme.css';
import '@radix-ui/themes/styles.css';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';

// Mirror vaultz's main.tsx: apply lightTheme to <html> so vanilla-extract CSS vars
// (bg.page gradient, bg.card, shadows) resolve globally, not just inside RadixTheme.
document.documentElement.classList.add(lightTheme);

// ---- Jotai store factory ----
// Isolated here so the rest of AppShell stays context-layer clean.
// Required because usePasswordDetails reads atoms directly via useAtomValue.

function createJotaiStore(allPasswords: Password[], realFolders: Folder[]) {
  const store = createStore();
  store.set(allPasswordsAtom, allPasswords);
  store.set(foldersAtom, realFolders);
  return store;
}

// ---- Defaults ----

const DEFAULT_SESSION: SessionStore = {
  isAuthenticated: true,
  isLogoutConfirm: false,
};

const DEFAULT_LICENSE: LicenseStore = {
  licenseStatus: null,
  isPro: true,
  activeModal: null,
  pendingLicenseKey: null,
};

function buildFoldersStore(
  realFolders: Folder[],
  allPasswords: Password[],
): FoldersStore {
  const FAVORITES_ID = SPECIAL_FOLDERS.FAVORITES.toString();
  const ALL_ID = SPECIAL_FOLDERS.ALL.toString();
  const folders = [...VIRTUAL_FOLDERS, ...realFolders];

  const folderCountMap: Record<string, number> = {};
  folderCountMap[ALL_ID] = allPasswords.length;
  folderCountMap[FAVORITES_ID] = 0;
  for (const p of allPasswords) {
    if (p.isFavorite) folderCountMap[FAVORITES_ID]++;
    folderCountMap[p.folderId] = (folderCountMap[p.folderId] || 0) + 1;
  }

  const folderNameMap: Record<string, string> = {};
  const folderIconMap: Record<string, string> = {};
  for (const f of realFolders) {
    folderNameMap[f.id] = f.name;
    folderIconMap[f.id] = f.icon;
  }

  const visibleFolders = folders.filter(
    (f) => f.id !== FAVORITES_ID || (folderCountMap[FAVORITES_ID] ?? 0) > 0,
  );

  return { folders, visibleFolders, folderCountMap, folderNameMap, folderIconMap };
}

// ---- Props ----

interface AppShellProps {
  session?: Partial<SessionStore>;
  license?: Partial<LicenseStore>;
  passwords?: Partial<PasswordsStore>;
  realFolders?: Folder[];
  initialRoute?: string;
  width?: number;
  height?: number;
}

// ---- Component ----

export function AppShell({
  session,
  license,
  passwords,
  realFolders = [],
  initialRoute = '/dashboard',
  width = 960,
  height = 640,
}: AppShellProps) {
  const sessionVal: SessionStore = { ...DEFAULT_SESSION, ...session };
  const licenseVal: LicenseStore = { ...DEFAULT_LICENSE, ...license };

  const allPasswords: Password[] = passwords?.allPasswords ?? [];
  const filteredPasswords: Password[] =
    passwords?.filteredPasswords ?? allPasswords;
  const passwordsVal: PasswordsStore = {
    allPasswords,
    filteredPasswords,
    selectedFolder: passwords?.selectedFolder ?? SPECIAL_FOLDERS.ALL.toString(),
    searchQuery: passwords?.searchQuery ?? '',
    favoriteAlert: passwords?.favoriteAlert ?? '',
  };

  const foldersVal: FoldersStore = buildFoldersStore(realFolders, allPasswords);

  const store = createJotaiStore(allPasswords, realFolders);

  return (
    <div
      data-scenario-ready
      style={{ width, height, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
    >
      <Provider store={store}>
        <SessionStoreContext.Provider value={sessionVal}>
          <LicenseStoreContext.Provider value={licenseVal}>
            <PasswordsStoreContext.Provider value={passwordsVal}>
              <FoldersStoreContext.Provider value={foldersVal}>
                <RadixTheme appearance="light" className={lightTheme}>
                  <MemoryRouter initialEntries={[initialRoute]}>
                    <Routes>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="/password/:id" element={<PasswordDetailsPage />} />
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </MemoryRouter>
                </RadixTheme>
              </FoldersStoreContext.Provider>
            </PasswordsStoreContext.Provider>
          </LicenseStoreContext.Provider>
        </SessionStoreContext.Provider>
      </Provider>
    </div>
  );
}
