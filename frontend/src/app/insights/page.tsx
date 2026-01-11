"use client";

import * as React from "react";
import Link from "next/link";
import { getDashboard, getInsights } from "@/lib/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

import ExperimentEngineCard from "@/components/ExperimentEngineCard";
import WhatIfSimulatorCard from "@/components/WhatIfSimulatorCard";

import { AlertTriangle, Link2, Wand2, ArrowRight, CheckCircle2 } from "lucide-react";
import AuthGate from "@/components/AuthGate";

import { buildActionPack, chooseTopAction, filterInsightsByPerms } from "@/lib/actionable";
import { getProfilePerms, getProfileSettings, onWellnessStorageChanged } from "@/lib/wellnessStorage";


type TimeSeries = {
  date: string[];
  sleep_hours: number[];
  steps: number[];
  active_minutes: number[];
  calories: number[];
  sugar_g: number[];
  resting_hr: number[];
};

type DashboardResponse = {
  avg_sleep_hours: number;
  avg_steps: number;
  avg_calories: number;
  avg_sugar_g: number;
  series: TimeSeries;
};

type Insight = {
  id: string;
  type: "correlation" | "anomaly" | string;
  title: string;
  summary: string;
  evidence?: Record<string, unknown>;
  responsible_note?: string;
};

type Permissions = { sleep: boolean; activity: boolean; nutrition: boolean; vitals: boolean };
const DEFAULT_PERMS: Permissions = { sleep: true, activity: true, nutrition: true, vitals: true };

type Settings = { reduceMotion?: boolean };
const DEFAULT_SETTINGS: Settings = { reduceMotion: false };

type Goals = {
  sleepTargetHours?: number;
  stepsTarget?: number;
  sugarMaxG?: number;
};


