import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Project, type Personnel, type ProjectContract } from '../db/db';
import { Plus, X, Pencil, Trash2, Briefcase, Users, FileText, ChevronLeft, Calendar, Printer } from 'lucide-react';
import { formatCurrency } from '../lib/VNDToWords';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';

export default function Projects() {
  const [activeTab, setActiveTab] = useState<'PROJECTS' | 'PERSONNEL' | 'DETAIL'>('PROJECTS');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      {activeTab !== 'DETAIL' && (
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('PROJECTS')}
            className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'PROJECTS'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Briefcase size={18} />
            <span>Danh sách Dự án</span>
          </button>
          <button
            onClick={() => setActiveTab('PERSONNEL')}
            className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'PERSONNEL'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users size={18} />
            <span>Hồ sơ Nhân sự</span>
          </button>
        </div>
      )}

      {activeTab === 'PROJECTS' && (
        <ProjectList onOpenDetail={(id) => {
          setSelectedProjectId(id);
          setActiveTab('DETAIL');
        }} />
      )}
      
      {activeTab === 'PERSONNEL' && <PersonnelList />}
      
      {activeTab === 'DETAIL' && selectedProjectId && (
        <ProjectDetail 
          projectId={selectedProjectId} 
          onBack={() => {
            setSelectedProjectId(null);
            setActiveTab('PROJECTS');
          }} 
        />
      )}
    </div>
  );
}

