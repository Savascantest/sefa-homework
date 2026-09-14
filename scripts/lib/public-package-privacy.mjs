const EXACT_PRIVATE_FIELD_NAMES = new Set([
  'meetinguuid', 'meetingid', 'teachernote', 'teachernotes', 'sourcemeeting',
  'sourcelessons', 'sourcelessonid', 'transcript', 'transcriptid', 'transcriptpath',
  'transcripthash', 'lessonrecord', 'lessonrecordpath', 'router', 'routerstate',
  'executionreceipt', 'receipt', 'sourcehash', 'sourcepath', 'privatepath',
  'privateplanning', 'privateplanningnotes', 'planningnotes'
]);

const RAW_UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
export const SEFA_SAFE_PUBLIC_ID_EFFECTIVE_DATE = '2026-09-14';
export const FUTURE_PUBLIC_PACKAGE_ID_PATTERN = /^\d{4}-\d{2}-\d{2}-[a-z0-9]{10,24}$/;

function normalizedFieldName(key) {
  return key.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function isPrivateFieldName(key) {
  const normalized = normalizedFieldName(key);
  return EXACT_PRIVATE_FIELD_NAMES.has(normalized)
    || normalized.includes('meetinguuid')
    || normalized.includes('meetingid')
    || normalized.includes('teachernote')
    || normalized.includes('transcript');
}

function isPrivateFilesystemPath(value) {
  return typeof value === 'string' && (
    /^[a-z]:[\\/]/i.test(value)
    || /(?:^|[\\/])work[\\/]private(?:[\\/]|$)/i.test(value)
  );
}

export function isSafeFuturePublicPackageId(value) {
  return typeof value === 'string' && FUTURE_PUBLIC_PACKAGE_ID_PATTERN.test(value);
}

export function findPublicPackagePrivacyViolations(value, path = '$') {
  if (Array.isArray(value)) return value.flatMap((item, index) => findPublicPackagePrivacyViolations(item, `${path}[${index}]`));
  if (!value || typeof value !== 'object') return [];

  const violations = [];
  if (typeof value.date === 'string' && value.date >= SEFA_SAFE_PUBLIC_ID_EFFECTIVE_DATE && !isSafeFuturePublicPackageId(value.id)) {
    violations.push(`${path}.id: future public package IDs must use a safe opaque identifier`);
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (isPrivateFieldName(key)) violations.push(childPath);
    if (isPrivateFilesystemPath(child)) violations.push(`${childPath}: private filesystem path`);
    if (normalizedFieldName(key) === 'id' && typeof child === 'string' && RAW_UUID_PATTERN.test(child)) {
      violations.push(`${childPath}: raw UUID-like public identifier`);
    }
    violations.push(...findPublicPackagePrivacyViolations(child, childPath));
  }
  return violations;
}

export function assertPublicPackagePrivacy(value, label = 'public package') {
  const violations = findPublicPackagePrivacyViolations(value);
  if (violations.length) throw new Error(`${label} contains prohibited private field(s): ${violations.join(', ')}`);
}
