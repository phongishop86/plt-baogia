const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf-8');

// Import
c = c.replace(
  "import InvoiceReconciliation from './pages/InvoiceReconciliation';",
  "import InvoiceReconciliation from './pages/InvoiceReconciliation';\nimport CommissionTracking from './pages/CommissionTracking';"
);

// Add to NavGroup under "Công cụ"
// Wait, the "Chấm hoá đơn" NavItem is inside NavGroup, maybe I can just append it before </NavGroup>.
c = c.replace(
  "</NavGroup>",
  `  <NavItem \n                  icon={<DollarSign size={20} className="text-yellow-600" />} \n                  label="Theo dõi hoa hồng" \n                  active={activeTab === 'commission'} \n                  onClick={() => handleTabClick('commission')} \n                />\n              </>\n            )}\n          </NavGroup>`
);

// Wait, the replacement above is a bit risky because I appended `</>\n            )}\n` without removing it from the original file. Let's find exactly where to insert it.
c = fs.readFileSync('src/App.tsx', 'utf-8');
c = c.replace(
  "import InvoiceReconciliation from './pages/InvoiceReconciliation';",
  "import InvoiceReconciliation from './pages/InvoiceReconciliation';\nimport CommissionTracking from './pages/CommissionTracking';"
);

c = c.replace(
  `onClick={() => handleTabClick('invoice-reconciliation')} 
                />
              </>`,
  `onClick={() => handleTabClick('invoice-reconciliation')} 
                />
                <NavItem 
                  icon={<Calculator size={20} className="text-yellow-600" />} 
                  label="Theo dõi hoa hồng" 
                  active={activeTab === 'commission'} 
                  onClick={() => handleTabClick('commission')} 
                />
              </>`
);

c = c.replace(
  "{activeTab === 'invoice-reconciliation' && <InvoiceReconciliation />}",
  "{activeTab === 'invoice-reconciliation' && <InvoiceReconciliation />}\n        {activeTab === 'commission' && <CommissionTracking />}"
);

c = c.replace(
  "activeTab === 'invoice-reconciliation' ? 'Chấm hoá đơn' :",
  "activeTab === 'invoice-reconciliation' ? 'Chấm hoá đơn' :\n                activeTab === 'commission' ? 'Theo dõi hoa hồng' :"
);

fs.writeFileSync('src/App.tsx', c);
console.log('done');
