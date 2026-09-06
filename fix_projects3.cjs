const fs = require('fs');
let content = fs.readFileSync('src/pages/Projects.tsx', 'utf-8');

const lines = content.split('\n');
const newLines = [];
let skip = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.includes("const contracts = useLiveQuery(() => db.projectContracts.where('projectId').equals(projectId).toArray());")) {
    continue; // remove contracts query
  }
  
  if (line.includes("const [showModal, setShowModal] = useState(false);")) {
    skip = true;
  }
  
  if (skip) {
    if (line.includes("setShowModal(false);") && lines[i+1].includes("};")) {
      skip = false;
      i++; // skip "};"
    }
    continue;
  }
  
  if (line.includes("const totalContractExpense = contracts?.reduce((sum, c) => sum + c.amount, 0) || 0;")) {
    continue; // remove totalContractExpense
  }
  
  if (line.includes("const totalExpense = totalContractExpense + totalOtherExpense;")) {
    newLines.push("  const totalExpense = totalOtherExpense;");
    continue;
  }
  
  newLines.push(line);
}

fs.writeFileSync('src/pages/Projects.tsx', newLines.join('\n'), 'utf-8');
