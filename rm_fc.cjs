const fs = require('fs');
let c = fs.readFileSync('src/pages/Projects.tsx', 'utf-8');
c = c.replace("import { formatCurrency } from '../lib/VNDToWords';", "");
fs.writeFileSync('src/pages/Projects.tsx', c, 'utf-8');
