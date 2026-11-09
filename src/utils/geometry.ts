/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CARD_WIDTH, LEVEL_TITLES, PARALLELOGRAM_SKEW } from '../constants';
import { AnnotationItem, Card, Edge, EdgeEntry, EdgeOrigin, Page } from '../types';

export const uid = () => Math.random().toString(36).slice(2, 9);

export const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] || c));

export const isPara = (c: Partial<Card>) => /^para/.test(c.shape || '');
export const isDouble = (c: Partial<Card>) => /-2$/.test(c.shape || '');
export const isDashed = (c: Partial<Card>) => /-d$/.test(c.shape || '');
export const paraShift = (c: Partial<Card>) => (isPara(c) ? PARALLELOGRAM_SKEW / 2 : 0);

export const laneX = (p: Page, i: number): number => {
  const lanes = p.lanes || [];
  return lanes.slice(0, Math.min(i, lanes.length)).reduce((sum, l) => sum + (l.w || 320), 0);
};

export const cardHeight = (c: Card, compact?: boolean): number => {
  const n = (c.names || []).length;
  if (compact) {
    return Math.max(42, 26 + 16 * n);
  }
  const isStaff = c.np;
  const cols = isStaff && c.cols === 2 ? 2 : 1;
  const R = Math.ceil(n / cols);
  return Math.max(isStaff ? 76 : 98, 54 + 22 * (R + 1));
};

export const absPos = (p: Page, c: Card): { x: number; y: number } => {
  const laneIndex = Math.min(c.l, (p.lanes?.length || 1) - 1);
  return {
    x: laneX(p, Math.max(0, laneIndex)) + (c.dx || 0),
    y: c.y,
  };
};

export const setAbsPos = (p: Page, c: Card, x: number, y: number) => {
  let l = 0;
  const cx = x + CARD_WIDTH / 2;
  p.lanes.forEach((_, i) => {
    if (cx >= laneX(p, i)) {
      l = i;
    }
  });
  c.l = l;
  c.dx = x - laneX(p, l);
  c.y = y;
};

export const pageW = (p: Page): number => laneX(p, p.lanes.length);

export const itemLines = (it: AnnotationItem): string[] => {
  const maxChars = Math.max(4, Math.floor((it.w || 200) / ((it.fs || 12) * 0.58)));
  return String(it.text || '')
    .split('\n')
    .flatMap((line) => (line.trim() ? textWrap(line, maxChars, 8) : ['']));
};

export const legendHeight = (it: AnnotationItem): number => {
  let h = 16;
  if (it.showTitle ?? true) h += 24;

  const showStruc = it.showStructuralLv ?? true;
  const showIc = it.showIcLv ?? true;
  if (showStruc || showIc) {
    h += 22; // Header "Jenjang Karier (Level):"
    if (showStruc) h += 18;
    if (showIc) h += 18;
    h += 6;
  }

  const showShapes = it.showCardShapes ?? true;
  if (showShapes) {
    const showBox = it.showShapeBox ?? true;
    const showPara = it.showShapePara ?? true;
    const showDash = it.showShapeDash ?? true;
    const count = (showBox ? 1 : 0) + (showPara ? 1 : 0) + (showDash ? 1 : 0);
    if (count > 0) {
      h += 26 + count * 18;
    }
  }

  const showLines = it.showLineStyles ?? true;
  if (showLines) {
    const showSolid = it.showLineSolid ?? true;
    const showDash = it.showLineDash ?? true;
    const count = (showSolid ? 1 : 0) + (showDash ? 1 : 0);
    if (count > 0) {
      h += 26 + count * 18;
    }
  }

  const showStatus = it.showPositionStatus ?? true;
  if (showStatus) {
    const showTerisi = it.showStatusTerisi ?? true;
    const showKosong = it.showStatusKosong ?? true;
    const showRekrut = it.showStatusRekrut ?? true;
    if (showTerisi || showKosong || showRekrut) {
      h += 42;
    }
  }

  if (it.showHeadcountInfo ?? true) h += 26;
  if (it.showGradeInfo ?? false) h += 26;

  // Custom rows
  const customRows = (it.customRows || []).filter((r) => r.visible ?? true);
  if ((it.showCustomItems ?? true) && customRows.length > 0) {
    h += 26 + customRows.length * 20;
  }

  return Math.max(70, h + 16);
};

