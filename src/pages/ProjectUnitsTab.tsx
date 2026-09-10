import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ProjectUnit } from '../db/db';
import { Plus, Search, Trash2, X, Download, Upload, Pencil, MapPin, Printer } from 'lucide-react';
import { saveAs } from 'file-saver';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
export default function ProjectUnitsTab({ projectId }: { projectId: number }) {
  const project = useLiveQuery(() => db.projects.get(projectId));
  const units = useLiveQuery(() => db.projectUnits.where('projectId').equals(projectId).toArray());
  const allPersonnel = useLiveQuery(() => db.personnel.toArray());
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [deviceType, setDeviceType] = useState('');
  const [deviceBrand, setDeviceBrand] = useState('');
  const [deviceSerial, setDeviceSerial] = useState('');
  const [deadline, setDeadline] = useState('');
  const [actualTime, setActualTime] = useState('');
  const [status, setStatus] = useState<'NOT_STARTED' | 'IN_PROGRESS' | 'DOCS_PENDING' | 'COMPLETED'>('NOT_STARTED');
  const [personnelId, setPersonnelId] = useState('');
  const [notes, setNotes] = useState('');
  const [customFields, setCustomFields] = useState<Record<string, string>>({});

  const [filterText, setFilterText] = useState('');
  const [sortField, setSortField] = useState<keyof ProjectUnit>('name');
  const [sortAsc, setSortAsc] = useState(true);
  
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSort = (field: keyof ProjectUnit) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const toggleSelectAll = () => {
    if (sortedUnits.length === 0) return;
    if (selectedIds.length === sortedUnits.length) setSelectedIds([]);
    else setSelectedIds(sortedUnits.map(u => u.id!));
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBatchDelete = async () => {
    if (!selectedIds.length) return;
    if (confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} dòng đã chọn?`)) {
      await db.projectUnits.bulkDelete(selectedIds);
      setSelectedIds([]);
    }
  };

  const handleBatchStatusChange = async (newStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'DOCS_PENDING' | 'COMPLETED') => {
    if (!selectedIds.length) return;
    const updates = selectedIds.map(id => ({ key: id, changes: { status: newStatus, updatedAt: new Date() } }));
    try {
      await db.transaction('rw', db.projectUnits, async () => {
        for (const update of updates) {
          await db.projectUnits.update(update.key, update.changes);
        }
      });
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
      alert('Lỗi cập nhật tiến độ hàng loạt!');
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setCode(''); setName(''); setAddress(''); setContactName(''); setContactPhone('');
    setDeviceType(''); setDeviceBrand(''); setDeviceSerial('');
    setDeadline(''); setActualTime(''); setStatus('NOT_STARTED'); setPersonnelId(''); setNotes('');
    setCustomFields({});
    setShowModal(true);
  };

  const openEdit = (u: ProjectUnit) => {
    setEditingId(u.id!);
    setCode(u.code || ''); setName(u.name); setAddress(u.address || '');
    setContactName(u.contactName || ''); setContactPhone(u.contactPhone || '');
    setDeviceType(u.deviceType || ''); setDeviceBrand(u.deviceBrand || ''); setDeviceSerial(u.deviceSerial || '');
    setDeadline(u.deadline ? new Date(u.deadline).toISOString().split('T')[0] : '');
    setActualTime(u.actualTime ? new Date(u.actualTime).toISOString().split('T')[0] : '');
    setStatus(u.status);
    setPersonnelId(u.personnelId ? u.personnelId.toString() : '');
    setNotes(u.notes || '');
    setCustomFields(u.customFields || {});
    setShowModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const data: any = {
      projectId,
      code,
      name,
      address,
      contactName,
      contactPhone,
      deviceType,
      deviceBrand,
      deviceSerial,
      deadline: deadline ? new Date(deadline) : undefined,
      actualTime: actualTime ? new Date(actualTime) : undefined,
      status,
      personnelId: personnelId ? parseInt(personnelId) : undefined,
      notes,
      customFields,
      updatedAt: new Date()
    };

    if (editingId) {
      await db.projectUnits.update(editingId, data);
    } else {
      data.createdAt = new Date();
      await db.projectUnits.add(data);
    }
    setShowModal(false);
  };

  const handleDownloadSample = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách');
    
    worksheet.columns = [
      { header: 'Mã CN', key: 'code', width: 15 },
      { header: 'Tên CN (*)', key: 'name', width: 40 },
      { header: 'Địa chỉ mới', key: 'address', width: 40 },
      { header: 'Cán bộ IT đầu mối', key: 'contactName', width: 25 },
      { header: 'Điện thoại liên hệ', key: 'contactPhone', width: 20 },
      { header: 'CHỦNG LOẠI THIẾT BỊ', key: 'deviceType', width: 25 },
      { header: 'Hãng', key: 'deviceBrand', width: 15 },
      { header: 'Serial', key: 'deviceSerial', width: 25 },
      { header: 'Thời gian dự kiến (YYYY-MM-DD)', key: 'deadline', width: 30 },
      { header: 'Nhân sự HT', key: 'personnel', width: 25 },
      { header: 'Thời gian thực tế (YYYY-MM-DD)', key: 'actualTime', width: 30 },
      { header: 'Tiến độ (0-100)', key: 'status', width: 15 },
      { header: 'Ghi chú', key: 'notes', width: 20 },
      ...(project?.unitCustomColumns || []).map(col => ({ header: col, key: col, width: 25 }))
    ];
    
    const row: any = { code: 'CN01', name: 'Chi nhánh 1', address: 'Hà Nội', contactName: 'Nguyễn Văn A', contactPhone: '0901234567', deviceType: 'Server', deviceBrand: 'Dell', deviceSerial: 'SN123', deadline: '2026-10-01', personnel: '', actualTime: '', status: '0', notes: '' };
    (project?.unitCustomColumns || []).forEach(col => row[col] = '');
    worksheet.addRow(row);

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), 'Mau_Import_Chi_Nhanh.xlsx');
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const worksheet = workbook.worksheets[0];
      
      const headerRow = worksheet.getRow(1);
      const headers: Record<number, string> = {};
      const newCustomCols = new Set<string>(project?.unitCustomColumns || []);

      headerRow.eachCell((cell, colNumber) => {
        const text = cell.text?.trim() || '';
        if (text) headers[colNumber] = text;
      });

      const standardFieldsMap: Record<string, string[]> = {
        code: ['mã cn', 'mã đơn vị', 'code'],
        name: ['tên cn', 'tên đơn vị', 'name', 'tên chi nhánh'],
        address: ['địa chỉ', 'address'],
        contactName: ['cán bộ it', 'contact', 'người liên hệ'],
        contactPhone: ['điện thoại', 'sđt', 'phone'],
        deviceType: ['chủng loại', 'loại thiết bị', 'loại tb'],
        deviceBrand: ['hãng', 'brand'],
        deviceSerial: ['serial', 'sn'],
        deadline: ['dự kiến', 'deadline'],
        personnel: ['nhân sự', 'người thực hiện'],
        actualTime: ['thực tế', 'actual'],
        status: ['tiến độ', 'trạng thái', 'status'],
        notes: ['ghi chú', 'note']
      };

      const getColIndex = (fieldTypes: string[]) => {
         const entry = Object.entries(headers).find(([_, text]) => fieldTypes.some(f => text.toLowerCase().includes(f)));
         return entry ? parseInt(entry[0]) : -1;
      };

      const customColIndices: Record<number, string> = {};
      Object.entries(headers).forEach(([idx, text]) => {
         const isStandard = Object.values(standardFieldsMap).some(fieldTypes => fieldTypes.some(f => text.toLowerCase().includes(f)));
         if (!isStandard) {
           customColIndices[parseInt(idx)] = text;
           newCustomCols.add(text);
         }
      });

      const newUnits: any[] = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Bỏ qua header
        
        const getVal = (idx: number) => idx > 0 ? row.getCell(idx).text?.trim() : '';
        const getDateVal = (idx: number) => {
          if (idx <= 0) return undefined;
          const val = row.getCell(idx).value;
          return val instanceof Date ? val : (val ? new Date(row.getCell(idx).text) : undefined);
        };

        const unitName = getVal(getColIndex(standardFieldsMap.name));
        if (!unitName) return;

        const customFields: Record<string, string> = {};
        Object.entries(customColIndices).forEach(([idx, colName]) => {
           customFields[colName] = getVal(parseInt(idx));
        });

        const progressRaw = getVal(getColIndex(standardFieldsMap.status));
        let status = 'NOT_STARTED';
        if (progressRaw === '100') status = 'COMPLETED';
        else if (progressRaw === '75') status = 'DOCS_PENDING';
        else if (progressRaw === '50') status = 'IN_PROGRESS';
        else if (progressRaw && progressRaw !== '0') {
           const pLower = progressRaw.toLowerCase();
           if (pLower.includes('hoàn thành')) status = 'COMPLETED';
           else if (pLower.includes('đang thực hiện')) status = 'IN_PROGRESS';
           else if (pLower.includes('hồ sơ')) status = 'DOCS_PENDING';
        }

        const rawDeadline = getDateVal(getColIndex(standardFieldsMap.deadline));
        const rawActualTime = getDateVal(getColIndex(standardFieldsMap.actualTime));
        
        newUnits.push({
          projectId,
          code: getVal(getColIndex(standardFieldsMap.code)),
          name: unitName,
          address: getVal(getColIndex(standardFieldsMap.address)),
          contactName: getVal(getColIndex(standardFieldsMap.contactName)),
          contactPhone: getVal(getColIndex(standardFieldsMap.contactPhone)),
          deviceType: getVal(getColIndex(standardFieldsMap.deviceType)),
          deviceBrand: getVal(getColIndex(standardFieldsMap.deviceBrand)),
          deviceSerial: getVal(getColIndex(standardFieldsMap.deviceSerial)),
          deadline: rawDeadline && !isNaN(rawDeadline.getTime()) ? rawDeadline : undefined,
          actualTime: rawActualTime && !isNaN(rawActualTime.getTime()) ? rawActualTime : undefined,
          status,
          notes: getVal(getColIndex(standardFieldsMap.notes)),
          customFields,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
      
      if (newUnits.length > 0) {
        await db.projectUnits.bulkAdd(newUnits);
        const updatedCustomCols = Array.from(newCustomCols);
        if (updatedCustomCols.length > (project?.unitCustomColumns?.length || 0)) {
            await db.projects.update(projectId, { unitCustomColumns: updatedCustomCols });
        }
        alert(`Đã import thành công ${newUnits.length} chi nhánh!`);
      } else {
        alert("Không tìm thấy dữ liệu hợp lệ trong file Excel. Vui lòng kiểm tra lại file mẫu.");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi đọc file Excel. Vui lòng đảm bảo file không bị lỗi và đúng định dạng .xlsx");
    }
    if (e.target) e.target.value = '';
  };

  const filteredUnits = (units || []).filter(u => {
    if (!filterText) return true;
    const txt = filterText.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(txt)) ||
      (u.code && u.code.toLowerCase().includes(txt)) ||
      (u.address && u.address.toLowerCase().includes(txt))
    );
  });

  const sortedUnits = [...filteredUnits].sort((a, b) => {
    let valA = (a as any)[sortField] || '';
    let valB = (b as any)[sortField] || '';
    if (sortField === 'personnelId') {
      valA = allPersonnel?.find(x => x.id === a.personnelId)?.fullName || '';
      valB = allPersonnel?.find(x => x.id === b.personnelId)?.fullName || '';
    }
    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const handleExportExcel = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Danh sách');
      
      worksheet.columns = [
        { header: 'Mã CN', key: 'code', width: 15 },
        { header: 'Tên CN', key: 'name', width: 40 },
        { header: 'Địa chỉ', key: 'address', width: 40 },
        { header: 'Cán bộ IT đầu mối', key: 'contactName', width: 25 },
        { header: 'Điện thoại liên hệ', key: 'contactPhone', width: 20 },
        { header: 'CHỦNG LOẠI THIẾT BỊ', key: 'deviceType', width: 25 },
        { header: 'Hãng', key: 'deviceBrand', width: 15 },
        { header: 'Serial', key: 'deviceSerial', width: 25 },
        { header: 'Thời gian dự kiến', key: 'deadline', width: 20 },
        { header: 'Nhân sự HT', key: 'personnel', width: 25 },
        { header: 'Thời gian thực tế', key: 'actualTime', width: 20 },
        { header: 'Tiến độ', key: 'status', width: 25 },
        { header: 'Ghi chú', key: 'notes', width: 30 },
        ...(project?.unitCustomColumns || []).map(col => ({ header: col, key: col, width: 25 }))
      ];

      sortedUnits.forEach(u => {
        const p = allPersonnel?.find(x => x.id === u.personnelId);
        let statusText = '';
        if (u.status === 'COMPLETED') statusText = 'Hoàn thành';
        else if (u.status === 'DOCS_PENDING') statusText = 'Đang hoàn thiện HS';
        else if (u.status === 'IN_PROGRESS') statusText = 'Đang thực hiện';
        else statusText = 'Chưa triển khai';

        const row: any = {
          code: u.code || '',
          name: u.name || '',
          address: u.address || '',
          contactName: u.contactName || '',
          contactPhone: u.contactPhone || '',
          deviceType: u.deviceType || '',
          deviceBrand: u.deviceBrand || '',
          deviceSerial: u.deviceSerial || '',
          deadline: u.deadline ? new Date(u.deadline).toLocaleDateString('vi-VN') : '',
          personnel: p?.fullName || '',
          actualTime: u.actualTime ? new Date(u.actualTime).toLocaleDateString('vi-VN') : '',
          status: statusText,
          notes: u.notes || ''
        };
        (project?.unitCustomColumns || []).forEach(col => {
            row[col] = u.customFields?.[col] || '';
        });
        worksheet.addRow(row);
      });

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Danh_sach_trien_khai_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error(err);
      alert('Lỗi xuất file Excel!');
    }
  };

  const handleAddCustomColumn = async () => {
      const colName = prompt("Nhập tên trường dữ liệu mới (VD: Thông tin mạng, Băng thông, Ghi chú lắp đặt...):");
      if (colName && colName.trim()) {
          const newCols = [...(project?.unitCustomColumns || []), colName.trim()];
          await db.projects.update(projectId, { unitCustomColumns: newCols });
      }
  };

  const handleDeleteCustomColumn = async (colName: string) => {
    if (!confirm(`Bạn có chắc muốn xóa trường "${colName}"? Mọi dữ liệu của trường này ở các chi nhánh sẽ bị mất.`)) return;
    const newCols = project?.unitCustomColumns?.filter(c => c !== colName) || [];
    await db.projects.update(projectId, { unitCustomColumns: newCols });
    
    if (units) {
      for (const u of units) {
        if (u.customFields && u.customFields[colName] !== undefined) {
          const newData = { ...u.customFields };
          delete newData[colName];
          await db.projectUnits.update(u.id!, { customFields: newData });
        }
      }
    }
  };

  const [printingId, setPrintingId] = useState<number | null>(null);

  const handlePrintMaintenance = async (unit: ProjectUnit) => {
    try {
      setPrintingId(unit.id!);
      const template = await db.projectTemplates.where({ projectId, type: 'MAINTENANCE_RECORD' }).first();
      if (!template) {
        alert("Chưa có mẫu Biên bản Bảo trì! Vui lòng vào tab Biểu mẫu Dự án để tải mẫu lên.");
        return;
      }

      const p = allPersonnel?.find(x => x.id === unit.personnelId);

      const zip = new PizZip(template.fileData);
      const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

      const d = new Date();
      // Calculate device count simply by splitting deviceSerial if there are multiple, or just 1
      const deviceSerials = unit.deviceSerial ? unit.deviceSerial.split(',').map(s => s.trim()).filter(Boolean) : [];
      const deviceCount = deviceSerials.length > 0 ? deviceSerials.length : (unit.deviceType ? 1 : 0);

      // Create a flat dictionary for custom data
      const customFields: Record<string, string> = {};
      if (unit.customFields) {
        for (const [k, v] of Object.entries(unit.customFields)) {
          customFields[`custom_${k}`] = v || '';
        }
      }

      doc.render({
        projectName: project?.name || '',
        ...unit,
        personnelName: p?.fullName || '',
        printDay: d.getDate().toString().padStart(2, '0'),
        printMonth: (d.getMonth() + 1).toString().padStart(2, '0'),
        printYear: d.getFullYear(),
        deviceCount, devices: deviceSerials.map((s, idx) => ({ index: idx + 1, serial: s, type: unit.deviceType, brand: unit.deviceBrand })),
        ...customFields
      });

      const out = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      
      saveAs(out, `BB_Bao_Tri_${unit.name.replace(/\s+/g, '_')}.docx`);
    } catch (error) {
      console.error(error);
      alert("Có lỗi khi xuất file Word. Vui lòng kiểm tra lại template.");
    } finally {
      setPrintingId(null);
    }
  };

  const allSelected = sortedUnits.length > 0 && selectedIds.length === sortedUnits.length;

  return (
    <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
        <h3 className="font-bold text-gray-800 flex items-center"><MapPin className="mr-2" size={18} /> Quản lý Chi nhánh / Điểm triển khai</h3>
        
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Tìm kiếm chi nhánh..." value={filterText} onChange={e => setFilterText(e.target.value)} className="pl-9 pr-4 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500" />
          </div>
          
          <div className="flex rounded-md shadow-sm">
            <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-sm font-medium flex items-center rounded-l-md border border-blue-600">
              <Plus size={16} className="mr-1" /> Thêm
            </button>
            <button onClick={handleAddCustomColumn} className="bg-white hover:bg-gray-50 text-gray-700 px-3 py-1.5 text-sm font-medium flex items-center border-y border-r border-gray-300">
               + Trường
            </button>
            <button onClick={handleDownloadSample} className="bg-white hover:bg-gray-50 text-gray-700 px-3 py-1.5 text-sm font-medium flex items-center border-y border-r border-gray-300">
              <Download size={16} className="mr-1" /> File mẫu
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="bg-white hover:bg-gray-50 text-gray-700 px-3 py-1.5 text-sm font-medium flex items-center border-y border-r border-gray-300">
              <Upload size={16} className="mr-1" /> Import
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx" className="hidden" />
            <button onClick={handleExportExcel} className="bg-white hover:bg-gray-50 text-gray-700 px-3 py-1.5 text-sm font-medium flex items-center border-y border-r border-gray-300 rounded-r-md">
              <Download size={16} className="mr-1" /> Export
            </button>
          </div>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="bg-blue-50 p-2 border-b flex items-center justify-between">
          <span className="text-sm text-blue-700 font-medium">Đã chọn {selectedIds.length} dòng</span>
          <div className="flex space-x-2">
            <button onClick={() => handleBatchStatusChange('IN_PROGRESS')} className="text-xs bg-white border border-gray-300 px-2 py-1 rounded hover:bg-gray-50">Cập nhật: Đang làm</button>
            <button onClick={() => handleBatchStatusChange('DOCS_PENDING')} className="text-xs bg-white border border-gray-300 px-2 py-1 rounded hover:bg-gray-50">Cập nhật: Làm HS</button>
            <button onClick={() => handleBatchStatusChange('COMPLETED')} className="text-xs bg-white border border-gray-300 px-2 py-1 rounded hover:bg-gray-50">Cập nhật: Hoàn thành</button>
            <button onClick={handleBatchDelete} className="text-xs bg-red-100 text-red-700 border border-red-200 px-2 py-1 rounded hover:bg-red-200">Xóa đã chọn</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto w-full max-w-[calc(100vw-300px)]">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-3 text-center w-10 border-r">
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="w-4 h-4" />
              </th>
              <th onClick={() => handleSort('code')} className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase cursor-pointer hover:bg-gray-200 border-r min-w-[80px] max-w-[200px] resize-x overflow-hidden">Mã CN {sortField === 'code' ? (sortAsc ? '↑' : '↓') : ''}</th>
              <th onClick={() => handleSort('name')} className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase cursor-pointer hover:bg-gray-200 border-r min-w-[180px] max-w-[400px] resize-x overflow-hidden">Tên CN {sortField === 'name' ? (sortAsc ? '↑' : '↓') : ''}</th>
              <th onClick={() => handleSort('address')} className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase cursor-pointer hover:bg-gray-200 border-r min-w-[200px] max-w-[400px] resize-x overflow-hidden">Địa chỉ {sortField === 'address' ? (sortAsc ? '↑' : '↓') : ''}</th>
              <th onClick={() => handleSort('contactName')} className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase cursor-pointer hover:bg-gray-200 border-r min-w-[120px] max-w-[300px] resize-x overflow-hidden">Cán bộ IT {sortField === 'contactName' ? (sortAsc ? '↑' : '↓') : ''}</th>
              <th onClick={() => handleSort('contactPhone')} className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase cursor-pointer hover:bg-gray-200 border-r min-w-[110px] max-w-[200px] resize-x overflow-hidden">SĐT {sortField === 'contactPhone' ? (sortAsc ? '↑' : '↓') : ''}</th>
              <th onClick={() => handleSort('deviceBrand')} className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase cursor-pointer hover:bg-gray-200 border-r min-w-[90px] max-w-[200px] resize-x overflow-hidden">Hãng {sortField === 'deviceBrand' ? (sortAsc ? '↑' : '↓') : ''}</th>
              <th onClick={() => handleSort('deviceSerial')} className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase cursor-pointer hover:bg-gray-200 border-r min-w-[120px] max-w-[300px] resize-x overflow-hidden">Serial {sortField === 'deviceSerial' ? (sortAsc ? '↑' : '↓') : ''}</th>
              <th onClick={() => handleSort('deadline')} className="px-2 py-3 text-center text-xs font-bold text-gray-700 uppercase cursor-pointer hover:bg-gray-200 border-r min-w-[85px] max-w-[150px] resize-x overflow-hidden">TG dự kiến {sortField === 'deadline' ? (sortAsc ? '↑' : '↓') : ''}</th>
              <th onClick={() => handleSort('personnelId')} className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase cursor-pointer hover:bg-gray-200 border-r min-w-[130px] max-w-[300px] resize-x overflow-hidden">Nhân sự HT {sortField === 'personnelId' ? (sortAsc ? '↑' : '↓') : ''}</th>
              <th onClick={() => handleSort('actualTime')} className="px-2 py-3 text-center text-xs font-bold text-gray-700 uppercase cursor-pointer hover:bg-gray-200 border-r min-w-[85px] max-w-[150px] resize-x overflow-hidden">TG thực tế {sortField === 'actualTime' ? (sortAsc ? '↑' : '↓') : ''}</th>
              <th onClick={() => handleSort('status')} className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase cursor-pointer hover:bg-gray-200 border-r min-w-[120px] max-w-[200px] resize-x overflow-hidden">Tiến độ {sortField === 'status' ? (sortAsc ? '↑' : '↓') : ''}</th>
              
              {project?.unitCustomColumns?.map(col => (
                  <th key={col} className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase resize-x overflow-hidden border-r max-w-[300px] min-w-[150px] group">
                    <div className="flex justify-between items-center">
                      <span>{col}</span>
                      <button onClick={() => handleDeleteCustomColumn(col)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" title="Xóa trường này">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </th>
              ))}
              
              <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase bg-white sticky right-0 shadow-[-4px_0_10px_rgba(0,0,0,0.05)] w-[90px]">Thao tác</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedUnits.length === 0 ? (
              <tr><td colSpan={13 + (project?.unitCustomColumns?.length || 0)} className="px-6 py-8 text-center text-gray-500">Chưa có chi nhánh nào phù hợp.</td></tr>
            ) : (
              sortedUnits.map(u => {
                const p = allPersonnel?.find(x => x.id === u.personnelId);
                const isOverdue = u.deadline && new Date(u.deadline) < new Date() && u.status !== 'COMPLETED';
                const isSelected = selectedIds.includes(u.id!);
                return (
                  <tr key={u.id} className={`hover:bg-blue-50 ${isSelected ? 'bg-blue-50' : ''}`}>
                    <td className="px-3 py-3 text-center border-r align-top">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(u.id!)} className="w-4 h-4" />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-r align-top break-words whitespace-normal">{u.code || '-'}</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 border-r align-top break-words whitespace-normal leading-tight">{u.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 border-r align-top break-words whitespace-normal">{u.address || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 border-r align-top break-words whitespace-normal">{u.contactName || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 border-r align-top break-words whitespace-normal">{u.contactPhone || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 border-r align-top break-words whitespace-normal">{u.deviceBrand || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 border-r align-top break-words whitespace-normal">{u.deviceSerial || '-'}</td>
                    
                    <td className="px-2 py-3 text-sm text-center border-r align-top">
                      <span className={isOverdue ? 'text-red-600 font-bold' : 'text-gray-700'}>
                        {u.deadline ? new Date(u.deadline).toLocaleDateString('vi-VN', {day: '2-digit', month:'2-digit', year:'numeric'}) : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 border-r align-top break-words whitespace-normal">{p?.fullName || '-'}</td>
                    <td className="px-2 py-3 text-sm text-center border-r text-green-700 font-medium align-top">
                      {u.actualTime ? new Date(u.actualTime).toLocaleDateString('vi-VN', {day: '2-digit', month:'2-digit', year:'numeric'}) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-center border-r align-top">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        u.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        u.status === 'DOCS_PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        u.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {u.status === 'COMPLETED' ? 'Hoàn thành' : u.status === 'DOCS_PENDING' ? 'Đang hoàn thiện HS' : u.status === 'IN_PROGRESS' ? 'Đang thực hiện' : 'Chưa triển khai'}
                      </span>
                    </td>
                    
                    {(project?.unitCustomColumns || []).map(col => (
                       <td key={col} className="px-4 py-3 text-sm text-gray-700 border-r align-top break-words whitespace-normal bg-yellow-50/30">
                          {u.customFields?.[col] || '-'}
                       </td>
                    ))}

                    <td className="px-4 py-3 text-center text-sm font-medium flex items-center justify-center space-x-2 bg-white sticky right-0 shadow-[-4px_0_10px_rgba(0,0,0,0.05)] h-full">
                      <button onClick={() => handlePrintMaintenance(u)} disabled={printingId === u.id} className="text-emerald-600 hover:text-emerald-900 p-1.5 bg-emerald-50 rounded-md disabled:opacity-50" title="In Biên bản bảo trì">
                        <Printer size={16} />
                      </button>
                      <button onClick={() => openEdit(u)} className="text-blue-600 hover:text-blue-900 p-1.5 bg-blue-50 rounded-md" title="Sửa"><Pencil size={16} /></button>
                      <button onClick={() => { if (confirm('Xóa chi nhánh này?')) db.projectUnits.delete(u.id!); }} className="text-red-600 hover:text-red-900 p-1.5 bg-red-50 rounded-md" title="Xóa"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold">{editingId ? 'Sửa Chi nhánh' : 'Thêm Chi nhánh'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400"><X size={24} /></button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã CN</label>
                  <input value={code} onChange={e => setCode(e.target.value)} className="w-full border p-2 rounded-md" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên Chi nhánh/Hạng mục *</label>
                  <input required value={name} onChange={e => setName(e.target.value)} className="w-full border p-2 rounded-md" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ mới</label>
                <input value={address} onChange={e => setAddress(e.target.value)} className="w-full border p-2 rounded-md" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cán bộ IT đầu mối</label>
                  <input value={contactName} onChange={e => setContactName(e.target.value)} className="w-full border p-2 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Điện thoại liên hệ</label>
                  <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="w-full border p-2 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chủng loại thiết bị</label>
                  <input value={deviceType} onChange={e => setDeviceType(e.target.value)} className="w-full border p-2 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hãng sản xuất</label>
                  <input value={deviceBrand} onChange={e => setDeviceBrand(e.target.value)} className="w-full border p-2 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Serial thiết bị</label>
                  <input value={deviceSerial} onChange={e => setDeviceSerial(e.target.value)} className="w-full border p-2 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái (Tiến độ)</label>
                  <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full border p-2 rounded-md">
                    <option value="NOT_STARTED">Chưa triển khai</option>
                    <option value="IN_PROGRESS">Đang thực hiện</option>
                    <option value="DOCS_PENDING">Đang hoàn thiện HS</option>
                    <option value="COMPLETED">Đã hoàn thành</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian dự kiến</label>
                  <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full border p-2 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian thực tế</label>
                  <input type="date" value={actualTime} onChange={e => setActualTime(e.target.value)} className="w-full border p-2 rounded-md" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nhân sự thực hiện (HT)</label>
                <select value={personnelId} onChange={e => setPersonnelId(e.target.value)} className="w-full border p-2 rounded-md">
                  <option value="">-- Không gán (Để trống) --</option>
                  {allPersonnel?.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                </select>
              </div>

              {project?.unitCustomColumns && project.unitCustomColumns.length > 0 && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-bold text-gray-700 mb-3">Các trường dữ liệu tuỳ biến</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {project.unitCustomColumns.map(col => (
                      <div key={col}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{col}</label>
                        <input value={customFields[col] || ''} onChange={e => setCustomFields({...customFields, [col]: e.target.value})} className="w-full border p-2 rounded-md bg-yellow-50/30" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú thêm</label>
                <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className="w-full border p-2 rounded-md"></textarea>
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
