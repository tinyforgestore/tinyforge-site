import { AppShell } from './AppShell';
import type { Password, Folder } from '@/types';

export const meta = { width: 500 };

const now = new Date();

const folders: Folder[] = [
  { id: '1', name: 'Work', icon: 'briefcase', isDefault: false, createdAt: now },
];

const passwords: Password[] = [
  {
    id: 'pw-aws-001',
    name: 'AWS Console',
    username: 'alex.chen@company.com',
    email: '',
    password: 'Aws@Pr0d!k8s#2024',
    website: 'https://console.aws.amazon.com',
    notes: 'Production account — handle with care. MFA enabled.',
    recoveryEmail: 'security@company.com',
    isFavorite: true,
    folderId: '1',
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-11-01'),
  },
];

export default function Scenario() {
  return (
    <AppShell
      passwords={{
        allPasswords: passwords,
        filteredPasswords: passwords,
        selectedFolder: '-1',
      }}
      realFolders={folders}
      initialRoute="/password/pw-aws-001"
      width={500}
      height={600}
    />
  );
}
