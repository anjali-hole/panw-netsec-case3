"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Info, Link2 } from "lucide-react";

type Permissions = { sleep: boolean; activity: boolean; nutrition: boolean; vitals: boolean };

type TimeSeries = {
  date: string[];
  sleep_hours: number[];
  steps: number[];
  active_minutes: number[];
  calories: number[];
  sugar_g: number[];
  resting_hr: number[];
};

type MetricKey = keyof Omit<TimeSeries, "date">;

const METRICS: {
  key: MetricKey;
  label: string;
  unit: string;
  domain: keyof Permissions;
  min?: number;
  max?: number;
  step?: number;
}[] = [
  { key: "sleep_hours", label: "Sleep", unit: "h", domain: "sleep", min: 0, max: 12, step: 0.1 },
  { key: "steps", label: "Steps", unit: "", domain: "activity", min: 0, max: 50000, step: 100 },
  { key: "active_minutes", label: "Active minutes", unit: "min", domain: "activity", min: 0, max: 600, step: 5 },
  { key: "calories", label: "Calories", unit: "kcal", domain: "nutrition", min: 0, max: 6000, step: 50 },
  { key: "sugar_g", label: "Sugar", unit: "g", domain: "nutrition", min: 0, max: 400, step: 5 },
  { key: "resting_hr", label: "Resting HR", unit: "bpm", domain: "vitals", min: 30, max: 130, step: 1 },
];

