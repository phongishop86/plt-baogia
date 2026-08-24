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

export class PLTDatabase extends Dexie {
  customers!: Table<Customer, number>;
  products!: Table<Product, number>;
  documents!: Table<Document, number>;
  transactions!: Table<Transaction, number>;

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
  }
}

export const db = new PLTDatabase();
