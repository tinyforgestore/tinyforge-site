export type LicenseMode = 'activated' | 'trial' | 'first_launch' | 'device_limit';

export interface LicenseInfo {
  licenseKey: string;
  instanceId: string;
  activatedAt: string;
}

export interface UseLicenseReturn {
  mode: LicenseMode;
  licenseInfo: LicenseInfo | null;
  deactivate: () => Promise<void>;
  activate: (key: string) => Promise<void>;
  openActivationWindow: () => void;
}

export function useLicense(): UseLicenseReturn {
  return {
    mode: 'activated',
    licenseInfo: null,
    deactivate: () => Promise.resolve(),
    activate: () => Promise.resolve(),
    openActivationWindow: () => {},
  };
}
