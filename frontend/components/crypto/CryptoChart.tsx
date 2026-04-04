"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { type TimeRange, type CoinMeta, formatUSD } from "@/services/cryptoApi";

interface Props {
  coin: CoinMeta;
  data: [number, number][];
  loading: boolean;
  error: string | null;
  range: TimeRange;
  onRangeChange: (r: TimeRange) => void;
}

const RANGES: TimeRange[] = ["1D", "1W", "1M", "1Y", "5Y"];

function formatLabel(ts: number, range: TimeRange): string {
  const d = new Date(ts);
  if (range === "1D") return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (range === "1W") return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  if (range === "1M") return d.toLocaleDateString([], { month: "short", day: "numeric" });
  return d.toLocaleDateString([], { month: "short", year: "2-digit" });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { time, price } = payload[0].payload;
  return (
    <div className="bg-white dark:bg-gray-800 border border-[#e5e9f0] dark:border-gray-700 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="text-[#6b7280] dark:text-gray-400 mb-0.5">{new Date(time).toLocaleString()}</p>
      <p className="font-bold text-[#111827] dark:text-white">{formatUSD(price)}</p>
    </div>
  );
}

export default function CryptoChart({ coin, data, loading, error, range, onRangeChange }: Props) {
  const chartData = useMemo(() =>
    data.map(([ts, price]) => ({ time: ts, price })),
    [data]
  );

  const isUp = chartData.length >= 2
    ? chartData[chartData.length - 1].price >= chartData[0].price
    : true;

  const color = isUp ? "#16a34a" : "#dc2626";
  const gradientId = `grad-${coin.id}`;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-[#e5e9f0] dark:border-gray-700 shadow-sm transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-black text-[#111827] dark:text-white text-lg">{coin.name}</h3>
          <p className="text-xs text-[#6b7280] dark:text-gray-400 font-mono">{coin.symbol} / USD</p>
        </div>
        {/* Range selector */}
        <div className="flex items-center gap-1 bg-[#f3f4f6] dark:bg-gray-700 rounded-xl p-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => onRangeChange(r)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                range === r
                  ? "bg-white dark:bg-gray-900 text-[#1a2fb8] dark:text-blue-400 shadow-sm"
                  : "text-[#6b7280] dark:text-gray-400 hover:text-[#111827] dark:hover:text-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div className="h-56">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex gap-1.5">
              {[0, 150, 300].map((d) => (
                <span key={d} className="w-2 h-2 rounded-full bg-[#1a2fb8] dark:bg-blue-400 animate-bounce"
                  style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-[#9ca3af] dark:text-gray-500 text-center">{error}</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-[#9ca3af] dark:text-gray-500">No data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" className="dark:stroke-gray-700" />
              <XAxis
                dataKey="time"
                tickFormatter={(v) => formatLabel(v, range)}
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                minTickGap={40}
              />
              <YAxis
                tickFormatter={(v) => formatUSD(v)}
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                width={72}
                domain={["auto", "auto"]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="price"
                stroke={color}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{ r: 4, fill: color }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