// ==========================================
// THÀNH PHẦN 1: QUẢN LÝ DỰ ÁN
// ==========================================
function ProjectList({ onOpenDetail }: { onOpenDetail: (id: number) => void }) {
  const projects = useLiveQuery(() => db.projects.toArray());
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<Project['status']>('PLANNING');
  const [progress, setProgress] = useState(0);
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');

  const openAddModal = () => {
    setEditingId(null);
    setName('');
    setCode('');
    setStatus('PLANNING');
    setProgress(0);
    setBudget('');
    setNotes('');
    setShowModal(true);
  };

  const openEditModal = (project: Project) => {
    setEditingId(project.id!);
    setName(project.name);
    setCode(project.code);
    setStatus(project.status);
    setProgress(project.progress);
    setBudget(project.budget ? project.budget.toString() : '');
    setNotes(project.notes || '');
    setShowModal(true);
  };

  const saveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) {
      alert("Vui lòng điền tên và mã dự án");
      return;
    }
    
    const projectData = {
      name,
      code,
      status,
      progress,
      budget: budget ? parseFloat(String(budget).replace(/\D/g, '')) : 0,
      notes,
      updatedAt: new Date()
    };

    if (editingId) {
      await db.projects.update(editingId, projectData);
    } else {
      await db.projects.add({ ...projectData, createdAt: new Date() });
    }
    setShowModal(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Quản lý Dự án</h2>
        <button
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium flex items-center space-x-2 transition-colors"
        >
          <Plus size={18} />
          <span>Thêm dự án</span>
        </button>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Mã DA</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Tên dự án</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Trạng thái</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Tiến độ</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Ngân sách</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Sửa</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {projects?.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  Chưa có dự án nào. Bấm "Thêm dự án" để tạo mới.
                </td>
              </tr>
            ) : (
              projects?.map(project => (
                <tr 
                  key={project.id} 
                  onClick={() => onOpenDetail(project.id!)}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {project.code}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-blue-600">
                    {project.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      project.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                      project.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                      project.status === 'PLANNING' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {project.status === 'COMPLETED' ? 'Hoàn thành' : project.status === 'IN_PROGRESS' ? 'Đang thực hiện' : project.status === 'PLANNING' ? 'Kế hoạch' : 'Tạm dừng/Hủy'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <div className="flex items-center space-x-2">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${project.progress}%` }}></div>
                      </div>
                      <span className="text-gray-700 text-xs font-medium">{project.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                    {project.budget ? new Intl.NumberFormat('vi-VN').format(project.budget) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => openEditModal(project)} className="text-blue-600 hover:text-blue-900 p-1.5 bg-blue-50 rounded-md">
                      <Pencil size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Thêm/Sửa Dự án */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900">{editingId ? 'Sửa Dự án' : 'Thêm Dự án mới'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <form onSubmit={saveProject} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã Dự án *</label>
                  <input required value={code} onChange={e => setCode(e.target.value)} className="w-full border p-2 rounded-md focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                  <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full border p-2 rounded-md">
                    <option value="PLANNING">Đang lên kế hoạch</option>
                    <option value="IN_PROGRESS">Đang thực hiện</option>
                    <option value="COMPLETED">Đã hoàn thành</option>
                    <option value="ON_HOLD">Tạm dừng</option>
                    <option value="CANCELLED">Đã hủy</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên Dự án *</label>
                  <input required value={name} onChange={e => setName(e.target.value)} className="w-full border p-2 rounded-md focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngân sách (VNĐ)</label>
                  <input value={budget} onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    setBudget(val ? new Intl.NumberFormat('vi-VN').format(parseInt(val)) : '');
                  }} className="w-full border p-2 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tiến độ (%)</label>
                  <input type="number" min="0" max="100" value={progress} onChange={e => setProgress(Number(e.target.value))} className="w-full border p-2 rounded-md" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                  <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} className="w-full border p-2 rounded-md"></textarea>
                </div>
              </div>
              <div className="pt-4 flex justify-end space-x-3 border-t">
                {editingId && (
                  <button type="button" onClick={() => {
                    if(confirm('Xóa dự án này và toàn bộ hợp đồng liên quan?')) {
                      db.projects.delete(editingId);
                      setShowModal(false);
                    }
                  }} className="px-4 py-2 border border-red-200 text-red-600 rounded-md hover:bg-red-50 mr-auto">
                    Xóa
                  </button>
                )}
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-md font-medium text-gray-700 hover:bg-gray-50">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700">Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// THÀNH PHẦN 2: HỒ SƠ NHÂN SỰ
// ==========================================
function PersonnelList() {
  const personnel = useLiveQuery(() => db.personnel.toArray());
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [fullName, setFullName] = useState('');
  const [cccd, setCccd] = useState('');
  const [type, setType] = useState<Personnel['type']>('CONTRACT');
  const [phone, setPhone] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankName, setBankName] = useState('');
  const [address, setAddress] = useState('');
  const [cccdDate, setCccdDate] = useState('');
  const [specialization, setSpecialization] = useState('');

  const openAddModal = () => {
    setEditingId(null);
    setFullName('');
    setCccd('');
    setType('CONTRACT');
    setPhone('');
    setBankAccount('');
    setBankName('');
    setAddress('');
    setCccdDate('');
    setSpecialization('');
    setShowModal(true);
  };

  const openEditModal = (p: Personnel) => {
    setEditingId(p.id!);
    setFullName(p.fullName);
    setCccd(p.cccd);
    setType(p.type);
    setPhone(p.phone || '');
    setBankAccount(p.bankAccount || '');
    setBankName(p.bankName || '');
    setAddress(p.address || '');
    setCccdDate(p.cccdDate || '');
    setSpecialization(p.specialization || '');
    setShowModal(true);
  };

  const savePersonnel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !cccd) return alert("Vui lòng điền Họ tên và CCCD");
    
    const pData = { fullName, cccd, type, phone, bankAccount, bankName, address, cccdDate, specialization, updatedAt: new Date() };

    if (editingId) {
      await db.personnel.update(editingId, pData);
    } else {
      await db.personnel.add({ ...pData, createdAt: new Date() });
    }
    setShowModal(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Hồ sơ Nhân sự</h2>
        <button onClick={openAddModal} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium flex items-center space-x-2">
          <Plus size={18} />
          <span>Thêm nhân sự</span>
        </button>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Họ và Tên</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">CCCD</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase">Loại hình</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">SĐT</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Số Tài Khoản</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {personnel?.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Chưa có hồ sơ nhân sự nào.</td></tr>
            ) : (
              personnel?.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900">{p.fullName}</div>
                    {p.specialization && <div className="text-xs font-normal text-gray-500">{p.specialization}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{p.cccd}</div>
                    {p.cccdDate && <div className="text-xs text-gray-500">Cấp: {new Date(p.cccdDate).toLocaleDateString('vi-VN')}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      p.type === 'FULL_TIME' ? 'bg-purple-100 text-purple-800' :
                      p.type === 'CONTRACT' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {p.type === 'FULL_TIME' ? 'Chuyên trách' : p.type === 'CONTRACT' ? 'Khoán' : 'Thời vụ'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{p.phone}</div>
                    {p.address && <div className="text-xs text-gray-500 truncate max-w-[200px]" title={p.address}>{p.address}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-blue-700">{p.bankAccount}</div>
                    {p.bankName && <div className="text-xs text-gray-500">{p.bankName}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <button onClick={() => openEditModal(p)} className="text-blue-600 hover:text-blue-900 p-1.5 bg-blue-50 rounded-md mr-2"><Pencil size={16} /></button>
                    <button onClick={() => {
                      if (confirm('Xóa hồ sơ nhân sự này?')) db.personnel.delete(p.id!);
                    }} className="text-red-600 hover:text-red-900 p-1.5 bg-red-50 rounded-md"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-bold">{editingId ? 'Sửa Nhân sự' : 'Thêm Nhân sự'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400"><X size={24} /></button>
            </div>
            <form onSubmit={savePersonnel} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Họ và Tên *</label>
                <input required value={fullName} onChange={e => setFullName(e.target.value)} className="w-full border p-2 rounded-md" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CCCD *</label>
                  <input required value={cccd} onChange={e => setCccd(e.target.value)} className="w-full border p-2 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày cấp</label>
                  <input type="date" value={cccdDate} onChange={e => setCccdDate(e.target.value)} className="w-full border p-2 rounded-md" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                <input value={address} onChange={e => setAddress(e.target.value)} className="w-full border p-2 rounded-md" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loại hình</label>
                  <select value={type} onChange={e => setType(e.target.value as any)} className="w-full border p-2 rounded-md">
                    <option value="FULL_TIME">Chuyên trách</option>
                    <option value="CONTRACT">Khoán</option>
                    <option value="SEASONAL">Thời vụ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chuyên môn</label>
                  <input value={specialization} onChange={e => setSpecialization(e.target.value)} className="w-full border p-2 rounded-md" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full border p-2 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số tài khoản</label>
                  <input value={bankAccount} onChange={e => setBankAccount(e.target.value)} placeholder="Nhập số tài khoản" className="w-full border p-2 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên Ngân hàng</label>
                  <input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Ví dụ: Vietcombank" className="w-full border p-2 rounded-md" />
                </div>
              </div>
              <div className="pt-4 flex justify-end space-x-3 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-md">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// THÀNH PHẦN 3: CHI TIẾT DỰ ÁN (HỢP ĐỒNG)
// ==========================================
function ProjectDetail({ projectId, onBack }: { projectId: number, onBack: () => void }) {
  const project = useLiveQuery(() => db.projects.get(projectId));
  const contracts = useLiveQuery(() => db.projectContracts.where('projectId').equals(projectId).toArray());
  const allPersonnel = useLiveQuery(() => db.personnel.toArray());
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [personnelId, setPersonnelId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [unit, setUnit] = useState<ProjectContract['unit']>('PROJECT');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [taxRateTNCN, setTaxRateTNCN] = useState('10');
  const [jobDescription, setJobDescription] = useState('');
  const [location, setLocation] = useState('');
  const [exportingId, setExportingId] = useState<number | null>(null);

  const handleExportWord = async (contract: ProjectContract) => {
    try {
      setExportingId(contract.id!);
      const template = await db.templates.get('CONTRACT_PERSONNEL');
      if (!template) {
        alert("Chưa có mẫu Hợp đồng Giao khoán! Vui lòng vào Cài đặt -> Quản lý Biểu mẫu để tải mẫu lên.");
        setExportingId(null);
        return;
      }
      
      const p = allPersonnel?.find(x => x.id === contract.personnelId);
      if (!p) return;

      const zip = new PizZip(template.fileData);
      const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

      const d = new Date(contract.startDate);
      const amountWord = formatCurrency(contract.amount);
      const netAmountWord = formatCurrency(contract.netAmount);

      doc.render({
        projectName: project?.name || '',
        fullName: p.fullName || '',
        cccd: p.cccd || '',
        cccdDate: p.cccdDate ? new Date(p.cccdDate).toLocaleDateString('vi-VN') : '',
        address: p.address || '',
        phone: p.phone || '',
        bankAccount: p.bankAccount || '',
        bankName: p.bankName || '',
        specialization: p.specialization || '',
        jobDescription: contract.jobDescription || '',
        location: contract.location || '',
        startDate: d.toLocaleDateString('vi-VN'),
        day: d.getDate().toString().padStart(2, '0'),
        month: (d.getMonth() + 1).toString().padStart(2, '0'),
        year: d.getFullYear(),
        quantity: contract.quantity,
        unitPrice: new Intl.NumberFormat('vi-VN').format(contract.unitPrice),
        amount: new Intl.NumberFormat('vi-VN').format(contract.amount),
        amountWord: amountWord.charAt(0).toUpperCase() + amountWord.slice(1),
        taxRateTNCN: contract.taxRateTNCN,
        taxAmount: new Intl.NumberFormat('vi-VN').format(contract.amount - contract.netAmount),
        taxAmountWord: formatCurrency(contract.amount - contract.netAmount).charAt(0).toUpperCase() + formatCurrency(contract.amount - contract.netAmount).slice(1),
        netAmount: new Intl.NumberFormat('vi-VN').format(contract.netAmount),
        netAmountWord: netAmountWord.charAt(0).toUpperCase() + netAmountWord.slice(1),
      });

      const out = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      
      saveAs(out, `Hop_Dong_Giao_Khoan_${p.fullName.replace(/\s+/g, '_')}.docx`);
    } catch (error) {
      console.error(error);
      alert("Có lỗi khi xuất file Word. Vui lòng kiểm tra lại template.");
    } finally {
      setExportingId(null);
    }
  };

  if (!project) return <div>Đang tải...</div>;

  const totalExpense = contracts?.reduce((sum, c) => sum + c.amount, 0) || 0;

  const openAddModal = () => {
    setEditingId(null);
    setPersonnelId('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
    setUnit('PROJECT');
    setQuantity('1');
    setUnitPrice('');
    setTaxRateTNCN('10');
    setJobDescription('');
    setLocation(project.name || '');
    setShowModal(true);
  };

  const saveContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personnelId || !unitPrice) return alert("Vui lòng nhập nhân sự và đơn giá");

    const qty = parseFloat(quantity) || 0;
    const price = parseFloat(String(unitPrice).replace(/\D/g, '')) || 0;
    const tax = parseFloat(taxRateTNCN) || 0;
    
    const amount = qty * price;
    const netAmount = amount * (1 - tax / 100);

    const data = {
      projectId,
      personnelId: parseInt(personnelId),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      unit,
      quantity: qty,
      unitPrice: price,
      taxRateTNCN: tax,
      amount,
      netAmount,
      jobDescription,
      location,
      createdAt: new Date()
    };

    if (editingId) {
      await db.projectContracts.update(editingId, data);
    } else {
      await db.projectContracts.add(data);
    }
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 mb-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{project.name}</h2>
          <p className="text-gray-500">Mã DA: {project.code} | Tiến độ: {project.progress}%</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-sm font-medium mb-1">Ngân sách dự kiến</p>
          <p className="text-2xl font-bold text-gray-900">{new Intl.NumberFormat('vi-VN').format(project.budget || 0)} ₫</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-sm font-medium mb-1">Tổng chi phí nhân sự</p>
          <p className="text-2xl font-bold text-blue-600">{new Intl.NumberFormat('vi-VN').format(totalExpense)} ₫</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-sm font-medium mb-1">Lợi nhuận/Ngân sách còn lại</p>
          <p className={`text-2xl font-bold ${(project.budget || 0) - totalExpense >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {new Intl.NumberFormat('vi-VN').format((project.budget || 0) - totalExpense)} ₫
          </p>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800 flex items-center"><FileText className="mr-2" size={18} /> Quản lý Hợp đồng Nhân sự</h3>
          <button onClick={openAddModal} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center">
            <Plus size={16} className="mr-1" /> Thêm hợp đồng
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Nhân sự</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Thời gian</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase">Số lượng / Đơn giá</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase">Tổng tiền</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase">Thuế TNCN</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase">Thực nhận</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {contracts?.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Chưa có hợp đồng giao việc nào trong dự án này.</td></tr>
              ) : (
                contracts?.map(c => {
                  const p = allPersonnel?.find(x => x.id === c.personnelId);
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-bold text-sm text-gray-900">{p?.fullName || 'Không xác định'}</div>
                        <div className="text-xs text-gray-500">CCCD: {p?.cccd}</div>
                        <div className="text-xs text-blue-600">{p?.bankAccount}{p?.bankName ? ` - ${p.bankName}` : ''}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-center text-gray-600">
                        <div className="flex items-center justify-center space-x-1"><Calendar size={12}/> <span>{new Date(c.startDate).toLocaleDateString('vi-VN')}</span></div>
                        <div className="flex items-center justify-center space-x-1 mt-1"><Calendar size={12}/> <span>{new Date(c.endDate).toLocaleDateString('vi-VN')}</span></div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <div>{c.quantity} <span className="text-xs text-gray-500">({c.unit === 'DAY' ? 'Ngày' : c.unit === 'MONTH' ? 'Tháng' : c.unit === 'DEVICE' ? 'Thiết bị' : c.unit === 'UNIT' ? 'Đơn vị' : 'Khoán'})</span></div>
                        <div className="font-medium text-gray-700">x {new Intl.NumberFormat('vi-VN').format(c.unitPrice)} ₫</div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">{new Intl.NumberFormat('vi-VN').format(c.amount)} ₫</td>
                      <td className="px-4 py-3 text-right text-sm text-red-600">{c.taxRateTNCN}% <br/><span className="text-xs">(-{new Intl.NumberFormat('vi-VN').format(c.amount - c.netAmount)} ₫)</span></td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-green-600">{new Intl.NumberFormat('vi-VN').format(c.netAmount)} ₫</td>
                      <td className="px-4 py-3 text-center text-sm font-medium flex items-center justify-center space-x-2">
                        <button onClick={() => handleExportWord(c)} disabled={exportingId === c.id} className="text-blue-600 hover:text-blue-900 p-1.5 bg-blue-50 rounded-md disabled:opacity-50" title="Xuất hợp đồng ra file Word">
                          <Printer size={16} className={exportingId === c.id ? "animate-pulse" : ""} />
                        </button>
                        <button onClick={() => { if (confirm('Xóa hợp đồng này?')) db.projectContracts.delete(c.id!); }} className="text-red-600 hover:text-red-900 p-1.5 bg-red-50 rounded-md" title="Xóa hợp đồng">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-bold">Thêm Hợp đồng Nhân sự</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400"><X size={24} /></button>
            </div>
            <form onSubmit={saveContract} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chọn Nhân sự *</label>
                <select required value={personnelId} onChange={e => setPersonnelId(e.target.value)} className="w-full border p-2 rounded-md">
                  <option value="">-- Chọn nhân sự --</option>
                  {allPersonnel?.map(p => <option key={p.id} value={p.id}>{p.fullName} (CCCD: {p.cccd})</option>)}
                </select>
                {allPersonnel?.length === 0 && <p className="text-xs text-red-500 mt-1">Chưa có hồ sơ nhân sự nào. Vui lòng sang tab Hồ sơ Nhân sự để thêm.</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung công việc</label>
                  <textarea rows={2} value={jobDescription} onChange={e => setJobDescription(e.target.value)} placeholder="Mô tả công việc giao khoán..." className="w-full border p-2 rounded-md"></textarea>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Địa điểm thực hiện</label>
                  <input value={location} onChange={e => setLocation(e.target.value)} className="w-full border p-2 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border p-2 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border p-2 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hình thức (ĐVT)</label>
                  <select value={unit} onChange={e => setUnit(e.target.value as any)} className="w-full border p-2 rounded-md">
                    <option value="PROJECT">Khoán gọn Dự án</option>
                    <option value="MONTH">Theo Tháng</option>
                    <option value="DAY">Theo Ngày</option>
                    <option value="DEVICE">Thiết bị</option>
                    <option value="UNIT">Đơn vị</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng</label>
                  <input type="number" step="0.1" required value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full border p-2 rounded-md" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Đơn giá (VNĐ) *</label>
                  <input required value={unitPrice} onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    setUnitPrice(val ? new Intl.NumberFormat('vi-VN').format(parseInt(val)) : '');
                  }} className="w-full border p-2 rounded-md font-bold text-blue-600" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trích thuế TNCN (%)</label>
                  <input type="number" step="0.1" value={taxRateTNCN} onChange={e => setTaxRateTNCN(e.target.value)} className="w-full border p-2 rounded-md" />
                </div>
              </div>
              <div className="pt-4 flex justify-end space-x-3 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-md">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


