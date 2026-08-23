import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('public/homeworks');
const lessons = fs.readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => {
    const relative = `${entry.name}/homework.json`;
    const data = JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
    if (!data.id || !data.date || !data.meetingUuid || !Array.isArray(data.days) || data.days.length !== 4) {
      throw new Error(`Invalid four-day homework package: ${relative}`);
    }
    return { id: data.id, date: data.date, title: data.title, subtitle: data.subtitle, meetingUuid: data.meetingUuid, path: relative };
  })
  .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

fs.writeFileSync(path.join(root, 'index.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), lessons }, null, 2)}\n`);
console.log(`Indexed ${lessons.length} homework package(s).`);
