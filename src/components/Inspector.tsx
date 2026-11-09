/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  AlertCircle,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyStart,
  Camera,
  CheckCircle2,
  Copy,
  FolderPlus,
  Lock,
  Palette,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Unlock,
  Upload,
  UserPlus,
  MoveVertical,
  CornerDownRight,
} from 'lucide-react';
import {
  BUILT_IN_TEMPLATES,
  CARD_WIDTH,
  COLOR_PALETTES,
  LANE_COLOR,
  LANE_COLOR_PRESETS,
  LEVEL_OPTIONS,
  SHAPES_CONFIG,
} from '../constants';
import {
  AnnotationItem,
  Card,
  CardColor,
  CardShape,
  CardStatus,
  Edge,
  EdgeEntry,
  EdgeOrigin,
  Lane,
  LegendCustomRow,
  LegendShapeType,
  Page,
  ProjectState,
  TemplateCard,
  VersionSnapshot,
} from '../types';

const LEGEND_SHAPE_OPTIONS: { value: LegendShapeType; label: string }[] = [
  { value: 'box', label: 'Kotak Persegi Standar' },
  { value: 'box-rounded', label: 'Kotak Sudut Bulat (Rounded)' },
  { value: 'box-double', label: 'Kotak Garis Ganda (Double)' },
  { value: 'box-dash', label: 'Kotak Putus-putus (Dashed)' },
  { value: 'para', label: 'Jajargenjang (Fungsional)' },
  { value: 'diamond', label: 'Belah Ketupat (Diamond)' },
  { value: 'line-solid', label: 'Garis Solid (Komando)' },
  { value: 'line-thick', label: 'Garis Solid Tebal' },
  { value: 'line-dash', label: 'Garis Putus-putus (Koordinasi)' },
  { value: 'line-dot', label: 'Garis Titik-titik (Dotted)' },
  { value: 'circle-green', label: 'Bulatan Hijau (Terisi)' },
  { value: 'circle-amber', label: 'Bulatan Oranye (Kosong)' },
  { value: 'circle-blue', label: 'Bulatan Biru (Rekrutmen)' },
  { value: 'circle-red', label: 'Bulatan Merah' },
  { value: 'circle-purple', label: 'Bulatan Ungu' },
  { value: 'badge', label: 'Lencana Grade Kotak (G#)' },
];
import {
  absPos,
  cardHeight,
  findAutoParent,
  getKids,
  isPara,
  levelKey,
  levelText,
  setAbsPos,
  snapCoord,
  uid,
} from '../utils/geometry';

interface InspectorProps {
  page: Page;
  project: ProjectState;
  selectedIds: Set<string>;
  selectedElement: { type: 'card' | 'lane' | 'edge' | 'item'; id: string } | null;
  setSelectedElement: (el: { type: 'card' | 'lane' | 'edge' | 'item'; id: string } | null) => void;
  onUpdateCard: (card: Card) => void;
  onUpdateCards: (cards: Card[]) => void;
  onDeleteCards: (ids: string[]) => void;
  onAddSubordinate: (parentId: string) => void;
  onUpdateLane: (lane: Lane) => void;
  onInsertLane: (index: number) => void;
  onMoveLane: (index: number, direction: -1 | 1) => void;
  onDeleteLane: (laneId: string) => void;
  onUpdateEdge: (edge: Edge) => void;
  onDeleteEdge: (edgeId: string) => void;
  onUpdateItem: (item: AnnotationItem) => void;
  onDeleteItem: (itemId: string) => void;
  onUpdatePage: (page: Page) => void;
  onSaveTemplate: (tpl: TemplateCard) => void;
  onDeleteCustomTemplate: (index: number) => void;
  onApplyTemplate: (tpl: TemplateCard) => void;
  onDuplicateCard: (card: Card) => void;
  onBulkPhotoUpload: (files: File[]) => void;
  versionSnapshots: VersionSnapshot[];
  onSaveSnapshot: (name: string) => void;
  onRestoreSnapshot: (snapshot: VersionSnapshot) => void;
  onDeleteSnapshot: (index: number) => void;
  onAutoConnectAll?: () => void;
  onConnectToParent?: (cardId: string, parentId: string | null) => void;
  onAutoConnectCard?: (cardId: string) => void;
  onClearAllEdges?: () => void;
  onStartManualConnect?: (cardId?: string) => void;
}

