"use client";

import { useRef, useState } from "react";
import { getGraphPoints, buildLinePath, getMidlineY } from "@/lib/evalGraphGeometry";
import { EVAL_CLAMP_CP } from "@/lib/evalSeries";
import {
  getSeriesIndexFromX,
  formatEvalText,
  formatPointLabel,
} from "@/lib/evalGraphInteraction";

/**
 * EvalGraph — SVG evaluation graph for a chess game review.
 *
 * White advantage is rendered upward, Black advantage downward.
 *
 * Props:
 *   series         {Array}    Output from buildEvalSeries(). Required.
 *   currentIndex   {number}   Optional series index (0 = start position, 1..N = after move N-1).
 *                             When valid, draws an amber vertical marker line + dot.
 *   onSelectIndex  {Function} Optional. Called with the series index when the user
 *                             clicks or taps the graph. Without this prop the graph
 *                             is display-only and carries no pointer cursor.
 */

const VIEW_WIDTH = 600;
const VIEW_HEIGHT = 160;
const PADDING = 8;

const LAYOUT = { width: VIEW_WIDTH, height: VIEW_HEIGHT, padding: PADDING };

export default function EvalGraph({ series, currentIndex, onSelectIndex }) {
  const containerRef = useRef(null);

  // Hover state
  const [hoverIndex, setHoverIndex] = useState(null);

  // Guard: need at least 2 points to draw a meaningful line
  const isValidSeries = Array.isArray(series) && series.length >= 2;

  if (!isValidSeries) {
    return (
      <div
        className="w-full flex items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 text-xs font-medium select-none"
        style={{ height: VIEW_HEIGHT }}
        role="img"
        aria-label="No evaluation data available"
      >
        No evaluation data
      </div>
    );
  }

  const midY = getMidlineY(LAYOUT);
  const points = getGraphPoints(series, LAYOUT);
  const linePath = buildLinePath(points);

  // Validate currentIndex — must be an integer in [0, series.length - 1]
  const hasMarker =
    typeof currentIndex === "number" &&
    Number.isInteger(currentIndex) &&
    currentIndex >= 0 &&
    currentIndex < series.length;

  const markerPoint = hasMarker ? points[currentIndex] : null;

  // Determine hover guide position
  const hasHover =
    hoverIndex !== null &&
    hoverIndex >= 0 &&
    hoverIndex < points.length;
  const hoverPoint = hasHover ? points[hoverIndex] : null;
  const hoverData = hasHover ? series[hoverIndex] : null;

  // Fill areas: white advantage above midline, black below — via clip paths
  const whiteAreaPath =
    linePath.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${midY} L ${points[0].x} ${midY} Z`
      : "";
  const blackAreaPath =
    linePath.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${midY} L ${points[0].x} ${midY} Z`
      : "";

  // ----------------------------------------------------------------
  // Pointer event handlers
  // ----------------------------------------------------------------

  function getViewBoxX(clientX) {
    const el = containerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return null;
    // Scale from container pixels → viewBox coordinates
    return ((clientX - rect.left) / rect.width) * VIEW_WIDTH;
  }

  function handlePointerMove(e) {
    const vx = getViewBoxX(e.clientX);
    if (vx === null) return;
    const idx = getSeriesIndexFromX(vx, { ...LAYOUT, pointCount: series.length });
    setHoverIndex(idx);
  }

  function handlePointerLeave() {
    setHoverIndex(null);
  }

  function handlePointerCancel() {
    setHoverIndex(null);
  }

  function handleClick(e) {
    if (typeof onSelectIndex !== "function") return;
    const vx = getViewBoxX(e.clientX);
    if (vx === null) return;
    const idx = getSeriesIndexFromX(vx, { ...LAYOUT, pointCount: series.length });
    if (idx !== null) {
      onSelectIndex(idx);
    }
  }

  // ----------------------------------------------------------------
  // Tooltip positioning
  // ----------------------------------------------------------------
  // Tooltip is an HTML element positioned absolutely over the container.
  // We compute left/right offset from the hover point's x in viewBox space,
  // converted back to a percentage of the container width.
  let tooltipStyle = null;
  if (hasHover && hoverPoint) {
    const xPct = (hoverPoint.x / VIEW_WIDTH) * 100;
    // If the hover point is in the right half, anchor tooltip to the left of cursor
    const isRightHalf = xPct > 50;
    tooltipStyle = isRightHalf
      ? { right: `${100 - xPct}%`, left: "auto" }
      : { left: `${xPct}%`, right: "auto" };
  }

  return (
    <div
      ref={containerRef}
      className={[
        "relative w-full select-none",
        typeof onSelectIndex === "function" ? "cursor-pointer" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ WebkitUserSelect: "none", userSelect: "none" }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerCancel}
      onClick={handleClick}
    >
      {/* Tooltip: HTML overlay, not SVG text */}
      {hasHover && hoverData && tooltipStyle && (
        <div
          className="pointer-events-none absolute bottom-full mb-1.5 z-10 bg-zinc-900 dark:bg-zinc-800 text-zinc-100 rounded-md shadow-lg px-2.5 py-1.5 text-[11px] leading-snug whitespace-nowrap border border-zinc-700 dark:border-zinc-600"
          style={tooltipStyle}
          aria-hidden="true"
        >
          <div className="font-semibold text-zinc-200">{formatPointLabel(hoverData)}</div>
          <div className="font-mono text-indigo-300">{formatEvalText(hoverData)}</div>
          {hoverData.category && (
            <div className="text-zinc-400 capitalize">{hoverData.category}</div>
          )}
        </div>
      )}

      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        width="100%"
        preserveAspectRatio="none"
        role="img"
        aria-label="Evaluation graph: White advantage shown above center, Black advantage below"
        className="block w-full rounded-lg overflow-hidden bg-zinc-900 dark:bg-zinc-950"
        style={{ display: "block" }}
      >
        {/* Definitions: clip paths for white/black fill areas */}
        <defs>
          {/* White region: anything above midY */}
          <clipPath id="evalClipTop">
            <rect x={0} y={PADDING} width={VIEW_WIDTH} height={midY - PADDING} />
          </clipPath>
          {/* Black region: anything below midY */}
          <clipPath id="evalClipBottom">
            <rect x={0} y={midY} width={VIEW_WIDTH} height={VIEW_HEIGHT - midY - PADDING} />
          </clipPath>
        </defs>

        {/* Background: dark board-like split */}
        {/* Upper half — very subtle white tint */}
        <rect
          x={0}
          y={PADDING}
          width={VIEW_WIDTH}
          height={midY - PADDING}
          className="fill-zinc-800 dark:fill-zinc-900"
          opacity={0.5}
        />
        {/* Lower half — very subtle black tint */}
        <rect
          x={0}
          y={midY}
          width={VIEW_WIDTH}
          height={VIEW_HEIGHT - midY - PADDING}
          className="fill-zinc-950 dark:fill-black"
          opacity={0.5}
        />

        {/* White advantage fill area (above midline, clipped to upper half) */}
        {whiteAreaPath && (
          <path
            d={whiteAreaPath}
            clipPath="url(#evalClipTop)"
            className="fill-white/25 dark:fill-white/20"
          />
        )}

        {/* Black advantage fill area (below midline, clipped to lower half) */}
        {blackAreaPath && (
          <path
            d={blackAreaPath}
            clipPath="url(#evalClipBottom)"
            className="fill-black/30 dark:fill-black/40"
          />
        )}

        {/* Midline (zero evaluation) */}
        <line
          x1={PADDING}
          y1={midY}
          x2={VIEW_WIDTH - PADDING}
          y2={midY}
          strokeWidth={1}
          strokeDasharray="3 3"
          className="stroke-zinc-500 dark:stroke-zinc-600"
        />

        {/* Evaluation line */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            className="stroke-indigo-400 dark:stroke-indigo-400"
          />
        )}

        {/* Hover guide line — distinct from amber marker */}
        {hoverPoint && (
          <line
            x1={hoverPoint.x}
            y1={PADDING}
            x2={hoverPoint.x}
            y2={VIEW_HEIGHT - PADDING}
            strokeWidth={1}
            className="stroke-sky-400/60 dark:stroke-sky-300/50"
          />
        )}

        {/* Current position marker — amber vertical line + dot */}
        {markerPoint && (
          <>
            <line
              x1={markerPoint.x}
              y1={PADDING}
              x2={markerPoint.x}
              y2={VIEW_HEIGHT - PADDING}
              strokeWidth={1.5}
              className="stroke-amber-400 dark:stroke-amber-400"
              opacity={0.85}
            />
            <circle
              cx={markerPoint.x}
              cy={markerPoint.y}
              r={4}
              strokeWidth={2}
              className="fill-amber-400 stroke-zinc-900 dark:fill-amber-400 dark:stroke-zinc-950"
            />
          </>
        )}

        {/* Hover dot on the eval line */}
        {hoverPoint && (
          <circle
            cx={hoverPoint.x}
            cy={hoverPoint.y}
            r={3}
            strokeWidth={1.5}
            className="fill-sky-400 stroke-zinc-900 dark:fill-sky-300 dark:stroke-zinc-950"
          />
        )}

        {/* Edge labels: "+W" top-left, "+B" bottom-left — subtle orientation cues */}
        <text
          x={PADDING + 2}
          y={PADDING + 10}
          fontSize={9}
          className="fill-zinc-500 dark:fill-zinc-600"
          fontFamily="monospace"
          aria-hidden="true"
        >
          +W
        </text>
        <text
          x={PADDING + 2}
          y={VIEW_HEIGHT - PADDING - 3}
          fontSize={9}
          className="fill-zinc-500 dark:fill-zinc-600"
          fontFamily="monospace"
          aria-hidden="true"
        >
          +B
        </text>
      </svg>
    </div>
  );
}
