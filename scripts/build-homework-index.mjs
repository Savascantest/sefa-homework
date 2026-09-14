import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function createPublicHomeworkIndex(root) {
  const lessons = fs.readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => {
    const relative = `${entry.name}/homework.json`;
    const data = JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
    if (!data.id || !data.date || !Array.isArray(data.days) || data.days.length !== 4) {
      throw new Error(`Invalid four-day homework package: ${relative}`);
    }
    return { id: data.id, date: data.date, title: data.title, subtitle: data.subtitle, path: relative };
  })
  .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  return { lessons };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = path.resolve('public/homeworks');
  const index = { generatedAt: new Date().toISOString(), ...createPublicHomeworkIndex(root) };
  fs.writeFileSync(path.join(root, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
  console.log(`Indexed ${index.lessons.length} homework package(s).`);
}
