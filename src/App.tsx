/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from './components/Canvas';
import { Inspector } from './components/Inspector';
import { Minimap } from './components/Minimap';
import { PageTabs } from './components/PageTabs';
import { Toolbar } from './components/Toolbar';
import {
  BUILT_IN_TEMPLATES,
  CARD_WIDTH,
  COLOR_PALETTES,
} from './constants';
import {
  AnnotationItem,
  Card,
  Edge,
  Lane,
  Page,
  ProjectState,
  TemplateCard,
  ToolMode,
  VersionSnapshot,
} from './types';
import {
  csvRowsToPages,
  downloadBlob,
  exportSinglePagePDF,
  parseCSVText,
  printSinglePage,
} from './utils/exporters';
import {
  autoConnectHierarchy,
  autoTidy,
  cardHeight,
  findAutoParent,
  pageH,
  pageW,
  setAbsPos,
  snapCoord,
  uid,
} from './utils/geometry';
import { createInterskalaProject } from './data/interskalaCharts';

const createDemoProject = (): ProjectState => {
  const L = ['Direktur', 'Head', 'Manager', 'Supervisor'].map((name) => ({
    id: uid(),
    name,
    w: 320,
  }));

  const card = (
    l: number,
    y: number,
    jab: string,
    name: string,
    st: Card['st'],
    lv: number,
    tr: 'S' | 'I' = 'S'
  ): Card => ({
    id: uid(),
    l,
    dx: 35,
    y,
    jab,
    names: [name],
    lv, // level index
    tr,
    c: { f: '#FFFFFF', s: '#5F5E5A', t: '#222222' },
    photo: '',
    st,
    shape: 'box',
  });

  const a = card(0, 80, 'Chief of Group Business Services', 'Budi Santoso', 'terisi', 9, 'S');
  const b = card(1, 260, 'Head of Finance', 'Siti Aminah', 'terisi', 7, 'S');
  const c = card(2, 440, 'Finance Manager', 'Ahmad Rizal', 'terisi', 5, 'S');
  const d = card(3, 620, 'Finance Supervisor', 'Dewi Lestari', 'rekrut', 4, 'S');
  const e = card(2, 620, 'Accounting Manager', '(Posisi kosong)', 'kosong', 5, 'S');

  const edge = (from: Card, to: Card): Edge => ({
    id: uid(),
    from: from.id,
    to: to.id,
    dash: false,
  });

  return {
    cur: 0,
    compact: false,
    paper: 'A3',
    orient: 'landscape',
    tpl: [],
    pages: [
      {
        id: uid(),
        name: 'Halaman 1',
        title: 'Struktur Organisasi Group Business Services',
        H: 900,
        lanes: L,
        cards: [a, b, c, d, e],
        edges: [edge(a, b), edge(b, c), edge(c, d), edge(b, e)],
        items: [],
        showHc: true,
        edgeOrigin: 'front',
      },
    ],
  };
};

