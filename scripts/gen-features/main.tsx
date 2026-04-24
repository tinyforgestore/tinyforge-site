import React from 'react';
import { createRoot } from 'react-dom/client';
import './app-entry.generated';

const params = new URLSearchParams(window.location.search);
const scenarioId = params.get('s') ?? '';
const app = params.get('app') ?? '';

async function mount() {
  const modules = import.meta.glob('./scenarios/**/*.tsx');
  const key = `./scenarios/${app}/${scenarioId}.tsx`;
  const mod = modules[key];
  if (!mod) {
    document.body.innerHTML = `<p style="color:red">Scenario not found: ${key}</p>`;
    return;
  }
  const { default: Scenario } = await mod() as any;
  const root = document.getElementById('root')!;
  createRoot(root).render(<Scenario />);
}

mount();
