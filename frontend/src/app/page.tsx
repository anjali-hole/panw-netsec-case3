"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Wellness Aggregator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            A modular wellness dashboard that unifies daily metrics and surfaces patterns.
          </p>

          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/dashboard">Open dashboard</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/login">Profile setup</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/insights">View insights</Link>
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            Demo data is used when connected sources are not available.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}