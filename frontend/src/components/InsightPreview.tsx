"use client";

import * as React from "react";
import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Insight = {
  id: string;
  type: "correlation" | "anomaly" | string;
  title: string;
  summary: string;
  responsible_note?: string;
};

type Permissions = {
  sleep: boolean;
  activity: boolean;
  nutrition: boolean;
  vitals: boolean;
};

const DEFAULT_PERMS: Permissions = {
  sleep: true,
  activity: true,
  nutrition: true,
  vitals: true,
};


const ACTIVE_PROFILE_KEY = "wellness_active_profile_v1";
const LEGACY_PERMS_KEY = "wellness_permissions_v1";
const permsKey = (profileId: string) => `wellness_permissions_v1:${profileId}`;

// same-tab event 
const PERMS_EVENT = "wellness:permissions-changed";

function loadPerms(): Permissions {
  try {
    const active = localStorage.getItem(ACTIVE_PROFILE_KEY);
    const raw =
      (active && localStorage.getItem(permsKey(active))) ||
      localStorage.getItem(LEGACY_PERMS_KEY);

    if (!raw) return DEFAULT_PERMS;
    return { ...DEFAULT_PERMS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PERMS;
  }
}

function insightAllowed(i: Insight, p: Permissions) {
  const text = `${i.title} ${i.summary}`.toLowerCase();

  const mentionsSleep = text.includes("sleep");
  const mentionsSteps = text.includes("steps") || text.includes("active") || text.includes("activity");
  const mentionsNutrition = text.includes("sugar") || text.includes("calorie") || text.includes("nutrition");
  const mentionsVitals = text.includes("resting hr") || text.includes("heart") || text.includes("hr");

  if (mentionsSleep && !p.sleep) return false;
  if (mentionsSteps && !p.activity) return false;
  if (mentionsNutrition && !p.nutrition) return false;
  if (mentionsVitals && !p.vitals) return false;

  return true;
}

export default function InsightPreview({ insights }: { insights: Insight[] }) {
  const [perms, setPerms] = React.useState<Permissions>(DEFAULT_PERMS);

  React.useEffect(() => {
    const refresh = () => setPerms(loadPerms());
    refresh();

    const onStorage = (e: StorageEvent) => {
      if (
        e.key === LEGACY_PERMS_KEY ||
        e.key === ACTIVE_PROFILE_KEY ||
        (e.key && e.key.startsWith("wellness_permissions_v1:"))
      ) {
        refresh();
      }
    };

    const onSameTab = () => refresh();

    window.addEventListener("storage", onStorage);
    window.addEventListener(PERMS_EVENT, onSameTab);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(PERMS_EVENT, onSameTab);
    };
  }, []);

  //filter by perms, then sort anomalies first, then take top 2
  const visible = React.useMemo(() => {
    const allowed = insights.filter((i) => insightAllowed(i, perms));

    const sorted = allowed.slice().sort((a, b) => {
      const aRank = a.type === "anomaly" ? 0 : 1;
      const bRank = b.type === "anomaly" ? 0 : 1;
      return aRank - bRank;
    });

    return sorted.slice(0, 2);
  }, [insights, perms]);

  return (
    <CardContent className="space-y-2">
      {visible.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          No patterns to show (or they’re hidden by your Data Permissions).
        </div>
      ) : (
        visible.map((i) => (
          <div key={i.id} className="rounded-lg border p-3 justify-center">
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium">{i.title}</div>
              <Badge variant={i.type === "anomaly" ? "destructive" : "secondary"}>
                {i.type}
              </Badge>
            </div>
            <div className="mt-1 text-sm text-muted-foreground">{i.summary}</div>
            {i.responsible_note && (
              <div className="mt-2 text-xs text-muted-foreground">{i.responsible_note}</div>
            )}
          </div>
        ))
      )}
    </CardContent>
  );
}