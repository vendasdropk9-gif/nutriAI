import fs from 'fs';

const files = [
  'src/components/AcademyPortal.tsx',
  'src/components/BarcodeScanner.tsx',
  'src/components/BodyAnalyzer.tsx',
  'src/components/BloodPressureTracker.tsx',
  'src/components/DeliveryPartnerPortal.tsx',
  'src/App.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/-850/g, '-800')
                     .replace(/-205/g, '-200')
                     .replace(/-705/g, '-700')
                     .replace(/-805/g, '-800')
                     .replace(/-350/g, '-300')
                     .replace(/-450/g, '-400')
                     .replace(/-550/g, '-600')
                     .replace(/-650/g, '-600')
                     .replace(/-750/g, '-700')
                     .replace(/-555/g, '-600');
    fs.writeFileSync(file, content);
  }
});
console.log('Fixed tailwind classes');
