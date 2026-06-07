import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportToExcel = (data, headers, filename = 'export') => {
  if (!data || data.length === 0) return;
  
  const formattedData = data.map(item => {
    const row = {};
    headers.forEach((header, index) => {
      row[header] = item[index];
    });
    return row;
  });

  const ws = XLSX.utils.json_to_sheet(formattedData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const exportToPDF = (data, headers, title, filename = 'export') => {
  if (!data || data.length === 0) return;

  // Use landscape for better column fitting
  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
  
  // Professional Corporate Header Band
  doc.setFillColor(37, 99, 235); // Vibrant Light Blue
  doc.rect(0, 0, pageWidth, 28, 'F');
  
  // Title inside header band
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255); // White text
  doc.setFont('helvetica', 'bold');
  doc.text((title || 'Document Export').toUpperCase(), 14, 18);
  
  // Date and branding below header
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.setFont('helvetica', 'normal');
  const dateStr = `Generated on: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' })}`;
  doc.text(dateStr, 14, 38);
  
  // Sub-brand or Company Name on right side
  doc.setFont('helvetica', 'bold');
  doc.text('IMS Inventory Management', pageWidth - 14, 38, { align: 'right' });

  autoTable(doc, {
    head: [headers],
    body: data,
    startY: 44,
    theme: 'plain', // Removing default borders
    styles: { 
      fontSize: 8,
      font: 'helvetica',
      cellPadding: 6,
      textColor: [51, 65, 85], // slate-700
    },
    headStyles: { 
      fillColor: [241, 245, 249], // slate-100
      textColor: [15, 23, 42], // slate-900
      fontStyle: 'bold',
      halign: 'left',
      lineWidth: { bottom: 0.5 },
      lineColor: [203, 213, 225] // slate-300
    },
    bodyStyles: {
      lineWidth: { bottom: 0.1 },
      lineColor: [226, 232, 240] // slate-200
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250], // Extremely subtle alternating row
    },
    didDrawPage: function (data) {
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      
      // Footer line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, doc.internal.pageSize.height - 15, pageWidth - 14, doc.internal.pageSize.height - 15);
      
      doc.text('Confidential Document', 14, doc.internal.pageSize.height - 8);
      doc.text(`Page ${pageCount}`, pageWidth - 14, doc.internal.pageSize.height - 8, { align: 'right' });
    }
  });

  doc.save(`${filename}.pdf`);
};

export const printDocument = (data, headers, title) => {
  if (!data || data.length === 0) return;

  let printContent = `
    <html>
      <head>
        <title>${title || 'Print'}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; margin: 20px; color: #334155; }
          h2 { text-align: center; color: #0f172a; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; font-size: 12px; }
          th { background-color: #f8fafc; color: #475569; font-weight: 600; text-transform: uppercase; font-size: 10px; }
          tr:nth-child(even) { background-color: #f8fafc; }
        </style>
      </head>
      <body>
        ${title ? `<h2>${title}</h2>` : ''}
        <table>
          <thead>
            <tr>
              ${headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map(row => `
              <tr>
                ${row.map(val => `<td>${val !== undefined && val !== null ? val : ''}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }
};
