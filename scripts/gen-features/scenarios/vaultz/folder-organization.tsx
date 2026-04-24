import { AppShell } from './AppShell';
import type { Password, Folder } from '@/types';

export const meta = { width: 500 };

const now = new Date();

const folders: Folder[] = [
  { id: '1', name: 'Work', icon: 'briefcase', isDefault: false, createdAt: now },
  { id: '2', name: 'Personal', icon: 'user', isDefault: false, createdAt: now },
  { id: '3', name: 'Finance', icon: 'dollar', isDefault: false, createdAt: now },
  { id: '4', name: 'Home', icon: 'home', isDefault: false, createdAt: now },
];

const passwords: Password[] = [
  {
    id: '1', name: 'GitHub', username: 'alex.chen', email: '',
    password: 'Gh!Hub2024#X9', website: 'https://github.com', notes: '',
    recoveryEmail: '', isFavorite: false, folderId: '1',
    createdAt: new Date('2024-01-15'), updatedAt: new Date('2024-11-02'),
  },
  {
    id: '2', name: 'Notion', username: 'alex.chen@company.com', email: '',
    password: 'N0t10n@Work!', website: 'https://notion.so', notes: '',
    recoveryEmail: '', isFavorite: false, folderId: '1',
    createdAt: new Date('2024-02-01'), updatedAt: new Date('2024-10-10'),
  },
  {
    id: '3', name: 'Slack', username: 'alex.chen@company.com', email: '',
    password: 'Sl@ckT3am!99', website: 'https://slack.com', notes: '',
    recoveryEmail: '', isFavorite: false, folderId: '1',
    createdAt: new Date('2024-03-05'), updatedAt: new Date('2024-09-20'),
  },
  {
    id: '4', name: 'Netflix', username: 'alex.chen@gmail.com', email: '',
    password: 'N3tfl!x$tream24', website: 'https://netflix.com', notes: '',
    recoveryEmail: '', isFavorite: false, folderId: '2',
    createdAt: new Date('2024-01-10'), updatedAt: new Date('2024-08-15'),
  },
  {
    id: '5', name: 'Spotify', username: 'alex.chen@gmail.com', email: '',
    password: 'Sp0t!fyR0cks', website: 'https://spotify.com', notes: '',
    recoveryEmail: '', isFavorite: false, folderId: '2',
    createdAt: new Date('2024-04-20'), updatedAt: new Date('2024-07-01'),
  },
  {
    id: '6', name: 'Chase Bank', username: 'alex.chen@gmail.com', email: '',
    password: 'Ch@se$ecure!2024', website: 'https://chase.com', notes: '',
    recoveryEmail: '', isFavorite: false, folderId: '3',
    createdAt: new Date('2024-05-10'), updatedAt: new Date('2024-06-30'),
  },
  {
    id: '7', name: 'Robinhood', username: 'alex.chen@gmail.com', email: '',
    password: 'R0b!nh00d#Inv3st', website: 'https://robinhood.com', notes: '',
    recoveryEmail: '', isFavorite: false, folderId: '3',
    createdAt: new Date('2024-06-01'), updatedAt: new Date('2024-11-01'),
  },
  {
    id: '8', name: 'Ring', username: 'alex.chen@gmail.com', email: '',
    password: 'R!ngDoorbell24', website: 'https://ring.com', notes: '',
    recoveryEmail: '', isFavorite: false, folderId: '4',
    createdAt: new Date('2024-07-15'), updatedAt: new Date('2024-10-05'),
  },
];

// Show Work folder selected
const workPasswords = passwords.filter(p => p.folderId === '1');

export default function Scenario() {
  return (
    <AppShell
      passwords={{
        allPasswords: passwords,
        filteredPasswords: workPasswords,
        selectedFolder: '1',
      }}
      realFolders={folders}
      initialRoute="/dashboard"
      width={500}
      height={600}
    />
  );
}
