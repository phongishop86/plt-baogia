import ProjectUnitsTab from './ProjectUnitsTab';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Project, type Personnel } from '../db/db';
import { Plus, X, Pencil, Trash2, Briefcase, Users, FileText, ChevronLeft, Info, LayoutDashboard, MapPin, Wallet, Upload, Download } from 'lucide-react';

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
            <span>Danh sÃ¡ch Dá»± Ã¡n</span>
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
            <span>Há»“ sÆ¡ NhÃ¢n sá»±</span>
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
// THÃ€NH PHáº¦N 1: QUáº¢N LÃ Dá»° ÃN
// ==========================================
function ProjectList({ onOpenDetail }: { onOpenDetail: (id: number) => void }) {
  const projects = useLiveQuery(() => db.projects.toArray());
  const projectUnits = useLiveQuery(() => db.projectUnits.toArray());
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<Project['status']>('PLANNING');
  const [budget, setBudget] = useState('');
  const [contractValue, setContractValue] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');

  const openAddModal = () => {
    setEditingId(null);
    setName('');
    setCode('');
    setStatus('PLANNING');
    setBudget('');
    setContractValue('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setShowModal(true);
  };

  const openEditModal = (project: Project) => {
    setEditingId(project.id!);
    setName(project.name);
    setCode(project.code);
    setStatus(project.status);
    setBudget(project.budget ? project.budget.toString() : '');
    setContractValue(project.contractValue ? project.contractValue.toString() : '');
    setStartDate(project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '');
    setEndDate(project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '');
    setNotes(project.notes || '');
    setShowModal(true);
  };

  const saveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) {
      alert("Vui lÃ²ng Ä‘iá»n tÃªn vÃ  mÃ£ dá»± Ã¡n");
      return;
    }
    
    const projectData = {
      name,
      code,
      status,
      progress: editingId ? (projects?.find(p => p.id === editingId)?.progress || 0) : 0, // Sáº½ tá»± tÃ­nh tá»« Unit, khi táº¡o má»›i lÃ  0
      budget: budget ? parseFloat(String(budget).replace(/\D/g, '')) : 0,
      contractValue: contractValue ? parseFloat(String(contractValue).replace(/\D/g, '')) : 0,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
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
        <h2 className="text-xl font-bold text-gray-800">Quáº£n lÃ½ Dá»± Ã¡n</h2>
        <button
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium flex items-center space-x-2 transition-colors"
        >
          <Plus size={18} />
          <span>ThÃªm dá»± Ã¡n</span>
        </button>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">MÃ£ DA</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">TÃªn dá»± Ã¡n</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Tráº¡ng thÃ¡i</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Tiáº¿n Ä‘á»™</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Doanh thu / Chi phÃ­</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Sá»­a</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {projects?.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  ChÆ°a cÃ³ dá»± Ã¡n nÃ o. Báº¥m "ThÃªm dá»± Ã¡n" Ä‘á»ƒ táº¡o má»›i.
                </td>
              </tr>
            ) : (
              projects?.map(project => {
                const units = projectUnits?.filter(u => u.projectId === project.id) || [];
                let computedProgress = 0;
                if (units.length > 0) {
                  const score = units.reduce((acc, u) => {
                    if (u.status === 'COMPLETED') return acc + 100;
                    if (u.status === 'DOCS_PENDING') return acc + 75;
                    if (u.status === 'IN_PROGRESS') return acc + 50;
                    return acc;
                  }, 0);
                  computedProgress = Math.round(score / units.length);
                } else {
                  computedProgress = project.progress || 0;
                }

                // Kiá»ƒm tra quÃ¡ háº¡n
                const isOverdue = project.endDate && new Date(project.endDate) < new Date() && computedProgress < 100;

                return (
                  <tr 
                    key={project.id} 
                    onClick={() => onOpenDetail(project.id!)}
                    className={`cursor-pointer transition-colors ${isOverdue ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-blue-50'}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      {project.code}
                      {isOverdue && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">QuÃ¡ háº¡n</span>}
                    </td>
                    <td className={`px-6 py-4 text-sm font-medium ${isOverdue ? 'text-red-700' : 'text-blue-600'}`}>
                      {project.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        project.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        project.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                        project.status === 'PLANNING' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {project.status === 'COMPLETED' ? 'HoÃ n thÃ nh' : project.status === 'IN_PROGRESS' ? 'Äang thá»±c hiá»‡n' : project.status === 'PLANNING' ? 'Káº¿ hoáº¡ch' : 'Táº¡m dá»«ng/Há»§y'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <div className="flex items-center space-x-2">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div className={`h-2.5 rounded-full ${isOverdue ? 'bg-red-500' : 'bg-blue-600'}`} style={{ width: `${computedProgress}%` }}></div>
                        </div>
                        <span className={`text-xs font-bold ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>{computedProgress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <div className="font-bold text-green-600" title="GiÃ¡ trá»‹ há»£p Ä‘á»“ng (Doanh thu)">{project.contractValue ? new Intl.NumberFormat('vi-VN').format(project.contractValue) : '0'} â‚«</div>
                      <div className="text-xs text-red-500" title="NgÃ¢n sÃ¡ch dá»± kiáº¿n (Chi phÃ­)">{project.budget ? new Intl.NumberFormat('vi-VN').format(project.budget) : '0'} â‚«</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openEditModal(project)} className="text-blue-600 hover:text-blue-900 p-1.5 bg-blue-50 rounded-md">
                        <Pencil size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal ThÃªm/Sá»­a Dá»± Ã¡n */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900">{editingId ? 'Sá»­a Dá»± Ã¡n' : 'ThÃªm Dá»± Ã¡n má»›i'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <form onSubmit={saveProject} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MÃ£ Dá»± Ã¡n *</label>
                  <input required value={code} onChange={e => setCode(e.target.value)} className="w-full border p-2 rounded-md focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tráº¡ng thÃ¡i</label>
                  <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full border p-2 rounded-md">
                    <option value="PLANNING">Äang lÃªn káº¿ hoáº¡ch</option>
                    <option value="IN_PROGRESS">Äang thá»±c hiá»‡n</option>
                    <option value="COMPLETED">ÄÃ£ hoÃ n thÃ nh</option>
                    <option value="ON_HOLD">Táº¡m dá»«ng</option>
                    <option value="CANCELLED">ÄÃ£ há»§y</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">TÃªn Dá»± Ã¡n *</label>
                  <input required value={name} onChange={e => setName(e.target.value)} className="w-full border p-2 rounded-md focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NgÃ y báº¯t Ä‘áº§u</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border p-2 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deadline dá»± Ã¡n</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border p-2 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GiÃ¡ trá»‹ há»£p Ä‘á»“ng (Doanh thu)</label>
                  <input value={contractValue} onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    setContractValue(val ? new Intl.NumberFormat('vi-VN').format(parseInt(val)) : '');
                  }} className="w-full border p-2 rounded-md font-bold text-green-600" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NgÃ¢n sÃ¡ch dá»± kiáº¿n (Chi phÃ­)</label>
                  <input value={budget} onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    setBudget(val ? new Intl.NumberFormat('vi-VN').format(parseInt(val)) : '');
                  }} className="w-full border p-2 rounded-md text-red-600" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chÃº</label>
                  <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} className="w-full border p-2 rounded-md"></textarea>
                </div>
              </div>
              <div className="pt-4 flex justify-end space-x-3 border-t">
                {editingId && (
                  <button type="button" onClick={() => {
                    if(confirm('XÃ³a dá»± Ã¡n nÃ y vÃ  toÃ n bá»™ há»£p Ä‘á»“ng liÃªn quan?')) {
                      db.projects.delete(editingId);
                      setShowModal(false);
                    }
                  }} className="px-4 py-2 border border-red-200 text-red-600 rounded-md hover:bg-red-50 mr-auto">
                    XÃ³a
                  </button>
                )}
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-md font-medium text-gray-700 hover:bg-gray-50">Há»§y</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700">LÆ°u láº¡i</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// THÃ€NH PHáº¦N 2: Há»’ SÆ  NHÃ‚N Sá»°
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
    if (!fullName || !cccd) return alert("Vui lÃ²ng Ä‘iá»n Há» tÃªn vÃ  CCCD");
    
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
        <h2 className="text-xl font-bold text-gray-800">Há»“ sÆ¡ NhÃ¢n sá»±</h2>
        <button onClick={openAddModal} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium flex items-center space-x-2">
          <Plus size={18} />
          <span>ThÃªm nhÃ¢n sá»±</span>
        </button>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Há» vÃ  TÃªn</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">CCCD</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase">Loáº¡i hÃ¬nh</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">SÄT</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Sá»‘ TÃ i Khoáº£n</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase">Thao tÃ¡c</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {personnel?.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">ChÆ°a cÃ³ há»“ sÆ¡ nhÃ¢n sá»± nÃ o.</td></tr>
            ) : (
              personnel?.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900">{p.fullName}</div>
                    {p.specialization && <div className="text-xs font-normal text-gray-500">{p.specialization}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{p.cccd}</div>
                    {p.cccdDate && <div className="text-xs text-gray-500">Cáº¥p: {new Date(p.cccdDate).toLocaleDateString('vi-VN')}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      p.type === 'FULL_TIME' ? 'bg-purple-100 text-purple-800' :
                      p.type === 'CONTRACT' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {p.type === 'FULL_TIME' ? 'ChuyÃªn trÃ¡ch' : p.type === 'CONTRACT' ? 'KhoÃ¡n' : 'Thá»i vá»¥'}
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
                      if (confirm('XÃ³a há»“ sÆ¡ nhÃ¢n sá»± nÃ y?')) db.personnel.delete(p.id!);
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
              <h3 className="text-xl font-bold">{editingId ? 'Sá»­a NhÃ¢n sá»±' : 'ThÃªm NhÃ¢n sá»±'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400"><X size={24} /></button>
            </div>
            <form onSubmit={savePersonnel} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Há» vÃ  TÃªn *</label>
                <input required value={fullName} onChange={e => setFullName(e.target.value)} className="w-full border p-2 rounded-md" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CCCD *</label>
                  <input required value={cccd} onChange={e => setCccd(e.target.value)} className="w-full border p-2 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NgÃ y cáº¥p</label>
                  <input type="date" value={cccdDate} onChange={e => setCccdDate(e.target.value)} className="w-full border p-2 rounded-md" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Äá»‹a chá»‰</label>
                <input value={address} onChange={e => setAddress(e.target.value)} className="w-full border p-2 rounded-md" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loáº¡i hÃ¬nh</label>
                  <select value={type} onChange={e => setType(e.target.value as any)} className="w-full border p-2 rounded-md">
                    <option value="FULL_TIME">ChuyÃªn trÃ¡ch</option>
                    <option value="CONTRACT">KhoÃ¡n</option>
                    <option value="SEASONAL">Thá»i vá»¥</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ChuyÃªn mÃ´n</label>
                  <input value={specialization} onChange={e => setSpecialization(e.target.value)} className="w-full border p-2 rounded-md" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sá»‘ Ä‘iá»‡n thoáº¡i</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full border p-2 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sá»‘ tÃ i khoáº£n</label>
                  <input value={bankAccount} onChange={e => setBankAccount(e.target.value)} placeholder="Nháº­p sá»‘ tÃ i khoáº£n" className="w-full border p-2 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TÃªn NgÃ¢n hÃ ng</label>
                  <input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="VÃ­ dá»¥: Vietcombank" className="w-full border p-2 rounded-md" />
                </div>
              </div>
              <div className="pt-4 flex justify-end space-x-3 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-md">Há»§y</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">LÆ°u láº¡i</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// THÃ€NH PHáº¦N 3: CHI TIáº¾T Dá»° ÃN (Há»¢P Äá»’NG)
// ==========================================
function ProjectDetail({ projectId, onBack }: { projectId: number, onBack: () => void }) {
  const project = useLiveQuery(() => db.projects.get(projectId));
  const contracts = useLiveQuery(() => db.projectContracts.where('projectId').equals(projectId).toArray());
  const units = useLiveQuery(() => db.projectUnits.where('projectId').equals(projectId).toArray());
  const expenses = useLiveQuery(() => db.projectExpenses.where('projectId').equals(projectId).toArray());
  
  const [detailTab, setDetailTab] = useState<'DASHBOARD' | 'UNITS' | 'TEMPLATES' | 'EXPENSES'>('DASHBOARD');

  if (!project) return <div>Äang táº£i...</div>;

  let computedProgress = 0;
  if (units && units.length > 0) {
    const score = units.reduce((acc, u) => {
      if (u.status === 'COMPLETED') return acc + 100;
      if (u.status === 'DOCS_PENDING') return acc + 75;
      if (u.status === 'IN_PROGRESS') return acc + 50;
      return acc;
    }, 0);
    computedProgress = Math.round(score / units.length);
  } else {
    computedProgress = project.progress || 0;
  }
  const isOverdue = project.endDate && new Date(project.endDate) < new Date() && computedProgress < 100;

  const totalContractExpense = contracts?.reduce((sum, c) => sum + c.amount, 0) || 0;
  const totalOtherExpense = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
  const totalExpense = totalContractExpense + totalOtherExpense;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 mb-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{project.name}</h2>
          <div className="flex items-center space-x-3 text-sm mt-1">
            <span className="text-gray-500 font-medium">MÃ£ DA: {project.code}</span>
            <span className="text-gray-300">|</span>
            <span className={`font-bold ${isOverdue ? 'text-red-600' : 'text-blue-600'}`}>Tiáº¿n Ä‘á»™: {computedProgress}% {isOverdue && '(QuÃ¡ háº¡n)'}</span>
          </div>
        </div>
      </div>

      <div className="flex border-b border-gray-200">
        <button onClick={() => setDetailTab('DASHBOARD')} className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors flex items-center space-x-2 ${detailTab === 'DASHBOARD' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
          <LayoutDashboard size={18} /><span>Tá»•ng quan</span>
        </button>
        <button onClick={() => setDetailTab('UNITS')} className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors flex items-center space-x-2 ${detailTab === 'UNITS' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
          <MapPin size={18} /><span>Chi nhÃ¡nh ({units?.length || 0})</span>
        </button>
        <button onClick={() => setDetailTab('TEMPLATES')} className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors flex items-center space-x-2 ${detailTab === 'TEMPLATES' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
          <FileText size={18} /><span>Biá»ƒu máº«u Dá»± Ã¡n</span>
        </button>
        <button onClick={() => setDetailTab('EXPENSES')} className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors flex items-center space-x-2 ${detailTab === 'EXPENSES' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
          <Wallet size={18} /><span>Chi phÃ­ khÃ¡c</span>
        </button>
      </div>

      {detailTab === 'DASHBOARD' && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-gray-500 text-sm font-medium mb-1">Doanh thu (GiÃ¡ trá»‹ HÄ)</p>
              <p className="text-2xl font-bold text-green-600">{new Intl.NumberFormat('vi-VN').format(project.contractValue || 0)} â‚«</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-gray-500 text-sm font-medium mb-1">NgÃ¢n sÃ¡ch dá»± kiáº¿n (Chi phÃ­)</p>
              <p className="text-2xl font-bold text-gray-700">{new Intl.NumberFormat('vi-VN').format(project.budget || 0)} â‚«</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-gray-500 text-sm font-medium mb-1">Tá»•ng chi phÃ­ thá»±c táº¿</p>
              <p className="text-2xl font-bold text-red-600">{new Intl.NumberFormat('vi-VN').format(totalExpense)} â‚«</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-gray-500 text-sm font-medium mb-1">Lá»£i nhuáº­n táº¡m tÃ­nh</p>
              <p className={`text-2xl font-bold ${((project.contractValue || 0) - totalExpense) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {new Intl.NumberFormat('vi-VN').format((project.contractValue || 0) - totalExpense)} â‚«
              </p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4">Tiáº¿n Ä‘á»™ tá»•ng thá»ƒ: {computedProgress}%</h3>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div className={`h-4 rounded-full ${isOverdue ? 'bg-red-500' : 'bg-blue-600'}`} style={{ width: `${computedProgress}%` }}></div>
            </div>
            <div className="grid grid-cols-4 gap-4 mt-6">
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-500">ChÆ°a triá»ƒn khai</p>
                <p className="text-xl font-bold text-gray-700">{units?.filter(u => u.status === 'NOT_STARTED').length || 0}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-500">Äang thá»±c hiá»‡n</p>
                <p className="text-xl font-bold text-blue-700">{units?.filter(u => u.status === 'IN_PROGRESS').length || 0}</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-500">Äang hoÃ n thiá»‡n HS</p>
                <p className="text-xl font-bold text-yellow-700">{units?.filter(u => u.status === 'DOCS_PENDING').length || 0}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-500">ÄÃ£ hoÃ n thÃ nh</p>
                <p className="text-xl font-bold text-green-700">{units?.filter(u => u.status === 'COMPLETED').length || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {detailTab === 'TEMPLATES' && <ProjectTemplatesTab projectId={projectId} />}

      {detailTab === 'UNITS' && <ProjectUnitsTab projectId={projectId} />}
      {detailTab === 'EXPENSES' && <ProjectExpensesTab projectId={projectId} />}
    </div>
  );
}

function ProjectExpensesTab({ projectId }: { projectId: number }) {
  const expenses = useLiveQuery(() => db.projectExpenses.where('projectId').equals(projectId).toArray());
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [category, setCategory] = useState<'OPERATION' | 'ENTERTAINMENT' | 'EQUIPMENT' | 'OTHER'>('OPERATION');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');

  const openAdd = () => {
    setEditingId(null);
    setCategory('OPERATION');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setShowModal(true);
  };

  const openEdit = (e: any) => {
    setEditingId(e.id);
    setCategory(e.category);
    setAmount(e.amount.toString());
    setDate(new Date(e.date).toISOString().split('T')[0]);
    setDescription(e.description);
    setShowModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(String(amount).replace(/\D/g, ''));
    if (!val || !description) return alert('Vui lÃ²ng nháº­p sá»‘ tiá»n vÃ  ná»™i dung');

    const data = {
      projectId,
      category,
      amount: val,
      date: new Date(date),
      description,
      createdAt: new Date()
    };

    if (editingId) {
      await db.projectExpenses.update(editingId, data);
    } else {
      await db.projectExpenses.add(data);
    }
    setShowModal(false);
  };

  return (
    <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
      <div className="p-4 border-b flex justify-between items-center bg-gray-50">
        <h3 className="font-bold text-gray-800">Quáº£n lÃ½ Chi phÃ­ khÃ¡c</h3>
        <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center">
          <Plus size={16} className="mr-1" /> ThÃªm chi phÃ­
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-white">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">NgÃ y</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">PhÃ¢n loáº¡i</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Ná»™i dung</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase">Sá»‘ tiá»n</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Thao tÃ¡c</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {expenses?.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">ChÆ°a cÃ³ chi phÃ­ nÃ o Ä‘Æ°á»£c ghi nháº­n.</td></tr>
            ) : (
              expenses?.sort((a, b) => b.date.getTime() - a.date.getTime()).map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">{new Date(e.date).toLocaleDateString('vi-VN')}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                      {e.category === 'OPERATION' ? 'Chi phÃ­ HÄ' : e.category === 'ENTERTAINMENT' ? 'Tiáº¿p khÃ¡ch' : e.category === 'EQUIPMENT' ? 'Thiáº¿t bá»‹/Váº­t tÆ°' : 'KhÃ¡c'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{e.description}</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-red-600">{new Intl.NumberFormat('vi-VN').format(e.amount)} â‚«</td>
                  <td className="px-4 py-3 text-center text-sm font-medium flex items-center justify-center space-x-2">
                    <button onClick={() => openEdit(e)} className="text-blue-600 hover:text-blue-900 p-1.5 bg-blue-50 rounded-md"><Pencil size={16} /></button>
                    <button onClick={() => { if (confirm('XÃ³a khoáº£n chi nÃ y?')) db.projectExpenses.delete(e.id!); }} className="text-red-600 hover:text-red-900 p-1.5 bg-red-50 rounded-md"><Trash2 size={16} /></button>
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
              <h3 className="text-xl font-bold">{editingId ? 'Sá»­a Chi phÃ­' : 'ThÃªm Chi phÃ­'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400"><X size={24} /></button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loáº¡i chi phÃ­</label>
                <select value={category} onChange={e => setCategory(e.target.value as any)} className="w-full border p-2 rounded-md">
                  <option value="OPERATION">Chi phÃ­ Hoáº¡t Ä‘á»™ng</option>
                  <option value="ENTERTAINMENT">Chi phÃ­ Tiáº¿p khÃ¡ch</option>
                  <option value="EQUIPMENT">Trang thiáº¿t bá»‹ / Váº­t tÆ°</option>
                  <option value="OTHER">Chi phÃ­ KhÃ¡c</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NgÃ y chi</label>
                  <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full border p-2 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sá»‘ tiá»n (VNÄ) *</label>
                  <input required value={amount} onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    setAmount(val ? new Intl.NumberFormat('vi-VN').format(parseInt(val)) : '');
                  }} className="w-full border p-2 rounded-md font-bold text-red-600" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ná»™i dung chi *</label>
                <textarea rows={2} required value={description} onChange={e => setDescription(e.target.value)} className="w-full border p-2 rounded-md"></textarea>
              </div>
              <div className="pt-4 flex justify-end space-x-3 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-md">Há»§y</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">LÆ°u láº¡i</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
function ProjectTemplatesTab({ projectId }: { projectId: number }) {
  const templates = useLiveQuery(() => db.projectTemplates.where('projectId').equals(projectId).toArray());
  const [uploading, setUploading] = useState<string | null>(null);

  const TEMPLATE_TYPES = [
    { id: 'DELIVERY', name: 'BiÃªn báº£n BÃ n giao', desc: 'Máº«u xuáº¥t biÃªn báº£n bÃ n giao thiáº¿t bá»‹' },
    { id: 'PAYMENT_REQUEST', name: 'Äá» nghá»‹ Thanh toÃ¡n', desc: 'Máº«u xuáº¥t Ä‘á» nghá»‹ thanh toÃ¡n' },
    { id: 'OTHER', name: 'Biá»ƒu máº«u khÃ¡c', desc: 'CÃ¡c biá»ƒu máº«u khÃ¡c cá»§a Ä‘á»‘i tÃ¡c' }
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, typeId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      alert('Vui lÃ²ng táº£i lÃªn file Microsoft Word (.docx)');
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
      alert('Cáº­p nháº­t biá»ƒu máº«u thÃ nh cÃ´ng!');
    } catch (error) {
      console.error(error);
      alert('CÃ³ lá»—i xáº£y ra khi lÆ°u biá»ƒu máº«u.');
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
          <p className="font-semibold mb-1">Quáº£n lÃ½ Biá»ƒu máº«u riÃªng cho Dá»± Ã¡n nÃ y:</p>
          <p className="text-sm">CÃ¡c Ä‘á»‘i tÃ¡c/chá»§ Ä‘áº§u tÆ° khÃ¡c nhau thÆ°á»ng cÃ³ form biá»ƒu máº«u khÃ¡c nhau. Báº¡n hÃ£y táº£i lÃªn cÃ¡c file Word biá»ƒu máº«u tÆ°Æ¡ng á»©ng vá»›i dá»± Ã¡n nÃ y táº¡i Ä‘Ã¢y.</p>
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
                  Äang sá»­ dá»¥ng: {currentTpl.fileName} ({new Date(currentTpl.updatedAt).toLocaleDateString('vi-VN')})
                </div>
              ) : (
                <div className="mt-2 flex items-center text-sm text-orange-500 font-medium">
                  <span className="w-2 h-2 rounded-full bg-orange-400 mr-2"></span>
                  ChÆ°a cÃ³ biá»ƒu máº«u (Sá»­ dá»¥ng biá»ƒu máº«u máº·c Ä‘á»‹nh)
                </div>
              )}
            </div>
            
            <div className="flex space-x-2 w-full md:w-auto">
              {currentTpl && (
                <button 
                  onClick={() => handleDownload(type.id)}
                  className="flex-1 md:flex-none flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-md hover:bg-gray-100"
                  title="Táº£i xuá»‘ng biá»ƒu máº«u hiá»‡n táº¡i"
                >
                  <Download size={18} className="mr-2" /> Táº£i vá»
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
                  {uploading === type.id ? 'Äang táº£i...' : 'Upload .docx'}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

