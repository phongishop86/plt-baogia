const fs = require('fs');
let c = fs.readFileSync('src/pages/Documents.tsx', 'utf-8');
c = c.replace(
  '  return (\n    <div className="space-y-6">\n      \n      {/* Filters and Stats */}',
  `  return (
    <div className="space-y-6">
      <style>
        {\`
          @media print {
            @page { size: landscape; margin: 10mm; }
            table { font-size: 11px; }
            th, td { padding-left: 0.5rem !important; padding-right: 0.5rem !important; }
            th > div { min-width: 0 !important; }
          }
        \`}
      </style>
      
      {/* Filters and Stats */}`
);
c = c.replace(
  '  return (\r\n    <div className="space-y-6">\r\n      \r\n      {/* Filters and Stats */}',
  `  return (
    <div className="space-y-6">
      <style>
        {\`
          @media print {
            @page { size: landscape; margin: 10mm; }
            table { font-size: 11px; }
            th, td { padding-left: 0.5rem !important; padding-right: 0.5rem !important; }
            th > div { min-width: 0 !important; }
          }
        \`}
      </style>
      
      {/* Filters and Stats */}`
);
fs.writeFileSync('src/pages/Documents.tsx', c);
console.log('done');
