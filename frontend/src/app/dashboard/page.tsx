"use client";

import * as React from "react";
import Link from "next/link";
import { getDashboard, getInsights, getSourcesStatus } from "@/lib/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import KpiCards from "@/components/KpiCards";
import TrendsCard from "@/components/TrendsCard";
import InsightPreview from "@/components/InsightPreview";

import DailyBriefCard from "@/components/DailyBriefCard";
import WellnessStoryCard from "@/components/WellnessStoryCard";
import DataSourcesCard from "@/components/DataSourcesCard";

import { CalendarDays, Sparkles, Activity, ArrowRight, RefreshCw, AlertTriangle } from "lucide-react";
import AuthGate from "@/components/AuthGate";

import { getProfilePerms, onWellnessStorageChanged } from "@/lib/wellnessStorage";

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

export default function DashboardPage() {
  const [loading, setLoading] = React.useState(true);
  const [overview, setOverview] = React.useState<DashboardResponse | null>(null);
  const [insights, setInsights] = React.useState<Insight[]>([]);
  const [rangeDays, setRangeDays] = React.useState<7 | 14 | 30>(30);
  const [sourcesStatus, setSourcesStatus] = React.useState<any | null>(null);

  const [perms, setPerms] = React.useState<Permissions>(DEFAULT_PERMS);

  const [error, setError] = React.useState<string | null>(null);

  // Consolidated storage reads
  React.useEffect(() => {
    const refresh = () => setPerms(getProfilePerms(DEFAULT_PERMS));
    refresh();
    return onWellnessStorageChanged(refresh);
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [o, i, s] = await Promise.all([
        getDashboard(rangeDays),
        getInsights(rangeDays),
        getSourcesStatus(rangeDays),
      ]);

      setOverview(o && (o as any).series ? (o as DashboardResponse) : null);
      setInsights((i?.insights ?? []) as Insight[]);
      setSourcesStatus(s ?? null);
    } catch (e) {
      console.error(e);
      setOverview(null);
      setInsights([]);
      setSourcesStatus(null);
      setError("Could not load dashboard data. Check the backend and try again.");
    } finally {
      setLoading(false);
    }
  }, [rangeDays]);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <AuthGate>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                Prototype
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Range pills */}
            <div className="flex items-center gap-1 rounded-lg border bg-background p-1">
              <Button
                variant={rangeDays === 7 ? "default" : "ghost"}
                size="sm"
                className="h-8"
                onClick={() => setRangeDays(7)}
              >
                7d
              </Button>
              <Button
                variant={rangeDays === 14 ? "default" : "ghost"}
                size="sm"
                className="h-8"
                onClick={() => setRangeDays(14)}
              >
                14d
              </Button>
              <Button
                variant={rangeDays === 30 ? "default" : "ghost"}
                size="sm"
                className="h-8"
                onClick={() => setRangeDays(30)}
              >
                30d
              </Button>
            </div>

            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
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
                <Button onClick={load} variant="outline" size="sm" disabled={loading}>
                  Try again
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Profile setup</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top KPI row */}
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-base">
                <Activity className="h-4 w-4 text-muted-foreground" />
                Key metrics
              </span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                Last {rangeDays} days
              </span>
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-0">
            {loading || !overview ? (
              <KpiSkeleton />
            ) : (
              <KpiCards
                avgSleep={overview.avg_sleep_hours}
                avgSteps={overview.avg_steps}
                avgCalories={overview.avg_calories}
                avgSugar={overview.avg_sugar_g}
                show={{
                  sleep: perms.sleep,
                  activity: perms.activity,
                  nutrition: perms.nutrition,
                }}
              />
            )}
          </CardContent>
        </Card>

        {/* Daily Brief + Wellness Story */}
        <div className="grid gap-6 lg:grid-cols-2">
          <DailyBriefCard insights={insights} rangeDays={rangeDays} series={overview?.series ?? null} />
          <WellnessStoryCard insights={insights} series={overview?.series ?? null} baselineDays={rangeDays} />
        </div>

        {/* Trends + Today’s Patterns */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {loading || !overview ? <ChartSkeleton /> : <TrendsCard series={overview.series} />}
          </div>

          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Today’s Patterns</CardTitle>
              </CardHeader>
              <Separator />
              <CardContent className="space-y-5 pt-0">
                {loading ? (
                  <div className="space-y-1">
                    <div className="h-20 rounded-lg border" />
                    <div className="h-20 rounded-lg border" />
                  </div>
                ) : insights.length === 0 ? (
                  <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                    No insights available for this range yet.
                  </div>
                ) : (
                  <InsightPreview insights={insights} />
                )}

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    Insights are directional; not intended to be medical advice.
                  </div>

                  <Button variant="outline" size="sm" asChild>
                    <Link href="/insights" className="gap-2">
                      View all
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <DataSourcesCard status={sourcesStatus} />
      </div>
    </AuthGate>
  );
}


function KpiSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="rounded-xl border p-4">
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="mt-3 h-8 w-32 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="h-5 w-28 rounded bg-muted" />
        <div className="flex gap-2">
          <div className="h-8 w-20 rounded-full bg-muted" />
          <div className="h-8 w-20 rounded-full bg-muted" />
          <div className="h-8 w-20 rounded-full bg-muted" />
          <div className="h-8 w-28 rounded-full bg-muted" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[340px] w-full rounded-xl" />
      </CardContent>
    </Card>
  );
}