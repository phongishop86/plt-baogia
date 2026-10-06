const fs = require('fs');
let c = fs.readFileSync('src/db/db.ts', 'utf-8');

const commissionInterface = `
export interface Commission {
  id?: number;
  invoiceDate: Date;
  company: string;
  invoiceAmount: number;
  commissionAmount: number;
  recipientName: string;
  bankAccount: string;
  percentage: number;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
`;

// Insert the interface right before `export class PLTDatabase`
c = c.replace('export class PLTDatabase', commissionInterface + '\nexport class PLTDatabase');

// Add the table to the class
c = c.replace('  legalDocs!: Table<LegalDoc, number>;', '  legalDocs!: Table<LegalDoc, number>;\n  commissions!: Table<Commission, number>;');

// Add version 9
const v9 = `    this.version(9).stores({
      customers: '++id, taxCode, name',
      products: '++id, code, name',
      documents: '++id, type, docNumber, customerId, date',
      transactions: '++id, date, type',
      users: '++id, username, role',
      projects: '++id, name, status, startDate',
      personnel: '++id, employeeCode, fullName, status',
      projectContracts: '++id, projectId, contractNumber',
      projectUnits: '++id, projectId, role',
      projectExpenses: '++id, projectId, type, date',
      templates: 'id',
      projectTemplates: '++id, projectId',
      legalDocs: '++id, type, date',
      commissions: '++id, invoiceDate, company'
    });`;

c = c.replace('  constructor() {', '  constructor() {\n    super(\'PLTERPDatabase\');\n' + v9);
// Wait, the constructor already has `super('PLTERPDatabase');`. Let's just do:
c = fs.readFileSync('src/db/db.ts', 'utf-8');
c = c.replace('export class PLTDatabase', commissionInterface + '\nexport class PLTDatabase');
c = c.replace('  legalDocs!: Table<LegalDoc, number>;', '  legalDocs!: Table<LegalDoc, number>;\n  commissions!: Table<Commission, number>;');

let lines = c.split('\n');
let constIdx = lines.findIndex(l => l.includes("super('PLTERPDatabase');"));
lines.splice(constIdx + 1, 0, v9);

fs.writeFileSync('src/db/db.ts', lines.join('\n'));
console.log('done');