export const itemHeight = (it: AnnotationItem): number => {
  if (it.t === 'frame') return it.h || 160;
  if (it.t === 'legend') return legendHeight(it);
  return Math.round(itemLines(it).length * (it.fs || 12) * 1.35 + 10);
};

export const pageH = (p: Page): number => {
  const bottomExtra = p.showHc ? 50 : 0;
  return Math.max(
    (p.H || 700) + bottomExtra,
    ...p.cards.map((c) => c.y + cardHeight(c) + 120 + bottomExtra),
    ...(p.items || []).map((i) => i.y + itemHeight(i) + 60 + bottomExtra)
  );
};

export const getLaneHeadcount = (page: Page, laneIndex: number): number => {
  const cardsInLane = page.cards.filter((c) => c.l === laneIndex);
  return cardsInLane.reduce((total, c) => {
    const validNames = (c.names || []).filter((n) => n.trim() && !n.includes('(Posisi kosong)'));
    return total + (validNames.length || (c.names && c.names.length ? c.names.length : 1));
  }, 0);
};

export const getKids = (p: Page, id: string): string[] => {
  return p.edges.filter((e) => e.from === id).map((e) => e.to);
};

export const getHiddenCardIds = (p: Page): Set<string> => {
  const h = new Set<string>();
  const traverse = (id: string) => {
    getKids(p, id).forEach((k) => {
      if (!h.has(k)) {
        h.add(k);
        traverse(k);
      }
    });
  };
  p.cards.filter((c) => c.col).forEach((c) => traverse(c.id));
  return h;
};

export const textWrap = (text: string, maxLen: number, maxLines = 3): string[] => {
  const words = String(text).split(/\s+/);
  const out: string[] = [];
  let line = '';
  words.forEach((w) => {
    if ((line + ' ' + w).trim().length > maxLen && line) {
      out.push(line);
      line = w;
    } else {
      line = (line + ' ' + w).trim();
    }
  });
  if (line) out.push(line);
  return out.slice(0, maxLines);
};

/**
 * Returns level name ONLY without "L1", "L2", "L3", etc.
 * Supports custom typed level text if provided.
 */
export const levelText = (c: Partial<Card>): string => {
  if (c.customLv !== undefined && c.customLv !== null) {
    return c.customLv.trim();
  }
  if (!c.lv) return '';
  const track = c.tr || 'S';
  const dict = LEVEL_TITLES[track as 'S' | 'I'];
  return dict?.[c.lv] || '';
};

export const levelKey = (c: Partial<Card>): string => {
  return c.lv ? (c.tr || 'S') + c.lv : '';
};

export const parseLevel = (t: string): { lv: number; tr: 'S' | 'I' | '' } => {
  const s = String(t || '').trim();
  if (!s || s === '[level jabatan]' || s === '[kode unik]') return { lv: 0, tr: '' };

  // Match optional L-number or digit if present in imported file
  const m = s.match(/L\s*(\d{1,2})/i) || s.match(/^(\d{1,2})$/);
  if (!m) {
    // Check against level names
    for (const tk of ['S', 'I'] as const) {
      for (let n = 1; n <= 10; n++) {
        if (LEVEL_TITLES[tk][n]?.toLowerCase() === s.toLowerCase()) {
          return { lv: n, tr: tk };
        }
      }
    }
    return { lv: 0, tr: '' };
  }
  const n = +m[1];
  if (n < 1 || n > 10) return { lv: 0, tr: '' };
  const isIC = /specialist|principal|individual|contributor|\bIC\b/i.test(s);
  return { lv: n, tr: isIC ? 'I' : 'S' };
};

