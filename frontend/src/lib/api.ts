import { API_BASE } from "./config";

export async function getSourcesStatus(rangeDays = 30) {
  const res = await fetch(`${API_BASE}/sources/status?range_days=${rangeDays}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch sources status");
  return res.json();
}

export async function getSummary(rangeDays = 30) {
  const res = await fetch(`${API_BASE}/dashboard/summary?range_days=${rangeDays}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch summary");
  return res.json();
}

export async function getTimeseries(rangeDays = 30) {
  const res = await fetch(`${API_BASE}/dashboard/timeseries?range_days=${rangeDays}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch timeseries");
  return res.json();
}

export async function getInsights(rangeDays = 30) {
  const res = await fetch(`${API_BASE}/insights?range_days=${rangeDays}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch insights");
  return res.json();
}

export async function seedDemo(days = 90) {
  const res = await fetch(`${API_BASE}/demo/seed?days=${days}`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to seed demo data");
  return res.json();
}

export async function getDashboard(rangeDays: number) {
    const [summaryRes, seriesRes] = await Promise.all([
      fetch(`${API_BASE}/dashboard/summary?range_days=${rangeDays}`),
      fetch(`${API_BASE}/dashboard/timeseries?range_days=${rangeDays}`),
    ]);
  
    if (!summaryRes.ok || !seriesRes.ok) {
      throw new Error("Failed to load dashboard data");
    }
  
    const summary = await summaryRes.json();
    const series = await seriesRes.json();
  
    return {
      ...summary,
      series: series.series,
    };
  }