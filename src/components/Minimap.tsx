/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { CARD_WIDTH, LANE_COLOR, LANE_STROKE } from '../constants';
import { Page } from '../types';
import { absPos, cardHeight, laneX, pageH, pageW } from '../utils/geometry';

interface MinimapProps {
  page: Page;
  view: { x: number; y: number; k: number };
  setView: React.Dispatch<React.SetStateAction<{ x: number; y: number; k: number }>>;
  compact: boolean;
  containerWidth: number;
  containerHeight: number;
}

export const Minimap: React.FC<MinimapProps> = ({
  page,
  view,
  setView,
  compact,
  containerWidth,
  containerHeight,
}) => {
  const mmRef = useRef<SVGSVGElement>(null);
  const W = pageW(page);
  const H = pageH(page);

  const jumpTo = (clientX: number, clientY: number) => {
    const el = mmRef.current;
    if (!el) return;
    const b = el.getBoundingClientRect();
    const s = Math.min(b.width / W, b.height / H);
    const wx = (clientX - b.left - (b.width - W * s) / 2) / s;
    const wy = (clientY - b.top - (b.height - H * s) / 2) / s;

    setView((prev) => ({
      ...prev,
      x: containerWidth / 2 - wx * prev.k,
      y: containerHeight / 2 - wy * prev.k,
    }));
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.stopPropagation();
    mmRef.current?.setPointerCapture?.(e.pointerId);
    jumpTo(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.buttons) {
      jumpTo(e.clientX, e.clientY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (mmRef.current && mmRef.current.hasPointerCapture(e.pointerId)) {
      try {
        mmRef.current.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  return (
    <div
      className="absolute left-3 bottom-3 w-40 h-28 bg-white/95 rounded-lg border border-[#D8D6CC] shadow-md p-1 backdrop-blur-xs select-none z-10 overflow-hidden cursor-pointer"
      title="Minimap: Klik atau seret untuk memindahkan pandangan"
    >
      <svg
        ref={mmRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-full block"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Lanes in minimap */}
        {page.lanes.map((l, i) => (
          <rect
            key={l.id}
            x={laneX(page, i)}
            y={0}
            width={l.w}
            height={H}
            fill={l.color || page.hc || LANE_COLOR}
            stroke={LANE_STROKE}
            strokeWidth={3}
          />
        ))}

        {/* Cards in minimap */}
        {page.cards.map((c) => {
          const pos = absPos(page, c);
          const ch = cardHeight(c, compact);
          return (
            <rect
              key={c.id}
              x={pos.x}
              y={pos.y}
              width={CARD_WIDTH}
              height={ch}
              fill="#5F5E5A"
              rx={4}
            />
          );
        })}

        {/* Viewport frame */}
        <rect
          x={-view.x / view.k}
          y={-view.y / view.k}
          width={containerWidth / view.k}
          height={containerHeight / view.k}
          fill="rgba(231, 76, 60, 0.15)"
          stroke="#E74C3C"
          strokeWidth={4}
          rx={4}
        />
      </svg>
    </div>
  );
};
