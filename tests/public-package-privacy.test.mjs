import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';
import { createPublicHomeworkIndex } from '../scripts/build-homework-index.mjs';
import {
  assertPublicPackagePrivacy,
  findPublicPackagePrivacyViolations,
  isSafeFuturePublicPackageId
} from '../scripts/lib/public-package-privacy.mjs';

const normalPackage = {
  id: '2026-09-14-k7m3p9v2x4q8',
  date: '2026-09-14',
  title: 'Kısa İngilizce tekrar',
  lessonNotes: 'Örnekleri dikkatle oku ve doğru seçeneği bul.',
  listening: { source: 'British Council A1', url: 'https://learnenglish.britishcouncil.org/' },
  days: []
};

test('Turkish learner-facing educational content and public listening resources pass', () => {
  assert.deepEqual(findPublicPackagePrivacyViolations(normalPackage), []);
  assert.equal(isSafeFuturePublicPackageId(normalPackage.id), true);
});

test('private fields are rejected recursively', () => {
  for (const field of [
    'meetingUuid', 'meetingId', 'teacherNote', 'teacherNotes', 'transcriptPath',
    'lessonRecordPath', 'routerState', 'executionReceipt', 'privatePlanningNotes', 'sourceHash'
  ]) {
    assert.throws(() => assertPublicPackagePrivacy({ ...normalPackage, nested: { [field]: 'private' } }), new RegExp(field, 'i'));
  }
  assert.throws(() => assertPublicPackagePrivacy({ ...normalPackage, resource: { path: 'C:\\private\\lesson-record.json' } }), /private filesystem path/);
});

test('a generated index containing a meeting UUID fails', () => {
  assert.throws(() => assertPublicPackagePrivacy({ lessons: [{ ...normalPackage, meetingUuid: 'private' }] }, 'index'), /meetingUuid/);
});

test('full raw UUID-like public identifiers fail while historical opaque prefixes remain compatible', () => {
  assert.throws(() => assertPublicPackagePrivacy({ ...normalPackage, id: '2026-09-14-c59cf3f8-a99e-42a7-9871-0c6590ab3787' }), /raw UUID-like/);
  assert.throws(() => assertPublicPackagePrivacy({ ...normalPackage, id: '2026-09-14-uuid' }), /safe opaque identifier/);
  assert.equal(isSafeFuturePublicPackageId('2026-08-29-4A67D954'), false);
});

test('repaired historical packages and the generated safe archive index pass', async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/homeworks');
  const index = createPublicHomeworkIndex(root);
  assert.deepEqual(findPublicPackagePrivacyViolations(index), []);
  assert.equal(index.lessons.length, 3);
  for (const lesson of index.lessons) {
    const packageData = JSON.parse(await readFile(path.join(root, lesson.path), 'utf8'));
    assert.deepEqual(findPublicPackagePrivacyViolations(packageData), []);
  }
});
