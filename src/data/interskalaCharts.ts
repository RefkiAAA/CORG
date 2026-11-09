/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnnotationItem, Card, Edge, Lane, Page, ProjectState } from '../types';
import { uid } from '../utils/geometry';

// Standard color constants matching the Interskala Group Brand Chart
const C_COMMISSIONER = { f: '#203A8F', s: '#152763', t: '#FFFFFF' };
const C_DIRECTOR = { f: '#8BC34A', s: '#558B2F', t: '#000000' };
const C_EXEC_CONTROLLER = { f: '#FDD835', s: '#F57F17', t: '#000000' };
const C_MANAGER = { f: '#A5D6A7', s: '#2E7D32', t: '#000000' };
const C_HEAD = { f: '#00897B', s: '#004D40', t: '#FFFFFF' };
const C_HEAD_ALT = { f: '#FFF59D', s: '#FBC02D', t: '#000000' };
const C_SPV = { f: '#29B6F6', s: '#0288D1', t: '#FFFFFF' };
const C_STAFF = { f: '#FFCCBC', s: '#D84315', t: '#000000' };
const C_INTERN = { f: '#D1C4E9', s: '#512DA8', t: '#000000' };
const C_CONSULTANT = { f: '#ECEFF1', s: '#607D8B', t: '#263238' };

const makeCard = (
  l: number,
  y: number,
  jab: string,
  names: string[],
  st: Card['st'],
  lv: number,
  c = C_STAFF,
  dx = 35,
  shape: Card['shape'] = 'box'
): Card => ({
  id: uid(),
  l,
  dx,
  y,
  jab,
  names,
  lv,
  tr: 'S',
  c,
  photo: '',
  st,
  shape,
});

const makeEdge = (fromId: string, toId: string, dash = false): Edge => ({
  id: uid(),
  from: fromId,
  to: toId,
  dash,
});

// ============================================================================
// 1. PT INTERSKALA KONSTRUKSI INDONESIA (IKI)
// Swimlanes = LEVEL JABATAN (bukan departemen/divisi)
// ============================================================================
export const createIkiPage = (): Page => {
  const lanes: Lane[] = [
    { id: uid(), name: 'Komisaris & Direksi', w: 320 },
    { id: uid(), name: 'Manager', w: 320 },
    { id: uid(), name: 'Head / Project Manager', w: 320 },
    { id: uid(), name: 'Supervisor', w: 320 },
    { id: uid(), name: 'Staff', w: 330 },
    { id: uid(), name: 'Mandor & Operator', w: 320 },
  ];

  // Lane 0: Komisaris & Direksi
  const com = makeCard(0, 120, 'COMMISIONER', ['SHERVYALING'], 'terisi', 10, C_COMMISSIONER);
  const dir = makeCard(0, 420, 'DIRECTOR', ['SUTRISNO'], 'terisi', 9, C_DIRECTOR);
  const holding = makeCard(0, 720, 'HOLDING TEAM', ['KONSULTAN'], 'terisi', 6, C_CONSULTANT, 35, 'box-d');

  // Lane 1: Manager
  const mgrLeft = makeCard(1, 260, 'MANAGER', ['(VACANT)'], 'kosong', 6, C_MANAGER);
  const mgrRight = makeCard(1, 680, 'MANAGER', ['(VACANT)'], 'kosong', 6, C_MANAGER);

  // Lane 2: Head / Project Manager
  const headHrGa = makeCard(2, 120, 'HEAD HR & GA', ['OKTAVIANA'], 'terisi', 5, C_HEAD_ALT);
  const pm = makeCard(2, 380, 'PROJECT MANAGER', ['(VACANT)'], 'kosong', 5, C_HEAD_ALT);
  const headLogPur = makeCard(2, 600, 'HEAD LOGISTIC & PURCHASING', ['AMER'], 'terisi', 5, C_HEAD_ALT);
  const headFat = makeCard(2, 860, 'HEAD FAT & ADMINISTRATION', ['SANTONO'], 'terisi', 5, C_HEAD_ALT);

  // Lane 3: Supervisor
  const hrSpv = makeCard(3, 80, 'HR SPV', ['(VACANT)'], 'kosong', 4, C_SPV);
  const gaSpv = makeCard(3, 180, 'GA SPV', ['(VACANT)'], 'kosong', 4, C_SPV);
  const op = makeCard(3, 380, 'OPERATIONAL', ['KEVIN', '(VACANT)'], 'terisi', 4, C_SPV);
  const purchasing = makeCard(3, 540, 'PURCHASING', ['ARIS YUSUF'], 'terisi', 4, C_SPV);
  const logistic = makeCard(3, 640, 'LOGISTIC', ['SUDIN'], 'terisi', 4, C_SPV);
  const peralatanMe = makeCard(3, 740, 'PERALATAN / ME', ['(VACANT)'], 'kosong', 4, C_SPV);
  const arapSpv = makeCard(3, 840, 'AR & AP SPV', ['(VACANT)'], 'kosong', 4, C_SPV);
  const accTaxSpv = makeCard(3, 960, 'ACC & TAX SPV', ['(VACANT)'], 'kosong', 4, C_SPV);

  // Lane 4: Staff
  const hrStaff = makeCard(4, 80, 'HR STAFF', ['(VACANT)'], 'kosong', 2, C_STAFF);
  const gaStaff = makeCard(4, 180, 'GA STAFF', ['(VACANT)'], 'kosong', 2, C_STAFF);
  const eng = makeCard(4, 280, 'ENGINEER', ['CHRISTIANTO'], 'terisi', 2, C_STAFF);
  const est = makeCard(4, 360, 'ESTIMATOR', ['(VACANT)'], 'kosong', 2, C_STAFF);
  const dft = makeCard(4, 440, 'DRAFTER', ['(VACANT)'], 'kosong', 2, C_STAFF);
  const pel = makeCard(4, 520, 'PELAKSANA', ['(VACANT)'], 'kosong', 2, C_STAFF);
  const purStaff = makeCard(4, 600, 'PURCHASING STAFF', ['NAFTALI'], 'terisi', 2, C_STAFF);
  const ac = makeCard(4, 680, 'AC', ['SURAHMAN'], 'terisi', 2, C_STAFF);
  const listrik = makeCard(4, 760, 'LISTRIK', ['(VACANT)'], 'kosong', 2, C_STAFF);
  const alatBerat = makeCard(4, 840, 'PERALATAN ALAT BERAT', ['HERMAN', 'SODIKIN'], 'terisi', 2, C_STAFF);
  const arapStaff = makeCard(4, 920, 'AR & AP', ['DITA ZELNI'], 'terisi', 2, C_STAFF);
  const genAdmin1 = makeCard(4, 1000, 'GENERAL ADMIN', ['(VACANT)'], 'kosong', 2, C_STAFF);
  const accTaxStaff = makeCard(4, 1080, 'ACC & TAX', ['FADILA'], 'terisi', 2, C_STAFF);
  const genAdmin2 = makeCard(4, 1160, 'GENERAL ADMIN', ['(VACANT)'], 'kosong', 2, C_STAFF);

  // Lane 5: Mandor & Operator
  const mandor = makeCard(5, 460, 'MANDOR', ['(VACANT)'], 'kosong', 1, C_STAFF);
  const operator = makeCard(5, 560, 'OPERATOR', ['HARIAN / BORONGAN'], 'kosong', 1, C_INTERN);

  const cards = [
    com, dir, holding,
    mgrLeft, mgrRight,
    headHrGa, pm, headLogPur, headFat,
    hrSpv, gaSpv, op, purchasing, logistic, peralatanMe, arapSpv, accTaxSpv,
    hrStaff, gaStaff, eng, est, dft, pel, purStaff, ac, listrik, alatBerat, arapStaff, genAdmin1, accTaxStaff, genAdmin2,
    mandor, operator,
  ];

  const edges: Edge[] = [
    makeEdge(com.id, dir.id),
    makeEdge(dir.id, holding.id, true),
    makeEdge(dir.id, mgrLeft.id),
    makeEdge(dir.id, mgrRight.id),
    makeEdge(mgrLeft.id, headHrGa.id),
    makeEdge(mgrLeft.id, pm.id),
    makeEdge(mgrRight.id, headLogPur.id),
    makeEdge(mgrRight.id, headFat.id),
    // HR & GA
    makeEdge(headHrGa.id, hrSpv.id),
    makeEdge(headHrGa.id, gaSpv.id),
    makeEdge(hrSpv.id, hrStaff.id),
    makeEdge(gaSpv.id, gaStaff.id),
    // Project & Operasional
    makeEdge(pm.id, op.id),
    makeEdge(op.id, eng.id),
    makeEdge(op.id, est.id),
    makeEdge(op.id, dft.id),
    makeEdge(op.id, pel.id),
    makeEdge(pel.id, mandor.id),
    makeEdge(mandor.id, operator.id),
    // Purchasing & Logistic
    makeEdge(headLogPur.id, purchasing.id),
    makeEdge(headLogPur.id, logistic.id),
    makeEdge(headLogPur.id, peralatanMe.id),
    makeEdge(purchasing.id, purStaff.id),
    makeEdge(peralatanMe.id, ac.id),
    makeEdge(peralatanMe.id, listrik.id),
    makeEdge(peralatanMe.id, alatBerat.id),
    // FAT & Administration
    makeEdge(headFat.id, arapSpv.id),
    makeEdge(headFat.id, accTaxSpv.id),
    makeEdge(arapSpv.id, arapStaff.id),
    makeEdge(arapStaff.id, genAdmin1.id),
    makeEdge(accTaxSpv.id, accTaxStaff.id),
    makeEdge(accTaxStaff.id, genAdmin2.id),
  ];

  const items: AnnotationItem[] = [
    {
      id: uid(),
      t: 'legend',
      x: 35,
      y: 900,
      w: 250,
      showTitle: true,
      showPositionStatus: true,
      showCardShapes: false,
      showLineStyles: true,
      showStructuralLv: false,
      showIcLv: false,
    },
  ];

  return {
    id: uid(),
    name: 'PT IKI',
    title: 'PT INTERSKALA KONSTRUKSI INDONESIA - STRUKTUR ORGANISASI',
    H: 1300,
    lanes,
    cards,
    edges,
    items,
    showHc: true,
    edgeOrigin: 'front',
    edgeEntry: 'front',
  };
};

