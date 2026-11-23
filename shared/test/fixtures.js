// 테스트 공용: 픽스처와 설정 읽기
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

export const FIXTURE_NAMES = [
  'side_good',
  'side_shallow',
  'side_lean',
  'side_fast',
  'side_occluded',
  'side_mixed',
];
export const loadFixture = (name) => readJson(`fixtures/${name}.json`);
export const loadExpected = () => readJson('fixtures/expected.json');
export const loadConfig = (exercise = 'squat') => readJson(`core/config/${exercise}.json`);
export const readText = (p) => readFileSync(join(ROOT, p), 'utf8');
