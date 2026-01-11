"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Database, CheckCircle2 } from "lucide-react";

type SourceStatus = {
  sources: Record<string, { connected: boolean; days: number; last_sync_iso?: string | null }>;
  coverage: Record<string, { covered_days: number; total_days: number; pct: number }>;
  last_sync_iso?: string | null;
};

export default function DataSourcesCard({
  status,
}: {
  status: SourceStatus | null;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[hsl(38_92%_50%)] to-[hsl(262_78%_45%)]" />
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            Data Sources
          </span>
          <Badge variant="secondary" className="font-normal">
            Unification pipeline
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Connected sources + coverage of unified daily records (by date).
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {!status ? (
          <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
            Loading sources…
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              {Object.entries(status.sources ?? {}).map(([name, s]) => (
                <div key={name} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">{name}</div>
                    <Badge variant={s.connected ? "secondary" : "outline"} className="font-normal">
                      {s.connected ? "Connected" : "Off"}
                    </Badge>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Days contributed: <span className="font-medium">{s.days}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Last sync: <span className="font-medium">{s.last_sync_iso ?? "—"}</span>
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                Unified coverage
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {Object.entries(status.coverage ?? {}).map(([k, v]) => (
                  <div key={k} className="rounded-lg border bg-muted/20 p-3">
                    <div className="text-sm font-medium">{k.replaceAll("_", " ")}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {v.covered_days}/{v.total_days} days • <span className="font-medium">{v.pct}%</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-xs text-muted-foreground">
                Unified record = merged-by-date row with provenance (which source contributed each metric).
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}