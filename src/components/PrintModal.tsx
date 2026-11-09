/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Download, FileDown, FileText, Loader2, Printer, X } from 'lucide-react';
import { Page } from '../types';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  pages: Page[];
  currentPageIndex: number;
  defaultPaper?: string;
  defaultOrient?: 'landscape' | 'portrait';
  compact?: boolean;
  onPrint: (
    selectedPages: Page[],
    paper: string,
    orient: 'landscape' | 'portrait',
    compact?: boolean
  ) => void;
  onDownloadPDF?: (
    selectedPages: Page[],
    paper: string,
    orient: 'landscape' | 'portrait',
    compact?: boolean
  ) => Promise<void> | void;
}

export const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  pages,
  currentPageIndex,
  defaultPaper = 'A3',
  defaultOrient = 'landscape',
  compact: initialCompact = false,
  onPrint,
  onDownloadPDF,
}) => {
  // Page selection mode: 'current' | 'all' | 'custom'
  const [mode, setMode] = useState<'current' | 'all' | 'custom'>('current');
  const [isProcessing, setIsProcessing] = useState(false);
  // Selected page IDs for custom mode
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(
    new Set([pages[currentPageIndex]?.id || pages[0]?.id])
  );
  // Paper size
  const [paper, setPaper] = useState<string>(defaultPaper || 'A3');
  // Orientation
  const [orient, setOrient] = useState<'landscape' | 'portrait'>(defaultOrient || 'landscape');
  // Compact toggle
  const [compact, setCompact] = useState<boolean>(initialCompact);

  if (!isOpen) return null;

  const currentPage = pages[currentPageIndex] || pages[0];

  const handleTogglePage = (id: string) => {
    setSelectedPageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedPageIds(new Set(pages.map((p) => p.id)));
  };

  const handleSelectCurrentOnly = () => {
    setSelectedPageIds(new Set([currentPage.id]));
  };

  const getPagesToPrint = (): Page[] => {
    if (mode === 'current') {
      return [currentPage];
    }
    if (mode === 'all') {
      return pages;
    }
    return pages.filter((p) => selectedPageIds.has(p.id));
  };

  const pagesToPrint = getPagesToPrint();

  const handleDownloadPDF = async () => {
    if (pagesToPrint.length === 0) return;
    setIsProcessing(true);
    try {
      if (onDownloadPDF) {
        await onDownloadPDF(pagesToPrint, paper, orient, compact);
      }
      onClose();
    } catch (err) {
      console.error('Download PDF error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecutePrint = () => {
    onPrint(pagesToPrint, paper, orient, compact);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-[#D8D6CC] w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#D8D6CC] flex items-center justify-between bg-[#F8F7F2]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#0F6E56] flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-800">Cetak / Simpan PDF</h3>
              <p className="text-[11px] text-gray-500">
                Pilih halaman dan format kertas untuk mencetak atau simpan ke PDF
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-gray-700">
          {/* 1. Page Selection Mode */}
          <div>
            <label className="font-bold text-gray-800 block mb-2">
              1. Pilih Halaman yang Dicetak
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMode('current')}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  mode === 'current'
                    ? 'border-[#0F6E56] bg-emerald-50/70 text-[#0F6E56] ring-1 ring-[#0F6E56]'
                    : 'border-[#D8D6CC] bg-white hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="font-semibold mb-0.5">Halaman Ini</div>
                <div className="text-[10px] text-gray-500 truncate" title={currentPage.name}>
                  {currentPage.name}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('all')}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  mode === 'all'
                    ? 'border-[#0F6E56] bg-emerald-50/70 text-[#0F6E56] ring-1 ring-[#0F6E56]'
                    : 'border-[#D8D6CC] bg-white hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="font-semibold mb-0.5">Semua Halaman</div>
                <div className="text-[10px] text-gray-500">
                  Total {pages.length} halaman
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('custom')}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  mode === 'custom'
                    ? 'border-[#0F6E56] bg-emerald-50/70 text-[#0F6E56] ring-1 ring-[#0F6E56]'
                    : 'border-[#D8D6CC] bg-white hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="font-semibold mb-0.5">Pilih Kustom</div>
                <div className="text-[10px] text-gray-500">
                  Pilih dari daftar
                </div>
              </button>
            </div>

            {/* Custom Mode Checklist */}
            {mode === 'custom' && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-[#D8D6CC] space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                  <span className="font-semibold text-gray-700 text-[11px]">
                    Daftar Halaman ({selectedPageIds.size} dipilih):
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-white border border-[#D8D6CC] hover:bg-gray-100 text-gray-700"
                    >
                      Pilih Semua
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectCurrentOnly}
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-white border border-[#D8D6CC] hover:bg-gray-100 text-gray-700"
                    >
                      Halaman Ini Saja
                    </button>
                  </div>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                  {pages.map((p, idx) => {
                    const isChecked = selectedPageIds.has(p.id);
                    const isCurrent = idx === currentPageIndex;

                    return (
                      <label
                        key={p.id}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                          isChecked ? 'bg-white border border-emerald-200 shadow-2xs' : 'hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleTogglePage(p.id)}
                            className="rounded text-[#0F6E56] focus:ring-[#0F6E56]"
                          />
                          <span className="font-medium text-gray-800 truncate">
                            {idx + 1}. {p.name}
                          </span>
                          {isCurrent && (
                            <span className="text-[9px] px-1.5 py-0.2 bg-emerald-100 text-[#0F6E56] rounded-full font-semibold">
                              Aktif
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {p.cards?.length || 0} kartu · {p.lanes?.length || 0} lane
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 2. Paper & Layout Settings */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#D8D6CC]">
            {/* Paper Size */}
            <div>
              <label className="font-bold text-gray-800 block mb-1">
                2. Ukuran Kertas
              </label>
              <select
                value={paper}
                onChange={(e) => setPaper(e.target.value)}
                className="w-full p-2 border border-[#D8D6CC] rounded-lg bg-white text-gray-700 font-medium focus:outline-none focus:border-[#0F6E56]"
              >
                <option value="A3">A3 (297 × 420 mm) — Bagan Lebar (Disarankan)</option>
                <option value="A4">A4 (210 × 297 mm) — Standar</option>
                <option value="Legal">F4 / Folio / Legal (215 × 330 mm)</option>
                <option value="Letter">Letter (8.5 × 11 inci)</option>
              </select>
            </div>

            {/* Orientation */}
            <div>
              <label className="font-bold text-gray-800 block mb-1">
                3. Orientasi Kertas
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setOrient('landscape')}
                  className={`py-2 px-2 rounded-lg border font-semibold text-center transition-all ${
                    orient === 'landscape'
                      ? 'border-[#0F6E56] bg-emerald-50 text-[#0F6E56]'
                      : 'border-[#D8D6CC] bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Mendatar (Landscape)
                </button>
                <button
                  type="button"
                  onClick={() => setOrient('portrait')}
                  className={`py-2 px-2 rounded-lg border font-semibold text-center transition-all ${
                    orient === 'portrait'
                      ? 'border-[#0F6E56] bg-emerald-50 text-[#0F6E56]'
                      : 'border-[#D8D6CC] bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Tegak (Portrait)
                </button>
              </div>
            </div>
          </div>

          {/* 3. Display Options */}
          <div className="pt-2 border-t border-[#D8D6CC]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={compact}
                onChange={(e) => setCompact(e.target.checked)}
                className="rounded text-[#0F6E56] focus:ring-[#0F6E56]"
              />
              <span className="font-medium text-gray-700">
                Mode Kompak (Ukuran kartu lebih ringkas & hemat ruang)
              </span>
            </label>
          </div>

          {/* Summary Banner */}
          <div className="p-3 bg-emerald-50/80 rounded-lg border border-emerald-200 text-emerald-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#0F6E56] shrink-0" />
              <div>
                <span className="font-semibold">
                  Akan diproses {pagesToPrint.length} lembar:
                </span>{' '}
                <span className="text-[11px] text-emerald-800">
                  {pagesToPrint.map((p) => p.name).join(', ')}
                </span>
              </div>
            </div>
            <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 rounded border border-emerald-300">
              {paper} {orient === 'landscape' ? 'Mendatar' : 'Tegak'}
            </span>
          </div>

          {/* Info note */}
          <div className="text-[11px] text-gray-600 bg-amber-50/80 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2">
            <span className="text-amber-600 font-bold shrink-0">💡 Solusi PDF:</span>
            <span>
              Gunakan tombol <strong>Unduh File PDF</strong> untuk menyimpan file PDF (.pdf) resmi siap cetak langsung ke komputer Anda. Tombol <strong>Cetak ke Printer</strong> akan memanggil dialog cetak browser.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#D8D6CC] bg-[#F8F7F2] flex items-center justify-between gap-2 flex-wrap">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-lg border border-[#D8D6CC] bg-white hover:bg-gray-100 text-gray-700 font-medium transition-colors cursor-pointer"
          >
            Batal
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExecutePrint}
              disabled={pagesToPrint.length === 0 || isProcessing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#D8D6CC] bg-white hover:bg-gray-50 text-gray-800 font-medium transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title="Buka dialog pencetakan browser"
            >
              <Printer className="w-4 h-4 text-gray-600" />
              <span>Cetak ke Printer</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={pagesToPrint.length === 0 || isProcessing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0F6E56] hover:bg-[#0c5945] text-white font-semibold transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title="Unduh dokumen PDF langsung ke komputer Anda"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isProcessing ? 'Menyusun PDF...' : `Unduh File PDF (${pagesToPrint.length} Hlm)`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
