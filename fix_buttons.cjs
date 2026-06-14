const fs = require('fs');
const files = [
  'src/components/word/WordToolWorkspace.tsx',
  'src/components/pdf/PdfToolWorkspace.tsx',
  'src/pages/excel/tools/ExcelToolPage.tsx'
];
files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/className=\"file-upload\"/g, 'className="btn-secondary" style={{ cursor: \'pointer\', display: \'inline-flex\', alignItems: \'center\', gap: \'0.5rem\', padding: \'0.6rem 1.25rem\', borderRadius: \'0.5rem\', fontWeight: 600, border: \'1px solid var(--border)\' }}');
    fs.writeFileSync(file, content);
  }
});
