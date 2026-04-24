import { AppShell } from './AppShell';
import type { Password, Folder } from '@/types';

export const meta = { width: 500 };

const now = new Date();

const folders: Folder[] = [
  { id: '1', name: 'Work', icon: 'briefcase', isDefault: false, createdAt: now },
  { id: '2', name: 'Personal', icon: 'user', isDefault: false, createdAt: now },
  { id: '3', name: 'Finance', icon: 'dollar', isDefault: false, createdAt: now },
];

const passwords: Password[] = [
  {
    id: '1', name: 'GitHub', username: 'alex.chen', email: 'alex.chen@company.com',
    password: 'Gh!Hub2024#X9', website: 'https://github.com', notes: '',
    recoveryEmail: 'alex.chen@gmail.com', isFavorite: true, folderId: '1',
    createdAt: new Date('2024-01-15'), updatedAt: new Date('2024-11-02'),
  },
  {
    id: '2', name: 'AWS Console', username: 'alex.chen@company.com', email: '',
    password: 'Aws@Pr0d!k8s#2024', website: 'https://console.aws.amazon.com', notes: 'Production account — handle with care',
    recoveryEmail: '', isFavorite: true, folderId: '1',
    createdAt: new Date('2024-02-10'), updatedAt: new Date('2024-10-20'),
  },
  {
    id: '3', name: 'Figma', username: 'alex.chen@company.com', email: '',
    password: 'F1gm@Des!gn24', website: 'https://figma.com', notes: '',
    recoveryEmail: '', isFavorite: false, folderId: '1',
    createdAt: new Date('2024-03-01'), updatedAt: new Date('2024-09-15'),
  },
  {
    id: '4', name: 'Gmail', username: 'alex.chen@gmail.com', email: '',
    password: 'Gm@!l$ecure99', website: 'https://mail.google.com', notes: '',
    recoveryEmail: 'backup@proton.me', isFavorite: false, folderId: '2',
    createdAt: new Date('2024-01-05'), updatedAt: new Date('2024-08-12'),
  },
  {
    id: '5', name: 'Spotify', username: 'alex.chen@gmail.com', email: '',
    password: 'Sp0t!fyR0cks', website: 'https://spotify.com', notes: '',
    recoveryEmail: '', isFavorite: false, folderId: '2',
    createdAt: new Date('2024-04-20'), updatedAt: new Date('2024-07-01'),
  },
  {
    id: '6', name: 'Chase Bank', username: 'alex.chen@gmail.com', email: '',
    password: 'Ch@se$ecure!2024', website: 'https://chase.com', notes: 'Joint account with partner',
    recoveryEmail: '', isFavorite: false, folderId: '3',
    createdAt: new Date('2024-05-10'), updatedAt: new Date('2024-06-30'),
  },
  {
    id: '7', name: 'Stripe', username: 'alex@company.com', email: '',
    password: 'Str!pe@Pay2024', website: 'https://stripe.com', notes: '',
    recoveryEmail: '', isFavorite: false, folderId: '3',
    createdAt: new Date('2024-06-01'), updatedAt: new Date('2024-11-01'),
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
      initialRoute="/dashboard"
      width={500}
      height={600}
    />
  );
}
