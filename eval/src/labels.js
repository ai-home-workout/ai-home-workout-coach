// 라벨 CSV 읽기 (shared/README.md ④)
import { LABEL_CSV_COLUMNS } from '../../shared/contracts.js';

/**
 * @typedef {{ video: string, repIndex: number, startSec: number, endSec: number, valid: boolean, errorTypes: string[], labeler: string }} LabelRow
 */

/** @param {string} text @returns {LabelRow[]} */
export function parseLabelsCsv(text) {
  const lines = text
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '');
  const header = lines
    .shift()
    ?.split(',')
    .map((h) => h.trim());
  if (header?.join(',') !== LABEL_CSV_COLUMNS.join(',')) {
    throw new Error(`라벨 CSV 헤더가 달라요. 기대: ${LABEL_CSV_COLUMNS.join(',')}`);
  }
  return lines.map((line, i) => {
    const c = line.split(',').map((v) => v.trim());
    if (c.length !== LABEL_CSV_COLUMNS.length) throw new Error(`${i + 2}번째 줄 열 개수가 달라요`);
    return {
      video: c[0],
      repIndex: Number(c[1]),
      startSec: Number(c[2]),
      endSec: Number(c[3]),
      valid: c[4] === '1',
      errorTypes: c[5] ? c[5].split('|') : [],
      labeler: c[6],
    };
  });
}
