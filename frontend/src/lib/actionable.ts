// src/lib/actionable.ts

export type InsightType = "correlation" | "anomaly" | string;

export type Insight = {
  id: string;
  type: InsightType;
  title: string;
  summary: string;
  evidence?: Record<string, unknown>;
};

export type Permissions = {
  sleep: boolean;
  activity: boolean;
  nutrition: boolean;
  vitals: boolean;
};

export type ActionPack = {
  action: string;
  because: string;
  howToTest: string[];
  timeWindowLabel: string;
  tags: string[];
};

const DEFAULT_DAYS = 3;

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function inferDomain(text: string) {
  const t = text.toLowerCase();
  return {
    sleep: /sleep|bed|insomnia|hours/.test(t),
    steps: /steps|walk|activity|active|workout/.test(t),
    sugar: /sugar|sweet|dessert|carb|nutrition|calorie/.test(t),
    hr: /heart|hr|resting/.test(t),
  };
}

function readEffectPercent(evidence?: Record<string, unknown>) {
  const v =
    (evidence?.effect_percent as unknown) ??
    (evidence?.effectPct as unknown) ??
    (evidence?.delta_percent as unknown) ??
    (evidence?.deltaPct as unknown);

  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return clamp(Math.round(n), -60, 60);
}

function effectText(effect: number | null) {
  if (effect == null) return "a measurable shift versus baseline";
  return `${effect > 0 ? "+" : ""}${effect}% versus baseline`;
}

export function buildActionPack(insight: Insight): ActionPack {
  const text = `${insight.title} ${insight.summary}`;
  const dom = inferDomain(text);
  const effect = readEffectPercent(insight.evidence);

  if (insight.type === "anomaly") {
    if (dom.hr) {
      return {
        action: "Today: keep intensity moderate and prioritize hydration and rest.",
        because: `Because resting HR deviated from the recent baseline (${effectText(effect)}).`,
        howToTest: [`Repeat for ${DEFAULT_DAYS} days and watch for persistence.`],
        timeWindowLabel: `Try for ${DEFAULT_DAYS} days`,
        tags: ["Vitals", "Recovery"],
      };
    }

    if (dom.sleep) {
      return {
        action: "Tonight: keep a consistent sleep window and avoid late screens.",
        because: `Because sleep deviated from the recent baseline (${effectText(effect)}).`,
        howToTest: [`Repeat for ${DEFAULT_DAYS} days and watch for persistence.`],
        timeWindowLabel: `Try for ${DEFAULT_DAYS} days`,
        tags: ["Sleep"],
      };
    }

    if (dom.sugar) {
      return {
        action: "Today: plan a balanced snack (protein + fiber) to reduce sugar swings.",
        because: `Because nutrition deviated from the recent baseline (${effectText(effect)}).`,
        howToTest: [`Repeat for ${DEFAULT_DAYS} days and watch for persistence.`],
        timeWindowLabel: `Try for ${DEFAULT_DAYS} days`,
        tags: ["Nutrition"],
      };
    }

    return {
      action: "Today: do a quick check-in and keep the day lighter than usual if needed.",
      because: `Because an unusual pattern was detected (${effectText(effect)}).`,
      howToTest: [`Repeat for ${DEFAULT_DAYS} days and watch for persistence.`],
      timeWindowLabel: `Try for ${DEFAULT_DAYS} days`,
      tags: ["Anomaly"],
    };
  }

  // Correlations
  const threshold = 6;

  if (dom.sleep && dom.sugar) {
    const e = effect == null ? "" : ` (${effect > 0 ? "+" : ""}${effect}%)`;
    return {
      action: "Tonight: target 7–8 hours of sleep with a consistent bedtime.",
      because: `Because lower sleep tends to align with higher sugar the next day${e}.`,
      howToTest: [
        `Pick a ${DEFAULT_DAYS}-day window. Keep meals steady; change only sleep timing.`,
        "Compare next-day sugar to the recent baseline.",
      ],
      timeWindowLabel: `Try for ${DEFAULT_DAYS} days`,
      tags: ["Sleep", "Nutrition"],
    };
  }

  if (dom.sleep && dom.steps) {
    return {
      action: "Tonight: protect sleep and schedule a short walk the next day.",
      because: "Because sleep and steps tend to move together across recent days.",
      howToTest: [
        `For ${DEFAULT_DAYS} days, keep wake time consistent.`,
        "Add one 15–20 minute walk and compare steps to baseline.",
      ],
      timeWindowLabel: `Try for ${DEFAULT_DAYS} days`,
      tags: ["Sleep", "Activity"],
    };
  }

  if (dom.hr && dom.sleep) {
    return {
      action: "Tonight: do a 10–15 minute wind-down routine and aim for earlier sleep.",
      because: `Because lower sleep tends to align with higher resting HR (threshold ~${threshold}h).`,
      howToTest: [
        `For ${DEFAULT_DAYS} days, keep caffeine cutoff earlier in the day.`,
        "Compare next-morning resting HR to baseline.",
      ],
      timeWindowLabel: `Try for ${DEFAULT_DAYS} days`,
      tags: ["Sleep", "Vitals"],
    };
  }

  return {
    action: "Today: keep one lever steady (sleep, steps, or sugar) to confirm directionality.",
    because: "Because stable inputs make patterns easier to validate.",
    howToTest: [
      `Run a ${DEFAULT_DAYS}-day check: change only one variable.`,
      "Revisit after a few data points to see if the pattern holds.",
    ],
    timeWindowLabel: `Try for ${DEFAULT_DAYS} days`,
    tags: ["Consistency"],
  };
}

export function chooseTopAction(insights: Insight[]) {
  const anomalies = insights.filter((i) => i.type === "anomaly");
  if (anomalies.length) return anomalies[0];

  const best =
    insights.find((i) => {
      const t = (i.title + i.summary).toLowerCase();
      return /sleep/.test(t) && /sugar|nutrition/.test(t);
    }) ?? insights[0] ?? null;

  return best;
}

export function filterInsightsByPerms(insights: Insight[], perms: Permissions) {
  return insights.filter((i) => {
    const t = (i.title + " " + i.summary).toLowerCase();

    const needsSleep = /sleep|bed|insomnia|hours/.test(t);
    const needsActivity = /steps|walk|activity|active|workout/.test(t);
    const needsNutrition = /sugar|calorie|nutrition|carb/.test(t);
    const needsVitals = /heart|hr|resting/.test(t);

    if (needsSleep && !perms.sleep) return false;
    if (needsActivity && !perms.activity) return false;
    if (needsNutrition && !perms.nutrition) return false;
    if (needsVitals && !perms.vitals) return false;

    return true;
  });
}