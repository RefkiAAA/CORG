/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import { CARD_WIDTH, LANE_COLOR, LANE_STROKE, LEVEL_PLACEHOLDER, PARALLELOGRAM_SKEW } from '../constants';
import { Card, LegendShapeType, Page, ProjectState } from '../types';
import {
  absPos,
  autoTidy,
  cardHeight,
  edgeGeometry,
  edgePathD,
  esc,
  getKids,
  getLaneHeadcount,
  isDouble,
  isPara,
  itemHeight,
  itemLines,
  laneX,
  levelKey,
  levelText,
  pageH,
  pageW,
  parseLevel,
  uid,
} from './geometry';

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 2000);
};

export const exportProjectJSON = (state: ProjectState) => {
  const jsonStr = JSON.stringify(state, null, 2);
  downloadBlob(new Blob([jsonStr], { type: 'application/json' }), 'chart-struktur-organisasi.json');
};

const q2 = (s: unknown) => '"' + String(s ?? '').replace(/"/g, '""') + '"';

export const exportPageCSV = (page: Page) => {
  const rows = [['Halaman', 'Lane', 'Jabatan', 'Nama', 'Level', 'Atasan', 'Status', 'Grade', 'Catatan']];
  const sortedCards = [...page.cards].sort((a, b) => a.l - b.l || a.y - b.y);

  sortedCards.forEach((c) => {
    const edge = page.edges.find((e) => e.to === c.id);
    const parent = edge ? page.cards.find((x) => x.id === edge.from) : null;
    rows.push([
      page.name,
      page.lanes[c.l]?.name || '',
      c.jab,
      c.names.join(' | '),
      levelText(c), // level title only, no L1/L2
      parent ? parent.jab : '',
      c.st || '',
      c.grade || '',
      c.note || '',
    ]);
  });

  const csvContent = '\uFEFF' + rows.map((r) => r.map(q2).join(',')).join('\n');
  downloadBlob(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }), `${page.name}.csv`);
};

export const exportTemplateCSV = () => {
  const content =
    '\uFEFFHalaman,Lane,Jabatan,Nama,Level,Atasan,Status,Grade,Catatan\n' +
    'GBS,Direktur,Direktur Group,Budi Santoso,Direktur,,terisi,G1,\n' +
    'GBS,Head,Head of Finance,Siti Aminah,General Manager,Direktur Group,terisi,G2,\n' +
    'GBS,Manager,Finance Manager,,Manager,Head of Finance,kosong,G3,Sedang proses rekrutmen\n' +
    'GBS,Supervisor,Accounting Supervisor,Rian,Supervisor,Finance Manager,terisi,G4,\n' +
    'GBS,Staff,Finance Staff,Andi | Dewi,Staff,Accounting Supervisor,terisi,G5,Tim pelaksana\n';
  downloadBlob(new Blob([content], { type: 'text/csv;charset=utf-8;' }), 'template-impor-struktur.csv');
};

export interface StructureReport {
  n: number;
  fill: number;
  vac: number;
  rec: number;
  nf: number;
  depth: number;
  avg: number;
  max: number;
  topManagers: { c: Card; dir: number; tot: number }[];
  vacantCards: Card[];
  rows: {
    c: Card;
    dir: number;
    tot: number;
    lv: number;
    parent?: Card;
    ns: boolean;
  }[];
}

export const generateStructureReport = (page: Page): StructureReport => {
  const idMap = Object.fromEntries(page.cards.map((c) => [c.id, c]));
  const par: Record<string, string> = {};
  const kd: Record<string, string[]> = {};

  page.cards.forEach((c) => {
    kd[c.id] = [];
  });

  page.edges.forEach((e) => {
    if (idMap[e.from] && idMap[e.to] && e.from !== e.to) {
      if (!kd[e.from].includes(e.to)) kd[e.from].push(e.to);
      if (par[e.to] == null) par[e.to] = e.from;
    }
  });

  const getLevelDepth = (i: string) => {
    let n = 1;
    let x = par[i];
    let g = 0;
    while (x && g++ < 500) {
      n++;
      x = par[x];
    }
    return n;
  };

  const getTotalSubordinates = (i: string) => {
    const s = new Set<string>();
    const go = (a: string) => {
      kd[a]?.forEach((k) => {
        if (!s.has(k) && k !== i && !isPara(idMap[k])) {
          s.add(k);
          go(k);
        }
      });
    };
    go(i);
    return s.size;
  };

  const rows = page.cards.map((c) => ({
    c,
    dir: (kd[c.id] || []).filter((k) => !isPara(idMap[k])).length,
    tot: getTotalSubordinates(c.id),
    lv: getLevelDepth(c.id),
    parent: idMap[par[c.id]],
    ns: isPara(c),
  }));

  const structuralRows = rows.filter((r) => !r.ns);
  const managers = structuralRows.filter((r) => r.dir > 0);
  const countStatus = (s: string) => structuralRows.filter((r) => r.c.st === s).length;

  const topManagers = [...managers]
    .sort((a, b) => b.dir - a.dir || b.tot - a.tot)
    .slice(0, 10);

  const vacantCards = rows
    .filter((x) => x.c.st === 'kosong' || x.c.st === 'rekrut')
    .map((x) => x.c);

  return {
    rows,
    n: structuralRows.length,
    fill: countStatus('terisi'),
    vac: countStatus('kosong'),
    rec: countStatus('rekrut'),
    nf: rows.length - structuralRows.length,
    depth: Math.max(0, ...structuralRows.map((r) => r.lv)),
    avg: managers.length ? managers.reduce((a, r) => a + r.dir, 0) / managers.length : 0,
    max: Math.max(0, ...structuralRows.map((r) => r.dir)),
    topManagers,
    vacantCards,
  };
};

export const exportAllPagesReportCSV = (pages: Page[]) => {
  const rows = [
    [
      'Halaman',
      'Lane',
      'Tingkat Hierarki',
      'Tipe Jabatan',
      'Jabatan',
      'Level Jabatan',
      'Nama',
      'Status',
      'Grade',
      'Atasan Langsung',
      'Bawahan Langsung',
      'Total Bawahan',
    ],
  ];

  pages.forEach((page) => {
    const rep = generateStructureReport(page);
    rep.rows
      .sort((a, b) => a.lv - b.lv || a.c.l - b.c.l || a.c.y - b.c.y)
      .forEach((x) => {
        const laneName = page.lanes[x.c.l]?.name || '';
        const roleType = isPara(x.c) ? 'Non-struktural (Fungsional)' : 'Struktural';
        rows.push([
          page.name,
          laneName,
          String(x.lv),
          roleType,
          x.c.jab,
          levelText(x.c),
          x.c.names.join(' | '),
          x.c.st || '',
          x.c.grade || '',
          x.parent ? x.parent.jab : '',
          String(x.dir),
          String(x.tot),
        ]);
      });
  });

  const content = '\uFEFF' + rows.map((r) => r.map(q2).join(',')).join('\n');
  downloadBlob(new Blob([content], { type: 'text/csv;charset=utf-8;' }), 'laporan-seluruh-struktur.csv');
};

