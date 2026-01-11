"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  BarChart,
  CartesianGrid,
  Label,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type MaybeNum = number | null;

type Props = {
  series: {
    date: string[];
    sleep_hours: MaybeNum[];
    steps: MaybeNum[];
    active_minutes: MaybeNum[];
    calories: MaybeNum[];
    sugar_g: MaybeNum[];
    resting_hr: MaybeNum[];
  };
};

type OverviewMetric = "sleep" | "steps" | "sugar" | "hr";

type Permissions = {
  sleep: boolean;
  activity: boolean;
  nutrition: boolean;
  vitals: boolean;
};

const PERMS_KEY = "wellness_permissions_v1";

const DEFAULT_PERMS: Permissions = {
  sleep: true,
  activity: true,
  nutrition: true,
  vitals: true,
};

const COLORS = {
  sleep: "hsl(173 72% 28%)",
  steps: "hsl(220 7% 11%)",
  sugar: "hsl(38 92% 45%)",
  hr: "hsl(12 85% 60%)",
  calories: "hsl(215 30% 32%)",
};

function formatValue(value: unknown, name?: string | number) {
  const key = String(name ?? "");
  if (value == null) return ["—", key || "Value"];

  const n = Number(value);
  if (!Number.isFinite(n)) return ["—", key || "Value"];

  if (key === "sleep") return [`${n.toFixed(2)} h`, "Sleep"];
  if (key === "steps") return [`${Math.round(n).toLocaleString()}`, "Steps"];
  if (key === "sugar") return [`${n.toFixed(1)} g`, "Sugar"];
  if (key === "hr") return [`${n.toFixed(1)} bpm`, "Resting HR"];
  if (key === "calories") return [`${Math.round(n)}`, "Calories"];
  return [String(value), key || "Value"];
}

