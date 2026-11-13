import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, PageOrientation, AlignmentType } from 'docx';

const HEAD = ['Nº', 'QRA', 'NOME DO POLICIAL', 'CPF', 'DADOS DO COLETE', 'TEMPO VENCIDO'];
const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

function tempo(v: Date) {
  const dias = Math.floor((Date.now() - v.getTime()) / 86400000);
  const m = Math.floor(dias / 30);
  return m > 0 ? `há ${m} ${m === 1 ? 'mês' : 'meses'}` : `há ${dias} dia${dias !== 1 ? 's' : ''}`;
}

export async function montarLinhas(coletes: any[]): Promise<string[][]> {
  const snap = await getDocs(collection(db, 'policiais'));
  const pols = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  const acha = (c: any) => pols.find(p => p.id === c.policialAssociadoId)
    || (c.policialAssociadoMatricula && pols.find(p => String(p['MATRÍCULA'] ?? p.matricula ?? '') === String(c.policialAssociadoMatricula)));
  return [...coletes]
    .sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime())
    .map((c, i) => {
      const p: any = acha(c);
      const v = new Date(c.vencimento);
      const colete = [`Série: ${c.numeroSerie || 'S/N'}`, [c.fabricante, c.modelo].filter(Boolean).join(' '),
        c.tamanhoColete && `Tam: ${c.tamanhoColete}`, c.sexo, `Venc: ${fmt(v)}`].filter(Boolean).join(' | ');
      const qra = p ? `${p['Post/Grad'] || ''} ${p['NOME DE GUERRA'] || ''}`.trim()
        : (c.policialAssociadoNome ? `${c.policialAssociadoPostGrad || ''} ${c.policialAssociadoNome}`.trim() : 'SEM CAUTELA');
      const nome = p ? (p['NOME'] || p.nome || '') : (c.policialAssociadoNome || 'SEM CAUTELA');
      return [String(i + 1), qra, nome, p?.CPF || '', colete, tempo(v)];
    });
}

const titulo = () => `COLETES BALÍSTICOS VENCIDOS - EMITIDO EM ${fmt(new Date())}`;
const nomeArq = (ext: string) => `coletes_vencidos_${fmt(new Date()).replace(/\//g, '-')}.${ext}`;
function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export async function exportarPDF(coletes: any[]) {
  const rows = await montarLinhas(coletes);
  const d = new jsPDF({ orientation: 'landscape' });
  d.setFontSize(13); d.text(titulo(), 14, 14);
  autoTable(d, { startY: 20, head: [HEAD], body: rows, styles: { fontSize: 8 }, headStyles: { fillColor: [60, 60, 60] } });
  d.save(nomeArq('pdf'));
}

export async function exportarExcel(coletes: any[]) {
  const rows = await montarLinhas(coletes);
  const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('Coletes vencidos');
  ws.addRow([titulo()]).font = { bold: true, size: 13 };
  ws.addRow(HEAD).font = { bold: true };
  rows.forEach(r => ws.addRow(r));
  [6, 25, 40, 16, 70, 16].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  baixar(new Blob([await wb.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), nomeArq('xlsx'));
}

export async function exportarWord(coletes: any[]) {
  const rows = await montarLinhas(coletes);
  const cell = (t: string, bold = false) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t, bold, size: 18 })] })] });
  const doc = new Document({ sections: [{
    properties: { page: { size: { orientation: PageOrientation.LANDSCAPE } } },
    children: [
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: titulo(), bold: true, size: 24 })] }),
      new Paragraph(''),
      new Table({ width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [new TableRow({ tableHeader: true, children: HEAD.map(h => cell(h, true)) }), ...rows.map(r => new TableRow({ children: r.map(c => cell(c)) }))] }),
    ] }] });
  baixar(await Packer.toBlob(doc), nomeArq('docx'));
}