export interface EdgeGeometry {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  tr: number;
  points?: { x: number; y: number }[];
}

export const edgeGeometry = (p: Page, e: Edge, compact?: boolean): EdgeGeometry | null => {
  const a = p.cards.find((c) => c.id === e.from);
  const b = p.cards.find((c) => c.id === e.to);
  if (!a || !b) return null;

  const A = absPos(p, a);
  const B = absPos(p, b);
  const n = (p.lanes?.length || 1) - 1;
  const la = Math.min(a.l, n);
  const lb = Math.min(b.l, n);
  const R = lb > la;

  const origin: EdgeOrigin = e.origin || p.edgeOrigin || 'front';
  const fromFront = origin === 'front';

  const hA = cardHeight(a, compact);
  const hB = cardHeight(b, compact);

  const sy = A.y + hA / 2 + (e.sdy || 0);
  const ty = B.y + hB / 2 + (e.tdy || 0);

  const yRatioA = Math.max(0, Math.min(1, (sy - A.y) / (hA || 1)));
  const skewOffsetA = isPara(a) ? PARALLELOGRAM_SKEW * (1 - yRatioA) : 0;

  // Exits right (Depan) or left (Belakang) of card A
  const exitFromRight = fromFront;
  const baseSx = exitFromRight
    ? (isPara(a) ? A.x + (CARD_WIDTH - PARALLELOGRAM_SKEW) + skewOffsetA : A.x + CARD_WIDTH)
    : (isPara(a) ? A.x + skewOffsetA : A.x);

  const yRatioB = Math.max(0, Math.min(1, (ty - B.y) / (hB || 1)));
  const skewOffsetB = isPara(b) ? PARALLELOGRAM_SKEW * (1 - yRatioB) : 0;

  // Entry direction:
  // When in same lane (la === lb): default entry matches origin (both front or both back)
  // When forward (lb > la): default enters left (back) of B
  // When backward (lb < la): default enters right (front) of B
  const defaultEntry: EdgeEntry = la === lb ? (exitFromRight ? 'front' : 'back') : (R ? 'back' : 'front');
  const entry: EdgeEntry = e.entry || p.edgeEntry || defaultEntry;
  const enterFromRight = entry === 'front';

  const baseTx = enterFromRight
    ? (isPara(b) ? B.x + (CARD_WIDTH - PARALLELOGRAM_SKEW) + skewOffsetB : B.x + CARD_WIDTH)
    : (isPara(b) ? B.x + skewOffsetB : B.x);

  const sx = baseSx + (e.sdx || 0);
  const tx = baseTx + (e.tdx || 0);

  const lx = (i: number) => laneX(p, i);
  const lw = (i: number) => p.lanes[i]?.w || 320;

  // Lane boundaries
  const laneLeftA = lx(la);
  const laneRightA = laneLeftA + lw(la);
  const laneLeftB = lx(lb);
  const laneRightB = laneLeftB + lw(lb);

  let tr = 0;
  let points: { x: number; y: number }[] | undefined;

  if (exitFromRight && !enterFromRight && sx < tx) {
    // Standard forward: exit right, enter left (e.g. Lane 0 -> Lane 1)
    if (la !== lb && (p.br || 'parent') === 'parent') {
      const m = laneRightA - (A.x + CARD_WIDTH);
      tr = A.x + CARD_WIDTH + Math.max(8, m / 2);
    } else {
      tr = Math.round(sx + (tx - sx) / 2);
    }
  } else if (!exitFromRight && enterFromRight && sx > tx) {
    // Standard backward: exit left, enter right (e.g. Lane 1 -> Lane 0)
    if (la !== lb && (p.br || 'parent') === 'parent') {
      const m = A.x - laneLeftA;
      tr = A.x - Math.max(8, m / 2);
    } else {
      tr = Math.round(tx + (sx - tx) / 2);
    }
  } else if (exitFromRight && enterFromRight) {
    // Both exit and enter on the RIGHT side (Depan)
    // Single vertical channel to the right of both cards
    const maxRight = Math.max(sx, tx, A.x + CARD_WIDTH, B.x + CARD_WIDTH);
    const maxLaneRight = Math.max(laneRightA, laneRightB);
    const gutter = maxLaneRight - maxRight;
    tr = gutter >= 24 ? maxRight + Math.round(gutter / 2) : Math.min(maxLaneRight - 6, maxRight + 16);
    if (tr <= maxRight) tr = maxRight + 16;
  } else if (!exitFromRight && !enterFromRight) {
    // Both exit and enter on the LEFT side (Belakang)
    // Single vertical channel to the left of both cards
    const minLeft = Math.min(sx, tx, A.x, B.x);
    const minLaneLeft = Math.min(laneLeftA, laneLeftB);
    const gutter = minLeft - minLaneLeft;
    tr = gutter >= 24 ? minLaneLeft + Math.round(gutter / 2) : Math.max(minLaneLeft + 6, minLeft - 16);
    if (tr >= minLeft) tr = minLeft - 16;
  } else if (exitFromRight && !enterFromRight) {
    // Needs to exit right (x > sx) but enter left (x < tx), and sx >= tx (e.g. same lane or backward)
    // S-curve / double-elbow routing around cards via clear horizontal gap
    const tr1 = Math.min(laneRightA - 6, Math.max(sx + 16, A.x + CARD_WIDTH + 16));
    const tr2 = Math.max(laneLeftB + 6, Math.min(tx - 16, B.x - 16));
    const midY = A.y + hA <= B.y
      ? Math.round((A.y + hA + B.y) / 2)
      : B.y + hB <= A.y
      ? Math.round((B.y + hB + A.y) / 2)
      : Math.round((sy + ty) / 2);
    tr = tr1;
    points = [
      { x: tr1, y: sy },
      { x: tr1, y: midY },
      { x: tr2, y: midY },
      { x: tr2, y: ty },
    ];
  } else {
    // !exitFromRight && enterFromRight
    // Needs to exit left (x < sx) but enter right (x > tx), and sx <= tx (e.g. same lane or forward)
    const tr1 = Math.max(laneLeftA + 6, Math.min(sx - 16, A.x - 16));
    const tr2 = Math.min(laneRightB - 6, Math.max(tx + 16, B.x + CARD_WIDTH + 16));
    const midY = A.y + hA <= B.y
      ? Math.round((A.y + hA + B.y) / 2)
      : B.y + hB <= A.y
      ? Math.round((B.y + hB + A.y) / 2)
      : Math.round((sy + ty) / 2);
    tr = tr1;
    points = [
      { x: tr1, y: sy },
      { x: tr1, y: midY },
      { x: tr2, y: midY },
      { x: tr2, y: ty },
    ];
  }

  return { sx, sy, tx, ty, tr, points };
};

