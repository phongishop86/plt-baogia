const fs = require('fs');
let content = fs.readFileSync('src/pages/Projects.tsx', 'utf-8');

const start = content.indexOf("{detailTab === 'CONTRACTS' && (");
const end = content.indexOf("{detailTab === 'UNITS' && <ProjectUnitsTab");

if (start !== -1 && end !== -1) {
  content = content.substring(0, start) + "{detailTab === 'TEMPLATES' && <ProjectTemplatesTab projectId={projectId} />}\n      " + content.substring(end);
  fs.writeFileSync('src/pages/Projects.tsx', content, 'utf-8');
  console.log('Success');
} else {
  console.log('Not found');
}
