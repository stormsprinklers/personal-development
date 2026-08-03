"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PIE_COLORS = [
  "#2f6fed",
  "#34c759",
  "#ff9500",
  "#af52de",
  "#ff2d55",
  "#5ac8fa",
  "#ffcc00",
  "#8e8e93",
];

type IncomeExpensePoint = { month: string; income: number; expense: number };
type CategorySlice = { name: string; amount: number; percent: number };

export function IncomeExpenseChart({ data }: { data: IncomeExpensePoint[] }) {
  if (!data.length) {
    return <p className="text-sm text-ios-secondary">No posted transactions yet this year.</p>;
  }
  return (
    <div className="h-64 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(60,60,67,0.12)" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={(v) => String(v).slice(5)} />
          <YAxis tick={{ fontSize: 11 }} width={40} />
          <Tooltip
            formatter={(value) =>
              typeof value === "number"
                ? value.toLocaleString(undefined, { style: "currency", currency: "USD" })
                : value
            }
          />
          <Legend />
          <Bar dataKey="income" name="Income" fill="#34c759" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expense" name="Spending" fill="#ff9500" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryPieChart({ data }: { data: CategorySlice[] }) {
  if (!data.length) {
    return <p className="text-sm text-ios-secondary">No expense categories to chart.</p>;
  }
  const top = data.slice(0, 8);
  return (
    <div className="h-64 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={top}
            dataKey="amount"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={90}
            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
          >
            {top.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) =>
              typeof value === "number"
                ? value.toLocaleString(undefined, { style: "currency", currency: "USD" })
                : value
            }
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