export const edgePathD = (p: Page, e: Edge, compact?: boolean): string => {
  const g = edgeGeometry(p, e, compact);
  if (!g) return '';
  const { sx, sy, tx, ty, tr, points } = g;
  const ls = p.ls || 'elbow';
  if (ls === 'straight') return `M${sx},${sy}L${tx},${ty}`;
  if (points && points.length > 0) {
    let d = `M${sx},${sy}`;
    for (const pt of points) d += ` L${pt.x},${pt.y}`;
    d += ` L${tx},${ty}`;
    return d;
  }
  if (ls === 'curve') return `M${sx},${sy}C${tr},${sy} ${tr},${ty} ${tx},${ty}`;
  return `M${sx},${sy}H${tr}V${ty}H${tx}`;
};

export const snapCoord = (v: number): number => Math.round(v / 10) * 10;

export const autoTidy = (p: Page) => {
  const id = Object.fromEntries(p.cards.map((c) => [c.id, c]));
  const par: Record<string, string> = {};
  const kid: Record<string, string[]> = {};
  const n = (p.lanes?.length || 1) - 1;

  p.cards.forEach((c) => {
    kid[c.id] = [];
  });

  const isAncestor = (a: string, b: string): boolean => {
    let x: string | undefined = a;
    let i = 0;
    while (x && i++ < 5000) {
      if (x === b) return true;
      x = par[x];
    }
    return false;
  };

  p.edges.forEach((e) => {
    if (id[e.from] && id[e.to] && e.from !== e.to && par[e.to] == null && !isAncestor(e.from, e.to)) {
      par[e.to] = e.from;
      kid[e.from].push(e.to);
    }
  });

  Object.values(kid).forEach((k) => {
    k.sort((a, b) => (id[a].y - id[b].y) || (id[a].l - id[b].l));
  });

  const roots = p.cards
    .filter((c) => par[c.id] == null)
    .sort((a, b) => a.y - b.y || a.l - b.l)
    .map((c) => c.id);

  const GAP = 24;
  let cur = 80;

  const place = (nodeId: string) => {
    const c = id[nodeId];
    const ks = kid[nodeId];
    if (!ks || !ks.length) {
      c.y = cur;
      cur += cardHeight(c) + GAP;
      return;
    }
    ks.forEach(place);
    const f = id[ks[0]];
    const l = id[ks[ks.length - 1]];
    c.y = Math.max(80, (f.y + l.y + cardHeight(l)) / 2 - cardHeight(c) / 2);
    cur = Math.max(cur, c.y + cardHeight(c) + GAP);
  };

  roots.forEach((r) => {
    place(r);
    cur += 16;
  });

  p.lanes.forEach((_, li) => {
    let b = 0;
    p.cards
      .filter((c) => Math.min(c.l, n) === li)
      .sort((x, y) => x.y - y.y)
      .forEach((c) => {
        if (c.y < b + GAP) c.y = b + GAP;
        b = c.y + cardHeight(c);
      });
  });

  p.cards.forEach((c) => {
    c.y = snapCoord(c.y);
    const targetLane = p.lanes[Math.min(c.l, n)];
    c.dx = Math.round(((targetLane?.w || 320) - CARD_WIDTH) / 10) * 5;
  });
};

