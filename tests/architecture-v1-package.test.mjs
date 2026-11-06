import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  SEFA_ARCHITECTURE_V1_EFFECTIVE_DATE,
  SEFA_ASSESSMENT_POLICY_VERSION,
  SEFA_DAILY_TEST_QUESTION_COUNT,
  SEFA_LEARNER_FEEDBACK_TARGET,
  SEFA_POLICY_VERSION,
  SEFA_SCORES_AUTOMATICALLY_ESTABLISH_MASTERY,
  SEFA_TEMPLATE_CONTRACT_VERSION,
  assertSefaArchitectureV1Package,
  findSefaArchitectureV1Violations,
  isValidNoHomeworkOutcome
} from '../scripts/lib/architecture-v1-package.mjs';
import { assertPublicPackagePrivacy } from '../scripts/lib/public-package-privacy.mjs';

const balancedPositions = [0, 1, 2, 3, 1, 3, 0, 2, 2, 0, 3, 1, 3, 2, 1];

function question(prompt, answer = 0, id) {
  return { ...(id ? { id } : {}), prompt, options: ['A', 'B', 'C', 'D'], answer, feedback: 'Açıklama', hint: 'İpucu' };
}

function futureDay(index, positions = balancedPositions) {
  return {
    id: `day-${index + 1}`,
    rules: [{ title: 'Konu', text: 'Kısa açıklama', examples: ['A simple example.'] }],
    words: Array.from({ length: 5 }, (_, word) => ({ en: `word-${index}-${word}`, tr: `kelime-${word}`, definition: 'short meaning', example: 'A simple example.' })),
    practice: [question(`Practice ${index}`)],
    reading: { title: `Reading ${index}`, paragraphs: ['A short accessible paragraph.'], questions: [question(`Reading ${index}`)] },
    listening: { source: 'British Council A1', title: 'Topic listening', instructions: 'Dinle ve not al.', url: 'https://learnenglish.britishcouncil.org/' },
    test: positions.map((answer, number) => question(`Day ${index + 1} test prompt ${number + 1}`, answer, `d${index + 1}-q${number + 1}`))
  };
}

function futurePackage() {
  return {
    id: '2026-09-14-k7m3p9v2x4q8',
    date: '2026-09-14',
    title: 'Future fixture',
    subtitle: 'Private test fixture only',
    policyVersion: SEFA_POLICY_VERSION,
    templateContractVersion: SEFA_TEMPLATE_CONTRACT_VERSION,
    assessmentPolicyVersion: SEFA_ASSESSMENT_POLICY_VERSION,
    days: Array.from({ length: 4 }, (_, index) => futureDay(index))
  };
}

function expectViolation(mutator, expected) {
  const pkg = futurePackage();
  mutator(pkg);
  assert.throws(() => assertSefaArchitectureV1Package(pkg), new RegExp(expected));
}

test('approved future Sefa contract values and non-mastery feedback are fixed', () => {
  assert.equal(SEFA_ARCHITECTURE_V1_EFFECTIVE_DATE, '2026-09-14');
  assert.equal(SEFA_POLICY_VERSION, 'sefa-turkish-supported-a1-four-day@1');
  assert.equal(SEFA_TEMPLATE_CONTRACT_VERSION, 'sefa-four-day-six-section@1');
  assert.equal(SEFA_ASSESSMENT_POLICY_VERSION, 'sefa-daily-mini-test-feedback@1');
  assert.equal(SEFA_DAILY_TEST_QUESTION_COUNT, 15);
  assert.equal(SEFA_LEARNER_FEEDBACK_TARGET, '12/15');
  assert.equal(SEFA_SCORES_AUTOMATICALLY_ESTABLISH_MASTERY, false);
});

test('a complete future Sefa package with balanced deterministic answers passes', () => {
  const pkg = futurePackage();
  assert.deepEqual(findSefaArchitectureV1Violations(pkg), []);
  assert.doesNotThrow(() => assertPublicPackagePrivacy(pkg));
});

