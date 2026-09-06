const fs = require('fs');
let content = fs.readFileSync('src/pages/Projects.tsx', 'utf-8');
const lines = content.split('\n');

// Keep lines 0 to 510 (0-indexed) => line 1 to 511
// Line 511 is "  const [detailTab..."
// Then we skip until line 656 ("  let computedProgress = 0;")
const newLines = [...lines.slice(0, 511), ...lines.slice(656)];

fs.writeFileSync('src/pages/Projects.tsx', newLines.join('\n'), 'utf-8');
