"use client";

import * as React from "react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type Settings = {
  localOnly: boolean;
  persistDemoData: boolean;
  insightSensitivity: "conservative" | "balanced" | "sensitive";
  showExplanations: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
};

type Permissions = {
  sleep: boolean;
  activity: boolean;
  nutrition: boolean;
  vitals: boolean;
};

type Goals = {
  sleepTargetHours?: number;
  stepsTarget?: number;
  sugarMaxG?: number;
};

type Profile = {
  id: string;
  name: string;
};

const DEFAULTS: Settings = {
  localOnly: true,
  persistDemoData: false,
  insightSensitivity: "balanced",
  showExplanations: true,
  highContrast: false,
  reduceMotion: false,
};

const DEFAULT_PERMS: Permissions = {
  sleep: true,
  activity: true,
  nutrition: true,
  vitals: true,
};

// Base keys
const PROFILES_KEY = "wellness_profiles_v1";
const ACTIVE_PROFILE_KEY = "wellness_active_profile_v1";

// Per-profile keys
const settingsKey = (profileId: string) => `wellness_settings_v1:${profileId}`;
const permsKey = (profileId: string) => `wellness_permissions_v1:${profileId}`;

// Goals keys
const LEGACY_GOALS_KEY = "wellness_goals_v1";
const goalsKey = (profileId: string) => `wellness_goals_v1:${profileId}`;

const LEGACY_SETTINGS_KEY = "wellness_settings_v1";
const LEGACY_PERMS_KEY = "wellness_permissions_v1";

export const PERMS_EVENT = "wellness:permissions-changed";

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

function loadSettings(profileId: string): Settings {
  const perProfile = safeParse<Partial<Settings>>(localStorage.getItem(settingsKey(profileId)));
  if (perProfile) return { ...DEFAULTS, ...perProfile };

  const legacy = safeParse<Partial<Settings>>(localStorage.getItem(LEGACY_SETTINGS_KEY));
  if (legacy) return { ...DEFAULTS, ...legacy };

  return DEFAULTS;
}

function loadPerms(profileId: string): Permissions {
  const perProfile = safeParse<Partial<Permissions>>(localStorage.getItem(permsKey(profileId)));
  if (perProfile) return { ...DEFAULT_PERMS, ...perProfile };

  const legacy = safeParse<Partial<Permissions>>(localStorage.getItem(LEGACY_PERMS_KEY));
  if (legacy) return { ...DEFAULT_PERMS, ...legacy };

  return DEFAULT_PERMS;
}

function loadGoals(profileId: string): Goals {
  const per = safeParse<Goals>(localStorage.getItem(goalsKey(profileId)));
  if (per) return per;

  const legacy = safeParse<Goals>(localStorage.getItem(LEGACY_GOALS_KEY));
  return legacy ?? {};
}