export const Inspector: React.FC<InspectorProps> = ({
  page,
  project,
  selectedIds,
  selectedElement,
  setSelectedElement,
  onUpdateCard,
  onUpdateCards,
  onDeleteCards,
  onAddSubordinate,
  onUpdateLane,
  onInsertLane,
  onMoveLane,
  onDeleteLane,
  onUpdateEdge,
  onDeleteEdge,
  onUpdateItem,
  onDeleteItem,
  onUpdatePage,
  onSaveTemplate,
  onDeleteCustomTemplate,
  onApplyTemplate,
  onDuplicateCard,
  onBulkPhotoUpload,
  versionSnapshots,
  onSaveSnapshot,
  onRestoreSnapshot,
  onDeleteSnapshot,
  onAutoConnectAll,
  onConnectToParent,
  onAutoConnectCard,
  onClearAllEdges,
  onStartManualConnect,
}) => {
  const [snapshotName, setSnapshotName] = useState('');
  const [validationResults, setValidationResults] = useState<string[] | null>(null);
  const [multiCustomLv, setMultiCustomLv] = useState<string | null>(null);
  const [legendTab, setLegendTab] = useState<'checklist' | 'edit'>('checklist');

  // Identify selected entities
  const selectedCard =
    selectedElement?.type === 'card' ? page.cards.find((c) => c.id === selectedElement.id) : null;
  const selectedLane =
    selectedElement?.type === 'lane' ? page.lanes.find((l) => l.id === selectedElement.id) : null;
  const selectedEdge =
    selectedElement?.type === 'edge' ? page.edges.find((e) => e.id === selectedElement.id) : null;
  const selectedItem =
    selectedElement?.type === 'item' ? (page.items || []).find((i) => i.id === selectedElement.id) : null;

  const multiCards = page.cards.filter((c) => selectedIds.has(c.id));

  // Multi-card alignment helpers
  const handleAlignLeft = () => {
    if (multiCards.length < 2) return;
    const minX = Math.min(...multiCards.map((c) => absPos(page, c).x));
    const updated = multiCards.map((c) => {
      const clone = { ...c };
      setAbsPos(page, clone, minX, c.y);
      return clone;
    });
    onUpdateCards(updated);
  };

  const handleAlignCenterLane = () => {
    const updated = multiCards.map((c) => {
      const lane = page.lanes[c.l] || { w: 320 };
      return {
        ...c,
        dx: Math.round((lane.w - CARD_WIDTH) / 20) * 10,
      };
    });
    onUpdateCards(updated);
  };

  const handleAlignTop = () => {
    if (multiCards.length < 2) return;
    const minY = Math.min(...multiCards.map((c) => c.y));
    const updated = multiCards.map((c) => ({ ...c, y: minY }));
    onUpdateCards(updated);
  };

  const handleDistributeVertical = () => {
    if (multiCards.length < 3) return;
    const sorted = [...multiCards].sort((a, b) => a.y - b.y);
    const y0 = sorted[0].y;
    const yEnd = sorted[sorted.length - 1].y;
    const step = (yEnd - y0) / (sorted.length - 1);
    const updated = sorted.map((c, i) => ({
      ...c,
      y: snapCoord(y0 + i * step),
    }));
    onUpdateCards(updated);
  };

  // Validation function
  const runValidation = () => {
    const issues: string[] = [];
    page.cards.forEach((c) => {
      if (!c.names.some((x) => x.trim()) && c.st !== 'kosong') {
        issues.push(`Tanpa nama pegawai: "${c.jab}"`);
      }
      if (c.l > 0 && !isPara(c) && !page.edges.some((e) => e.to === c.id)) {
        issues.push(`Tanpa garis atasan: "${c.jab}" (Lane: ${page.lanes[c.l]?.name || ''})`);
      }
    });

    // Check cycles
    const visited: Record<string, number> = {};
    let hasCycle = false;
    const dfs = (nodeId: string) => {
      visited[nodeId] = 1;
      for (const kid of getKids(page, nodeId)) {
        if (visited[kid] === 1) {
          hasCycle = true;
          return;
        }
        if (!visited[kid]) dfs(kid);
      }
      visited[nodeId] = 2;
    };
    page.cards.forEach((c) => {
      if (!visited[c.id]) dfs(c.id);
    });

    if (hasCycle) {
      issues.push('Peringatan: Terdeteksi loop hierarki melingkar antar posisi!');
    }

    setValidationResults(issues);
  };

  // Photo upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedCard) {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 240;
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          onUpdateCard({ ...selectedCard, photo: dataUrl });
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <aside className="w-80 bg-white border-l border-[#D8D6CC] p-4 flex flex-col gap-4 overflow-y-auto shrink-0 shadow-xs z-10 text-xs">
      {/* 1. Multi-card selection */}
      {selectedIds.size > 1 ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#D8D6CC]">
            <h3 className="font-bold text-sm text-gray-800">{selectedIds.size} Kartu Dipilih</h3>
            <button
              onClick={() => onDeleteCards([...selectedIds])}
              className="text-rose-600 hover:text-rose-700 flex items-center gap-1 font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus</span>
            </button>
          </div>

          <div>
            <label className="text-gray-500 font-medium block mb-1">Ratakan Posisi</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={handleAlignLeft}
                className="px-2 py-1.5 border border-[#D8D6CC] rounded-md hover:bg-gray-50 flex items-center justify-center gap-1 text-gray-700"
              >
                <AlignHorizontalJustifyStart className="w-3.5 h-3.5" />
                <span>Rata Kiri</span>
              </button>
              <button
                onClick={handleAlignCenterLane}
                className="px-2 py-1.5 border border-[#D8D6CC] rounded-md hover:bg-gray-50 flex items-center justify-center gap-1 text-gray-700"
              >
                <AlignHorizontalJustifyCenter className="w-3.5 h-3.5" />
                <span>Tengah Lane</span>
              </button>
              <button
                onClick={handleAlignTop}
                className="px-2 py-1.5 border border-[#D8D6CC] rounded-md hover:bg-gray-50 flex items-center justify-center gap-1 text-gray-700"
              >
                <AlignVerticalJustifyStart className="w-3.5 h-3.5" />
                <span>Rata Atas</span>
              </button>
              <button
                onClick={handleDistributeVertical}
                className="px-2 py-1.5 border border-[#D8D6CC] rounded-md hover:bg-gray-50 flex items-center justify-center gap-1 text-gray-700"
              >
                <AlignVerticalJustifyCenter className="w-3.5 h-3.5" />
                <span>Jarak Vertikal</span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-gray-500 font-medium block mb-1">Ubah Bentuk Sekaligus</label>
            <select
              onChange={(e) => {
                const shape = e.target.value as CardShape;
                if (shape) {
                  const updated = multiCards.map((c) => ({ ...c, shape }));
                  onUpdateCards(updated);
                }
              }}
              className="w-full p-2 border border-[#D8D6CC] rounded-md bg-white text-gray-700"
            >
              <option value="">— Pilih untuk semua —</option>
              {SHAPES_CONFIG.map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Ubah Level Sekaligus */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-gray-500 font-medium">Ubah Level Sekaligus</label>
              <button
                type="button"
                onClick={() => setMultiCustomLv(multiCustomLv !== null ? null : '')}
                className="text-[11px] text-[#0F6E56] hover:underline font-semibold"
              >
                {multiCustomLv !== null ? '📋 Pilih Daftar' : '✍️ Ketik Sendiri'}
              </button>
            </div>
            {multiCustomLv !== null ? (
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={multiCustomLv}
                  onChange={(e) => setMultiCustomLv(e.target.value)}
                  placeholder="Ketik level untuk semua kartu..."
                  className="flex-1 p-2 border border-[#D8D6CC] rounded-md text-xs focus:outline-none focus:border-[#0F6E56]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const updated = multiCards.map((c) => ({ ...c, customLv: multiCustomLv }));
                    onUpdateCards(updated);
                  }}
                  className="px-2.5 py-1.5 bg-[#0F6E56] text-white rounded-md text-xs font-semibold hover:bg-[#0B5441]"
                >
                  Terapkan
                </button>
              </div>
            ) : (
              <select
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '__custom__') {
                    setMultiCustomLv('');
                  } else if (val) {
                    const track = val[0] as 'S' | 'I';
                    const lvNum = Number(val.slice(1));
                    const updated = multiCards.map((c) => ({ ...c, lv: lvNum, tr: track, customLv: undefined }));
                    onUpdateCards(updated);
                  }
                }}
                className="w-full p-2 border border-[#D8D6CC] rounded-md bg-white text-gray-700"
              >
                <option value="">— Pilih level untuk semua —</option>
                <option value="__custom__">✍️ Ketik Sendiri...</option>
                <optgroup label="Jalur Struktural">
                  {LEVEL_OPTIONS.S.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Jalur Individual Contributor">
                  {LEVEL_OPTIONS.I.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </optgroup>
              </select>
            )}
          </div>

          <div>
            <label className="text-gray-500 font-medium block mb-1">Palet Warna Kartu</label>
            <div className="flex gap-2">
              {COLOR_PALETTES.map((pal, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    const updated = multiCards.map((c) => ({ ...c, c: pal }));
                    onUpdateCards(updated);
                  }}
                  className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ backgroundColor: pal.f, borderColor: pal.s }}
                />
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-gray-700 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={multiCards.every((c) => c.np)}
              onChange={(e) => {
                const updated = multiCards.map((c) => ({ ...c, np: e.target.checked }));
                onUpdateCards(updated);
              }}
              className="rounded-sm text-[#0F6E56] focus:ring-[#0F6E56]"
            />
            <span>Format Staf (tanpa foto, banyak nama)</span>
          </label>

          <label className="flex items-center gap-2 text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={multiCards.every((c) => c.lock)}
              onChange={(e) => {
                const updated = multiCards.map((c) => ({ ...c, lock: e.target.checked }));
                onUpdateCards(updated);
              }}
              className="rounded-sm text-[#0F6E56] focus:ring-[#0F6E56]"
            />
            <span>Kunci semua posisi (tidak bisa digeser)</span>
          </label>
        </div>
      ) : selectedCard ? (
        /* 2. Single Card Inspector */
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#D8D6CC]">
            <h3 className="font-bold text-sm text-gray-800">Kartu Jabatan</h3>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onDuplicateCard(selectedCard)}
                className="p-1 text-gray-500 hover:text-gray-800 rounded-sm"
                title="Duplikat kartu"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDeleteCards([selectedCard.id])}
                className="p-1 text-rose-500 hover:text-rose-700 rounded-sm"
                title="Hapus kartu"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Job Title */}
          <div>
            <label className="text-gray-500 font-medium block mb-1">Nama Jabatan</label>
            <input
              type="text"
              value={selectedCard.jab}
              onChange={(e) => onUpdateCard({ ...selectedCard, jab: e.target.value })}
              className="w-full p-2 border border-[#D8D6CC] rounded-md font-semibold text-gray-800 focus:outline-none focus:border-[#0F6E56]"
            />
          </div>

          {/* Shape */}
          <div>
            <label className="text-gray-500 font-medium block mb-1">Bentuk Kartu</label>
            <select
              value={selectedCard.shape || 'box'}
              onChange={(e) => onUpdateCard({ ...selectedCard, shape: e.target.value as CardShape })}
              className="w-full p-2 border border-[#D8D6CC] rounded-md bg-white text-gray-700"
            >
              {SHAPES_CONFIG.map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Staff Mode Toggle */}
          <label className="flex items-center gap-2 text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={!!selectedCard.np}
              onChange={(e) => onUpdateCard({ ...selectedCard, np: e.target.checked })}
              className="rounded-sm text-[#0F6E56] focus:ring-[#0F6E56]"
            />
            <span>Staf: Tanpa foto, muat banyak nama</span>
          </label>

          {/* Name Columns (if staff) */}
          {selectedCard.np && (
            <div>
              <label className="text-gray-500 font-medium block mb-1">Kolom Nama Pegawai</label>
              <select
                value={selectedCard.cols || 1}
                onChange={(e) => onUpdateCard({ ...selectedCard, cols: Number(e.target.value) })}
                className="w-full p-2 border border-[#D8D6CC] rounded-md bg-white text-gray-700"
              >
                <option value={1}>1 Kolom</option>
                <option value={2}>2 Kolom</option>
              </select>
            </div>
          )}

          {/* Employee Names */}
          <div>
            <label className="text-gray-500 font-medium block mb-1">
              Nama Pemegang Jabatan (1 baris per nama)
            </label>
            <textarea
              rows={selectedCard.np ? 5 : 2}
              value={selectedCard.names.join('\n')}
              onChange={(e) =>
                onUpdateCard({
                  ...selectedCard,
                  names: e.target.value.split('\n').filter((x, i, a) => x.trim() || i < a.length - 1),
                })
              }
              className="w-full p-2 border border-[#D8D6CC] rounded-md font-mono text-xs focus:outline-none focus:border-[#0F6E56]"
              placeholder="Masukkan nama pegawai..."
            />
          </div>

          {/* LEVEL JABATAN: Support preset or custom typed level */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-gray-500 font-medium">
                Level Jabatan
              </label>
              <button
                type="button"
                onClick={() => {
                  if (selectedCard.customLv !== undefined) {
                    onUpdateCard({ ...selectedCard, customLv: undefined });
                  } else {
                    const currentText = levelText(selectedCard);
                    onUpdateCard({ ...selectedCard, customLv: currentText || '' });
                  }
                }}
                className="text-[11px] text-[#0F6E56] hover:underline font-semibold flex items-center gap-1"
                title="Beralih antara pilihan preset dan ketik sendiri"
              >
                {selectedCard.customLv !== undefined ? '📋 Pilih Daftar' : '✍️ Ketik Sendiri'}
              </button>
            </div>

            {selectedCard.customLv !== undefined ? (
              <div className="space-y-1">
                <input
                  type="text"
                  value={selectedCard.customLv}
                  onChange={(e) => onUpdateCard({ ...selectedCard, customLv: e.target.value })}
                  placeholder="Ketik level sendiri (mis. VP, Advisor, Koordinator)..."
                  className="w-full p-2 border border-[#0F6E56] rounded-md bg-white text-gray-800 font-medium text-xs focus:outline-none focus:ring-1 focus:ring-[#0F6E56]"
                  autoFocus
                />
                <div className="flex items-center justify-between text-[10px] text-gray-500">
                  <span>Mode ketik manual aktif</span>
                  <button
                    type="button"
                    onClick={() => onUpdateCard({ ...selectedCard, customLv: undefined })}
                    className="text-blue-600 hover:underline"
                  >
                    Batal (kembali ke daftar)
                  </button>
                </div>
              </div>
            ) : (
              <select
                value={levelKey(selectedCard)}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '__custom__') {
                    const currentText = levelText(selectedCard);
                    onUpdateCard({ ...selectedCard, customLv: currentText || '' });
                  } else if (!val) {
                    onUpdateCard({ ...selectedCard, lv: 0, tr: '', customLv: undefined });
                  } else {
                    const track = val[0] as 'S' | 'I';
                    const lvNum = Number(val.slice(1));
                    onUpdateCard({ ...selectedCard, lv: lvNum, tr: track, customLv: undefined });
                  }
                }}
                className="w-full p-2 border border-[#D8D6CC] rounded-md bg-white text-gray-700 font-medium"
              >
                <option value="">– Pilih Level –</option>
                <option value="__custom__">✍️ Ketik Sendiri...</option>
                <optgroup label="Jalur Struktural">
                  {LEVEL_OPTIONS.S.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Jalur Individual Contributor">
                  {LEVEL_OPTIONS.I.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </optgroup>
              </select>
            )}
          </div>

          {/* Grade */}
          <div>
            <label className="text-gray-500 font-medium block mb-1">Grade Jabatan (opsional)</label>
            <input
              type="text"
              value={selectedCard.grade || ''}
              onChange={(e) => onUpdateCard({ ...selectedCard, grade: e.target.value })}
              placeholder="mis. G1 / G2"
              className="w-full p-2 border border-[#D8D6CC] rounded-md focus:outline-none focus:border-[#0F6E56]"
            />
          </div>

          {/* Card Color Palette */}
          <div>
            <label className="text-gray-500 font-medium block mb-1">Warna Header / Kartu</label>
            <div className="flex gap-2">
              {COLOR_PALETTES.map((pal, idx) => {
                const isActive = selectedCard.c?.f === pal.f;
                return (
                  <button
                    key={idx}
                    onClick={() => onUpdateCard({ ...selectedCard, c: pal })}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      isActive ? 'ring-2 ring-[#0F6E56] scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: pal.f, borderColor: pal.s }}
                  />
                );
              })}
            </div>
          </div>

          {/* Photo Actions */}
          {!selectedCard.np && (
            <div className="flex gap-2 items-center pt-1">
              <label className="flex-1 py-1.5 px-3 border border-[#D8D6CC] rounded-md text-center cursor-pointer hover:bg-gray-50 flex items-center justify-center gap-1.5 text-gray-700 font-medium">
                <Camera className="w-3.5 h-3.5" />
                <span>Unggah Foto…</span>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
              {selectedCard.photo && (
                <button
                  onClick={() => onUpdateCard({ ...selectedCard, photo: '' })}
                  className="py-1.5 px-3 border border-rose-200 text-rose-600 rounded-md hover:bg-rose-50"
                >
                  Hapus
                </button>
              )}
            </div>
          )}

          {/* Subordinates & Fold */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => onAddSubordinate(selectedCard.id)}
              className="py-1.5 px-2 bg-emerald-50 text-[#0F6E56] border border-emerald-300 rounded-md font-medium hover:bg-emerald-100 flex items-center justify-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Bawahan</span>
            </button>
            <button
              onClick={() => onUpdateCard({ ...selectedCard, col: !selectedCard.col })}
              className="py-1.5 px-2 border border-[#D8D6CC] rounded-md font-medium hover:bg-gray-50 text-gray-700"
            >
              {selectedCard.col ? 'Buka Bawahan' : 'Lipat Bawahan'}
            </button>
          </div>

          {/* Hubungan Hierarki: Atasan Langsung (Manual & Otomatis) */}
          {(() => {
            const incomingEdge = page.edges.find((e) => e.to === selectedCard.id);
            const parentCard = incomingEdge ? page.cards.find((c) => c.id === incomingEdge.from) : null;
            const autoParent = findAutoParent(page, selectedCard);

            return (
              <div className="p-2.5 bg-gray-50 rounded-lg border border-[#D8D6CC] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-gray-700 font-semibold block text-[11px]">
                    Atasan Langsung (Garis Masuk)
                  </label>
                  {parentCard && onConnectToParent && (
                    <button
                      type="button"
                      onClick={() => onConnectToParent(selectedCard.id, null)}
                      className="text-[10px] text-rose-600 hover:text-rose-700 underline font-medium"
                      title="Putuskan hubungan garis atasan"
                    >
                      Putuskan
                    </button>
                  )}
                </div>

                {/* Dropdown pilih atasan manual */}
                <select
                  value={parentCard?.id || ''}
                  onChange={(e) => {
                    const targetId = e.target.value;
                    if (onConnectToParent) {
                      onConnectToParent(selectedCard.id, targetId || null);
                    }
                  }}
                  className="w-full p-1.5 border border-[#D8D6CC] rounded-md bg-white text-gray-700 text-xs font-medium"
                >
                  <option value="">{selectedCard.l === 0 ? '(Posisi Puncak / Tanpa Atasan)' : '(Belum Ada Atasan Langsung)'}</option>
                  {page.cards
                    .filter((c) => c.id !== selectedCard.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.jab} {c.names?.[0] ? `(${c.names[0]})` : ''} — Lane {c.l + 1}
                      </option>
                    ))}
                </select>

                {/* Tombol hubungkan otomatis jika belum ada atasan */}
                {!parentCard && autoParent && onConnectToParent && (
                  <button
                    type="button"
                    onClick={() => onConnectToParent(selectedCard.id, autoParent.id)}
                    className="w-full py-1.5 px-2 bg-emerald-50 text-[#0F6E56] border border-emerald-300 rounded-md text-xs font-semibold hover:bg-emerald-100 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Hubungkan Otomatis ke: {autoParent.jab}</span>
                  </button>
                )}

                {/* Kontrol Arah Garis Masuk jika kartu memiliki atasan */}
                {incomingEdge && (
                  <div className="pt-2 border-t border-gray-200 flex flex-col gap-2">
                    {/* Arah Diterima pada Kartu Ini */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold text-gray-700">
                          Arah Garis Diterima pada Kartu Ini:
                        </span>
                        {incomingEdge.entry && (
                          <button
                            type="button"
                            onClick={() => {
                              const copy = { ...incomingEdge };
                              delete copy.entry;
                              onUpdateEdge(copy);
                            }}
                            className="text-[9px] text-gray-400 hover:text-gray-700 underline"
                            title="Kembalikan ke aturan otomatis"
                          >
                            Reset Otomatis
                          </button>
                        )}
                      </div>
                      {(() => {
                        const isSameLane = parentCard?.l === selectedCard.l;
                        const defaultEntry: EdgeEntry = isSameLane
                          ? ((incomingEdge.origin || page.edgeOrigin || 'front') === 'front' ? 'front' : 'back')
                          : ((parentCard?.l ?? 0) < selectedCard.l ? 'back' : 'front');
                        const currentEntry: EdgeEntry = incomingEdge.entry || page.edgeEntry || defaultEntry;

                        return (
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => onUpdateEdge({ ...incomingEdge, entry: 'back' })}
                              className={`py-1.5 px-2 rounded border text-[11px] font-semibold flex flex-col items-center justify-center gap-0.5 transition-colors ${
                                currentEntry === 'back'
                                  ? 'bg-[#0F6E56] text-white border-[#0F6E56] shadow-xs'
                                  : 'bg-white text-gray-700 border-[#D8D6CC] hover:bg-gray-100'
                              }`}
                            >
                              <span>⬅️ Dari Belakang</span>
                              <span className={`text-[9px] ${currentEntry === 'back' ? 'text-emerald-100' : 'text-gray-400'}`}>
                                (Kiri / Standar)
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onUpdateEdge({ ...incomingEdge, entry: 'front' })}
                              className={`py-1.5 px-2 rounded border text-[11px] font-semibold flex flex-col items-center justify-center gap-0.5 transition-colors ${
                                currentEntry === 'front'
                                  ? 'bg-[#0F6E56] text-white border-[#0F6E56] shadow-xs'
                                  : 'bg-white text-gray-700 border-[#D8D6CC] hover:bg-gray-100'
                              }`}
                            >
                              <span>➡️ Dari Depan</span>
                              <span className={`text-[9px] ${currentEntry === 'front' ? 'text-emerald-100' : 'text-gray-400'}`}>
                                (Kanan)
                              </span>
                            </button>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Arah Muncul dari Kartu Atasan */}
                    <div>
                      <span className="text-[10px] font-semibold text-gray-700 block mb-1">
                        Arah Garis Muncul dari Atasan ({parentCard?.jab || 'Atasan'}):
                      </span>
                      {(() => {
                        const currentOrigin = incomingEdge.origin || page.edgeOrigin || 'front';
                        return (
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => onUpdateEdge({ ...incomingEdge, origin: 'front' })}
                              className={`py-1 px-1.5 rounded border text-[10px] font-semibold transition-colors ${
                                currentOrigin === 'front'
                                  ? 'bg-[#0F6E56] text-white border-[#0F6E56]'
                                  : 'bg-white text-gray-700 border-[#D8D6CC] hover:bg-gray-100'
                              }`}
                            >
                              ➡️ Dari Depan (Kanan)
                            </button>
                            <button
                              type="button"
                              onClick={() => onUpdateEdge({ ...incomingEdge, origin: 'back' })}
                              className={`py-1 px-1.5 rounded border text-[10px] font-semibold transition-colors ${
                                currentOrigin === 'back'
                                  ? 'bg-[#0F6E56] text-white border-[#0F6E56]'
                                  : 'bg-white text-gray-700 border-[#D8D6CC] hover:bg-gray-100'
                              }`}
                            >
                              ⬅️ Dari Belakang (Kiri)
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Pengaturan Titik Awal Garis ke Bawahan */}
          {(() => {
            const outgoing = page.edges.filter((e) => e.from === selectedCard.id);
            if (outgoing.length === 0) return null;
            return (
              <div className="p-2.5 bg-gray-50 rounded-lg border border-[#D8D6CC] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700 flex items-center gap-1.5 text-[11px]">
                    <MoveVertical className="w-3.5 h-3.5 text-[#0F6E56]" />
                    Titik Awal Garis ke Bawahan ({outgoing.length})
                  </span>
                  {outgoing.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const step = Math.min(16, 40 / (outgoing.length - 1));
                        const start = -((outgoing.length - 1) * step) / 2;
                        outgoing.forEach((eg, idx) => {
                          onUpdateEdge({ ...eg, sdy: Math.round(start + idx * step), sdx: 0 });
                        });
                      }}
                      className="text-[10px] text-[#0F6E56] hover:underline font-semibold"
                      title="Bagi jarak titik garis secara seimbang"
                    >
                      Ratakan Otomatis
                    </button>
                  )}
                </div>

                {/* Bulk front / back origin toggle for this card */}
                <div className="flex items-center justify-between py-1 px-1.5 bg-gray-100/70 rounded text-[10px] text-gray-600">
                  <span className="font-medium">Arah Muncul Garis:</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => outgoing.forEach((eg) => onUpdateEdge({ ...eg, origin: 'front' }))}
                      className="px-1.5 py-0.5 rounded border border-[#D8D6CC] bg-white text-gray-700 hover:bg-gray-50 font-medium"
                      title="Set semua garis muncul dari depan (kanan)"
                    >
                      Semua Depan
                    </button>
                    <button
                      type="button"
                      onClick={() => outgoing.forEach((eg) => onUpdateEdge({ ...eg, origin: 'back' }))}
                      className="px-1.5 py-0.5 rounded border border-[#D8D6CC] bg-white text-gray-700 hover:bg-gray-50 font-medium"
                      title="Set semua garis muncul dari belakang (kiri)"
                    >
                      Semua Belakang
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  {outgoing.map((eg, idx) => {
                    const childCard = page.cards.find((c) => c.id === eg.to);
                    const isFront = (eg.origin || page.edgeOrigin || 'front') === 'front';
                    return (
                      <div key={eg.id} className="flex items-center gap-1.5 bg-white p-1.5 rounded border border-[#D8D6CC] text-[11px]">
                        <span className="truncate flex-1 font-medium text-gray-700" title={childCard?.jab || `Bawahan ${idx + 1}`}>
                          {childCard?.jab || `Bawahan ${idx + 1}`}
                        </span>

                        {/* Front / Back Toggle Badge */}
                        <button
                          type="button"
                          onClick={() => onUpdateEdge({ ...eg, origin: isFront ? 'back' : 'front' })}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-colors shrink-0 ${
                            isFront
                              ? 'bg-emerald-50 text-[#0F6E56] border-emerald-300'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-300'
                          }`}
                          title={`Saat ini: ${isFront ? 'Dari Depan (Kanan)' : 'Dari Belakang (Kiri)'}. Klik untuk ganti.`}
                        >
                          {isFront ? 'Depan' : 'Belakang'}
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onUpdateEdge({ ...eg, sdy: (eg.sdy || 0) - 5 })}
                            className="w-5 h-5 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-100 font-mono text-xs"
                            title="Geser ke atas"
                          >
                            ▲
                          </button>
                          <span className="w-8 text-center font-mono text-[10px] font-bold text-gray-800">
                            {eg.sdy ? (eg.sdy > 0 ? `+${eg.sdy}` : eg.sdy) : '0'}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateEdge({ ...eg, sdy: (eg.sdy || 0) + 5 })}
                            className="w-5 h-5 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-100 font-mono text-xs"
                            title="Geser ke bawah"
                          >
                            ▼
                          </button>
                          {(eg.sdy || eg.sdx) ? (
                            <button
                              type="button"
                              onClick={() => onUpdateEdge({ ...eg, sdy: 0, sdx: 0 })}
                              className="text-[10px] text-gray-400 hover:text-gray-700 px-1"
                              title="Reset tengah"
                            >
                              ↺
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Pengaturan Garis Masuk dari Atasan (Arah Garis Diterima) */}
          {(() => {
            const incoming = page.edges.filter((e) => e.to === selectedCard.id);
            if (incoming.length === 0) return null;
            return (
              <div className="p-2.5 bg-gray-50 rounded-lg border border-[#D8D6CC] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700 flex items-center gap-1.5 text-[11px]">
                    <CornerDownRight className="w-3.5 h-3.5 text-[#0F6E56]" />
                    Arah Garis Masuk dari Atasan ({incoming.length})
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  {incoming.map((eg, idx) => {
                    const parentCard = page.cards.find((c) => c.id === eg.from);
                    const isSameLane = parentCard?.l === selectedCard.l;
                    const defaultEntry: EdgeEntry = isSameLane
                      ? ((eg.origin || page.edgeOrigin || 'front') === 'front' ? 'front' : 'back')
                      : ((parentCard?.l ?? 0) < selectedCard.l ? 'back' : 'front');
                    const currentEntry: EdgeEntry = eg.entry || page.edgeEntry || defaultEntry;
                    const isFront = currentEntry === 'front';

                    return (
                      <div key={eg.id} className="flex items-center justify-between gap-1.5 bg-white p-1.5 rounded border border-[#D8D6CC] text-[11px]">
                        <span className="truncate flex-1 font-medium text-gray-700" title={parentCard?.jab || `Atasan ${idx + 1}`}>
                          Dari: {parentCard?.jab || `Atasan ${idx + 1}`}
                        </span>

                        {/* Front / Back Toggle Badge */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => onUpdateEdge({ ...eg, entry: 'back' })}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                              !isFront
                                ? 'bg-[#0F6E56] text-white border-[#0F6E56]'
                                : 'bg-gray-50 text-gray-600 border-[#D8D6CC] hover:bg-gray-100'
                            }`}
                            title="Garis masuk dari belakang (kiri)"
                          >
                            ⬅️ Belakang
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateEdge({ ...eg, entry: 'front' })}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                              isFront
                                ? 'bg-[#0F6E56] text-white border-[#0F6E56]'
                                : 'bg-gray-50 text-gray-600 border-[#D8D6CC] hover:bg-gray-100'
                            }`}
                            title="Garis masuk dari depan (kanan)"
                          >
                            ➡️ Depan
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Template & Lock */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-1.5 text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={!!selectedCard.lock}
                onChange={(e) => onUpdateCard({ ...selectedCard, lock: e.target.checked })}
                className="rounded-sm text-[#0F6E56]"
              />
              <span>Kunci posisi</span>
            </label>
            <button
              onClick={() => {
                onSaveTemplate({
                  n: selectedCard.jab,
                  jab: selectedCard.jab,
                  names: [...selectedCard.names],
                  c: selectedCard.c,
                  st: selectedCard.st,
                  grade: selectedCard.grade,
                  shape: selectedCard.shape,
                  np: selectedCard.np,
                  cols: selectedCard.cols,
                  lv: selectedCard.lv,
                  tr: selectedCard.tr,
                  customLv: selectedCard.customLv,
                });
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              + Simpan Template
            </button>
          </div>
        </div>
      ) : selectedLane ? (
        /* 3. Lane Inspector */
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#D8D6CC]">
            <h3 className="font-bold text-sm text-gray-800">Pengaturan Swimlane</h3>
            <button
              onClick={() => onDeleteLane(selectedLane.id)}
              className="text-rose-600 hover:text-rose-700 flex items-center gap-1 font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus</span>
            </button>
          </div>

          <div>
            <label className="text-gray-500 font-medium block mb-1">Nama Lane</label>
            <input
              type="text"
              value={selectedLane.name}
              onChange={(e) => onUpdateLane({ ...selectedLane, name: e.target.value })}
              className="w-full p-2 border border-[#D8D6CC] rounded-md font-semibold text-gray-800 focus:outline-none focus:border-[#0F6E56]"
            />
          </div>

          <div>
            <label className="text-gray-500 font-medium block mb-1">Lebar Lane (pixel)</label>
            <input
              type="number"
              min={260}
              step={10}
              value={selectedLane.w}
              onChange={(e) => onUpdateLane({ ...selectedLane, w: Math.max(260, Number(e.target.value) || 320) })}
              className="w-full p-2 border border-[#D8D6CC] rounded-md focus:outline-none focus:border-[#0F6E56]"
            />
          </div>

          {/* Warna Swimlane */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-gray-700 font-semibold flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-[#0F6E56]" />
                <span>Warna Latar Swimlane</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  const targetCol = selectedLane.color || LANE_COLOR;
                  const updatedLanes = page.lanes.map((l) => ({ ...l, color: targetCol }));
                  onUpdatePage({ ...page, lanes: updatedLanes, hc: targetCol });
                }}
                className="text-[11px] text-[#0F6E56] hover:underline font-semibold"
                title="Terapkan warna ini ke semua swimlane di halaman ini"
              >
                Samakan Semua
              </button>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {LANE_COLOR_PRESETS.map((preset) => {
                const isSelected = (selectedLane.color || LANE_COLOR).toUpperCase() === preset.value.toUpperCase();
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => onUpdateLane({ ...selectedLane, color: preset.value })}
                    className={`flex items-center gap-1.5 p-1 rounded-md border text-[11px] transition-all text-left ${
                      isSelected
                        ? 'ring-2 ring-[#0F6E56] border-[#0F6E56] font-semibold bg-emerald-50/50'
                        : 'border-[#D8D6CC] hover:bg-gray-50 bg-white'
                    }`}
                    title={preset.name}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-sm border border-gray-400 shrink-0"
                      style={{ backgroundColor: preset.value }}
                    />
                    <span className="truncate">{preset.name.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Color Input */}
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={selectedLane.color || LANE_COLOR}
                onChange={(e) => onUpdateLane({ ...selectedLane, color: e.target.value })}
                className="w-8 h-8 rounded-md border border-[#D8D6CC] cursor-pointer p-0.5 bg-white shrink-0"
              />
              <input
                type="text"
                value={selectedLane.color || LANE_COLOR}
                onChange={(e) => onUpdateLane({ ...selectedLane, color: e.target.value })}
                placeholder="#E6E6E6"
                className="flex-1 p-1.5 border border-[#D8D6CC] rounded-md font-mono text-xs focus:outline-none focus:border-[#0F6E56]"
              />
              <button
                type="button"
                onClick={() => onUpdateLane({ ...selectedLane, color: LANE_COLOR })}
                className="px-2 py-1.5 border border-[#D8D6CC] rounded-md text-gray-600 hover:bg-gray-50 text-[11px] shrink-0"
                title="Kembalikan ke warna standar #E6E6E6"
              >
                Reset
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={!!selectedLane.lock}
              onChange={(e) => onUpdateLane({ ...selectedLane, lock: e.target.checked })}
              className="rounded-sm text-[#0F6E56]"
            />
            <span>Kunci lane (kartu di dalamnya tidak bisa digeser)</span>
          </label>

          <div className="pt-2 border-t border-[#D8D6CC] flex flex-col gap-2">
            <span className="text-gray-500 font-medium">Sisip & Urutan Lane</span>
            {(() => {
              const laneIndex = page.lanes.findIndex((l) => l.id === selectedLane.id);
              return (
                <>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => onInsertLane(laneIndex)}
                      className="p-1.5 border border-[#D8D6CC] rounded-md hover:bg-gray-50 text-gray-700"
                    >
                      + Sisip Kiri
                    </button>
                    <button
                      onClick={() => onInsertLane(laneIndex + 1)}
                      className="p-1.5 border border-[#D8D6CC] rounded-md hover:bg-gray-50 text-gray-700"
                    >
                      + Sisip Kanan
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      disabled={laneIndex <= 0}
                      onClick={() => onMoveLane(laneIndex, -1)}
                      className="p-1.5 border border-[#D8D6CC] rounded-md hover:bg-gray-50 text-gray-700 disabled:opacity-40"
                    >
                      ◀ Geser Kiri
                    </button>
                    <button
                      disabled={laneIndex >= page.lanes.length - 1}
                      onClick={() => onMoveLane(laneIndex, 1)}
                      className="p-1.5 border border-[#D8D6CC] rounded-md hover:bg-gray-50 text-gray-700 disabled:opacity-40"
                    >
                      Geser Kanan ▶
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      ) : selectedEdge ? (
        /* 4. Edge Inspector */
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#D8D6CC]">
            <h3 className="font-bold text-sm text-gray-800">Garis Penghubung</h3>
            <button
              onClick={() => onDeleteEdge(selectedEdge.id)}
              className="text-rose-600 hover:text-rose-700 flex items-center gap-1 font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus</span>
            </button>
          </div>

          {/* Connection info */}
          {(() => {
            const src = page.cards.find((c) => c.id === selectedEdge.from);
            const tgt = page.cards.find((c) => c.id === selectedEdge.to);
            return (
              <div className="p-2 bg-gray-50 rounded-md border border-[#D8D6CC] text-[11px] flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#0F6E56] shrink-0" />
                  <span className="truncate">Dari: <b>{src?.jab || 'Kartu Asal'}</b></span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-700 font-medium pl-3">
                  <span className="text-gray-400">↳</span>
                  <span className="truncate">Ke: <b>{tgt?.jab || 'Kartu Tujuan'}</b></span>
                </div>
              </div>
            );
          })()}

          {/* Pilihan Arah Garis Muncul: Depan vs Belakang */}
          <div className="p-2.5 bg-gray-50 rounded-lg border border-[#D8D6CC] flex flex-col gap-2">
            <label className="text-gray-700 font-semibold block text-[11px]">
              Arah Garis Muncul dari Kartu Asal
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => onUpdateEdge({ ...selectedEdge, origin: 'front' })}
                className={`py-2 px-2.5 rounded-md border text-xs font-semibold flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  (selectedEdge.origin || page.edgeOrigin || 'front') === 'front'
                    ? 'bg-[#0F6E56] text-white border-[#0F6E56] shadow-xs'
                    : 'bg-white text-gray-700 border-[#D8D6CC] hover:bg-gray-50'
                }`}
              >
                <span>➡️ Dari Depan</span>
                <span className={`text-[10px] ${
                  (selectedEdge.origin || page.edgeOrigin || 'front') === 'front' ? 'text-emerald-100' : 'text-gray-400'
                }`}>(Default / Kanan)</span>
              </button>
              <button
                type="button"
                onClick={() => onUpdateEdge({ ...selectedEdge, origin: 'back' })}
                className={`py-2 px-2.5 rounded-md border text-xs font-semibold flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  (selectedEdge.origin || page.edgeOrigin || 'front') === 'back'
                    ? 'bg-[#0F6E56] text-white border-[#0F6E56] shadow-xs'
                    : 'bg-white text-gray-700 border-[#D8D6CC] hover:bg-gray-50'
                }`}
              >
                <span>⬅️ Dari Belakang</span>
                <span className={`text-[10px] ${
                  (selectedEdge.origin || page.edgeOrigin || 'front') === 'back' ? 'text-emerald-100' : 'text-gray-400'
                }`}>(Kiri)</span>
              </button>
            </div>
          </div>

          {/* Pilihan Arah Garis Diterima: Belakang vs Depan */}
          {(() => {
            const src = page.cards.find((c) => c.id === selectedEdge.from);
            const tgt = page.cards.find((c) => c.id === selectedEdge.to);
            const isSameLane = src?.l === tgt?.l;
            const defaultEntry: EdgeEntry = isSameLane
              ? ((selectedEdge.origin || page.edgeOrigin || 'front') === 'front' ? 'front' : 'back')
              : ((src?.l ?? 0) < (tgt?.l ?? 0) ? 'back' : 'front');
            const currentEntry: EdgeEntry = selectedEdge.entry || page.edgeEntry || defaultEntry;

            return (
              <div className="p-2.5 bg-gray-50 rounded-lg border border-[#D8D6CC] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-gray-700 font-semibold block text-[11px]">
                    Arah Garis Diterima pada Kartu Tujuan
                  </label>
                  {selectedEdge.entry && (
                    <button
                      type="button"
                      onClick={() => {
                        const copy = { ...selectedEdge };
                        delete copy.entry;
                        onUpdateEdge(copy);
                      }}
                      className="text-[10px] text-gray-400 hover:text-gray-700 underline"
                      title="Kembalikan ke aturan otomatis"
                    >
                      Reset Otomatis
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onUpdateEdge({ ...selectedEdge, entry: 'back' })}
                    className={`py-2 px-2.5 rounded-md border text-xs font-semibold flex flex-col items-center justify-center gap-0.5 transition-colors ${
                      currentEntry === 'back'
                        ? 'bg-[#0F6E56] text-white border-[#0F6E56] shadow-xs'
                        : 'bg-white text-gray-700 border-[#D8D6CC] hover:bg-gray-50'
                    }`}
                  >
                    <span>⬅️ Dari Belakang</span>
                    <span className={`text-[10px] ${
                      currentEntry === 'back' ? 'text-emerald-100' : 'text-gray-400'
                    }`}>(Kiri / Standar)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateEdge({ ...selectedEdge, entry: 'front' })}
                    className={`py-2 px-2.5 rounded-md border text-xs font-semibold flex flex-col items-center justify-center gap-0.5 transition-colors ${
                      currentEntry === 'front'
                        ? 'bg-[#0F6E56] text-white border-[#0F6E56] shadow-xs'
                        : 'bg-white text-gray-700 border-[#D8D6CC] hover:bg-gray-50'
                    }`}
                  >
                    <span>➡️ Dari Depan</span>
                    <span className={`text-[10px] ${
                      currentEntry === 'front' ? 'text-emerald-100' : 'text-gray-400'
                    }`}>(Kanan)</span>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Geser Titik Awal Garis pada Kartu */}
          <div className="p-2.5 bg-emerald-50/50 rounded-lg border border-emerald-200/80 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <label className="text-emerald-900 font-semibold flex items-center gap-1.5">
                <MoveVertical className="w-3.5 h-3.5 text-[#0F6E56]" />
                <span>Titik Awal Garis (pada Kartu)</span>
              </label>
              {(selectedEdge.sdy || selectedEdge.sdx) ? (
                <button
                  type="button"
                  onClick={() => onUpdateEdge({ ...selectedEdge, sdy: 0, sdx: 0 })}
                  className="text-[11px] text-[#0F6E56] hover:underline font-semibold"
                >
                  Reset Tengah
                </button>
              ) : null}
            </div>

            {/* Geser Vertikal (Y) */}
            <div>
              <div className="flex justify-between items-center text-[11px] mb-1">
                <span className="text-gray-600 font-medium">Geser Vertikal (Y)</span>
                <span className="font-mono font-bold text-gray-800 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                  {(selectedEdge.sdy || 0) > 0 ? `+${selectedEdge.sdy} px` : `${selectedEdge.sdy || 0} px`}
                </span>
              </div>
              <input
                type="range"
                min={-50}
                max={50}
                step={2}
                value={selectedEdge.sdy || 0}
                onChange={(e) => onUpdateEdge({ ...selectedEdge, sdy: Number(e.target.value) })}
                className="w-full accent-[#0F6E56] cursor-pointer"
              />
              <div className="grid grid-cols-3 gap-1 mt-1.5">
                <button
                  type="button"
                  onClick={() => onUpdateEdge({ ...selectedEdge, sdy: -20 })}
                  className={`py-1 px-1.5 border rounded text-[10px] font-medium transition-colors ${
                    selectedEdge.sdy === -20
                      ? 'bg-[#0F6E56] text-white border-[#0F6E56]'
                      : 'border-[#D8D6CC] bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  ▲ Atas (-20)
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateEdge({ ...selectedEdge, sdy: 0 })}
                  className={`py-1 px-1.5 border rounded text-[10px] font-medium transition-colors ${
                    !selectedEdge.sdy
                      ? 'bg-[#0F6E56] text-white border-[#0F6E56]'
                      : 'border-[#D8D6CC] bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  ● Tengah (0)
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateEdge({ ...selectedEdge, sdy: 20 })}
                  className={`py-1 px-1.5 border rounded text-[10px] font-medium transition-colors ${
                    selectedEdge.sdy === 20
                      ? 'bg-[#0F6E56] text-white border-[#0F6E56]'
                      : 'border-[#D8D6CC] bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  ▼ Bawah (+20)
                </button>
              </div>
            </div>

            {/* Geser Horizontal (X) */}
            <div className="pt-2 border-t border-emerald-200/60">
              <div className="flex justify-between items-center text-[11px] mb-1">
                <span className="text-gray-600 font-medium">Geser Horizontal (X)</span>
                <span className="font-mono font-bold text-gray-800 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                  {(selectedEdge.sdx || 0) > 0 ? `+${selectedEdge.sdx} px` : `${selectedEdge.sdx || 0} px`}
                </span>
              </div>
              <input
                type="range"
                min={-40}
                max={40}
                step={2}
                value={selectedEdge.sdx || 0}
                onChange={(e) => onUpdateEdge({ ...selectedEdge, sdx: Number(e.target.value) })}
                className="w-full accent-[#0F6E56] cursor-pointer"
              />
            </div>

            <p className="text-[10px] text-emerald-800/80 leading-relaxed italic">
              💡 Tip: Anda juga dapat menyeret langsung titik biru di pangkal garis pada kartu di kanvas.
            </p>
          </div>

          <div>
            <label className="text-gray-500 font-medium block mb-1">Gaya Garis</label>
            <button
              onClick={() => onUpdateEdge({ ...selectedEdge, dash: !selectedEdge.dash })}
              className="w-full py-2 px-3 border border-[#D8D6CC] rounded-md hover:bg-gray-50 font-medium text-gray-700"
            >
              {selectedEdge.dash ? 'Jadikan Garis Solid' : 'Jadikan Garis Putus-putus'}
            </button>
          </div>
        </div>
      ) : selectedItem ? (
        /* 5. Annotation Item Inspector */
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#D8D6CC]">
            <h3 className="font-bold text-sm text-gray-800">
              {selectedItem.t === 'frame'
                ? 'Bingkai Pengelompok'
                : selectedItem.t === 'legend'
                ? 'Legenda'
                : 'Kotak Teks'}
            </h3>
            <button
              onClick={() => onDeleteItem(selectedItem.id)}
              className="text-rose-600 hover:text-rose-700 flex items-center gap-1 font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus</span>
            </button>
          </div>

          {/* 1. Pengaturan Khusus Legenda (Checklist Elemen yang Ditampilkan) */}
          {selectedItem.t === 'legend' && (
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-gray-500 font-medium block mb-1">Judul Legenda</label>
                <input
                  type="text"
                  value={selectedItem.text ?? 'Legenda Bagan'}
                  onChange={(e) => onUpdateItem({ ...selectedItem, text: e.target.value })}
                  placeholder="Legenda Bagan"
                  className="w-full p-2 border border-[#D8D6CC] rounded-md font-sans text-xs focus:outline-none focus:border-[#0F6E56]"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-xs text-gray-600 mb-1">
                  <span>Lebar Kotak Legenda:</span>
                  <span className="font-mono font-bold text-gray-800">{selectedItem.w || 400} px</span>
                </div>
                <input
                  type="range"
                  min={280}
                  max={600}
                  step={10}
                  value={selectedItem.w || 400}
                  onChange={(e) => onUpdateItem({ ...selectedItem, w: Number(e.target.value) })}
                  className="w-full accent-[#0F6E56] cursor-pointer"
                />
              </div>

              {/* Tab Switcher: Checklist vs Edit Bentuk & Nama */}
              <div className="flex border border-[#D8D6CC] bg-gray-100/70 p-0.5 rounded-lg gap-1">
                <button
                  type="button"
                  onClick={() => setLegendTab('checklist')}
                  className={`flex-1 py-1.5 px-2 rounded-md font-semibold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    legendTab === 'checklist'
                      ? 'bg-white text-[#0F6E56] shadow-xs border border-[#D8D6CC]'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span>Pilihan Elemen (Centang)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLegendTab('edit')}
                  className={`flex-1 py-1.5 px-2 rounded-md font-semibold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    legendTab === 'edit'
                      ? 'bg-white text-[#0F6E56] shadow-xs border border-[#D8D6CC]'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span>Edit Bentuk & Nama</span>
                </button>
              </div>

              {/* TAB 1: PILIHAN ELEMEN (CHECKLIST) */}
              {legendTab === 'checklist' && (
                <div className="p-2.5 bg-gray-50 rounded-lg border border-[#D8D6CC] flex flex-col gap-2.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-gray-200">
                    <span className="font-bold text-gray-800 text-xs">
                      Elemen yang Ditampilkan:
                    </span>
                  </div>

                  {/* Tombol Preset Cepat */}
                  <div className="flex flex-wrap gap-1 pb-1">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateItem({
                          ...selectedItem,
                          showTitle: true,
                          showStructuralLv: true,
                          showIcLv: true,
                          showCardShapes: true,
                          showShapeBox: true,
                          showShapePara: true,
                          showShapeDash: true,
                          showLineStyles: true,
                          showLineSolid: true,
                          showLineDash: true,
                          showPositionStatus: true,
                          showStatusTerisi: true,
                          showStatusKosong: true,
                          showStatusRekrut: true,
                          showHeadcountInfo: true,
                          showGradeInfo: true,
                          showCustomItems: true,
                        })
                      }
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-white border border-[#D8D6CC] hover:bg-gray-100 text-gray-700 cursor-pointer"
                    >
                      Centang Semua
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateItem({
                          ...selectedItem,
                          showTitle: true,
                          showStructuralLv: true,
                          showIcLv: true,
                          showCardShapes: true,
                          showShapeBox: true,
                          showShapePara: true,
                          showShapeDash: true,
                          showLineStyles: true,
                          showLineSolid: true,
                          showLineDash: true,
                          showPositionStatus: false,
                          showHeadcountInfo: false,
                          showGradeInfo: false,
                        })
                      }
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-white border border-[#D8D6CC] hover:bg-gray-100 text-gray-700 cursor-pointer"
                    >
                      Standar
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateItem({
                          ...selectedItem,
                          showTitle: true,
                          showStructuralLv: true,
                          showIcLv: false,
                          showCardShapes: true,
                          showShapeBox: true,
                          showShapePara: true,
                          showShapeDash: false,
                          showLineStyles: false,
                          showPositionStatus: false,
                          showHeadcountInfo: false,
                          showGradeInfo: false,
                        })
                      }
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-white border border-[#D8D6CC] hover:bg-gray-100 text-gray-700 cursor-pointer"
                    >
                      Ringkas
                    </button>
                  </div>

                  {/* Daftar Checkbox Terstruktur */}
                  <div className="flex flex-col gap-2 text-xs text-gray-700">
                    {/* Judul Legenda */}
                    <label className="flex items-start gap-2 p-1 rounded hover:bg-white cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedItem.showTitle ?? true}
                        onChange={(e) => onUpdateItem({ ...selectedItem, showTitle: e.target.checked })}
                        className="rounded-sm text-[#0F6E56] mt-0.5 cursor-pointer"
                      />
                      <div>
                        <span className="font-semibold block text-gray-800">Judul Legenda</span>
                        <span className="text-[10px] text-gray-400">Menampilkan teks judul pada baris atas kotak legenda</span>
                      </div>
                    </label>

                    {/* Jenjang Struktural */}
                    <label className="flex items-start gap-2 p-1 rounded hover:bg-white cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedItem.showStructuralLv ?? true}
                        onChange={(e) => onUpdateItem({ ...selectedItem, showStructuralLv: e.target.checked })}
                        className="rounded-sm text-[#0F6E56] mt-0.5 cursor-pointer"
                      />
                      <div>
                        <span className="font-semibold block text-gray-800">Jenjang Karier Struktural</span>
                        <span className="text-[10px] text-gray-400">Junior Staff → Staff → Supervisor → Manager → GM → Direktur</span>
                      </div>
                    </label>

                    {/* Jenjang IC */}
                    <label className="flex items-start gap-2 p-1 rounded hover:bg-white cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedItem.showIcLv ?? true}
                        onChange={(e) => onUpdateItem({ ...selectedItem, showIcLv: e.target.checked })}
                        className="rounded-sm text-[#0F6E56] mt-0.5 cursor-pointer"
                      />
                      <div>
                        <span className="font-semibold block text-gray-800">Jenjang Individual Contributor (IC)</span>
                        <span className="text-[10px] text-gray-400">IC → Jr. Specialist → Specialist → Sr. Specialist → Principal</span>
                      </div>
                    </label>

                    {/* Bentuk Kartu Jabatan & Sub-items */}
                    <div className="p-1.5 bg-white rounded border border-gray-200 flex flex-col gap-1.5">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedItem.showCardShapes ?? true}
                          onChange={(e) => onUpdateItem({ ...selectedItem, showCardShapes: e.target.checked })}
                          className="rounded-sm text-[#0F6E56] mt-0.5 cursor-pointer"
                        />
                        <div>
                          <span className="font-semibold block text-gray-800">Bentuk Kartu Jabatan</span>
                          <span className="text-[10px] text-gray-400">Grup penjelasan simbol bentuk kartu</span>
                        </div>
                      </label>
                      {(selectedItem.showCardShapes ?? true) && (
                        <div className="pl-6 pt-1 border-t border-gray-100 flex flex-col gap-1 text-[11px]">
                          <label className="flex items-center gap-2 cursor-pointer hover:text-gray-900">
                            <input
                              type="checkbox"
                              checked={selectedItem.showShapeBox ?? true}
                              onChange={(e) => onUpdateItem({ ...selectedItem, showShapeBox: e.target.checked })}
                              className="rounded-sm text-[#0F6E56] cursor-pointer"
                            />
                            <span>{selectedItem.shapeBoxLabel || 'Kotak: Struktural standar'}</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer hover:text-gray-900">
                            <input
                              type="checkbox"
                              checked={selectedItem.showShapePara ?? true}
                              onChange={(e) => onUpdateItem({ ...selectedItem, showShapePara: e.target.checked })}
                              className="rounded-sm text-[#0F6E56] cursor-pointer"
                            />
                            <span>{selectedItem.shapeParaLabel || 'Jajargenjang: Fungsional / Non-struktural'}</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer hover:text-gray-900">
                            <input
                              type="checkbox"
                              checked={selectedItem.showShapeDash ?? true}
                              onChange={(e) => onUpdateItem({ ...selectedItem, showShapeDash: e.target.checked })}
                              className="rounded-sm text-[#0F6E56] cursor-pointer"
                            />
                            <span>{selectedItem.shapeDashLabel || 'Garis Putus: Posisi di luar swimlane utama'}</span>
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Gaya Garis Penghubung & Sub-items */}
                    <div className="p-1.5 bg-white rounded border border-gray-200 flex flex-col gap-1.5">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedItem.showLineStyles ?? true}
                          onChange={(e) => onUpdateItem({ ...selectedItem, showLineStyles: e.target.checked })}
                          className="rounded-sm text-[#0F6E56] mt-0.5 cursor-pointer"
                        />
                        <div>
                          <span className="font-semibold block text-gray-800">Gaya Garis Penghubung</span>
                          <span className="text-[10px] text-gray-400">Grup keterangan garis komando & koordinasi</span>
                        </div>
                      </label>
                      {(selectedItem.showLineStyles ?? true) && (
                        <div className="pl-6 pt-1 border-t border-gray-100 flex flex-col gap-1 text-[11px]">
                          <label className="flex items-center gap-2 cursor-pointer hover:text-gray-900">
                            <input
                              type="checkbox"
                              checked={selectedItem.showLineSolid ?? true}
                              onChange={(e) => onUpdateItem({ ...selectedItem, showLineSolid: e.target.checked })}
                              className="rounded-sm text-[#0F6E56] cursor-pointer"
                            />
                            <span>{selectedItem.lineSolidLabel || 'Garis Solid: Jalur Komando / Hierarki Langsung'}</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer hover:text-gray-900">
                            <input
                              type="checkbox"
                              checked={selectedItem.showLineDash ?? true}
                              onChange={(e) => onUpdateItem({ ...selectedItem, showLineDash: e.target.checked })}
                              className="rounded-sm text-[#0F6E56] cursor-pointer"
                            />
                            <span>{selectedItem.lineDashLabel || 'Garis Putus: Jalur Koordinasi / Fungsional'}</span>
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Status Jabatan & Sub-items */}
                    <div className="p-1.5 bg-white rounded border border-gray-200 flex flex-col gap-1.5">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedItem.showPositionStatus ?? true}
                          onChange={(e) => onUpdateItem({ ...selectedItem, showPositionStatus: e.target.checked })}
                          className="rounded-sm text-[#0F6E56] mt-0.5 cursor-pointer"
                        />
                        <div>
                          <span className="font-semibold block text-gray-800">Status Jabatan</span>
                          <span className="text-[10px] text-gray-400">Bulatan indikator status jabatan</span>
                        </div>
                      </label>
                      {(selectedItem.showPositionStatus ?? true) && (
                        <div className="pl-6 pt-1 border-t border-gray-100 flex flex-wrap gap-3 text-[11px]">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedItem.showStatusTerisi ?? true}
                              onChange={(e) => onUpdateItem({ ...selectedItem, showStatusTerisi: e.target.checked })}
                              className="rounded-sm text-[#0F6E56] cursor-pointer"
                            />
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                            <span>{selectedItem.statusTerisiLabel || 'Terisi'}</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedItem.showStatusKosong ?? true}
                              onChange={(e) => onUpdateItem({ ...selectedItem, showStatusKosong: e.target.checked })}
                              className="rounded-sm text-[#0F6E56] cursor-pointer"
                            />
                            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                            <span>{selectedItem.statusKosongLabel || 'Kosong'}</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedItem.showStatusRekrut ?? true}
                              onChange={(e) => onUpdateItem({ ...selectedItem, showStatusRekrut: e.target.checked })}
                              className="rounded-sm text-[#0F6E56] cursor-pointer"
                            />
                            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                            <span>{selectedItem.statusRekrutLabel || 'Rekrutmen'}</span>
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Informasi Headcount */}
                    <label className="flex items-start gap-2 p-1 rounded hover:bg-white cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedItem.showHeadcountInfo ?? true}
                        onChange={(e) => onUpdateItem({ ...selectedItem, showHeadcountInfo: e.target.checked })}
                        className="rounded-sm text-[#0F6E56] mt-0.5 cursor-pointer"
                      />
                      <div>
                        <span className="font-semibold block text-gray-800">Informasi Total Headcount (HC)</span>
                        <span className="text-[10px] text-gray-400">Ringkasan total personel pada baris bawah swimlane</span>
                      </div>
                    </label>

                    {/* Grade Golongan */}
                    <label className="flex items-start gap-2 p-1 rounded hover:bg-white cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedItem.showGradeInfo ?? false}
                        onChange={(e) => onUpdateItem({ ...selectedItem, showGradeInfo: e.target.checked })}
                        className="rounded-sm text-[#0F6E56] mt-0.5 cursor-pointer"
                      />
                      <div>
                        <span className="font-semibold block text-gray-800">Keterangan Grade Golongan (G#)</span>
                        <span className="text-[10px] text-gray-400">Lencana penanda level grade kepegawaian</span>
                      </div>
                    </label>

                    {/* Item Kustom Tambahan */}
                    <label className="flex items-start gap-2 p-1 rounded hover:bg-white cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedItem.showCustomItems ?? true}
                        onChange={(e) => onUpdateItem({ ...selectedItem, showCustomItems: e.target.checked })}
                        className="rounded-sm text-[#0F6E56] mt-0.5 cursor-pointer"
                      />
                      <div>
                        <span className="font-semibold block text-gray-800">Item Tambahan Kustom</span>
                        <span className="text-[10px] text-gray-400">Menampilkan baris kustom yang dibuat pengguna</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 2: EDIT BENTUK & PENAMAAN (MANUAL) */}
              {legendTab === 'edit' && (
                <div className="p-2.5 bg-gray-50 rounded-lg border border-[#D8D6CC] flex flex-col gap-3 text-xs">
                  <div className="flex items-center justify-between pb-1 border-b border-gray-200">
                    <span className="font-bold text-gray-800">
                      Pengeditan Bentuk & Penamaan:
                    </span>
                  </div>

                  {/* 1. Judul Legenda */}
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">
                      Judul Legenda
                    </label>
                    <input
                      type="text"
                      value={selectedItem.text ?? 'Legenda Bagan'}
                      placeholder="mis. Legenda Bagan / Simbol Bagan"
                      onChange={(e) => onUpdateItem({ ...selectedItem, text: e.target.value })}
                      className="w-full p-2 border border-[#D8D6CC] rounded-md bg-white text-gray-800 text-xs focus:outline-none focus:border-[#0F6E56]"
                    />
                  </div>

                  {/* 2. Bentuk Kartu Jabatan (Bentuk & Penamaan) */}
                  <div className="p-2 bg-white rounded border border-gray-200 flex flex-col gap-2">
                    <span className="font-bold text-gray-800 text-[11px] pb-1 border-b border-gray-100">
                      Bentuk Kartu Jabatan:
                    </span>

                    {/* Item 1 */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] text-gray-500">
                        <span>Bentuk 1:</span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        <select
                          value={selectedItem.shapeBoxType || 'box'}
                          onChange={(e) =>
                            onUpdateItem({ ...selectedItem, shapeBoxType: e.target.value as LegendShapeType })
                          }
                          className="col-span-2 p-1.5 border border-[#D8D6CC] rounded bg-white text-[11px]"
                        >
                          {LEGEND_SHAPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={selectedItem.shapeBoxLabel ?? ''}
                          placeholder="Kotak: Struktural standar"
                          onChange={(e) => onUpdateItem({ ...selectedItem, shapeBoxLabel: e.target.value })}
                          className="col-span-3 p-1.5 border border-[#D8D6CC] rounded text-[11px]"
                        />
                      </div>
                    </div>

                    {/* Item 2 */}
                    <div className="space-y-1 pt-1 border-t border-gray-100">
                      <div className="flex justify-between items-center text-[10px] text-gray-500">
                        <span>Bentuk 2:</span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        <select
                          value={selectedItem.shapeParaType || 'para'}
                          onChange={(e) =>
                            onUpdateItem({ ...selectedItem, shapeParaType: e.target.value as LegendShapeType })
                          }
                          className="col-span-2 p-1.5 border border-[#D8D6CC] rounded bg-white text-[11px]"
                        >
                          {LEGEND_SHAPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={selectedItem.shapeParaLabel ?? ''}
                          placeholder="Jajargenjang: Fungsional / Non-struktural"
                          onChange={(e) => onUpdateItem({ ...selectedItem, shapeParaLabel: e.target.value })}
                          className="col-span-3 p-1.5 border border-[#D8D6CC] rounded text-[11px]"
                        />
                      </div>
                    </div>

                    {/* Item 3 */}
                    <div className="space-y-1 pt-1 border-t border-gray-100">
                      <div className="flex justify-between items-center text-[10px] text-gray-500">
                        <span>Bentuk 3:</span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        <select
                          value={selectedItem.shapeDashType || 'box-dash'}
                          onChange={(e) =>
                            onUpdateItem({ ...selectedItem, shapeDashType: e.target.value as LegendShapeType })
                          }
                          className="col-span-2 p-1.5 border border-[#D8D6CC] rounded bg-white text-[11px]"
                        >
                          {LEGEND_SHAPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={selectedItem.shapeDashLabel ?? ''}
                          placeholder="Garis Putus: Posisi di luar swimlane utama"
                          onChange={(e) => onUpdateItem({ ...selectedItem, shapeDashLabel: e.target.value })}
                          className="col-span-3 p-1.5 border border-[#D8D6CC] rounded text-[11px]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. Gaya Garis Penghubung (Bentuk & Penamaan) */}
                  <div className="p-2 bg-white rounded border border-gray-200 flex flex-col gap-2">
                    <span className="font-bold text-gray-800 text-[11px] pb-1 border-b border-gray-100">
                      Garis Penghubung:
                    </span>

                    {/* Garis 1 */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] text-gray-500">
                        <span>Garis 1:</span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        <select
                          value={selectedItem.lineSolidType || 'line-solid'}
                          onChange={(e) =>
                            onUpdateItem({ ...selectedItem, lineSolidType: e.target.value as LegendShapeType })
                          }
                          className="col-span-2 p-1.5 border border-[#D8D6CC] rounded bg-white text-[11px]"
                        >
                          {LEGEND_SHAPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={selectedItem.lineSolidLabel ?? ''}
                          placeholder="Garis Solid: Jalur Komando / Hierarki Langsung"
                          onChange={(e) => onUpdateItem({ ...selectedItem, lineSolidLabel: e.target.value })}
                          className="col-span-3 p-1.5 border border-[#D8D6CC] rounded text-[11px]"
                        />
                      </div>
                    </div>

                    {/* Garis 2 */}
                    <div className="space-y-1 pt-1 border-t border-gray-100">
                      <div className="flex justify-between items-center text-[10px] text-gray-500">
                        <span>Garis 2:</span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        <select
                          value={selectedItem.lineDashType || 'line-dash'}
                          onChange={(e) =>
                            onUpdateItem({ ...selectedItem, lineDashType: e.target.value as LegendShapeType })
                          }
                          className="col-span-2 p-1.5 border border-[#D8D6CC] rounded bg-white text-[11px]"
                        >
                          {LEGEND_SHAPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={selectedItem.lineDashLabel ?? ''}
                          placeholder="Garis Putus: Jalur Koordinasi / Fungsional"
                          onChange={(e) => onUpdateItem({ ...selectedItem, lineDashLabel: e.target.value })}
                          className="col-span-3 p-1.5 border border-[#D8D6CC] rounded text-[11px]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 4. Status Jabatan (Penamaan) */}
                  <div className="p-2 bg-white rounded border border-gray-200 flex flex-col gap-2">
                    <span className="font-bold text-gray-800 text-[11px] pb-1 border-b border-gray-100">
                      Penamaan Status Jabatan:
                    </span>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                        <input
                          type="text"
                          value={selectedItem.statusTerisiLabel ?? ''}
                          placeholder="Terisi"
                          onChange={(e) => onUpdateItem({ ...selectedItem, statusTerisiLabel: e.target.value })}
                          className="flex-1 p-1.5 border border-[#D8D6CC] rounded text-[11px]"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                        <input
                          type="text"
                          value={selectedItem.statusKosongLabel ?? ''}
                          placeholder="Kosong"
                          onChange={(e) => onUpdateItem({ ...selectedItem, statusKosongLabel: e.target.value })}
                          className="flex-1 p-1.5 border border-[#D8D6CC] rounded text-[11px]"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                        <input
                          type="text"
                          value={selectedItem.statusRekrutLabel ?? ''}
                          placeholder="Rekrutmen"
                          onChange={(e) => onUpdateItem({ ...selectedItem, statusRekrutLabel: e.target.value })}
                          className="flex-1 p-1.5 border border-[#D8D6CC] rounded text-[11px]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 5. Teks Jenjang Karier */}
                  <div className="p-2 bg-white rounded border border-gray-200 flex flex-col gap-2">
                    <span className="font-bold text-gray-800 text-[11px] pb-1 border-b border-gray-100">
                      Teks Jenjang Karier:
                    </span>
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-0.5">Teks Struktural:</label>
                      <input
                        type="text"
                        value={selectedItem.structuralText ?? ''}
                        placeholder="• Struktural: Jr. Staff → Staff → Supervisor → Manager → GM → Direktur"
                        onChange={(e) => onUpdateItem({ ...selectedItem, structuralText: e.target.value })}
                        className="w-full p-1.5 border border-[#D8D6CC] rounded text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-0.5">Teks Individual Contributor (IC):</label>
                      <input
                        type="text"
                        value={selectedItem.icText ?? ''}
                        placeholder="• Individual Contributor (IC): IC → Specialist → Sr. Spec. → Principal"
                        onChange={(e) => onUpdateItem({ ...selectedItem, icText: e.target.value })}
                        className="w-full p-1.5 border border-[#D8D6CC] rounded text-[11px]"
                      />
                    </div>
                  </div>

                  {/* 6. Penamaan Headcount & Grade */}
                  <div className="p-2 bg-white rounded border border-gray-200 flex flex-col gap-2">
                    <span className="font-bold text-gray-800 text-[11px] pb-1 border-b border-gray-100">
                      Penamaan Lainnya:
                    </span>
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-0.5">Keterangan Headcount (HC):</label>
                      <input
                        type="text"
                        value={selectedItem.hcLabel ?? ''}
                        placeholder="Total Headcount (Pegawai) pada baris bawah swimlane"
                        onChange={(e) => onUpdateItem({ ...selectedItem, hcLabel: e.target.value })}
                        className="w-full p-1.5 border border-[#D8D6CC] rounded text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-0.5">Keterangan Grade (G#):</label>
                      <input
                        type="text"
                        value={selectedItem.gradeLabel ?? ''}
                        placeholder="Lencana Grade Golongan Jabatan"
                        onChange={(e) => onUpdateItem({ ...selectedItem, gradeLabel: e.target.value })}
                        className="w-full p-1.5 border border-[#D8D6CC] rounded text-[11px]"
                      />
                    </div>
                  </div>

                  {/* 7. Baris Legenda Tambahan (Custom Rows) */}
                  <div className="p-2 bg-white rounded border border-gray-200 flex flex-col gap-2">
                    <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                      <span className="font-bold text-gray-800 text-[11px]">
                        Item Kustom Tambahan:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const newRow: LegendCustomRow = {
                            id: uid(),
                            shape: 'box',
                            label: 'Item Kustom Baru',
                            visible: true,
                          };
                          const rows = [...(selectedItem.customRows || []), newRow];
                          onUpdateItem({ ...selectedItem, customRows: rows, showCustomItems: true });
                        }}
                        className="flex items-center gap-1 text-[10px] font-semibold text-[#0F6E56] hover:underline cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Tambah Item</span>
                      </button>
                    </div>

                    {(selectedItem.customRows || []).length === 0 ? (
                      <p className="text-[10px] text-gray-400 italic">
                        Belum ada item kustom. Klik Tambah Item untuk membuat simbol/keterangan baru.
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {(selectedItem.customRows || []).map((row, idx) => (
                          <div key={row.id} className="flex items-center gap-1.5 p-1 bg-gray-50 rounded border border-gray-100">
                            <select
                              value={row.shape}
                              onChange={(e) => {
                                const nextRows = [...(selectedItem.customRows || [])];
                                nextRows[idx] = { ...row, shape: e.target.value as LegendShapeType };
                                onUpdateItem({ ...selectedItem, customRows: nextRows });
                              }}
                              className="w-32 p-1 border border-[#D8D6CC] rounded bg-white text-[10px]"
                            >
                              {LEGEND_SHAPE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={row.label}
                              onChange={(e) => {
                                const nextRows = [...(selectedItem.customRows || [])];
                                nextRows[idx] = { ...row, label: e.target.value };
                                onUpdateItem({ ...selectedItem, customRows: nextRows });
                              }}
                              placeholder="Keterangan item…"
                              className="flex-1 p-1 border border-[#D8D6CC] rounded bg-white text-[10px]"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const nextRows = (selectedItem.customRows || []).filter((r) => r.id !== row.id);
                                onUpdateItem({ ...selectedItem, customRows: nextRows });
                              }}
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer"
                              title="Hapus baris kustom ini"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 8. Reset Penamaan & Bentuk */}
                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateItem({
                          ...selectedItem,
                          text: 'Legenda Bagan',
                          structuralText: undefined,
                          icText: undefined,
                          shapeBoxType: 'box',
                          shapeBoxLabel: undefined,
                          shapeParaType: 'para',
                          shapeParaLabel: undefined,
                          shapeDashType: 'box-dash',
                          shapeDashLabel: undefined,
                          lineSolidType: 'line-solid',
                          lineSolidLabel: undefined,
                          lineDashType: 'line-dash',
                          lineDashLabel: undefined,
                          statusTerisiLabel: undefined,
                          statusKosongLabel: undefined,
                          statusRekrutLabel: undefined,
                          hcLabel: undefined,
                          gradeLabel: undefined,
                        })
                      }
                      className="px-2.5 py-1 text-[11px] font-medium text-gray-600 bg-white border border-[#D8D6CC] rounded hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      Reset Bentuk & Nama ke Standar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. Pengaturan untuk Frame & Kotak Teks */}
          {selectedItem.t !== 'legend' && (
            <div>
              <label className="text-gray-500 font-medium block mb-1">
                {selectedItem.t === 'frame' ? 'Nama Divisi / Kelompok' : 'Isi Teks'}
              </label>
              <textarea
                rows={3}
                value={selectedItem.text || ''}
                onChange={(e) => onUpdateItem({ ...selectedItem, text: e.target.value })}
                className="w-full p-2 border border-[#D8D6CC] rounded-md font-sans text-xs focus:outline-none focus:border-[#0F6E56]"
              />
            </div>
          )}

          {selectedItem.t === 'text' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-gray-500 font-medium block mb-1">Ukuran Huruf</label>
                <select
                  value={selectedItem.fs || 12}
                  onChange={(e) => onUpdateItem({ ...selectedItem, fs: Number(e.target.value) })}
                  className="w-full p-2 border border-[#D8D6CC] rounded-md bg-white text-gray-700"
                >
                  <option value={11}>11 px</option>
                  <option value={12}>12 px</option>
                  <option value={14}>14 px</option>
                  <option value={18}>18 px</option>
                  <option value={24}>24 px</option>
                </select>
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!selectedItem.b}
                    onChange={(e) => onUpdateItem({ ...selectedItem, b: e.target.checked })}
                    className="rounded-sm text-[#0F6E56]"
                  />
                  <span>Tebal (Bold)</span>
                </label>
              </div>
            </div>
          )}

          {selectedItem.t !== 'legend' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-gray-500 font-medium block mb-1">Lebar (px)</label>
                <input
                  type="number"
                  step={10}
                  value={selectedItem.w || 200}
                  onChange={(e) => onUpdateItem({ ...selectedItem, w: Math.max(60, Number(e.target.value)) })}
                  className="w-full p-2 border border-[#D8D6CC] rounded-md"
                />
              </div>
              {selectedItem.t === 'frame' && (
                <div>
                  <label className="text-gray-500 font-medium block mb-1">Tinggi (px)</label>
                  <input
                    type="number"
                    step={10}
                    value={selectedItem.h || 160}
                    onChange={(e) => onUpdateItem({ ...selectedItem, h: Math.max(40, Number(e.target.value)) })}
                    className="w-full p-2 border border-[#D8D6CC] rounded-md"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* 6. Page & Global Settings */
        <div className="flex flex-col gap-4">
          <div className="pb-2 border-b border-[#D8D6CC]">
            <h3 className="font-bold text-sm text-gray-800">Pengaturan Bagan & Halaman</h3>
            <p className="text-[11px] text-gray-400">Pilih kartu atau lane untuk mengedit detailnya.</p>
          </div>

          {/* Page Name & Title */}
          <div>
            <label className="text-gray-500 font-medium block mb-1">Nama Halaman</label>
            <input
              type="text"
              value={page.name}
              onChange={(e) => onUpdatePage({ ...page, name: e.target.value })}
              className="w-full p-2 border border-[#D8D6CC] rounded-md focus:outline-none focus:border-[#0F6E56]"
            />
          </div>

          <div>
            <label className="text-gray-500 font-medium block mb-1">Judul Bagan (Header Ekspor)</label>
            <input
              type="text"
              value={page.title || ''}
              onChange={(e) => onUpdatePage({ ...page, title: e.target.value })}
              placeholder="mis. Struktur Organisasi Group Business Services"
              className="w-full p-2 border border-[#D8D6CC] rounded-md focus:outline-none focus:border-[#0F6E56]"
            />
          </div>

          {/* Style Controls Accordion */}
          <details className="border border-[#D8D6CC] rounded-lg p-2.5 bg-gray-50/50" open>
            <summary className="font-semibold text-gray-700 cursor-pointer select-none">
              Tampilan Garis & Font
            </summary>
            <div className="flex flex-col gap-2.5 pt-2">
              <div>
                <label className="text-gray-500 font-medium block mb-1">Gaya Jalur Koneksi</label>
                <select
                  value={page.ls || 'elbow'}
                  onChange={(e) => onUpdatePage({ ...page, ls: e.target.value as Page['ls'] })}
                  className="w-full p-2 border border-[#D8D6CC] rounded-md bg-white text-gray-700"
                >
                  <option value="elbow">Siku (Orthogonal)</option>
                  <option value="straight">Lurus (Direct)</option>
                  <option value="curve">Melengkung (Curved)</option>
                </select>
              </div>

              <div>
                <label className="text-gray-500 font-medium block mb-1">Titik Cabang Hierarki</label>
                <select
                  value={page.br || 'parent'}
                  onChange={(e) => onUpdatePage({ ...page, br: e.target.value as Page['br'] })}
                  className="w-full p-2 border border-[#D8D6CC] rounded-md bg-white text-gray-700"
                >
                  <option value="parent">Di lane atasan</option>
                  <option value="child">Di lane bawahan</option>
                </select>
              </div>

              {/* Arah Garis Muncul Default */}
              <div>
                <label className="text-gray-500 font-medium block mb-1">Arah Garis Muncul Default</label>
                <select
                  value={page.edgeOrigin || 'front'}
                  onChange={(e) => onUpdatePage({ ...page, edgeOrigin: e.target.value as EdgeOrigin })}
                  className="w-full p-2 border border-[#D8D6CC] rounded-md bg-white text-gray-700 text-xs"
                >
                  <option value="front">Dari Depan (Kanan) — Default</option>
                  <option value="back">Dari Belakang (Kiri)</option>
                </select>
              </div>

              {/* Arah Garis Diterima Default */}
              <div>
                <label className="text-gray-500 font-medium block mb-1">Arah Garis Diterima Default</label>
                <select
                  value={page.edgeEntry || 'back'}
                  onChange={(e) => onUpdatePage({ ...page, edgeEntry: e.target.value as EdgeEntry })}
                  className="w-full p-2 border border-[#D8D6CC] rounded-md bg-white text-gray-700 text-xs"
                >
                  <option value="back">Dari Belakang (Kiri) — Standar</option>
                  <option value="front">Dari Depan (Kanan)</option>
                </select>
              </div>

              <label className="flex items-center gap-2 text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!page.arrow}
                  onChange={(e) => onUpdatePage({ ...page, arrow: e.target.checked })}
                  className="rounded-sm text-[#0F6E56]"
                />
                <span>Panah penunjuk di ujung garis</span>
              </label>

              <label className="flex items-center gap-2 text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!page.grid}
                  onChange={(e) => onUpdatePage({ ...page, grid: e.target.checked })}
                  className="rounded-sm text-[#0F6E56]"
                />
                <span>Tampilkan grid bantuan kanvas</span>
              </label>

              <label className="flex items-center gap-2 text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={page.showHc ?? true}
                  onChange={(e) => onUpdatePage({ ...page, showHc: e.target.checked })}
                  className="rounded-sm text-[#0F6E56]"
                />
                <span>Tampilkan garis Headcount (HC) di bawah swimlane</span>
              </label>

              {/* Warna Semua Swimlane */}
              <div className="pt-2 border-t border-[#D8D6CC]">
                <label className="text-gray-600 font-medium block mb-1.5 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-[#0F6E56]" />
                  <span>Ubah Warna Semua Swimlane</span>
                </label>
                <div className="grid grid-cols-4 gap-1 mb-2">
                  {LANE_COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => {
                        const updatedLanes = page.lanes.map((l) => ({ ...l, color: preset.value }));
                        onUpdatePage({ ...page, lanes: updatedLanes, hc: preset.value });
                      }}
                      className="flex items-center gap-1 p-1 rounded-sm border border-[#D8D6CC] hover:bg-gray-100 text-[10px] bg-white truncate"
                      title={preset.name}
                    >
                      <span
                        className="w-3 h-3 rounded-xs border border-gray-400 shrink-0"
                        style={{ backgroundColor: preset.value }}
                      />
                      <span className="truncate">{preset.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pembuatan Garis Hierarki */}
              <div className="pt-2 border-t border-[#D8D6CC]">
                <label className="text-gray-600 font-medium block mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#0F6E56]" />
                  <span>Garis Penghubung Hierarki</span>
                </label>
                <div className="flex flex-col gap-1.5">
                  <div className="flex gap-1.5">
                    {onAutoConnectAll && (
                      <button
                        type="button"
                        onClick={onAutoConnectAll}
                        className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-[#0F6E56] border border-emerald-300 rounded text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                        title="Buat garis otomatis berdasarkan susunan lane dan posisi kartu"
                      >
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        <span>✨ Hubungkan Otomatis</span>
                      </button>
                    )}
                    {onStartManualConnect && (
                      <button
                        type="button"
                        onClick={() => onStartManualConnect()}
                        className="py-1.5 px-2 bg-white hover:bg-gray-100 text-gray-700 border border-[#D8D6CC] rounded text-[11px] font-medium flex items-center gap-1 transition-colors"
                        title="Masuk ke mode hubungkan garis manual"
                      >
                        <CornerDownRight className="w-3 h-3 text-gray-500" />
                        <span>Manual</span>
                      </button>
                    )}
                  </div>
                  {onClearAllEdges && (page.edges?.length || 0) > 0 && (
                    <button
                      type="button"
                      onClick={onClearAllEdges}
                      className="py-1 px-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded text-[10px] transition-colors"
                    >
                      Hapus Semua Garis ({page.edges?.length || 0})
                    </button>
                  )}
                </div>
              </div>
            </div>
          </details>

          {/* Structure Validation Accordion */}
          <details className="border border-[#D8D6CC] rounded-lg p-2.5 bg-gray-50/50">
            <summary className="font-semibold text-gray-700 cursor-pointer select-none">
              Validasi Struktur Organisasi
            </summary>
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={runValidation}
                className="py-1.5 px-3 bg-white border border-[#D8D6CC] rounded-md hover:bg-gray-100 font-medium flex items-center justify-center gap-1.5 text-gray-700"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cek Validasi Sekarang</span>
              </button>

              {validationResults && (
                <div className="flex flex-col gap-1 mt-1">
                  {validationResults.length === 0 ? (
                    <div className="text-emerald-700 flex items-center gap-1 py-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Semua posisi dan garis hierarki valid!</span>
                    </div>
                  ) : (
                    validationResults.map((msg, idx) => (
                      <div key={idx} className="text-amber-700 bg-amber-50 p-1.5 rounded-sm flex items-start gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{msg}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </details>

          {/* Card Templates Accordion */}
          <details className="border border-[#D8D6CC] rounded-lg p-2.5 bg-gray-50/50">
            <summary className="font-semibold text-gray-700 cursor-pointer select-none">
              Template Kartu Siap Pakai
            </summary>
            <div className="pt-2 flex flex-col gap-1.5">
              {[...BUILT_IN_TEMPLATES, ...(project.tpl || [])].map((t, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <button
                    onClick={() => onApplyTemplate(t)}
                    className="flex-1 text-left p-1.5 border border-[#D8D6CC] rounded-md bg-white hover:bg-gray-50 truncate font-medium text-gray-700"
                  >
                    + {t.n}
                  </button>
                  {idx >= BUILT_IN_TEMPLATES.length && (
                    <button
                      onClick={() => onDeleteCustomTemplate(idx - BUILT_IN_TEMPLATES.length)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 rounded-sm"
                      title="Hapus template kustom"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </details>

          {/* Bulk Photo Upload Accordion */}
          <details className="border border-[#D8D6CC] rounded-lg p-2.5 bg-gray-50/50">
            <summary className="font-semibold text-gray-700 cursor-pointer select-none">
              Unggah Foto Massal
            </summary>
            <div className="pt-2 flex flex-col gap-2">
              <label className="py-2 px-3 border border-dashed border-gray-400 rounded-md text-center cursor-pointer hover:bg-gray-100 flex flex-col items-center gap-1">
                <Upload className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-gray-700">Pilih Banyak Foto Sekaligus</span>
                <span className="text-[10px] text-gray-400">
                  Nama file dicocokkan otomatis dengan nama pemegang jabatan (mis. Budi Santoso.jpg)
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length) {
                      onBulkPhotoUpload(files);
                      e.target.value = '';
                    }
                  }}
                />
              </label>
            </div>
          </details>

          {/* Version Snapshots Accordion */}
          <details className="border border-[#D8D6CC] rounded-lg p-2.5 bg-gray-50/50">
            <summary className="font-semibold text-gray-700 cursor-pointer select-none">
              Riwayat Versi Bagan
            </summary>
            <div className="pt-2 flex flex-col gap-2">
              <div className="flex gap-1">
                <input
                  type="text"
                  placeholder="Nama versi, mis. Revisi Nov 2026"
                  value={snapshotName}
                  onChange={(e) => setSnapshotName(e.target.value)}
                  className="flex-1 p-1.5 border border-[#D8D6CC] rounded-md text-xs focus:outline-none focus:border-[#0F6E56]"
                />
                <button
                  onClick={() => {
                    if (snapshotName.trim()) {
                      onSaveSnapshot(snapshotName.trim());
                      setSnapshotName('');
                    }
                  }}
                  className="px-2.5 py-1.5 bg-[#0F6E56] text-white rounded-md font-medium text-xs hover:bg-[#0c5945]"
                >
                  Simpan
                </button>
              </div>

              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto mt-1">
                {versionSnapshots.map((snap, idx) => (
                  <div
                    key={idx}
                    className="p-1.5 border border-[#D8D6CC] rounded-md bg-white flex items-center justify-between gap-1"
                  >
                    <div className="truncate">
                      <div className="font-medium text-gray-800 truncate">{snap.name}</div>
                      <div className="text-[10px] text-gray-400">
                        {new Date(snap.t).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onRestoreSnapshot(snap)}
                        className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-sm text-[11px] font-medium text-gray-700"
                      >
                        Pulihkan
                      </button>
                      <button
                        onClick={() => onDeleteSnapshot(idx)}
                        className="p-1 text-rose-500 hover:text-rose-700 rounded-sm"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </details>
        </div>
      )}
    </aside>
  );
};
