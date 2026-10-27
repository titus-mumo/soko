"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  compact,
  hourLabel,
  niceTicks,
  tickEvery,
  useWidth,
} from "./chart-utils";

// Small hand-rolled SVG charts for the admin monitoring page: one y-axis,
// thin marks, recessive grid, a hover readout listing every series, a legend,
// and a table view so no value depends on hovering or on colour.

export interface Series<K extends string> {
  key: K;
  label: string;
  /** A CSS colour, normally a var(--viz-…) token. */
  color: string;
}

type Row<K extends string> = { hour: string } & Record<K, number>;

const HEIGHT = 200;
const PAD = { top: 12, right: 12, bottom: 26, left: 40 };

function Frame({
  title,
  description,
  legend,
  table,
  children,
}: {
  title: string;
  description?: string;
  legend: React.ReactNode;
  table: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <figure className="viz rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
      <figcaption className="mb-3 space-y-2">
        <div>
          <h3 className="font-sans text-sm font-semibold tracking-normal text-zinc-900 dark:text-zinc-100">
            {title}
          </h3>
          {description && (
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {description}
            </p>
          )}
        </div>
        {legend}
      </figcaption>
      {children}
      <details className="mt-3 text-xs">
        <summary className="cursor-pointer select-none text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200">
          Show as table
        </summary>
        <div className="mt-2 max-h-64 overflow-auto">{table}</div>
      </details>
    </figure>
  );
}

function Legend<K extends string>({
  series,
  mark,
}: {
  series: Series<K>[];
  mark: "rect" | "line";
}) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-300">
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={
              mark === "rect"
                ? "h-2.5 w-2.5 rounded-sm"
                : "h-0.5 w-3.5 rounded-full"
            }
            style={{ background: s.color }}
          />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

