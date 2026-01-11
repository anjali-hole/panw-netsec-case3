"use client";

import * as React from "react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { FlaskConical, Play, RotateCcw, Info, Target, TrendingUp, TrendingDown } from "lucide-react";

import type { ActionPack, Permissions, Goals, TimeSeries } from "@/lib/experiment";
import {
  clearActiveExperiment,
  computeExperimentResult,
  inferExperimentKindFromActionPack,
  loadActiveExperiment,
  saveActiveExperiment,
  type ActiveExperiment,
  type ExperimentKind,
} from "@/lib/experiment";

function nowISO() {
  return new Date().toISOString();
}

function lastDate(series: TimeSeries) {
  return series.date[series.date.length - 1] ?? "—";
}

function parseTryDays(label?: string): 3 | 5 | 7 {
  const m = (label ?? "").match(/(\d+)\s*days?/i);
  const n = m ? Number(m[1]) : 3;
  if (n >= 7) return 7;
  if (n >= 5) return 5;
  return 3;
}

function labelForKind(kind: ExperimentKind) {
  if (kind === "sleep_to_sugar") return "Sleep → Sugar (next day)";
  if (kind === "sleep_to_steps") return "Sleep → Steps (next day)";
  if (kind === "sleep_to_hr") return "Sleep → Resting HR (next day)";
  return "Sleep stability check";
}

type OutcomeMeta = {
  key: "sleep_hours" | "steps" | "sugar_g" | "resting_hr";
  label: string;
  // For interpretation: is "higher" good?
  higherIsBetter: boolean;
  // Permission gate for displaying outcome
  needsPerm: keyof Permissions;
  goalLabel?: (g: Goals) => string | null;
  goalCompare?: (value: number, g: Goals) => { ok: boolean; hint: string } | null;
};

function outcomeForKind(kind: ExperimentKind): OutcomeMeta {
  switch (kind) {
    case "sleep_to_steps":
      return {
        key: "steps",
        label: "Steps",
        higherIsBetter: true,
        needsPerm: "activity",
        goalLabel: (g) => (g.stepsTarget != null ? `Goal ≥ ${g.stepsTarget.toLocaleString()}` : null),
        goalCompare: (v, g) =>
          g.stepsTarget == null
            ? null
            : { ok: v >= g.stepsTarget, hint: `vs goal ${g.stepsTarget.toLocaleString()}` },
      };
    case "sleep_to_sugar":
      return {
        key: "sugar_g",
        label: "Sugar",
        higherIsBetter: false,
        needsPerm: "nutrition",
        goalLabel: (g) => (g.sugarMaxG != null ? `Goal ≤ ${g.sugarMaxG}g` : null),
        goalCompare: (v, g) => (g.sugarMaxG == null ? null : { ok: v <= g.sugarMaxG, hint: `vs goal ${g.sugarMaxG}g` }),
      };
    case "sleep_to_hr":
      return {
        key: "resting_hr",
        label: "Resting HR",
        higherIsBetter: false,
        needsPerm: "vitals",
        goalLabel: () => null,
        goalCompare: () => null,
      };
    default:
      return {
        key: "sleep_hours",
        label: "Sleep",
        higherIsBetter: true,
        needsPerm: "sleep",
        goalLabel: (g) => (g.sleepTargetHours != null ? `Goal ≥ ${g.sleepTargetHours}h` : null),
        goalCompare: (v, g) =>
          g.sleepTargetHours == null ? null : { ok: v >= g.sleepTargetHours, hint: `vs goal ${g.sleepTargetHours}h` },
      };
  }
}

function avg(nums: number[]) {
  const finite = nums.filter((n) => Number.isFinite(n));
  if (!finite.length) return null;
  return finite.reduce((a, b) => a + b, 0) / finite.length;
}

