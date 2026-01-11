// src/contexts/PermissionsContext.tsx
"use client";

import * as React from "react";

export type Permissions = {
  sleep: boolean;
  activity: boolean;
  nutrition: boolean;
  vitals: boolean;
};

const DEFAULTS: Permissions = {
  sleep: true,
  activity: true,
  nutrition: true,
  vitals: true,
};

const PermissionsContext = React.createContext<{
  permissions: Permissions;
  setPermissions: React.Dispatch<React.SetStateAction<Permissions>>;
} | null>(null);

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const [permissions, setPermissions] = React.useState<Permissions>(() => {
    try {
      const raw = localStorage.getItem("wellness_permissions_v1");
      return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  });

  React.useEffect(() => {
    localStorage.setItem(
      "wellness_permissions_v1",
      JSON.stringify(permissions)
    );
  }, [permissions]);

  return (
    <PermissionsContext.Provider value={{ permissions, setPermissions }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const ctx = React.useContext(PermissionsContext);
  if (!ctx) throw new Error("usePermissions must be used inside PermissionsProvider");
  return ctx;
}