export default function SettingsView() {
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [hydrated, setHydrated] = React.useState(false);
  const [activeProfileId, setActiveProfileId] = React.useState<string>("");

  const [settings, setSettings] = React.useState<Settings>(DEFAULTS);
  const [perms, setPerms] = React.useState<Permissions>(DEFAULT_PERMS);
  const [goals, setGoals] = React.useState<Goals>({});

  React.useEffect(() => {
    const p = loadProfiles();
    const activeId = loadActiveProfileId(p);

    setProfiles(p);
    setActiveProfileId(activeId);

    setSettings(loadSettings(activeId));
    setPerms(loadPerms(activeId));
    setGoals(loadGoals(activeId));
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated || !activeProfileId) return;
  
    localStorage.setItem(ACTIVE_PROFILE_KEY, activeProfileId);
  
    const nextSettings = loadSettings(activeProfileId);
    const nextPerms = loadPerms(activeProfileId);
    const nextGoals = loadGoals(activeProfileId);
  
    setSettings(nextSettings);
    setPerms(nextPerms);
    setGoals(nextGoals);
  
    window.dispatchEvent(new Event(PERMS_EVENT));
  }, [activeProfileId, hydrated]);

  React.useEffect(() => {
    if (!hydrated || !activeProfileId) return;

    try {
      localStorage.setItem(settingsKey(activeProfileId), JSON.stringify(settings));
      localStorage.setItem(LEGACY_SETTINGS_KEY, JSON.stringify(settings));

      document.documentElement.classList.toggle("high-contrast", settings.highContrast);
      document.documentElement.classList.toggle("reduce-motion", settings.reduceMotion);
    } catch {}
  }, [settings, activeProfileId]);

  React.useEffect(() => {
    if (!activeProfileId) return;

    try {
      localStorage.setItem(permsKey(activeProfileId), JSON.stringify(perms));
      localStorage.setItem(LEGACY_PERMS_KEY, JSON.stringify(perms));

      window.dispatchEvent(new Event(PERMS_EVENT));
    } catch {}
  }, [perms, activeProfileId]);

  React.useEffect(() => {
    if (!activeProfileId) return;

    try {
      localStorage.setItem(goalsKey(activeProfileId), JSON.stringify(goals));
      localStorage.setItem(LEGACY_GOALS_KEY, JSON.stringify(goals));
    } catch {}
  }, [goals, activeProfileId]);

  const purgeData = () => {
    if (!activeProfileId) return;

    localStorage.removeItem(settingsKey(activeProfileId));
    localStorage.removeItem(permsKey(activeProfileId));
    localStorage.removeItem(goalsKey(activeProfileId));

    localStorage.removeItem(LEGACY_SETTINGS_KEY);
    localStorage.removeItem(LEGACY_PERMS_KEY);
    localStorage.removeItem(LEGACY_GOALS_KEY);

    setSettings(DEFAULTS);
    setPerms(DEFAULT_PERMS);
    setGoals({});

    window.dispatchEvent(new Event(PERMS_EVENT));

    toast.success("Data cleared", {
      description: "Local settings, permissions, and goals for this profile were removed.",
    });
  };

  const addProfile = () => {
    const name = prompt("Profile name?");
    if (!name) return;

    const id = `p_${Math.random().toString(36).slice(2, 10)}`;
    const next = [...profiles, { id, name }];

    setProfiles(next);
    localStorage.setItem(PROFILES_KEY, JSON.stringify(next));
    setActiveProfileId(id);

    toast.success("Profile created", { description: `Switched to "${name}".` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Control privacy, AI behavior, accessibility, data permissions, and goals for this prototype.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={activeProfileId} onValueChange={setActiveProfileId}>
            <SelectTrigger className="w-[220px]">
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

          <Button variant="outline" onClick={addProfile}>
            New profile
          </Button>
        </div>
      </div>

      {/* Profile & Goals */}
      <Card>
        <CardHeader>
          <CardTitle>Profile & Goals</CardTitle>
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
                    sleepTargetHours: e.target.value === "" ? undefined : Number(e.target.value),
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
                    stepsTarget: e.target.value === "" ? undefined : Number(e.target.value),
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
                    sugarMaxG: e.target.value === "" ? undefined : Number(e.target.value),
                  }))
                }
                placeholder="e.g., 40"
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Used by Daily Brief (“Goal check”) and the experiment tooling on Insights.
          </p>
        </CardContent>
      </Card>

      {/* Data Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Data Permissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <SettingToggle
            label="Sleep"
            description="Allow the app to use sleep duration data."
            checked={perms.sleep}
            onChange={(v) => setPerms((p) => ({ ...p, sleep: v }))}
          />

          <Separator />

          <SettingToggle
            label="Activity"
            description="Allow the app to use activity data (e.g., steps)."
            checked={perms.activity}
            onChange={(v) => setPerms((p) => ({ ...p, activity: v }))}
          />

          <Separator />

          <SettingToggle
            label="Nutrition"
            description="Allow the app to use nutrition data (e.g., sugar, calories)."
            checked={perms.nutrition}
            onChange={(v) => setPerms((p) => ({ ...p, nutrition: v }))}
          />

          <Separator />

          <SettingToggle
            label="Vitals"
            description="Allow the app to use vitals (e.g., resting heart rate)."
            checked={perms.vitals}
            onChange={(v) => setPerms((p) => ({ ...p, vitals: v }))}
          />

          <p className="text-xs text-muted-foreground">
            These are frontend-only permissions for the prototype (device-local, not account-based).
          </p>
        </CardContent>
      </Card>

      {/* Data & Privacy */}
      <Card>
        <CardHeader>
          <CardTitle>Data & Privacy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <SettingToggle
            label="Local-only mode"
            description="Keep data on-device for this demo. No cloud storage."
            checked={settings.localOnly}
            onChange={(v) => setSettings((s) => ({ ...s, localOnly: v }))}
          />

          <Separator />

          <SettingToggle
            label="Allow saving demo data to disk"
            description="When off, the app avoids writing files."
            checked={settings.persistDemoData}
            onChange={(v) => setSettings((s) => ({ ...s, persistDemoData: v }))}
          />

          <Button variant="destructive" onClick={purgeData}>
            Delete my data (this profile)
          </Button>
        </CardContent>
      </Card>

      {/* AI Controls */}
      <Card>
        <CardHeader>
          <CardTitle>AI Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Insight sensitivity</Label>
            <Select
              value={settings.insightSensitivity}
              onValueChange={(v) =>
                setSettings((s) => ({
                  ...s,
                  insightSensitivity: v as Settings["insightSensitivity"],
                }))
              }
            >
              <SelectTrigger className="w-[240px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conservative">Conservative</SelectItem>
                <SelectItem value="balanced">Balanced</SelectItem>
                <SelectItem value="sensitive">Sensitive</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Controls how easily anomalies are surfaced.
            </p>
          </div>

          <Separator />

          <SettingToggle
            label="Always show explanations"
            description="Display evidence and limitations with every insight."
            checked={settings.showExplanations}
            onChange={(v) => setSettings((s) => ({ ...s, showExplanations: v }))}
          />
        </CardContent>
      </Card>

      {/* Accessibility & Responsible AI */}
      <Card>
        <CardHeader>
          <CardTitle>Accessibility & Responsible AI</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <SettingToggle
            label="High contrast"
            description="Improves readability and chart contrast."
            checked={settings.highContrast}
            onChange={(v) => setSettings((s) => ({ ...s, highContrast: v }))}
          />

          <Separator />

          <SettingToggle
            label="Reduce motion"
            description="Minimizes animations for accessibility."
            checked={settings.reduceMotion}
            onChange={(v) => setSettings((s) => ({ ...s, reduceMotion: v }))}
          />

          <Separator />

          <div className="space-y-2 text-sm">
            <div className="font-medium">Limitations</div>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li>Correlation does not imply causation.</li>
              <li>This is not medical advice.</li>
              <li>Insights depend on data quality and completeness.</li>
              <li>Demo data may be synthetic.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


function SettingToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-1">
        <Label>{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}