/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Copy, Download, Plus, Printer, Trash2 } from 'lucide-react';
import { Page } from '../types';

interface PageTabsProps {
  pages: Page[];
  currentPageIndex: number;
  onSelectPage: (index: number) => void;
  onAddPage: () => void;
  onDuplicatePage: () => void;
  onDeletePage: () => void;
  onRenamePage: (index: number, newName: string) => void;
  onPrintCurrentPage?: () => void;
  onDownloadPDFCurrentPage?: () => void;
}

export const PageTabs: React.FC<PageTabsProps> = ({
  pages,
  currentPageIndex,
  onSelectPage,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  onRenamePage,
  onPrintCurrentPage,
  onDownloadPDFCurrentPage,
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  const handleStartRename = (idx: number, currentName: string) => {
    setEditingIndex(idx);
    setEditingText(currentName);
  };

  const handleFinishRename = (idx: number) => {
    if (editingText.trim()) {
      onRenamePage(idx, editingText.trim());
    }
    setEditingIndex(null);
  };

  return (
    <footer className="h-10 bg-white border-t border-[#D8D6CC] px-3 flex items-center justify-between gap-3 text-xs select-none shrink-0 z-20">
      {/* Pages Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1">
        {pages.map((p, idx) => {
          const isActive = idx === currentPageIndex;

          if (editingIndex === idx) {
            return (
              <input
                key={p.id}
                type="text"
                autoFocus
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                onBlur={() => handleFinishRename(idx)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFinishRename(idx);
                  if (e.key === 'Escape') setEditingIndex(null);
                }}
                className="px-3 py-1 rounded-md border border-[#0F6E56] font-medium text-xs bg-emerald-50 focus:outline-none"
              />
            );
          }

          return (
            <button
              key={p.id}
              onClick={() => onSelectPage(idx)}
              onDoubleClick={() => handleStartRename(idx, p.name)}
              className={`px-3 py-1 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer border ${
                isActive
                  ? 'bg-[#0F6E56] text-white border-[#0F6E56] shadow-xs'
                  : 'bg-gray-50 text-gray-700 border-[#D8D6CC] hover:bg-gray-100'
              }`}
              title="Klik untuk memilih · Klik 2× untuk mengubah nama halaman"
            >
              {p.name}
            </button>
          );
        })}

        <div className="h-5 w-px bg-[#D8D6CC] mx-1 shrink-0" />

        {/* Add Page */}
        <button
          onClick={onAddPage}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#D8D6CC] text-gray-700 bg-white hover:bg-gray-50 font-medium whitespace-nowrap"
          title="Tambah halaman baru"
        >
          <Plus className="w-3 h-3" />
          <span>Halaman</span>
        </button>

        {/* Duplicate Page */}
        <button
          onClick={onDuplicatePage}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#D8D6CC] text-gray-700 bg-white hover:bg-gray-50 font-medium whitespace-nowrap cursor-pointer"
          title="Duplikat halaman aktif"
        >
          <Copy className="w-3 h-3" />
          <span>Duplikat</span>
        </button>

        {/* Unduh PDF Halaman Aktif */}
        {onDownloadPDFCurrentPage && (
          <button
            onClick={onDownloadPDFCurrentPage}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-medium whitespace-nowrap cursor-pointer transition-colors shadow-2xs"
            title={`Unduh file PDF dokumen halaman aktif (${pages[currentPageIndex]?.name || ''})`}
          >
            <Download className="w-3 h-3 text-[#0F6E56]" />
            <span>PDF Halaman</span>
          </button>
        )}

        {/* Cetak Halaman Aktif */}
        {onPrintCurrentPage && (
          <button
            onClick={onPrintCurrentPage}
            className="flex items-center gap-1 px-2 py-1 rounded-md border border-[#D8D6CC] text-gray-700 bg-white hover:bg-gray-50 font-medium whitespace-nowrap cursor-pointer transition-colors"
            title={`Cetak halaman aktif (${pages[currentPageIndex]?.name || ''})`}
          >
            <Printer className="w-3 h-3 text-gray-600" />
            <span>Cetak</span>
          </button>
        )}

        {/* Delete Page */}
        {pages.length > 1 && (
          <button
            onClick={onDeletePage}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-rose-200 text-rose-600 bg-white hover:bg-rose-50 font-medium whitespace-nowrap"
            title="Hapus halaman aktif"
          >
            <Trash2 className="w-3 h-3" />
            <span>Hapus</span>
          </button>
        )}
      </div>

      {/* Info indicator */}
      <div className="text-[11px] text-gray-400 whitespace-nowrap hidden sm:flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
        <span>Tersimpan otomatis · Klik 2× tab untuk ganti nama</span>
      </div>
    </footer>
  );
};
