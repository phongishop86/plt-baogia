import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ProjectContract } from '../db/db';
import { Pencil, Trash2, Plus, X, Printer } from 'lucide-react';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import { formatCurrency } from '../utils/formatCurrency';

export default function PersonnelContracts() {
  const contracts = useLiveQuery(() => db.projectContracts.filter(c => !c.projectId).toArray());
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
  const [deviceQuantity, setDeviceQuantity] = useState('0');
  const [exportingId, setExportingId] = useState<number | null>(null);

  const handleExportWord = async (contract: ProjectContract) => {
    try {
      setExportingId(contract.id!);
      const template = await db.templates.get('CONTRACT_PERSONNEL');
      if (!template) {
        alert("Chưa có mẫu Hợp đồng Giao khoán! Vui lòng upload tại tính năng Biểu mẫu.");
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
        projectName: 'Hợp đồng khung',
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
        deviceQuantity: contract.deviceQuantity || 0,
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
    setLocation('');
    setDeviceQuantity('0');
    setShowModal(true);
  };

  const openEditContract = (c: ProjectContract) => {
    setEditingId(c.id!);
    setPersonnelId(c.personnelId.toString());
    setStartDate(new Date(c.startDate).toISOString().split('T')[0]);
    setEndDate(new Date(c.endDate).toISOString().split('T')[0]);
    setUnit(c.unit as any);
    setQuantity(c.quantity.toString());
    setUnitPrice(c.unitPrice.toString());
    setTaxRateTNCN(c.taxRateTNCN.toString());
    setJobDescription(c.jobDescription || '');
    setLocation(c.location || '');
    setDeviceQuantity((c.deviceQuantity || 0).toString());
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
      deviceQuantity: parseFloat(deviceQuantity) || 0,
      createdAt: new Date()
    };

    if (editingId) {
      await db.projectContracts.update(editingId, data);
    } else {
      await db.projectContracts.add(data as any);
    }
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quản lý Hợp đồng khung / Sự vụ</h2>
          <p className="text-gray-500 mt-1">Quản lý các hợp đồng thuê khoán nhân sự, dịch vụ độc lập với dự án</p>
        </div>
        <button onClick={openAddModal} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium flex items-center shadow-sm">
          <Plus size={20} className="mr-2" /> Tạo Hợp đồng mới
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nhân sự</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nội dung / Địa điểm</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Thời gian</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Đơn giá (SL)</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Tổng Giá Trị</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Thuế TNCN</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Thực nhận</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {contracts?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    Chưa có hợp đồng nào.
                  </td>
                </tr>
              ) : (
                contracts?.map(c => {
                  const p = allPersonnel?.find(x => x.id === c.personnelId);
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">{p?.fullName || 'Không xác định'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div className="font-medium text-gray-900">{c.jobDescription || '-'}</div>
                        <div className="text-xs">{c.location}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(c.startDate).toLocaleDateString('vi-VN')} - {new Date(c.endDate).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <div>{c.quantity} <span className="text-xs text-gray-500">({c.unit === 'DAY' ? 'Ngày' : c.unit === 'MONTH' ? 'Tháng' : c.unit === 'DEVICE' ? 'Thiết bị' : c.unit === 'UNIT' ? 'Đơn vị' : 'Khoán'})</span></div>
                        <div className="font-medium text-gray-700">x {new Intl.NumberFormat('vi-VN').format(c.unitPrice)} ₫</div>
                        {c.deviceQuantity ? <div className="text-xs text-blue-600 mt-1" title="Số lượng thiết bị phân bổ">(Giao: {c.deviceQuantity} thiết bị)</div> : null}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">{new Intl.NumberFormat('vi-VN').format(c.amount)} ₫</td>
                      <td className="px-4 py-3 text-right text-sm text-red-600">{c.taxRateTNCN}% <br/><span className="text-xs">(-{new Intl.NumberFormat('vi-VN').format(c.amount - c.netAmount)} ₫)</span></td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-green-600">{new Intl.NumberFormat('vi-VN').format(c.netAmount)} ₫</td>
                      <td className="px-4 py-3 text-center text-sm font-medium flex items-center justify-center space-x-2">
                        <button onClick={() => openEditContract(c)} className="text-blue-600 hover:text-blue-900 p-1.5 bg-blue-50 rounded-md" title="Sửa hợp đồng">
                          <Pencil size={16} />
                        </button>
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
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold">{editingId ? 'Sửa' : 'Thêm'} Hợp đồng Nhân sự</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400"><X size={24} /></button>
            </div>
            <form onSubmit={saveContract} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chọn Nhân sự *</label>
                <select required value={personnelId} onChange={e => setPersonnelId(e.target.value)} className="w-full border p-2 rounded-md">
                  <option value="">-- Chọn nhân sự --</option>
                  {allPersonnel?.map(p => <option key={p.id} value={p.id}>{p.fullName} (CCCD: {p.cccd})</option>)}
                </select>
                {allPersonnel?.length === 0 && <p className="text-xs text-red-500 mt-1">Chưa có hồ sơ nhân sự nào.</p>}
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
                    <option value="PROJECT">Khoán gọn</option>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trích thuế TNCN (%)</label>
                  <input type="number" step="0.1" value={taxRateTNCN} onChange={e => setTaxRateTNCN(e.target.value)} className="w-full border p-2 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thiết bị điều phối (nếu có)</label>
                  <input type="number" step="0.1" value={deviceQuantity} onChange={e => setDeviceQuantity(e.target.value)} className="w-full border p-2 rounded-md" placeholder="VD: 5" />
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
