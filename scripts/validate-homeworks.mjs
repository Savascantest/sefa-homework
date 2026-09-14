import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { assertSefaArchitectureV1Package } from './lib/architecture-v1-package.mjs';
import { assertPublicPackagePrivacy } from './lib/public-package-privacy.mjs';

const root = 'public/homeworks';
const entries = await readdir(root, { withFileTypes: true });
const packagePaths = entries.filter((entry) => entry.isDirectory()).map((entry) => join(root, entry.name, 'homework.json')).sort();

for (const packagePath of packagePaths) {
  const pkg = JSON.parse(await readFile(packagePath, 'utf8'));
  assertPublicPackagePrivacy(pkg, packagePath);
  assertSefaArchitectureV1Package(pkg, packagePath);
}
assertPublicPackagePrivacy(JSON.parse(await readFile(join(root, 'index.json'), 'utf8')), 'public/homeworks/index.json');
console.log(`Validated ${packagePaths.length} public homework package(s), the archive index, and future Sefa Architecture v1 requirements.`);
