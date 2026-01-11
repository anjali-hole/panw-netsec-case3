"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

type Profile = { id: string; name: string };

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

const PROFILES_KEY = "wellness_profiles_v1";
const ACTIVE_PROFILE_KEY = "wellness_active_profile_v1";

const LEGACY_GOALS_KEY = "wellness_goals_v1";
const goalsKey = (profileId: string) => `wellness_goals_v1:${profileId}`;

const LEGACY_PERMS_KEY = "wellness_permissions_v1";
const permsKey = (profileId: string) => `wellness_permissions_v1:${profileId}`;

const PERMS_EVENT = "wellness:permissions-changed";

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function loadProfiles(): Profile[] {
  const profiles = safeParse<Profile[]>(localStorage.getItem(PROFILES_KEY));
  if (profiles && profiles.length > 0) return profiles;

  const defaultProfile: Profile = { id: "default", name: "Default" };
  localStorage.setItem(PROFILES_KEY, JSON.stringify([defaultProfile]));
  localStorage.setItem(ACTIVE_PROFILE_KEY, defaultProfile.id);
  return [defaultProfile];
}

function loadActiveProfileId(profiles: Profile[]) {
  const active = localStorage.getItem(ACTIVE_PROFILE_KEY);
  if (active && profiles.some((p) => p.id === active)) return active;
  const fallback = profiles[0]?.id ?? "default";
  localStorage.setItem(ACTIVE_PROFILE_KEY, fallback);
  return fallback;
}

function loadGoals(profileId: string): Goals {
  const per = safeParse<Goals>(localStorage.getItem(goalsKey(profileId)));
  if (per) return per;
  const legacy = safeParse<Goals>(localStorage.getItem(LEGACY_GOALS_KEY));
  return legacy ?? {};
}

function loadPerms(profileId: string): Permissions {
  const per = safeParse<Partial<Permissions>>(localStorage.getItem(permsKey(profileId)));
  if (per) return { ...DEFAULT_PERMS, ...per };

  const legacy = safeParse<Partial<Permissions>>(localStorage.getItem(LEGACY_PERMS_KEY));
  if (legacy) return { ...DEFAULT_PERMS, ...legacy };

  return DEFAULT_PERMS;
}

function savePerms(profileId: string, perms: Permissions) {
  localStorage.setItem(permsKey(profileId), JSON.stringify(perms));
  localStorage.setItem(LEGACY_PERMS_KEY, JSON.stringify(perms));
  window.dispatchEvent(new Event(PERMS_EVENT));
}

export default function LoginPage() {
  const [hydrated, setHydrated] = React.useState(false);

  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = React.useState<string>("");

  const [name, setName] = React.useState("");
  const [goals, setGoals] = React.useState<Goals>({});
  const [perms, setPerms] = React.useState<Permissions>(DEFAULT_PERMS);

  React.useEffect(() => {
    const p = loadProfiles();
    const active = loadActiveProfileId(p);

    setProfiles(p);
    setActiveProfileId(active);

    setGoals(loadGoals(active));
    setPerms(loadPerms(active));

    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated || !activeProfileId) return;

    localStorage.setItem(ACTIVE_PROFILE_KEY, activeProfileId);

    setGoals(loadGoals(activeProfileId));
    setPerms(loadPerms(activeProfileId));
  }, [activeProfileId, hydrated]);

  React.useEffect(() => {
    if (!hydrated || !activeProfileId) return;
    savePerms(activeProfileId, perms);
  }, [perms, hydrated, activeProfileId]);

  const createProfile = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const id = `p_${Math.random().toString(36).slice(2, 10)}`;
    const next = [...profiles, { id, name: trimmed }];

    setProfiles(next);
    localStorage.setItem(PROFILES_KEY, JSON.stringify(next));

    localStorage.setItem(ACTIVE_PROFILE_KEY, id);
    setActiveProfileId(id);

    setGoals({});
    setPerms(DEFAULT_PERMS);

    setName("");
    toast.success("Profile created", { description: `Switched to "${trimmed}".` });
  };

  const saveGoals = () => {
    if (!activeProfileId) return;

    localStorage.setItem(goalsKey(activeProfileId), JSON.stringify(goals));
    localStorage.setItem(LEGACY_GOALS_KEY, JSON.stringify(goals));

    toast.success("Goals saved", {
      description: "Used in Daily Brief (Goal check) + insights tooling.",
    });
  };

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="h-8 w-40 rounded bg-muted" />
        <div className="mt-4 h-32 rounded-xl border bg-muted/20" />
        <div className="mt-4 h-48 rounded-xl border bg-muted/20" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Welcome</h1>
        <p className="text-sm text-muted-foreground">
          Choose a profile and set permissions + goals (frontend-only prototype).
        </p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={activeProfileId} onValueChange={setActiveProfileId}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Select profile" />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="space-y-1">
              <Label>New profile name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Anjali"
              />
            </div>
            <Button onClick={createProfile} variant="outline">
              Create profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Permissions (login flow) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data permissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PermRow
            label="Sleep"
            desc="Enable sleep duration signals."
            checked={perms.sleep}
            onChange={(v) => setPerms((p) => ({ ...p, sleep: v }))}
          />
          <Separator />
          <PermRow
            label="Activity"
            desc="Enable steps / active minutes signals."
            checked={perms.activity}
            onChange={(v) => setPerms((p) => ({ ...p, activity: v }))}
          />
          <Separator />
          <PermRow
            label="Nutrition"
            desc="Enable sugar / calories signals."
            checked={perms.nutrition}
            onChange={(v) => setPerms((p) => ({ ...p, nutrition: v }))}
          />
          <Separator />
          <PermRow
            label="Vitals"
            desc="Enable resting heart rate signals."
            checked={perms.vitals}
            onChange={(v) => setPerms((p) => ({ ...p, vitals: v }))}
          />

          <p className="text-xs text-muted-foreground">
            These permissions control what appears on Dashboard + Insights.
          </p>
        </CardContent>
      </Card>

      {/* Goals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your goals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <Label>Sleep target (hours)</Label>
              <Input
                inputMode="decimal"
                value={goals.sleepTargetHours ?? ""}
                onChange={(e) =>
                  setGoals((g) => ({
                    ...g,
                    sleepTargetHours:
                      e.target.value === "" ? undefined : Number(e.target.value),
                  }))
                }
                placeholder="e.g., 7.5"
              />
            </div>

            <div className="space-y-1">
              <Label>Steps target</Label>
              <Input
                inputMode="numeric"
                value={goals.stepsTarget ?? ""}
                onChange={(e) =>
                  setGoals((g) => ({
                    ...g,
                    stepsTarget:
                      e.target.value === "" ? undefined : Number(e.target.value),
                  }))
                }
                placeholder="e.g., 8000"
              />
            </div>

            <div className="space-y-1">
              <Label>Sugar max (g)</Label>
              <Input
                inputMode="numeric"
                value={goals.sugarMaxG ?? ""}
                onChange={(e) =>
                  setGoals((g) => ({
                    ...g,
                    sugarMaxG:
                      e.target.value === "" ? undefined : Number(e.target.value),
                  }))
                }
                placeholder="e.g., 40"
              />
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={saveGoals}>Save goals</Button>
            <Button asChild>
              <Link href="/dashboard">Continue to dashboard</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/settings">More settings</Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Goals are used in Daily Brief (“Goal check”) and insights tooling.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function PermRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}