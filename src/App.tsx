import { useState, useEffect } from 'react';
import { FileText, Users, Box, LayoutDashboard, Upload, FilePlus, Settings as SettingsIcon, Wallet, Menu, X, LogOut, UserCircle, CloudUpload, AlertCircle, Search } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { findBackupFile, uploadBackup, DRIVE_SCOPE } from './utils/googleDrive';
import { db } from './db/db';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Products from './pages/Products';
import Documents from './pages/Documents';
import XMLImport from './pages/XMLImport';
import CreateQuotation from './pages/CreateQuotation';
import Fund from './pages/Fund';
import Settings from './pages/Settings';
import Login from './pages/Login';
import UsersManagement from './pages/UsersManagement';
import Sourcing from './pages/Sourcing';
import { type User } from './db/db';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Try to load user from localStorage on boot
  useEffect(() => {
    const savedUser = localStorage.getItem('plt_current_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('plt_current_user', JSON.stringify(user));
  };

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isSyncingOut, setIsSyncingOut] = useState(false);
  const [syncOutStatus, setSyncOutStatus] = useState('');

  const executeLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('plt_current_user');
    setShowLogoutModal(false);
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const syncAndLogout = useGoogleLogin({
    scope: DRIVE_SCOPE,
    onSuccess: async (tokenResponse) => {
      setIsSyncingOut(true);
      setSyncOutStatus('Đang đẩy dữ liệu lên Google Drive...');
      try {
        const token = tokenResponse.access_token;
        const fileId = await findBackupFile(token);

        const customers = await db.customers.toArray();
        const products = await db.products.toArray();
        const documents = await db.documents.toArray();
        const transactions = await db.transactions.toArray();
        const users = await db.users.toArray();
        
        const backupData = {
          version: 3,
          date: new Date().toISOString(),
          data: { customers, products, documents, transactions, users }
        };

        await uploadBackup(token, fileId || null, backupData);
        setSyncOutStatus('Đồng bộ thành công! Đang thoát...');
        setTimeout(() => executeLogout(), 1000);
      } catch (err) {
        console.error(err);
        setSyncOutStatus('Lỗi đồng bộ!');
        alert('Có lỗi xảy ra khi đẩy dữ liệu lên Drive. Vui lòng thử lại.');
        setIsSyncingOut(false);
      }
    },
    onError: () => {
      alert('Đăng nhập Google thất bại!');
      setIsSyncingOut(false);
    }
  });

  const [activeTab, setActiveTab] = useState('products'); // Mặc định mở tab Sản phẩm (an toàn nhất cho VIEWER)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [prefilledProducts, setPrefilledProducts] = useState<number[]>([]);
  const [editingQuotationId, setEditingQuotationId] = useState<number | null>(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update default tab based on role when user logs in
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'ADMIN' || currentUser.role === 'KETOAN') {
        setActiveTab('dashboard');
      } else {
        setActiveTab('products');
      }
    }
  }, [currentUser]);

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  const role = currentUser.role;
  const isAdmin = role === 'ADMIN';
  const isKetoan = role === 'KETOAN' || isAdmin;

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans print:bg-white overflow-hidden">
      
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
          <button 
            className="md:hidden text-gray-500 hover:text-gray-700" 
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {isKetoan && (
            <NavItem 
              icon={<LayoutDashboard size={20} />} 
              label="Tổng quan" 
              active={activeTab === 'dashboard'} 
              onClick={() => handleTabClick('dashboard')} 
            />
          )}
          {isKetoan && (
            <NavItem 
              icon={<Users size={20} />} 
              label="Khách hàng / Đối tác" 
              active={activeTab === 'customers'} 
              onClick={() => handleTabClick('customers')} 
            />
          )}
          <NavItem 
            icon={<Box size={20} />} 
            label="Sản phẩm / Tồn kho" 
            active={activeTab === 'products'} 
            onClick={() => handleTabClick('products')} 
          />
          {isKetoan && (
            <NavItem 
              icon={<FileText size={20} />} 
              label="Hồ sơ Chứng từ" 
              active={activeTab === 'documents'} 
              onClick={() => handleTabClick('documents')} 
            />
          )}
          {isKetoan && (
            <NavItem 
              icon={<Wallet size={20} />} 
              label="Quỹ & Tạm ứng" 
              active={activeTab === 'fund'} 
              onClick={() => handleTabClick('fund')} 
            />
          )}
          {isAdmin && (
            <NavItem 
              icon={<Upload size={20} />} 
              label="Import Hóa Đơn (XML)" 
              active={activeTab === 'xml'} 
              onClick={() => handleTabClick('xml')} 
            />
          )}
          <NavItem 
            icon={<FilePlus size={20} className="text-blue-500" />} 
            label="Tạo Báo Giá" 
            active={activeTab === 'create-quote'} 
            onClick={() => handleTabClick('create-quote')} 
          />
          <NavItem 
            icon={<Search size={20} className="text-orange-500" />} 
            label="Tìm Nguồn Hàng" 
            active={activeTab === 'sourcing'} 
            onClick={() => handleTabClick('sourcing')} 
          />
          
          {isAdmin && <div className="my-4 border-t border-gray-200 mx-2"></div>}
          
          {isAdmin && (
            <NavItem 
              icon={<SettingsIcon size={20} className="text-gray-500" />} 
              label="Cài đặt (Đồng bộ)" 
              active={activeTab === 'settings'} 
              onClick={() => handleTabClick('settings')} 
            />
          )}
          {isAdmin && (
            <NavItem 
              icon={<UserCircle size={20} className="text-gray-500" />} 
              label="Quản lý Tài khoản" 
              active={activeTab === 'users'} 
              onClick={() => handleTabClick('users')} 
            />
          )}
        </nav>

        <div className="p-4 border-t border-gray-200 bg-gray-50 mt-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <UserCircle size={24} className="text-gray-400" />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-800">{currentUser.username}</span>
                <span className="text-xs text-gray-500">{role}</span>
              </div>
            </div>
          </div>
          <button 
            onClick={handleLogoutClick} 
            className="w-full flex items-center justify-center space-x-2 p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition-colors font-medium text-sm" 
            title="Đăng xuất khỏi hệ thống"
          >
            <LogOut size={16} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 print:hidden shrink-0">
          <div className="flex items-center">
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
              activeTab === 'users' ? 'Quản lý Tài khoản (Users)' :
              'Tổng quan (Dashboard)'
            }</h2>
          </div>
          
          <div className="flex items-center space-x-3 md:hidden">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">{currentUser.username}</span>
            <button 
              onClick={handleLogoutClick} 
              className="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded-md"
              title="Đăng xuất"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 print:p-0">
          {activeTab === 'dashboard' && isKetoan && <Dashboard />}
          {activeTab === 'customers' && isKetoan && <Customers />}
          {activeTab === 'products' && (
            <Products 
              onNavigate={(tab) => handleTabClick(tab)} 
              setPrefilledProducts={setPrefilledProducts} 
              currentUser={currentUser}
            />
          )}
          {activeTab === 'documents' && isKetoan && (
            <Documents 
              setEditingQuotationId={(id: number) => {
                setEditingQuotationId(id);
                handleTabClick('create-quote');
              }}
              currentUser={currentUser}
            />
          )}
          {activeTab === 'fund' && isKetoan && <Fund />}
          {activeTab === 'xml' && isAdmin && <XMLImport />}
          {activeTab === 'create-quote' && (
            <CreateQuotation 
              prefilledProducts={prefilledProducts} 
              clearPrefilled={() => setPrefilledProducts([])} 
              editingQuotationId={editingQuotationId}
              clearEditingQuotation={() => setEditingQuotationId(null)}
            />
          )}
          {activeTab === 'sourcing' && <Sourcing />}
          {activeTab === 'settings' && isAdmin && <Settings />}
          {activeTab === 'users' && isAdmin && <UsersManagement />}
        </div>
      </main>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                  <AlertCircle size={24} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Đăng xuất khỏi hệ thống?</h3>
              </div>
              <p className="text-gray-600 mb-6 text-sm">
                Nếu bạn vừa tạo hoặc sửa dữ liệu (báo giá, khách hàng...), bạn nên <b>Đồng bộ lên Cloud</b> trước khi thoát để người khác (hoặc sếp) có thể thấy được dữ liệu mới nhất.
              </p>

              {isSyncingOut && (
                <div className="mb-4 p-3 bg-blue-50 text-blue-700 text-sm rounded-lg flex items-center justify-center font-medium">
                  <span className="animate-pulse">{syncOutStatus}</span>
                </div>
              )}

              <div className="flex flex-col space-y-3">
                <button
                  onClick={() => syncAndLogout()}
                  disabled={isSyncingOut}
                  className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  <CloudUpload size={20} />
                  <span>Đồng bộ lên Cloud & Đăng xuất</span>
                </button>
                
                <button
                  onClick={executeLogout}
                  disabled={isSyncingOut}
                  className="w-full flex items-center justify-center space-x-2 bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  <LogOut size={20} />
                  <span>Không, chỉ Đăng xuất</span>
                </button>

                <button
                  onClick={() => setShowLogoutModal(false)}
                  disabled={isSyncingOut}
                  className="w-full py-2 text-gray-500 hover:text-gray-700 font-medium text-sm disabled:opacity-50 mt-2"
                >
                  Hủy bỏ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
