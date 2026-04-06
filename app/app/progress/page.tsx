"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getProgressData } from "@/actions/daily-log";

type LogEntry = {
  log_date: string;
  weight_kg: number | null;
  calories_kcal: number | null;
  steps: number | null;
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()}.${d.getMonth() + 1}.`;
}

function NoData() {
  return (
    <p className="py-8 text-center text-sm text-gray-500">
      Nema dovoljno podataka za prikaz grafa
    </p>
  );
}

export default function ProgressPage() {
  const [data, setData] = useState<LogEntry[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const result = await getProgressData();
      if (result.data) {
        setData(result.data as LogEntry[]);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="size-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const chartData = (data || []).map((d) => ({
    date: formatDate(d.log_date),
    weight: d.weight_kg,
    calories: d.calories_kcal,
    steps: d.steps,
  }));

  const weightData = chartData.filter((d) => d.weight != null);
  const caloriesData = chartData.filter((d) => d.calories != null);
  const stepsData = chartData.filter((d) => d.steps != null);

  return (
    <div className="p-4 pb-8">
      <h1 className="mb-6 text-2xl font-bold">Napredak</h1>

      {/* Weight chart */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Težina (kg)</h2>
        {weightData.length < 3 ? (
          <NoData />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={weightData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                domain={["dataMin - 1", "dataMax + 1"]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: 8,
                  fontSize: 13,
                }}
                labelStyle={{ color: "#9ca3af" }}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3, fill: "#3b82f6" }}
                name="Težina"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Calories chart */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Kalorije (kcal)</h2>
        {caloriesData.length < 3 ? (
          <NoData />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={caloriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: 8,
                  fontSize: 13,
                }}
                labelStyle={{ color: "#9ca3af" }}
              />
              <Line
                type="monotone"
                dataKey="calories"
                stroke="#f97316"
                strokeWidth={2}
                dot={{ r: 3, fill: "#f97316" }}
                name="Kalorije"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Steps chart */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Koraci</h2>
        {stepsData.length < 3 ? (
          <NoData />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stepsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: 8,
                  fontSize: 13,
                }}
                labelStyle={{ color: "#9ca3af" }}
              />
              <Bar
                dataKey="steps"
                fill="#22c55e"
                radius={[4, 4, 0, 0]}
                name="Koraci"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>
    </div>
  );
}
