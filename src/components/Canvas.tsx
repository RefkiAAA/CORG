/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CARD_WIDTH,
  LANE_COLOR,
  LANE_STROKE,
  LEVEL_PLACEHOLDER,
  PARALLELOGRAM_SKEW,
  STATUS_COLORS,
} from '../constants';
import { AnnotationItem, Card, Edge, LegendShapeType, Page, ToolMode } from '../types';
import {
  absPos,
  cardHeight,
  edgeGeometry,
  edgePathD,
  esc,
  getHiddenCardIds,
  getKids,
  getLaneHeadcount,
  isDouble,
  isPara,
  itemHeight,
  itemLines,
  laneX,
  levelText,
  pageH,
  pageW,
  paraShift,
  setAbsPos,
  snapCoord,
} from '../utils/geometry';

interface ViewState {
  x: number;
  y: number;
  k: number;
}

interface CanvasProps {
  page: Page;
  tool: ToolMode;
  setTool: (t: ToolMode) => void;
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedElement: { type: 'card' | 'lane' | 'edge' | 'item'; id: string } | null;
  setSelectedElement: (el: { type: 'card' | 'lane' | 'edge' | 'item'; id: string } | null) => void;
  onUpdateCard: (card: Card) => void;
  onUpdateCards: (cards: Card[]) => void;
  onAddEdge: (from: string, to: string) => void;
  onUpdateEdge?: (edge: Edge) => void;
  onUpdateItem: (item: AnnotationItem) => void;
  compact: boolean;
  searchQuery: string;
  presentation: boolean;
  view: ViewState;
  setView: React.Dispatch<React.SetStateAction<ViewState>>;
}

