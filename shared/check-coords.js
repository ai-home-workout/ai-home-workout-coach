// 좌표 JSON이 계약 형식(shared/README.md ①)을 지키는지 검사해요.
// 사용법: npm run check:coords -- data/coords   (파일 하나나 폴더)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { checkVideoCoords } from './contracts.js';

const target = process.argv[2];
if (!target) {
  console.error('사용법: npm run check:coords -- <좌표 JSON 파일 또는 폴더>');
  process.exit(1);
}
const files = statSync(target).isDirectory()
  ? readdirSync(target)
      .filter((f) => f.endsWith('.json'))
      .map((f) => join(target, f))
  : [target];

let bad = 0;
for (const file of files) {
  const doc = JSON.parse(readFileSync(file, 'utf8'));
  if (!('frames' in doc)) continue;
  const problems = checkVideoCoords(doc);
  if (problems.length) {
    bad += 1;
    console.log(`✗ ${file}\n  ${problems.slice(0, 5).join('\n  ')}`);
  } else {
    console.log(`✓ ${file} (프레임 ${doc.frames.length}개, ${doc.view})`);
  }
}
process.exit(bad ? 1 : 0);
