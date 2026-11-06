import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
import { findSefaArchitectureV1Violations } from '../scripts/lib/architecture-v1-package.mjs';

test('review has bilingual vocabulary cards and the requested question mix', async () => {
  const pkg = JSON.parse(await readFile('public/homeworks/2026-11-01-r4m7k2p9qx/homework.json', 'utf8'));
  assert.deepEqual(findSefaArchitectureV1Violations(pkg), []);
  assert.equal(pkg.days.length, 4);
  assert.equal(new Set(pkg.days.map((day) => JSON.stringify(day.reading.paragraphs))).size, 4);
  for (const day of pkg.days) {
    assert.ok(day.words.length >= 10 && day.words.length <= 15);
    assert.ok(day.words.every((word) => word.en && word.definition && word.example && word.tr && word.exampleTr));
    assert.equal(day.test.length, 15);
    for (const reading of day.readings || [day.reading]) {
      assert.equal(reading.questions.length, 5);
      assert.equal(reading.questions.filter((q) => q.options.length === 3).length, 3);
      assert.equal(reading.questions.filter((q) => q.options.length === 2 && q.options[0] === 'True' && q.options[1] === 'False').length, 2);
    }
  }
});
