
export type Permissions = {
    sleep: boolean;
    activity: boolean;
    nutrition: boolean;
    vitals: boolean;
  };
  
  export type Goals = {
    sleepTargetHours?: number;
    stepsTarget?: number;
    sugarMaxG?: number;
  };
  
  export type TimeSeries = {
    date: string[];
    sleep_hours: number[];
    steps: number[];
    active_minutes: number[];
    calories: number[];
    sugar_g: number[];
    resting_hr: number[];
  };
  
  export type ActionPack = {
    action: string;
    because: string;
    howToTest: string[];
    timeWindowLabel: string; 
    tags: string[]; 
  };
  
  export type ExperimentKind = "sleep_to_sugar" | "sleep_to_steps" | "sleep_to_hr" | "generic";
  
  export type ActiveExperiment = {
    id: string;
    kind: ExperimentKind;
    startedAtISO: string; 
    startDate: string; // series date value closest to "start"
    baselineDays: 30 | 60 | 90;
    durationDays: 3 | 5 | 7;
    label: string; 
  };
  
  const ACTIVE_PROFILE_KEY = "wellness_active_profile_v1";
  const EXPERIMENT_KEY_LEGACY = "wellness_experiment_v1";
  const experimentKey = (profileId: string) => `wellness_experiment_v1:${profileId}`;
  
  function safeParse<T>(raw: string | null): T | null {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
  
  export function getActiveProfileId(): string | null {
    try {
      return localStorage.getItem(ACTIVE_PROFILE_KEY);
    } catch {
      return null;
    }
  }
  
  export function loadActiveExperiment(): ActiveExperiment | null {
    try {
      const pid = getActiveProfileId();
      const raw =
        (pid && localStorage.getItem(experimentKey(pid))) || localStorage.getItem(EXPERIMENT_KEY_LEGACY);
      return safeParse<ActiveExperiment>(raw);
    } catch {
      return null;
    }
  }
  
  export function saveActiveExperiment(exp: ActiveExperiment) {
    const pid = getActiveProfileId();
    try {
      if (pid) localStorage.setItem(experimentKey(pid), JSON.stringify(exp));
      // optional legacy mirror for safety
      localStorage.setItem(EXPERIMENT_KEY_LEGACY, JSON.stringify(exp));
    } catch {}
  }
  
  export function clearActiveExperiment() {
    const pid = getActiveProfileId();
    try {
      if (pid) localStorage.removeItem(experimentKey(pid));
      localStorage.removeItem(EXPERIMENT_KEY_LEGACY);
    } catch {}
  }
  
  export function inferExperimentKindFromActionPack(pack: ActionPack | null): ExperimentKind {
    if (!pack) return "generic";
    const t = (pack.tags ?? []).join(" ").toLowerCase();
  
    if (t.includes("sleep") && (t.includes("nutrition") || t.includes("sugar"))) return "sleep_to_sugar";
    if (t.includes("sleep") && (t.includes("activity") || t.includes("steps"))) return "sleep_to_steps";
    if (t.includes("sleep") && (t.includes("vitals") || t.includes("recovery") || t.includes("hr")))
      return "sleep_to_hr";
  
    return "generic";
  }
  
  function clamp(n: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, n));
  }
  
  function mean(xs: number[]) {
    const arr = xs.filter((v) => Number.isFinite(v));
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
  
  function pctChange(from: number, to: number) {
    if (!Number.isFinite(from) || from === 0) return 0;
    return ((to - from) / from) * 100;
  }
  
  function meanWindow(arr: number[], start: number, end: number) {
    return mean(arr.slice(start, end));
  }
  
  // lagged outcome mean: baseline/experiment window [start,end) for X uses [start+lag,end+lag) for Y
  function meanLaggedOutcome(arr: number[], start: number, end: number, lagDays: number) {
    const s = clamp(start + lagDays, 0, arr.length);
    const e = clamp(end + lagDays, s, arr.length);
    return mean(arr.slice(s, e));
  }
  
  export function findIndexByDate(series: TimeSeries, date: string) {
    return series.date.findIndex((d) => d === date);
  }
  
  export function getLastIndex(series: TimeSeries) {
    return Math.max(0, series.date.length - 1);
  }
  
  export function getBaselineWindow(series: TimeSeries, endIdxExclusive: number, baselineDays: number) {
    const end = clamp(endIdxExclusive, 0, series.date.length);
    const start = clamp(end - baselineDays, 0, end);
    return { start, end }; 
  }
  
  export function getExperimentWindow(series: TimeSeries, startIdx: number, durationDays: number) {
    const start = clamp(startIdx, 0, series.date.length);
    const end = clamp(start + durationDays, start, series.date.length);
    return { start, end }; 
  }
  
  export type ExperimentResult = {
    ready: boolean;
    doneDays: number;
    isComplete: boolean;
    progressLabel: string; 
    rubricSentence: string; 
    details: {
      baselineLabel: string;
      baselineValue: number;
      experimentValue: number;
      changePct: number;
      avgSleepInExperiment?: number;
      lagDays?: number;
    };
  };
  
  export function computeExperimentResult(series: TimeSeries, exp: ActiveExperiment, perms: Permissions): ExperimentResult {
    const startIdx = findIndexByDate(series, exp.startDate);
    const actualStartIdx = startIdx >= 0 ? startIdx : Math.max(0, series.date.length - exp.durationDays);
  
    const expWin = getExperimentWindow(series, actualStartIdx, exp.durationDays);
    const baseWin = getBaselineWindow(series, expWin.start, exp.baselineDays);
  
    const expDaysDone = Math.max(0, getLastIndex(series) - expWin.start + 1);
    const doneDays = clamp(expDaysDone, 0, exp.durationDays);
    const isComplete = doneDays >= exp.durationDays;
  
    const progressLabel = `${Math.min(doneDays, exp.durationDays)}/${exp.durationDays} days`;
  
    // permission guards
    if (exp.kind === "sleep_to_sugar" && (!perms.sleep || !perms.nutrition)) {
      return {
        ready: false,
        doneDays,
        isComplete,
        progressLabel,
        rubricSentence: "Enable Sleep + Nutrition in Settings to run this experiment.",
        details: { baselineLabel: `${exp.baselineDays}d baseline`, baselineValue: 0, experimentValue: 0, changePct: 0 },
      };
    }
  
    if (exp.kind === "sleep_to_steps" && (!perms.sleep || !perms.activity)) {
      return {
        ready: false,
        doneDays,
        isComplete,
        progressLabel,
        rubricSentence: "Enable Sleep + Activity in Settings to run this experiment.",
        details: { baselineLabel: `${exp.baselineDays}d baseline`, baselineValue: 0, experimentValue: 0, changePct: 0 },
      };
    }
  
    if (exp.kind === "sleep_to_hr" && (!perms.sleep || !perms.vitals)) {
      return {
        ready: false,
        doneDays,
        isComplete,
        progressLabel,
        rubricSentence: "Enable Sleep + Vitals in Settings to run this experiment.",
        details: { baselineLabel: `${exp.baselineDays}d baseline`, baselineValue: 0, experimentValue: 0, changePct: 0 },
      };
    }
  
    // Sleep (same-day) for the left-hand condition
    const baselineSleep = meanWindow(series.sleep_hours, baseWin.start, baseWin.end);
    const expSleep = meanWindow(series.sleep_hours, expWin.start, expWin.end);
  
    let baselineValue = 0;
    let expValue = 0;
    let rubricSentence = "Not enough data yet.";
    let lagDays = 0;
  
    const threshold = 6;
  
    if (exp.kind === "sleep_to_sugar") {
      lagDays = 1;
  
      baselineValue = meanLaggedOutcome(series.sugar_g, baseWin.start, baseWin.end, lagDays);
      expValue = meanLaggedOutcome(series.sugar_g, expWin.start, expWin.end, lagDays);
  
      const pct = pctChange(baselineValue, expValue);
  
      const left = expSleep < threshold ? `<${threshold}h sleep` : `≥${threshold}h sleep`;
      const sign = pct >= 0 ? "+" : "";
      rubricSentence = `${left} → ${sign}${pct.toFixed(0)}% sugar next day (vs ${exp.baselineDays}d baseline)`;
  
      return {
        ready: doneDays >= 2,
        doneDays,
        isComplete,
        progressLabel,
        rubricSentence,
        details: {
          baselineLabel: `${exp.baselineDays}d baseline`,
          baselineValue,
          experimentValue: expValue,
          changePct: pct,
          avgSleepInExperiment: expSleep,
          lagDays,
        },
      };
    }
  
    if (exp.kind === "sleep_to_steps") {
      lagDays = 1;
  
      baselineValue = meanLaggedOutcome(series.steps, baseWin.start, baseWin.end, lagDays);
      expValue = meanLaggedOutcome(series.steps, expWin.start, expWin.end, lagDays);
  
      const pct = pctChange(baselineValue, expValue);
  
      const left = expSleep < threshold ? `<${threshold}h sleep` : `≥${threshold}h sleep`;
      const sign = pct >= 0 ? "+" : "";
      rubricSentence = `${left} → ${sign}${pct.toFixed(0)}% steps next day (vs ${exp.baselineDays}d baseline)`;
  
      return {
        ready: doneDays >= 2,
        doneDays,
        isComplete,
        progressLabel,
        rubricSentence,
        details: {
          baselineLabel: `${exp.baselineDays}d baseline`,
          baselineValue,
          experimentValue: expValue,
          changePct: pct,
          avgSleepInExperiment: expSleep,
          lagDays,
        },
      };
    }
  
    if (exp.kind === "sleep_to_hr") {
      lagDays = 1;
  
      baselineValue = meanLaggedOutcome(series.resting_hr, baseWin.start, baseWin.end, lagDays);
      expValue = meanLaggedOutcome(series.resting_hr, expWin.start, expWin.end, lagDays);
  
      const pct = pctChange(baselineValue, expValue);
  
      const left = expSleep < threshold ? `<${threshold}h sleep` : `≥${threshold}h sleep`;
      const sign = pct >= 0 ? "+" : "";
      rubricSentence = `${left} → ${sign}${pct.toFixed(0)}% resting HR next day (vs ${exp.baselineDays}d baseline)`;
  
      return {
        ready: doneDays >= 2,
        doneDays,
        isComplete,
        progressLabel,
        rubricSentence,
        details: {
          baselineLabel: `${exp.baselineDays}d baseline`,
          baselineValue,
          experimentValue: expValue,
          changePct: pct,
          avgSleepInExperiment: expSleep,
          lagDays,
        },
      };
    }
  
    // generic fallback: compare sleep itself (same-day)
    baselineValue = baselineSleep;
    expValue = expSleep;
    const pct = pctChange(baselineValue, expValue);
    const sign = pct >= 0 ? "+" : "";
    rubricSentence = `Sleep change → ${sign}${pct.toFixed(0)}% sleep vs ${exp.baselineDays}d baseline`;
  
    return {
      ready: doneDays >= 2,
      doneDays,
      isComplete,
      progressLabel,
      rubricSentence,
      details: {
        baselineLabel: `${exp.baselineDays}d baseline`,
        baselineValue,
        experimentValue: expValue,
        changePct: pct,
        avgSleepInExperiment: expSleep,
        lagDays: 0,
      },
    };
  }