export const generateSVGString = (page: Page, compact?: boolean): string => {
  const W = pageW(page);
  const H = pageH(page);
  const titleOffset = page.title ? 60 : 0;

  let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H + 20 + titleOffset}" viewBox="0 ${-titleOffset} ${W} ${H + 20 + titleOffset}" font-family="${page.font || 'system-ui, Arial, sans-serif'}">`;
  out += `<rect y="${-titleOffset}" width="${W}" height="${H + 20 + titleOffset}" fill="#FFFFFF"/>`;

  // Defs
  out += `
    <defs>
      <marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
        <path d="M0,0L10,5L0,10z" fill="#5F5E5A"/>
      </marker>
    </defs>
  `;

  if (page.title) {
    out += `<text x="16" y="-20" font-size="22" font-weight="700" fill="#222222">${esc(page.title)}</text>`;
  }

  // Swimlanes
  let curX = 0;
  page.lanes.forEach((l, i) => {
    const laneCol = l.color || page.hc || LANE_COLOR;
    let hcSvg = '';
    if (page.showHc) {
      const hcCount = getLaneHeadcount(page, i);
      hcSvg = `
        <line x1="${curX}" y1="${H - 36}" x2="${curX + l.w}" y2="${H - 36}" stroke="${LANE_STROKE}"/>
        <rect x="${curX}" y="${H - 36}" width="${l.w}" height="36" fill="${laneCol}" stroke="${LANE_STROKE}"/>
        <text x="${curX + l.w / 2}" y="${H - 14}" text-anchor="middle" font-size="12" font-weight="700" fill="#222222">HC: ${hcCount}</text>
      `;
    }
    out += `
      <g>
        <rect x="${curX}" width="${l.w}" height="${H}" fill="${laneCol}" stroke="${LANE_STROKE}"/>
        <rect x="${curX}" width="${l.w}" height="40" fill="${laneCol}" stroke="${LANE_STROKE}"/>
        <text x="${curX + l.w / 2}" y="25" text-anchor="middle" font-size="13" font-weight="700" fill="#222222">${esc(l.name)}</text>
        ${hcSvg}
      </g>
    `;
    curX += l.w;
  });

  // Frames (behind edges)
  (page.items || [])
    .filter((it) => it.t === 'frame')
    .forEach((it) => {
      const w = it.w || 400;
      const h = it.h || 240;
      out += `
        <g transform="translate(${it.x},${it.y})">
          <rect width="${w}" height="${h}" fill="none" stroke="#8A8980" stroke-width="2" stroke-dasharray="8 6"/>
          <text x="12" y="20" font-size="12" font-weight="700" fill="#444444">${esc(it.text || '')}</text>
        </g>
      `;
    });

  // Edges
  page.edges.forEach((e) => {
    const d = edgePathD(page, e, compact);
    if (!d) return;
    out += `<path d="${d}" fill="none" stroke="#5F5E5A" stroke-width="1.6" ${e.dash ? 'stroke-dasharray="8 6"' : ''} ${page.arrow ? 'marker-end="url(#ar)"' : ''}/>`;
  });

  // Cards
  page.cards.forEach((c) => {
    const pos = absPos(page, c);
    const h = cardHeight(c, compact);
    const para = isPara(c);
    const dbl = isDouble(c);
    const dsh = c.shape?.includes('-d');
    const W = para ? CARD_WIDTH - PARALLELOGRAM_SKEW : CARD_WIDTH;
    const isStaff = !!c.np && !compact;
    const cols = isStaff && c.cols === 2 ? 2 : 1;
    const n = c.names || [];

    const X = (a: number, b: number) => (para ? a + PARALLELOGRAM_SKEW * (1 - b / h) : a);
    const T = (a: number, b: number, t: string, at: string) =>
      `<text x="${X(a, b).toFixed(1)}" y="${b}" text-anchor="middle" ${at}>${esc(t)}</text>`;
    const ln = (a: number, b: number, c2: number, d: number) =>
      `<line x1="${a}" y1="${b}" x2="${c2}" y2="${d}" stroke="${c.c?.s || '#5F5E5A'}"/>`;

    let cardSvg = `<g transform="translate(${pos.x},${pos.y})">`;
    cardSvg += (para
      ? `<g transform="translate(${PARALLELOGRAM_SKEW},0) skewX(${((-Math.atan(PARALLELOGRAM_SKEW / h) * 180) / Math.PI).toFixed(3)})">`
      : '<g>') + `<rect width="${W}" height="${h}" fill="${c.c?.f || '#FFFFFF'}"/>`;

    let tx = '';
    if (compact) {
      tx += T(W / 2, 16, c.jab.length > 34 ? c.jab.slice(0, 33) + '…' : c.jab, `font-size="11" font-weight="700" fill="${c.c?.t || '#222222'}"`);
      n.forEach((t, i) => {
        tx += T(W / 2, 32 + 16 * i, t, `font-size="11" fill="${c.c?.t || '#222222'}"`);
      });
    } else {
      const x0 = isStaff ? 0 : 74;
      const cw = W - x0;
      const R = Math.ceil(n.length / cols);
      const mid = x0 + cw / 2;

      if (!isStaff) {
        if (c.photo) {
          cardSvg += `<image href="${c.photo}" width="74" height="${h}" preserveAspectRatio="xMidYMid slice"/>`;
        } else {
          cardSvg += `<rect width="74" height="${h}" fill="#FFFFFF"/>`;
          tx += T(37, h / 2 + 4, 'Foto', 'font-size="10" fill="#9A9990"');
        }
        cardSvg += ln(74, 0, 74, h);
      }

      for (let i = 0; i <= R; i++) {
        cardSvg += ln(x0, 54 + 22 * i, W, 54 + 22 * i);
      }
      if (cols === 2) {
        cardSvg += ln(mid, 54, mid, 54 + 22 * R);
      }

      // Job Title
      const ls = (c.jab || '').split(/\s+/).reduce<string[]>((acc, w) => {
        const last = acc[acc.length - 1];
        if (!last || (last + ' ' + w).length > (isStaff ? 36 : 24)) {
          acc.push(w);
        } else {
          acc[acc.length - 1] = last + ' ' + w;
        }
        return acc;
      }, []).slice(0, 3);

      const y0 = 27 - (ls.length - 1) * 7;
      ls.forEach((t, i) => {
        tx += T(mid, y0 + i * 14 + 4, t, `font-size="11" font-weight="700" fill="${c.c?.t || '#222222'}"`);
      });

      // Employee names
      n.forEach((t, i) => {
        const cx = x0 + (cw / cols) * ((i % cols) + 0.5);
        const cy = 54 + 22 * Math.floor(i / cols) + 15;
        tx += T(cx, cy, t, `font-size="${cols === 2 ? 10.5 : 11}" fill="${c.c?.t || '#222222'}"`);
      });

      // Level (pure level title without L1/L2/L3 as required!)
      const lvlLabel = levelText(c);
      tx += T(
        mid,
        54 + 22 * R + 15,
        lvlLabel || LEVEL_PLACEHOLDER,
        lvlLabel
          ? `font-size="10.5" font-weight="700" fill="${c.c?.t || '#222222'}"`
          : 'font-size="10" fill="#9A9990" font-style="italic"'
      );

      // Grade badge
      if (c.grade) {
        const gx = (para ? PARALLELOGRAM_SKEW : 0) + 2;
        const gl = String(c.grade).length;
        tx += `<rect x="${gx}" y="2" width="${14 + gl * 6}" height="14" fill="${c.c?.s || '#5F5E5A'}"/><text x="${gx + 7 + gl * 3}" y="12" text-anchor="middle" font-size="9" fill="#FFFFFF">G${esc(c.grade)}</text>`;
      }
    }

    // Outline
    const dashAttr = dsh ? ' stroke-dasharray="6 4"' : '';
    cardSvg += `<rect width="${W}" height="${h}" fill="none" stroke="${c.c?.s || '#5F5E5A'}" stroke-width="1.2"${dashAttr}/>`;
    if (dbl) {
      cardSvg += `<rect x="3.5" y="3.5" width="${W - 7}" height="${h - 7}" fill="none" stroke="${c.c?.s || '#5F5E5A'}" stroke-width="1.2"/>`;
    }
    cardSvg += '</g>' + tx;

    // Collapsed subordinates badge
    if (c.col) {
      const kids = getKids(page, c.id);
      const cm = W / 2 + (para ? PARALLELOGRAM_SKEW / 2 : 0);
      cardSvg += `<rect x="${cm - 18}" y="${h - 1}" width="36" height="16" rx="8" fill="#FFFFFF" stroke="#5F5E5A"/><text x="${cm}" y="${h + 11}" text-anchor="middle" font-size="10" fill="#222222">+${kids.length}</text>`;
    }

    cardSvg += '</g>';
    out += cardSvg;
  });

  // Annotations (Text & Legend)
  (page.items || [])
    .filter((it) => it.t !== 'frame')
    .forEach((it) => {
      const w = it.w || 220;
      const fs = it.fs || 12;
      out += `<g transform="translate(${it.x},${it.y})">`;
      if (it.t === 'legend') {
        const renderShapeSVG = (shape: LegendShapeType = 'box', y: number): string => {
          switch (shape) {
            case 'box':
              return `<rect x="14" y="${y}" width="20" height="12" fill="#FFF" stroke="#5F5E5A" stroke-width="1.2"/>`;
            case 'box-rounded':
              return `<rect x="14" y="${y}" width="20" height="12" rx="3" fill="#FFF" stroke="#5F5E5A" stroke-width="1.2"/>`;
            case 'box-double':
              return `<g><rect x="14" y="${y}" width="20" height="12" fill="#FFF" stroke="#5F5E5A" stroke-width="1.2"/><rect x="16.5" y="${y + 2}" width="15" height="8" fill="none" stroke="#5F5E5A" stroke-width="1"/></g>`;
            case 'box-dash':
              return `<rect x="14" y="${y}" width="20" height="12" fill="#FFF" stroke="#5F5E5A" stroke-width="1.2" stroke-dasharray="4 2"/>`;
            case 'para':
              return `<polygon points="17,${y} 34,${y} 29,${y + 12} 12,${y + 12}" fill="#FFF" stroke="#5F5E5A" stroke-width="1.2"/>`;
            case 'diamond':
              return `<polygon points="24,${y} 34,${y + 6} 24,${y + 12} 14,${y + 6}" fill="#FFF" stroke="#5F5E5A" stroke-width="1.2"/>`;
            case 'line-solid':
              return `<line x1="14" y1="${y + 6}" x2="36" y2="${y + 6}" stroke="#5F5E5A" stroke-width="2"/>`;
            case 'line-thick':
              return `<line x1="14" y1="${y + 6}" x2="36" y2="${y + 6}" stroke="#5F5E5A" stroke-width="3.5"/>`;
            case 'line-dash':
              return `<line x1="14" y1="${y + 6}" x2="36" y2="${y + 6}" stroke="#5F5E5A" stroke-width="2" stroke-dasharray="4 3"/>`;
            case 'line-dot':
              return `<line x1="14" y1="${y + 6}" x2="36" y2="${y + 6}" stroke="#5F5E5A" stroke-width="2" stroke-dasharray="2 2"/>`;
            case 'circle-green':
              return `<circle cx="24" cy="${y + 6}" r="5" fill="#10B981"/>`;
            case 'circle-amber':
              return `<circle cx="24" cy="${y + 6}" r="5" fill="#F59E0B"/>`;
            case 'circle-blue':
              return `<circle cx="24" cy="${y + 6}" r="5" fill="#3B82F6"/>`;
            case 'circle-red':
              return `<circle cx="24" cy="${y + 6}" r="5" fill="#EF4444"/>`;
            case 'circle-purple':
              return `<circle cx="24" cy="${y + 6}" r="5" fill="#8B5CF6"/>`;
            case 'badge':
              return `<g><rect x="14" y="${y}" width="20" height="12" fill="#5F5E5A"/><text x="24" y="${y + 9}" font-size="8" fill="#FFF" font-weight="700" text-anchor="middle">G#</text></g>`;
            default:
              return `<rect x="14" y="${y}" width="20" height="12" fill="#FFF" stroke="#5F5E5A" stroke-width="1.2"/>`;
          }
        };

        const h = itemHeight(it);
        let curY = 16;
        out += `<rect width="${w}" height="${h}" fill="#FFFFFF" stroke="#9A9990" stroke-width="1"/>`;
        if (it.showTitle ?? true) {
          out += `<text x="14" y="${curY + 6}" font-size="12" font-weight="700" fill="#222222">${esc(it.text || 'Legenda Bagan')}</text>`;
          curY += 24;
        }

        const showStruc = it.showStructuralLv ?? true;
        const showIc = it.showIcLv ?? true;
        if (showStruc || showIc) {
          out += `<text x="14" y="${curY + 4}" font-size="11" font-weight="700" fill="#222222">Jenjang Karier (Level):</text>`;
          curY += 18;
          if (showStruc) {
            out += `<text x="14" y="${curY + 2}" font-size="10" fill="#5F5E5A">${esc(it.structuralText || '• Struktural: Jr. Staff → Staff → Supervisor → Manager → GM → Direktur')}</text>`;
            curY += 18;
          }
          if (showIc) {
            out += `<text x="14" y="${curY + 2}" font-size="10" fill="#5F5E5A">${esc(it.icText || '• Individual Contributor (IC): IC → Specialist → Sr. Spec. → Principal')}</text>`;
            curY += 18;
          }
          curY += 6;
        }

        const showShapes = it.showCardShapes ?? true;
        const showBox = it.showShapeBox ?? true;
        const showPara = it.showShapePara ?? true;
        const showDash = it.showShapeDash ?? true;

        if (showShapes && (showBox || showPara || showDash)) {
          out += `<line x1="14" y1="${curY}" x2="${w - 14}" y2="${curY}" stroke="#E5E5DF" stroke-width="1"/>`;
          curY += 14;
          out += `<text x="14" y="${curY}" font-size="11" font-weight="700" fill="#222222">Bentuk Kartu:</text>`;
          curY += 14;
          if (showBox) {
            out += renderShapeSVG(it.shapeBoxType || 'box', curY);
            out += `<text x="42" y="${curY + 10}" font-size="10" fill="#444444">${esc(it.shapeBoxLabel || 'Kotak: Struktural standar')}</text>`;
            curY += 18;
          }
          if (showPara) {
            out += renderShapeSVG(it.shapeParaType || 'para', curY);
            out += `<text x="42" y="${curY + 10}" font-size="10" fill="#444444">${esc(it.shapeParaLabel || 'Jajargenjang: Fungsional / Non-struktural')}</text>`;
            curY += 18;
          }
          if (showDash) {
            out += renderShapeSVG(it.shapeDashType || 'box-dash', curY);
            out += `<text x="42" y="${curY + 10}" font-size="10" fill="#444444">${esc(it.shapeDashLabel || 'Garis Putus: Posisi di luar swimlane utama')}</text>`;
            curY += 18;
          }
          curY += 6;
        }

        const showLines = it.showLineStyles ?? true;
        const showSolid = it.showLineSolid ?? true;
        const showDashLine = it.showLineDash ?? true;

        if (showLines && (showSolid || showDashLine)) {
          out += `<line x1="14" y1="${curY}" x2="${w - 14}" y2="${curY}" stroke="#E5E5DF" stroke-width="1"/>`;
          curY += 14;
          out += `<text x="14" y="${curY}" font-size="11" font-weight="700" fill="#222222">Garis Penghubung:</text>`;
          curY += 14;
          if (showSolid) {
            out += renderShapeSVG(it.lineSolidType || 'line-solid', curY);
            out += `<text x="42" y="${curY + 10}" font-size="10" fill="#444444">${esc(it.lineSolidLabel || 'Garis Solid: Jalur Komando / Hierarki Langsung')}</text>`;
            curY += 18;
          }
          if (showDashLine) {
            out += renderShapeSVG(it.lineDashType || 'line-dash', curY);
            out += `<text x="42" y="${curY + 10}" font-size="10" fill="#444444">${esc(it.lineDashLabel || 'Garis Putus: Jalur Koordinasi / Fungsional')}</text>`;
            curY += 18;
          }
          curY += 6;
        }

        const showStatus = it.showPositionStatus ?? true;
        const showTerisi = it.showStatusTerisi ?? true;
        const showKosong = it.showStatusKosong ?? true;
        const showRekrut = it.showStatusRekrut ?? true;

        if (showStatus && (showTerisi || showKosong || showRekrut)) {
          out += `<line x1="14" y1="${curY}" x2="${w - 14}" y2="${curY}" stroke="#E5E5DF" stroke-width="1"/>`;
          curY += 14;
          out += `<text x="14" y="${curY}" font-size="11" font-weight="700" fill="#222222">Status Jabatan:</text>`;
          curY += 16;
          let statusX = 14;
          if (showTerisi) {
            out += `<circle cx="${statusX + 6}" cy="${curY - 4}" r="5" fill="#10B981"/>`;
            out += `<text x="${statusX + 16}" y="${curY}" font-size="10" fill="#444444">${esc(it.statusTerisiLabel || 'Terisi')}</text>`;
            statusX += Math.max(52, (it.statusTerisiLabel || 'Terisi').length * 7 + 24);
          }
          if (showKosong) {
            out += `<circle cx="${statusX + 6}" cy="${curY - 4}" r="5" fill="#F59E0B"/>`;
            out += `<text x="${statusX + 16}" y="${curY}" font-size="10" fill="#444444">${esc(it.statusKosongLabel || 'Kosong')}</text>`;
            statusX += Math.max(54, (it.statusKosongLabel || 'Kosong').length * 7 + 24);
          }
          if (showRekrut) {
            out += `<circle cx="${statusX + 6}" cy="${curY - 4}" r="5" fill="#3B82F6"/>`;
            out += `<text x="${statusX + 16}" y="${curY}" font-size="10" fill="#444444">${esc(it.statusRekrutLabel || 'Rekrutmen')}</text>`;
          }
          curY += 16;
        }

        if (it.showHeadcountInfo ?? true) {
          out += `<line x1="14" y1="${curY}" x2="${w - 14}" y2="${curY}" stroke="#E5E5DF" stroke-width="1"/>`;
          curY += 14;
          out += `<text x="14" y="${curY}" font-size="10" font-weight="700" fill="#222222">HC:</text>`;
          out += `<text x="42" y="${curY}" font-size="10" fill="#444444">${esc(it.hcLabel || 'Total Headcount (Pegawai) pada baris bawah swimlane')}</text>`;
          curY += 16;
        }

        if (it.showGradeInfo ?? false) {
          out += `<line x1="14" y1="${curY}" x2="${w - 14}" y2="${curY}" stroke="#E5E5DF" stroke-width="1"/>`;
          curY += 14;
          out += `<rect x="14" y="${curY - 10}" width="20" height="12" fill="#5F5E5A"/>`;
          out += `<text x="24" y="${curY - 1}" font-size="8" fill="#FFF" font-weight="700" text-anchor="middle">G#</text>`;
          out += `<text x="42" y="${curY}" font-size="10" fill="#444444">${esc(it.gradeLabel || 'Lencana Grade Golongan Jabatan')}</text>`;
          curY += 16;
        }

        const customRows = (it.customRows || []).filter((r) => r.visible ?? true);
        if ((it.showCustomItems ?? true) && customRows.length > 0) {
          out += `<line x1="14" y1="${curY}" x2="${w - 14}" y2="${curY}" stroke="#E5E5DF" stroke-width="1"/>`;
          curY += 14;
          out += `<text x="14" y="${curY}" font-size="11" font-weight="700" fill="#222222">Item Tambahan:</text>`;
          curY += 14;
          customRows.forEach((r) => {
            out += renderShapeSVG(r.shape, curY);
            out += `<text x="42" y="${curY + 10}" font-size="10" fill="#444444">${esc(r.label)}</text>`;
            curY += 20;
          });
        }
      } else {
        const lines = itemLines(it);
        lines.forEach((l, idx) => {
          out += `<text x="4" y="${fs * 1.2 + idx * fs * 1.35}" font-size="${fs}" ${it.b ? 'font-weight="700"' : ''} fill="#222222">${esc(l)}</text>`;
        });
      }
      out += '</g>';
    });

  out += '</svg>';
  return out;
};