export const Canvas: React.FC<CanvasProps> = ({
  page,
  tool,
  setTool,
  selectedIds,
  setSelectedIds,
  selectedElement,
  setSelectedElement,
  onUpdateCard,
  onUpdateCards,
  onAddEdge,
  onUpdateEdge,
  onUpdateItem,
  compact,
  searchQuery,
  presentation,
  view,
  setView,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  // Interaction States
  const [pendingSourceId, setPendingSourceId] = useState<string | null>(null);
  const [connectingCursor, setConnectingCursor] = useState<{ x: number; y: number } | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [guideLines, setGuideLines] = useState<{ x?: number; y?: number }[]>([]);
  const [marquee, setMarquee] = useState<{ x: number; y: number; x2: number; y2: number } | null>(null);

  // Dragging refs
  const dragRef = useRef<{
    w: { x: number; y: number };
    id: string;
    cards: { c: Card; a: { x: number; y: number } }[];
    moved: boolean;
    locked: boolean;
  } | null>(null);

  const panRef = useRef<{
    x: number;
    y: number;
    vx: number;
    vy: number;
  } | null>(null);

  const itemDragRef = useRef<{
    item: AnnotationItem;
    w: { x: number; y: number };
    x0: number;
    y0: number;
    moved: boolean;
  } | null>(null);

  const itemResizeRef = useRef<{
    item: AnnotationItem;
    w: { x: number; y: number };
    w0: number;
    h0: number;
  } | null>(null);

  const edgeDragRef = useRef<{
    edgeId: string;
    startW: { x: number; y: number };
    initSdy: number;
    initSdx: number;
    moved: boolean;
  } | null>(null);

  const toWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left - view.x) / view.k,
        y: (clientY - rect.top - view.y) / view.k,
      };
    },
    [view]
  );

  const hiddenIds = getHiddenCardIds(page);
  const H = pageH(page);
  const W = pageW(page);

  // Wheel handling for zoom & pan
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        const newK = Math.min(3, Math.max(0.15, view.k * factor));

        setView((prev) => ({
          k: newK,
          x: mx - ((mx - prev.x) * newK) / prev.k,
          y: my - ((my - prev.y) * newK) / prev.k,
        }));
      } else {
        setView((prev) => ({
          ...prev,
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [view, setView]);

  // Keyboard Escape listener to cancel connecting mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pendingSourceId) {
          setPendingSourceId(null);
          setConnectingCursor(null);
        } else if (tool === 'link') {
          setTool('select');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingSourceId, tool, setTool]);

  // Pointer Down handler
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const target = (e.target as Element).closest('[data-c],[data-e],[data-l],[data-i],[data-rz],[data-fold],[data-cport]');
    const w = toWorld(e.clientX, e.clientY);
    svgRef.current?.setPointerCapture?.(e.pointerId);

    // Presentation mode click to fold
    if (presentation) {
      if (target && target.getAttribute('data-c')) {
        const cid = target.getAttribute('data-c')!;
        const c = page.cards.find((x) => x.id === cid);
        if (c && getKids(page, c.id).length) {
          onUpdateCard({ ...c, col: !c.col });
        }
      } else {
        panRef.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
      }
      return;
    }

    // Fold button clicked
    if (target && target.getAttribute('data-fold')) {
      const cid = target.getAttribute('data-fold')!;
      const c = page.cards.find((x) => x.id === cid);
      if (c) {
        onUpdateCard({ ...c, col: !c.col });
      }
      return;
    }

    // Edge start handle drag
    const eshTarget = target?.closest?.('[data-esh]');
    if (eshTarget) {
      const edgeId = eshTarget.getAttribute('data-esh');
      const edge = page.edges.find((x) => x.id === edgeId);
      if (edge) {
        setSelectedElement({ type: 'edge', id: edge.id });
        setSelectedIds(new Set());
        edgeDragRef.current = {
          edgeId: edge.id,
          startW: w,
          initSdy: edge.sdy || 0,
          initSdx: edge.sdx || 0,
          moved: false,
        };
      }
      return;
    }

    // Annotation resize handle
    if (target && target.getAttribute('data-rz')) {
      const itId = target.getAttribute('data-rz')!;
      const item = (page.items || []).find((i) => i.id === itId);
      if (item) {
        setSelectedElement({ type: 'item', id: item.id });
        setSelectedIds(new Set());
        itemResizeRef.current = {
          item,
          w,
          w0: item.w || 200,
          h0: item.h || 160,
        };
      }
      return;
    }

    // Annotation item
    if (target && target.getAttribute('data-i')) {
      const itId = target.getAttribute('data-i')!;
      const item = (page.items || []).find((i) => i.id === itId);
      if (item) {
        setSelectedElement({ type: 'item', id: item.id });
        setSelectedIds(new Set());
        itemDragRef.current = {
          item,
          w,
          x0: item.x,
          y0: item.y,
          moved: false,
        };
      }
      return;
    }

    // Connector port clicked
    const portEl = target?.closest?.('[data-cport]');
    if (portEl) {
      const cid = portEl.getAttribute('data-c') || target?.getAttribute('data-c');
      if (cid) {
        if (!pendingSourceId) {
          setPendingSourceId(cid);
          setTool('link');
          setSelectedElement({ type: 'card', id: cid });
          setSelectedIds(new Set([cid]));
        } else {
          if (pendingSourceId !== cid) {
            onAddEdge(pendingSourceId, cid);
          }
          setPendingSourceId(null);
          setConnectingCursor(null);
          setTool('select');
          setSelectedElement({ type: 'card', id: cid });
          setSelectedIds(new Set([cid]));
        }
        return;
      }
    }

    // Card clicked
    if (target && target.getAttribute('data-c')) {
      const cardId = target.getAttribute('data-c')!;

      // Link tool active
      if (tool === 'link') {
        if (!pendingSourceId) {
          setPendingSourceId(cardId);
          setSelectedElement({ type: 'card', id: cardId });
          setSelectedIds(new Set([cardId]));
        } else {
          if (pendingSourceId !== cardId) {
            onAddEdge(pendingSourceId, cardId);
          }
          setPendingSourceId(null);
          setConnectingCursor(null);
          setTool('select');
          setSelectedElement({ type: 'card', id: cardId });
          setSelectedIds(new Set([cardId]));
        }
        return;
      }

      // Select tool
      if (e.shiftKey) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(cardId)) next.delete(cardId);
          else next.add(cardId);
          return next;
        });
        setSelectedElement({ type: 'card', id: cardId });
      } else if (!selectedIds.has(cardId)) {
        setSelectedIds(new Set([cardId]));
        setSelectedElement({ type: 'card', id: cardId });
      } else {
        setSelectedElement({ type: 'card', id: cardId });
      }

      const activeIds = selectedIds.has(cardId) ? selectedIds : new Set([cardId]);
      const movingCards = page.cards.filter((c) => activeIds.has(c.id));

      dragRef.current = {
        w,
        id: cardId,
        cards: movingCards.map((c) => ({ c: { ...c }, a: absPos(page, c) })),
        moved: false,
        locked: movingCards.some((c) => c.lock || page.lanes[c.l]?.lock),
      };
      return;
    }

    // Edge clicked
    if (target && target.getAttribute('data-e')) {
      const edgeId = target.getAttribute('data-e')!;
      setSelectedElement({ type: 'edge', id: edgeId });
      setSelectedIds(new Set());
      setPendingSourceId(null);
      return;
    }

    // Lane clicked
    if (target && target.getAttribute('data-l')) {
      const laneId = target.getAttribute('data-l')!;
      setSelectedElement({ type: 'lane', id: laneId });
      setSelectedIds(new Set());
      setPendingSourceId(null);
      return;
    }

    // Empty area clicked
    setSelectedElement(null);
    setSelectedIds(new Set());
    setPendingSourceId(null);

    if (e.shiftKey) {
      setMarquee({ x: w.x, y: w.y, x2: w.x, y2: w.y });
    } else {
      panRef.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
    }
  };

  // Pointer Move handler
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const w = toWorld(e.clientX, e.clientY);
    if (pendingSourceId || tool === 'link') {
      setConnectingCursor(w);
    }
    const targetCard = (e.target as Element).closest('[data-c]');
    const cid = targetCard?.getAttribute('data-c') || null;
    if (cid !== hoveredCardId) {
      setHoveredCardId(cid);
    }

    // Card drag
    if (dragRef.current && !dragRef.current.locked) {
      const dx = w.x - dragRef.current.w.x;
      const dy = w.y - dragRef.current.w.y;

      const updated = dragRef.current.cards.map((o) => {
        const nextX = snapCoord(o.a.x + dx);
        const nextY = Math.max(50, snapCoord(o.a.y + dy));
        const clone = { ...o.c };
        setAbsPos(page, clone, nextX, nextY);
        return clone;
      });

      dragRef.current.moved = true;

      // Guide lines for primary card
      const primary = updated.find((c) => c.id === dragRef.current?.id);
      if (primary) {
        const pPos = absPos(page, primary);
        const guides: { x?: number; y?: number }[] = [];
        page.cards.forEach((other) => {
          if (dragRef.current?.cards.some((o) => o.c.id === other.id)) return;
          const oPos = absPos(page, other);
          if (Math.abs(oPos.x - pPos.x) < 2) guides.push({ x: pPos.x });
          if (Math.abs(oPos.x + CARD_WIDTH / 2 - (pPos.x + CARD_WIDTH / 2)) < 2) {
            guides.push({ x: pPos.x + CARD_WIDTH / 2 });
          }
          if (Math.abs(oPos.y - pPos.y) < 2) guides.push({ y: pPos.y });
        });
        setGuideLines(guides);
      }

      onUpdateCards(updated);
      return;
    }

    // Item drag
    if (itemDragRef.current) {
      const w = toWorld(e.clientX, e.clientY);
      const nx = Math.max(0, snapCoord(itemDragRef.current.x0 + w.x - itemDragRef.current.w.x));
      const ny = Math.max(0, snapCoord(itemDragRef.current.y0 + w.y - itemDragRef.current.w.y));
      itemDragRef.current.moved = true;
      onUpdateItem({ ...itemDragRef.current.item, x: nx, y: ny });
      return;
    }

    // Item resize
    if (itemResizeRef.current) {
      const w = toWorld(e.clientX, e.clientY);
      const it = itemResizeRef.current.item;
      const nw = Math.max(60, snapCoord(itemResizeRef.current.w0 + w.x - itemResizeRef.current.w.x));
      const nh = it.t === 'frame' ? Math.max(40, snapCoord(itemResizeRef.current.h0 + w.y - itemResizeRef.current.w.y)) : it.h;
      onUpdateItem({ ...it, w: nw, h: nh });
      return;
    }

    // Edge start handle drag
    if (edgeDragRef.current) {
      const w = toWorld(e.clientX, e.clientY);
      const dy = Math.round(w.y - edgeDragRef.current.startW.y);
      const dx = Math.round(w.x - edgeDragRef.current.startW.x);
      edgeDragRef.current.moved = true;

      const edge = page.edges.find((x) => x.id === edgeDragRef.current?.edgeId);
      if (edge && onUpdateEdge) {
        const nextSdy = Math.max(-60, Math.min(60, edgeDragRef.current.initSdy + dy));
        const nextSdx = Math.max(-50, Math.min(50, edgeDragRef.current.initSdx + dx));
        onUpdateEdge({ ...edge, sdy: nextSdy, sdx: nextSdx });
      }
      return;
    }

    // Marquee selection
    if (marquee) {
      const w = toWorld(e.clientX, e.clientY);
      setMarquee((prev) => (prev ? { ...prev, x2: w.x, y2: w.y } : null));
      return;
    }

    // Pan
    const currentPan = panRef.current;
    if (currentPan) {
      const dx = e.clientX - currentPan.x;
      const dy = e.clientY - currentPan.y;
      const startX = currentPan.vx;
      const startY = currentPan.vy;
      setView((prev) => ({
        ...prev,
        x: startX + dx,
        y: startY + dy,
      }));
    }
  };

  // Pointer Up / Cancel handler
  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (svgRef.current && svgRef.current.hasPointerCapture(e.pointerId)) {
      try {
        svgRef.current.releasePointerCapture(e.pointerId);
      } catch {
        // ignore if already released
      }
    }

    if (marquee) {
      const x1 = Math.min(marquee.x, marquee.x2);
      const x2 = Math.max(marquee.x, marquee.x2);
      const y1 = Math.min(marquee.y, marquee.y2);
      const y2 = Math.max(marquee.y, marquee.y2);

      const inside = page.cards.filter((c) => {
        if (hiddenIds.has(c.id)) return false;
        const pos = absPos(page, c);
        const ch = cardHeight(c, compact);
        return pos.x < x2 && pos.x + CARD_WIDTH > x1 && pos.y < y2 && pos.y + ch > y1;
      });

      const nextSet = new Set(inside.map((c) => c.id));
      setSelectedIds(nextSet);
      if (inside.length > 0) {
        setSelectedElement({ type: 'card', id: inside[0].id });
      }
      setMarquee(null);
    }

    dragRef.current = null;
    panRef.current = null;
    itemDragRef.current = null;
    itemResizeRef.current = null;
    edgeDragRef.current = null;
    setGuideLines([]);
  };

  return (
    <div className="relative flex-1 w-full h-full overflow-hidden bg-[#E9E8E1] select-none">
      <svg
        ref={svgRef}
        id="cv"
        className="w-full h-full block"
        style={{ cursor: tool === 'link' ? 'crosshair' : 'grab' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <defs>
          <marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0L10,5L0,10z" fill="#5F5E5A" />
          </marker>
          <marker id="ar-orange" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0L10,5L0,10z" fill="#E67E22" />
          </marker>
          <pattern id="gr" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0H0V20" fill="none" stroke="#C9C9C9" strokeWidth="0.6" />
          </pattern>
        </defs>

        <g
          fontFamily={page.font || 'system-ui, Arial, sans-serif'}
          transform={`translate(${view.x},${view.y}) scale(${view.k})`}
        >
          {/* Swimlanes */}
          {page.lanes.map((lane, i) => {
            const x = laneX(page, i);
            const isLaneSelected = selectedElement?.type === 'lane' && selectedElement.id === lane.id;
            const laneBg = lane.color || page.hc || LANE_COLOR;

            return (
              <g key={lane.id} data-l={lane.id} className="cursor-pointer">
                {/* Lane Column Body */}
                <rect
                  x={x}
                  y={0}
                  width={lane.w}
                  height={H}
                  fill={laneBg}
                  stroke={LANE_STROKE}
                  strokeWidth={1}
                />
                {/* Lane Header */}
                <rect
                  x={x}
                  y={0}
                  width={lane.w}
                  height={40}
                  fill={laneBg}
                  stroke={LANE_STROKE}
                  strokeWidth={1}
                />
                <text
                  x={x + lane.w / 2}
                  y={25}
                  textAnchor="middle"
                  fontSize="13"
                  fontWeight="700"
                  fill="#222222"
                  className="pointer-events-none"
                >
                  {lane.name}
                </text>
                {lane.lock && (
                  <text x={x + lane.w - 8} y={16} textAnchor="end" fontSize="10">
                    🔒
                  </text>
                )}

                {/* Bottom Lane Headcount (HC) Line & Row */}
                {page.showHc && (
                  <g className="pointer-events-none select-none">
                    <line
                      x1={x}
                      y1={H - 36}
                      x2={x + lane.w}
                      y2={H - 36}
                      stroke={LANE_STROKE}
                      strokeWidth={1}
                    />
                    <rect
                      x={x}
                      y={H - 36}
                      width={lane.w}
                      height={36}
                      fill={laneBg}
                      stroke={LANE_STROKE}
                      strokeWidth={1}
                    />
                    <text
                      x={x + lane.w / 2}
                      y={H - 14}
                      textAnchor="middle"
                      fontSize="12"
                      fontWeight="700"
                      fill="#222222"
                    >
                      HC: {getLaneHeadcount(page, i)}
                    </text>
                  </g>
                )}

                {isLaneSelected && (
                  <rect
                    x={x}
                    y={0}
                    width={lane.w}
                    height={H}
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth={3}
                    pointerEvents="none"
                  />
                )}
              </g>
            );
          })}

          {/* Optional Grid */}
          {page.grid && (
            <rect y={40} width={W} height={H - 40} fill="url(#gr)" pointerEvents="none" />
          )}

          {/* Frame Annotations (underneath edges) */}
          {(page.items || [])
            .filter((it) => it.t === 'frame')
            .map((it) => {
              const isSelected = selectedElement?.type === 'item' && selectedElement.id === it.id;
              const w = it.w || 400;
              const h = it.h || 240;

              return (
                <g key={it.id} data-i={it.id} transform={`translate(${it.x},${it.y})`} className="cursor-move">
                  <rect width={w} height={h} fill="none" pointerEvents="none" />
                  <rect
                    width={w}
                    height={h}
                    fill="none"
                    stroke="#8A8980"
                    strokeWidth={2}
                    strokeDasharray="8 6"
                    pointerEvents="none"
                  />
                  {/* Invisible thicker hit border */}
                  <rect
                    width={w}
                    height={h}
                    fill="none"
                    stroke="#000000"
                    strokeOpacity={0}
                    strokeWidth={14}
                    pointerEvents="stroke"
                  />
                  <text
                    x={10}
                    y={18}
                    fontSize="12"
                    fontWeight="700"
                    fill="#444444"
                    className="pointer-events-none select-none"
                  >
                    {it.text || ''}
                  </text>
                  {isSelected && (
                    <>
                      <rect
                        width={w}
                        height={h}
                        fill="none"
                        stroke="#2563EB"
                        strokeWidth={2}
                        pointerEvents="none"
                      />
                      <rect
                        data-rz={it.id}
                        x={w - 8}
                        y={h - 8}
                        width={10}
                        height={10}
                        fill="#2563EB"
                        className="cursor-nwse-resize"
                      />
                    </>
                  )}
                </g>
              );
            })}

          {/* Connecting Edges */}
          {page.edges.map((e) => {
            if (hiddenIds.has(e.from) || hiddenIds.has(e.to)) return null;
            const d = edgePathD(page, e, compact);
            if (!d) return null;
            const isEdgeSelected = selectedElement?.type === 'edge' && selectedElement.id === e.id;
            const g = edgeGeometry(page, e, compact);

            return (
              <g key={e.id}>
                {/* Visible Path */}
                <path
                  d={d}
                  fill="none"
                  stroke="#5F5E5A"
                  strokeWidth={1.6}
                  strokeDasharray={e.dash ? '8 6' : undefined}
                  markerEnd={page.arrow ? 'url(#ar)' : undefined}
                />
                {/* Clickable Hit Target */}
                <path
                  data-e={e.id}
                  d={d}
                  fill="none"
                  stroke={isEdgeSelected ? '#2563EB' : 'transparent'}
                  strokeWidth={isEdgeSelected ? 3.5 : 14}
                  className="cursor-pointer"
                />

                {/* When edge is selected: Draggable handle to shift start point */}
                {isEdgeSelected && g && (
                  <g data-esh={e.id} className="cursor-move">
                    <circle cx={g.sx} cy={g.sy} r={10} fill="#2563EB" fillOpacity={0.25} />
                    <circle
                      cx={g.sx}
                      cy={g.sy}
                      r={5.5}
                      fill="#2563EB"
                      stroke="#FFFFFF"
                      strokeWidth={2}
                      className="hover:scale-125 transition-transform"
                    />
                    <line x1={g.sx - 2.5} y1={g.sy} x2={g.sx + 2.5} y2={g.sy} stroke="#FFFFFF" strokeWidth={1.2} />
                    <line x1={g.sx} y1={g.sy - 2.5} x2={g.sx} y2={g.sy + 2.5} stroke="#FFFFFF" strokeWidth={1.2} />
                    <title>Seret untuk menggeser titik awal garis pada kartu</title>
                  </g>
                )}
              </g>
            );
          })}

          {/* Live Rubber-Band Line Preview during manual connecting */}
          {pendingSourceId && connectingCursor && (() => {
            const srcCard = page.cards.find((c) => c.id === pendingSourceId);
            if (!srcCard) return null;
            const srcPos = absPos(page, srcCard);
            const h = cardHeight(srcCard, compact);
            const sx = srcPos.x + CARD_WIDTH;
            const sy = srcPos.y + h / 2;
            const tx = connectingCursor.x;
            const ty = connectingCursor.y;
            const midX = Math.round((sx + tx) / 2);

            return (
              <g className="pointer-events-none">
                <path
                  d={`M ${sx},${sy} H ${midX} V ${ty} H ${tx}`}
                  fill="none"
                  stroke="#E67E22"
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
                  markerEnd="url(#ar-orange)"
                />
                <circle cx={sx} cy={sy} r={5} fill="#E67E22" stroke="#FFFFFF" strokeWidth={2} />
                <circle cx={tx} cy={ty} r={6} fill="#E67E22" fillOpacity={0.4} />
                <circle cx={tx} cy={ty} r={3} fill="#E67E22" />
              </g>
            );
          })()}

          {/* Cards */}
          {page.cards.map((c) => {
            if (hiddenIds.has(c.id)) return null;

            const pos = absPos(page, c);
            const h = cardHeight(c, compact);
            const para = isPara(c);
            const dbl = isDouble(c);
            const dsh = c.shape?.includes('-d');
            const W_card = para ? CARD_WIDTH - PARALLELOGRAM_SKEW : CARD_WIDTH;
            const isStaff = !!c.np && !compact;
            const cols = isStaff && c.cols === 2 ? 2 : 1;
            const names = c.names || [];

            const isSelected = selectedIds.has(c.id);
            const isPendingSource = pendingSourceId === c.id;
            const isMatch =
              searchQuery &&
              [c.jab, levelText(c), ...names].join(' ').toLowerCase().includes(searchQuery.toLowerCase());

            const X = (a: number, b: number) => (para ? a + PARALLELOGRAM_SKEW * (1 - b / h) : a);
            const T = (a: number, b: number, t: string, at: string) => (
              <text x={X(a, b).toFixed(1)} y={b} textAnchor="middle" className="select-none pointer-events-none" {...parseSvgAttrs(at)}>
                {t}
              </text>
            );
            const ln = (a: number, b: number, c2: number, d: number) => (
              <line x1={a} y1={b} x2={c2} y2={d} stroke={c.c?.s || '#5F5E5A'} />
            );

            // Subordinate count
            const subCount = getKids(page, c.id).length;

            return (
              <g
                key={c.id}
                data-c={c.id}
                transform={`translate(${pos.x},${pos.y})`}
                className="cursor-pointer"
              >
                {/* Card Background / Base Shape */}
                {para ? (
                  <g
                    transform={`translate(${PARALLELOGRAM_SKEW},0) skewX(${((-Math.atan(PARALLELOGRAM_SKEW / h) * 180) / Math.PI).toFixed(3)})`}
                  >
                    <rect width={W_card} height={h} fill={c.c?.f || '#FFFFFF'} />
                  </g>
                ) : (
                  <rect width={W_card} height={h} fill={c.c?.f || '#FFFFFF'} />
                )}

                {/* Card Content */}
                {compact ? (
                  <>
                    {T(
                      W_card / 2,
                      16,
                      c.jab.length > 34 ? c.jab.slice(0, 33) + '…' : c.jab,
                      `font-size="11" font-weight="700" fill="${c.c?.t || '#222222'}"`
                    )}
                    {names.map((nm, idx) => (
                      <React.Fragment key={idx}>
                        {T(W_card / 2, 32 + 16 * idx, nm, `font-size="11" fill="${c.c?.t || '#222222'}"`)}
                      </React.Fragment>
                    ))}
                  </>
                ) : (
                  <>
                    {/* Photo slot */}
                    {!isStaff && (
                      <>
                        {c.photo ? (
                          <image href={c.photo} width={74} height={h} preserveAspectRatio="xMidYMid slice" />
                        ) : (
                          <rect width={74} height={h} fill="#FFFFFF" />
                        )}
                        {!c.photo && T(37, h / 2 + 4, 'Foto', 'font-size="10" fill="#9A9990"')}
                        {ln(74, 0, 74, h)}
                      </>
                    )}

                    {/* Table divider lines */}
                    {(() => {
                      const x0 = isStaff ? 0 : 74;
                      const cw = W_card - x0;
                      const R = Math.ceil(names.length / cols);
                      const mid = x0 + cw / 2;
                      const lines: React.ReactNode[] = [];

                      for (let i = 0; i <= R; i++) {
                        lines.push(<React.Fragment key={`div-${i}`}>{ln(x0, 54 + 22 * i, W_card, 54 + 22 * i)}</React.Fragment>);
                      }
                      if (cols === 2) {
                        lines.push(<React.Fragment key="col-div">{ln(mid, 54, mid, 54 + 22 * R)}</React.Fragment>);
                      }

                      // Job title lines
                      const titleWords = (c.jab || '').split(/\s+/).reduce<string[]>((acc, w) => {
                        const last = acc[acc.length - 1];
                        if (!last || (last + ' ' + w).length > (isStaff ? 36 : 24)) acc.push(w);
                        else acc[acc.length - 1] = last + ' ' + w;
                        return acc;
                      }, []).slice(0, 3);

                      const y0 = 27 - (titleWords.length - 1) * 7;

                      return (
                        <>
                          {lines}
                          {titleWords.map((tw, idx) => (
                            <React.Fragment key={`tw-${idx}`}>
                              {T(mid, y0 + idx * 14 + 4, tw, `font-size="11" font-weight="700" fill="${c.c?.t || '#222222'}"`)}
                            </React.Fragment>
                          ))}
                          {names.map((nm, idx) => {
                            const cx = x0 + (cw / cols) * ((idx % cols) + 0.5);
                            const cy = 54 + 22 * Math.floor(idx / cols) + 15;
                            return (
                              <React.Fragment key={`name-${idx}`}>
                                {T(cx, cy, nm, `font-size="${cols === 2 ? 10.5 : 11}" fill="${c.c?.t || '#222222'}"`)}
                              </React.Fragment>
                            );
                          })}
                          {/* LEVEL: Display only clean level name without L1, L2, L3 as requested! */}
                          {T(
                            mid,
                            54 + 22 * R + 15,
                            levelText(c) || LEVEL_PLACEHOLDER,
                            levelText(c)
                              ? `font-size="10.5" font-weight="700" fill="${c.c?.t || '#222222'}"`
                              : 'font-size="10" fill="#9A9990" font-style="italic"'
                          )}
                        </>
                      );
                    })()}

                    {/* Grade Badge */}
                    {c.grade && (
                      <g>
                        <rect
                          x={(para ? PARALLELOGRAM_SKEW : 0) + 2}
                          y={2}
                          width={14 + String(c.grade).length * 6}
                          height={14}
                          fill={c.c?.s || '#5F5E5A'}
                        />
                        <text
                          x={(para ? PARALLELOGRAM_SKEW : 0) + 9 + String(c.grade).length * 3}
                          y={12}
                          textAnchor="middle"
                          fontSize="9"
                          fill="#FFFFFF"
                          className="pointer-events-none select-none"
                        >
                          G{c.grade}
                        </text>
                      </g>
                    )}
                  </>
                )}

                {/* Outer borders */}
                <rect
                  width={W_card}
                  height={h}
                  fill="none"
                  stroke={c.c?.s || '#5F5E5A'}
                  strokeWidth={1.2}
                  strokeDasharray={dsh ? '6 4' : undefined}
                />
                {dbl && (
                  <rect
                    x={3.5}
                    y={3.5}
                    width={W_card - 7}
                    height={h - 7}
                    fill="none"
                    stroke={c.c?.s || '#5F5E5A'}
                    strokeWidth={1.2}
                  />
                )}

                {/* Collapse / Fold Subordinates Badge */}
                {c.col && subCount > 0 && (
                  <g data-fold={c.id} className="cursor-pointer">
                    <rect
                      x={(W_card + (para ? PARALLELOGRAM_SKEW : 0)) / 2 - 18}
                      y={h - 1}
                      width={36}
                      height={16}
                      rx={8}
                      fill="#FFFFFF"
                      stroke={c.c?.s || '#5F5E5A'}
                      strokeWidth={1}
                    />
                    <text
                      x={(W_card + (para ? PARALLELOGRAM_SKEW : 0)) / 2}
                      y={h + 11}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#222222"
                      fontWeight="600"
                      className="pointer-events-none select-none"
                    >
                      +{subCount}
                    </text>
                  </g>
                )}

                {/* Selection Rings */}
                {isSelected && (
                  <rect
                    x={-3}
                    y={-3}
                    width={CARD_WIDTH + 6}
                    height={h + 6}
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth={3}
                    pointerEvents="none"
                  />
                )}
                {isPendingSource && (
                  <rect
                    x={-3}
                    y={-3}
                    width={CARD_WIDTH + 6}
                    height={h + 6}
                    fill="none"
                    stroke="#E67E22"
                    strokeWidth={3}
                    strokeDasharray="6 4"
                    pointerEvents="none"
                  />
                )}
                {isMatch && (
                  <rect
                    x={-5}
                    y={-5}
                    width={CARD_WIDTH + 10}
                    height={h + 10}
                    fill="none"
                    stroke="#F1C40F"
                    strokeWidth={4}
                    pointerEvents="none"
                  />
                )}
                {(c.lock || page.lanes[c.l]?.lock) && (
                  <text x={W_card - 4} y={h - 4} textAnchor="end" fontSize="11" className="pointer-events-none">
                    🔒
                  </text>
                )}

                {/* Connector handles on hover or when in connect mode */}
                {(isSelected || hoveredCardId === c.id || pendingSourceId || tool === 'link') && (
                  <g className="transition-opacity">
                    {/* Output port (+) on right edge */}
                    <g
                      data-cport="out"
                      data-c={c.id}
                      className="cursor-pointer"
                      transform={`translate(${W_card + (para ? 4 : 0)}, ${h / 2})`}
                    >
                      <circle cx={0} cy={0} r={12} fill="transparent" />
                      <circle
                        cx={0}
                        cy={0}
                        r={6.5}
                        fill="#0F6E56"
                        stroke="#FFFFFF"
                        strokeWidth={1.5}
                      />
                      <line x1={-3} y1={0} x2={3} y2={0} stroke="#FFFFFF" strokeWidth={1.2} />
                      <line x1={0} y1={-3} x2={0} y2={3} stroke="#FFFFFF" strokeWidth={1.2} />
                      <title>Tarik garis ke bawahan</title>
                    </g>

                    {/* Input port (o) on left edge */}
                    <g
                      data-cport="in"
                      data-c={c.id}
                      className="cursor-pointer"
                      transform={`translate(${para ? PARALLELOGRAM_SKEW : 0}, ${h / 2})`}
                    >
                      <circle cx={0} cy={0} r={12} fill="transparent" />
                      <circle
                        cx={0}
                        cy={0}
                        r={6.5}
                        fill="#2563EB"
                        stroke="#FFFFFF"
                        strokeWidth={1.5}
                      />
                      <circle cx={0} cy={0} r={2} fill="#FFFFFF" />
                      <title>Titik garis atasan</title>
                    </g>
                  </g>
                )}
              </g>
            );
          })}

          {/* Annotations: Text & Legend (Rendered above cards) */}
          {(page.items || [])
            .filter((it) => it.t !== 'frame')
            .map((it) => {
              const isSelected = selectedElement?.type === 'item' && selectedElement.id === it.id;
              const w = it.w || 220;
              const fs = it.fs || 12;

              return (
                <g
                  key={it.id}
                  data-i={it.id}
                  transform={`translate(${it.x},${it.y})`}
                  className="cursor-move"
                >
                  {it.t === 'legend' ? (
                    (() => {
                      const lh = itemHeight(it);
                      let curY = 16;
                      const showStruc = it.showStructuralLv ?? true;
                      const showIc = it.showIcLv ?? true;
                      const showShapes = it.showCardShapes ?? true;
                      const showLines = it.showLineStyles ?? true;
                      const showStatus = it.showPositionStatus ?? true;
                      const showHc = it.showHeadcountInfo ?? true;
                      const showGrade = it.showGradeInfo ?? false;

                      const showBox = it.showShapeBox ?? true;
                      const showPara = it.showShapePara ?? true;
                      const showDash = it.showShapeDash ?? true;

                      const showSolid = it.showLineSolid ?? true;
                      const showDashLine = it.showLineDash ?? true;

                      const showTerisi = it.showStatusTerisi ?? true;
                      const showKosong = it.showStatusKosong ?? true;
                      const showRekrut = it.showStatusRekrut ?? true;

                      const customRows = (it.customRows || []).filter((r) => r.visible ?? true);
                      const showCustom = (it.showCustomItems ?? true) && customRows.length > 0;

                      const renderShapeJSX = (shape: LegendShapeType = 'box', y: number) => {
                        switch (shape) {
                          case 'box':
                            return <rect x={14} y={y} width={20} height={12} fill="#FFF" stroke="#5F5E5A" strokeWidth={1.2} />;
                          case 'box-rounded':
                            return <rect x={14} y={y} width={20} height={12} rx={3} fill="#FFF" stroke="#5F5E5A" strokeWidth={1.2} />;
                          case 'box-double':
                            return (
                              <g>
                                <rect x={14} y={y} width={20} height={12} fill="#FFF" stroke="#5F5E5A" strokeWidth={1.2} />
                                <rect x={16.5} y={y + 2} width={15} height={8} fill="none" stroke="#5F5E5A" strokeWidth={1} />
                              </g>
                            );
                          case 'box-dash':
                            return <rect x={14} y={y} width={20} height={12} fill="#FFF" stroke="#5F5E5A" strokeWidth={1.2} strokeDasharray="4 2" />;
                          case 'para':
                            return <polygon points={`17,${y} 34,${y} 29,${y + 12} 12,${y + 12}`} fill="#FFF" stroke="#5F5E5A" strokeWidth={1.2} />;
                          case 'diamond':
                            return <polygon points={`24,${y} 34,${y + 6} 24,${y + 12} 14,${y + 6}`} fill="#FFF" stroke="#5F5E5A" strokeWidth={1.2} />;
                          case 'line-solid':
                            return <line x1={14} y1={y + 6} x2={36} y2={y + 6} stroke="#5F5E5A" strokeWidth={2} />;
                          case 'line-thick':
                            return <line x1={14} y1={y + 6} x2={36} y2={y + 6} stroke="#5F5E5A" strokeWidth={3.5} />;
                          case 'line-dash':
                            return <line x1={14} y1={y + 6} x2={36} y2={y + 6} stroke="#5F5E5A" strokeWidth={2} strokeDasharray="4 3" />;
                          case 'line-dot':
                            return <line x1={14} y1={y + 6} x2={36} y2={y + 6} stroke="#5F5E5A" strokeWidth={2} strokeDasharray="2 2" />;
                          case 'circle-green':
                            return <circle cx={24} cy={y + 6} r={5} fill="#10B981" />;
                          case 'circle-amber':
                            return <circle cx={24} cy={y + 6} r={5} fill="#F59E0B" />;
                          case 'circle-blue':
                            return <circle cx={24} cy={y + 6} r={5} fill="#3B82F6" />;
                          case 'circle-red':
                            return <circle cx={24} cy={y + 6} r={5} fill="#EF4444" />;
                          case 'circle-purple':
                            return <circle cx={24} cy={y + 6} r={5} fill="#8B5CF6" />;
                          case 'badge':
                            return (
                              <g>
                                <rect x={14} y={y} width={20} height={12} fill="#5F5E5A" />
                                <text x={24} y={y + 9} fontSize="8" fill="#FFF" fontWeight="700" textAnchor="middle">
                                  G#
                                </text>
                              </g>
                            );
                          default:
                            return <rect x={14} y={y} width={20} height={12} fill="#FFF" stroke="#5F5E5A" strokeWidth={1.2} />;
                        }
                      };

                      return (
                        <>
                          <rect width={w} height={lh} fill="#FFFFFF" stroke="#9A9990" strokeWidth={1} />
                          {(it.showTitle ?? true) && (
                            <>
                              <text x={14} y={curY + 6} fontSize="12" fontWeight="700" fill="#222222">
                                {it.text || 'Legenda Bagan'}
                              </text>
                              {(() => { curY += 24; return null; })()}
                            </>
                          )}

                          {(showStruc || showIc) && (
                            <>
                              <text x={14} y={curY + 4} fontSize="11" fontWeight="700" fill="#222222">
                                Jenjang Karier (Level):
                              </text>
                              {showStruc && (
                                <text x={14} y={curY + 20} fontSize="10" fill="#5F5E5A">
                                  {it.structuralText || '• Struktural: Jr. Staff → Staff → Supervisor → Manager → GM → Direktur'}
                                </text>
                              )}
                              {showIc && (
                                <text x={14} y={curY + (showStruc ? 38 : 20)} fontSize="10" fill="#5F5E5A">
                                  {it.icText || '• Individual Contributor (IC): IC → Specialist → Sr. Spec. → Principal'}
                                </text>
                              )}
                              {(() => { curY += 22 + (showStruc ? 18 : 0) + (showIc ? 18 : 0) + 6; return null; })()}
                            </>
                          )}

                          {showShapes && (showBox || showPara || showDash) && (
                            <>
                              <line x1={14} y1={curY} x2={w - 14} y2={curY} stroke="#E5E5DF" strokeWidth={1} />
                              <text x={14} y={curY + 14} fontSize="11" fontWeight="700" fill="#222222">
                                Bentuk Kartu:
                              </text>
                              {(() => { curY += 20; return null; })()}
                              {showBox && (
                                <>
                                  {renderShapeJSX(it.shapeBoxType || 'box', curY)}
                                  <text x={42} y={curY + 10} fontSize="10" fill="#444444">
                                    {it.shapeBoxLabel || 'Kotak: Struktural standar'}
                                  </text>
                                  {(() => { curY += 18; return null; })()}
                                </>
                              )}
                              {showPara && (
                                <>
                                  {renderShapeJSX(it.shapeParaType || 'para', curY)}
                                  <text x={42} y={curY + 10} fontSize="10" fill="#444444">
                                    {it.shapeParaLabel || 'Jajargenjang: Fungsional / Non-struktural'}
                                  </text>
                                  {(() => { curY += 18; return null; })()}
                                </>
                              )}
                              {showDash && (
                                <>
                                  {renderShapeJSX(it.shapeDashType || 'box-dash', curY)}
                                  <text x={42} y={curY + 10} fontSize="10" fill="#444444">
                                    {it.shapeDashLabel || 'Garis Putus: Posisi di luar swimlane utama'}
                                  </text>
                                  {(() => { curY += 18; return null; })()}
                                </>
                              )}
                              {(() => { curY += 6; return null; })()}
                            </>
                          )}

                          {showLines && (showSolid || showDashLine) && (
                            <>
                              <line x1={14} y1={curY} x2={w - 14} y2={curY} stroke="#E5E5DF" strokeWidth={1} />
                              <text x={14} y={curY + 14} fontSize="11" fontWeight="700" fill="#222222">
                                Garis Penghubung:
                              </text>
                              {(() => { curY += 20; return null; })()}
                              {showSolid && (
                                <>
                                  {renderShapeJSX(it.lineSolidType || 'line-solid', curY)}
                                  <text x={42} y={curY + 10} fontSize="10" fill="#444444">
                                    {it.lineSolidLabel || 'Garis Solid: Jalur Komando / Hierarki Langsung'}
                                  </text>
                                  {(() => { curY += 18; return null; })()}
                                </>
                              )}
                              {showDashLine && (
                                <>
                                  {renderShapeJSX(it.lineDashType || 'line-dash', curY)}
                                  <text x={42} y={curY + 10} fontSize="10" fill="#444444">
                                    {it.lineDashLabel || 'Garis Putus: Jalur Koordinasi / Fungsional'}
                                  </text>
                                  {(() => { curY += 18; return null; })()}
                                </>
                              )}
                              {(() => { curY += 6; return null; })()}
                            </>
                          )}

                          {showStatus && (showTerisi || showKosong || showRekrut) && (
                            <>
                              <line x1={14} y1={curY} x2={w - 14} y2={curY} stroke="#E5E5DF" strokeWidth={1} />
                              <text x={14} y={curY + 14} fontSize="11" fontWeight="700" fill="#222222">
                                Status Jabatan:
                              </text>
                              {(() => {
                                let statusX = 14;
                                const statusElements: React.ReactNode[] = [];
                                if (showTerisi) {
                                  statusElements.push(
                                    <g key="st-terisi">
                                      <circle cx={statusX + 6} cy={curY + 26} r={5} fill="#10B981" />
                                      <text x={statusX + 16} y={curY + 30} fontSize="10" fill="#444444">
                                        {it.statusTerisiLabel || 'Terisi'}
                                      </text>
                                    </g>
                                  );
                                  statusX += Math.max(52, (it.statusTerisiLabel || 'Terisi').length * 7 + 24);
                                }
                                if (showKosong) {
                                  statusElements.push(
                                    <g key="st-kosong">
                                      <circle cx={statusX + 6} cy={curY + 26} r={5} fill="#F59E0B" />
                                      <text x={statusX + 16} y={curY + 30} fontSize="10" fill="#444444">
                                        {it.statusKosongLabel || 'Kosong'}
                                      </text>
                                    </g>
                                  );
                                  statusX += Math.max(54, (it.statusKosongLabel || 'Kosong').length * 7 + 24);
                                }
                                if (showRekrut) {
                                  statusElements.push(
                                    <g key="st-rekrut">
                                      <circle cx={statusX + 6} cy={curY + 26} r={5} fill="#3B82F6" />
                                      <text x={statusX + 16} y={curY + 30} fontSize="10" fill="#444444">
                                        {it.statusRekrutLabel || 'Rekrutmen'}
                                      </text>
                                    </g>
                                  );
                                }
                                return statusElements;
                              })()}
                              {(() => { curY += 42; return null; })()}
                            </>
                          )}

                          {showHc && (
                            <>
                              <line x1={14} y1={curY} x2={w - 14} y2={curY} stroke="#E5E5DF" strokeWidth={1} />
                              <text x={14} y={curY + 16} fontSize="10" fontWeight="700" fill="#222222">
                                HC:
                              </text>
                              <text x={42} y={curY + 16} fontSize="10" fill="#444444">
                                {it.hcLabel || 'Total Headcount (Pegawai) pada baris bawah swimlane'}
                              </text>
                              {(() => { curY += 26; return null; })()}
                            </>
                          )}

                          {showGrade && (
                            <>
                              <line x1={14} y1={curY} x2={w - 14} y2={curY} stroke="#E5E5DF" strokeWidth={1} />
                              <rect x={14} y={curY + 8} width={20} height={12} fill="#5F5E5A" />
                              <text x={24} y={curY + 17} fontSize="8" fill="#FFF" fontWeight="700" textAnchor="middle">
                                G#
                              </text>
                              <text x={42} y={curY + 18} fontSize="10" fill="#444444">
                                {it.gradeLabel || 'Lencana Grade Golongan Jabatan'}
                              </text>
                              {(() => { curY += 26; return null; })()}
                            </>
                          )}

                          {showCustom && (
                            <>
                              <line x1={14} y1={curY} x2={w - 14} y2={curY} stroke="#E5E5DF" strokeWidth={1} />
                              <text x={14} y={curY + 14} fontSize="11" fontWeight="700" fill="#222222">
                                Item Tambahan:
                              </text>
                              {(() => { curY += 20; return null; })()}
                              {customRows.map((r) => {
                                const rowY = curY;
                                curY += 20;
                                return (
                                  <g key={r.id}>
                                    {renderShapeJSX(r.shape, rowY)}
                                    <text x={42} y={rowY + 10} fontSize="10" fill="#444444">
                                      {r.label}
                                    </text>
                                  </g>
                                );
                              })}
                            </>
                          )}
                        </>
                      );
                    })()
                  ) : (
                    <>
                      <rect width={w} height={itemHeight(it)} fill="none" pointerEvents="all" />
                      {itemLines(it).map((line, idx) => (
                        <text
                          key={idx}
                          x={4}
                          y={fs * 1.2 + idx * fs * 1.35}
                          fontSize={fs}
                          fontWeight={it.b ? '700' : 'normal'}
                          fill="#222222"
                          className="pointer-events-none select-none"
                        >
                          {line}
                        </text>
                      ))}
                    </>
                  )}

                  {isSelected && (
                    <>
                      <rect
                        width={w}
                        height={itemHeight(it)}
                        fill="none"
                        stroke="#2563EB"
                        strokeWidth={2}
                        pointerEvents="none"
                      />
                      <rect
                        data-rz={it.id}
                        x={w - 8}
                        y={itemHeight(it) - 8}
                        width={10}
                        height={10}
                        fill="#2563EB"
                        className="cursor-nwse-resize"
                      />
                    </>
                  )}
                </g>
              );
            })}

          {/* Alignment Guide Lines */}
          {guideLines.map((g, idx) => (
            <React.Fragment key={idx}>
              {g.x != null && (
                <line x1={g.x} x2={g.x} y1={0} y2={H} stroke="#E84393" strokeWidth={1.5} strokeDasharray="5 4" />
              )}
              {g.y != null && (
                <line y1={g.y} y2={g.y} x1={0} x2={W} stroke="#E84393" strokeWidth={1.5} strokeDasharray="5 4" />
              )}
            </React.Fragment>
          ))}

          {/* Marquee Selection Box */}
          {marquee && (
            <rect
              x={Math.min(marquee.x, marquee.x2)}
              y={Math.min(marquee.y, marquee.y2)}
              width={Math.abs(marquee.x2 - marquee.x)}
              height={Math.abs(marquee.y2 - marquee.y)}
              fill="rgba(37, 99, 235, 0.15)"
              stroke="#2563EB"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              pointerEvents="none"
            />
          )}

          {/* Chart Title */}
          {page.title && (
            <text x={8} y={-18} fontSize="20" fontWeight="700" fill="#222222">
              {page.title}
            </text>
          )}
        </g>
      </svg>

      {/* Floating Manual Connect Helper Banner */}
      {(pendingSourceId || tool === 'link') && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-gray-900/90 text-white px-4 py-2 rounded-full shadow-lg backdrop-blur-xs flex items-center gap-3 text-xs font-semibold">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>
            {pendingSourceId
              ? 'Mode Hubungkan: Klik kartu tujuan / bawahan'
              : 'Mode Hubungkan Manual: Klik kartu atasan'}
          </span>
          <button
            type="button"
            onClick={() => {
              setPendingSourceId(null);
              setConnectingCursor(null);
              if (tool === 'link') setTool('select');
            }}
            className="px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded-full text-[11px] text-white transition-colors cursor-pointer"
          >
            Batal (Esc)
          </button>
        </div>
      )}
    </div>
  );
};

// Helper to convert string svg attrs into props
function parseSvgAttrs(attrStr: string): Record<string, string | number> {
  const result: Record<string, string | number> = {};
  const matches = attrStr.matchAll(/([a-zA-Z-]+)="([^"]*)"/g);
  for (const m of matches) {
    const key = m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    result[key] = m[2];
  }
  return result;
}
