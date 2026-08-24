import { useState } from 'react';
import { FileText, Users, Box, LayoutDashboard, Upload } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Products from './pages/Products';
import Documents from './pages/Documents';
import XMLImport from './pages/XMLImport';
import CreateQuotation from './pages/CreateQuotation';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <FileText className="text-white" size={20} />
          </div>
          <h1 className="font-bold text-lg text-gray-800">PLT ERP</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <NavItem 
            icon={<Users size={20} />} 
            label="Khách hàng" 
            active={activeTab === 'customers'} 
            onClick={() => setActiveTab('customers')} 
          />
          <NavItem 
            icon={<Box size={20} />} 
            label="Sản phẩm" 
            active={activeTab === 'products'} 
            onClick={() => setActiveTab('products')} 
          />
          <NavItem 
            icon={<FileText size={20} />} 
            label="Chứng từ" 
            active={activeTab === 'documents'} 
            onClick={() => setActiveTab('documents')} 
          />
          <NavItem 
            icon={<Upload size={20} />} 
            label="Nhập XML HĐ" 
            active={activeTab === 'xml'} 
            onClick={() => setActiveTab('xml')} 
          />
          <NavItem 
            icon={<FileText size={20} className="text-blue-500" />} 
            label="Tạo Báo Giá" 
            active={activeTab === 'create-quote'} 
            onClick={() => setActiveTab('create-quote')} 
          />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6">
          <h2 className="text-xl font-semibold capitalize">{
            activeTab === 'xml' ? 'Nhập Hóa Đơn Điện Tử (XML)' : 
            activeTab === 'create-quote' ? 'Tạo Báo Giá Mới' :
            activeTab === 'customers' ? 'Quản lý Khách Hàng' :
            activeTab === 'products' ? 'Quản lý Sản Phẩm' :
            activeTab === 'documents' ? 'Quản lý Chứng Từ' :
            'Dashboard'
          }</h2>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'customers' && <Customers />}
          {activeTab === 'products' && <Products />}
          {activeTab === 'documents' && <Documents />}
          {activeTab === 'xml' && <XMLImport />}
          {activeTab === 'create-quote' && <CreateQuotation />}
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
        active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export default App;