// ============================================================================
// 2. PT INTERNASIONAL TEKNIK SOLUSINDO (ITS SCALE - GREEN LAKE)
// Swimlanes = LEVEL JABATAN (sesuai Legenda PDF SO ITS)
// ============================================================================
export const createItsPage = (): Page => {
  const lanes: Lane[] = [
    { id: uid(), name: 'Executive Controller', w: 320 },
    { id: uid(), name: 'Manager', w: 320 },
    { id: uid(), name: 'Head', w: 320 },
    { id: uid(), name: 'Supervisor', w: 320 },
    { id: uid(), name: 'Staff', w: 340 },
    { id: uid(), name: 'Internship', w: 320 },
  ];

  // Lane 0: Executive Controller
  const execCtrl = makeCard(0, 480, 'Executive Controller', ['ANGEL'], 'terisi', 8, C_EXEC_CONTROLLER);

  // Lane 1: Manager
  const mgrMkt = makeCard(1, 160, 'MARKETING MANAGER', ['(VACANT)'], 'kosong', 6, C_MANAGER);
  const mgrOps = makeCard(1, 480, 'OPERATIONS MANAGER', ['(VACANT)'], 'kosong', 6, C_MANAGER);
  const mgrFat = makeCard(1, 880, 'FAT MANAGER', ['(VACANT)'], 'kosong', 6, C_MANAGER);

  // Lane 2: Head
  const headSales = makeCard(2, 90, 'HEAD SALES', ['NINANIR'], 'terisi', 5, C_HEAD);
  const headMkt = makeCard(2, 230, 'HEAD MARKETING', ['(VACANT)'], 'kosong', 5, C_HEAD);
  const headOps = makeCard(2, 480, 'HEAD OPERATION', ['JASYNTHA'], 'terisi', 5, C_HEAD);
  const headFat = makeCard(2, 880, 'HEAD FAT', ['-'], 'kosong', 5, C_HEAD);

  // Lane 3: Supervisor
  const salesSpv = makeCard(3, 60, 'SALES SPV', ['(VACANT)'], 'kosong', 4, C_SPV);
  const cwSpv = makeCard(3, 160, 'CONTENT WRITER SPV', ['(VACANT)'], 'kosong', 4, C_SPV);
  const dmSpv = makeCard(3, 260, 'DIGITAL MARKETING SPV', ['ERICK M YUSUF'], 'terisi', 4, C_SPV);
  const whLogSpv = makeCard(3, 380, 'WARE HOUSE & LOGISTIC SPV', ['MULYADI'], 'terisi', 4, C_SPV);
  const techSpv = makeCard(3, 480, 'TECHNICIAN SPV', ['(VACANT)'], 'kosong', 4, C_SPV);
  const itSpv = makeCard(3, 580, 'IT SPV', ['(VACANT)'], 'kosong', 4, C_SPV);
  const hrLegalSpv = makeCard(3, 680, 'HR & LEGAL SPV', ['OKTAVIANA'], 'terisi', 4, C_SPV);
  const gaSpv = makeCard(3, 760, 'GA SPV', ['(VACANT)'], 'kosong', 4, C_SPV);
  const purSpv = makeCard(3, 840, 'PURCHASING SPV', ['SUSI'], 'terisi', 4, C_SPV);
  const fatSpv = makeCard(3, 940, 'FAT SPV', ['(VACANT)'], 'kosong', 4, C_SPV);

  // Lane 4: Staff
  const salesStaff = makeCard(4, 50, 'SALES STAFF', ['NAUFAL', 'WAHYU', 'DIKKY (CIKARANG)', 'RUDI (CIKARANG)'], 'terisi', 2, C_STAFF);
  const salesAsst = makeCard(4, 120, 'SALES ASSISTANT', ['JULY MOND', 'AFRIZAL', 'DIO ALFIONSO', '(VACANT)'], 'terisi', 2, C_STAFF);
  const cwStaff1 = makeCard(4, 180, 'CONTENT WRITER', ['(VACANT)'], 'kosong', 2, C_STAFF);
  const cwStaff2 = makeCard(4, 230, 'CONTENT WRITER', ['M.SADAM RIZKY'], 'terisi', 2, C_STAFF);
  const videoEd = makeCard(4, 280, 'VIDEO EDITOR', ['(VACANT)'], 'kosong', 2, C_STAFF);
  const desGraph = makeCard(4, 330, 'DESIGN GRAPHICS', ['KEVIN JUNICO'], 'terisi', 2, C_STAFF);
  const webDev = makeCard(4, 380, 'WEB DEV', ['GISTA'], 'terisi', 2, C_STAFF);
  const whStaff = makeCard(4, 440, 'WAREHOUSE STAFF', ['IRFAN', 'NANANG (CIKARANG)'], 'terisi', 2, C_STAFF);
  const logStaff = makeCard(4, 500, 'LOGISTIC STAFF', ['ADMIN : AGUS TRIAWAN', 'PENGIRIMAN : M.ARIF'], 'terisi', 2, C_STAFF);
  const techStaff = makeCard(4, 560, 'TECHNICIAN', ['WIKA DIAN', 'ALWAHDI', 'RADEN MUHAMMAD R.N', 'NUR ROHMAN (CIKARANG)', 'KHOLIK'], 'terisi', 2, C_STAFF);
  const itProg = makeCard(4, 630, 'IT PROGRAMMER', ['MUHAMMAD YUNUS'], 'terisi', 2, C_STAFF);
  const itSupp = makeCard(4, 680, 'IT SUPPORT', ['ALANDRI TJIANG'], 'terisi', 2, C_STAFF);
  const hrLegalStaff = makeCard(4, 730, 'HR & LEGAL STAFF', ['MARIA ANGEL'], 'terisi', 2, C_STAFF);
  const gaStaff = makeCard(4, 780, 'GA STAFF', ['MICHELE LEE'], 'terisi', 2, C_STAFF);
  const ob = makeCard(4, 830, 'OB', ['SAEPUL'], 'terisi', 1, C_STAFF);
  const purStaff = makeCard(4, 880, 'PURCHASING STAFF', ['NAFTALI'], 'terisi', 2, C_STAFF);
  const arStaff = makeCard(4, 940, 'AR STAFF', ['MIKA'], 'terisi', 2, C_STAFF);
  const apStaff = makeCard(4, 990, 'AP STAFF', ['AYU', 'MARIA THERESIA', 'NISSA (CIKARANG)'], 'terisi', 2, C_STAFF);
  const taxStaff = makeCard(4, 1050, 'TAX STAFF', ['MICHELLE LEE'], 'terisi', 2, C_STAFF);

  // Lane 5: Internship
  const salesAsstIntern = makeCard(5, 120, 'SALES ASSISTANT INTERN', ['(VACANT)'], 'kosong', 1, C_INTERN);
  const cwIntern = makeCard(5, 230, 'VIDEO EDITOR & CC INTERN', ['SAFIRA NAJWA AULIA', 'RAPHAEL EPHRAIM K'], 'terisi', 1, C_INTERN);
  const desGraphIntern = makeCard(5, 330, 'DESIGN GRAPHICS INTERN', ['VANESSA VALENCIA FU'], 'terisi', 1, C_INTERN);
  const webDevIntern = makeCard(5, 380, 'WEB DEV INTERN', ['WALLACE GRISVEN'], 'terisi', 1, C_INTERN);
  const pklWh = makeCard(5, 440, 'PKL ADMIN WAREHOUSE', ['EKA MULYATI'], 'terisi', 1, C_INTERN);
  const techIntern = makeCard(5, 560, 'ADMIN TEKNISI INTERN', ['(VACANT)'], 'kosong', 1, C_INTERN);
  const taxIntern = makeCard(5, 1050, 'TAX INTERN', ['CYRANIA GRACEILA S'], 'terisi', 1, C_INTERN);

  const cards = [
    execCtrl,
    mgrMkt, mgrOps, mgrFat,
    headSales, headMkt, headOps, headFat,
    salesSpv, cwSpv, dmSpv, whLogSpv, techSpv, itSpv, hrLegalSpv, gaSpv, purSpv, fatSpv,
    salesStaff, salesAsst, cwStaff1, cwStaff2, videoEd, desGraph, webDev, whStaff, logStaff,
    techStaff, itProg, itSupp, hrLegalStaff, gaStaff, ob, purStaff, arStaff, apStaff, taxStaff,
    salesAsstIntern, cwIntern, desGraphIntern, webDevIntern, pklWh, techIntern, taxIntern,
  ];

  const edges: Edge[] = [
    makeEdge(execCtrl.id, mgrMkt.id),
    makeEdge(execCtrl.id, mgrOps.id),
    makeEdge(execCtrl.id, mgrFat.id),
    // Mkt
    makeEdge(mgrMkt.id, headSales.id),
    makeEdge(mgrMkt.id, headMkt.id),
    makeEdge(headSales.id, salesSpv.id),
    makeEdge(headMkt.id, cwSpv.id),
    makeEdge(headMkt.id, dmSpv.id),
    makeEdge(salesSpv.id, salesStaff.id),
    makeEdge(salesSpv.id, salesAsst.id),
    makeEdge(salesAsst.id, salesAsstIntern.id),
    makeEdge(cwSpv.id, cwStaff1.id),
    makeEdge(cwSpv.id, cwStaff2.id),
    makeEdge(cwStaff2.id, cwIntern.id),
    makeEdge(dmSpv.id, videoEd.id),
    makeEdge(dmSpv.id, desGraph.id),
    makeEdge(desGraph.id, desGraphIntern.id),
    makeEdge(dmSpv.id, webDev.id),
    makeEdge(webDev.id, webDevIntern.id),
    // Ops
    makeEdge(mgrOps.id, headOps.id),
    makeEdge(headOps.id, whLogSpv.id),
    makeEdge(headOps.id, techSpv.id),
    makeEdge(headOps.id, itSpv.id),
    makeEdge(headOps.id, hrLegalSpv.id),
    makeEdge(headOps.id, gaSpv.id),
    makeEdge(headOps.id, purSpv.id),
    makeEdge(whLogSpv.id, whStaff.id),
    makeEdge(whStaff.id, pklWh.id),
    makeEdge(whLogSpv.id, logStaff.id),
    makeEdge(techSpv.id, techStaff.id),
    makeEdge(techStaff.id, techIntern.id),
    makeEdge(itSpv.id, itProg.id),
    makeEdge(itSpv.id, itSupp.id),
    makeEdge(hrLegalSpv.id, hrLegalStaff.id),
    makeEdge(gaSpv.id, gaStaff.id),
    makeEdge(gaStaff.id, ob.id),
    makeEdge(purSpv.id, purStaff.id),
    // FAT
    makeEdge(mgrFat.id, headFat.id),
    makeEdge(headFat.id, fatSpv.id),
    makeEdge(fatSpv.id, arStaff.id),
    makeEdge(fatSpv.id, apStaff.id),
    makeEdge(fatSpv.id, taxStaff.id),
    makeEdge(taxStaff.id, taxIntern.id),
  ];

  const items: AnnotationItem[] = [
    {
      id: uid(),
      t: 'text',
      x: 35,
      y: 80,
      w: 240,
      text: 'DEPARTEMENT & TOTAL HEADCOUNT:\n- SALES: 9\n- DIGITAL MARKETING: 10\n- OPERATION: 18\n- PURCHASING: 2\n- FAT: 8\nTOTAL HEADCOUNT: 47',
      fs: 11,
      b: true,
    },
    {
      id: uid(),
      t: 'text',
      x: 35,
      y: 920,
      w: 250,
      text: 'NOTES:\n• Tim IMI yang terlibat di ITS ditandai warna huruf putih.\n• Advisor ditandai garis putus-putus.\n• Pengambil keputusan ditandai garis tegas.\n• REVISI 10 : 26 JANUARI 2026',
      fs: 10,
    },
  ];

  return {
    id: uid(),
    name: 'PT ITS',
    title: 'PT INTERNASIONAL TEKNIK SOLUSINDO (GREEN LAKE) - REVISI 10',
    H: 1250,
    lanes,
    cards,
    edges,
    items,
    showHc: true,
    edgeOrigin: 'front',
    edgeEntry: 'front',
  };
};