export default function InsightsPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [dashboard, setDashboard] = React.useState<DashboardResponse | null>(null);
  const [insights, setInsights] = React.useState<Insight[]>([]);

  const [filter, setFilter] = React.useState<"all" | "correlation" | "anomaly">("all");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const selected = React.useMemo(
    () => insights.find((i) => i.id === selectedId) ?? null,
    [insights, selectedId]
  );

  const [reduceMotion, setReduceMotion] = React.useState(false);
  const [perms, setPerms] = React.useState<Permissions>(DEFAULT_PERMS);
  const [goals, setGoals] = React.useState<Goals>({});

  const [baselineDays, setBaselineDays] = React.useState<30 | 60 | 90>(30);

  React.useEffect(() => {
    const refreshLocal = () => {
      const s = getProfileSettings<Settings>(DEFAULT_SETTINGS);
      setReduceMotion(!!s.reduceMotion);

      setPerms(getProfilePerms(DEFAULT_PERMS));

      try {
        const active = localStorage.getItem("wellness_active_profile_v1") || "default";
        const raw =
          localStorage.getItem(`wellness_goals_v1:${active}`) || localStorage.getItem("wellness_goals_v1");
        const g = raw ? (JSON.parse(raw) as Goals) : {};
        setGoals(g ?? {});
      } catch {
        setGoals({});
      }
    };

    refreshLocal();
    return onWellnessStorageChanged(refreshLocal);
  }, []);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [d, i] = await Promise.all([getDashboard(90), getInsights(30)]);
        setDashboard(d as DashboardResponse);
        setInsights((i?.insights ?? []) as Insight[]);
      } catch (e) {
        console.error(e);
        setDashboard(null);
        setInsights([]);
        setError("Could not load insights. Check the backend and try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const hoverAnim = reduceMotion
    ? ""
    : "transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none";

  const permittedInsights = React.useMemo(() => {
    return filterInsightsByPerms(insights, perms) as Insight[];
  }, [insights, perms]);

  const shownInsights = React.useMemo(() => {
    const byType = permittedInsights.filter((i) => filter === "all" || i.type === filter);
    return byType.slice().sort((a, b) => {
      const aRank = a.type === "anomaly" ? 0 : 1;
      const bRank = b.type === "anomaly" ? 0 : 1;
      return aRank - bRank;
    });
  }, [permittedInsights, filter]);

  const topInsight = React.useMemo(
    () => chooseTopAction(permittedInsights) as Insight | null,
    [permittedInsights]
  );
  const topPack = React.useMemo(() => (topInsight ? buildActionPack(topInsight as any) : null), [topInsight]);

  const selectedPack = React.useMemo(() => (selected ? buildActionPack(selected as any) : null), [selected]);

  return (
    <AuthGate>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">Insights</h1>
              <Badge variant="secondary" className="gap-1">
                <Wand2 className="h-3.5 w-3.5" />
                Prototype
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Explore correlations, run small experiments, and review anomalies. Correlation does not imply causation.
            </p>
          </div>

          <Button variant="outline" size="sm" asChild>
            <Link href="/settings" className="gap-2">
              Profile & goals
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Error state */}
        {error && (
          <Card className="border">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                Data unavailable
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="text-sm text-muted-foreground">{error}</div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => location.reload()} disabled={loading}>
                  Reload
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard">Back to dashboard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detected patterns */}
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Detected patterns</h2>
              <p className="text-sm text-muted-foreground">
                Filter correlations vs anomalies. Items may be hidden when related data permissions are off.
              </p>
            </div>

            <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
              <TabsList className="tabs-pill">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="correlation">Correlations</TabsTrigger>
                <TabsTrigger value="anomaly">Anomalies</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {loading ? (
            <div className="text-sm text-muted-foreground">Loading insights…</div>
          ) : shownInsights.length === 0 ? (
            <div className="rounded-lg border bg-muted/20 p-6 text-sm text-muted-foreground">
              No insights found (or they’re hidden by Data Permissions).
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {shownInsights.map((i) => {
                const isAnomaly = i.type === "anomaly";

                return (
                  <Card
                    key={i.id}
                    onClick={() => setSelectedId(i.id)}
                    className={["relative cursor-pointer overflow-hidden", hoverAnim].join(" ")}
                  >
                    <div
                      className={[
                        "absolute inset-x-0 top-0 h-1",
                        isAnomaly
                          ? "bg-gradient-to-r from-red-600/70 to-red-400/60"
                          : "bg-gradient-to-r from-[hsl(173_72%_28%)] to-[hsl(262_78%_45%)]",
                      ].join(" ")}
                    />

                    <CardHeader className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2">
                          <span
                            className={[
                              "mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background/70 backdrop-blur",
                              isAnomaly ? "text-red-600 dark:text-red-400" : "text-[hsl(262_78%_45%)]",
                            ].join(" ")}
                            aria-label={isAnomaly ? "Anomaly" : "Correlation"}
                            title={isAnomaly ? "Anomaly" : "Correlation"}
                          >
                            {isAnomaly ? (
                              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <Link2 className="h-4 w-4" aria-hidden="true" />
                            )}
                          </span>

                          <div>
                            <CardTitle className="text-base">{i.title}</CardTitle>
                            <div className="mt-1 text-sm text-muted-foreground">{i.summary}</div>
                          </div>
                        </div>

                        <Badge variant={isAnomaly ? "destructive" : "secondary"}>{i.type}</Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(i.id);
                        }}
                      >
                        View details
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <Separator />

        {/* Actionable next step */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[hsl(173_72%_28%)] to-[hsl(262_78%_45%)]" />
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                Actionable next step
              </span>
              <Badge variant="secondary" className="font-normal">
                Try window: {topPack?.timeWindowLabel ?? "—"}
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">Concrete, testable actions based on detected patterns.</p>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Computing recommendation…</div>
            ) : !topPack ? (
              <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                No actionable recommendation yet. Enable more Data Permissions or collect more days.
              </div>
            ) : (
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="text-sm font-medium">{topPack.action}</div>
                <div className="mt-1 text-sm text-muted-foreground">{topPack.because}</div>

                {topPack.howToTest?.length ? (
                  <ul className="mt-3 list-disc pl-5 text-sm text-muted-foreground space-y-1">
                    {topPack.howToTest.slice(0, 3).map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                ) : null}

                {topPack.tags?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {topPack.tags.slice(0, 4).map((t, idx) => (
                      <Badge key={idx} variant="secondary" className="font-normal">
                        {t}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Explore: What-If + Experiment */}
        <div className="grid gap-4 lg:grid-cols-2">
          <WhatIfSimulatorCard
            loading={loading}
            series={dashboard?.series ?? null}
            perms={perms}
            baselineDays={baselineDays}
            onBaselineDaysChange={setBaselineDays}
          />

          <ExperimentEngineCard
            loading={loading}
            series={dashboard?.series ?? null}
            perms={perms}
            goals={goals}
            baselineDays={baselineDays}
            topPack={topPack as any}
          />
        </div>

        {/* Details dialog */}
        <Dialog open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
          <DialogContent className="sm:max-w-2xl">
            {selected && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-2">
                      {selected.type === "anomaly" ? (
                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      ) : (
                        <Link2 className="h-4 w-4 text-[hsl(262_78%_45%)]" />
                      )}
                      {selected.title}
                    </span>
                    <Badge variant={selected.type === "anomaly" ? "destructive" : "secondary"}>
                      {selected.type}
                    </Badge>
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-5">
                  <p className="text-sm text-muted-foreground">{selected.summary}</p>

                  {selectedPack ? (
                    <div className="rounded-lg border bg-muted/20 p-4">
                      <div className="text-sm font-medium">Action pack</div>
                      <div className="mt-2 text-sm font-semibold">{selectedPack.action}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{selectedPack.because}</div>

                      {selectedPack.howToTest?.length ? (
                        <ul className="mt-3 list-disc pl-5 text-sm text-muted-foreground space-y-1">
                          {selectedPack.howToTest.map((s, idx) => (
                            <li key={idx}>{s}</li>
                          ))}
                        </ul>
                      ) : null}

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="text-xs text-muted-foreground">{selectedPack.timeWindowLabel}</div>
                        <div className="flex flex-wrap gap-2">
                          {selectedPack.tags?.slice(0, 4).map((t, idx) => (
                            <Badge key={idx} variant="secondary" className="font-normal">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {selected.evidence && (
                    <div className="rounded-lg border p-4">
                      <div className="mb-2 text-sm font-medium">Evidence</div>
                      <pre className="overflow-auto text-xs text-muted-foreground">
                        {JSON.stringify(selected.evidence, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AuthGate>
  );
}