test('future packages require exactly the approved Sefa metadata and reject other student IDs', () => {
  for (const [field, value] of [
    ['policyVersion', undefined],
    ['templateContractVersion', undefined],
    ['assessmentPolicyVersion', undefined],
    ['policyVersion', 'sumeyye-weekend-monday@1'],
    ['templateContractVersion', 'eugenia-interactive-hybrid@1'],
    ['assessmentPolicyVersion', 'selin-four-day-seven-tab@1']
  ]) expectViolation((pkg) => { pkg[field] = value; }, field);
});

test('future four-day six-section and workload defaults are structurally enforced', () => {
  expectViolation((pkg) => { pkg.days.pop(); }, 'exactly four days');
  expectViolation((pkg) => { delete pkg.days[0].listening; }, 'six-section');
  expectViolation((pkg) => { pkg.days[0].words.pop(); }, 'five-word');
  expectViolation((pkg) => { pkg.days[0].test.pop(); }, 'fifteen-question');
});

test('future question structure and duplicate safeguards fail closed', () => {
  expectViolation((pkg) => { pkg.days[0].test[1].prompt = pkg.days[0].test[0].prompt; }, 'duplicate prompt');
  expectViolation((pkg) => { pkg.days[0].test[1].id = pkg.days[0].test[0].id; }, 'duplicate question ID');
  expectViolation((pkg) => { pkg.days[0].test[0].options = []; }, 'non-empty choices');
  expectViolation((pkg) => { pkg.days[0].test[0].answer = 8; }, 'valid option index');
});

test('future pathological answer positions fail while ordinary sets are not overconstrained', () => {
  expectViolation((pkg) => { pkg.days[0].test.forEach((item) => { item.answer = 0; }); }, 'all correct answers');
  expectViolation((pkg) => { pkg.days[0].test.forEach((item, index) => { item.answer = index < 12 ? 0 : index - 12; }); }, 'materially dominant');
  expectViolation((pkg) => { pkg.days[0].test.forEach((item, index) => { item.answer = index % 2; }); }, 'obvious fixed pattern');
  const pkg = futurePackage();
  pkg.days[0].practice[0].answer = 0;
  assert.deepEqual(findSefaArchitectureV1Violations(pkg), []);
});

test('privacy-safe identifiers, legitimate listening resources, and private-field rejection integrate with Architecture v1', () => {
  const pkg = futurePackage();
  assert.doesNotThrow(() => assertPublicPackagePrivacy(pkg));
  assert.throws(() => assertPublicPackagePrivacy({ ...pkg, id: '2026-09-14-c59cf3f8-a99e-42a7-9871-0c6590ab3787' }), /UUID-like/);
  assert.throws(() => assertPublicPackagePrivacy({ ...pkg, teacherNote: 'private' }), /teacherNote/);
});

test('historical packages remain valid without v1 metadata or answer-pattern repair', async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/homeworks');
  const entries = await readdir(root, { withFileTypes: true });
  const packagePaths = entries.filter((entry) => entry.isDirectory() && entry.name < SEFA_ARCHITECTURE_V1_EFFECTIVE_DATE).map((entry) => path.join(root, entry.name, 'homework.json'));
  assert.equal(packagePaths.length, 3);
  for (const packagePath of packagePaths) {
    const pkg = JSON.parse(await readFile(packagePath, 'utf8'));
    assert.ok(pkg.date < SEFA_ARCHITECTURE_V1_EFFECTIVE_DATE);
    assert.deepEqual(findSefaArchitectureV1Violations(pkg), []);
  }
});

test('NO_HOMEWORK is a private valid outcome and does not require a public package', () => {
  assert.equal(isValidNoHomeworkOutcome({ outcome: 'NO_HOMEWORK', publicPackageCreated: false }), true);
  assert.equal(isValidNoHomeworkOutcome({ outcome: 'NO_HOMEWORK', publicPackageCreated: true }), false);
  assert.equal(isValidNoHomeworkOutcome({ outcome: 'FAILED', publicPackageCreated: false }), false);
});
