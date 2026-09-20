import { useState } from 'react';
import { Calculator, Percent, RotateCcw } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';

export default function PriceCalculator() {
  const products = useLiveQuery(() => db.products.toArray());
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [productName, setProductName] = useState('');

  // Đầu vào
  const [importPrice, setImportPrice] = useState<number>(0);
  const [additionalCosts, setAdditionalCosts] = useState<number>(0);
  const [profitMargin, setProfitMargin] = useState<number>(15); // %
  const [discount, setDiscount] = useState<number>(5); // %
  const [taxRate, setTaxRate] = useState<number>(10); // %

  const handleProductSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    setSelectedProductId(id);
    if (!id) return;
    const p = await db.products.get(id);
    if (p) {
      setProductName(p.name);
      // Tạm lấy giá bán làm giá nhập nếu không có trường giá nhập
      setImportPrice(p.unitPrice * 0.7); 
    }
  };

  // Tính toán
  const totalCost = importPrice + additionalCosts;
  const targetRevenue = totalCost * (1 + profitMargin / 100);
  // Quoted Price * (1 - Discount/100) = Target Revenue
  // => Quoted Price = Target Revenue / (1 - Discount/100)
  const quotedPrice = discount >= 100 ? 0 : targetRevenue / (1 - discount / 100);
  const taxAmount = quotedPrice * (taxRate / 100);
  const finalPrice = quotedPrice + taxAmount;

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(Math.round(val));

  const reset = () => {
    setImportPrice(0);
    setAdditionalCosts(0);
    setProfitMargin(15);
    setDiscount(5);
    setTaxRate(10);
    setSelectedProductId('');
    setProductName('');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-blue-100 p-2 rounded-lg">
          <Calculator className="text-blue-600" size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tính giá sơ bộ (Báo giá)</h1>
          <p className="text-sm text-gray-500">Công cụ hỗ trợ tính toán giá chào khách từ giá vốn, biên lợi nhuận và chiết khấu</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bảng nhập liệu */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <div className="flex justify-between items-center border-b pb-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Thông số đầu vào</h2>
            <button onClick={reset} className="text-sm text-gray-500 hover:text-gray-700 flex items-center space-x-1">
              <RotateCcw size={16} /> <span>Làm mới</span>
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chọn sản phẩm (Tùy chọn)</label>
            <select
              value={selectedProductId}
              onChange={handleProductSelect}
              className="w-full border-gray-300 rounded-md shadow-sm border p-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Tự nhập tự do --</option>
              {products?.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {selectedProductId === '' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên Hàng Hóa / Dịch vụ</label>
              <input
                type="text"
                value={productName}
                onChange={e => setProductName(e.target.value)}
                placeholder="Nhập tên sản phẩm..."
                className="w-full border-gray-300 rounded-md shadow-sm border p-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Giá nhập (VNĐ)</label>
              <input
                type="number"
                value={importPrice || ''}
                onChange={e => setImportPrice(Number(e.target.value))}
                className="w-full border-gray-300 rounded-md shadow-sm border p-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chi phí khác (Vận chuyển...)</label>
              <input
                type="number"
                value={additionalCosts || ''}
                onChange={e => setAdditionalCosts(Number(e.target.value))}
                className="w-full border-gray-300 rounded-md shadow-sm border p-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lợi nhuận mong muốn (%)</label>
              <div className="relative">
                <input
                  type="number"
                  value={profitMargin || ''}
                  onChange={e => setProfitMargin(Number(e.target.value))}
                  className="w-full border-gray-300 rounded-md shadow-sm border p-2 pr-8 focus:ring-blue-500 focus:border-blue-500"
                />
                <Percent className="absolute right-2 top-2.5 text-gray-400" size={16} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chiết khấu cho khách (%)</label>
              <div className="relative">
                <input
                  type="number"
                  value={discount || ''}
                  onChange={e => setDiscount(Number(e.target.value))}
                  className="w-full border-gray-300 rounded-md shadow-sm border p-2 pr-8 focus:ring-blue-500 focus:border-blue-500"
                />
                <Percent className="absolute right-2 top-2.5 text-gray-400" size={16} />
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Thuế suất VAT (%)</label>
            <div className="relative w-1/2">
              <input
                type="number"
                value={taxRate === 0 ? '' : taxRate}
                onChange={e => setTaxRate(Number(e.target.value))}
                className="w-full border-gray-300 rounded-md shadow-sm border p-2 pr-8 focus:ring-blue-500 focus:border-blue-500"
              />
              <Percent className="absolute right-2 top-2.5 text-gray-400" size={16} />
            </div>
          </div>

        </div>

        {/* Bảng kết quả */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-800">Kết quả tính toán</h2>
          </div>
          <div className="p-6 flex-1 flex flex-col space-y-6">
            
            <div className="space-y-3 flex-1">
              <div className="flex justify-between items-center text-gray-600">
                <span>Tổng vốn (Giá nhập + CP):</span>
                <span className="font-medium">{formatCurrency(totalCost)} ₫</span>
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <span>Tiền lãi kỳ vọng ({profitMargin}%):</span>
                <span className="font-medium text-green-600">+{formatCurrency(targetRevenue - totalCost)} ₫</span>
              </div>
              <div className="flex justify-between items-center font-semibold text-gray-800 border-t pt-2 mt-2">
                <span>Thực thu mong muốn (Sau CK):</span>
                <span>{formatCurrency(targetRevenue)} ₫</span>
              </div>
              
              <div className="mt-6 mb-2 border-t border-dashed border-gray-300 pt-4"></div>
              
              <div className="flex justify-between items-center text-gray-600">
                <span>Giá báo khách (Chưa VAT):</span>
                <span className="font-bold text-blue-700 text-lg">{formatCurrency(quotedPrice)} ₫</span>
              </div>
              <div className="flex justify-between items-center text-gray-500 text-sm">
                <span>Mức chiết khấu giảm ({discount}%):</span>
                <span className="text-red-500">-{formatCurrency(quotedPrice - targetRevenue)} ₫</span>
              </div>
              <div className="flex justify-between items-center text-gray-500 text-sm">
                <span>Thuế VAT ({taxRate}%):</span>
                <span>+{formatCurrency(taxAmount)} ₫</span>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 mt-auto">
              <div className="text-blue-800 text-sm font-medium mb-1">GIÁ ĐỀ XUẤT (BAO GỒM VAT)</div>
              <div className="text-3xl font-black text-blue-700">
                {formatCurrency(finalPrice)} <span className="text-xl">VNĐ</span>
              </div>
              <div className="mt-2 text-xs text-blue-600/80 italic">
                (Báo giá mức <strong>{formatCurrency(quotedPrice)} ₫</strong> chưa VAT, khi khách đòi giảm <strong>{discount}%</strong> thì thực thu về vẫn đạt <strong>{formatCurrency(targetRevenue)} ₫</strong> - đảm bảo lãi <strong>{profitMargin}%</strong> so với vốn).
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