// ============================================================================
// 3. PT INTERSKALA MANDIRI INDONESIA (IMI)
// Swimlanes = LEVEL JABATAN (sesuai Legenda PDF SO IMI)
// ============================================================================
export const createImiPage = (): Page => {
  const lanes: Lane[] = [
    { id: uid(), name: 'Komisaris', w: 320 },
    { id: uid(), name: 'Direktur', w: 320 },
    { id: uid(), name: 'Manager', w: 320 },
    { id: uid(), name: 'Head Division', w: 320 },
    { id: uid(), name: 'Supervisor', w: 320 },
    { id: uid(), name: 'Staff', w: 350 },
    { id: uid(), name: 'Operator & Driver', w: 330 },
    { id: uid(), name: 'Internship', w: 320 },
  ];

  // Lane 0: Komisaris
  const com = makeCard(0, 600, 'COMMISIONER', ['SANTONO'], 'terisi', 10, C_COMMISSIONER);

  // Lane 1: Direktur
  const dir = makeCard(1, 600, 'DIRECTOR', ['LIA MARIYANTI'], 'terisi', 9, C_DIRECTOR);

  // Lane 2: Manager
  const mgrLab = makeCard(2, 120, 'LABORATARY MANAGER', ['LIA MARIYANTI (DIREKSI)'], 'terisi', 6, C_MANAGER);
  const mgrOps = makeCard(2, 340, 'MANAGER OPERATION', ['(VACANT)'], 'kosong', 6, C_MANAGER);
  const mgrScm = makeCard(2, 600, 'MANAGER SCM', ['(VACANT)'], 'kosong', 6, C_MANAGER);
  const mgrHc = makeCard(2, 860, 'MANAGER HUMAN CAPITAL', ['(VACANT)'], 'kosong', 6, C_MANAGER);
  const mgrAccFap = makeCard(2, 1100, 'MANAGER ACC & FAP', ['(VACANT)'], 'kosong', 6, C_MANAGER);
  const mgrTaxFar = makeCard(2, 1320, 'MANAGER TAX & FAR', ['M. FARIZ NURFAJAR'], 'terisi', 6, C_MANAGER);

  // Lane 3: Head Division
  const headTech = makeCard(3, 80, 'HEAD TECHNICAL', ['FRANS S. MANALU'], 'terisi', 5, C_HEAD);
  const headQuality = makeCard(3, 160, 'HEAD QUALITY', ['HAPOSAN'], 'terisi', 5, C_HEAD);
  const headServiceRnd = makeCard(3, 240, 'HEAD SERVICE & RND', ['(VACANT)'], 'kosong', 5, C_HEAD);
  const headPurchasing = makeCard(3, 320, 'HEAD PURCHASING', ['(VACANT)'], 'kosong', 5, C_HEAD);
  const headSales = makeCard(3, 400, 'HEAD SALES', ['PRATIKNO'], 'terisi', 5, C_HEAD);
  const headPr = makeCard(3, 480, 'HEAD PUBLIC RELATIONS', ['(VACANT)'], 'kosong', 5, C_HEAD);
  const headDigMkt = makeCard(3, 560, 'HEAD DIGITAL MARKETING', ['KRESNA YUWANA'], 'terisi', 5, C_HEAD);
  const headLog = makeCard(3, 640, 'HEAD LOGISTICS', ['(VACANT)'], 'kosong', 5, C_HEAD);
  const headWh = makeCard(3, 720, 'HEAD WAREHOUSE', ['(VACANT)'], 'kosong', 5, C_HEAD);
  const headItSoft = makeCard(3, 800, 'HEAD IT SOFTWARE', ['(VACANT)'], 'kosong', 5, C_HEAD);
  const headHrGen = makeCard(3, 880, 'HEAD HR GENERALIST', ['OKTAVIANA'], 'terisi', 5, C_HEAD);
  const headPod = makeCard(3, 960, 'HEAD POD', ['(VACANT)'], 'kosong', 5, C_HEAD);
  const headLegal = makeCard(3, 1040, 'HEAD LEGAL & COMPLIANCE', ['(VACANT)'], 'kosong', 5, C_HEAD);
  const headGa = makeCard(3, 1120, 'HEAD GA', ['AMER'], 'terisi', 5, C_HEAD);
  const headAcc = makeCard(3, 1200, 'HEAD ACCOUNTING', ['(VACANT)'], 'kosong', 5, C_HEAD);
  const headFinAp = makeCard(3, 1280, 'HEAD FINANCE (AP)', ['(VACANT)'], 'kosong', 5, C_HEAD);
  const headFinAr = makeCard(3, 1360, 'HEAD FINANCE (AR)', ['(VACANT)'], 'kosong', 5, C_HEAD);
  const headTax = makeCard(3, 1440, 'HEAD TAX', ['(VACANT)'], 'kosong', 5, C_HEAD);

  // Lane 4: Supervisor
  const serviceRndSpv = makeCard(4, 240, 'SERVICE & RND SPV', ['SAEPULOH'], 'terisi', 4, C_SPV);
  const purSpv = makeCard(4, 320, 'PURCHASING SPV', ['SUSI SUSANTI'], 'terisi', 4, C_SPV);
  const salesSpv = makeCard(4, 400, 'SALES SPV', ['MUHAMMAD BAHRI'], 'terisi', 4, C_SPV);
  const prSpv = makeCard(4, 480, 'PUBLIC RELATIONS SPV', ['ARI WIBOWO'], 'terisi', 4, C_SPV);
  const webGraphSpv = makeCard(4, 540, 'WEB & GRAPHIC DESIGNER SPV', ['GISTA MELANDY'], 'terisi', 4, C_SPV);
  const videoSpv = makeCard(4, 580, 'EDITOR & VIDEOGRAPHER SPV', ['(VACANT)'], 'kosong', 4, C_SPV);
  const cwCreativeSpv = makeCard(4, 620, 'CONTENT WRITER & CREATIVE SPV', ['(VACANT)'], 'kosong', 4, C_SPV);
  const logSpv = makeCard(4, 660, 'LOGISTICS SPV', ['TIHANAH'], 'terisi', 4, C_SPV);
  const whSpv = makeCard(4, 720, 'WAREHOUSE SPV', ['(VACANT)'], 'kosong', 4, C_SPV);
  const itSoftSpv = makeCard(4, 800, 'IT SOFTWARE SPV', ['FERDIAN'], 'terisi', 4, C_SPV);
  const podSpv = makeCard(4, 880, 'POD SPV', ['M. SADAM R.'], 'terisi', 4, C_SPV);
  const hrSpv = makeCard(4, 940, 'HUMAN RESOURCE SPV', ['(VACANT)'], 'kosong', 4, C_SPV);
  const dccSpv = makeCard(4, 1000, 'DCC SPV', ['(VACANT)'], 'kosong', 4, C_SPV);
  const legalSpv = makeCard(4, 1060, 'LEGAL SPV', ['MARIA ANGEL'], 'terisi', 4, C_SPV);
  const gaOpsSpv = makeCard(4, 1120, 'GA OPERATION SPV', ['(VACANT)'], 'kosong', 4, C_SPV);
  const itHwElecSpv = makeCard(4, 1180, 'IT HARDWARE & ELECTRICAL SPV', ['ALANDRI TJIANG'], 'terisi', 4, C_SPV);
  const accSpv = makeCard(4, 1240, 'ACCOUNTING SPV', ['(VACANT)'], 'kosong', 4, C_SPV);
  const apSpv = makeCard(4, 1300, 'ACCOUNT PAYABLE SPV', ['LILIS YULIANI'], 'terisi', 4, C_SPV);
  const arSpv = makeCard(4, 1360, 'ACCOUNT RECEIVABLE SPV', ['FARISTINA'], 'terisi', 4, C_SPV);
  const taxSpv = makeCard(4, 1440, 'TAX SPV', ['(VACANT)'], 'kosong', 4, C_SPV);

  // Lane 5: Staff
  const labTech = makeCard(5, 70, 'LABORATORY TECHNICIAN', ['SAEPULLOH', 'AGUS YULIONO', 'RONY YAHYA', 'WAHYU FIRMANSYAH'], 'terisi', 2, C_STAFF);
  const labOps = makeCard(5, 140, 'OPERATIONAL LAB', ['VAREN GRISELA'], 'terisi', 2, C_STAFF);
  const serviceStaff = makeCard(5, 200, 'SERVICE & SPARE PART', ['AGUS YULIONO', 'ARMANTO', 'RADEN SYARIF H.', 'RONY YAHYA', 'RUDIYANTO', 'WAHYU FIRMANSYAH', 'ANGEL AULIA PERDANA', 'MUHAMMAD AKBAR'], 'terisi', 2, C_STAFF);
  const rndStaff = makeCard(5, 250, 'RESEARCH & DEVELOPMENT', ['AGUNG HADI P', 'TRI PRIANTO', 'FERDINAND CHARLES', 'REGINA GRICELA'], 'terisi', 2, C_STAFF);
  const serviceAdmin = makeCard(5, 300, 'SERVICE & SPARE PART ADMIN', ['MUHAMMAD IQBAL M', 'ASEP SUPRIATNA'], 'terisi', 2, C_STAFF);
  const purLocal = makeCard(5, 340, 'LOCAL PURCHASING', ['ARIS YUSUP', 'FERAWATI', 'ADE RACHMAH'], 'terisi', 2, C_STAFF);
  const purImport = makeCard(5, 380, 'IMPORT PURCHASING', ['SARI VUJI ASIH', 'TANTOWI'], 'terisi', 2, C_STAFF);
  const salesStaff = makeCard(5, 420, 'SALES', ['JAMALUDIN', 'NOVA DWI ARIYANTO', 'AFIFAH FAUZIAH', 'KARINA ANGLE LEE', 'AHMAD MUZAKI'], 'terisi', 2, C_STAFF);
  const salesAdmin = makeCard(5, 460, 'ADMIN SALES', ['SISKA HESTIANI', 'VAREN GRISSELA', 'GANDHI KUNTOYUDHO', 'ANDIEN LUTFIYYAH'], 'terisi', 2, C_STAFF);
  const prStaff = makeCard(5, 500, 'PUBLIC RELATIONS', ['(VACANT)'], 'kosong', 2, C_STAFF);
  const webDes = makeCard(5, 540, 'WEB & GRAPHIC DESIGNER', ['(STAFF DESIGN)'], 'terisi', 2, C_STAFF);
  const videoStaff = makeCard(5, 570, 'EDITOR & VIDEOGRAPHER', ['WILLIAM TRIADI'], 'terisi', 2, C_STAFF);
  const cwStaff = makeCard(5, 600, 'CONTENT WRITER & CREATIVE', ['ADRIAN BACHTIAR'], 'terisi', 2, C_STAFF);
  const adminLog = makeCard(5, 640, 'ADMIN LOGISTICS', ['SITI ROCHMAH', 'M. RIZAL S'], 'terisi', 2, C_STAFF);
  const coordWh = makeCard(5, 690, 'COORDINATOR WAREHOUSE', ['DANDI SAPUTRO', 'RAFAEL PUTRA', 'SAM’UN', 'FENDI SUPRAPTO', 'SIGIT AFANDI'], 'terisi', 2, C_STAFF);
  const adminWh = makeCard(5, 740, 'ADMIN WAREHOUSE', ['DIMAS ADJI BAYU P.'], 'terisi', 2, C_STAFF);
  const itSoftStaff = makeCard(5, 800, 'IT SOFTWARE', ['MUHAMAD YUNUS'], 'terisi', 2, C_STAFF);
  const hrRec = makeCard(5, 840, 'HR RECRUITMENT', ['YUDA PERMANA'], 'terisi', 2, C_STAFF);
  const hrAdm = makeCard(5, 880, 'HR ADMINISTRATION', ['FIRDA LATIZA'], 'terisi', 2, C_STAFF);
  const podStaff = makeCard(5, 920, 'POD STAFF', ['(VACANT)'], 'kosong', 2, C_STAFF);
  const legalStaff = makeCard(5, 960, 'LEGAL', ['HAPOSAN HARAHAP'], 'terisi', 2, C_STAFF);
  const dccStaff = makeCard(5, 1000, 'DOCUMENT CONTROL CENTER', ['(VACANT)'], 'kosong', 2, C_STAFF);
  const receptionist = makeCard(5, 1040, 'RECEPTIONIST', ['NURDELIA SUHERMAN'], 'terisi', 2, C_STAFF);
  const gaStaff = makeCard(5, 1080, 'GA', ['RIO PRAMEIYUDHA'], 'terisi', 2, C_STAFF);
  const buildMaint = makeCard(5, 1120, 'BUILDING MAINTENANCE', ['SUHENDRA', 'SURAHMAN', 'AINUL YAKIN'], 'terisi', 2, C_STAFF);
  const electrical = makeCard(5, 1160, 'ELECTRICAL', ['MUHAMAD HUSEN'], 'terisi', 2, C_STAFF);
  const itSupport = makeCard(5, 1200, 'IT SUPPORT', ['DAFIT AHMAD Z.', 'ALFARIS TRIADI'], 'terisi', 2, C_STAFF);
  const accStaff = makeCard(5, 1240, 'ACCOUNTING', ['TIARA MAYLIA', 'YESHINTA CHAMAS', 'RACHEL CHRISTINA'], 'terisi', 2, C_STAFF);
  const apStaff = makeCard(5, 1290, 'ACCOUNT PAYABLE', ['AMANDA', 'CLARISSA', 'SLAMET SUAEDI'], 'terisi', 2, C_STAFF);
  const arStaff = makeCard(5, 1340, 'ACCOUNT RECEIVABLE', ['ERNA PUTRI', 'NADIAH PUTRI'], 'terisi', 2, C_STAFF);
  const taxStaff = makeCard(5, 1400, 'TAX', ['AFIFAH PUTRI YANI', 'VALEN FEBRIANTI K.', 'IMANATA HIRA'], 'terisi', 2, C_STAFF);

  // Lane 6: Operator, Driver & Courier
  const oprWh = makeCard(6, 690, 'OPERATOR WAREHOUSE', ['RIZKA MAULANA', 'AGUNG SAPUTRA', 'AGUNG WIDODO', 'SYAH RIZAL', 'RESTU AHMAR', 'HAIRUL ANWAR', 'NUR ALIM', 'ALAN PURNATA', 'ALI MUSON', 'DAVA ARIELLA', 'ANAS AMRULLAH', 'ALFARIZHI RAIHAN', 'HAIKAL YAKIN', 'FARID ADITYA', 'AHMAD KHAERUL HASBI', 'FARIS IBRAHIM', 'IRSANDI PUTRA', 'MUHAMMAD RIZAL S.'], 'terisi', 1, C_STAFF);
  const driverCourier = makeCard(6, 800, 'DRIVER & COURIER', ['RUDI HERMANTO', 'KARNO SURYONO', 'DADANG PRIATNA', 'JOKO SANTOSO', 'RIZKY SEPTIAN', 'HERU HIDAYAT', 'PAHRI'], 'terisi', 1, C_STAFF);
  const ob = makeCard(6, 1120, 'OB', ['BAYU', 'MAULANA'], 'terisi', 1, C_STAFF);

  // Lane 7: Internship
  const rndIntern = makeCard(7, 250, 'R&D INTERN', ['TIANA RAMDANI'], 'terisi', 1, C_INTERN);
  const localIntern = makeCard(7, 340, 'LOCAL INTERN', ['YUDHA PUTRA DARMAWAN'], 'terisi', 1, C_INTERN);
  const ccIntern = makeCard(7, 540, 'CONTENT CREATOR INTERN', ['INDAH SAFITRI', 'FERNANDO FELIX S.'], 'terisi', 1, C_INTERN);
  const cwCreativeIntern = makeCard(7, 600, 'CONTENT WRITER & CREATIVE INTERN', ['YESICA KIRANA'], 'terisi', 1, C_INTERN);
  const logIntern = makeCard(7, 640, 'LOGISTIC INTERN', ['AXL MARTYN'], 'terisi', 1, C_INTERN);
  const whIntern = makeCard(7, 720, 'WAREHOUSE INTERN', ['(VACANT)'], 'kosong', 1, C_INTERN);
  const hrAdmIntern = makeCard(7, 840, 'HR ADMINISTRATION INTERN', ['(VACANT)'], 'kosong', 1, C_INTERN);
  const hrRecIntern = makeCard(7, 880, 'HR RECRUITMENT INTERN', ['AKMAL REZA'], 'terisi', 1, C_INTERN);
  const podIntern = makeCard(7, 920, 'POD INTERN', ['(VACANT)'], 'kosong', 1, C_INTERN);
  const legalIntern = makeCard(7, 960, 'LEGAL INTERN', ['MOHD. IKBAL EFER'], 'terisi', 1, C_INTERN);
  const gaIntern = makeCard(7, 1080, 'ADMIN GA INTERN', ['HADYWINATA PANGESTU'], 'terisi', 1, C_INTERN);
  const itSuppIntern = makeCard(7, 1200, 'IT SUPPORT INTERN', ['(VACANT)'], 'kosong', 1, C_INTERN);
  const taxIntern = makeCard(7, 1400, 'TAX INTERN', ['STEPHANIE ANASTASIA'], 'terisi', 1, C_INTERN);

  const cards = [
    com, dir,
    mgrLab, mgrOps, mgrScm, mgrHc, mgrAccFap, mgrTaxFar,
    headTech, headQuality, headServiceRnd, headPurchasing, headSales, headPr, headDigMkt, headLog, headWh,
    headItSoft, headHrGen, headPod, headLegal, headGa, headAcc, headFinAp, headFinAr, headTax,
    serviceRndSpv, purSpv, salesSpv, prSpv, webGraphSpv, videoSpv, cwCreativeSpv, logSpv, whSpv, itSoftSpv,
    podSpv, hrSpv, dccSpv, legalSpv, gaOpsSpv, itHwElecSpv, accSpv, apSpv, arSpv, taxSpv,
    labTech, labOps, serviceStaff, rndStaff, serviceAdmin, purLocal, purImport, salesStaff, salesAdmin, prStaff,
    webDes, videoStaff, cwStaff, adminLog, coordWh, adminWh, itSoftStaff, hrRec, hrAdm, podStaff, legalStaff,
    dccStaff, receptionist, gaStaff, buildMaint, electrical, itSupport, accStaff, apStaff, arStaff, taxStaff,
    oprWh, driverCourier, ob,
    rndIntern, localIntern, ccIntern, cwCreativeIntern, logIntern, whIntern, hrAdmIntern, hrRecIntern, podIntern,
    legalIntern, gaIntern, itSuppIntern, taxIntern,
  ];

  const edges: Edge[] = [
    makeEdge(com.id, dir.id),
    makeEdge(dir.id, mgrLab.id),
    makeEdge(dir.id, mgrOps.id),
    makeEdge(dir.id, mgrScm.id),
    makeEdge(dir.id, mgrHc.id),
    makeEdge(dir.id, mgrAccFap.id),
    makeEdge(dir.id, mgrTaxFar.id),
    // Lab
    makeEdge(mgrLab.id, headTech.id),
    makeEdge(mgrLab.id, headQuality.id),
    makeEdge(headTech.id, labTech.id),
    makeEdge(headQuality.id, labOps.id),
    // Ops
    makeEdge(mgrOps.id, headServiceRnd.id),
    makeEdge(mgrOps.id, headPurchasing.id),
    makeEdge(mgrOps.id, headSales.id),
    makeEdge(mgrOps.id, headPr.id),
    makeEdge(mgrOps.id, headDigMkt.id),
    makeEdge(headServiceRnd.id, serviceRndSpv.id),
    makeEdge(serviceRndSpv.id, serviceStaff.id),
    makeEdge(serviceRndSpv.id, rndStaff.id),
    makeEdge(rndStaff.id, rndIntern.id),
    makeEdge(serviceRndSpv.id, serviceAdmin.id),
    makeEdge(headPurchasing.id, purSpv.id),
    makeEdge(purSpv.id, purLocal.id),
    makeEdge(purLocal.id, localIntern.id),
    makeEdge(purSpv.id, purImport.id),
    makeEdge(headSales.id, salesSpv.id),
    makeEdge(salesSpv.id, salesStaff.id),
    makeEdge(salesSpv.id, salesAdmin.id),
    makeEdge(headPr.id, prSpv.id),
    makeEdge(prSpv.id, prStaff.id),
    makeEdge(headDigMkt.id, webGraphSpv.id),
    makeEdge(webGraphSpv.id, webDes.id),
    makeEdge(webGraphSpv.id, ccIntern.id),
    makeEdge(headDigMkt.id, videoSpv.id),
    makeEdge(videoSpv.id, videoStaff.id),
    makeEdge(headDigMkt.id, cwCreativeSpv.id),
    makeEdge(cwCreativeSpv.id, cwStaff.id),
    makeEdge(cwCreativeSpv.id, cwCreativeIntern.id),
    // SCM
    makeEdge(mgrScm.id, headLog.id),
    makeEdge(mgrScm.id, headWh.id),
    makeEdge(headLog.id, logSpv.id),
    makeEdge(logSpv.id, adminLog.id),
    makeEdge(logSpv.id, driverCourier.id),
    makeEdge(adminLog.id, logIntern.id),
    makeEdge(headWh.id, whSpv.id),
    makeEdge(whSpv.id, coordWh.id),
    makeEdge(coordWh.id, oprWh.id),
    makeEdge(whSpv.id, adminWh.id),
    makeEdge(adminWh.id, whIntern.id),
    // HC
    makeEdge(mgrHc.id, headItSoft.id),
    makeEdge(headItSoft.id, itSoftSpv.id),
    makeEdge(itSoftSpv.id, itSoftStaff.id),
    makeEdge(mgrHc.id, headHrGen.id),
    makeEdge(headHrGen.id, hrSpv.id),
    makeEdge(hrSpv.id, hrRec.id),
    makeEdge(hrRec.id, hrRecIntern.id),
    makeEdge(hrSpv.id, hrAdm.id),
    makeEdge(hrAdm.id, hrAdmIntern.id),
    makeEdge(mgrHc.id, headPod.id),
    makeEdge(headPod.id, podSpv.id),
    makeEdge(podSpv.id, podStaff.id),
    makeEdge(podStaff.id, podIntern.id),
    makeEdge(mgrHc.id, headLegal.id),
    makeEdge(headLegal.id, dccSpv.id),
    makeEdge(dccSpv.id, dccStaff.id),
    makeEdge(headLegal.id, legalSpv.id),
    makeEdge(legalSpv.id, legalStaff.id),
    makeEdge(legalStaff.id, legalIntern.id),
    makeEdge(mgrHc.id, headGa.id),
    makeEdge(headGa.id, gaOpsSpv.id),
    makeEdge(gaOpsSpv.id, receptionist.id),
    makeEdge(gaOpsSpv.id, gaStaff.id),
    makeEdge(gaStaff.id, gaIntern.id),
    makeEdge(gaOpsSpv.id, buildMaint.id),
    makeEdge(buildMaint.id, ob.id),
    makeEdge(headGa.id, itHwElecSpv.id),
    makeEdge(itHwElecSpv.id, electrical.id),
    makeEdge(itHwElecSpv.id, itSupport.id),
    makeEdge(itSupport.id, itSuppIntern.id),
    // ACC & FAP
    makeEdge(mgrAccFap.id, headAcc.id),
    makeEdge(headAcc.id, accSpv.id),
    makeEdge(accSpv.id, accStaff.id),
    makeEdge(mgrAccFap.id, headFinAp.id),
    makeEdge(headFinAp.id, apSpv.id),
    makeEdge(apSpv.id, apStaff.id),
    // TAX & FAR
    makeEdge(mgrTaxFar.id, headFinAr.id),
    makeEdge(headFinAr.id, arSpv.id),
    makeEdge(arSpv.id, arStaff.id),
    makeEdge(mgrTaxFar.id, headTax.id),
    makeEdge(headTax.id, taxSpv.id),
    makeEdge(taxSpv.id, taxStaff.id),
    makeEdge(taxStaff.id, taxIntern.id),
  ];

  const items: AnnotationItem[] = [
    {
      id: uid(),
      t: 'text',
      x: 35,
      y: 80,
      w: 240,
      text: 'TOTAL HEADCOUNT PER DIVISION:\n- LABORATORIUM: 6\n- HR & LEGAL: 7\n- GA, IT HW & ELEC: 16\n- SALES: 13\n- DIGITAL MARKETING: 9\n- TEKNISI, RND & SSC: 16\n- IT SOFTWARE: 3\n- PURCHASING: 8\n- WAREHOUSE: 26\n- LOGISTICS: 13\n- ACCOUNTING: 5\n- FINANCE AP: 5\n- FINANCE AR: 6\n- TAX: 5\nTOTAL HEADCOUNT: 138',
      fs: 10.5,
      b: true,
    },
    {
      id: uid(),
      t: 'text',
      x: 35,
      y: 920,
      w: 240,
      text: 'PT INTERSKALA MANDIRI INDONESIA\nIMPORTER, DISTRIBUTOR & MANUFACTURER SCALE\nKAN CERTIFIED COMPANY NO. 18 ID H 18109\nDOC NO : IMI/LAB/QA/SO-01',
      fs: 10,
    },
  ];

  return {
    id: uid(),
    name: 'PT IMI',
    title: 'PT INTERSKALA MANDIRI INDONESIA (IMI/LAB/QA/SO-01)',
    H: 1550,
    lanes,
    cards,
    edges,
    items,
    showHc: true,
    edgeOrigin: 'front',
    edgeEntry: 'front',
  };
};

