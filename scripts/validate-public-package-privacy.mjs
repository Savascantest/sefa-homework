import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { assertPublicPackagePrivacy } from './lib/public-package-privacy.mjs';

const root = 'public/homeworks';
const entries = await readdir(root, { withFileTypes: true });
const packagePaths = entries.filter((entry) => entry.isDirectory()).map((entry) => join(root, entry.name, 'homework.json')).sort();

for (const packagePath of packagePaths) {
  assertPublicPackagePrivacy(JSON.parse(await readFile(packagePath, 'utf8')), packagePath);
}
assertPublicPackagePrivacy(JSON.parse(await readFile(join(root, 'index.json'), 'utf8')), 'public/homeworks/index.json');
console.log(`Validated ${packagePaths.length} public homework package(s) and the archive index.`);
