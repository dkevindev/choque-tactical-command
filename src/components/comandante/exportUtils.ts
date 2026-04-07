import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportarCSV = (headers: string[], rows: string[][], filename: string) => {
  const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportarPDF = (titulo: string, headers: string[], rows: string[][], filename: string) => {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  pdf.setFontSize(14);
  pdf.text(`RPMONT - ${titulo}`, 14, 15);
  pdf.setFontSize(8);
  pdf.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 22);
  
  autoTable(pdf, {
    startY: 28,
    head: [headers],
    body: rows,
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [67, 56, 202], textColor: 255 },
    alternateRowStyles: { fillColor: [241, 245, 249] },
  });
  
  pdf.save(`${filename}.pdf`);
};
