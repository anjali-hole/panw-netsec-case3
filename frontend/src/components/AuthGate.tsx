"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

const ACTIVE_PROFILE_KEY = "wellness_active_profile_v1";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const active = localStorage.getItem(ACTIVE_PROFILE_KEY);

    if (!active) {
      // avoid redirect loop if already on login
      if (pathname !== "/login") router.replace("/login");
      return;
    }

    setReady(true);
  }, [router, pathname]);

  if (!ready) return null;
  return <>{children}</>;
}