export const exportPageSVG = (page: Page, compact?: boolean) => {
  const svgStr = generateSVGString(page, compact);
  downloadBlob(new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8;' }), `${page.name}.svg`);
};

export const exportPagePNG = (page: Page, compact?: boolean) => {
  const svgStr = generateSVGString(page, compact);
  const W = pageW(page);
  const H = pageH(page) + 20 + (page.title ? 60 : 0);
  const scale = Math.min(2, 16000 / Math.max(W, H));

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = W * scale;
    canvas.height = H * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, `${page.name}.png`);
    }, 'image/png');
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
};

export const getPaperDimensionsMm = (
  paper: string,
  orient: 'landscape' | 'portrait' = 'landscape'
): { w: number; h: number } => {
  let w = 420;
  let h = 297;
  const p = (paper || 'A3').toUpperCase();
  if (p === 'A4') {
    w = 297;
    h = 210;
  } else if (p === 'A3') {
    w = 420;
    h = 297;
  } else if (p === 'F4' || p === 'LEGAL' || p === 'FOLIO') {
    w = 330;
    h = 215; // standard Indonesian F4 / Folio 215 x 330 mm
  } else if (p === 'LETTER') {
    w = 279.4;
    h = 215.9;
  }

  if (orient === 'portrait') {
    return { w: Math.min(w, h), h: Math.max(w, h) };
  } else {
    return { w: Math.max(w, h), h: Math.min(w, h) };
  }
};

