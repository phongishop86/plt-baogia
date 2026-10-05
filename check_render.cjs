const fs = require('fs');
let c = fs.readFileSync('src/pages/CreateQuotation.tsx', 'utf-8');
let lines = c.split('\n');
let start = lines.findIndex((l, i) => l.startsWith('  return (') && i > 300);
if (start !== -1) {
    console.log(lines.slice(start, start + 30).join('\n'));
}
