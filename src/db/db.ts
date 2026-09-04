import Dexie, { type Table } from 'dexie';

export interface Customer {
  id?: number;
  name: string;
  taxCode: string;
  address: string;
  phone?: string;
  email?: string;
  isSupplier?: boolean; // Nếu là đối tác cung cấp (Mua vào)
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Product {
  id?: number;
  code: string;
  name: string;
  unit: string;
  unitPrice: number;
  taxRate: number; // e.g. 8 or 10
  stock: number; // Tồn kho
  type?: 'PRODUCT' | 'SERVICE' | 'EXPENSE'; // Phân loại: Hàng hóa (Tồn kho), Dịch vụ (Không tồn kho), Chi phí (Hoạt động)
  category?: string; // Nhóm mặt hàng / Danh mục
  expenseDate?: Date; // Ngày ghi nhận chi phí (chỉ dùng cho EXPENSE)
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Document {
  id?: number;
  type: 'QUOTATION' | 'DELIVERY_NOTE' | 'PAYMENT_REQUEST' | 'INVOICE' | 'INPUT_INVOICE' | 'OUTPUT_INVOICE';
  docNumber: string;
  customerId: number;
  date: Date;
  items: DocumentItem[];
  subTotal: number;
  taxAmount: number;
  total: number;
  status?: 'DRAFT' | 'PENDING' | 'SENT' | 'COMPLETED' | 'CANCELLED'; // Trạng thái chứng từ (Đặc biệt cho Báo giá)
  notes?: string;
  paymentDate?: Date; // Ngày thanh toán (nếu có)
  createdAt?: Date;
}

export interface DocumentItem {
  productId?: number;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  amount: number;
}

export interface Transaction {
  id?: number;
  date: Date;
  amount: number;
  type: 'ADVANCE' | 'REPAYMENT' | 'OTHER_IN' | 'OTHER_OUT'; // ADVANCE: GĐ ứng tiền (Tăng quỹ), REPAYMENT: Hoàn ứng (Giảm quỹ)
  description: string;
  createdAt?: Date;
}

export interface User {
  id?: number;
  username: string;
  password?: string; // Trong thực tế nên hash, nhưng vì chạy offline-first client-side nên lưu tạm plain text hoặc hash nhẹ
  role: 'ADMIN' | 'KETOAN' | 'VIEWER';
  createdAt?: Date;
}

export interface Project {
  id?: number;
  name: string;
  code: string;
  status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';
  startDate?: Date;
  endDate?: Date;
  progress: number;
  budget?: number;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Personnel {
  id?: number;
  fullName: string;
  cccd: string;
  type: 'FULL_TIME' | 'CONTRACT' | 'SEASONAL';
  phone?: string;
  email?: string;
  bankAccount?: string; // Số tài khoản
  address?: string; // Địa chỉ
  cccdDate?: string; // Ngày cấp CCCD
  specialization?: string; // Chuyên môn
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProjectContract {
  id?: number;
  projectId: number;
  personnelId: number;
  startDate: Date;
  endDate: Date;
  unitPrice: number;
  unit: string;
  quantity: number;
  taxRateTNCN: number;
  amount: number;
  netAmount: number;
  notes?: string;
  jobDescription?: string; // Nội dung công việc
  location?: string; // Địa điểm thực hiện
  createdAt?: Date;
}

export class PLTDatabase extends Dexie {
  customers!: Table<Customer, number>;
  products!: Table<Product, number>;
  documents!: Table<Document, number>;
  transactions!: Table<Transaction, number>;
  users!: Table<User, number>;
  projects!: Table<Project, number>;
  personnel!: Table<Personnel, number>;
  projectContracts!: Table<ProjectContract, number>;

  constructor() {
    super('PLTERPDatabase');
    this.version(1).stores({
      customers: '++id, taxCode, name',
      products: '++id, code, name',
      documents: '++id, type, docNumber, customerId, date'
    });
    this.version(2).stores({
      customers: '++id, taxCode, name',
      products: '++id, code, name',
      documents: '++id, type, docNumber, customerId, date',
      transactions: '++id, date, type'
    });
    this.version(3).stores({
      customers: '++id, taxCode, name',
      products: '++id, code, name',
      documents: '++id, type, docNumber, customerId, date',
      transactions: '++id, date, type',
      users: '++id, username, role'
    });
    this.version(4).stores({
      customers: '++id, taxCode, name',
      products: '++id, code, name',
      documents: '++id, type, docNumber, customerId, date',
      transactions: '++id, date, type',
      users: '++id, username, role',
      projects: '++id, code, name, status',
      personnel: '++id, cccd, fullName',
      projectContracts: '++id, projectId, personnelId'
    });
  }
}

export const db = new PLTDatabase();
