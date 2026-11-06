export const SEFA_ARCHITECTURE_V1_EFFECTIVE_DATE = '2026-09-14';
export const SEFA_POLICY_VERSION = 'sefa-turkish-supported-a1-four-day@1';
export const SEFA_TEMPLATE_CONTRACT_VERSION = 'sefa-four-day-six-section@1';
export const SEFA_ASSESSMENT_POLICY_VERSION = 'sefa-daily-mini-test-feedback@1';
export const SEFA_DAILY_TEST_QUESTION_COUNT = 15;
export const SEFA_LEARNER_FEEDBACK_TARGET = '12/15';
export const SEFA_SCORES_AUTOMATICALLY_ESTABLISH_MASTERY = false;

const REQUIRED_DAY_FIELDS = ['rules', 'words', 'practice', 'reading', 'listening', 'test'];

export function isFutureSefaArchitectureV1Package(pkg) {
  return typeof pkg?.date === 'string' && pkg.date >= SEFA_ARCHITECTURE_V1_EFFECTIVE_DATE;
}

export function isValidNoHomeworkOutcome(outcome) {
  return outcome?.outcome === 'NO_HOMEWORK' && outcome.publicPackageCreated === false;
}

function addQuestionViolations(questions, label, violations) {
  if (!Array.isArray(questions)) {
    violations.push(`${label}: must be an array`);
    return;
  }
  const prompts = new Set();
  const ids = new Set();
  questions.forEach((question, index) => {
    const path = `${label}[${index}]`;
    if (!question || typeof question !== 'object') {
      violations.push(`${path}: must be an object`);
      return;
    }
    if (typeof question.prompt !== 'string' || !question.prompt.trim()) violations.push(`${path}.prompt: required`);
    else if (prompts.has(question.prompt.trim())) violations.push(`${path}.prompt: duplicate prompt in the same assessment set`);
    else prompts.add(question.prompt.trim());
    if (!Array.isArray(question.options) || question.options.length < 2 || question.options.some((option) => typeof option !== 'string' || !option.trim())) {
      violations.push(`${path}.options: must contain at least two non-empty choices`);
    }
    if (!Number.isInteger(question.answer) || !Array.isArray(question.options) || question.answer < 0 || question.answer >= question.options.length) {
      violations.push(`${path}.answer: must be a valid option index`);
    }
    if (question.id !== undefined) {
      if (typeof question.id !== 'string' || !question.id.trim()) violations.push(`${path}.id: must be a non-empty string when present`);
      else if (ids.has(question.id)) violations.push(`${path}.id: duplicate question ID in the same assessment set`);
      else ids.add(question.id);
    }
  });
}

function hasObviousFixedPattern(positions) {
  for (let period = 2; period <= Math.min(4, Math.floor(positions.length / 2)); period += 1) {
    if (positions.every((position, index) => position === positions[index % period])) return true;
  }
  return false;
}

function addAnswerDistributionViolations(questions, label, violations) {
  const groups = new Map();
  questions.forEach((question) => {
    if (!Array.isArray(question?.options) || !Number.isInteger(question?.answer) || question.answer < 0 || question.answer >= question.options.length) return;
    const positions = groups.get(question.options.length) || [];
    positions.push(question.answer);
    groups.set(question.options.length, positions);
  });
  for (const [choiceCount, positions] of groups) {
    if (positions.length < 8) continue;
    const counts = Array.from({ length: choiceCount }, (_, position) => positions.filter((answer) => answer === position).length);
    if (counts.some((count) => count === positions.length)) violations.push(`${label}: all correct answers use one option position`);
    else if (Math.max(...counts) > Math.ceil(positions.length * 0.6)) violations.push(`${label}: one answer position is materially dominant`);
    else if (hasObviousFixedPattern(positions)) violations.push(`${label}: answer positions use an obvious fixed pattern`);
  }
}

function addDayViolations(day, index, violations, extendedVocabulary = false) {
  const path = `days[${index}]`;
  if (!day || typeof day !== 'object') {
    violations.push(`${path}: must be an object`);
    return;
  }
  if (typeof day.id !== 'string' || !day.id.trim()) violations.push(`${path}.id: required`);
  for (const field of REQUIRED_DAY_FIELDS) {
    if (day[field] === undefined || day[field] === null) violations.push(`${path}.${field}: required by the six-section Sefa contract`);
  }
  if (!Array.isArray(day.rules)) violations.push(`${path}.rules: must be an array`);
  if (!Array.isArray(day.words) || (extendedVocabulary ? day.words.length < 10 || day.words.length > 15 : day.words.length !== 5)) violations.push(`${path}.words: must contain ${extendedVocabulary ? '10–15 review words' : 'the five-word daily default'}`);
  if (!day.reading || typeof day.reading !== 'object' || !Array.isArray(day.reading.paragraphs) || day.reading.paragraphs.length === 0) violations.push(`${path}.reading: must contain accessible reading content`);
  if (!day.listening || typeof day.listening !== 'object' || typeof day.listening.url !== 'string' || !day.listening.url.trim()) violations.push(`${path}.listening: must contain a public learner-facing resource`);
  if (!Array.isArray(day.test) || day.test.length !== SEFA_DAILY_TEST_QUESTION_COUNT) violations.push(`${path}.test: must contain the fifteen-question daily default`);

  addQuestionViolations(day.practice, `${path}.practice`, violations);
  addQuestionViolations(day.reading?.questions, `${path}.reading.questions`, violations);
  addQuestionViolations(day.test, `${path}.test`, violations);
  if (Array.isArray(day.test)) addAnswerDistributionViolations(day.test, `${path}.test`, violations);
}

export function findSefaArchitectureV1Violations(pkg) {
  if (!isFutureSefaArchitectureV1Package(pkg)) return [];
  const violations = [];
  for (const [field, expected] of Object.entries({
    policyVersion: SEFA_POLICY_VERSION,
    templateContractVersion: SEFA_TEMPLATE_CONTRACT_VERSION,
    assessmentPolicyVersion: SEFA_ASSESSMENT_POLICY_VERSION
  })) {
    if (pkg[field] !== expected) violations.push(`${field}: must equal ${expected}`);
  }
  if (!Array.isArray(pkg.days) || pkg.days.length !== 4) violations.push('days: must contain exactly four days');
  else pkg.days.forEach((day, index) => addDayViolations(day, index, violations, pkg.extendedReviewVocabulary === true));
  return violations;
}

export function assertSefaArchitectureV1Package(pkg, label = 'homework package') {
  const violations = findSefaArchitectureV1Violations(pkg);
  if (violations.length) throw new Error(`${label} violates Sefa Architecture v1: ${violations.join(', ')}`);
}
