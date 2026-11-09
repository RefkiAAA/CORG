/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import {
  Building2,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  FileUp,
  Grid,
  Image,
  Layers,
  Link as LinkIcon,
  Maximize2,
  Minimize2,
  MousePointer,
  Move,
  Plus,
  Printer,
  Redo2,
  Search,
  Sparkles,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Page, ProjectState, ToolMode } from '../types';
import {
  exportAllPagesReportCSV,
  exportDrawioFile,
  exportPageCSV,
  exportPagePNG,
  exportPageSVG,
  exportPagesToPDF,
  exportProjectJSON,
  exportSinglePagePDF,
  exportTemplateCSV,
  printPages,
  printSinglePage,
} from '../utils/exporters';
import { PrintModal } from './PrintModal';

interface ToolbarProps {
  tool: ToolMode;
  setTool: (t: ToolMode) => void;
  onAddCard: () => void;
  onAddLane: () => void;
  onAddText: () => void;
  onAddFrame: () => void;
  onAddLegend: () => void;
  onTidy: () => void;
  autoTidy: boolean;
  toggleAutoTidy: () => void;
  compact: boolean;
  toggleCompact: () => void;
  showHc: boolean;
  toggleShowHc: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  presentation: boolean;
  togglePresentation: () => void;
  onImportFile: (file: File) => void;
  currentPage: Page;
  project: ProjectState;
  onAutoConnectAll?: () => void;
  onLoadInterskalaProject?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  tool,
  setTool,
  onAddCard,
  onAddLane,
  onAddText,
  onAddFrame,
  onAddLegend,
  onTidy,
  autoTidy,
  toggleAutoTidy,
  compact,
  toggleCompact,
  showHc,
  toggleShowHc,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onFit,
  searchQuery,
  setSearchQuery,
  presentation,
  togglePresentation,
  onImportFile,
  currentPage,
  project,
  onAutoConnectAll,
  onLoadInterskalaProject,
}) => {
  const [showElemMenu, setShowElemMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportFile(file);
      e.target.value = '';
    }
  };

  return (
    <header className="h-14 bg-white border-b border-[#D8D6CC] px-3 flex items-center justify-between gap-2 shadow-xs shrink-0 select-none z-20">
      {/* Brand & Left primary controls */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1">
        <div className="flex items-center gap-2 mr-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#0F6E56] text-white flex items-center justify-center font-bold text-sm shadow-xs">
            CB
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-gray-800 leading-tight">Chart Builder</h1>
            <p className="text-[10px] text-gray-500 leading-none">Struktur Swimlane</p>
          </div>
        </div>

        {onLoadInterskalaProject && (
          <button
            onClick={onLoadInterskalaProject}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition-colors shadow-2xs whitespace-nowrap cursor-pointer"
            title="Muat ulang seluruh struktur organisasi Interskala Group (PT IKI, PT ITS, PT IMI, PT III) sesuai 4 dokumen PDF"
          >
            <Building2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span className="hidden lg:inline">Bagan Interskala (4 PT)</span>
            <span className="lg:hidden">Interskala</span>
          </button>
        )}

        <div className="h-6 w-px bg-[#D8D6CC] mx-1 shrink-0" />

        {/* Pointer / Select Tool */}
        <button
          onClick={() => setTool('select')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
            tool === 'select'
              ? 'bg-[#0F6E56] text-white border-[#0F6E56] shadow-xs'
              : 'bg-white text-gray-700 border-[#D8D6CC] hover:bg-gray-50'
          }`}
          title="Pilih & geser elemen. Shift+seret area kosong = seleksi kotak"
        >
          <MousePointer className="w-3.5 h-3.5" />
          <span>Pilih</span>
        </button>

        {/* Link / Connect Tool */}
        <button
          onClick={() => setTool('link')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
            tool === 'link'
              ? 'bg-[#0F6E56] text-white border-[#0F6E56] shadow-xs ring-2 ring-emerald-200'
              : 'bg-white text-gray-700 border-[#D8D6CC] hover:bg-gray-50'
          }`}
          title="Mode Hubungkan: Klik kartu atasan lalu klik kartu bawahan"
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span>Hubungkan</span>
        </button>

        <div className="h-6 w-px bg-[#D8D6CC] mx-1 shrink-0" />

        {/* Add Card */}
        <button
          onClick={onAddCard}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-emerald-50 text-[#0F6E56] border border-emerald-300 hover:bg-emerald-100 transition-colors"
          title="Tambah kartu jabatan baru ke posisi tengah"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Kartu</span>
        </button>

        {/* Add Lane */}
        <button
          onClick={onAddLane}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-white text-gray-700 border border-[#D8D6CC] hover:bg-gray-50 transition-colors"
          title="Tambah swimlane baru di sebelah kanan"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Lane</span>
        </button>

        {/* Add Annotations dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowElemMenu(!showElemMenu);
              setShowExportMenu(false);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-white text-gray-700 border border-[#D8D6CC] hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Elemen</span>
            <span className="text-[10px] opacity-70">▾</span>
          </button>

          {showElemMenu && (
            <div
              className="absolute left-0 mt-1 w-44 bg-white border border-[#D8D6CC] rounded-lg shadow-lg py-1 z-50 text-xs"
              onMouseLeave={() => setShowElemMenu(false)}
            >
              <button
                onClick={() => {
                  onAddText();
                  setShowElemMenu(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2 text-gray-700"
              >
                <FileText className="w-3.5 h-3.5 text-gray-500" />
                <span>Kotak Teks</span>
              </button>
              <button
                onClick={() => {
                  onAddFrame();
                  setShowElemMenu(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2 text-gray-700"
              >
                <Grid className="w-3.5 h-3.5 text-gray-500" />
                <span>Bingkai Pengelompok</span>
              </button>
              <button
                onClick={() => {
                  onAddLegend();
                  setShowElemMenu(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2 text-gray-700"
              >
                <Layers className="w-3.5 h-3.5 text-gray-500" />
                <span>Legenda Bagan</span>
              </button>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-[#D8D6CC] mx-1 shrink-0" />

        {/* Tidy & Layout */}
        <button
          onClick={onTidy}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-white text-gray-700 border border-[#D8D6CC] hover:bg-gray-50 transition-colors"
          title="Susun ulang bagan secara rapi berdasarkan hierarki"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>Rapikan</span>
        </button>

        <button
          onClick={toggleAutoTidy}
          className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
            autoTidy
              ? 'bg-amber-100 text-amber-900 border-amber-300 font-semibold'
              : 'bg-white text-gray-700 border-[#D8D6CC] hover:bg-gray-50'
          }`}
          title="Auto-rapi: Otomatis merapikan posisi kartu setiap ada perubahan koneksi"
        >
          Auto-rapi
        </button>

        <button
          onClick={toggleCompact}
          className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
            compact
              ? 'bg-blue-100 text-blue-900 border-blue-300 font-semibold'
              : 'bg-white text-gray-700 border-[#D8D6CC] hover:bg-gray-50'
          }`}
          title="Tampilan kompak kartu jabatan"
        >
          Kompak
        </button>

        <button
          onClick={toggleShowHc}
          className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
            showHc
              ? 'bg-emerald-100 text-[#0F6E56] border-emerald-300 font-semibold'
              : 'bg-white text-gray-700 border-[#D8D6CC] hover:bg-gray-50'
          }`}
          title="Tampilkan / Sembunyikan garis Headcount (HC) di bawah swimlane"
        >
          HC Lane
        </button>

        <div className="h-6 w-px bg-[#D8D6CC] mx-1 shrink-0" />

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-md text-gray-700 border border-[#D8D6CC] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-md text-gray-700 border border-[#D8D6CC] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-0.5 ml-1">
          <button
            onClick={onZoomOut}
            className="p-1.5 rounded-md text-gray-700 border border-[#D8D6CC] hover:bg-gray-50"
            title="Perkecil (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onZoomIn}
            className="p-1.5 rounded-md text-gray-700 border border-[#D8D6CC] hover:bg-gray-50"
            title="Perbesar (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onFit}
            className="px-2 py-1.5 rounded-md text-xs font-medium text-gray-700 border border-[#D8D6CC] hover:bg-gray-50"
            title="Sesuaikan tampilan ke layar"
          >
            Fit
          </button>
        </div>
      </div>

      {/* Right controls: Search, Presentation, Import & Export */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari jabatan/nama/level…"
            className="pl-8 pr-2.5 py-1 text-xs border border-[#D8D6CC] rounded-md w-44 focus:outline-none focus:border-[#0F6E56] focus:ring-1 focus:ring-[#0F6E56] bg-gray-50/50"
          />
        </div>

        {/* Presentation Mode */}
        <button
          onClick={togglePresentation}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
            presentation
              ? 'bg-purple-600 text-white border-purple-600'
              : 'bg-white text-gray-700 border-[#D8D6CC] hover:bg-gray-50'
          }`}
          title="Mode Presentasi (layar penuh tanpa sidebar dan toolbar)"
        >
          {presentation ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          <span className="hidden lg:inline">{presentation ? 'Keluar' : 'Presentasi'}</span>
        </button>

        {/* Import file */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-white text-gray-700 border border-[#D8D6CC] hover:bg-gray-50 transition-colors"
          title="Impor file Draw.io, JSON, atau CSV"
        >
          <FileUp className="w-3.5 h-3.5 text-blue-600" />
          <span className="hidden sm:inline">Impor</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".drawio,.xml,.json,.csv"
          className="hidden"
          onChange={handleFileInputChange}
        />

        {/* Tombol PDF & Cetak */}
        <button
          onClick={() => {
            setShowPrintModal(true);
            setShowExportMenu(false);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-emerald-50 text-[#0F6E56] border border-emerald-300 hover:bg-emerald-100 transition-colors shadow-2xs cursor-pointer"
          title="Unduh dokumen PDF atau cetak ke printer"
        >
          <Printer className="w-3.5 h-3.5 text-[#0F6E56]" />
          <span>PDF / Cetak</span>
        </button>

        {/* Export dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowExportMenu(!showExportMenu);
              setShowElemMenu(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#0F6E56] text-white hover:bg-[#0c5945] transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor</span>
            <span className="text-[10px] opacity-80">▾</span>
          </button>

          {showExportMenu && (
            <div
              className="absolute right-0 mt-1 w-64 bg-white border border-[#D8D6CC] rounded-lg shadow-xl py-1 z-50 text-xs divide-y divide-gray-100"
              onMouseLeave={() => setShowExportMenu(false)}
            >
              <div className="py-1">
                <button
                  onClick={() => {
                    exportDrawioFile(project.pages);
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2 text-gray-700"
                >
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="font-medium">Draw.io (.drawio)</div>
                    <div className="text-[10px] text-gray-400">Semua halaman diagram</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    exportProjectJSON(project);
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2 text-gray-700"
                >
                  <FileText className="w-4 h-4 text-purple-600" />
                  <div>
                    <div className="font-medium">JSON Backup</div>
                    <div className="text-[10px] text-gray-400">Penyimpanan lengkap proyek</div>
                  </div>
                </button>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    exportPageCSV(currentPage);
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2 text-gray-700"
                >
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                  <div>
                    <div className="font-medium">CSV Data Halaman</div>
                    <div className="text-[10px] text-gray-400">Data jabatan halaman ini</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    exportAllPagesReportCSV(project.pages);
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2 text-gray-700"
                >
                  <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                  <div>
                    <div className="font-medium">Laporan Struktur (CSV)</div>
                    <div className="text-[10px] text-gray-400">Analisis semua halaman</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    exportTemplateCSV();
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2 text-gray-500"
                >
                  <Download className="w-4 h-4" />
                  <span>Template CSV Impor</span>
                </button>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    exportPagePNG(currentPage, compact);
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2 text-gray-700"
                >
                  <Image className="w-4 h-4 text-rose-600" />
                  <span>Gambar PNG (Resolusi Tinggi)</span>
                </button>
                <button
                  onClick={() => {
                    exportPageSVG(currentPage, compact);
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2 text-gray-700"
                >
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Vektor SVG</span>
                </button>
              </div>

              {/* Opsi Cetak & PDF (Per Halaman & Semua Halaman) */}
              <div className="py-1 bg-gray-50/70 border-t border-gray-200">
                <div className="px-3 pt-1 pb-0.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Dokumen PDF (.pdf)</span>
                  <span className="text-[9px] text-emerald-700 font-semibold bg-emerald-100 px-1 rounded">Resmi</span>
                </div>
                <button
                  onClick={() => {
                    exportSinglePagePDF(currentPage, project.paper, project.orient, compact);
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-emerald-50 hover:text-[#0F6E56] flex items-center gap-2 text-gray-800 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#0F6E56]" />
                  <div>
                    <div className="font-semibold text-gray-800">Unduh PDF Halaman Ini</div>
                    <div className="text-[10px] text-gray-400 font-normal">{currentPage.name} (.pdf)</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    exportPagesToPDF(project.pages, project.paper, project.orient, compact);
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-emerald-50 hover:text-[#0F6E56] flex items-center gap-2 text-gray-800 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="font-semibold text-gray-800">Unduh PDF Semua Halaman</div>
                    <div className="text-[10px] text-gray-400 font-normal">Buku lengkap ({project.pages.length} lembar)</div>
                  </div>
                </button>
                
                <div className="px-3 pt-1.5 pb-0.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Cetak ke Printer
                </div>
                <button
                  onClick={() => {
                    printSinglePage(currentPage, project.paper, project.orient, compact);
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center gap-2 text-gray-700 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-xs">Cetak Halaman Ini</span>
                </button>
                <button
                  onClick={() => {
                    printPages(project.pages, project.paper, project.orient, compact);
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center gap-2 text-gray-700 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-xs">Cetak Semua Halaman</span>
                </button>
                <button
                  onClick={() => {
                    setShowExportMenu(false);
                    setShowPrintModal(true);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-emerald-50 flex items-center gap-2 text-xs text-[#0F6E56] font-semibold border-t border-gray-100 cursor-pointer"
                >
                  <span>⚙️ Pengaturan Cetak & PDF Lengkap…</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Print / PDF Customization Modal */}
      <PrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        pages={project.pages}
        currentPageIndex={project.cur}
        defaultPaper={project.paper}
        defaultOrient={project.orient}
        compact={compact}
        onPrint={(selectedPages, paper, orient, isCompact) => {
          printPages(selectedPages, paper, orient, isCompact);
        }}
        onDownloadPDF={(selectedPages, paper, orient, isCompact) => {
          return exportPagesToPDF(selectedPages, paper, orient, isCompact);
        }}
      />
    </header>
  );
};
