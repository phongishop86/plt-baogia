import { useState, useEffect } from 'react';
import { FileText, Users, Box, LayoutDashboard, Upload, FilePlus, Settings as SettingsIcon, Wallet, Menu, X } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Products from './pages/Products';
import Documents from './pages/Documents';
import XMLImport from './pages/XMLImport';
import CreateQuotation from './pages/CreateQuotation';
import Fund from './pages/Fund';
import Settings from './pages/Settings';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [prefilledProducts, setPrefilledProducts] = useState<number[]>([]);
  const [editingQuotationId, setEditingQuotationId] = useState<number | null>(null);

  // Đóng menu khi màn hình lớn hơn lg
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false); // Tự động đóng menu trên mobile khi chọn tab
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans print:bg-white overflow-hidden">
      
      {/* Lớp phủ màn hình mờ khi mở menu trên mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 print:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src="/PLT-Logo-web.png" alt="PLT Logo" className="w-9 h-9 object-contain bg-white rounded" />
            <h1 className="font-bold text-lg text-gray-800 tracking-wide">PLT ERP</h1>
          </div>
          {/* Nút đóng menu trên mobile */}
          <button 
            className="md:hidden text-gray-500 hover:text-gray-700" 
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label="Tổng quan" 
            active={activeTab === 'dashboard'} 
            onClick={() => handleTabClick('dashboard')} 
          />
          <NavItem 
            icon={<Users size={20} />} 
            label="Khách hàng / Đối tác" 
            active={activeTab === 'customers'} 
            onClick={() => handleTabClick('customers')} 
          />
          <NavItem 
            icon={<Box size={20} />} 
            label="Sản phẩm / Tồn kho" 
            active={activeTab === 'products'} 
            onClick={() => handleTabClick('products')} 
          />
          <NavItem 
            icon={<FileText size={20} />} 
            label="Hồ sơ Chứng từ" 
            active={activeTab === 'documents'} 
            onClick={() => handleTabClick('documents')} 
          />
          <NavItem 
            icon={<Wallet size={20} />} 
            label="Quỹ & Tạm ứng" 
            active={activeTab === 'fund'} 
            onClick={() => handleTabClick('fund')} 
          />
          <NavItem 
            icon={<Upload size={20} />} 
            label="Import Hóa Đơn (XML)" 
            active={activeTab === 'xml'} 
            onClick={() => handleTabClick('xml')} 
          />
          <NavItem 
            icon={<FilePlus size={20} className="text-blue-500" />} 
            label="Tạo Báo Giá" 
            active={activeTab === 'create-quote'} 
            onClick={() => handleTabClick('create-quote')} 
          />
          
          <div className="my-4 border-t border-gray-200 mx-2"></div>
          
          <NavItem 
            icon={<SettingsIcon size={20} className="text-gray-500" />} 
            label="Cài đặt (Admin)" 
            active={activeTab === 'settings'} 
            onClick={() => handleTabClick('settings')} 
          />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 md:px-6 print:hidden shrink-0">
          <button 
            className="mr-3 md:hidden text-gray-600 hover:text-gray-900 focus:outline-none" 
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu size={24} />
          </button>
          <h2 className="text-lg md:text-xl font-semibold capitalize text-gray-800 truncate">{
            activeTab === 'xml' ? 'Nhập Hóa Đơn Điện Tử (XML)' : 
            activeTab === 'create-quote' ? (editingQuotationId ? 'Sửa Báo Giá' : 'Tạo Báo Giá Mới') :
            activeTab === 'customers' ? 'Quản lý Khách Hàng / Đối tác' :
            activeTab === 'products' ? 'Quản lý Sản Phẩm / Tồn kho' :
            activeTab === 'documents' ? 'Quản lý Hồ sơ Chứng từ' :
            activeTab === 'fund' ? 'Quản lý Quỹ & Tạm ứng' :
            activeTab === 'settings' ? 'Cài đặt Hệ thống' :
            'Tổng quan (Dashboard)'
          }</h2>
        </header>
        <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 print:p-0">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'customers' && <Customers />}
          {activeTab === 'products' && (
            <Products 
              onNavigate={(tab) => handleTabClick(tab)} 
              setPrefilledProducts={setPrefilledProducts} 
            />
          )}
          {activeTab === 'documents' && (
            <Documents 
              onNavigate={(tab) => handleTabClick(tab)}
              setEditingQuotationId={(id: number) => {
                setEditingQuotationId(id);
                handleTabClick('create-quote');
              }}
            />
          )}
          {activeTab === 'fund' && <Fund />}
          {activeTab === 'xml' && <XMLImport />}
          {activeTab === 'create-quote' && (
            <CreateQuotation 
              prefilledProducts={prefilledProducts} 
              clearPrefilled={() => setPrefilledProducts([])} 
              editingQuotationId={editingQuotationId}
              clearEditingQuotation={() => setEditingQuotationId(null)}
            />
          )}
          {activeTab === 'settings' && <Settings />}
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
        active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <div className="shrink-0">{icon}</div>
      <span className="truncate">{label}</span>
    </button>
  );
}

export default App;