export const renderPageToCanvas = (
  page: Page,
  compact?: boolean
): Promise<{ canvas: HTMLCanvasElement; W: number; H: number }> => {
  return new Promise((resolve, reject) => {
    const svgStr = generateSVGString(page, compact);
    const W = pageW(page);
    const H = pageH(page) + 20 + (page.title ? 60 : 0);
    // Crisp scale for 250-300 DPI print quality without memory blowup
    const scale = Math.min(2.5, 4500 / Math.max(W, H));

    const img = new Image();
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(W * scale);
      canvas.height = Math.round(H * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context tidak tersedia'));
        return;
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      resolve({ canvas, W, H });
    };

    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(new Error('Gagal merender SVG ke gambar canvas'));
    };

    img.src = url;
  });
};

export const exportPagesToPDF = async (
  pages: Page[],
  paper = 'A3',
  orient: 'landscape' | 'portrait' = 'landscape',
  compact?: boolean,
  customFilename?: string
): Promise<void> => {
  if (!pages || pages.length === 0) return;
  const { w: pW, h: pH } = getPaperDimensionsMm(paper, orient);

  const doc = new jsPDF({
    orientation: orient === 'portrait' ? 'p' : 'l',
    unit: 'mm',
    format: [pW, pH],
    compress: true,
  });

  for (let i = 0; i < pages.length; i++) {
    if (i > 0) {
      doc.addPage([pW, pH], orient === 'portrait' ? 'p' : 'l');
    }
    const { canvas, W, H } = await renderPageToCanvas(pages[i], compact);
    const margin = 8;
    const availW = pW - margin * 2;
    const availH = pH - margin * 2;
    const ratio = Math.min(availW / W, availH / H);
    const rW = W * ratio;
    const rH = H * ratio;
    const posX = margin + (availW - rW) / 2;
    const posY = margin + (availH - rH) / 2;

    const imgData = canvas.toDataURL('image/png', 1.0);
    doc.addImage(imgData, 'PNG', posX, posY, rW, rH, undefined, 'FAST');
  }

  const defaultName =
    pages.length === 1
      ? pages[0].name || 'Bagan-Organisasi'
      : `Bagan-Organisasi-${pages.length}-Halaman`;
  const filename = (customFilename || defaultName).replace(/[/\\?%*:|"<>]/g, '_');
  doc.save(`${filename}.pdf`);
};

export const exportSinglePagePDF = async (
  page: Page,
  paper = 'A3',
  orient: 'landscape' | 'portrait' = 'landscape',
  compact?: boolean
): Promise<void> => {
  await exportPagesToPDF(
    [page],
    paper,
    orient,
    compact,
    page.title || page.name || 'Bagan Organisasi'
  );
};

export const printPages = async (
  pages: Page[],
  paper = 'A3',
  orient: 'landscape' | 'portrait' = 'landscape',
  compact?: boolean,
  documentTitle = 'Struktur Organisasi'
) => {
  if (!pages || pages.length === 0) return;

  const svgs = pages
    .map((p) => {
      const svg = generateSVGString(p, compact);
      return `<div class="print-page">${svg}</div>`;
    })
    .join('');

  const css = `
    @page {
      size: ${paper} ${orient};
      margin: 8mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #000000;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .print-page {
      page-break-after: always;
      break-after: page;
      width: 100%;
      height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      padding: 4mm;
      overflow: hidden;
    }
    .print-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    svg {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      display: block;
      margin: auto;
    }
  `;

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>${esc(documentTitle)}</title>
  <style>${css}</style>
</head>
<body>
  ${svgs}
</body>
</html>`;

  // Always attempt iframe printing first
  let triggered = false;
  try {
    let iframe = document.getElementById('print-iframe') as HTMLIFrameElement | null;
    if (iframe && iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
    iframe = document.createElement('iframe');
    iframe.id = 'print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        try {
          iframe?.contentWindow?.focus();
          iframe?.contentWindow?.print();
          triggered = true;
        } catch (e) {
          console.warn('Iframe print blocked, falling back to direct PDF download:', e);
          exportPagesToPDF(pages, paper, orient, compact, documentTitle);
        }
      }, 500);
      return;
    }
  } catch (err) {
    console.warn('Iframe setup error, falling back to direct PDF download:', err);
  }

  // If iframe approach failed completely, fallback to generating and downloading PDF
  if (!triggered) {
    await exportPagesToPDF(pages, paper, orient, compact, documentTitle);
  }
};

export const printSinglePage = (
  page: Page,
  paper = 'A3',
  orient: 'landscape' | 'portrait' = 'landscape',
  compact?: boolean
) => {
  printPages([page], paper, orient, compact, page.title || page.name || 'Bagan Organisasi');
};

export const exportDrawioXML = (pages: Page[]): string => {
  const FT = (p: Page) => (p.font || 'Arial,sans-serif').split(',')[0];
  const AT = (o: Record<string, string | undefined>) =>
    Object.entries(o)
      .filter((e) => e[1])
      .map((e) => ` ${e[0]}="${esc(e[1])}"`)
      .join('');

  const mk = (
    id: string,
    par: string,
    v: string,
    st: string,
    g: string,
    at?: Record<string, string | undefined>
  ) => {
    const cell = `<mxCell id="${id}" value="${esc(v)}" parent="${par}" vertex="1" style="${st}"><mxGeometry as="geometry" ${g}/></mxCell>`;
    return at && Object.values(at).some(Boolean)
      ? `<object id="${id}" label="${esc(v)}"${AT(at)}>${cell}</object>`
      : cell;
  };

  let o = `<mxfile host="app.diagrams.net" pages="${pages.length}">`;

  pages.forEach((p) => {
    const H = pageH(p);
    const ff = `fontFamily=${FT(p)};`;
    o += `<diagram name="${esc(p.name)}" id="${p.id}"><mxGraphModel grid="1" page="1" gridSize="10" pageWidth="${pageW(p)}" pageHeight="${H}"><root><mxCell id="0"/><mxCell id="1" parent="0"/>`;

    // Lanes (swimlaneFillColor matches lane color exactly)
    p.lanes.forEach((l, i) => {
      const laneBg = l.color || p.hc || LANE_COLOR;
      o += mk(
        l.id,
        '1',
        l.name,
        `swimlane;horizontal=1;startSize=40;fontStyle=1;fontSize=13;html=1;whiteSpace=wrap;collapsible=0;${ff}swimlaneFillColor=${laneBg};fillColor=${laneBg};strokeColor=${LANE_STROKE};`,
        `x="${laneX(p, i)}" y="0" width="${l.w}" height="${H}"`,
        {
          cbLock: l.lock ? '1' : '',
          ...(i === 0
            ? {
                cbLs: p.ls || 'elbow',
                cbArrow: p.arrow ? '1' : '0',
                cbGrid: p.grid ? '1' : '',
                cbFont: p.font,
                cbBr: p.br,
                cbAuto: p.auto ? '1' : '',
              }
            : {}),
        }
      );
    });

    const cl = (
      id: string,
      par: string,
      v: string,
      st: string,
      x: number,
      y: number,
      w: number,
      h: number,
      at?: Record<string, string | undefined>
    ) => mk(id, par, v, 'rounded=0;whiteSpace=wrap;html=1;' + st, `x="${x}" y="${y}" width="${w}" height="${h}"`, at);

    // Bottom Lane Headcount in Draw.io
    if (p.showHc) {
      p.lanes.forEach((l, i) => {
        const hcCount = getLaneHeadcount(p, i);
        const laneBg = l.color || p.hc || LANE_COLOR;
        o += cl(
          l.id + '_hc',
          l.id,
          `HC: ${hcCount}`,
          `rounded=0;strokeColor=${LANE_STROKE};fillColor=${laneBg};fontStyle=1;fontSize=12;fontColor=#222222;align=center;verticalAlign=middle;`,
          0,
          H - 36,
          l.w,
          36
        );
      });
    }

    p.cards.forEach((c) => {
      const targetLane = p.lanes[Math.min(c.l, p.lanes.length - 1)];
      const h = cardHeight(c, false);
      const sh = c.shape || 'box';
      const pa = isPara(c);
      const np = !!c.np;
      const cols = np && c.cols === 2 ? 2 : 1;
      const x0 = np ? 0 : 74;
      const cw = CARD_WIDTH - x0;
      const R = Math.ceil((c.names || []).length / cols);
      const b = pa ? 'strokeColor=none;fillColor=none;' : `strokeColor=${c.c?.s || '#5F5E5A'};fillColor=${c.c?.f || '#FFFFFF'};`;
      const ph = c.photo && c.photo.startsWith('data:') ? `shape=image;aspect=fixed;imageAspect=0;image=${c.photo.replace(';base64', '')};` : '';

      const os =
        `fillColor=${c.c?.f || '#FFFFFF'};strokeColor=${c.c?.s || '#5F5E5A'};` +
        (pa ? `shape=parallelogram;perimeter=parallelogramPerimeter;fixedSize=1;size=${PARALLELOGRAM_SKEW};` : isDouble(c) ? 'shape=ext;double=1;' : '') +
        (sh.includes('-d') ? 'dashed=1;dashPattern=6 4;' : '');

      o += cl(c.id, targetLane.id, '', os, c.dx, c.y, CARD_WIDTH, h, {
        cbSt: c.st || 'none',
        cbLv: levelKey(c),
        cbCustomLv: c.customLv,
        cbGrade: c.grade,
        cbNote: c.note,
        cbLock: c.lock ? '1' : '',
        cbCol: c.col ? '1' : '',
        cbShape: sh === 'box' ? '' : sh,
        cbNp: np ? '1' : '',
        cbCols: cols === 2 ? '2' : '',
      });

      if (!np) {
        o += cl(c.id + '_foto', c.id, ph ? '' : 'Foto', ph || `strokeColor=${c.c?.s || '#5F5E5A'};fillColor=#FFFFFF;fontSize=10;fontColor=#9A9990;`, 0, 0, 74, h);
      }
      o += cl(c.id + '_jab', c.id, c.jab, b + ff + `fontSize=11;fontStyle=1;fontColor=${c.c?.t || '#222222'};spacingLeft=4;spacingRight=4;`, x0, 0, cw, 54);

      c.names.forEach((n, idx) => {
        o += cl(
          c.id + '_n' + idx,
          c.id,
          n,
          b + ff + `fontSize=11;fontColor=${c.c?.t || '#222222'};spacingLeft=4;spacingRight=4;`,
          x0 + (cw / cols) * (idx % cols),
          54 + 22 * Math.floor(idx / cols),
          cw / cols,
          22
        );
      });

      const lvlStr = levelText(c);
      o += cl(
        c.id + '_k0',
        c.id,
        lvlStr || LEVEL_PLACEHOLDER,
        b + ff + (lvlStr ? `fontSize=10;fontColor=${c.c?.t || '#222222'};fontStyle=1;` : `fontSize=10;fontColor=#9A9990;fontStyle=2;`),
        x0,
        54 + 22 * R,
        cw,
        22
      );

      // Grade badge in Draw.io
      if (c.grade) {
        const gx = (pa ? PARALLELOGRAM_SKEW : 0) + 2;
        const gl = String(c.grade).length;
        o += cl(
          c.id + '_gr',
          c.id,
          `G${c.grade}`,
          `fillColor=${c.c?.s || '#5F5E5A'};strokeColor=none;fontSize=9;fontColor=#FFFFFF;align=center;verticalAlign=middle;`,
          gx,
          2,
          14 + gl * 6,
          14
        );
      }
    });

    p.edges.forEach((e) => {
      const g = edgeGeometry(p, e, false);
      const a = p.cards.find((c) => c.id === e.from);
      const b = p.cards.find((c) => c.id === e.to);
      const n = (p.lanes?.length || 1) - 1;
      const la = a ? Math.min(a.l, n) : 0;
      const lb = b ? Math.min(b.l, n) : 0;

      const hA = a ? cardHeight(a, false) : 98;
      const hB = b ? cardHeight(b, false) : 98;
      const exitY = Math.max(0.05, Math.min(0.95, 0.5 + (e.sdy || 0) / hA)).toFixed(3);
      const entryY = Math.max(0.05, Math.min(0.95, 0.5 + (e.tdy || 0) / hB)).toFixed(3);
      const exitDx = e.sdx || 0;
      const entryDx = e.tdx || 0;

      const A = a ? absPos(p, a) : { x: 0, y: 0 };
      const B = b ? absPos(p, b) : { x: 0, y: 0 };
      const exitFromRight = g ? g.sx > A.x + CARD_WIDTH / 2 : true;
      const enterFromRight = g ? g.tx > B.x + CARD_WIDTH / 2 : false;
      const exitX = exitFromRight ? 1 : 0;
      const entryX = enterFromRight ? 1 : 0;

      // In Draw.io, specify exitX/exitY and entryX/entryY dynamically matching geometry
      const portStyle = `exitX=${exitX};exitY=${exitY};exitDx=${exitDx};exitDy=0;entryX=${entryX};entryY=${entryY};entryDx=${entryDx};entryDy=0;`;

      // Support single trunk or multi-waypoint points from edgeGeometry
      let pt = '';
      if (g && p.ls !== 'straight') {
        if (g.points && g.points.length > 0) {
          const ptXml = g.points.map((p) => `<mxPoint x="${p.x}" y="${p.y}"/>`).join('');
          pt = `<Array as="points">${ptXml}</Array>`;
        } else {
          const midY = Math.round((g.sy + g.ty) / 2);
          pt = `<Array as="points"><mxPoint x="${g.tr}" y="${midY}"/></Array>`;
        }
      }

      const edgeStyle =
        p.ls === 'straight'
          ? 'edgeStyle=none;'
          : p.ls === 'curve'
          ? 'edgeStyle=orthogonalEdgeStyle;curved=1;'
          : 'edgeStyle=orthogonalEdgeStyle;';

      const fullStyle = `${edgeStyle}${portStyle}rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#5F5E5A;strokeWidth=2;endArrow=${p.arrow ? 'block' : 'none'};${e.dash ? 'dashed=1;dashPattern=8 8;' : ''}`;

      o += `<mxCell id="${e.id}" parent="1" source="${e.from}" target="${e.to}" edge="1" style="${fullStyle}"><mxGeometry relative="1" as="geometry">${pt}</mxGeometry></mxCell>`;
    });

    (p.items || []).forEach((it) => {
      const h = itemHeight(it);
      const w = it.w || 200;
      if (it.t === 'legend') {
        const parts: string[] = [];
        if (it.showTitle ?? true) {
          parts.push(`<b>${esc(it.text || 'Legenda Bagan')}</b>`);
        }
        const showStruc = it.showStructuralLv ?? true;
        const showIc = it.showIcLv ?? true;
        if (showStruc || showIc) {
          let lvHtml = `<b>Jenjang Karier (Level):</b><br>`;
          if (showStruc) lvHtml += `• Struktural: Jr. Staff → Staff → Supervisor → Manager → GM → Direktur<br>`;
          if (showIc) lvHtml += `• IC: IC → Jr. Specialist → Specialist → Sr. Spec. → Principal<br>`;
          parts.push(lvHtml);
        }
        if (it.showCardShapes ?? true) {
          parts.push(`<b>Bentuk Kartu:</b><br>• Kotak: Struktural standar<br>• Jajargenjang: Fungsional / Non-struktural<br>• Putus-putus: Level di luar lane`);
        }
        if (it.showLineStyles ?? true) {
          parts.push(`<b>Garis Penghubung:</b><br>• Solid: Jalur Komando Langsung<br>• Putus-putus: Jalur Koordinasi / Fungsional`);
        }
        if (it.showPositionStatus ?? true) {
          parts.push(`<b>Status:</b> 🟢 Terisi &nbsp; 🟡 Kosong &nbsp; 🔵 Rekrutmen`);
        }
        if (it.showHeadcountInfo ?? true) {
          parts.push(`<b>Headcount (HC):</b> Total pegawai pada baris bawah swimlane`);
        }
        if (it.showGradeInfo ?? false) {
          parts.push(`<b>Grade (G#):</b> Penanda level grade kepegawaian`);
        }
        const legendHtml = parts.join('<br><br>');
        o += mk(
          it.id,
          '1',
          legendHtml,
          `rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#9A9990;verticalAlign=top;align=left;spacing=10;fontSize=10;`,
          `x="${it.x}" y="${it.y}" width="${w}" height="${h}"`,
          { cbItem: it.t, cbData: JSON.stringify(it) }
        );
      } else {
        const st =
          it.t === 'frame'
            ? 'rounded=0;whiteSpace=wrap;html=1;dashed=1;fillColor=none;verticalAlign=top;align=left;fontStyle=1;spacingLeft=8;'
            : `text;html=1;whiteSpace=wrap;fontSize=${it.fs || 12};align=left;verticalAlign=top;` + (it.b ? 'fontStyle=1;' : '');

        o += mk(it.id, '1', it.text || '', st, `x="${it.x}" y="${it.y}" width="${w}" height="${h}"`, {
          cbItem: it.t,
          cbData: JSON.stringify(it),
        });
      }
    });

    if (p.title) {
      o += mk('ttl_' + p.id, '1', p.title, 'text;html=1;fontSize=20;fontStyle=1;align=left;', 'x="8" y="-52" width="600" height="36"', {
        cbTitle: p.title,
      });
    }

    o += '</root></mxGraphModel></diagram>';
  });

  o += '</mxfile>';
  return o;
};

