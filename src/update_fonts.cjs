const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  "c:\\Users\\acer\\Desktop\\Master-System\\Master-System\\src\\Ims-Inventory-Management-System\\src\\components\\sales\\CustomerDetailsSection.jsx",
  "c:\\Users\\acer\\Desktop\\Master-System\\Master-System\\src\\Ims-Inventory-Management-System\\src\\components\\sales\\ItemLinesTable.jsx"
];

for (const file of filesToUpdate) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Update CustomerDetailsSection sizes
  if (file.includes('CustomerDetailsSection')) {
    content = content.replace(/text-\[11px\]/g, 'text-xs md:text-sm');
    content = content.replace(/text-xs md:text-sm/g, 'text-sm md:text-base');
    content = content.replace(/h-\[38px\]/g, 'h-[44px]');
  }
  
  // Update ItemLinesTable sizes
  if (file.includes('ItemLinesTable')) {
    content = content.replace(/text-\[10px\]/g, 'text-xs md:text-sm');
    content = content.replace(/text-xs/g, 'text-sm');
    content = content.replace(/h-6/g, 'h-8'); // Increase height of small inputs
    content = content.replace(/px-1 py-0.5/g, 'px-2 py-1.5');
  }

  fs.writeFileSync(file, content, 'utf8');
  console.log('Updated ' + file);
}
