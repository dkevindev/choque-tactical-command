import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Download, FileText, Settings, RefreshCw, Info } from 'lucide-react';
import { Q5_POSTOS, Q5_CATEGORIAS_PADRAO, calcularQ5, Q5Categoria, Q5Policial, Q5Atestado, Q5Registro, Q5Posto } from '@/lib/q5';

const fmt = (s?: string | null) => { if (!s) return '—'; const [y, m, d] = String(s).slice(0, 10).split('-'); return d && m && y ? `${d}/${m}/${y.slice(2)}` : String(s); };
const mat = (p: Q5Policial) => String(p['Matrícula'] ?? p.matricula ?? '');

const Q5Tab: React.FC = () => {
  const { toast } = useToast();
  const [policiais, setPoliciais] = useState<Q5Policial[]>([]);
  const [atestados, setAtestados] = useState<Q5Atestado[]>([]);
  const [cats, setCats] = useState<Q5Categoria[]>(Q5_CATEGORIAS_PADRAO);
  const [ref, setRef] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [atualizado, setAtualizado] = useState<Date | null>(null);
  const [postoFiltro, setPostoFiltro] = useState<string>('__all__');
  const [busca, setBusca] = useState('');
  const [detalhe, setDetalhe] = useState<{ titulo: string; regs: Q5Registro[] } | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showInc, setShowInc] = useState(false);
  const [opSit, setOpSit] = useState<string[]>([]);
  const [opFun, setOpFun] = useState<string[]>([]);

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'policiais'), s => { setPoliciais(s.docs.map(d => ({ id: d.id, ...d.data() } as Q5Policial))); setAtualizado(new Date()); });
    const u2 = onSnapshot(collection(db, 'atestados_medicos'), s => { setAtestados(s.docs.map(d => d.data() as Q5Atestado)); setAtualizado(new Date()); });
    const u3 = onSnapshot(collection(db, 'config_q5'), s => {
      if (s.empty) return;
      const saved = Object.fromEntries(s.docs.map(d => [d.id, d.data()]));
      setCats(Q5_CATEGORIAS_PADRAO.map(c => saved[c.id] ? { ...c, situacoes: saved[c.id].situacoes ?? c.situacoes, funcoes: saved[c.id].funcoes ?? c.funcoes } : c));
    });
    getDocs(collection(db, 'config_situacoes')).then(s => setOpSit(s.docs.map(d => d.data().nome).filter(Boolean).sort()));
    getDocs(collection(db, 'config_funcoes')).then(s => setOpFun(s.docs.map(d => d.data().nome).filter(Boolean).sort()));
    return () => { u1(); u2(); u3(); };
  }, []);

  const res = useMemo(() => calcularQ5(policiais, atestados, ref, cats), [policiais, atestados, ref, cats]);
  const passado = ref < format(new Date(), 'yyyy-MM-dd');
  const postos = postoFiltro === '__all__' ? [...Q5_POSTOS] : [postoFiltro as Q5Posto];
  const filtra = (regs: Q5Registro[]) => {
    const b = busca.trim().toLowerCase();
    return regs.filter(r => postos.includes(r.posto) && (!b || `${r.policial.NOME} ${r.policial['NOME DE GUERRA1']} ${mat(r.policial)}`.toLowerCase().includes(b)));
  };
  const conta = (regs: Q5Registro[], posto?: Q5Posto) => filtra(regs).filter(r => !posto || r.posto === posto);
  const abrir = (titulo: string, regs: Q5Registro[]) => setDetalhe({ titulo, regs });

  const Num = ({ regs, titulo, strong }: { regs: Q5Registro[]; titulo: string; strong?: boolean }) => (
    <button onClick={() => abrir(titulo, regs)} className={`min-w-8 rounded px-2 py-1 tabular-nums hover:bg-primary/10 hover:underline ${regs.length ? (strong ? 'font-bold text-primary' : 'font-semibold text-foreground') : 'text-muted-foreground'}`}>
      {regs.length || '–'}
    </button>
  );

  const linhasExport = () => {
    const rows: (string | number)[][] = [['POSTO/GRAD', 'EFETIVO', ...cats.map(c => c.titulo)]];
    for (const p of Q5_POSTOS) rows.push([p, conta(res.efetivo, p).length, ...cats.map(c => conta(res.porCategoria[c.id], p).length)]);
    rows.push(['TOTAL', conta(res.efetivo).length, ...cats.map(c => conta(res.porCategoria[c.id]).length)]);
    return rows;
  };
  const exportarExcel = async () => {
    const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('Q5');
    ws.addRow([`Q5 RPMONT – Quadro Quantitativo do Efetivo – Referência ${fmt(ref)}`]).font = { bold: true, size: 13 };
    ws.addRow([]);
    linhasExport().forEach((r, i) => { const row = ws.addRow(r); if (i === 0 || r[0] === 'TOTAL') row.font = { bold: true }; row.eachCell(c => { c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }; c.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' }; }); });
    ws.getColumn(1).width = 14; for (let i = 2; i <= cats.length + 2; i++) ws.getColumn(i).width = 13;
    const det = wb.addWorksheet('Detalhamento');
    det.addRow(['Categoria', 'Posto', 'Nome', 'Matrícula', 'Origem', 'Início', 'Fim', 'Dias', 'Detalhe']).font = { bold: true };
    cats.forEach(c => filtra(res.porCategoria[c.id]).forEach(r => det.addRow([c.titulo, r.posto, r.policial.NOME, mat(r.policial), r.origem, fmt(r.inicio), fmt(r.fim), r.dias ?? '', r.detalhe ?? ''])));
    const buf = await wb.xlsx.writeBuffer();
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([buf])); a.download = `Q5_RPMONT_${fmt(ref).replace(/\//g, '-')}.xlsx`; a.click();
  };
  const exportarPdf = () => {
    const pdf = new jsPDF({ orientation: 'landscape' });
    pdf.setFontSize(12); pdf.text(`Q5 RPMONT – Quadro Quantitativo do Efetivo – Ref. ${fmt(ref)}`, 10, 12);
    const [head, ...body] = linhasExport();
    autoTable(pdf, { head: [head.map(String)], body: body.map(r => r.map(String)), startY: 18, styles: { fontSize: 6, halign: 'center' }, headStyles: { fillColor: [40, 40, 40] } });
    pdf.save(`Q5_RPMONT_${fmt(ref).replace(/\//g, '-')}.pdf`);
  };

  const salvarCat = async (c: Q5Categoria) => {
    try { await setDoc(doc(db, 'config_q5', c.id), { situacoes: c.situacoes, funcoes: c.funcoes, atualizadoEm: new Date().toISOString() }, { merge: true }); }
    catch (e: any) { toast({ title: 'Erro ao salvar ligação', description: e?.message, variant: 'destructive' }); }
  };
  const toggle = (c: Q5Categoria, campo: 'situacoes' | 'funcoes', nome: string) => {
    const lista = c[campo].includes(nome) ? c[campo].filter(x => x !== nome) : [...c[campo], nome];
    const novo = { ...c, [campo]: lista }; setCats(cs => cs.map(x => x.id === c.id ? novo : x)); salvarCat(novo);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Q5 – Quadro Quantitativo do Efetivo</CardTitle>
            <p className="text-sm text-muted-foreground">Atualizado em {atualizado ? format(atualizado, 'dd/MM/yy HH:mm') : '…'} · tempo real</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm">Data de referência</label>
            <Input type="date" value={ref} onChange={e => e.target.value && setRef(e.target.value)} className="w-40" />
            <Button variant="outline" size="sm" onClick={() => setRef(format(new Date(), 'yyyy-MM-dd'))}><RefreshCw className="mr-1 h-4 w-4" />Hoje</Button>
            <Button variant="outline" size="sm" onClick={exportarExcel}><Download className="mr-1 h-4 w-4" />Excel</Button>
            <Button variant="outline" size="sm" onClick={exportarPdf}><FileText className="mr-1 h-4 w-4" />PDF</Button>
            <Button variant="outline" size="sm" onClick={() => setShowConfig(true)}><Settings className="mr-1 h-4 w-4" />Configurar ligações</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {passado && <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-sm"><Info className="mt-0.5 h-4 w-4 shrink-0" />Data passada: férias, situações com período e atestados são reconstruídos pelas datas registradas. Funções e posto/graduação usam o cadastro atual, pois não guardam data.</div>}
          <div className="flex flex-wrap gap-2">
            <Select value={postoFiltro} onValueChange={setPostoFiltro}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="__all__">Todos os postos</SelectItem>{Q5_POSTOS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Buscar nome ou matrícula" value={busca} onChange={e => setBusca(e.target.value)} className="w-64" />
            <Button variant={res.inconsistencias.length ? 'destructive' : 'outline'} size="sm" onClick={() => setShowInc(true)}><AlertTriangle className="mr-1 h-4 w-4" />Inconsistências ({res.inconsistencias.length})</Button>
            <Button variant="ghost" size="sm" onClick={() => abrir('Todo o efetivo', filtra(res.efetivo))}>Ver todos</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Efetivo global</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-3 flex items-baseline gap-3"><span className="text-4xl font-bold text-primary"><Num regs={conta(res.efetivo)} titulo="Efetivo global" strong /></span><span className="text-muted-foreground">policiais no efetivo</span></div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-12">
            {Q5_POSTOS.map(p => <div key={p} className="rounded-md border p-2 text-center"><div className="text-[11px] text-muted-foreground">{p}</div><Num regs={conta(res.efetivo, p)} titulo={`Efetivo – ${p}`} /></div>)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Situações funcionais e administrativas</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b">
                <th className="sticky left-0 bg-card p-2 text-left">POSTO/GRAD</th>
                {cats.map(c => <th key={c.id} className="min-w-[96px] p-2 text-center align-bottom text-[11px] font-semibold leading-tight">{c.titulo}{c.sub && <div className="font-normal text-muted-foreground">{c.sub}</div>}{!c.situacoes.length && !c.funcoes.length && <Badge variant="outline" className="mt-1 text-[10px]">sem fonte</Badge>}</th>)}
              </tr>
            </thead>
            <tbody>
              {postos.map(p => (
                <tr key={p} className="border-b hover:bg-muted/40">
                  <td className="sticky left-0 bg-card p-2 font-medium">{p}</td>
                  {cats.map(c => <td key={c.id} className="text-center"><Num regs={conta(res.porCategoria[c.id], p)} titulo={`${c.titulo} – ${p}`} /></td>)}
                </tr>
              ))}
              <tr className="bg-muted/50 font-bold">
                <td className="sticky left-0 bg-muted p-2">TOTAL</td>
                {cats.map(c => <td key={c.id} className="text-center"><Num regs={conta(res.porCategoria[c.id])} titulo={c.titulo} strong /></td>)}
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Sheet open={!!detalhe} onOpenChange={o => !o && setDetalhe(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader><SheetTitle>{detalhe?.titulo} ({detalhe?.regs.length})</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-2">
            {detalhe?.regs.length === 0 && <p className="text-sm text-muted-foreground">Nenhum policial nesta contagem.</p>}
            {detalhe?.regs.map((r, i) => (
              <div key={r.policial.id + i} className="rounded-md border p-3 text-sm">
                <div className="font-semibold">{r.posto} {r.policial['NOME DE GUERRA1'] || ''} <span className="font-normal text-muted-foreground">– {r.policial.NOME}</span></div>
                <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span>Matrícula: <b>{mat(r.policial) || '—'}</b></span>
                  <span>Situação: <b>{r.policial.SITUAÇÃO || '—'}</b></span>
                  <span>Função: <b>{r.policial['FUNÇÃO'] || '—'}</b></span>
                  <span>Origem: <b>{r.origem}</b></span>
                  {(r.inicio || r.fim) && <><span>Início: <b>{fmt(r.inicio)}</b></span><span>Fim: <b>{fmt(r.fim)}</b></span></>}
                  {r.dias != null && <span>Dias: <b>{r.dias}</b></span>}
                  {r.detalhe && <span className="col-span-2">{r.detalhe}</span>}
                  {r.policial.observacao && <span className="col-span-2">Obs.: {r.policial.observacao}</span>}
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={showInc} onOpenChange={setShowInc}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>Inconsistências ({res.inconsistencias.length})</DialogTitle></DialogHeader>
          {res.inconsistencias.map((x, i) => <div key={i} className="border-b py-2 text-sm"><b>{x.policial['Post/Grad']} {x.policial['NOME DE GUERRA1'] || x.policial.NOME}</b> ({mat(x.policial) || 's/ matr.'})<div className="text-muted-foreground">{x.motivo}</div></div>)}
          {!res.inconsistencias.length && <p className="text-sm text-muted-foreground">Nenhuma inconsistência encontrada.</p>}
        </DialogContent>
      </Dialog>

      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>Configurar ligações das categorias</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Marque quais situações e funções entram em cada categoria. Salva automaticamente. Se um policial se encaixar em duas categorias de afastamento, vale a de menor prioridade (LTS 1, Férias 2, Licenças 3…).</p>
          {cats.map(c => (
            <div key={c.id} className="rounded-md border p-3">
              <div className="mb-2 font-semibold">{c.titulo} <span className="text-xs font-normal text-muted-foreground">({c.tipo === 'funcao' ? 'por função' : `afastamento · prioridade ${c.prioridade}`})</span></div>
              {c.tipo === 'afastamento' && <><div className="text-xs font-medium">Situações</div>
                <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1">{[...new Set([...opSit, ...c.situacoes])].map(n => <label key={n} className="flex items-center gap-1 text-xs"><Checkbox checked={c.situacoes.includes(n)} onCheckedChange={() => toggle(c, 'situacoes', n)} />{n}</label>)}</div></>}
              <div className="text-xs font-medium">Funções</div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">{[...new Set([...opFun, ...c.funcoes])].map(n => <label key={n} className="flex items-center gap-1 text-xs"><Checkbox checked={c.funcoes.includes(n)} onCheckedChange={() => toggle(c, 'funcoes', n)} />{n}</label>)}</div>
            </div>
          ))}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Q5Tab;
