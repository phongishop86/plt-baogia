const fs = require('fs');
const newTable = fs.readFileSync('new_table.txt', 'utf8');
let c = fs.readFileSync('src/pages/Documents.tsx', 'utf-8');
const lines = c.split('\n');
const start = lines.findIndex(l => l.includes('<table className="min-w-full divide-y divide-gray-200">'));
let end = -1;
for (let i = start; i < lines.length; i++) {
  if (lines[i].includes('</table>')) {
    end = i;
    break;
  }
}
lines.splice(start, end - start + 1, newTable);
fs.writeFileSync('src/pages/Documents.tsx', lines.join('\n'));
console.log('done');
