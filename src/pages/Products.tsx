import { useLiveQuery } from 'dexie-react-hooks';
import { db, type User, type Product } from '../db/db';
import { useMemo, useState, useEffect, useRef } from 'react';
import { CheckSquare, FileText, Search, Edit2, Save, X, Layers, GitMerge, CheckCircle, RefreshCw } from 'lucide-react';
import { detectDuplicateGroups, normalizeUnit, normalizeText, areProductsMatch, type DuplicateGroup } from '../lib/productMatcher';

interface ProductsProps {
  onNavigate?: (tab: string) => void;
  setPrefilledProducts?: (ids: number[]) => void;
  currentUser?: User | null;
}

export default function Products({ onNavigate, setPrefilledProducts, currentUser }: ProductsProps) {
  const products = useLiveQuery(() => db.products.toArray());
  const documents = useLiveQuery(() => db.documents.toArray());
  const customers = useLiveQuery(() => db.customers.toArray());
  
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'PRODUCT' | 'SOLD_OUT' | 'SERVICE' | 'EXPENSE'>('PRODUCT');
  
  // Trạng thái đang chỉnh sửa
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<'PRODUCT' | 'SERVICE' | 'EXPENSE'>('PRODUCT');
  const [editCategory, setEditCategory] = useState('');

  // Tự động nhận diện các nhóm sản phẩm trùng lặp (tên giống nhau, khác ĐVT hoặc kiểu chữ)
  const duplicateGroups = useMemo(() => {
    return detectDuplicateGroups(products || [], documents || []);
  }, [products, documents]);

  // Tự động đồng bộ và gộp các sản phẩm trùng lặp ngầm trong IndexedDB (chạy ngầm, không làm phiền người dùng)
  const isAutoConsolidatingRef = useRef(false);

  useEffect(() => {
    if (!products || products.length < 2 || !documents || isAutoConsolidatingRef.current) return;

    // Lọc các nhóm trùng lặp có độ tin cậy tuyệt đối/cao
    const exactDuplicates = detectDuplicateGroups(products, documents).filter(g => 
      g.duplicateProducts.length > 0 && 
      (g.reason.includes('hoàn toàn trùng khớp') || g.reason.includes('khác kiểu ĐVT') || g.reason.includes('Tên cốt lõi'))
    );

    if (exactDuplicates.length === 0) return;

    const performBackgroundConsolidation = async () => {
      try {
        isAutoConsolidatingRef.current = true;
        for (const group of exactDuplicates) {
          const target = group.targetProduct;
          const duplicates = group.duplicateProducts;
          const dupIds = duplicates.map(p => p.id!).filter(Boolean);
          if (dupIds.length === 0) continue;

          const dupNames = new Set(duplicates.map(p => normalizeText(p.name)));
          dupNames.add(normalizeText(target.name));

          // 1. Cập nhật sản phẩm chính với tên chuẩn hóa, ĐVT chuẩn hóa và Tồn kho thực tế (Nhập - Xuất)
          await db.products.update(target.id!, {
            name: group.canonicalName,
            unit: group.canonicalUnit,
            stock: group.totalStock,
            updatedAt: new Date()
          });

          // 2. Chuyển toàn bộ các chứng từ lịch sử về ID và tên của sản phẩm chính
          const allDocs = await db.documents.toArray();
          for (const doc of allDocs) {
            if (!doc.items || !Array.isArray(doc.items)) continue;
            let changed = false;

            doc.items.forEach(item => {
              const isIdMatch = item.productId && dupIds.includes(item.productId);
              const isNameMatch = item.productName && dupNames.has(normalizeText(item.productName));

              if (isIdMatch || isNameMatch) {
                item.productId = target.id;
                item.productName = group.canonicalName;
                item.unit = group.canonicalUnit;
                changed = true;
              }
            });

            if (changed) {
              await db.documents.update(doc.id!, { items: doc.items });
            }
          }

          // 3. Xóa các sản phẩm trùng lặp thừa
          await db.products.bulkDelete(dupIds);
        }
      } catch (err) {
        console.error("Auto consolidation background error:", err);
      } finally {
        isAutoConsolidatingRef.current = false;
      }
    };

    performBackgroundConsolidation();
  }, [products, documents]);

  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [manualMergeModal, setManualMergeModal] = useState<{
    isOpen: boolean;
    products: Product[];
    selectedTargetId: number;
    customName: string;
    customUnit: string;
  } | null>(null);

  const [isMerging, setIsMerging] = useState(false);

  // Gộp 1 nhóm trùng lặp
  const handleMergeGroup = async (group: DuplicateGroup) => {
    if (!confirm(`Xác nhận gộp ${group.allProducts.length} dòng mặt hàng "${group.canonicalName}" thành 1 dòng duy nhất?\n(Tổng tồn sau gộp: ${group.totalStock} ${group.canonicalUnit})`)) {
      return;
    }

    try {
      setIsMerging(true);
      const target = group.targetProduct;
      const duplicates = group.duplicateProducts;
      const dupIds = duplicates.map(p => p.id!);
      const dupNames = new Set(duplicates.map(p => normalizeText(p.name)));

      // 1. Cập nhật sản phẩm đích (cộng dồn tồn kho, chuẩn hóa tên và ĐVT)
      await db.products.update(target.id!, {
        name: group.canonicalName,
        unit: group.canonicalUnit,
        stock: group.totalStock,
        updatedAt: new Date()
      });

      // 2. Chuyển toàn bộ chứng từ lịch sử (Hóa đơn, Báo giá) liên quan về ID và Tên chuẩn của sản phẩm đích
      const allDocs = await db.documents.toArray();
      for (const doc of allDocs) {
        if (!doc.items || !Array.isArray(doc.items)) continue;
        let changed = false;

        doc.items.forEach(item => {
          const isIdMatch = item.productId && dupIds.includes(item.productId);
          const isNameMatch = item.productName && dupNames.has(normalizeText(item.productName));

          if (isIdMatch || isNameMatch) {
            item.productId = target.id;
            item.productName = group.canonicalName;
            item.unit = group.canonicalUnit;
            changed = true;
          }
        });

        if (changed) {
          await db.documents.update(doc.id!, { items: doc.items });
        }
      }

      // 3. Xóa bỏ các dòng sản phẩm thừa
      await db.products.bulkDelete(dupIds);
      setSelectedIds(prev => prev.filter(id => !dupIds.includes(id)));
    } catch (err: any) {
      console.error("Lỗi khi gộp sản phẩm:", err);
      alert("Lỗi khi gộp: " + err.message);
    } finally {
      setIsMerging(false);
    }
  };

  // 1-Click: Gộp tất cả các nhóm trùng lặp
  const handleMergeAllGroups = async () => {
    if (duplicateGroups.length === 0) return;
    if (!confirm(`Xác nhận TỰ ĐỘNG THỐNG NHẤT VÀ GỘP TẤT CẢ ${duplicateGroups.length} nhóm mặt hàng bị trùng lặp?\nHành động này sẽ cộng dồn tồn kho và hợp nhất toàn bộ lịch sử chứng từ.`)) {
      return;
    }

    try {
      setIsMerging(true);
      for (const group of duplicateGroups) {
        const target = group.targetProduct;
        const duplicates = group.duplicateProducts;
        const dupIds = duplicates.map(p => p.id!);
        const dupNames = new Set(duplicates.map(p => normalizeText(p.name)));

        await db.products.update(target.id!, {
          name: group.canonicalName,
          unit: group.canonicalUnit,
          stock: group.totalStock,
          updatedAt: new Date()
        });

        const allDocs = await db.documents.toArray();
        for (const doc of allDocs) {
          if (!doc.items || !Array.isArray(doc.items)) continue;
          let changed = false;

          doc.items.forEach(item => {
            const isIdMatch = item.productId && dupIds.includes(item.productId);
            const isNameMatch = item.productName && dupNames.has(normalizeText(item.productName));

            if (isIdMatch || isNameMatch) {
              item.productId = target.id;
              item.productName = group.canonicalName;
              item.unit = group.canonicalUnit;
              changed = true;
            }
          });

          if (changed) {
            await db.documents.update(doc.id!, { items: doc.items });
          }
        }

        await db.products.bulkDelete(dupIds);
      }
      setSelectedIds([]);
      setIsMergeModalOpen(false);
      alert(`Đã thống nhất và gộp thành công ${duplicateGroups.length} nhóm mặt hàng trùng lặp!`);
    } catch (err: any) {
      console.error("Lỗi khi gộp tất cả:", err);
      alert("Lỗi khi gộp: " + err.message);
    } finally {
      setIsMerging(false);
    }
  };

  // Mở modal gộp thủ công khi chọn checkbox
  const handleOpenManualMerge = () => {
    if (selectedIds.length < 2) {
      alert("Vui lòng tích chọn ít nhất 2 mặt hàng để gộp!");
      return;
    }
    const prods = (products || []).filter(p => selectedIds.includes(p.id!));
    if (prods.length < 2) return;

    const sorted = [...prods].sort((a, b) => (b.stock || 0) - (a.stock || 0));
    setManualMergeModal({
      isOpen: true,
      products: prods,
      selectedTargetId: sorted[0].id!,
      customName: sorted[0].name,
      customUnit: normalizeUnit(sorted[0].unit || 'Cái')
    });
  };

  // Xác nhận gộp thủ công
  const handleConfirmManualMerge = async () => {
    if (!manualMergeModal) return;
    const { products: prods, selectedTargetId, customName, customUnit } = manualMergeModal;
    const target = prods.find(p => p.id === selectedTargetId);
    if (!target) return;

    const duplicates = prods.filter(p => p.id !== selectedTargetId);
    const dupIds = duplicates.map(p => p.id!);
    const dupNames = new Set(duplicates.map(p => normalizeText(p.name)));
    const totalStock = prods.reduce((sum, p) => sum + (p.stock || 0), 0);

    try {
      setIsMerging(true);
      await db.products.update(target.id!, {
        name: customName.trim(),
        unit: normalizeUnit(customUnit),
        stock: totalStock,
        updatedAt: new Date()
      });

      const allDocs = await db.documents.toArray();
      for (const doc of allDocs) {
        if (!doc.items || !Array.isArray(doc.items)) continue;
        let changed = false;

        doc.items.forEach(item => {
          const isIdMatch = item.productId && dupIds.includes(item.productId);
          const isNameMatch = item.productName && dupNames.has(normalizeText(item.productName));

          if (isIdMatch || isNameMatch) {
            item.productId = target.id;
            item.productName = customName.trim();
            item.unit = normalizeUnit(customUnit);
            changed = true;
          }
        });

        if (changed) {
          await db.documents.update(doc.id!, { items: doc.items });
        }
      }

      await db.products.bulkDelete(dupIds);
      setSelectedIds([]);
      setManualMergeModal(null);
      alert(`Đã gộp thành công ${prods.length} mặt hàng thành 1 dòng duy nhất!`);
    } catch (err: any) {
      console.error("Lỗi khi gộp thủ công:", err);
      alert("Lỗi: " + err.message);
    } finally {
      setIsMerging(false);
    }
  };

  const [soldModal, setSoldModal] = useState<{ isOpen: boolean; productIds: number[] } | null>(null);
  const [soldDate, setSoldDate] = useState(new Date().toISOString().split('T')[0]);
  const [soldCustomerId, setSoldCustomerId] = useState<string>('');
  const [soldDocNumber, setSoldDocNumber] = useState('');
  const [soldTotalAmount, setSoldTotalAmount] = useState<number | ''>('');

  const [historyModal, setHistoryModal] = useState<{
    isOpen: boolean;
    product: any;
    history: any[];
  }>({ isOpen: false, product: null, history: [] });
  const [historySortAsc, setHistorySortAsc] = useState(false);

  const openHistoryModal = async (product: any) => {
    if (!documents) return;
    const historyList = [];
    const prodIds = (product.allIds && product.allIds.length > 0) ? product.allIds : [product.id];
    const normName = normalizeText(product.name);
    
    for (const doc of documents) {
      if (!doc.items || !Array.isArray(doc.items)) continue;
      
      const matches = doc.items.filter((item: any) => 
        (item.productId && prodIds.includes(item.productId)) ||
        normName === normalizeText(item.productName) || 
        (product.code && product.code.trim() !== '' && product.code === item.productId?.toString())
      );
      
      if (matches.length > 0) {
        let customerName = 'Không rõ đối tác';
        if (doc.customerId) {
          try {
            const customer = await db.customers.get(doc.customerId);
            if (customer) customerName = customer.name;
          } catch (e) {}
        }
        
        for (const match of matches) {
          historyList.push({
            docId: doc.id,
            date: doc.date,
            docNumber: doc.docNumber,
            type: doc.type,
            customerName,
            quantity: match.quantity,
            unitPrice: match.unitPrice,
            taxRate: match.taxRate || 0,
            amount: match.amount || (match.quantity * match.unitPrice)
          });
        }
      }
    }
    
    // Sắp xếp ngày mới nhất lên đầu
    historyList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    setHistoryModal({
      isOpen: true,
      product,
      history: historyList
    });
  };

  // Tính toán Tổng Mua Vào và Tổng Bán Ra cho từng sản phẩm
  const productStats = useMemo(() => {
    if (!products || !documents) return [];

    const statsMap: Record<number, { totalIn: number, totalOut: number, lastInDate: Date | null, lastInPrice: number, lastOutDate: Date | null, lastOutPrice: number }> = {};
    products.forEach(p => {
      statsMap[p.id!] = { totalIn: 0, totalOut: 0, lastInDate: null, lastInPrice: 0, lastOutDate: null, lastOutPrice: 0 };
    });

    documents.forEach(doc => {
      if (!doc.items || !Array.isArray(doc.items)) return;
      const docDate = new Date(doc.date);
      
      doc.items.forEach(item => {
        const product = products.find(p => 
          (item.productId && p.id === item.productId) ||
          normalizeText(p.name) === normalizeText(item.productName) || 
          (p.code && p.code.trim() !== '' && p.code === item.productId?.toString())
        );
        
        if (product && product.id) {
          const qty = Number(item.quantity) || 0;
          const price = Number(item.unitPrice) || 0;
          
          if (doc.type === 'INPUT_INVOICE') {
            statsMap[product.id].totalIn += qty;
            if (!statsMap[product.id].lastInDate || docDate >= statsMap[product.id].lastInDate!) {
              statsMap[product.id].lastInDate = docDate;
              statsMap[product.id].lastInPrice = price;
            }
          } else if (doc.type === 'OUTPUT_INVOICE' || doc.type === 'DELIVERY_NOTE' || doc.type === 'QUOTATION') {
            if (doc.type !== 'QUOTATION') statsMap[product.id].totalOut += qty;
            
            // Dùng cả Báo giá và Bán ra để làm Giá bán tham khảo
            if (!statsMap[product.id].lastOutDate || docDate >= statsMap[product.id].lastOutDate!) {
              statsMap[product.id].lastOutDate = docDate;
              statsMap[product.id].lastOutPrice = price;
            }
          }
        }
      });
    });

    // Gom cụm các sản phẩm trùng lặp (on-the-fly) để bảng luôn hiển thị đúng 1 dòng duy nhất cho cùng 1 mặt hàng
    const clusters: Array<{
      primary: Product;
      members: Product[];
      allIds: number[];
      canonicalName: string;
      canonicalUnit: string;
      totalIn: number;
      totalOut: number;
      lastInPrice: number;
      lastOutPrice: number;
      stock: number;
    }> = [];

    const clusterAssigned = new Set<number>();

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (!p.id || clusterAssigned.has(p.id)) continue;

      const clusterMembers: Product[] = [p];
      clusterAssigned.add(p.id);

      for (let j = i + 1; j < products.length; j++) {
        const other = products[j];
        if (!other.id || clusterAssigned.has(other.id)) continue;

        const match = areProductsMatch(p, other);
        if (match.isMatch) {
          clusterMembers.push(other);
          clusterAssigned.add(other.id);
        }
      }

      // Chọn sản phẩm mốc đại diện
      const sortedMembers = [...clusterMembers].sort((a, b) => {
        const aStats = statsMap[a.id!] || { totalIn: 0, totalOut: 0 };
        const bStats = statsMap[b.id!] || { totalIn: 0, totalOut: 0 };
        const aAct = aStats.totalIn + aStats.totalOut;
        const bAct = bStats.totalIn + bStats.totalOut;
        if (bAct !== aAct) return bAct - aAct;
        return (b.stock || 0) - (a.stock || 0);
      });

      const primary = sortedMembers[0];
      const allIds = clusterMembers.map(m => m.id!);
      const canonicalName = primary.name.replace(/\s+/g, ' ').trim();
      const canonicalUnit = normalizeUnit(primary.unit || clusterMembers.find(m => m.unit)?.unit || 'Cái');

      // Tổng hợp giao dịch
      let clusterTotalIn = 0;
      let clusterTotalOut = 0;
      let clusterLastInPrice = 0;
      let clusterLastOutPrice = 0;
      let clusterStockSum = 0;

      clusterMembers.forEach(m => {
        const s = statsMap[m.id!];
        if (s) {
          clusterTotalIn += s.totalIn;
          clusterTotalOut += s.totalOut;
          if (s.lastInPrice > clusterLastInPrice) clusterLastInPrice = s.lastInPrice;
          if (s.lastOutPrice > clusterLastOutPrice) clusterLastOutPrice = s.lastOutPrice;
        }
        clusterStockSum += (m.stock || 0);
      });

      if (clusterLastOutPrice === 0) {
        clusterLastOutPrice = primary.unitPrice || 0;
      }

      // Tồn kho thực tế: nếu có phát sinh giao dịch Nhập thì số lượng thực tế = Nhập - Xuất
      const realStock = clusterTotalIn > 0 ? (clusterTotalIn - clusterTotalOut) : clusterStockSum;

      clusters.push({
        primary,
        members: clusterMembers,
        allIds,
        canonicalName,
        canonicalUnit,
        totalIn: clusterTotalIn,
        totalOut: clusterTotalOut,
        lastInPrice: clusterLastInPrice,
        lastOutPrice: clusterLastOutPrice,
        stock: realStock
      });
    }

    return clusters.map(c => {
      const p = c.primary;
      return {
        ...p,
        id: p.id!,
        allIds: c.allIds,
        name: c.canonicalName,
        unit: c.canonicalUnit,
        stock: c.stock,
        type: p.type || 'PRODUCT',
        category: p.category || c.members.find(m => m.category)?.category || '',
        totalIn: c.totalIn,
        totalOut: c.totalOut,
        lastInPrice: c.lastInPrice,
        lastOutPrice: c.lastOutPrice
      };
    }).filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.code && p.code.toLowerCase().includes(searchQuery.toLowerCase()));
      
      let matchType = false;
      if (activeTab === 'PRODUCT') {
        matchType = p.type === 'PRODUCT' && (p.stock || 0) > 0;
      } else if (activeTab === 'SOLD_OUT') {
        matchType = p.type === 'PRODUCT' && (p.stock || 0) <= 0;
      } else if (activeTab === 'SERVICE') {
        matchType = p.type === 'SERVICE';
      } else if (activeTab === 'EXPENSE') {
        matchType = p.type === 'EXPENSE';
      }
      
      return matchSearch && matchType;
    });
  }, [products, documents, searchQuery, activeTab]);

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  }

  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleCreateQuotation = () => {
    if (setPrefilledProducts) setPrefilledProducts(selectedIds);
    if (onNavigate) onNavigate('create-quote');
  };

  const startEdit = (product: any) => {
    setEditingId(product.id!);
    setEditName(product.name);
    setEditType(product.type);
    setEditCategory(product.category || '');
  };

  const [dateModal, setDateModal] = useState<{
    isOpen: boolean;
    type: 'BULK' | 'INLINE';
    bulkIds?: number[];
    inlineId?: number;
    inlineOldName?: string;
  } | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const saveEdit = async (productId: number, oldName: string) => {
    const prod = products?.find(p => p.id === productId);
    if (editType === 'EXPENSE' && prod && prod.type !== 'EXPENSE') {
      setDateModal({ isOpen: true, type: 'INLINE', inlineId: productId, inlineOldName: oldName });
      return;
    }
    await executeInlineSave(productId, oldName, undefined);
  };

  const executeInlineSave = async (productId: number, oldName: string, expDate?: Date) => {
    try {
      let extraUpdate: any = {};
      if (expDate) {
        extraUpdate.expenseDate = expDate;
      }

      await db.products.update(productId, { 
        name: editName, 
        type: editType, 
        category: editCategory,
        ...extraUpdate
      });
      
      if (oldName.trim().toLowerCase() !== editName.trim().toLowerCase()) {
        const allDocs = await db.documents.toArray();
        for (const doc of allDocs) {
          let hasChanged = false;
          if (doc.items && Array.isArray(doc.items)) {
            doc.items.forEach(item => {
              if (item.productName.trim().toLowerCase() === oldName.trim().toLowerCase()) {
                item.productName = editName;
                hasChanged = true;
              }
            });
            if (hasChanged) {
              await db.documents.update(doc.id!, { items: doc.items });
            }
          }
        }
      }
      setEditingId(null);
    } catch (err) {
      console.error("Lỗi khi cập nhật sản phẩm:", err);
      alert("Có lỗi xảy ra khi lưu thay đổi.");
    }
  };

  const handleConfirmDateModal = async () => {
    if (!dateModal) return;
    const d = new Date(selectedDate);
    if (isNaN(d.getTime())) {
      alert("Ngày chọn không hợp lệ!");
      return;
    }

    if (dateModal.type === 'BULK' && dateModal.bulkIds) {
      for (const id of dateModal.bulkIds) {
        await db.products.update(id, { type: 'EXPENSE', expenseDate: d });
      }
      setSelectedIds([]);
    } else if (dateModal.type === 'INLINE' && dateModal.inlineId) {
      await executeInlineSave(dateModal.inlineId, dateModal.inlineOldName || '', d);
    }
    
    setDateModal(null);
  };



  const handleMarkAsSold = async () => {
    if (selectedIds.length === 0) return;
    let totalValue = 0;
    for (const id of selectedIds) {
      const p = await db.products.get(id);
      if (p) {
        const qty = p.stock > 0 ? p.stock : 1;
        totalValue += qty * p.unitPrice;
      }
    }
    setSoldDocNumber(`PX-${Date.now().toString().slice(-6)}`);
    setSoldTotalAmount(totalValue);
    setSoldModal({ isOpen: true, productIds: selectedIds });
  };

  const handleConfirmSoldModal = async () => {
    if (!soldModal || !soldCustomerId) {
      alert("Vui lòng chọn khách hàng!");
      return;
    }
    const d = new Date(soldDate);
    if (isNaN(d.getTime())) {
      alert("Ngày bán không hợp lệ!");
      return;
    }

    let actualCustomerId = parseInt(soldCustomerId);
    
    if (soldCustomerId === 'RETAIL') {
      let retail = customers?.find(c => c.name.toLowerCase() === 'khách lẻ');
      if (retail && retail.id) {
        actualCustomerId = retail.id;
      } else {
        actualCustomerId = await db.customers.add({ name: 'Khách lẻ', taxCode: '', address: '' }) as number;
      }
    }

    const itemsToSell = [];
    let baseTotal = 0;
    const prods = [];

    for (const id of soldModal.productIds) {
      const prod = await db.products.get(id);
      if (prod) {
        prods.push(prod);
        const sellQty = prod.stock > 0 ? prod.stock : 1;
        baseTotal += sellQty * prod.unitPrice;
      }
    }

    const finalTotal = soldTotalAmount !== '' ? Number(soldTotalAmount) : baseTotal;
    const ratio = baseTotal > 0 ? (finalTotal / baseTotal) : 1;
    let actualTotal = 0;

    for (const prod of prods) {
      const sellQty = prod.stock > 0 ? prod.stock : 1;
      await db.products.update(prod.id!, { stock: 0 });
      
      const adjustedUnitPrice = baseTotal > 0 ? Math.round(prod.unitPrice * ratio) : (prods.length === 1 ? Math.round(finalTotal / sellQty) : 0);
      const amount = sellQty * adjustedUnitPrice;
      actualTotal += amount;
      
      itemsToSell.push({
        productId: prod.id,
        productName: prod.name,
        unit: prod.unit,
        quantity: sellQty,
        unitPrice: adjustedUnitPrice,
        taxRate: prod.taxRate || 0,
        amount: amount
      });
    }

    if (itemsToSell.length > 0) {
      await db.documents.add({
        type: 'OUTPUT_INVOICE',
        docNumber: soldDocNumber.trim() || `PX-${Date.now().toString().slice(-6)}`,
        customerId: actualCustomerId,
        date: d,
        items: itemsToSell,
        subTotal: actualTotal,
        taxAmount: 0,
        total: actualTotal,
        createdAt: new Date(),
        status: 'COMPLETED'
      });
    }

    setSoldModal(null);
    setSelectedIds([]);
    setSoldCustomerId('');
    alert("Đã chuyển thành công sang Đã Bán và lưu thông tin xuất hàng!");
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-blue-600" />
            Danh sách Tồn kho & Chi phí
          </h3>
          <p className="text-sm text-gray-500 mt-1">Dữ liệu được trích xuất tự động từ Hóa đơn điện tử</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {/* Thanh tìm kiếm */}
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Tìm tên hoặc mã SP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          {/* Tabs chuyển đổi */}
          <div className="flex bg-gray-100 p-1 rounded-lg w-full sm:w-auto overflow-hidden">
            <button
              onClick={() => { setActiveTab('PRODUCT'); setSelectedIds([]); }}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'PRODUCT' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📦 Tồn kho
            </button>
            <button
              onClick={() => { setActiveTab('SOLD_OUT'); setSelectedIds([]); }}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'SOLD_OUT' ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              🏷️ Đã bán
            </button>
            <button
              onClick={() => { setActiveTab('EXPENSE'); setSelectedIds([]); }}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'EXPENSE' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              💸 Chi phí HĐ
            </button>
          </div>

          {/* Nút Kiểm tra & Gộp mặt hàng trùng lặp */}
          {duplicateGroups.length > 0 ? (
            <button
              type="button"
              onClick={() => setIsMergeModalOpen(true)}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-md text-sm font-semibold shadow-sm transition-all animate-pulse whitespace-nowrap"
              title="Phát hiện mặt hàng trùng lặp tên hoặc đơn vị tính"
            >
              <Layers className="w-4 h-4" />
              <span>Gộp trùng lặp (${duplicateGroups.length})</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsMergeModalOpen(true)}
              className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
              title="Kiểm tra và thống nhất mặt hàng trùng lặp"
            >
              <Layers className="w-4 h-4 text-gray-500" />
              <span>Kiểm tra trùng</span>
            </button>
          )}

          {/* Nút Báo giá & Chuyển đổi */}
          {selectedIds.length > 0 && (
            <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
              {activeTab === 'PRODUCT' && (
                <>
                  <button 
                    onClick={handleCreateQuotation}
                    className="flex-1 sm:flex-none items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm whitespace-nowrap justify-center flex"
                  >
                    <FileText className="w-4 h-4" />
                    Báo Giá ({selectedIds.length})
                  </button>
                  <button 
                    onClick={handleMarkAsSold}
                    className="flex-1 sm:flex-none items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm whitespace-nowrap justify-center flex"
                  >
                    Chuyển sang Đã Bán
                  </button>
                  {selectedIds.length >= 2 && (
                    <button 
                      type="button"
                      onClick={handleOpenManualMerge}
                      className="flex-1 sm:flex-none items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-md text-sm font-bold transition-colors shadow-sm whitespace-nowrap justify-center flex"
                      title="Gộp các mặt hàng đã chọn thành 1 dòng duy nhất"
                    >
                      <GitMerge className="w-4 h-4" />
                      Gộp (${selectedIds.length}) thành 1
                    </button>
                  )}
                </>
              )}
              <select
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm cursor-pointer outline-none"
                onChange={async (e) => {
                  const newType = e.target.value;
                  if (!newType) return;
                  
                  const typeName = newType === 'PRODUCT' ? 'Hàng hóa' : newType === 'SERVICE' ? 'Dịch vụ' : 'Chi phí hoạt động';
                  
                  if (newType === 'EXPENSE') {
                    setDateModal({ isOpen: true, type: 'BULK', bulkIds: selectedIds });
                  } else {
                    if (confirm(`Chuyển ${selectedIds.length} mặt hàng đã chọn sang nhóm ${typeName}?`)) {
                      for (const id of selectedIds) {
                        await db.products.update(id, { type: newType as any });
                      }
                      setSelectedIds([]);
                    }
                  }
                  e.target.value = ''; // Reset select
                }}
              >
                <option value="">-- Chuyển nhóm thành --</option>
                <option value="PRODUCT">Hàng hóa</option>
                <option value="SERVICE">Dịch vụ</option>
                <option value="EXPENSE">Chi phí hoạt động</option>
              </select>
            </div>
          )}
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left w-10 border-r border-gray-200"></th>
              <th className="p-0 border-r border-gray-200">
                <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase overflow-hidden min-w-[200px]" style={{ resize: 'horizontal' }}>Tên sản phẩm / Dịch vụ</div>
              </th>
              <th className="p-0 border-r border-gray-200">
                <div className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase overflow-hidden min-w-[120px]" style={{ resize: 'horizontal' }}>Phân loại</div>
              </th>
              <th className="p-0 border-r border-gray-200">
                <div className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase overflow-hidden min-w-[80px]" style={{ resize: 'horizontal' }}>ĐVT</div>
              </th>
              <th className="p-0 border-r border-gray-200">
                <div className="px-6 py-3 text-right text-xs font-medium text-blue-600 uppercase overflow-hidden min-w-[120px]" style={{ resize: 'horizontal' }}>Giá nhập<br/>(gần nhất)</div>
              </th>
              <th className="p-0 border-r border-gray-200">
                <div className="px-6 py-3 text-right text-xs font-medium text-green-600 uppercase overflow-hidden min-w-[120px]" style={{ resize: 'horizontal' }}>Giá bán<br/>(gần nhất)</div>
              </th>
              <th className="p-0 border-r border-gray-200">
                <div className="px-6 py-3 text-center text-xs font-medium text-blue-600 uppercase overflow-hidden min-w-[100px]" style={{ resize: 'horizontal' }}>Tổng Mua</div>
              </th>
              {activeTab !== 'EXPENSE' && (
                <th className="p-0 border-r border-gray-200">
                  <div className="px-6 py-3 text-center text-xs font-medium text-green-600 uppercase overflow-hidden min-w-[100px]" style={{ resize: 'horizontal' }}>Tổng Bán</div>
                </th>
              )}
              {activeTab !== 'SERVICE' && (
                <th className="p-0 border-r border-gray-200">
                  <div className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase overflow-hidden min-w-[100px]" style={{ resize: 'horizontal' }}>Tồn kho / SL</div>
                </th>
              )}
              <th className="px-4 py-3 text-center min-w-[80px]"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {productStats.map((product) => {
              const isEditing = editingId === product.id;
              const isSelected = selectedIds.includes(product.id!) || Boolean(product.allIds && product.allIds.some((id: number) => selectedIds.includes(id)));
              
              return (
                <tr key={product.id} className={`hover:bg-blue-50 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50' : ''}`} onClick={() => openHistoryModal(product)}>
                  <td className="px-4 py-4 text-center border-r border-gray-100" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      disabled={false}
                      checked={isSelected}
                      onChange={() => handleToggleSelect(product.id!)}
                      title="Chọn để thao tác"
                    />
                  </td>
                  
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-100 max-w-md">
                    {isEditing ? (
                      <textarea
                        value={editName}
                        onChange={(e) => {
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                          setEditName(e.target.value);
                        }}
                        className="w-full min-w-[250px] border border-blue-400 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none overflow-hidden"
                        rows={1}
                        autoFocus
                      />
                    ) : (
                      <span className="whitespace-pre-wrap break-words">{product.name}</span>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 text-sm text-center border-r border-gray-100">
                    {isEditing ? (
                      <div className="flex flex-col space-y-2">
                        <select 
                          value={editType} 
                          onChange={e => setEditType(e.target.value as any)}
                          className="border border-blue-400 rounded-md p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm w-full"
                        >
                          <option value="PRODUCT">Hàng hóa</option>
                          <option value="SERVICE">Dịch vụ</option>
                          <option value="EXPENSE">Chi phí HĐ</option>
                        </select>
                        <input 
                          type="text" 
                          placeholder="Nhập Nhóm hàng (vd: Phụ tùng)..."
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="border border-blue-400 rounded-md p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm w-full"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center space-y-1">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full whitespace-nowrap ${
                          product.type === 'SERVICE' ? 'bg-purple-100 text-purple-800' : 
                          product.type === 'EXPENSE' ? 'bg-red-100 text-red-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {product.type === 'SERVICE' ? 'Dịch vụ' : product.type === 'EXPENSE' ? 'Chi phí HĐ' : 'Hàng hóa'}
                        </span>
                        {product.category && (
                          <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 whitespace-nowrap">
                            {product.category}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 border-r border-gray-100">{product.unit}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 border-r border-gray-100">{product.lastInPrice ? formatNumber(product.lastInPrice) : '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900 border-r border-gray-100">{formatNumber(product.lastOutPrice)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium text-blue-600 border-r border-gray-100">{product.totalIn}</td>
                  
                  {activeTab !== 'EXPENSE' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium text-green-600 border-r border-gray-100">{product.totalOut}</td>
                  )}
                  
                  {activeTab !== 'SERVICE' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-gray-900 border-r border-gray-100">
                      <span className={`px-2 py-1 rounded-full ${product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {product.stock}
                      </span>
                    </td>
                  )}
                  
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                    {isEditing ? (
                      <div className="flex items-center space-x-2">
                        <button onClick={() => saveEdit(product.id!, product.name)} className="text-green-600 hover:text-green-900" title="Lưu">
                          <Save className="h-5 w-5" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-red-600 hover:text-red-900" title="Hủy">
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                      currentUser?.role !== 'VIEWER' && (
                        <button onClick={() => startEdit(product)} className="text-gray-400 hover:text-blue-600 transition-colors" title="Chỉnh sửa tên / loại">
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )
                    )}
                  </td>
                </tr>
              );
            })}
            
            {productStats.length === 0 && (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-sm text-gray-500">
                  <div className="flex flex-col items-center">
                    <FileText className="h-10 w-10 text-gray-300 mb-3" />
                    <p>Chưa có sản phẩm hoặc không tìm thấy kết quả phù hợp.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal chọn ngày ghi nhận chi phí */}
      {dateModal?.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Ngày ghi nhận chi phí</h3>
            <p className="text-sm text-gray-600 mb-5">
              Vui lòng chọn ngày để phân bổ chi phí này vào tháng tương ứng trên báo cáo Tài chính.
            </p>
            <input 
              type="date" 
              className="w-full border border-gray-300 rounded-md p-2.5 mb-6 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDateModal(null)}
                className="px-4 py-2 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 font-medium transition-colors"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleConfirmDateModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition-colors"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal chuyển trạng thái Đã Bán */}
      {soldModal?.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Chuyển sang Đã Bán</h3>
            <p className="text-sm text-gray-600 mb-5">
              Bạn đang chuyển {soldModal.productIds.length} mặt hàng sang nhóm Đã Bán. Hãy điền thông tin Hóa đơn bán ra để lưu vết.
            </p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Khách hàng / Đối tác</label>
                <select 
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  value={soldCustomerId}
                  onChange={e => setSoldCustomerId(e.target.value)}
                >
                  <option value="" disabled>-- Chọn khách hàng --</option>
                  <option value="RETAIL" className="font-bold text-blue-600">Khách lẻ (Tự động thêm vào danh bạ)</option>
                  {customers?.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số Hóa đơn (Mã chứng từ)</label>
                <input 
                  type="text" 
                  placeholder="VD: PX-001234 (Để trống sẽ tạo tự động)"
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  value={soldDocNumber}
                  onChange={e => setSoldDocNumber(e.target.value)}
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bán</label>
                  <input 
                    type="date" 
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                    value={soldDate}
                    onChange={e => setSoldDate(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tổng tiền bán được (VNĐ)</label>
                  <input 
                    type="number" 
                    placeholder="Nhập giá bán thực tế..."
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-bold text-green-700"
                    value={soldTotalAmount}
                    onChange={e => setSoldTotalAmount(e.target.value ? Number(e.target.value) : '')}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 italic mt-1">
                * Việc nhập tổng tiền bán được giúp hệ thống tự động chia tỉ lệ để hạch toán lời lỗ chính xác trên từng mặt hàng.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setSoldModal(null)}
                className="px-4 py-2 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 font-medium transition-colors"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleConfirmSoldModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
                disabled={!soldCustomerId}
              >
                Xác nhận Bán
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Lịch sử giao dịch Sản phẩm */}
      {historyModal.isOpen && historyModal.product && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b bg-blue-50">
              <h3 className="text-lg font-bold text-gray-900">
                Lịch sử giao dịch: <span className="text-blue-700">{historyModal.product.name}</span>
              </h3>
              <button onClick={() => setHistoryModal({ ...historyModal, isOpen: false })} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-0 overflow-y-auto bg-gray-50 flex-1">
              {historyModal.history.length === 0 ? (
                <div className="p-10 text-center text-gray-500 flex flex-col items-center">
                  <FileText className="h-10 w-10 text-gray-300 mb-3" />
                  <p>Mặt hàng này chưa có lịch sử mua bán nào.</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-white sticky top-0 shadow-sm">
                    <tr>
                      <th className="p-0 border-r border-gray-200 cursor-pointer hover:bg-gray-50" onClick={() => setHistorySortAsc(!historySortAsc)}>
                        <div className="px-6 py-3 text-left text-xs font-bold text-blue-600 uppercase overflow-hidden min-w-[100px] flex items-center" style={{ resize: 'horizontal' }}>
                          Timeline {historySortAsc ? '↑' : '↓'}
                        </div>
                      </th>
                      <th className="p-0 border-r border-gray-200">
                        <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase overflow-hidden min-w-[120px]" style={{ resize: 'horizontal' }}>Số HĐ</div>
                      </th>
                      <th className="p-0 border-r border-gray-200">
                        <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase overflow-hidden min-w-[100px]" style={{ resize: 'horizontal' }}>Loại</div>
                      </th>
                      <th className="p-0 border-r border-gray-200">
                        <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase overflow-hidden min-w-[200px]" style={{ resize: 'horizontal' }}>Đối tác</div>
                      </th>
                      <th className="p-0 border-r border-gray-200">
                        <div className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase overflow-hidden min-w-[80px]" style={{ resize: 'horizontal' }}>SL</div>
                      </th>
                      <th className="p-0 border-r border-gray-200">
                        <div className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase overflow-hidden min-w-[120px]" style={{ resize: 'horizontal' }}>Đơn giá</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {[...historyModal.history].sort((a, b) => historySortAsc ? new Date(a.date).getTime() - new Date(b.date).getTime() : new Date(b.date).getTime() - new Date(a.date).getTime()).map((h, idx) => (
                      <tr key={idx} className="hover:bg-blue-50 transition-colors">
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-100">{new Date(h.date).toLocaleDateString('vi-VN')}</td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm font-bold text-gray-900 border-r border-gray-100">{h.docNumber}</td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500 border-r border-gray-100">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            h.type === 'QUOTATION' ? 'bg-purple-100 text-purple-800' :
                            h.type === 'INPUT_INVOICE' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {h.type === 'QUOTATION' ? 'Báo giá' : h.type === 'INPUT_INVOICE' ? 'Mua vào' : 'Bán ra'}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-700 whitespace-normal break-words border-r border-gray-100">{h.customerName}</td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm font-bold text-gray-900 text-right border-r border-gray-100">{h.quantity}</td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 text-right border-r border-gray-100">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(h.unitPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="p-4 border-t bg-white flex justify-end">
              <button 
                onClick={() => setHistoryModal({ ...historyModal, isOpen: false })}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: TỰ ĐỘNG THỐNG NHẤT & GỘP TRÙNG LẶP */}
      {isMergeModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Layers size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Thống Nhất & Gộp Mặt Hàng Trùng Lặp</h3>
                  <p className="text-xs text-amber-100">Tự động phát hiện các mặt hàng cùng loại nhưng bị tách dòng do khác kiểu ĐVT hoặc viết hoa/thường</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMergeModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Subheader action bar */}
            <div className="p-4 bg-amber-50/80 border-b border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Kết quả quét kho hàng:
                </span>
                <span className="ml-2 text-sm font-extrabold text-amber-800">
                  {duplicateGroups.length > 0 ? `Phát hiện ${duplicateGroups.length} nhóm mặt hàng bị trùng dòng` : 'Không phát hiện mặt hàng trùng lặp'}
                </span>
              </div>
              {duplicateGroups.length > 0 && (
                <button
                  type="button"
                  disabled={isMerging}
                  onClick={handleMergeAllGroups}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:shadow flex items-center gap-1.5 transition-all whitespace-nowrap"
                >
                  <RefreshCw size={14} className={isMerging ? 'animate-spin' : ''} />
                  ⚡ Thống nhất tất cả (${duplicateGroups.length} nhóm)
                </button>
              )}
            </div>

            {/* Content List */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {duplicateGroups.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle size={32} />
                  </div>
                  <h4 className="text-base font-bold text-gray-800">Kho hàng rất gọn gàng!</h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                    Tất cả các mặt hàng trong kho đều có tên và đơn vị tính thống nhất, không phát hiện dòng nào bị chia đôi.
                  </p>
                </div>
              ) : (
                duplicateGroups.map((group, gIdx) => (
                  <div key={group.id} className="border border-amber-200 rounded-xl overflow-hidden bg-white shadow-sm hover:border-amber-300 transition-colors">
                    {/* Group Header */}
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="bg-amber-100 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                          Nhóm #{gIdx + 1}
                        </span>
                        <h4 className="text-sm font-bold text-gray-900">
                          {group.canonicalName}
                        </h4>
                        <span className="text-xs text-gray-500">
                          (ĐVT chuẩn: <strong className="text-emerald-700">{group.canonicalUnit}</strong>)
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={isMerging}
                        onClick={() => handleMergeGroup(group)}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1 whitespace-nowrap"
                      >
                        <GitMerge size={13} />
                        Gộp nhóm này
                      </button>
                    </div>

                    {/* Group Rows Table */}
                    <div className="p-3">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="text-gray-400 border-b border-gray-100">
                            <th className="text-left py-1.5 font-medium">Tên hiển thị hiện tại</th>
                            <th className="text-center py-1.5 font-medium">ĐVT hiện tại</th>
                            <th className="text-right py-1.5 font-medium">Tồn kho</th>
                            <th className="text-right py-1.5 font-medium">Giá nhập gần nhất</th>
                            <th className="text-center py-1.5 font-medium">Vai trò</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {group.allProducts.map((p) => {
                            const isTarget = p.id === group.targetProduct.id;
                            return (
                              <tr key={p.id} className={isTarget ? 'bg-emerald-50/50' : 'bg-red-50/30'}>
                                <td className="py-2 font-medium text-gray-800">
                                  {p.name}
                                </td>
                                <td className="py-2 text-center font-bold text-gray-700">
                                  <span className={p.unit !== group.canonicalUnit ? 'text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded' : ''}>
                                    {p.unit || '---'}
                                  </span>
                                </td>
                                <td className="py-2 text-right font-bold text-gray-900">
                                  {p.stock || 0}
                                </td>
                                <td className="py-2 text-right text-gray-600">
                                  {new Intl.NumberFormat('vi-VN').format(p.unitPrice || 0)} đ
                                </td>
                                <td className="py-2 text-center">
                                  {isTarget ? (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                      Giữ lại làm mốc
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                                      Sẽ gộp vào
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {/* Footer dự kiến sau gộp */}
                      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600 bg-emerald-50/70 p-2 rounded-lg">
                        <span className="italic flex items-center text-emerald-900 font-medium">
                          <CheckCircle size={13} className="text-emerald-600 mr-1" />
                          Lý do phát hiện: {group.reason}
                        </span>
                        <div className="text-right">
                          <span className="text-gray-500">Sau khi gộp: </span>
                          <strong className="text-emerald-800 font-extrabold text-sm">
                            {group.totalStock} {group.canonicalUnit}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
              <span className="text-xs text-gray-500 italic">
                * Quá trình gộp sẽ tự động chuyển toàn bộ lịch sử xuất/nhập của các dòng thừa sang dòng chính.
              </span>
              <button
                type="button"
                onClick={() => setIsMergeModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: GỘP THỦ CÔNG KHI CHỌN CHECKBOX */}
      {manualMergeModal && manualMergeModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-white/20 rounded-lg">
                  <GitMerge size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Gộp {manualMergeModal.products.length} Mặt Hàng Đã Chọn Thành 1</h3>
                  <p className="text-xs text-purple-100">Cộng dồn tồn kho và chuyển toàn bộ chứng từ về dòng được chọn</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setManualMergeModal(null)}
                className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  1. Chọn mặt hàng làm mốc (giữ lại ID này):
                </label>
                <div className="space-y-2">
                  {manualMergeModal.products.map(p => (
                    <label
                      key={p.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                        manualMergeModal.selectedTargetId === p.id
                          ? 'border-purple-500 bg-purple-50/60 ring-1 ring-purple-500'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="targetProduct"
                          checked={manualMergeModal.selectedTargetId === p.id}
                          onChange={() => {
                            setManualMergeModal(prev => prev ? ({
                              ...prev,
                              selectedTargetId: p.id!,
                              customName: p.name,
                              customUnit: normalizeUnit(p.unit || 'Cái')
                            }) : null);
                          }}
                          className="text-purple-600 focus:ring-purple-500"
                        />
                        <div>
                          <p className="text-xs font-bold text-gray-900">{p.name}</p>
                          <p className="text-[11px] text-gray-500">ĐVT: {p.unit || '---'} | Giá: {new Intl.NumberFormat('vi-VN').format(p.unitPrice || 0)} đ</p>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold text-gray-800 bg-gray-100 px-2 py-1 rounded">
                        Tồn: {p.stock || 0}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Tên thống nhất sau gộp</label>
                  <input
                    type="text"
                    value={manualMergeModal.customName}
                    onChange={(e) => setManualMergeModal(prev => prev ? ({ ...prev, customName: e.target.value }) : null)}
                    className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 bg-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Đơn vị tính thống nhất</label>
                  <input
                    type="text"
                    value={manualMergeModal.customUnit}
                    onChange={(e) => setManualMergeModal(prev => prev ? ({ ...prev, customUnit: e.target.value }) : null)}
                    className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 bg-white font-medium"
                    placeholder="VD: Cái, Bộ, Cuộn..."
                  />
                </div>
              </div>

              {/* Tổng kết sau gộp */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-900 flex items-center">
                  <CheckCircle size={15} className="mr-1 text-emerald-600" />
                  Tổng tồn kho cộng dồn:
                </span>
                <span className="text-sm font-black text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
                  {manualMergeModal.products.reduce((s, p) => s + (p.stock || 0), 0)} {manualMergeModal.customUnit}
                </span>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setManualMergeModal(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isMerging}
                onClick={handleConfirmManualMerge}
                className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
              >
                <GitMerge size={14} />
                Xác nhận Gộp thành 1 dòng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
