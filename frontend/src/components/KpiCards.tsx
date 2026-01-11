"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Moon, Footprints, Flame, Candy } from "lucide-react";

type ShowFlags = {
  sleep?: boolean;
  activity?: boolean;  // steps
  nutrition?: boolean; // calories + sugar
};

type Props = {
  avgSleep: number;
  avgSteps: number;
  avgCalories: number;
  avgSugar: number;
  show?: ShowFlags;
};

type KpiTone = "teal" | "slate" | "amber" | "violet";

const TONE: Record<KpiTone, { ring: string; bg: string; text: string }> = {
  teal: {
    ring: "ring-[hsl(173_58%_39%)]/22",
    bg: "bg-[hsl(173_58%_39%)]/12",
    text: "text-[hsl(173_58%_28%)]",
  },
  slate: {
    ring: "ring-[hsl(222_47%_11%)]/14",
    bg: "bg-[hsl(222_47%_11%)]/6",
    text: "text-[hsl(222_47%_11%)]",
  },
  amber: {
    ring: "ring-[hsl(38_92%_50%)]/22",
    bg: "bg-[hsl(38_92%_50%)]/14",
    text: "text-[hsl(25_95%_35%)]",
  },
  violet: {
    ring: "ring-[hsl(262_83%_58%)]/20",
    bg: "bg-[hsl(262_83%_58%)]/12",
    text: "text-[hsl(262_83%_45%)]",
  },
};

export default function KpiCards({
  avgSleep,
  avgSteps,
  avgCalories,
  avgSugar,
  show,
}: Props) {
  const can = {
    sleep: show?.sleep ?? true,
    activity: show?.activity ?? true,
    nutrition: show?.nutrition ?? true,
  };

  const cards: React.ReactNode[] = [];

  if (can.sleep) {
    cards.push(
      <KpiCard
        key="sleep"
        tone="teal"
        label="Avg Sleep"
        value={`${clampNumber(avgSleep).toFixed(2)} h`}
        meta="Sleep duration"
        icon={<Moon className="h-4 w-4" aria-hidden="true" />}
      />
    );
  }

  if (can.activity) {
    cards.push(
      <KpiCard
        key="steps"
        tone="slate"
        label="Avg Steps"
        value={Math.round(clampNumber(avgSteps)).toLocaleString()}
        meta="Daily activity"
        icon={<Footprints className="h-4 w-4" aria-hidden="true" />}
      />
    );
  }

  if (can.nutrition) {
    cards.push(
      <KpiCard
        key="calories"
        tone="violet"
        label="Avg Calories"
        value={Math.round(clampNumber(avgCalories)).toLocaleString()}
        meta="Energy estimate"
        icon={<Flame className="h-4 w-4" aria-hidden="true" />}
      />,
      <KpiCard
        key="sugar"
        tone="amber"
        label="Avg Sugar"
        value={`${clampNumber(avgSugar).toFixed(1)} g`}
        meta="Added sugars"
        icon={<Candy className="h-4 w-4" aria-hidden="true" />}
      />
    );
  }

  if (cards.length === 0) {
    return (
      <div className="rounded-xl p-4 text-sm text-muted-foreground">
        No key metrics enabled. Turn on Data Permissions in Settings.
      </div>
    );
  }

  const colClass =
    cards.length === 1
      ? "md:grid-cols-1"
      : cards.length === 2
      ? "md:grid-cols-2"
      : cards.length === 3
      ? "md:grid-cols-3"
      : "md:grid-cols-4";

  return <div className={cn("grid gap-4", colClass)}>{cards}</div>;
}

function KpiCard({
  tone,
  label,
  value,
  meta,
  icon,
}: {
  tone: KpiTone;
  label: string;
  value: string;
  meta: string;
  icon: React.ReactNode;
}) {
  const t = TONE[tone];

  return (
    <Card className="relative overflow-hidden">
      <div className={cn("pointer-events-none absolute inset-0", t.bg)} />

      <div className="relative p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="text-sm font-medium">{label}</div>
            <div className="text-2xl font-semibold tracking-tight">{value}</div>
          </div>

          <div
            className={cn(
              "grid h-10 w-10 place-items-center rounded-xl ring-1",
              t.ring,
              "bg-background/70 backdrop-blur"
            )}
            aria-label={`${label} icon`}
          >
            <span className={cn(t.text)}>{icon}</span>
          </div>
        </div>

        <div className="mt-3 text-xs text-muted-foreground">{meta}</div>
      </div>
    </Card>
  );
}

function clampNumber(n: number) {
  if (!Number.isFinite(n)) return 0;
  return n;
}