function DataTable<K extends string>({
  rows,
  series,
  format,
}: {
  rows: Row<K>[];
  series: Series<K>[];
  format: (n: number) => string;
}) {
  return (
    <table className="w-full text-left">
      <thead className="sticky top-0 bg-white text-zinc-500 dark:bg-zinc-900">
        <tr>
          <th scope="col" className="py-1 pr-3 font-medium">
            Hour
          </th>
          {series.map((s) => (
            <th
              key={s.key}
              scope="col"
              className="py-1 pr-3 text-right font-medium"
            >
              {s.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="tabular font-mono text-zinc-700 dark:text-zinc-300">
        {[...rows].reverse().map((r) => (
          <tr
            key={r.hour}
            className="border-t border-zinc-100 dark:border-zinc-800"
          >
            <td className="py-1 pr-3">{hourLabel(r.hour, true)}</td>
            {series.map((s) => (
              <td key={s.key} className="py-1 pr-3 text-right">
                {format(r[s.key])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** The hover readout: the hour, then every series' value (values lead). */
function Readout<K extends string>({
  row,
  series,
  format,
  total,
  x,
  width,
}: {
  row: Row<K>;
  series: Series<K>[];
  format: (n: number) => string;
  total?: number;
  x: number;
  width: number;
}) {
  const left = Math.min(Math.max(x + 12, 0), width - 170);
  return (
    <div
      role="status"
      className="pointer-events-none absolute top-1 z-10 w-40 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
      style={{ left }}
    >
      <p className="mb-1 text-zinc-500 dark:text-zinc-400">
        {hourLabel(row.hour, true)}
      </p>
      <ul className="space-y-0.5">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-0.5 w-3 rounded-full"
              style={{ background: s.color }}
            />
            <span className="tabular font-mono font-semibold text-zinc-900 dark:text-zinc-100">
              {format(row[s.key])}
            </span>
            <span className="truncate text-zinc-500 dark:text-zinc-400">
              {s.label}
            </span>
          </li>
        ))}
        {total !== undefined && (
          <li className="mt-1 border-t border-zinc-100 pt-1 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <span className="tabular font-mono font-semibold text-zinc-900 dark:text-zinc-100">
              {format(total)}
            </span>{" "}
            total
          </li>
        )}
      </ul>
    </div>
  );
}

function Axes({
  ticks,
  y,
  plotW,
  rows,
  xAt,
  width,
  format,
}: {
  ticks: number[];
  y: (v: number) => number;
  plotW: number;
  rows: { hour: string }[];
  xAt: (i: number) => number;
  width: number;
  format: (n: number) => string;
}) {
  const every = tickEvery(rows.length, plotW);
  const spansDays = rows.length > 24;
  return (
    <g fontSize={10} fill="var(--viz-muted)">
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={PAD.left}
            x2={width - PAD.right}
            y1={y(t)}
            y2={y(t)}
            stroke={t === 0 ? "var(--viz-axis)" : "var(--viz-grid)"}
            strokeWidth={1}
          />
          <text
            x={PAD.left - 6}
            y={y(t)}
            dy="0.32em"
            textAnchor="end"
            className="tabular"
          >
            {format(t)}
          </text>
        </g>
      ))}
      {rows.map((r, i) =>
        (rows.length - 1 - i) % every === 0 ? (
          <text key={r.hour} x={xAt(i)} y={HEIGHT - 8} textAnchor="middle">
            {hourLabel(r.hour, spansDays && new Date(r.hour).getHours() === 0)}
          </text>
        ) : null,
      )}
    </g>
  );
}

/** Columns per hour, stacked by series (e.g. outcome), 2px gaps, 4px caps. */
export function StackedColumnChart<K extends string>({
  title,
  description,
  rows,
  series,
  format = compact,
}: {
  title: string;
  description?: string;
  rows: Row<K>[];
  series: Series<K>[];
  format?: (n: number) => string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const totals = rows.map((r) => series.reduce((n, s) => n + r[s.key], 0));
  const ticks = niceTicks(Math.max(0, ...totals));
  const top = ticks[ticks.length - 1];
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH;
  const band = rows.length ? plotW / rows.length : 0;
  const barW = Math.max(2, Math.min(24, band * 0.7));
  const xAt = (i: number) => PAD.left + band * i + band / 2;

  return (
    <Frame
      title={title}
      description={description}
      legend={<Legend series={series} mark="rect" />}
      table={<DataTable rows={rows} series={series} format={format} />}
    >
      <div ref={ref} className="relative" onPointerLeave={() => setHover(null)}>
        {width > 0 && (
          <svg width={width} height={HEIGHT} role="img" aria-label={title}>
            <Axes
              ticks={ticks}
              y={y}
              plotW={plotW}
              rows={rows}
              xAt={xAt}
              width={width}
              format={format}
            />
            {rows.map((r, i) => {
              let acc = 0;
              const parts = series
                .map((s) => ({ s, v: r[s.key] }))
                .filter((p) => p.v > 0);
              return (
                <g
                  key={r.hour}
                  opacity={hover === null || hover === i ? 1 : 0.55}
                >
                  {parts.map(({ s, v }, j) => {
                    const y0 = y(acc);
                    acc += v;
                    const y1 = y(acc);
                    const isTop = j === parts.length - 1;
                    // 2px surface gap between stacked segments.
                    const h = Math.max(1, y0 - y1 - (j > 0 ? 2 : 0));
                    const yTop = y1;
                    const x = xAt(i) - barW / 2;
                    const rad = isTop ? Math.min(4, h, barW / 2) : 0;
                    return (
                      <path
                        key={s.key}
                        fill={s.color}
                        d={`M${x},${yTop + h} V${yTop + rad} Q${x},${yTop} ${x + rad},${yTop} H${x + barW - rad} Q${x + barW},${yTop} ${x + barW},${yTop + rad} V${yTop + h} Z`}
                      />
                    );
                  })}
                  {/* Hit area: the whole hour band, not just the bar. */}
                  <rect
                    x={PAD.left + band * i}
                    y={PAD.top}
                    width={band}
                    height={plotH}
                    fill="transparent"
                    tabIndex={0}
                    aria-label={`${hourLabel(r.hour, true)}: ${totals[i]} requests`}
                    onPointerEnter={() => setHover(i)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                    className="outline-none"
                  />
                </g>
              );
            })}
          </svg>
        )}
        {hover !== null && rows[hover] && (
          <Readout
            row={rows[hover]}
            series={series}
            format={format}
            total={totals[hover]}
            x={xAt(hover)}
            width={width}
          />
        )}
      </div>
    </Frame>
  );
}

/** Lines per hour on one axis, with a crosshair that snaps to the hour. */
export function LineChart<K extends string>({
  title,
  description,
  rows,
  series,
  format = compact,
}: {
  title: string;
  description?: string;
  rows: Row<K>[];
  series: Series<K>[];
  format?: (n: number) => string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const max = Math.max(0, ...rows.flatMap((r) => series.map((s) => r[s.key])));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH;
  const step = rows.length > 1 ? plotW / (rows.length - 1) : 0;
  const xAt = (i: number) => PAD.left + step * i;

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const i = Math.round((e.clientX - box.left) / (step || 1));
    setHover(Math.min(rows.length - 1, Math.max(0, i)));
  };

  return (
    <Frame
      title={title}
      description={description}
      legend={<Legend series={series} mark="line" />}
      table={<DataTable rows={rows} series={series} format={format} />}
    >
      <div ref={ref} className="relative" onPointerLeave={() => setHover(null)}>
        {width > 0 && (
          <svg width={width} height={HEIGHT} role="img" aria-label={title}>
            <Axes
              ticks={ticks}
              y={y}
              plotW={plotW}
              rows={rows}
              xAt={xAt}
              width={width}
              format={format}
            />
            {series.map((s) => (
              <polyline
                key={s.key}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                points={rows
                  .map((r, i) => `${xAt(i)},${y(r[s.key])}`)
                  .join(" ")}
              />
            ))}
            {hover !== null && (
              <g>
                <line
                  x1={xAt(hover)}
                  x2={xAt(hover)}
                  y1={PAD.top}
                  y2={PAD.top + plotH}
                  stroke="var(--viz-axis)"
                  strokeWidth={1}
                />
                {series.map((s) => (
                  <circle
                    key={s.key}
                    cx={xAt(hover)}
                    cy={y(rows[hover][s.key])}
                    r={4}
                    fill={s.color}
                    stroke="var(--viz-surface)"
                    strokeWidth={2}
                  />
                ))}
              </g>
            )}
            <rect
              x={PAD.left - step / 2}
              y={PAD.top}
              width={plotW + step}
              height={plotH}
              fill="transparent"
              onPointerMove={onMove}
              onPointerDown={onMove}
            />
          </svg>
        )}
        {hover !== null && rows[hover] && (
          <Readout
            row={rows[hover]}
            series={series}
            format={format}
            x={xAt(hover)}
            width={width}
          />
        )}
      </div>
    </Frame>
  );
}

/** Keyboard/scan-friendly: a number with a label and an optional note. */
export function StatTile({
  label,
  value,
  note,
  tone = "default",
}: {
  label: string;
  value: string;
  note?: React.ReactNode;
  tone?: "default" | "warning" | "critical";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-white p-4 dark:bg-zinc-900",
        tone === "critical"
          ? "border-red-300 dark:border-red-500/40"
          : tone === "warning"
            ? "border-amber-300 dark:border-amber-500/40"
            : "border-zinc-200 dark:border-zinc-800",
      )}
    >
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
      {note && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{note}</p>
      )}
    </div>
  );
}
