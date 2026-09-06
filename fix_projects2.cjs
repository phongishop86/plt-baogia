const fs = require('fs');
let content = fs.readFileSync('src/pages/Projects.tsx', 'utf-8');

// Find start of state declarations for contracts
const startIndex = content.indexOf("const [showModal, setShowModal] = useState(false);");
if (startIndex !== -1) {
  // Find where it ends
  const endIndex = content.indexOf("if (!project) return <div>Đang tải...</div>;");
  
  // also find end of saveContract
  const saveContractEnd = content.indexOf("setShowModal(false);\n  };", endIndex);
  if (saveContractEnd !== -1) {
    const finalEndIndex = saveContractEnd + "setShowModal(false);\n  };".length;
    const before = content.substring(0, startIndex);
    const after = content.substring(finalEndIndex);
    content = before + "if (!project) return <div>Đang tải...</div>;\n" + after;
  } else {
    console.log("Could not find end of saveContract");
  }
} else {
  console.log("Could not find start index");
}

fs.writeFileSync('src/pages/Projects.tsx', content, 'utf-8');
