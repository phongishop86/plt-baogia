import re

with open('src/pages/Projects.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix Imports
content = re.sub(r"import PizZip from 'pizzip';\s*import Docxtemplater from 'docxtemplater';\s*import { saveAs } from 'file-saver';", "import ProjectUnitsTab from './ProjectUnitsTab';", content)
content = re.sub(r"import \{ Plus, X, Pencil, Trash2, Briefcase, Users, FileText, ChevronLeft, Calendar, Printer, LayoutDashboard, MapPin, Wallet, Upload, Download \} from 'lucide-react';", "import { Plus, X, Pencil, Trash2, Briefcase, Users, FileText, ChevronLeft, Calendar, Printer, LayoutDashboard, MapPin, Wallet, Upload, Download, Info } from 'lucide-react';", content)

# 2. Detail Setup
content = re.sub(r"const allPersonnel = useLiveQuery\(\(\) => db\.personnel\.toArray\(\)\);\s*", "", content)

# 3. Remove Project Detail States
# Find function ProjectDetail
pd_start = content.find("function ProjectDetail(")
if pd_start != -1:
    before_pd = content[:pd_start]
    pd_content = content[pd_start:]
    
    # Remove from const [showModal... to setShowModal(false);\n  };
    pd_content = re.sub(r"  const \[showModal, setShowModal\].*?setShowModal\(false\);\s*};\s*", "", pd_content, flags=re.DOTALL)
    
    content = before_pd + pd_content

# 4. Remove CONTRACTS Tab UI
# We need to replace {detailTab === 'CONTRACTS' && ( ... )} with {detailTab === 'TEMPLATES' ...}
content = re.sub(r"\{detailTab === 'CONTRACTS' && \([\s\S]*?\{detailTab === 'UNITS' &&", "{detailTab === 'TEMPLATES' && <ProjectTemplatesTab projectId={projectId} />}\n\n      {detailTab === 'UNITS' &&", content)

with open('src/pages/Projects.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Success")
