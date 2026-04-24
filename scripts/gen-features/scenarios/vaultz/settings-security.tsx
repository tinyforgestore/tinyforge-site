import { AppShell } from './AppShell';
import type { Folder } from '@/types';
import type { LicenseStatus } from '@/types/license';

export const meta = { width: 500 };

const now = new Date();

const folders: Folder[] = [
  { id: '1', name: 'Work', icon: 'briefcase', isDefault: false, createdAt: now },
  { id: '2', name: 'Personal', icon: 'user', isDefault: false, createdAt: now },
  { id: '3', name: 'Finance', icon: 'dollar', isDefault: false, createdAt: now },
];

const licenseStatus: LicenseStatus = {
  is_active: true,
  activation_usage: 1,
  activation_limit: 3,
};

export default function Scenario() {
  return (
    <AppShell
      license={{
        isPro: true,
        licenseStatus,
      }}
      realFolders={folders}
      initialRoute="/settings"
      width={500}
      height={600}
    />
  );
}
