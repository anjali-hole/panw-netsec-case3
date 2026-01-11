"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, CalendarDays } from "lucide-react";
import {
    Moon,
    Footprints,
    Candy,
    HeartPulse,
  } from "lucide-react";

type Insight = {
  id: string;
  type: string;
  title: string;
  summary: string;
  responsible_note?: string;
};

type Series = {
  date: string[];
  sleep_hours: number[];
  steps: number[];
  sugar_g: number[];
  resting_hr: number[];
};

type Goals = {
  sleepTargetHours?: number;
  stepsTarget?: number;
  sugarMaxG?: number;
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

const TILE = {
    sleep: {
      wrap: "bg-[hsl(173_58%_96%)] border-[hsl(173_58%_80%)]",
    },
    steps: {
      wrap: "bg-[hsl(222_47%_11%)]/6",
    },
    sugar: {
      wrap: "bg-[hsl(38_92%_96%)] border-[hsl(38_92%_82%)]",
    },
    hr: {
      wrap: "border-[hsl(12_85%_60%/0.35)] bg-[hsl(12_85%_60%/0.12)]",
    },
  } as const;
  
const ACTIVE_PROFILE_KEY = "wellness_active_profile_v1";

// goals
const LEGACY_GOALS_KEY = "wellness_goals_v1";
const goalsKey = (profileId: string) => `wellness_goals_v1:${profileId}`;

// perms
const LEGACY_PERMS_KEY = "wellness_permissions_v1";
const permsKey = (profileId: string) => `wellness_permissions_v1:${profileId}`;

// same-tab event 
const PERMS_EVENT = "wellness:permissions-changed";

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function loadGoals(): Goals {
  const active = localStorage.getItem(ACTIVE_PROFILE_KEY);
  const raw =
    (active && localStorage.getItem(goalsKey(active))) ||
    localStorage.getItem(LEGACY_GOALS_KEY);
  return safeParse<Goals>(raw) ?? {};
}

function loadPerms(): Permissions {
  try {
    const active = localStorage.getItem(ACTIVE_PROFILE_KEY);
    const raw =
      (active && localStorage.getItem(permsKey(active))) ||
      localStorage.getItem(LEGACY_PERMS_KEY);

    const parsed = safeParse<Partial<Permissions>>(raw);
    return parsed ? { ...DEFAULT_PERMS, ...parsed } : DEFAULT_PERMS;
  } catch {
    return DEFAULT_PERMS;
  }
}

function formatTodayLabel() {
  try {
    return new Date().toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Today";
  }
}

function fmtNum(n: number, digits = 0) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export default function DailyBriefCard({
  insights, 
  rangeDays, 
  series,
}: {
  insights: Insight[];
  rangeDays: number;
  series: Series | null;
}) {
  // goals not displayed
  const [goals, setGoals] = React.useState<Goals>({});
  const [perms, setPerms] = React.useState<Permissions>(DEFAULT_PERMS);

  React.useEffect(() => {
    const refresh = () => {
      setGoals(loadGoals());
      setPerms(loadPerms());
    };

    refresh();

    const onFocus = () => refresh();
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };

    const onStorage = (e: StorageEvent) => {
      if (
        e.key === ACTIVE_PROFILE_KEY ||
        e.key === LEGACY_GOALS_KEY ||
        (e.key && e.key.startsWith("wellness_goals_v1:")) ||
        e.key === LEGACY_PERMS_KEY ||
        (e.key && e.key.startsWith("wellness_permissions_v1:"))
      ) {
        refresh();
      }
    };

    const onSameTab = () => refresh();

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("storage", onStorage);
    window.addEventListener(PERMS_EVENT, onSameTab);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(PERMS_EVENT, onSameTab);
    };
  }, []);

  const latest = React.useMemo(() => {
    if (!series || series.date.length === 0) return null;
    const i = series.date.length - 1;

    return {
      systemDateLabel: formatTodayLabel(),
      dataDate: series.date[i],
      sleep: series.sleep_hours[i],
      steps: series.steps[i],
      sugar: series.sugar_g[i],
      hr: series.resting_hr[i],
    };
  }, [series]);

  // if all tiles are disabled, show a simple message
  const anyEnabled = perms.sleep || perms.activity || perms.nutrition || perms.vitals;

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            Daily Brief
          </span>

          <Badge variant="secondary" className="font-normal">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {latest ? latest.systemDateLabel : "Today"}
            </span>
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {!anyEnabled ? (
          <div className="rounded-lg border bg-muted/10 p-3 text-sm text-muted-foreground">
            No metrics enabled. Turn on permissions in Settings.
          </div>
        ) : !latest ? (
          <div className="rounded-lg border bg-muted/10 p-3 text-sm text-muted-foreground">
            No data available yet.
          </div>
        ) : (
            <div className="grid grid-cols-2 gap-2">
        {perms.sleep && (
            <div className={`rounded-md border p-2 ${TILE.sleep.wrap}`}>
            <div className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-[hsl(173_58%_35%)]" />
                <div>
                <div className="text-xs text-muted-foreground">Sleep</div>
                <div className="font-semibold">{fmtNum(latest.sleep, 2)} h</div>
                </div>
            </div>
            </div>
        )}

        {perms.activity && (
            <div className={`rounded-md border p-2 ${TILE.steps.wrap}`}>
            <div className="flex items-center gap-2">
                <Footprints className="h-4 w-4 text-muted-foreground" />
                <div>
                <div className="text-xs text-muted-foreground">Steps</div>
                <div className="font-semibold">{fmtNum(latest.steps, 0)}</div>
                </div>
            </div>
            </div>
        )}

        {perms.nutrition && (
            <div className={`rounded-md border p-2 ${TILE.sugar.wrap}`}>
            <div className="flex items-center gap-2">
                <Candy className="h-4 w-4 text-[hsl(38_92%_35%)]" />
                <div>
                <div className="text-xs text-muted-foreground">Sugar</div>
                <div className="font-semibold">{fmtNum(latest.sugar, 1)} g</div>
                </div>
            </div>
            </div>
        )}

        {perms.vitals && (
            <div className={`rounded-md border p-2 ${TILE.hr.wrap}`}>
            <div className="flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-[hsl(12_85%_60%)]" />
                <div>
                <div className="text-xs text-muted-foreground">Resting HR</div>
                <div className="font-semibold">{fmtNum(latest.hr, 1)} bpm</div>
                </div>
            </div>
            </div>
        )}
        </div>
        )}
      </CardContent>
    </Card>
  );
}