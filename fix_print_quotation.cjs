const fs = require('fs');
let c = fs.readFileSync('src/pages/CreateQuotation.tsx', 'utf-8');
let lines = c.split('\n');
let start = lines.findIndex((l, i) => l.startsWith('  return (') && i > 300);

let style = `      <style>
        {\`
          @media print {
            @page { size: A4 portrait; margin: 10mm 15mm; }
            html, body { 
              font-size: 13px !important;
              zoom: 0.95;
            }
            .print\\\\:p-0 {
              padding: 0 !important;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        \`}
      </style>`;

lines.splice(start + 2, 0, style);
fs.writeFileSync('src/pages/CreateQuotation.tsx', lines.join('\n'));
console.log('done');
