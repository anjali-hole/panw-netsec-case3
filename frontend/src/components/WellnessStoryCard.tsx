"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles } from "lucide-react";

type Insight = {
  id: string;
  type: "correlation" | "anomaly" | string;
  title: string;
  summary: string;
  evidence?: Record<string, any>;
};

type TimeSeries = {
  date: string[];
  sleep_hours: number[];
  steps: number[];
  active_minutes: number[];
  calories: number[];
  sugar_g: number[];
  resting_hr: number[];
};

function mean(xs: number[]) {
  const a = xs.filter((v) => Number.isFinite(v));
  if (!a.length) return 0;
  return a.reduce((s, v) => s + v, 0) / a.length;
}

function pctChange(from: number, to: number) {
  if (!Number.isFinite(from) || from === 0) return 0;
  return ((to - from) / from) * 100;
}

// find first correlation mentioning X and Y
function pickCorrelation(insights: Insight[], includesA: string[], includesB: string[]) {
  const lower = (s: string) => s.toLowerCase();
  return insights.find((i) => {
    if (i.type !== "correlation") return false;
    const t = lower(`${i.title} ${i.summary}`);
    const hasA = includesA.some((k) => t.includes(lower(k)));
    const hasB = includesB.some((k) => t.includes(lower(k)));
    return hasA && hasB;
  });
}

export default function WellnessStoryCard({
  insights,
  series,
  baselineDays = 30,
}: {
  insights: Insight[];
  series: TimeSeries | null;
  baselineDays?: 7 | 14 | 30 | 60 | 90;
}) {
  const bullets = React.useMemo(() => {
    if (!series || series.date.length < 10) return null;

    const n = series.date.length;
    const end = n;
    const start = Math.max(0, end - baselineDays);

    const sleepLatest = series.sleep_hours[n - 1];
    const stepsLatest = series.steps[n - 1];
    const sugarLatest = series.sugar_g[n - 1];
    const hrLatest = series.resting_hr[n - 1];

    const sleepBase = mean(series.sleep_hours.slice(start, end));
    const stepsBase = mean(series.steps.slice(start, end));
    const sugarBase = mean(series.sugar_g.slice(start, end));
    const hrBase = mean(series.resting_hr.slice(start, end));

    const sleepPct = pctChange(sleepBase, sleepLatest);
    const stepsPct = pctChange(stepsBase, stepsLatest);
    const sugarPct = pctChange(sugarBase, sugarLatest);
    const hrPct = pctChange(hrBase, hrLatest);

    const anomalies = insights.filter((i) => i.type === "anomaly");
    const hasAnomaly = anomalies.length > 0;

    const deviations = [
      { k: "sleep", label: "Sleep", pct: sleepPct },
      { k: "steps", label: "Steps", pct: stepsPct },
      { k: "sugar", label: "Sugar", pct: sugarPct },
      { k: "hr", label: "Resting HR", pct: hrPct },
    ]
      .filter((d) => Number.isFinite(d.pct))
      .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));

    const driver = deviations[0];

    const sleepSugar = pickCorrelation(insights, ["sleep"], ["sugar"]);
    const sleepSteps = pickCorrelation(insights, ["sleep"], ["steps", "activity"]);
    const sleepHr = pickCorrelation(insights, ["sleep"], ["resting hr", "heart", "hr"]);

    const downstream =
      sleepSugar?.summary ||
      sleepSteps?.summary ||
      sleepHr?.summary ||
      "Patterns suggest changes in one area can ripple into others across days.";

    const driverSentence = driver
      ? `Driver: ${driver.label} is ${driver.pct >= 0 ? "↑" : "↓"} ${Math.abs(driver.pct).toFixed(
          0
        )}% vs your ${baselineDays}d baseline.`
      : `Driver: Comparing latest day to your ${baselineDays}d baseline.`;

    const contextSentence = hasAnomaly
      ? `Context: An anomaly is present (${anomalies[0]?.title ?? "detected"}) — prioritize recovery and watch persistence.`
      : "Context: No anomalies detected in this window — focus on steady habit improvements.";

    return [
      driverSentence,
      `Downstream: ${downstream}`,
      contextSentence,
    ];
  }, [insights, series, baselineDays]);

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[hsl(173_72%_28%)] to-[hsl(262_78%_45%)]" />
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            Wellness Story
          </span>
          <Badge variant="secondary" className="font-normal">
            Narrative view
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          A short narrative that connects your metrics, correlations, and anomalies.
        </p>
      </CardHeader>

      <CardContent>
        {!bullets ? (
          <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
            Not enough data yet to generate a story. Collect a few more days.
          </div>
        ) : (
          <div className="rounded-lg border bg-muted/20 p-4">
            <ul className="space-y-2 text-sm">
              {bullets.map((b, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <ArrowRight className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 text-xs text-muted-foreground">
              Directional story from your recent data + detected patterns (not medical advice).
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}