// ============================================================================
// 4. PT INTERSKALA INVESTAMA INDONESIA (III - HOLDING GROUP)
// Swimlanes = LEVEL JABATAN (sesuai Bagan SO III)
// ============================================================================
export const createIiiPage = (): Page => {
  const lanes: Lane[] = [
    { id: uid(), name: 'Komisaris', w: 320 },
    { id: uid(), name: 'Direktur & Sekretaris', w: 320 },
    { id: uid(), name: 'Manager', w: 320 },
    { id: uid(), name: 'Head', w: 320 },
    { id: uid(), name: 'Supervisor', w: 320 },
    { id: uid(), name: 'Staff', w: 320 },
    { id: uid(), name: 'Internship', w: 320 },
  ];

  // Lane 0: Komisaris
  const com = makeCard(0, 360, 'COMMISSIONER', ['SHERVYALING'], 'terisi', 10, C_COMMISSIONER);

  // Lane 1: Direktur & Sekretaris
  const dir = makeCard(1, 360, 'DIRECTOR', ['ANG HIM HIM'], 'terisi', 9, C_DIRECTOR);
  const sec = makeCard(1, 520, 'SECRETARY', ['(VACANT)'], 'kosong', 4, C_CONSULTANT);

  // Lane 2: Manager
  const mgrHr = makeCard(2, 120, 'HR MANAGER', ['(VACANT)'], 'kosong', 6, C_MANAGER);
  const mgrOps = makeCard(2, 320, 'OPERATIONS MANAGER', ['NURYANI'], 'terisi', 6, C_MANAGER);
  const mgrFat = makeCard(2, 540, 'FAT MANAGER', ['SANTONO'], 'terisi', 6, C_MANAGER);
  const mgrIa = makeCard(2, 700, 'INTERNAL AUDIT MANAGER', ['(VACANT)'], 'kosong', 6, C_MANAGER);

  // Lane 3: Head
  const headHr = makeCard(3, 120, 'HEAD HR', ['(VACANT)'], 'kosong', 5, C_HEAD);
  const headGa = makeCard(3, 220, 'HEAD GA', ['AMER'], 'terisi', 5, C_HEAD);
  const headPur = makeCard(3, 300, 'HEAD PURCHASING', ['(VACANT)'], 'kosong', 5, C_HEAD);
  const headIt = makeCard(3, 380, 'HEAD IT', ['(VACANT)'], 'kosong', 5, C_HEAD);
  const headFin = makeCard(3, 460, 'HEAD FINANCE', ['NURYANI'], 'terisi', 5, C_HEAD);
  const headAcc = makeCard(3, 540, 'HEAD ACCOUNTING', ['(VACANT)'], 'kosong', 5, C_HEAD);
  const headTax = makeCard(3, 620, 'HEAD TAX', ['ARIF'], 'terisi', 5, C_HEAD);

  // Lane 4: Supervisor
  const hrSpv = makeCard(4, 80, 'HR SPV', ['(VACANT)'], 'kosong', 4, C_SPV);
  const legalSpv = makeCard(4, 130, 'LEGAL SPV', ['(VACANT)'], 'kosong', 4, C_SPV);
  const podSpv = makeCard(4, 180, 'PEOPLE DEVELOPMENT SPV', ['(VACANT)'], 'kosong', 4, C_SPV);
  const gaSpv = makeCard(4, 240, 'GA SPV', ['(VACANT)'], 'kosong', 4, C_SPV);
  const purSpv = makeCard(4, 300, 'PURCHASING SPV', ['SUSI'], 'terisi', 4, C_SPV);
  const progSpv = makeCard(4, 350, 'IT PROGRAMMER SPV', ['(VACANT)'], 'kosong', 4, C_SPV);
  const suppSpv = makeCard(4, 400, 'IT SUPPORT SPV', ['(VACANT)'], 'kosong', 4, C_SPV);
  const webDevSpv = makeCard(4, 450, 'IT WEB DEVELOPER SPV', ['GISTA'], 'terisi', 4, C_SPV);
  const finSpv = makeCard(4, 500, 'FINANCE SPV', ['(VACANT)'], 'kosong', 4, C_SPV);
  const accSpv = makeCard(4, 550, 'ACCOUNTING SPV', ['(VACANT)'], 'kosong', 4, C_SPV);
  const taxSpv = makeCard(4, 600, 'TAX SPV', ['(VACANT)'], 'kosong', 4, C_SPV);
  const iaSpv = makeCard(4, 700, 'INTERNAL AUDIT SPV', ['HENRI'], 'terisi', 4, C_SPV);

  // Lane 5: Staff
  const finStaff = makeCard(5, 500, 'FINANCE STAFF', ['DONNA'], 'terisi', 2, C_STAFF);
  const accStaff = makeCard(5, 550, 'ACCOUNTING STAFF', ['RACHEL'], 'terisi', 2, C_STAFF);

  // Lane 6: Internship
  const iaIntern = makeCard(6, 700, 'INTERNAL AUDIT INTERN', ['(VACANT)'], 'kosong', 1, C_INTERN);

  const cards = [
    com, dir, sec,
    mgrHr, mgrOps, mgrFat, mgrIa,
    headHr, headGa, headPur, headIt, headFin, headAcc, headTax,
    hrSpv, legalSpv, podSpv, gaSpv, purSpv, progSpv, suppSpv, webDevSpv, finSpv, accSpv, taxSpv, iaSpv,
    finStaff, accStaff,
    iaIntern,
  ];

  const edges: Edge[] = [
    makeEdge(com.id, dir.id),
    makeEdge(dir.id, sec.id, true),
    makeEdge(dir.id, mgrHr.id),
    makeEdge(dir.id, mgrOps.id),
    makeEdge(dir.id, mgrFat.id),
    makeEdge(dir.id, mgrIa.id),
    // HR
    makeEdge(mgrHr.id, headHr.id),
    makeEdge(headHr.id, hrSpv.id),
    makeEdge(headHr.id, legalSpv.id),
    makeEdge(headHr.id, podSpv.id),
    // Ops
    makeEdge(mgrOps.id, headGa.id),
    makeEdge(headGa.id, gaSpv.id),
    makeEdge(mgrOps.id, headPur.id),
    makeEdge(headPur.id, purSpv.id),
    makeEdge(mgrOps.id, headIt.id),
    makeEdge(headIt.id, progSpv.id),
    makeEdge(headIt.id, suppSpv.id),
    makeEdge(headIt.id, webDevSpv.id),
    // FAT
    makeEdge(mgrFat.id, headFin.id),
    makeEdge(headFin.id, finSpv.id),
    makeEdge(finSpv.id, finStaff.id),
    makeEdge(mgrFat.id, headAcc.id),
    makeEdge(headAcc.id, accSpv.id),
    makeEdge(accSpv.id, accStaff.id),
    makeEdge(mgrFat.id, headTax.id),
    makeEdge(headTax.id, taxSpv.id),
    // Internal Audit
    makeEdge(mgrIa.id, iaSpv.id),
    makeEdge(iaSpv.id, iaIntern.id),
  ];

  const items: AnnotationItem[] = [
    {
      id: uid(),
      t: 'text',
      x: 35,
      y: 920,
      w: 260,
      text: 'PT INTERSKALA INVESTAMA INDONESIA\nCOMPANY GROUP ORGANIZATIONAL STRUCTURE\nUPDATE : 02 / MARET / 2026',
      fs: 11,
      b: true,
    },
  ];

  return {
    id: uid(),
    name: 'PT III',
    title: 'PT INTERSKALA INVESTAMA INDONESIA - COMPANY GROUP ORGANIZATIONAL STRUCTURE',
    H: 1050,
    lanes,
    cards,
    edges,
    items,
    showHc: true,
    edgeOrigin: 'front',
    edgeEntry: 'front',
  };
};

export const createInterskalaProject = (): ProjectState => {
  return {
    cur: 0,
    compact: false,
    paper: 'A3',
    orient: 'landscape',
    tpl: [],
    pages: [
      createIkiPage(),
      createItsPage(),
      createImiPage(),
      createIiiPage(),
    ],
  };
};
