import { useState } from 'react';
import { Search, ExternalLink, ShoppingCart, Globe, Server, Box, Monitor, Cpu, Camera } from 'lucide-react';

export default function Sourcing() {
  const [keyword, setKeyword] = useState('');

  const searchSources = [
    {
      name: 'Google Shopping',
      url: (kw: string) => `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(kw)}`,
      icon: <Globe className="text-blue-500" size={24} />,
      desc: 'Tìm kiếm giá bán lẻ & sỉ trên toàn mạng lưới Google.'
    },
    {
      name: 'Shopee VN',
      url: (kw: string) => `https://shopee.vn/search?keyword=${encodeURIComponent(kw)}`,
      icon: <ShoppingCart className="text-orange-500" size={24} />,
      desc: 'So sánh giá bán lẻ, linh kiện, phụ tùng phổ thông.'
    },
    {
      name: 'Lazada VN',
      url: (kw: string) => `https://www.lazada.vn/catalog/?q=${encodeURIComponent(kw)}`,
      icon: <ShoppingCart className="text-indigo-600" size={24} />,
      desc: 'Nguồn hàng đa dạng, nhiều nhà phân phối B2B.'
    },
    {
      name: 'Tin Học Ngôi Sao',
      url: (kw: string) => `https://tinhocngoisao.com/search?q=${encodeURIComponent(kw)}`,
      icon: <Cpu className="text-red-600" size={24} />,
      desc: 'Chuyên linh kiện máy tính, PC, giá sỉ IT.'
    },
    {
      name: 'Phát Đạt Vĩnh Viễn',
      url: (kw: string) => `https://www.google.com/search?q=${encodeURIComponent('site:phatdatvinhvien.com ' + kw)}`,
      icon: <Monitor className="text-teal-600" size={24} />,
      desc: 'Kho sỉ linh kiện, phụ kiện máy tính, cáp chuyển.'
    },
    {
      name: 'Phát Đạt Computer',
      url: (kw: string) => `https://www.google.com/search?q=${encodeURIComponent('site:phatdatcomputer.vn ' + kw)}`,
      icon: <Monitor className="text-blue-700" size={24} />,
      desc: 'Báo giá linh kiện máy tính, sỉ lẻ toàn quốc.'
    },
    {
      name: 'Vi Tính Lê Huy',
      url: (kw: string) => `https://www.google.com/search?q=${encodeURIComponent('site:vitinhlehuy.com ' + kw)}`,
      icon: <Monitor className="text-cyan-600" size={24} />,
      desc: 'PC, linh kiện, phụ kiện giá thợ.'
    },
    {
      name: 'Vuhoang Telecom',
      url: (kw: string) => `https://vuhoangtelecom.vn/?s=${encodeURIComponent(kw)}`,
      icon: <Camera className="text-red-500" size={24} />,
      desc: 'Tổng kho Camera, báo động, viễn thông.'
    },
    {
      name: 'Google (Nhà cung cấp)',
      url: (kw: string) => `https://www.google.com/search?q=${encodeURIComponent(kw + ' "giá sỉ" OR "phân phối" OR "nhà máy"')}`,
      icon: <Server className="text-green-600" size={24} />,
      desc: 'Tra cứu trực tiếp các nhà sản xuất, xưởng sỉ.'
    }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Tìm Kiếm Nguồn Hàng & Giá Cạnh Tranh</h2>
        <p className="text-gray-500 mb-6 max-w-2xl mx-auto">
          Hỗ trợ người lập Báo giá tra cứu nhanh giá cả thị trường từ các nền tảng thương mại điện tử lớn, từ đó quyết định mức giá nhập và giá bán hợp lý nhất cho khách hàng.
        </p>

        <div className="relative max-w-2xl mx-auto">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-6 w-6 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-300 rounded-full text-lg focus:ring-blue-500 focus:border-blue-500 outline-none shadow-inner"
            placeholder="Nhập tên sản phẩm, mã linh kiện hoặc thông số..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && keyword.trim()) {
                window.open(searchSources[0].url(keyword.trim()), '_blank');
              }
            }}
          />
        </div>
      </div>

      {keyword.trim() ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {searchSources.map((source, idx) => (
            <a
              key={idx}
              href={source.url(keyword.trim())}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all group block"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                    {source.icon}
                  </div>
                  <h3 className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{source.name}</h3>
                </div>
                <ExternalLink size={18} className="text-gray-400 group-hover:text-blue-500" />
              </div>
              <p className="text-sm text-gray-500">
                {source.desc}
              </p>
            </a>
          ))}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center text-gray-400 border-dashed">
          <Box size={48} className="mb-4 text-gray-300" />
          <p>Nhập thông số sản phẩm ở trên để hiển thị các công cụ tra cứu giá.</p>
        </div>
      )}
    </div>
  );
}
