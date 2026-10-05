const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf-8');

c = c.replace(
  /import {([^}]+)Folder } from 'lucide-react';/,
  "import {$1Folder, ChevronDown, Wrench, CheckSquare, FileCheck } from 'lucide-react';"
);

c = c.replace(
  "import LegalDocs from './pages/LegalDocs';",
  "import LegalDocs from './pages/LegalDocs';\nimport BankReconciliation from './pages/BankReconciliation';\nimport InvoiceReconciliation from './pages/InvoiceReconciliation';"
);

// Add NavGroup component
c = c.replace(
  "function NavItem",
  `function NavGroup({ icon, label, children, isOpen, onToggle }: { icon: React.ReactNode, label: string, children: React.ReactNode, isOpen: boolean, onToggle: () => void }) {
  return (
    <div className="space-y-1">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-md transition-colors text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      >
        <div className="flex items-center space-x-3">
          <div className="shrink-0">{icon}</div>
          <span className="truncate">{label}</span>
        </div>
        <ChevronDown className={\`w-4 h-4 transition-transform \${isOpen ? 'rotate-180' : ''}\`} />
      </button>
      {isOpen && (
        <div className="pl-6 space-y-1">
          {children}
        </div>
      )}
    </div>
  );
}

function NavItem`
);

// Add state for tools menu
c = c.replace(
  "const [activeTab, setActiveTab] = useState('dashboard');",
  "const [activeTab, setActiveTab] = useState('dashboard');\n  const [isToolsOpen, setIsToolsOpen] = useState(false);"
);

// Replace Sidebar links
c = c.replace(
  `<NavItem 
            icon={<Search size={20} className="text-orange-500" />} 
            label="Tìm Nguồn Hàng" 
            active={activeTab === 'sourcing'} 
            onClick={() => handleTabClick('sourcing')} 
          />
          <NavItem 
            icon={<Calculator size={20} className="text-emerald-500" />} 
            label="Công cụ tính giá" 
            active={activeTab === 'pricing'} 
            onClick={() => handleTabClick('pricing')} 
          />`,
  `<NavGroup 
            icon={<Wrench size={20} className="text-amber-600" />} 
            label="Công cụ" 
            isOpen={isToolsOpen} 
            onToggle={() => setIsToolsOpen(!isToolsOpen)}
          >
            <NavItem 
              icon={<Search size={20} className="text-orange-500" />} 
              label="Tìm Nguồn Hàng" 
              active={activeTab === 'sourcing'} 
              onClick={() => handleTabClick('sourcing')} 
            />
            <NavItem 
              icon={<Calculator size={20} className="text-emerald-500" />} 
              label="Công cụ tính giá" 
              active={activeTab === 'pricing'} 
              onClick={() => handleTabClick('pricing')} 
            />
            {isKetoan && (
              <>
                <NavItem 
                  icon={<CheckSquare size={20} className="text-blue-500" />} 
                  label="Chấm sao kê" 
                  active={activeTab === 'bank-reconciliation'} 
                  onClick={() => handleTabClick('bank-reconciliation')} 
                />
                <NavItem 
                  icon={<FileCheck size={20} className="text-purple-500" />} 
                  label="Chấm hoá đơn" 
                  active={activeTab === 'invoice-reconciliation'} 
                  onClick={() => handleTabClick('invoice-reconciliation')} 
                />
              </>
            )}
          </NavGroup>`
);

// Fallback for Windows CRLF
c = c.replace(
  `<NavItem \r
            icon={<Search size={20} className="text-orange-500" />} \r
            label="Tìm Nguồn Hàng" \r
            active={activeTab === 'sourcing'} \r
            onClick={() => handleTabClick('sourcing')} \r
          />\r
          <NavItem \r
            icon={<Calculator size={20} className="text-emerald-500" />} \r
            label="Công cụ tính giá" \r
            active={activeTab === 'pricing'} \r
            onClick={() => handleTabClick('pricing')} \r
          />`,
  `<NavGroup 
            icon={<Wrench size={20} className="text-amber-600" />} 
            label="Công cụ" 
            isOpen={isToolsOpen} 
            onToggle={() => setIsToolsOpen(!isToolsOpen)}
          >
            <NavItem 
              icon={<Search size={20} className="text-orange-500" />} 
              label="Tìm Nguồn Hàng" 
              active={activeTab === 'sourcing'} 
              onClick={() => handleTabClick('sourcing')} 
            />
            <NavItem 
              icon={<Calculator size={20} className="text-emerald-500" />} 
              label="Công cụ tính giá" 
              active={activeTab === 'pricing'} 
              onClick={() => handleTabClick('pricing')} 
            />
            {isKetoan && (
              <>
                <NavItem 
                  icon={<CheckSquare size={20} className="text-blue-500" />} 
                  label="Chấm sao kê" 
                  active={activeTab === 'bank-reconciliation'} 
                  onClick={() => handleTabClick('bank-reconciliation')} 
                />
                <NavItem 
                  icon={<FileCheck size={20} className="text-purple-500" />} 
                  label="Chấm hoá đơn" 
                  active={activeTab === 'invoice-reconciliation'} 
                  onClick={() => handleTabClick('invoice-reconciliation')} 
                />
              </>
            )}
          </NavGroup>`
);

// Add page rendering
c = c.replace(
  "{activeTab === 'pricing' && <PriceCalculator />}",
  "{activeTab === 'pricing' && <PriceCalculator />}\n        {activeTab === 'bank-reconciliation' && <BankReconciliation />}\n        {activeTab === 'invoice-reconciliation' && <InvoiceReconciliation />}"
);

// Add header labels
c = c.replace(
  "activeTab === 'pricing' ? 'Công cụ tính giá' :",
  "activeTab === 'pricing' ? 'Công cụ tính giá' :\n                activeTab === 'bank-reconciliation' ? 'Chấm sao kê (Đối soát ngân hàng)' :\n                activeTab === 'invoice-reconciliation' ? 'Chấm hoá đơn' :"
);

fs.writeFileSync('src/App.tsx', c);
console.log('done');
