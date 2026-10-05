const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf-8');
c = c.replace(
  "const [activeTab, setActiveTab] = useState('products');",
  "const [activeTab, setActiveTab] = useState('products');\n  const [isToolsOpen, setIsToolsOpen] = useState(false);"
);
fs.writeFileSync('src/App.tsx', c);

// Also remove unused imports from the two new files
let b = fs.readFileSync('src/pages/BankReconciliation.tsx', 'utf-8');
b = b.replace('CheckCircle, AlertTriangle', '');
fs.writeFileSync('src/pages/BankReconciliation.tsx', b);

let i = fs.readFileSync('src/pages/InvoiceReconciliation.tsx', 'utf-8');
i = i.replace("import React from 'react';\n", "");
fs.writeFileSync('src/pages/InvoiceReconciliation.tsx', i);