/**
 * Finds the natural superior / parent card for a given card based on swimlane proximity and Y position.
 */
export const findAutoParent = (page: Page, card: Card): Card | null => {
  if (card.l === 0) return null; // Cards in lane 0 are top-level
  // Look in the previous lane, or nearest preceding occupied lane
  for (let l = card.l - 1; l >= 0; l--) {
    const candidates = page.cards.filter((c) => c.l === l).sort((a, b) => a.y - b.y);
    if (candidates.length === 0) continue;

    // Pick candidate whose vertical level is above or closest to card.y
    const above = candidates.filter((p) => p.y <= card.y + 40);
    return above.length > 0 ? above[above.length - 1] : candidates[0];
  }
  return null;
};

/**
 * Automatically creates hierarchy edges for all unconnected cards across swimlanes.
 */
export const autoConnectHierarchy = (page: Page): Edge[] => {
  const currentEdges = [...page.edges];
  const existingPairSet = new Set(currentEdges.map((e) => `${e.from}->${e.to}`));
  const createdEdges: Edge[] = [];

  page.cards.forEach((card) => {
    // Check if card already has a parent
    const hasParent =
      currentEdges.some((e) => e.to === card.id) ||
      createdEdges.some((e) => e.to === card.id);

    if (hasParent) return;

    const autoParent = findAutoParent(page, card);
    if (autoParent && autoParent.id !== card.id) {
      const key = `${autoParent.id}->${card.id}`;
      if (!existingPairSet.has(key)) {
        existingPairSet.add(key);
        createdEdges.push({
          id: uid(),
          from: autoParent.id,
          to: card.id,
          dash: false,
        });
      }
    }
  });

  return createdEdges;
};