export default function App() {
  // Load Project from localStorage or fallback to Interskala Group charts
  const [project, setProject] = useState<ProjectState>(() => {
    try {
      const saved = localStorage.getItem('cb_swimlane_project');
      if (saved) {
        const parsed = JSON.parse(saved);
        const isOldPlaceholder =
          parsed?.pages?.length === 1 &&
          (parsed.pages[0]?.title?.includes('Group Business Services') ||
            parsed.pages[0]?.name === 'Halaman 1');
        const hasOldDepartmentLanes = parsed?.pages?.some((p: Page) =>
          p.lanes?.some((l: Lane) => l.name === 'Direksi & Holding' || l.name === 'HR & GA')
        );
        if (parsed?.pages?.length && !isOldPlaceholder && !hasOldDepartmentLanes) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return createInterskalaProject();
  });

  // History for Undo/Redo
  const [history, setHistory] = useState<string[]>([]);
  const [future, setFuture] = useState<string[]>([]);
  const lastSerialized = useRef<string>(JSON.stringify(project));

  // Version Snapshots
  const [snapshots, setSnapshots] = useState<VersionSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem('cb_swimlane_snapshots');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // UI Interactive States
  const [tool, setTool] = useState<ToolMode>('select');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedElement, setSelectedElement] = useState<{
    type: 'card' | 'lane' | 'edge' | 'item';
    id: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [presentation, setPresentation] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  // Viewport Pan/Zoom state
  const [view, setView] = useState({ x: 30, y: 30, k: 0.85 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Sync window resize for minimap
  useEffect(() => {
    const updateDim = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateDim();
    window.addEventListener('resize', updateDim);
    return () => window.removeEventListener('resize', updateDim);
  }, []);

  // Save to localStorage
  const recordChange = useCallback(
    (newProject: ProjectState) => {
      const currentJson = JSON.stringify(newProject);
      if (currentJson !== lastSerialized.current) {
        setHistory((prev) => [...prev.slice(-40), lastSerialized.current]);
        setFuture([]);
        lastSerialized.current = currentJson;
        try {
          localStorage.setItem('cb_swimlane_project', currentJson);
        } catch (e) {
          console.error(e);
        }
      }
      setProject(newProject);
    },
    []
  );

  const currentPage = project.pages[project.cur] || project.pages[0];

  // Commit changes to current page
  const updateCurrentPage = useCallback(
    (updater: (page: Page) => Page) => {
      setProject((prev) => {
        const nextPages = [...prev.pages];
        let updatedPage = updater({ ...nextPages[prev.cur] });
        if (updatedPage.auto) {
          autoTidy(updatedPage);
        }
        nextPages[prev.cur] = updatedPage;
        const nextProject = { ...prev, pages: nextPages };
        recordChange(nextProject);
        return nextProject;
      });
    },
    [recordChange]
  );

  // Undo / Redo
  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const prevJson = history[history.length - 1];
    setFuture((f) => [lastSerialized.current, ...f]);
    setHistory((h) => h.slice(0, -1));
    lastSerialized.current = prevJson;
    const parsed = JSON.parse(prevJson);
    setProject(parsed);
    try {
      localStorage.setItem('cb_swimlane_project', prevJson);
    } catch (e) {
      console.error(e);
    }
    showToast('Tindakan dibatalkan (Undo)');
  }, [history, showToast]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const nextJson = future[0];
    setHistory((h) => [...h, lastSerialized.current]);
    setFuture((f) => f.slice(1));
    lastSerialized.current = nextJson;
    const parsed = JSON.parse(nextJson);
    setProject(parsed);
    try {
      localStorage.setItem('cb_swimlane_project', nextJson);
    } catch (e) {
      console.error(e);
    }
    showToast('Tindakan diulangi (Redo)');
  }, [future, showToast]);

  // Fit to screen
  const handleFit = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth: cw, clientHeight: ch } = containerRef.current;
    const pw = pageW(currentPage);
    const ph = pageH(currentPage);
    const scale = Math.min(1.2, Math.min((cw - 60) / pw, (ch - 60) / ph));
    setView({
      k: Math.max(0.2, scale),
      x: Math.max(20, (cw - pw * scale) / 2),
      y: 20 + (currentPage.title ? 40 * scale : 0),
    });
  }, [currentPage]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Escape') {
        if (presentation) {
          setPresentation(false);
        } else {
          setSelectedElement(null);
          setSelectedIds(new Set());
          setTool('select');
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (selectedIds.size > 0) {
          const ids = [...selectedIds];
          updateCurrentPage((page) => ({
            ...page,
            cards: page.cards.filter((c) => !ids.includes(c.id)),
            edges: page.edges.filter((edge) => !ids.includes(edge.from) && !ids.includes(edge.to)),
          }));
          setSelectedIds(new Set());
          setSelectedElement(null);
        } else if (selectedElement?.type === 'item') {
          updateCurrentPage((page) => ({
            ...page,
            items: (page.items || []).filter((i) => i.id !== selectedElement.id),
          }));
          setSelectedElement(null);
        } else if (selectedElement?.type === 'edge') {
          updateCurrentPage((page) => ({
            ...page,
            edges: page.edges.filter((edge) => edge.id !== selectedElement.id),
          }));
          setSelectedElement(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, presentation, selectedIds, selectedElement, updateCurrentPage]);

  // Card Operations
  const handleAddCard = (tpl?: Partial<Card>) => {
    const p = currentPage;
    const laneIndex = 0;
    const newY = 80 + p.cards.filter((c) => c.l === laneIndex).length * 110;

    const newC: Card = {
      id: uid(),
      l: laneIndex,
      dx: 35,
      y: newY,
      jab: tpl?.jab || 'Jabatan Baru',
      names: tpl?.names ? [...tpl.names] : ['Nama Pegawai'],
      lv: tpl?.lv || 0,
      tr: tpl?.tr || 'S',
      customLv: tpl?.customLv,
      c: tpl?.c || { f: '#FFFFFF', s: '#5F5E5A', t: '#222222' },
      photo: '',
      st: tpl?.st || 'terisi',
      grade: tpl?.grade || '',
      shape: tpl?.shape || 'box',
      np: !!tpl?.np,
      cols: tpl?.cols || 1,
    };

    updateCurrentPage((page) => ({
      ...page,
      cards: [...page.cards, newC],
    }));
    setSelectedElement({ type: 'card', id: newC.id });
    setSelectedIds(new Set([newC.id]));
    showToast('Kartu jabatan baru ditambahkan');
  };

  const handleUpdateCard = (card: Card) => {
    updateCurrentPage((page) => ({
      ...page,
      cards: page.cards.map((c) => (c.id === card.id ? card : c)),
    }));
  };

  const handleUpdateCards = (cards: Card[]) => {
    const map = new Map(cards.map((c) => [c.id, c]));
    updateCurrentPage((page) => ({
      ...page,
      cards: page.cards.map((c) => map.get(c.id) || c),
    }));
  };

  const handleDeleteCards = (ids: string[]) => {
    updateCurrentPage((page) => ({
      ...page,
      cards: page.cards.filter((c) => !ids.includes(c.id)),
      edges: page.edges.filter((e) => !ids.includes(e.from) && !ids.includes(e.to)),
    }));
    setSelectedIds(new Set());
    setSelectedElement(null);
    showToast(`${ids.length} kartu dihapus`);
  };

  const handleAddSubordinate = (parentId: string) => {
    const parent = currentPage.cards.find((c) => c.id === parentId);
    if (!parent) return;

    const nextLane = Math.min(parent.l + 1, currentPage.lanes.length - 1);
    const newY = parent.y + cardHeight(parent, project.compact) + 40;

    const subCard: Card = {
      id: uid(),
      l: nextLane,
      dx: 35,
      y: newY,
      jab: 'Bawahan Baru',
      names: ['Nama'],
      lv: Math.max(1, (parent.lv || 5) - 1),
      tr: parent.tr || 'S',
      c: { f: '#FFFFFF', s: '#5F5E5A', t: '#222222' },
      photo: '',
      st: 'terisi',
      shape: 'box',
    };

    const newEdge: Edge = {
      id: uid(),
      from: parent.id,
      to: subCard.id,
      dash: false,
    };

    updateCurrentPage((page) => ({
      ...page,
      cards: [...page.cards, subCard],
      edges: [...page.edges, newEdge],
    }));

    setSelectedElement({ type: 'card', id: subCard.id });
    setSelectedIds(new Set([subCard.id]));
    showToast('Bawahan baru ditambahkan dan dihubungkan');
  };

  const handleDuplicateCard = (card: Card) => {
    const dup: Card = {
      ...card,
      id: uid(),
      dx: card.dx + 20,
      y: card.y + 30,
    };

    updateCurrentPage((page) => ({
      ...page,
      cards: [...page.cards, dup],
    }));
    setSelectedElement({ type: 'card', id: dup.id });
    setSelectedIds(new Set([dup.id]));
    showToast('Kartu diduplikasi');
  };

  // Lane Operations
  const handleAddLane = () => {
    const newLane: Lane = {
      id: uid(),
      name: `Lane ${currentPage.lanes.length + 1}`,
      w: 320,
    };
    updateCurrentPage((page) => ({
      ...page,
      lanes: [...page.lanes, newLane],
    }));
    setSelectedElement({ type: 'lane', id: newLane.id });
    showToast('Swimlane baru ditambahkan');
  };

  const handleInsertLane = (index: number) => {
    const newLane: Lane = {
      id: uid(),
      name: 'Lane Baru',
      w: 320,
    };

    updateCurrentPage((page) => {
      const nextLanes = [...page.lanes];
      nextLanes.splice(index, 0, newLane);
      const nextCards = page.cards.map((c) => (c.l >= index ? { ...c, l: c.l + 1 } : c));
      return {
        ...page,
        lanes: nextLanes,
        cards: nextCards,
      };
    });
    setSelectedElement({ type: 'lane', id: newLane.id });
  };

  const handleMoveLane = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= currentPage.lanes.length) return;

    updateCurrentPage((page) => {
      const nextLanes = [...page.lanes];
      [nextLanes[index], nextLanes[target]] = [nextLanes[target], nextLanes[index]];
      const nextCards = page.cards.map((c) => {
        if (c.l === index) return { ...c, l: target };
        if (c.l === target) return { ...c, l: index };
        return c;
      });
      return {
        ...page,
        lanes: nextLanes,
        cards: nextCards,
      };
    });
  };

  const handleDeleteLane = (laneId: string) => {
    if (currentPage.lanes.length <= 1) {
      showToast('Minimal harus ada 1 swimlane!');
      return;
    }
    const idx = currentPage.lanes.findIndex((l) => l.id === laneId);
    if (idx === -1) return;

    updateCurrentPage((page) => {
      const nextLanes = page.lanes.filter((l) => l.id !== laneId);
      const nextCards = page.cards
        .filter((c) => c.l !== idx)
        .map((c) => (c.l > idx ? { ...c, l: c.l - 1 } : c));
      const removedCardIds = page.cards.filter((c) => c.l === idx).map((c) => c.id);
      const nextEdges = page.edges.filter(
        (e) => !removedCardIds.includes(e.from) && !removedCardIds.includes(e.to)
      );
      return {
        ...page,
        lanes: nextLanes,
        cards: nextCards,
        edges: nextEdges,
      };
    });
    setSelectedElement(null);
    showToast('Lane dihapus');
  };

  // Edge Operations
  const handleAddEdge = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const exists = currentPage.edges.some((e) => e.from === fromId && e.to === toId);
    if (exists) return;

    const newEdge: Edge = {
      id: uid(),
      from: fromId,
      to: toId,
      dash: false,
    };
    updateCurrentPage((page) => ({
      ...page,
      edges: [...page.edges, newEdge],
    }));
    showToast('Garis hierarki terhubung');
  };

  const handleUpdateEdge = (edge: Edge) => {
    updateCurrentPage((page) => ({
      ...page,
      edges: page.edges.map((e) => (e.id === edge.id ? edge : e)),
    }));
  };

  const handleDeleteEdge = (edgeId: string) => {
    updateCurrentPage((page) => ({
      ...page,
      edges: page.edges.filter((e) => e.id !== edgeId),
    }));
    setSelectedElement(null);
    showToast('Garis penghubung dihapus');
  };

  const handleAutoConnectAll = () => {
    const newEdges = autoConnectHierarchy(currentPage);
    if (newEdges.length === 0) {
      showToast('Semua kartu sudah terhubung dengan rapi');
      return;
    }
    updateCurrentPage((page) => ({
      ...page,
      edges: [...page.edges, ...newEdges],
    }));
    showToast(`${newEdges.length} garis hierarki berhasil dibuat otomatis!`);
  };

  const handleConnectToParent = (cardId: string, parentId: string | null) => {
    if (!parentId) {
      updateCurrentPage((page) => ({
        ...page,
        edges: page.edges.filter((e) => e.to !== cardId),
      }));
      showToast('Hubungan atasan dilepas');
      return;
    }

    if (cardId === parentId) return;

    updateCurrentPage((page) => {
      const withoutIncoming = page.edges.filter((e) => e.to !== cardId);
      const newEdge: Edge = {
        id: uid(),
        from: parentId,
        to: cardId,
        dash: false,
      };
      return {
        ...page,
        edges: [...withoutIncoming, newEdge],
      };
    });
    showToast('Atasan langsung berhasil dihubungkan');
  };

  const handleAutoConnectCard = (cardId: string) => {
    const card = currentPage.cards.find((c) => c.id === cardId);
    if (!card) return;
    const parent = findAutoParent(currentPage, card);
    if (!parent) {
      showToast('Tidak ditemukan atasan otomatis di lane sebelumnya');
      return;
    }
    handleConnectToParent(cardId, parent.id);
  };

  const handleClearAllEdges = () => {
    updateCurrentPage((page) => ({
      ...page,
      edges: [],
    }));
    showToast('Semua garis penghubung berhasil dihapus');
  };

  // Annotations
  const handleAddAnnotation = (type: 'text' | 'frame' | 'legend') => {
    const item: AnnotationItem = {
      id: uid(),
      t: type,
      x: 100,
      y: 100,
      w: type === 'frame' ? 440 : type === 'legend' ? 400 : 220,
      h: type === 'frame' ? 240 : undefined,
      text: type === 'text' ? 'Teks Keterangan' : type === 'frame' ? 'Divisi / Kelompok' : '',
      fs: 12,
      b: false,
    };

    updateCurrentPage((page) => ({
      ...page,
      items: [...(page.items || []), item],
    }));
    setSelectedElement({ type: 'item', id: item.id });
    showToast(`Elemen ${type} ditambahkan`);
  };

  // Tidy auto layout
  const handleTidy = () => {
    updateCurrentPage((page) => {
      const clone = { ...page };
      autoTidy(clone);
      return clone;
    });
    showToast('Bagan berhasil dirapikan otomatis');
  };

  // Template cards
  const handleSaveTemplate = (tpl: TemplateCard) => {
    setProject((prev) => {
      const nextTpl = [...prev.tpl, tpl];
      const nextProject = { ...prev, tpl: nextTpl };
      recordChange(nextProject);
      return nextProject;
    });
    showToast(`Template "${tpl.n}" disimpan`);
  };

  const handleDeleteCustomTemplate = (index: number) => {
    setProject((prev) => {
      const nextTpl = [...prev.tpl];
      nextTpl.splice(index, 1);
      const nextProject = { ...prev, tpl: nextTpl };
      recordChange(nextProject);
      return nextProject;
    });
  };

  // Version snapshots
  const handleSaveSnapshot = (name: string) => {
    const snap: VersionSnapshot = {
      name,
      t: Date.now(),
      d: JSON.stringify(project.pages),
    };
    const nextSnaps = [snap, ...snapshots.slice(0, 15)];
    setSnapshots(nextSnaps);
    try {
      localStorage.setItem('cb_swimlane_snapshots', JSON.stringify(nextSnaps));
    } catch (e) {
      console.error(e);
    }
    showToast(`Versi "${name}" tersimpan`);
  };

  const handleRestoreSnapshot = (snap: VersionSnapshot) => {
    try {
      const restoredPages = JSON.parse(snap.d);
      setProject((prev) => {
        const nextProject = { ...prev, pages: restoredPages, cur: 0 };
        recordChange(nextProject);
        return nextProject;
      });
      showToast(`Bagan dipulihkan ke versi "${snap.name}"`);
    } catch (e) {
      console.error(e);
      showToast('Gagal memulihkan versi');
    }
  };

  const handleDeleteSnapshot = (idx: number) => {
    const nextSnaps = [...snapshots];
    nextSnaps.splice(idx, 1);
    setSnapshots(nextSnaps);
    try {
      localStorage.setItem('cb_swimlane_snapshots', JSON.stringify(nextSnaps));
    } catch (e) {
      console.error(e);
    }
  };

  // Bulk photo upload
  const handleBulkPhotoUpload = async (files: File[]) => {
    let matched = 0;
    const cards = [...currentPage.cards];

    for (const file of files) {
      const baseName = file.name.replace(/\.[^.]+$/, '').toLowerCase();
      const card = cards.find((c) =>
        c.names.some(
          (name) =>
            name.toLowerCase() === baseName ||
            name.toLowerCase().replace(/\s+/g, '_') === baseName ||
            name.toLowerCase().replace(/\s+/g, '-') === baseName
        )
      );

      if (card) {
        const reader = new FileReader();
        await new Promise<void>((resolve) => {
          reader.onload = () => {
            card.photo = reader.result as string;
            matched++;
            resolve();
          };
          reader.readAsDataURL(file);
        });
      }
    }

    if (matched > 0) {
      updateCurrentPage((page) => ({ ...page, cards }));
      showToast(`${matched} dari ${files.length} foto pegawai berhasil dicocokkan!`);
    } else {
      showToast('Tidak ada nama file yang cocok dengan nama pegawai.');
    }
  };

  // Import file
  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text();
      let importedPages: Page[] = [];

      if (file.name.endsWith('.csv')) {
        const rows = parseCSVText(text);
        importedPages = csvRowsToPages(rows);
      } else if (text.trim().startsWith('{')) {
        const parsed = JSON.parse(text);
        if (parsed.pages) {
          importedPages = parsed.pages;
        } else if (Array.isArray(parsed)) {
          importedPages = parsed;
        } else if (parsed.lanes) {
          importedPages = [parsed];
        }
      }

      if (importedPages.length > 0) {
        setProject((prev) => {
          const nextProject = {
            ...prev,
            pages: [...prev.pages, ...importedPages],
            cur: prev.pages.length,
          };
          recordChange(nextProject);
          return nextProject;
        });
        showToast(`${importedPages.length} halaman berhasil diimpor!`);
        setTimeout(handleFit, 100);
      } else {
        showToast('Format file tidak didukung atau kosong.');
      }
    } catch (err) {
      console.error(err);
      showToast('Gagal membaca file impor.');
    }
  };

  const handleLoadInterskalaProject = useCallback(() => {
    const proj = createInterskalaProject();
    recordChange(proj);
    setSelectedElement(null);
    setSelectedIds(new Set());
    showToast('Bagan Interskala Group (PT IKI, PT ITS, PT IMI, PT III) berhasil dimuat!');
    setTimeout(handleFit, 100);
  }, [recordChange, handleFit, showToast]);

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-[#F4F3EE] font-sans antialiased text-[#222222]">
      {/* Top Toolbar */}
      {!presentation && (
        <Toolbar
          tool={tool}
          setTool={setTool}
          onAddCard={() => handleAddCard()}
          onAddLane={handleAddLane}
          onAddText={() => handleAddAnnotation('text')}
          onAddFrame={() => handleAddAnnotation('frame')}
          onAddLegend={() => handleAddAnnotation('legend')}
          onTidy={handleTidy}
          autoTidy={!!currentPage.auto}
          toggleAutoTidy={() =>
            updateCurrentPage((page) => ({ ...page, auto: !page.auto }))
          }
          compact={!!project.compact}
          toggleCompact={() =>
            setProject((prev) => {
              const next = { ...prev, compact: !prev.compact };
              recordChange(next);
              return next;
            })
          }
          showHc={currentPage.showHc ?? true}
          toggleShowHc={() =>
            updateCurrentPage((page) => ({
              ...page,
              showHc: !(page.showHc ?? true),
            }))
          }
          canUndo={history.length > 0}
          canRedo={future.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onZoomIn={() => setView((v) => ({ ...v, k: Math.min(3, v.k * 1.2) }))}
          onZoomOut={() => setView((v) => ({ ...v, k: Math.max(0.15, v.k * 0.8) }))}
          onFit={handleFit}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          presentation={presentation}
          togglePresentation={() => setPresentation(!presentation)}
          onImportFile={handleImportFile}
          currentPage={currentPage}
          project={project}
          onAutoConnectAll={handleAutoConnectAll}
          onLoadInterskalaProject={handleLoadInterskalaProject}
        />
      )}

      {/* Main Workspace Area */}
      <div ref={containerRef} className="relative flex-1 flex w-full h-full min-h-0 overflow-hidden">
        {/* SVG Interactive Canvas */}
        <Canvas
          page={currentPage}
          tool={tool}
          setTool={setTool}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          selectedElement={selectedElement}
          setSelectedElement={setSelectedElement}
          onUpdateCard={handleUpdateCard}
          onUpdateCards={handleUpdateCards}
          onAddEdge={handleAddEdge}
          onUpdateEdge={handleUpdateEdge}
          onUpdateItem={(item) =>
            updateCurrentPage((page) => ({
              ...page,
              items: (page.items || []).map((i) => (i.id === item.id ? item : i)),
            }))
          }
          compact={!!project.compact}
          searchQuery={searchQuery}
          presentation={presentation}
          view={view}
          setView={setView}
        />

        {/* Floating Minimap */}
        {!presentation && (
          <Minimap
            page={currentPage}
            view={view}
            setView={setView}
            compact={!!project.compact}
            containerWidth={dimensions.width}
            containerHeight={dimensions.height}
          />
        )}

        {/* Exit Presentation Button */}
        {presentation && (
          <button
            onClick={() => setPresentation(false)}
            className="absolute top-4 right-4 z-50 px-4 py-2 bg-gray-900/80 hover:bg-gray-900 text-white rounded-lg shadow-lg text-xs font-semibold backdrop-blur-xs transition-colors"
          >
            Keluar Presentasi (Esc)
          </button>
        )}

        {/* Inspector Properties Sidebar */}
        {!presentation && (
          <Inspector
            page={currentPage}
            project={project}
            selectedIds={selectedIds}
            selectedElement={selectedElement}
            setSelectedElement={setSelectedElement}
            onUpdateCard={handleUpdateCard}
            onUpdateCards={handleUpdateCards}
            onDeleteCards={handleDeleteCards}
            onAddSubordinate={handleAddSubordinate}
            onUpdateLane={(lane) =>
              updateCurrentPage((page) => ({
                ...page,
                lanes: page.lanes.map((l) => (l.id === lane.id ? lane : l)),
              }))
            }
            onInsertLane={handleInsertLane}
            onMoveLane={handleMoveLane}
            onDeleteLane={handleDeleteLane}
            onUpdateEdge={handleUpdateEdge}
            onDeleteEdge={handleDeleteEdge}
            onUpdateItem={(item) =>
              updateCurrentPage((page) => ({
                ...page,
                items: (page.items || []).map((i) => (i.id === item.id ? item : i)),
              }))
            }
            onDeleteItem={(itemId) =>
              updateCurrentPage((page) => ({
                ...page,
                items: (page.items || []).filter((i) => i.id !== itemId),
              }))
            }
            onUpdatePage={(p) => updateCurrentPage(() => p)}
            onSaveTemplate={handleSaveTemplate}
            onDeleteCustomTemplate={handleDeleteCustomTemplate}
            onApplyTemplate={(tpl) => handleAddCard(tpl)}
            onDuplicateCard={handleDuplicateCard}
            onBulkPhotoUpload={handleBulkPhotoUpload}
            versionSnapshots={snapshots}
            onSaveSnapshot={handleSaveSnapshot}
            onRestoreSnapshot={handleRestoreSnapshot}
            onDeleteSnapshot={handleDeleteSnapshot}
            onAutoConnectAll={handleAutoConnectAll}
            onConnectToParent={handleConnectToParent}
            onAutoConnectCard={handleAutoConnectCard}
            onClearAllEdges={handleClearAllEdges}
            onStartManualConnect={() => {
              setTool('link');
              showToast('Mode Hubungkan Manual aktif: Klik kartu atasan lalu klik kartu bawahan (Esc untuk batal)');
            }}
          />
        )}
      </div>

      {/* Bottom Page Tabs Bar */}
      {!presentation && (
        <PageTabs
          pages={project.pages}
          currentPageIndex={project.cur}
          onSelectPage={(idx) => {
            setProject((prev) => ({ ...prev, cur: idx }));
            setSelectedElement(null);
            setSelectedIds(new Set());
          }}
          onAddPage={() => {
            const newPage: Page = {
              id: uid(),
              name: `Halaman ${project.pages.length + 1}`,
              title: '',
              H: 900,
              lanes: currentPage.lanes.map((l) => ({ id: uid(), name: l.name, w: l.w })),
              cards: [],
              edges: [],
              showHc: true,
            };
            setProject((prev) => {
              const nextProject = {
                ...prev,
                pages: [...prev.pages, newPage],
                cur: prev.pages.length,
              };
              recordChange(nextProject);
              return nextProject;
            });
            showToast('Halaman baru ditambahkan');
          }}
          onDuplicatePage={() => {
            const clone: Page = {
              ...JSON.parse(JSON.stringify(currentPage)),
              id: uid(),
              name: `${currentPage.name} (Salinan)`,
            };
            setProject((prev) => {
              const nextProject = {
                ...prev,
                pages: [...prev.pages, clone],
                cur: prev.pages.length,
              };
              recordChange(nextProject);
              return nextProject;
            });
            showToast('Halaman berhasil diduplikasi');
          }}
          onDeletePage={() => {
            if (project.pages.length <= 1) return;
            setProject((prev) => {
              const nextPages = prev.pages.filter((_, idx) => idx !== prev.cur);
              const nextCur = Math.max(0, prev.cur - 1);
              const nextProject = { ...prev, pages: nextPages, cur: nextCur };
              recordChange(nextProject);
              return nextProject;
            });
            showToast('Halaman dihapus');
          }}
          onRenamePage={(idx, newName) => {
            setProject((prev) => {
              const nextPages = [...prev.pages];
              nextPages[idx] = { ...nextPages[idx], name: newName };
              const nextProject = { ...prev, pages: nextPages };
              recordChange(nextProject);
              return nextProject;
            });
          }}
          onPrintCurrentPage={() => {
            printSinglePage(currentPage, project.paper, project.orient, !!project.compact);
          }}
          onDownloadPDFCurrentPage={() => {
            exportSinglePagePDF(currentPage, project.paper, project.orient, !!project.compact);
            showToast(`Mengunduh PDF: ${currentPage.name}`);
          }}
        />
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-14 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg text-xs shadow-xl z-50 animate-fade-in flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