function metricMeta(key: MetricKey) {
  return METRICS.find((m) => m.key === key)!;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function mean(arr: number[]) {
  const xs = arr.filter((v) => Number.isFinite(v));
  if (!xs.length) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function linearFitSlope(xs: number[], ys: number[]) {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;

  let sumX = 0,
    sumY = 0,
    sumXX = 0,
    sumXY = 0;

  for (let i = 0; i < n; i++) {
    const x = xs[i];
    const y = ys[i];
    sumX += x;
    sumY += y;
    sumXX += x * x;
    sumXY += x * y;
  }

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;

  return (n * sumXY - sumX * sumY) / denom;
}

type WhatIfResult =
  | { blocked: true; message: string }
  | {
      blocked: false;
      sentence: string;
      debug: {
        pointsUsed: number;
        slope: number;
        baselineX: number;
        baselineY: number;
        scenarioX: number;
        predictedDeltaY: number;
        pct: number;
        lagDays: 0 | 1;
      };
    };

export default function WhatIfSimulatorCard({
  loading,
  series,
  perms,
  baselineDays,
  onBaselineDaysChange,
}: {
  loading: boolean;
  series: TimeSeries | null;
  perms: Permissions;
  baselineDays: 30 | 60 | 90;
  onBaselineDaysChange: (d: 30 | 60 | 90) => void;
}) {
  const [xMetric, setXMetric] = React.useState<MetricKey>("sleep_hours");
  const [yMetric, setYMetric] = React.useState<MetricKey>("sugar_g");
  const [lagDays, setLagDays] = React.useState<0 | 1>(1);

  const [scenarioX, setScenarioX] = React.useState<number>(6);

  React.useEffect(() => {
    const meta = metricMeta(xMetric);
    const lo = meta.min ?? 0;
    const hi = meta.max ?? 999999;
    setScenarioX((prev) => clamp(prev, lo, hi));
  }, [xMetric]);

  const whatIf: WhatIfResult | null = React.useMemo(() => {
    if (!series) return null;

    const xMeta = metricMeta(xMetric);
    const yMeta = metricMeta(yMetric);

    if (!perms[xMeta.domain] || !perms[yMeta.domain]) {
      const missing = [
        !perms[xMeta.domain] ? xMeta.domain : null,
        !perms[yMeta.domain] ? yMeta.domain : null,
      ]
        .filter(Boolean)
        .join(" + ");

      return {
        blocked: true,
        message: `Enable ${missing} in Settings → Data Permissions to run this What-If.`,
      };
    }

    const xArr = series[xMetric] ?? [];
    const yArr = series[yMetric] ?? [];
    const n = Math.min(series.date.length, xArr.length, yArr.length);
    if (n < 12) {
      return { blocked: true, message: "Not enough data yet to estimate this relationship." };
    }

    const xs: number[] = [];
    const ys: number[] = [];
    const maxT = lagDays === 1 ? n - 1 : n;

    for (let t = 0; t < maxT; t++) {
      const x = xArr[t];
      const y = lagDays === 1 ? yArr[t + 1] : yArr[t];
      if (Number.isFinite(x) && Number.isFinite(y)) {
        xs.push(x);
        ys.push(y);
      }
    }

    if (xs.length < 10) {
      return { blocked: true, message: "Not enough clean paired data points to compute a What-If." };
    }

    const slope = linearFitSlope(xs, ys);

    const baseStart = Math.max(0, n - baselineDays);
    const baselineX = mean(xArr.slice(baseStart, n));
    const baselineY = mean(yArr.slice(baseStart, n));

    const predictedDeltaY = (scenarioX - baselineX) * slope;
    const pct = baselineY > 0 ? (predictedDeltaY / baselineY) * 100 : 0;

    const sign = pct >= 0 ? "+" : "";
    const lagLabel = lagDays === 1 ? "next day" : "same day";

    const sentence = `${scenarioX.toFixed(
      xMeta.key === "steps" ? 0 : 1
    )}${xMeta.unit ? xMeta.unit : ""} ${xMeta.label} → ${sign}${pct.toFixed(0)}% ${yMeta.label} (${lagLabel}, vs ${baselineDays}d baseline)`;

    return {
      blocked: false,
      sentence,
      debug: {
        pointsUsed: xs.length,
        slope,
        baselineX,
        baselineY,
        scenarioX,
        predictedDeltaY,
        pct,
        lagDays,
      },
    };
  }, [series, perms, xMetric, yMetric, lagDays, scenarioX, baselineDays]);

  const xMeta = metricMeta(xMetric);

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[hsl(173_72%_28%)] to-[hsl(262_78%_45%)]" />
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            What-If Simulator
          </span>
          <Badge variant="secondary" className="font-normal">
            Baseline: {baselineDays}d
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Change one lever and get a directional estimate of impact (explainable, not clinical).
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label>Baseline window</Label>
            <div className="flex items-center gap-2">
              {[30, 60, 90].map((d) => (
                <Button
                  key={d}
                  size="sm"
                  variant={baselineDays === d ? "default" : "outline"}
                  onClick={() => onBaselineDaysChange(d as 30 | 60 | 90)}
                >
                  {d}d
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Input lever (X)</Label>
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={xMetric}
              onChange={(e) => setXMetric(e.target.value as MetricKey)}
            >
              {METRICS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label>Outcome (Y)</Label>
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={yMetric}
              onChange={(e) => setYMetric(e.target.value as MetricKey)}
            >
              {METRICS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label>Lag</Label>
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={lagDays}
              onChange={(e) => setLagDays(Number(e.target.value) as 0 | 1)}
            >
              <option value={0}>Same day</option>
              <option value={1}>Next day</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label>
              Scenario ({xMeta.label}) {xMeta.unit ? `(${xMeta.unit})` : ""}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                className="w-[140px]"
                inputMode="decimal"
                value={String(scenarioX)}
                onChange={(e) => {
                  const meta = metricMeta(xMetric);
                  const lo = meta.min ?? 0;
                  const hi = meta.max ?? 999999;
                  setScenarioX(clamp(Number(e.target.value || 0), lo, hi));
                }}
              />
              <span className="text-xs text-muted-foreground">
                {xMeta.min ?? 0}–{xMeta.max ?? "∞"}
                {xMeta.unit}
              </span>
            </div>
          </div>
        </div>

        {/* Result */}
        <div className="rounded-lg border bg-muted/20 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Info className="h-4 w-4 text-muted-foreground" />
            Result
          </div>

          {loading || !series ? (
            <div className="mt-2 text-sm text-muted-foreground">Loading data…</div>
          ) : !whatIf ? (
            <div className="mt-2 text-sm text-muted-foreground">Not ready yet.</div>
          ) : whatIf.blocked ? (
            <div className="mt-2 text-sm text-muted-foreground">{whatIf.message}</div>
          ) : (
            <div className="mt-2 text-sm">
              <span className="font-semibold">{whatIf.sentence}</span>
            </div>
          )}
        </div>

        {/* Explainability */}
        <details className="rounded-lg border bg-background p-4">
          <summary className="cursor-pointer text-sm font-medium">How this was calculated</summary>

          <div className="mt-2 space-y-2 text-sm text-muted-foreground">
            <p>
              This is building paired points from your history: <span className="font-medium">X[t] → Y[t+lag]</span>, then it fits a
              simple line (slope). Then your scenario change is applied versus your baseline average.
            </p>
          </div>

          {!loading && whatIf && !whatIf.blocked ? (
            <div className="mt-3 rounded-lg border bg-muted/20 p-3 text-xs">
              <div>Pairs used: {whatIf.debug.pointsUsed}</div>
              <div>Slope (ΔY per 1 unit X): {whatIf.debug.slope.toFixed(6)}</div>
              <div>Baseline X: {whatIf.debug.baselineX.toFixed(3)}</div>
              <div>Baseline Y: {whatIf.debug.baselineY.toFixed(3)}</div>
              <div>Scenario X: {whatIf.debug.scenarioX.toFixed(3)}</div>
              <div>Predicted ΔY: {whatIf.debug.predictedDeltaY.toFixed(3)}</div>
              <div>Predicted % change: {whatIf.debug.pct.toFixed(2)}%</div>
              <div>Lag: {whatIf.debug.lagDays} day(s)</div>
            </div>
          ) : null}
        </details>
      </CardContent>
    </Card>
  );
}