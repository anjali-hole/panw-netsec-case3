export const PROFILES_KEY = "wellness_profiles_v1";
export const ACTIVE_PROFILE_KEY = "wellness_active_profile_v1";

export const settingsKey = (profileId: string) => `wellness_settings_v1:${profileId}`;
export const permsKey = (profileId: string) => `wellness_permissions_v1:${profileId}`;
export const simKey = (profileId: string) => `wellness_simulator_v1:${profileId}`;
export const experimentKey = (profileId: string) => `wellness_experiment_v1:${profileId}`;

export const LEGACY_PERMS_KEY = "wellness_permissions_v1";
export const LEGACY_SETTINGS_KEY = "wellness_settings_v1";

const STORAGE_EVT = "wellness:storage-changed";

export function emitWellnessStorageChanged() {
  window.dispatchEvent(new Event(STORAGE_EVT));
}

export function onWellnessStorageChanged(cb: () => void) {
  const onStorage = (e: StorageEvent) => {
    // Only react to relevant keys
    const k = e.key ?? "";
    if (
      k === "" ||
      k === ACTIVE_PROFILE_KEY ||
      k === LEGACY_PERMS_KEY ||
      k === LEGACY_SETTINGS_KEY ||
      k.startsWith("wellness_permissions_v1:") ||
      k.startsWith("wellness_settings_v1:") ||
      k.startsWith("wellness_simulator_v1:") ||
      k.startsWith("wellness_experiment_v1:")
    ) {
      cb();
    }
  };

  window.addEventListener(STORAGE_EVT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(STORAGE_EVT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function getActiveProfileId(): string {
  try {
    const active = localStorage.getItem(ACTIVE_PROFILE_KEY);
    if (active) return active;
  } catch {}
  return "default";
}

export function getProfilePerms<T>(defaults: T): T {
  const pid = getActiveProfileId();

  const scoped = safeParse<Partial<T>>(localStorage.getItem(permsKey(pid)));
  if (scoped) return { ...defaults, ...scoped };

  const legacy = safeParse<Partial<T>>(localStorage.getItem(LEGACY_PERMS_KEY));
  if (legacy) return { ...defaults, ...legacy };

  return defaults;
}

export function getProfileSettings<T>(defaults: T): T {
  const pid = getActiveProfileId();

  const scoped = safeParse<Partial<T>>(localStorage.getItem(settingsKey(pid)));
  if (scoped) return { ...defaults, ...scoped };

  const legacy = safeParse<Partial<T>>(localStorage.getItem(LEGACY_SETTINGS_KEY));
  if (legacy) return { ...defaults, ...legacy };

  return defaults;
}

export function setProfileValue(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
  emitWellnessStorageChanged();
}