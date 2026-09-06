const fs = require('fs');
let content = fs.readFileSync('src/pages/Projects.tsx', 'utf-8');
let lines = content.split('\n');

// 1. Fix Imports
lines = lines.map(line => {
  if (line.includes('import PizZip from')) return '';
  if (line.includes('import Docxtemplater from')) return '';
  if (line.includes('import { saveAs } from')) return 'import ProjectUnitsTab from "./ProjectUnitsTab";';
  if (line.includes('import { db, type Project, type Personnel, type ProjectContract }')) return 'import { db, type Project, type Personnel } from "../db/db";';
  if (line.includes('import { formatCurrency }')) return '';
  if (line.includes('import { Plus, X, Pencil, Trash2, Briefcase, Users, FileText, ChevronLeft, Calendar, Printer, LayoutDashboard, MapPin, Wallet, Upload, Download } from')) {
    return "import { Plus, X, Pencil, Trash2, Briefcase, Users, FileText, ChevronLeft, LayoutDashboard, MapPin, Wallet, Upload, Download, Info } from 'lucide-react';";
  }
  if (line.includes("const contracts = useLiveQuery(() => db.projectContracts")) return "";
  if (line.includes("const allPersonnel = useLiveQuery(() => db.personnel.toArray());")) return "";
  
  if (line.includes("setDetailTab('CONTRACTS')")) {
    return line.replace(/CONTRACTS/g, 'TEMPLATES').replace('Hợp đồng Nhân sự', 'Biểu mẫu Dự án');
  }

  if (line.includes("const totalContractExpense = contracts?.reduce")) return "";
  if (line.includes("const totalOtherExpense = expenses?.reduce")) return "";
  if (line.includes("const totalExpense = totalContractExpense + totalOtherExpense;")) return "const totalExpense = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;";

  // Project undefined fix
  if (line.includes("let computedProgress = 0;")) {
    return "  if (!project) return <div>Đang tải...</div>;\n  let computedProgress = 0;";
  }

  return line;
});

// Remove unused state in ProjectDetail
let pdStartIndex = lines.findIndex(l => l.includes("function ProjectDetail("));
let showModalIndex = lines.findIndex((l, i) => i > pdStartIndex && l.includes("const [showModal, setShowModal] = useState(false);"));
let computedProgressIndex = lines.findIndex((l, i) => i > pdStartIndex && l.includes("let computedProgress = 0;"));

if (showModalIndex !== -1 && computedProgressIndex !== -1) {
  lines = [...lines.slice(0, showModalIndex), ...lines.slice(computedProgressIndex)];
}

content = lines.join('\n');

// Replace CONTRACTS block with TEMPLATES block
const contractsUIStart = content.indexOf("{detailTab === 'CONTRACTS' && (");
const unitsUIStart = content.indexOf("{detailTab === 'UNITS' && <ProjectUnitsTab projectId={projectId} />}");

if (contractsUIStart !== -1 && unitsUIStart !== -1) {
  content = content.substring(0, contractsUIStart) + 
            "{detailTab === 'TEMPLATES' && <ProjectTemplatesTab projectId={projectId} />}\n\n      " + 
            content.substring(unitsUIStart);
}

// Remove function ProjectUnitsTab completely
const unitsTabStart = content.indexOf("function ProjectUnitsTab({ projectId }");
const expensesTabStart = content.indexOf("function ProjectExpensesTab({ projectId }");
if (unitsTabStart !== -1 && expensesTabStart !== -1) {
  content = content.substring(0, unitsTabStart) + content.substring(expensesTabStart);
}

// Append ProjectTemplatesTab
const templatesTabCode = `
function ProjectTemplatesTab({ projectId }: { projectId: number }) {
  const templates = useLiveQuery(() => db.projectTemplates.where('projectId').equals(projectId).toArray());
  const [uploading, setUploading] = useState<string | null>(null);

  const TEMPLATE_TYPES = [
    { id: 'DELIVERY', name: 'Biên bản Bàn giao', desc: 'Mẫu xuất biên bản bàn giao thiết bị' },
    { id: 'PAYMENT_REQUEST', name: 'Đề nghị Thanh toán', desc: 'Mẫu xuất đề nghị thanh toán' },
    { id: 'OTHER', name: 'Biểu mẫu khác', desc: 'Các biểu mẫu khác của đối tác' }
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, typeId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      alert('Vui lòng tải lên file Microsoft Word (.docx)');
      return;
    }

    setUploading(typeId);
    
    try {
      const buffer = await file.arrayBuffer();
      const existing = await db.projectTemplates.where({ projectId, type: typeId }).first();
      
      if (existing && existing.id) {
        await db.projectTemplates.update(existing.id, { fileData: buffer, fileName: file.name, updatedAt: new Date() });
      } else {
        await db.projectTemplates.add({ projectId, type: typeId, fileData: buffer, fileName: file.name, updatedAt: new Date() });
      }
      alert('Cập nhật biểu mẫu thành công!');
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi lưu biểu mẫu.');
    } finally {
      setUploading(null);
    }
  };

  const handleDownload = async (typeId: string) => {
    const template = await db.projectTemplates.where({ projectId, type: typeId }).first();
    if (!template) return;
    
    const blob = new Blob([template.fileData], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = template.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 text-blue-800 p-4 rounded-lg mb-6 flex items-start">
        <Info className="mr-3 mt-0.5 flex-shrink-0" size={20} />
        <div>
          <p className="font-semibold mb-1">Quản lý Biểu mẫu riêng cho Dự án này:</p>
          <p className="text-sm">Các đối tác/chủ đầu tư khác nhau thường có form biểu mẫu khác nhau. Bạn hãy tải lên các file Word biểu mẫu tương ứng với dự án này tại đây.</p>
        </div>
      </div>

      {TEMPLATE_TYPES.map(type => {
        const currentTpl = templates?.find(t => t.type === type.id);
        
        return (
          <div key={type.id} className="border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-gray-50 transition-colors">
            <div className="mb-4 md:mb-0 flex-1 mr-4">
              <h3 className="font-bold text-gray-800 text-lg">{type.name}</h3>
              <p className="text-sm text-gray-500">{type.desc}</p>
              
              {currentTpl ? (
                <div className="mt-2 flex items-center text-sm text-green-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                  Đang sử dụng: {currentTpl.fileName} ({new Date(currentTpl.updatedAt).toLocaleDateString('vi-VN')})
                </div>
              ) : (
                <div className="mt-2 flex items-center text-sm text-orange-500 font-medium">
                  <span className="w-2 h-2 rounded-full bg-orange-400 mr-2"></span>
                  Chưa có biểu mẫu (Sử dụng biểu mẫu mặc định)
                </div>
              )}
            </div>
            
            <div className="flex space-x-2 w-full md:w-auto">
              {currentTpl && (
                <button 
                  onClick={() => handleDownload(type.id)}
                  className="flex-1 md:flex-none flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-md hover:bg-gray-100"
                  title="Tải xuống biểu mẫu hiện tại"
                >
                  <Download size={18} className="mr-2" /> Tải về
                </button>
              )}
              
              <div className="relative flex-1 md:flex-none">
                <input 
                  type="file" 
                  accept=".docx" 
                  onChange={(e) => handleFileUpload(e, type.id)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploading === type.id}
                />
                <button 
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                >
                  <Upload size={18} className="mr-2" /> 
                  {uploading === type.id ? 'Đang tải...' : 'Upload .docx'}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
`;

content += "\n" + templatesTabCode;

fs.writeFileSync('src/pages/Projects.tsx', content, 'utf-8');
console.log("Success");
