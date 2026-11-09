/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CardColor, CardShape, TemplateCard } from './types';

export const CARD_WIDTH = 250;
export const PARALLELOGRAM_SKEW = 20;

export const LANE_COLOR = '#E6E6E6';
export const LANE_STROKE = '#9A9990';

export const LANE_COLOR_PRESETS: { name: string; value: string }[] = [
  { name: 'Abu-abu (Default)', value: '#E6E6E6' },
  { name: 'Putih Bersih', value: '#FFFFFF' },
  { name: 'Warm Grey', value: '#F1EFE8' },
  { name: 'Mint Soft', value: '#E1F5EE' },
  { name: 'Sky Blue', value: '#E6F1FB' },
  { name: 'Warm Amber', value: '#FAEEDA' },
  { name: 'Lavender Soft', value: '#EEEDFE' },
  { name: 'Coral Soft', value: '#FAECE7' },
];

export const CARD_DEFAULT_COLOR: CardColor = {
  f: '#FFFFFF',
  s: '#5F5E5A',
  t: '#222222',
};

export const COLOR_PALETTES: CardColor[] = [
  { f: '#FFFFFF', s: '#5F5E5A', t: '#222222' },
  { f: '#E1F5EE', s: '#0F6E56', t: '#085041' },
  { f: '#E6F1FB', s: '#185FA5', t: '#0C447C' },
  { f: '#FAEEDA', s: '#BA7517', t: '#633806' },
  { f: '#EEEDFE', s: '#534AB7', t: '#3C3489' },
  { f: '#FAECE7', s: '#993C1D', t: '#712B13' },
  { f: '#F1EFE8', s: '#5F5E5A', t: '#2C2C2A' },
];

export const STATUS_COLORS: Record<string, string> = {
  terisi: '#1D9E75',
  kosong: '#E24B4A',
  rekrut: '#EF9F27',
};

export const LEVEL_PLACEHOLDER = '[level jabatan]';

// Levels mapping: Display names only, without L1, L2, L3 prefixes as requested
export const LEVEL_TITLES: {
  S: Record<number, string>;
  I: Record<number, string>;
} = {
  S: {
    1: 'Junior Staff',
    2: 'Staff',
    3: 'Senior Staff',
    4: 'Supervisor',
    5: 'Manager',
    6: 'Senior Manager',
    7: 'General Manager',
    8: 'Senior General Manager',
    9: 'Direktur',
    10: 'Direktur Utama',
  },
  I: {
    1: 'Individual Contributor',
    2: 'Individual Contributor',
    3: 'Senior Individual Contributor',
    4: 'Jr. Specialist',
    5: 'Specialist',
    6: 'Sr. Specialist',
    7: 'Lead Specialist',
    8: 'Principal Specialist',
    9: 'Principal',
    10: 'Sr. Principal',
  },
};

// Distinct level options for selectors (without L-numbers)
export const LEVEL_OPTIONS = {
  S: [
    { value: 'S1', label: 'Junior Staff' },
    { value: 'S2', label: 'Staff' },
    { value: 'S3', label: 'Senior Staff' },
    { value: 'S4', label: 'Supervisor' },
    { value: 'S5', label: 'Manager' },
    { value: 'S6', label: 'Senior Manager' },
    { value: 'S7', label: 'General Manager' },
    { value: 'S8', label: 'Senior General Manager' },
    { value: 'S9', label: 'Direktur' },
    { value: 'S10', label: 'Direktur Utama' },
  ],
  I: [
    { value: 'I1', label: 'Individual Contributor' },
    { value: 'I3', label: 'Senior Individual Contributor' },
    { value: 'I4', label: 'Jr. Specialist' },
    { value: 'I5', label: 'Specialist' },
    { value: 'I6', label: 'Sr. Specialist' },
    { value: 'I7', label: 'Lead Specialist' },
    { value: 'I9', label: 'Principal' },
    { value: 'I10', label: 'Sr. Principal' },
  ],
};

// Legend level progression strings without L1, L2, L3 tags
export const LEGEND_LEVEL_TEXTS = [
  'Level jabatan, jalur struktural: Junior Staff / Staff / Senior Staff → Supervisor → Manager → General Manager → Direktur',
  'Level jabatan, jalur Individual Contributor: Individual Contributor → Jr. Specialist → Specialist → Sr. Specialist → Principal → Sr. Principal',
];

export const SHAPES_CONFIG: [CardShape, string][] = [
  ['box', 'Kotak (Standar)'],
  ['box-d', 'Kotak putus-putus (Level tidak sesuai lane)'],
  ['box-2', 'Kotak garis ganda (Posisi boleh ada/tidak)'],
  ['para', 'Jajargenjang (Fungsional / Non-struktural)'],
  ['para-d', 'Jajargenjang putus-putus (Fungsional; level di luar lane)'],
  ['para-2', 'Jajargenjang garis ganda (Fungsional opsional)'],
];

export const SHAPE_DESCRIPTIONS_DEFAULT = [
  '',
  'Level jabatan tidak sesuai dengan lane',
  'Posisi boleh ada, boleh tidak',
  'Ada secara fungsional, bukan bagian dari struktur organisasi',
  'Ada secara fungsional, bukan bagian dari struktur organisasi; level jabatan tidak sesuai dengan lane',
  'Posisi fungsional opsional',
];

export const BUILT_IN_TEMPLATES: TemplateCard[] = [
  {
    n: 'Staf (jajargenjang, tanpa foto)',
    c: COLOR_PALETTES[5],
    jab: 'Staf',
    names: ['Nama 1', 'Nama 2', 'Nama 3', 'Nama 4'],
    st: 'terisi',
    shape: 'para',
    np: true,
    cols: 2,
    lv: 2,
    tr: 'S',
  },
  {
    n: 'Posisi Kosong (Vacant)',
    c: COLOR_PALETTES[5],
    jab: 'Jabatan Kosong',
    names: ['(Posisi kosong)'],
    st: 'kosong',
    shape: 'box',
    lv: 5,
    tr: 'S',
  },
  {
    n: 'Pejabat Sementara (Plt.)',
    c: COLOR_PALETTES[2],
    jab: 'Plt. Manager',
    names: ['Plt. Nama'],
    st: 'terisi',
    shape: 'box',
    lv: 5,
    tr: 'S',
  },
];