function pctChange(baseline: number, experiment: number) {
  if (!Number.isFinite(baseline) || baseline === 0) return null;
  return ((experiment - baseline) / baseline) * 100;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export default function ExperimentEngineCard({
  loading,
  series,
  perms,
  goals,
  baselineDays,
  topPack,
}: {
  loading: boolean;
  series: TimeSeries | null;
  perms: Permissions;
  goals: Goals;
  baselineDays: 30 | 60 | 90;
  topPack: ActionPack | null;
}) {
  const [active, setActive] = React.useState<ActiveExperiment | null>(null);

  React.useEffect(() => {
    setActive(loadActiveExperiment());
  }, []);

  const recommendedKind = React.useMemo(() => inferExperimentKindFromActionPack(topPack), [topPack]);
  const recommendedDuration = React.useMemo(() => parseTryDays(topPack?.timeWindowLabel), [topPack?.timeWindowLabel]);

  const startExperiment = () => {
    if (!series || series.date.length === 0) return;

    const exp: ActiveExperiment = {
      id: `exp_${Math.random().toString(36).slice(2, 10)}`,
      kind: recommendedKind,
      startedAtISO: nowISO(),
      startDate: lastDate(series), 
      baselineDays,
      durationDays: recommendedDuration,
      label: labelForKind(recommendedKind),
    };

    saveActiveExperiment(exp);
    setActive(exp);
  };

  const resetExperiment = () => {
    clearActiveExperiment();
    setActive(null);
  };

  const result = React.useMemo(() => {
    if (!series || !active) return null;
    return computeExperimentResult(series, active, perms);
  }, [series, active, perms]);

  const needsGoals = React.useMemo(() => {
    const hasAny = goals.sleepTargetHours != null || goals.stepsTarget != null || goals.sugarMaxG != null;
    return !hasAny;
  }, [goals.sleepTargetHours, goals.stepsTarget, goals.sugarMaxG]);

  // Post-experiment interpretation + goal alignment
  const interpretation = React.useMemo(() => {
    if (!series || !active) return null;

    const meta = outcomeForKind(active.kind);

    // Permission gate:still show the experiment shell, but interpretation should explain why it's limited.
    if (!perms[meta.needsPerm]) {
      return {
        blocked: true as const,
        meta,
        note: `Enable ${meta.needsPerm} permission to interpret this experiment’s outcome.`,
      };
    }

    const dates = series.date;
    const endIdx = dates.length - 1;
    const startIdx = Math.max(0, dates.lastIndexOf(active.startDate)); // robust even if date not found (returns -1)
    const safeStartIdx = startIdx === -1 ? endIdx : startIdx;

    // Baseline window: ends right before the experiment start if possible; else uses earliest available
    const baselineEnd = safeStartIdx > 0 ? safeStartIdx - 1 : 0;
    const baselineStart = Math.max(0, baselineEnd - active.baselineDays + 1);

    // Experiment window: from start date forward, up to durationDays, capped by available data
    const expStart = safeStartIdx;
    const expEnd = Math.min(endIdx, expStart + active.durationDays - 1);

    const baselineArr = (series as any)[meta.key]?.slice(baselineStart, baselineEnd + 1) as number[] | undefined;
    const expArr = (series as any)[meta.key]?.slice(expStart, expEnd + 1) as number[] | undefined;

    const baselineAvg = baselineArr ? avg(baselineArr) : null;
    const expAvg = expArr ? avg(expArr) : null;

    if (baselineAvg == null || expAvg == null) {
      return {
        blocked: false as const,
        meta,
        baselineAvg,
        expAvg,
        deltaPct: null as number | null,
        progressDays: expArr?.length ?? 0,
        totalDays: active.durationDays,
        verdict: "Not enough data" as const,
        verdictHint: "Need more days to compare against baseline.",
        nextStep: "Keep tracking for a few more days, then re-check the result.",
        goal: null as null | { label: string; ok: boolean; hint: string },
      };
    }

    const rawDeltaPct = pctChange(baselineAvg, expAvg);
    const deltaPct = rawDeltaPct == null ? null : clamp(rawDeltaPct, -200, 200);
    const abs = deltaPct == null ? 0 : Math.abs(deltaPct);

    // classify effect 
    const neutralBand = 2; 
    const improved =
      deltaPct == null
        ? null
        : meta.higherIsBetter
          ? deltaPct >= neutralBand
          : deltaPct <= -neutralBand;

    const worsened =
      deltaPct == null
        ? null
        : meta.higherIsBetter
          ? deltaPct <= -neutralBand
          : deltaPct >= neutralBand;

    const verdict =
      deltaPct == null
        ? ("Not enough data" as const)
        : improved
          ? ("Helped" as const)
          : worsened
            ? ("Hurt" as const)
            : ("Neutral" as const);

    const directionWord =
      deltaPct == null
        ? "changed"
        : deltaPct >= 0
          ? "increased"
          : "decreased";

    const verdictHint =
      deltaPct == null
        ? "Couldn’t compute a stable percent change yet."
        : `${meta.label} ${directionWord} by ${abs.toFixed(0)}% vs baseline (baseline avg ${baselineAvg.toFixed(
            1
          )}, experiment avg ${expAvg.toFixed(1)}).`;

    const progressDays = expArr?.length ?? 0;
    const done = progressDays >= active.durationDays;

    let nextStep = "Keep going until the experiment window completes.";
    if (done) {
      if (verdict === "Helped") nextStep = "Keep this habit for another 7 days to see if it stays consistent.";
      else if (verdict === "Neutral") nextStep = "Try extending to 7 days or switch to a different lever from another insight.";
      else if (verdict === "Hurt") nextStep = "Stop this change and pick a safer, smaller adjustment (or focus on recovery).";
    }

    const goalLabel = meta.goalLabel?.(goals) ?? null;
    const goalCmp = meta.goalCompare?.(expAvg, goals) ?? null;

    const goal =
      goalLabel && goalCmp
        ? { label: goalLabel, ok: goalCmp.ok, hint: goalCmp.hint }
        : null;

    return {
      blocked: false as const,
      meta,
      baselineAvg,
      expAvg,
      deltaPct,
      progressDays,
      totalDays: active.durationDays,
      verdict,
      verdictHint,
      nextStep,
      goal,
    };
  }, [series, active, perms, goals]);

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[hsl(262_78%_45%)] to-[hsl(38_92%_50%)]" />
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
            Experiment Engine
          </span>

          <Badge variant="secondary" className="font-normal">
            {active ? "Active" : "Suggested"}
          </Badge>
        </CardTitle>

        <p className="text-sm text-muted-foreground">
          Converts the actionable recommendation into a small, testable experiment and produces a single rubric-style result sentence.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading || !series ? (
          <div className="h-28 rounded-lg border bg-muted/20" />
        ) : !active ? (
          <>
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="text-sm font-medium">Recommended experiment</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {labelForKind(recommendedKind)} • Baseline {baselineDays}d • Duration {recommendedDuration}d
              </div>

              {topPack ? (
                <div className="mt-3 rounded-lg border bg-background p-3">
                  <div className="text-sm font-semibold">{topPack.action}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{topPack.because}</div>
                </div>
              ) : (
                <div className="mt-3 text-sm text-muted-foreground">
                  No top recommendation yet — enable more permissions or collect more days.
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  onClick={startExperiment}
                  disabled={!topPack}
                  className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-600/40 disabled:text-white/70"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Start experiment
                </Button>

                <Button variant="outline" asChild>
                  <Link href="/settings">Adjust goals / permissions</Link>
                </Button>
              </div>
            </div>

            <details className="rounded-lg border bg-background p-4">
              <summary className="cursor-pointer text-sm font-medium">How it works</summary>
              <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                <p>
                  The most important detected pattern is picked (anomaly first, otherwise the strongest correlation),
                  and translated into a 3–7 day experiment, and is comparing your experiment window to a baseline window.
                </p>
                <p>Output is directional and interpretable, not medical advice.</p>
              </div>
            </details>
          </>
        ) : (
          <>
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">Active experiment</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {active.label} • Baseline {active.baselineDays}d • Duration {active.durationDays}d
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Started on data date: <span className="font-medium">{active.startDate}</span>
                  </div>
                </div>

                <Button variant="outline" size="sm" onClick={resetExperiment}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </div>

              <Separator className="my-3" />

              <div className="rounded-lg border bg-background p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  Result
                </div>

                {!result ? (
                  <div className="mt-2 text-sm text-muted-foreground">Not enough data yet.</div>
                ) : (
                  <>
                    <div className="mt-2 text-sm">
                      <span className="font-semibold">{(result as any).rubricSentence}</span>
                    </div>

                    <div className="mt-2 text-xs text-muted-foreground">
                      Progress: <span className="font-medium">{(result as any).progressLabel}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Post-experiment interpretation + goal alignment */}
              {interpretation ? (
                <div className="mt-3 space-y-3">
                  {/* Interpretation */}
                  <div className="rounded-lg border bg-background p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium">Interpretation</div>

                      {"blocked" in interpretation && interpretation.blocked ? (
                        <Badge variant="outline" className="font-normal">
                          Blocked
                        </Badge>
                      ) : (
                        <Badge
                          variant={
                            interpretation.verdict === "Helped"
                              ? "secondary"
                              : interpretation.verdict === "Hurt"
                                ? "destructive"
                                : "outline"
                          }
                          className="font-normal"
                        >
                          {interpretation.verdict}
                        </Badge>
                      )}
                    </div>

                    {"blocked" in interpretation && interpretation.blocked ? (
                      <div className="mt-2 text-sm text-muted-foreground">{interpretation.note}</div>
                    ) : (
                      <>
                        <div className="mt-2 text-sm text-muted-foreground">{interpretation.verdictHint}</div>

                        <div className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                          {interpretation.verdict === "Helped" ? (
                            <TrendingUp className="mt-0.5 h-4 w-4" />
                          ) : interpretation.verdict === "Hurt" ? (
                            <TrendingDown className="mt-0.5 h-4 w-4" />
                          ) : (
                            <Info className="mt-0.5 h-4 w-4" />
                          )}
                          <span>{interpretation.nextStep}</span>
                        </div>

                        <div className="mt-2 text-xs text-muted-foreground">
                          Computed from averages: baseline window vs experiment window (percent change).
                        </div>
                      </>
                    )}
                  </div>

                  {/* Goal alignment */}
                  <div className="rounded-lg border bg-background p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        Goal alignment
                      </div>

                      {interpretation.goal ? (
                        <Badge variant={interpretation.goal.ok ? "secondary" : "outline"} className="font-normal">
                          {interpretation.goal.ok ? "On track" : "Off track"}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="font-normal">
                          No goal set
                        </Badge>
                      )}
                    </div>

                    <div className="mt-2 text-sm text-muted-foreground">
                      {interpretation.goal ? (
                        <>
                          <span className="font-medium">{interpretation.goal.label}</span>{" "}
                          <span className="text-muted-foreground">({interpretation.goal.hint})</span>
                        </>
                      ) : (
                        <>
                          Set a goal in{" "}
                          <Link href="/settings" className="underline">
                            Settings
                          </Link>{" "}
                          to judge whether this experiment is moving you toward a target (not just vs baseline).
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {needsGoals ? (
                <div className="mt-3 text-xs text-muted-foreground">
                  Tip: Set goals in{" "}
                  <Link href="/settings" className="underline">
                    Settings
                  </Link>{" "}
                  to make your action packs and tests more personalized.
                </div>
              ) : null}
            </div>

            <details className="rounded-lg border bg-background p-4">
              <summary className="cursor-pointer text-sm font-medium">How it works</summary>
              <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                <p>
                  The average outcome in your experiment window is compared against your baseline window and the
                  difference is summarized as a percent change.
                </p>
                <p>This is designed for clarity rather than clinical accuracy.</p>
              </div>
            </details>
          </>
        )}
      </CardContent>
    </Card>
  );
}