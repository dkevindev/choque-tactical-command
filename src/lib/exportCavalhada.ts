import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import {
  CATEGORIAS, LOCAIS, SEXOS, SITUACOES_CARGA, formatarNascimento, type Categoria, type Local, type Solipede,
} from '@/lib/cavalhada';

const HEAD = ['Nº', 'REGISTRO', 'NOME', 'RAÇA', 'NASC.', 'SEXO', 'PELAGEM', 'SITUAÇÃO NA PM'];
const hoje = () => new Date().toLocaleDateString('pt-BR');
const nomeArq = (ext: string) => `relacao_cavalhada_${hoje().replace(/\//g, '-')}.${ext}`;

const situacao = (s: Solipede) =>
  s.situacaoCarga === 'PENDENTE'
    ? 'PARA INCLUIR EM CARGA'
    : `${s.situacaoCarga === 'DESCARGA' ? 'DESCARGA' : 'CARGA'}${s.documentoCarga ? ` – ${s.documentoCarga}` : ''}`;

const linha = (s: Solipede, i: number) => [
  String(i + 1), s.registro, s.nome, s.raca, formatarNascimento(s), SEXOS[s.sexo].toUpperCase(), s.pelagem, situacao(s),
];

/** Agrupa como na relação original: primeiro por local, depois por categoria. */
const ORDEM_CATEGORIAS = Object.keys(CATEGORIAS) as Categoria[];
const ORDEM_LOCAIS = Object.keys(LOCAIS) as Local[];

export function agrupar(lista: Solipede[]) {
  const grupos: { titulo: string; local: Local; animais: Solipede[] }[] = [];
  ORDEM_LOCAIS.forEach((local) => {
    const doLocal = lista.filter((s) => s.local === local);
    if (local === 'RPMONT') {
      ORDEM_CATEGORIAS.forEach((cat) => {
        const animais = doLocal.filter((s) => s.categoria === cat);
        if (animais.length) grupos.push({ titulo: CATEGORIAS[cat].toUpperCase(), local, animais });
      });
    } else if (doLocal.length) {
      grupos.push({ titulo: LOCAIS[local].toUpperCase(), local, animais: doLocal });
    }
  });
  return grupos;
}

const titulo = () => `RELAÇÃO GERAL DA CAVALHADA – RPMONT – EMITIDA EM ${hoje()}`;

function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export function exportarCavalhadaPDF(lista: Solipede[]) {
  const d = new jsPDF({ orientation: 'portrait' });
  d.setFontSize(12);
  d.text(titulo(), 105, 12, { align: 'center' });
  let y = 18;
  agrupar(lista).forEach((g) => {
    autoTable(d, {
      startY: y,
      head: [[{ content: g.titulo, colSpan: HEAD.length, styles: { halign: 'center', fillColor: [40, 40, 40] } }], HEAD],
      body: g.animais.map(linha),
      foot: [[{ content: `TOTAL: ${g.animais.length}`, colSpan: HEAD.length, styles: { halign: 'right' } }]],
      styles: { fontSize: 7, cellPadding: 1.2 },
      headStyles: { fillColor: [80, 80, 80] },
      footStyles: { fillColor: [230, 230, 230], textColor: 20 },
      margin: { left: 8, right: 8 },
    });
    y = (d as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  });
  const total = (local: Local) => lista.filter((s) => s.local === local).length;
  if (y > 270) { d.addPage(); y = 15; }
  d.setFontSize(9);
  d.text(
    `TOTAL NO REGIMENTO: ${total('RPMONT')}   |   CRATO: ${total('CRATO')}   |   UECE: ${total('UECE')}   |   TOTAL GERAL: ${lista.length}`,
    8, y,
  );
  d.save(nomeArq('pdf'));
}

export async function exportarCavalhadaExcel(lista: Solipede[]) {
  const wb = new ExcelJS.Workbook();
  // Aba 1: igual à relação impressa, separada por grupos
  const ws = wb.addWorksheet('Relação');
  ws.addRow([titulo()]).font = { bold: true, size: 12 };
  agrupar(lista).forEach((g) => {
    ws.addRow([]);
    ws.addRow([g.titulo]).font = { bold: true };
    ws.addRow(HEAD).font = { bold: true };
    g.animais.forEach((s, i) => ws.addRow(linha(s, i)));
    ws.addRow(['', '', 'TOTAL', g.animais.length]).font = { bold: true };
  });
  [5, 10, 26, 12, 12, 8, 18, 30].forEach((w, i) => (ws.getColumn(i + 1).width = w));

  // Aba 2: lista corrida, boa para filtrar no Excel
  const ws2 = wb.addWorksheet('Lista completa');
  ws2.addRow(['REGISTRO', 'NOME', 'RAÇA', 'NASCIMENTO', 'SEXO', 'PELAGEM', 'CATEGORIA', 'LOCAL', 'SITUAÇÃO DE CARGA', 'DOCUMENTO', 'OBSERVAÇÕES']).font = { bold: true };
  lista.forEach((s) => ws2.addRow([
    s.registro, s.nome, s.raca, formatarNascimento(s), SEXOS[s.sexo], s.pelagem, CATEGORIAS[s.categoria],
    LOCAIS[s.local], SITUACOES_CARGA[s.situacaoCarga], s.documentoCarga ?? '', s.observacoes ?? '',
  ]));
  ws2.autoFilter = { from: 'A1', to: 'K1' };
  [10, 26, 12, 12, 8, 18, 28, 22, 22, 20, 30].forEach((w, i) => (ws2.getColumn(i + 1).width = w));

  baixar(
    new Blob([await wb.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    nomeArq('xlsx'),
  );
}
