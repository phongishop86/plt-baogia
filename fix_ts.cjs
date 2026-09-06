const fs = require('fs');

let content = fs.readFileSync('src/pages/Projects.tsx', 'utf-8');

// 1. Fix Imports
content = content.replace(
  "import PizZip from 'pizzip';\nimport Docxtemplater from 'docxtemplater';\nimport { saveAs } from 'file-saver';",
  "import ProjectUnitsTab from './ProjectUnitsTab';"
);

// 2. Fix detailTab definition
content = content.replace(
  "const [detailTab, setDetailTab] = useState<'DASHBOARD' | 'UNITS' | 'CONTRACTS' | 'EXPENSES'>('DASHBOARD');",
  "const [detailTab, setDetailTab] = useState<'DASHBOARD' | 'UNITS' | 'TEMPLATES' | 'EXPENSES'>('DASHBOARD');"
);

// 3. Remove all unused states and functions from ProjectDetail
const startStr = "const [showModal, setShowModal] = useState(false);";
const endStr = "setShowModal(false);\n  };\n";
const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
  content = content.substring(0, startIdx) + content.substring(endIdx + endStr.length);
}

// 4. Fix TEMPLATES button
content = content.replace(
  "<button onClick={() => setDetailTab('CONTRACTS')} className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors flex items-center space-x-2 ${detailTab === 'CONTRACTS' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>\n          <FileText size={18} /><span>Hợp đồng Nhân sự</span>\n        </button>",
  "<button onClick={() => setDetailTab('TEMPLATES')} className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors flex items-center space-x-2 ${detailTab === 'TEMPLATES' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>\n          <FileText size={18} /><span>Biểu mẫu Dự án</span>\n        </button>"
);

// 5. Replace detailTab rendering block
content = content.replace(
  "{detailTab === 'CONTRACTS' && (",
  "{detailTab === 'TEMPLATES' && <ProjectTemplatesTab projectId={projectId} />}\n\n      {/* "
);
content = content.replace(
  "{detailTab === 'UNITS' && <ProjectUnitsTab",
  "*/}\n      {detailTab === 'UNITS' && <ProjectUnitsTab"
);


fs.writeFileSync('src/pages/Projects.tsx', content, 'utf-8');
console.log('Fixed');