function loadPerms(): Permissions {
  try {
    const raw = localStorage.getItem(PERMS_KEY);
    if (!raw) return DEFAULT_PERMS;
    return { ...DEFAULT_PERMS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PERMS;
  }
}

function hasMissing(values: MaybeNum[]) {
  return values.some((v) => v == null || Number.isNaN(v));
}

function Chip({
  label,
  active,
  color,
  onClick,
  disabled,
}: {
  label: string;
  active: boolean;
  color: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  const style: React.CSSProperties = active
    ? { backgroundColor: color, borderColor: color, color: "white" }
    : { backgroundColor: "transparent", borderColor: color, color };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="rounded-full border"
      style={style}
      onClick={onClick}
      aria-pressed={active}
      disabled={disabled}
    >
      {label}
    </Button>
  );
}

export default function TrendsCard({ series }: Props) {
  const data = series.date.map((date, i) => ({
    date,
    sleep: series.sleep_hours[i],
    steps: series.steps[i],
    sugar: series.sugar_g[i],
    hr: series.resting_hr[i],
    active: series.active_minutes[i],
    calories: series.calories[i],
  }));

  const nutritionHasGaps = React.useMemo(
    () => hasMissing(series.sugar_g) || hasMissing(series.calories),
    [series.sugar_g, series.calories]
  );

  const [perms, setPerms] = React.useState<Permissions>(DEFAULT_PERMS);
  React.useEffect(() => {
    setPerms(loadPerms());
    const onStorage = (e: StorageEvent) => {
      if (e.key === PERMS_KEY) setPerms(loadPerms());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const canShow = {
    sleep: perms.sleep,
    steps: perms.activity,
    sugar: perms.nutrition,
    hr: perms.vitals,
  };

  const [show, setShow] = React.useState<Record<OverviewMetric, boolean>>({
    sleep: true,
    steps: true,
    sugar: false,
    hr: false,
  });

  React.useEffect(() => {
    setShow((s) => ({
      sleep: canShow.sleep ? s.sleep : false,
      steps: canShow.steps ? s.steps : false,
      sugar: canShow.sugar ? s.sugar : false,
      hr: canShow.hr ? s.hr : false,
    }));
  }, [perms.sleep, perms.activity, perms.nutrition, perms.vitals]);

  const toggle = (k: OverviewMetric) => setShow((s) => ({ ...s, [k]: !s[k] }));

  const tabEnabled = {
    overview: canShow.sleep || canShow.steps || canShow.sugar || canShow.hr,
    sleep: perms.sleep,
    activity: perms.activity,
    nutrition: perms.nutrition,
    vitals: perms.vitals,
  } as const;

  const firstAvailableTab =
    (tabEnabled.overview && "overview") ||
    (tabEnabled.sleep && "sleep") ||
    (tabEnabled.activity && "activity") ||
    (tabEnabled.nutrition && "nutrition") ||
    (tabEnabled.vitals && "vitals") ||
    "overview";

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle>Trends</CardTitle>
          <div className="text-xs text-muted-foreground">Tap metrics to compare</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canShow.sleep && (
            <Chip label="Sleep" active={show.sleep} color={COLORS.sleep} onClick={() => toggle("sleep")} />
          )}
          {canShow.steps && (
            <Chip label="Steps" active={show.steps} color={COLORS.steps} onClick={() => toggle("steps")} />
          )}
          {canShow.sugar && (
            <Chip label="Sugar" active={show.sugar} color={COLORS.sugar} onClick={() => toggle("sugar")} />
          )}
          {canShow.hr && (
            <Chip label="Resting HR" active={show.hr} color={COLORS.hr} onClick={() => toggle("hr")} />
          )}

          {!tabEnabled.overview && (
            <div className="text-sm text-muted-foreground">
              No metrics enabled. Enable data permissions in Settings.
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs defaultValue={firstAvailableTab}>
          <TabsList className="tabs-pill">
            <TabsTrigger
              value="overview"
              disabled={!tabEnabled.overview}
              className="data-[state=active]:bg-muted data-[state=active]:ring-1 data-[state=active]:ring-muted-foreground/20"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="sleep"
              disabled={!tabEnabled.sleep}
              className="data-[state=active]:bg-muted data-[state=active]:ring-1 data-[state=active]:ring-muted-foreground/20"
            >
              Sleep
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              disabled={!tabEnabled.activity}
              className="data-[state=active]:bg-muted data-[state=active]:ring-1 data-[state=active]:ring-muted-foreground/20"
            >
              Activity
            </TabsTrigger>
            <TabsTrigger
              value="nutrition"
              disabled={!tabEnabled.nutrition}
              className="data-[state=active]:bg-muted data-[state=active]:ring-1 data-[state=active]:ring-muted-foreground/20"
            >
              Nutrition
            </TabsTrigger>
            <TabsTrigger
              value="vitals"
              disabled={!tabEnabled.vitals}
              className="data-[state=active]:bg-muted data-[state=active]:ring-1 data-[state=active]:ring-muted-foreground/20"
            >
              Vitals
            </TabsTrigger>
          </TabsList>

          <Separator />

          <TabsContent value="overview">
            {/* Optional: show hint only if they’re actually comparing Sugar in overview */}
            {perms.nutrition && show.sugar && nutritionHasGaps && (
              <div className="mb-2 text-xs text-muted-foreground">
                Some nutrition days are missing due to source coverage.
              </div>
            )}

            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" hide />
                <Tooltip formatter={formatValue} />
                <Legend />

                <YAxis yAxisId="left" width={52}>
                  <Label value="Value" angle={-90} position="insideLeft" />
                </YAxis>

                <YAxis yAxisId="right" orientation="right" width={70}>
                  <Label value="Steps" angle={-90} position="insideRight" />
                </YAxis>

                {canShow.steps && show.steps && (
                  <Bar yAxisId="right" dataKey="steps" fill={COLORS.steps} radius={[6, 6, 0, 0]} name="Steps" />
                )}

                {canShow.sleep && show.sleep && (
                  <Line yAxisId="left" type="monotone" dataKey="sleep" name="Sleep" stroke={COLORS.sleep} strokeWidth={2} dot={false} />
                )}

                {canShow.sugar && show.sugar && (
                  <Line yAxisId="left" type="monotone" dataKey="sugar" name="Sugar" stroke={COLORS.sugar} strokeWidth={2} strokeDasharray="6 3" dot={false} />
                )}

                {canShow.hr && show.hr && (
                  <Line yAxisId="left" type="monotone" dataKey="hr" name="Resting HR" stroke={COLORS.hr} strokeWidth={2} strokeDasharray="2 2" dot={false} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="sleep">
            {perms.sleep ? (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" hide />
                  <YAxis width={52}>
                    <Label value="Sleep (hours)" angle={-90} position="insideLeft" />
                  </YAxis>
                  <Tooltip formatter={formatValue} />
                  <Line type="monotone" dataKey="sleep" name="Sleep" stroke={COLORS.sleep} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-muted-foreground">Sleep is disabled in Settings → Data Permissions.</div>
            )}
          </TabsContent>

          <TabsContent value="activity">
            {perms.activity ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" hide />
                  <YAxis width={60}>
                    <Label value="Steps" angle={-90} position="insideLeft" />
                  </YAxis>
                  <Tooltip formatter={formatValue} />
                  <Bar dataKey="steps" name="Steps" fill={COLORS.steps} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-muted-foreground">Activity is disabled in Settings → Data Permissions.</div>
            )}
          </TabsContent>

          <TabsContent value="nutrition">
            {perms.nutrition ? (
              <>
                {nutritionHasGaps && (
                  <div className="mb-2 text-xs text-muted-foreground">
                    Some nutrition days are missing due to source coverage.
                  </div>
                )}

                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" hide />
                    <YAxis width={60}>
                      <Label value="Sugar (g) / Calories" angle={-90} position="insideLeft" />
                    </YAxis>
                    <Tooltip formatter={formatValue} />
                    <Legend />
                    <Line type="monotone" dataKey="sugar" name="Sugar" stroke={COLORS.sugar} strokeWidth={2} dot={false} strokeDasharray="6 3" />
                    <Line type="monotone" dataKey="calories" name="Calories" stroke={COLORS.calories} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Nutrition is disabled in Settings → Data Permissions.</div>
            )}
          </TabsContent>

          <TabsContent value="vitals">
            {perms.vitals ? (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" hide />
                  <YAxis width={60}>
                    <Label value="Resting HR (bpm)" angle={-90} position="insideLeft" />
                  </YAxis>
                  <Tooltip formatter={formatValue} />
                  <Line type="monotone" dataKey="hr" name="Resting HR" stroke={COLORS.hr} strokeWidth={2} dot={false} strokeDasharray="2 2" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-muted-foreground">Vitals is disabled in Settings → Data Permissions.</div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}