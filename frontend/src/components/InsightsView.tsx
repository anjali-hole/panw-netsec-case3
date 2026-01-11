"use client";

import * as React from "react";
import { getInsights } from "@/lib/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { AlertTriangle, Link2 } from "lucide-react";

type Insight = {
  id: string;
  type: "correlation" | "anomaly" | string;
  title: string;
  summary: string;
  evidence?: Record<string, any>;
  responsible_note?: string;
};

const LEGACY_SETTINGS_KEY = "wellness_settings_v1";
const ACTIVE_PROFILE_KEY = "wellness_active_profile_v1";
const settingsKey = (profileId: string) => `wellness_settings_v1:${profileId}`;

type Settings = {
  reduceMotion?: boolean;
};

function loadReduceMotion(): boolean {
  try {
    const activeProfile = localStorage.getItem(ACTIVE_PROFILE_KEY);
    const raw =
      (activeProfile && localStorage.getItem(settingsKey(activeProfile))) ||
      localStorage.getItem(LEGACY_SETTINGS_KEY);

    if (!raw) return false;
    const s = JSON.parse(raw) as Settings;
    return !!s.reduceMotion;
  } catch {
    return false;
  }
}

export default function InsightsView() {
  const [loading, setLoading] = React.useState(true);
  const [insights, setInsights] = React.useState<Insight[]>([]);
  const [filter, setFilter] =
    React.useState<"all" | "correlation" | "anomaly">("all");

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const selected = React.useMemo(
    () => insights.find((i) => i.id === selectedId) ?? null,
    [insights, selectedId]
  );

  const [reduceMotion, setReduceMotion] = React.useState(false);
  React.useEffect(() => {
    setReduceMotion(loadReduceMotion());

    const onStorage = (e: StorageEvent) => {
      if (
        e.key === LEGACY_SETTINGS_KEY ||
        e.key === ACTIVE_PROFILE_KEY ||
        (e.key && e.key.startsWith("wellness_settings_v1:"))
      ) {
        setReduceMotion(loadReduceMotion());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  React.useEffect(() => {
    (async () => {
      try {
        const data = await getInsights(30);
        setInsights(data.insights ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const shown = insights.filter((i) => filter === "all" || i.type === filter);

  const hoverAnim = reduceMotion
    ? "hover:shadow-sm"
    : "transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">Insights</h1>
          <Badge variant="secondary">AI-derived</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Patterns surfaced from your recent data. Correlations are directional
          and not medical advice.
        </p>
      </div>

      {/* Filters */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList className="tabs-pill">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="correlation">Correlations</TabsTrigger>
          <TabsTrigger value="anomaly">Anomalies</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Content */}
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading insights…</div>
      ) : shown.length === 0 ? (
        <div className="rounded-lg border bg-muted/20 p-6 text-sm text-muted-foreground">
          No insights available for this range or current data permissions.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {shown.map((i) => {
            const isAnomaly = i.type === "anomaly";

            return (
              <Card
                key={i.id}
                onClick={() => setSelectedId(i.id)}
                className={[
                  "relative cursor-pointer overflow-hidden",
                  hoverAnim,
                  "motion-reduce:transform-none motion-reduce:transition-none",
                ].join(" ")}
              >
                {/* Accent bar */}
                <div
                  className={[
                    "absolute inset-x-0 top-0 h-1",
                    isAnomaly
                      ? "bg-gradient-to-r from-red-500/60 to-red-400/60"
                      : "bg-gradient-to-r from-[hsl(173_58%_39%)] to-[hsl(262_83%_58%)]",
                  ].join(" ")}
                />

                <CardHeader className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      {/* Severity icon */}
                      <span
                        className={[
                          "mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background/70 backdrop-blur",
                          isAnomaly
                            ? "text-red-600 dark:text-red-400"
                            : "text-[hsl(262_83%_45%)]",
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
                        <div className="mt-1 text-sm text-muted-foreground">
                          {i.summary}
                        </div>
                      </div>
                    </div>

                    <Badge variant={isAnomaly ? "destructive" : "secondary"}>
                      {i.type}
                    </Badge>
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
                      <Link2 className="h-4 w-4 text-[hsl(262_83%_45%)]" />
                    )}
                    {selected.title}
                  </span>

                  <Badge
                    variant={selected.type === "anomaly" ? "destructive" : "secondary"}
                  >
                    {selected.type}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5">
                <p className="text-sm text-muted-foreground">{selected.summary}</p>

                {selected.evidence && (
                  <div className="rounded-lg border p-4">
                    <div className="mb-2 text-sm font-medium">Evidence</div>
                    <pre className="overflow-auto text-xs text-muted-foreground">
{JSON.stringify(selected.evidence, null, 2)}
                    </pre>
                  </div>
                )}

                {selected.responsible_note && (
                  <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                    <div className="font-medium">Responsible AI note</div>
                    <p className="mt-1 text-muted-foreground">
                      {selected.responsible_note}
                    </p>
                  </div>
                )}

                <div className="rounded-lg border p-4 text-sm">
                  <div className="font-medium">Suggested next steps (non-medical)</div>
                  <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                    <li>Check for routine or lifestyle changes.</li>
                    <li>Look for repeated patterns over multiple weeks.</li>
                    <li>
                      If anomalies persist and you feel unwell, consider professional advice.
                    </li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}