export const exportDrawioFile = (pages: Page[]) => {
  const xml = exportDrawioXML(pages);
  downloadBlob(new Blob([xml], { type: 'text/xml' }), 'chart.drawio');
};

export const parseCSVText = (t: string): string[][] => {
  const rows: string[][] = [];
  let r: string[] = [];
  let f = '';
  let qt = 0;
  t = t.replace(/^\uFEFF/, '');
  const l1 = t.split('\n')[0];
  const d = l1.split(';').length > l1.split(',').length ? ';' : ',';

  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (qt) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          f += '"';
          i++;
        } else {
          qt = 0;
        }
      } else f += c;
    } else if (c === '"') {
      qt = 1;
    } else if (c === d) {
      r.push(f);
      f = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      r.push(f);
      rows.push(r);
      r = [];
      f = '';
    } else {
      f += c;
    }
  }
  if (f || r.length) {
    r.push(f);
    rows.push(r);
  }
  return rows;
};

export const csvRowsToPages = (rows: string[][]): Page[] => {
  const filtered = rows.filter((r) => r.some((x) => String(x ?? '').trim()));
  if (filtered.length < 2) return [];

  const hd = filtered[0].map((x) => String(x).trim().toLowerCase());
  const ix = (re: RegExp) => hd.findIndex((h) => re.test(h));

  const I = {
    pg: ix(/halaman|page/),
    ln: ix(/lane|level|tingkat/),
    jb: ix(/jabatan|posisi|position|title/),
    nm: ix(/nama|name/),
    lv: ix(/level|kode|code|^id$/),
    at: ix(/atasan|parent|report|manager/),
    st: ix(/status/),
    gr: ix(/grade/),
    nt: ix(/catatan|note/),
  };

  const getCol = (r: string[], k: number) => (k < 0 ? '' : String(r[k] ?? '').trim());
  const grouped: Record<string, string[][]> = {};

  filtered.slice(1).forEach((r) => {
    const pageKey = getCol(r, I.pg) || 'Impor';
    if (!grouped[pageKey]) grouped[pageKey] = [];
    grouped[pageKey].push(r);
  });

  return Object.entries(grouped).map(([name, records]) => {
    const pageId = uid();
    const laneNames = [...new Set(records.map((r) => getCol(r, I.ln) || 'Lane'))];
    const lanes = laneNames.map((n) => ({ id: uid(), name: n, w: 320 }));
    const cards: (Card & { _atasan?: string })[] = [];

    records.forEach((r) => {
      const lIndex = Math.max(0, laneNames.indexOf(getCol(r, I.ln) || 'Lane'));
      const names = getCol(r, I.nm)
        .split('|')
        .map((x) => x.trim())
        .filter(Boolean);

      const statusRaw = getCol(r, I.st).toLowerCase();
      const status: Card['st'] = /kosong|vacan/i.test(statusRaw)
        ? 'kosong'
        : /rekrut|recruit/i.test(statusRaw)
        ? 'rekrut'
        : names.length
        ? 'terisi'
        : '';

      const rawLv = getCol(r, I.lv);
      const parsedLv = parseLevel(rawLv);
      const customLv =
        parsedLv.lv === 0 && rawLv && rawLv !== '[level jabatan]' && rawLv !== '[kode unik]'
          ? rawLv
          : undefined;

      cards.push({
        id: uid(),
        l: lIndex,
        dx: 35,
        y: 80,
        jab: getCol(r, I.jb) || 'Jabatan Baru',
        names: names.length ? names : [status === 'kosong' ? '(Posisi kosong)' : ''],
        lv: parsedLv.lv,
        tr: parsedLv.tr,
        customLv,
        c: { f: '#FFFFFF', s: '#5F5E5A', t: '#222222' },
        photo: '',
        st: status,
        grade: getCol(r, I.gr),
        note: getCol(r, I.nt),
        shape: 'box',
        _atasan: getCol(r, I.at),
      });
    });

    const edges: Page['edges'] = [];
    cards.forEach((c) => {
      if (c._atasan) {
        const atasanName = c._atasan.toLowerCase();
        const parentCard = cards.find((x) => x !== c && x.jab.toLowerCase() === atasanName);
        if (parentCard) {
          edges.push({ id: uid(), from: parentCard.id, to: c.id, dash: false });
        }
      }
      delete c._atasan;
    });

    const newPage: Page = {
      id: pageId,
      name,
      H: 900,
      lanes,
      cards,
      edges,
    };

    autoTidy(newPage);
    return newPage;
  });
};
