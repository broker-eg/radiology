// camelCase domain types — the services map database rows to these.

export type Plan = 'free' | 'pro';
export type Role = 'user' | 'admin';
export type AppKind = 'integrated' | 'external';
export type AppStatus = 'Integrated' | 'Published' | 'Draft';
export type AppTier = 'free' | 'pro';

export interface Category {
  name: string;
  icon: string;
  subtitle: string;
  color: string;
  sortOrder: number;
}

export interface SuiteApp {
  id: string;
  name: string;
  category: string;
  modality: string;
  status: AppStatus;
  badge: string | null;
  description: string;
  duplicateOf: string | null;
  kind: AppKind;
  externalUrl: string | null;
  htmlPath: string | null;
  coverPath: string | null;
  coverUrl: string | null;
  tier: AppTier;
  sortOrder: number;
  updatedAt: string;
}

export interface Profile {
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
  plan: Plan;
  planChangedAt: string | null;
  heroAppId: string | null;
  /** When the welcome tour was completed or skipped; null → show it. */
  onboardedAt: string | null;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
  plan: Plan;
  planChangedAt: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  favoritesCount: number;
}

/** Payload the admin app form submits; files are optional on edit. */
export interface AppDraft {
  id: string | null;
  name: string;
  category: string;
  modality: string;
  status: AppStatus;
  tier: AppTier;
  badge: string;
  description: string;
  duplicateOf: string;
  kind: AppKind;
  externalUrl: string;
  html: string | null;
  coverFile: File | null;
}

/** A generator saved on this device for offline use; its details are kept with it. */
export interface OfflineApp {
  appId: string;
  name: string;
  category: string;
  modality: string;
  badge: string | null;
  tier: AppTier;
  htmlPath: string;
  coverUrl: string | null;
  /** The app's updated_at when saved: an older value than the catalog's means an update. */
  version: string;
  bytes: number;
  savedAt: string;
}
