import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search, FileDown, ArrowLeft } from 'lucide-react';
import {
  Registro, buscarPorSerie, buscarPoliciais, historicoPolicial, statusMaterial, ROTULOS, fmt, resumo,
  getNome, getGuerra, getMatricula, getPosto, getSituacao, getNumeral,
} from './consultaData';

const ordenar = (r: Registro[]) => [...r].sort((a, b) => (b.quando?.getTime() ?? 0) - (a.quando?.getTime() ?? 0));

function Linha({ r }: { r: Registro }) {
  return (
    <div className="border-l-2 border-primary pl-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{ROTULOS[r.colecao] || r.colecao}</Badge>
        <span className="text-xs text-muted-foreground">{fmt(r.quando)}</span>
      </div>
      <p className="text-sm text-foreground mt-1 break-words">{resumo(r.data, 12) || '(sem detalhes)'}</p>
    </div>
  );
}

function pdf(titulo: string, cabecalho: string[][], regs: Registro[]) {
  const d = new jsPDF();
  d.setFontSize(14); d.text(titulo, 14, 15);
  autoTable(d, { startY: 20, body: cabecalho, theme: 'plain', styles: { fontSize: 9 } });
  autoTable(d, {
    head: [['Data', 'Origem', 'Detalhes']],
    body: ordenar(regs).map(r => [fmt(r.quando), ROTULOS[r.colecao] || r.colecao, resumo(r.data, 12)]),
    styles: { fontSize: 7 }, columnStyles: { 2: { cellWidth: 130 } },
  });
  d.save(`${titulo.replace(/\W+/g, '_')}.pdf`);
}

function ConsultaMaterial() {
  const [serie, setSerie] = useState('');
  const [loading, setLoading] = useState(false);
  const [regs, setRegs] = useState<Registro[] | null>(null);
  const buscar = async () => { setLoading(true); setRegs(await buscarPorSerie(serie)); setLoading(false); };
  const st = regs && statusMaterial(regs);
  const cadastros = (regs || []).filter(r => r.colecao === 'materiais_belicos' || r.colecao === 'materiais_disposicao');
  return (
    <div className="space-y-4">
      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); buscar(); }}>
        <Input placeholder="Número de série (arma, colete, algema...)" value={serie} onChange={e => setSerie(e.target.value)} />
        <Button type="submit" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}</Button>
      </form>
      {regs && regs.length === 0 && <p className="text-muted-foreground">Nenhum registro encontrado para esse número.</p>}
      {regs && regs.length > 0 && st && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={st.cor} className="text-base">{st.label}</Badge>
            <span className="text-sm text-muted-foreground">{regs.length} registros em todo o sistema</span>
            <Button size="sm" variant="outline" className="ml-auto" onClick={() => pdf(`Material ${serie}`, [['Status', st.label],
              ...cadastros.map(c => ['Cadastro', resumo(c.data, 10)])], regs)}><FileDown className="h-4 w-4 mr-1" />PDF</Button>
          </div>
          {cadastros.length > 1 && <p className="text-sm text-destructive">Atenção: esse número aparece em {cadastros.length} cadastros.</p>}
          {cadastros.map(c => (
            <Card key={c.id}><CardContent className="pt-4 text-sm text-foreground grid grid-cols-2 md:grid-cols-4 gap-2">
              {['nome', 'categoria', 'modelo', 'fabricante', 'calibre', 'numeroSerie', 'vencimento', 'tamanhoColete', 'sexo', 'numeroCautelaSiarm', 'policialAssociadoNome', 'localizacao']
                .filter(k => c.data[k]).map(k => <div key={k}><span className="text-muted-foreground text-xs block">{k}</span>{String(c.data[k])}</div>)}
            </CardContent></Card>
          ))}
          <Card><CardHeader><CardTitle className="text-base">Linha do tempo</CardTitle></CardHeader>
            <CardContent className="space-y-1">{ordenar(regs).map(r => <Linha key={r.colecao + r.id} r={r} />)}</CardContent></Card>
        </>
      )}
    </div>
  );
}

const GRUPOS: { titulo: string; cols: string[] }[] = [
  { titulo: 'Materiais e cautelas', cols: ['materiais_belicos', 'cautelas_permanentes', 'cautelas_provisorias', 'cautelas_disposicao', 'historico_material', 'movimentacoes_belicas', 'baixas_materiais', 'problemas_material'] },
  { titulo: 'Serviços de motorista e oficina', cols: ['servicosDiarios', 'oficina_controle'] },
  { titulo: 'Gestão de pessoas', cols: ['assentamentos', 'historico_promocoes', 'atestados_medicos', 'transferencias_policiais', 'policiais_transferidos'] },
  { titulo: 'Outros', cols: ['projetos_instrutores', 'eventos_auditoria'] },
];

function ConsultaPolicial() {
  const [termo, setTermo] = useState('');
  const [loading, setLoading] = useState(false);
  const [lista, setLista] = useState<Registro[] | null>(null);
  const [sel, setSel] = useState<Registro | null>(null);
  const [hist, setHist] = useState<Registro[]>([]);
  const buscar = async () => { setLoading(true); setSel(null); setLista(await buscarPoliciais(termo)); setLoading(false); };
  const abrir = async (p: Registro) => { setSel(p); setLoading(true); setHist(await historicoPolicial(p)); setLoading(false); };

  if (sel) {
    const d = sel.data;
    const atuais = hist.filter(r => r.colecao === 'materiais_belicos' && !r.data.baixado && !r.data.transferido);
    const cab = [['Nome', getNome(d)], ['Guerra', getGuerra(d)], ['Matrícula', getMatricula(d)], ['Posto/Grad', getPosto(d)],
      ['Situação', getSituacao(d)], ['Vínculo', d.aDisposicao ? 'À disposição (recruta)' : d.transferido ? 'Transferido' : 'No regimento'],
      ['Materiais atuais', atuais.map(a => `${a.data.nome || a.data.categoria} ${a.data.numeroSerie || ''}`).join('; ') || '-']];
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setSel(null)}><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button>
          <Button variant="outline" size="sm" className="ml-auto" disabled={loading} onClick={() => pdf(`Ficha ${getGuerra(d) || getNome(d)}`, cab, hist)}><FileDown className="h-4 w-4 mr-1" />PDF</Button>
        </div>
        <Card><CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-foreground">
          {cab.map(([k, v]) => <div key={k}><span className="text-muted-foreground text-xs block">{k}</span>{v || '-'}</div>)}
        </CardContent></Card>
        {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : GRUPOS.map(g => {
          const rs = ordenar(hist.filter(r => g.cols.includes(r.colecao)));
          return (
            <Card key={g.titulo}><CardHeader><CardTitle className="text-base">{g.titulo} ({rs.length})</CardTitle></CardHeader>
              <CardContent className="space-y-1 max-h-96 overflow-auto">
                {rs.length ? rs.map(r => <Linha key={r.colecao + r.id} r={r} />) : <p className="text-sm text-muted-foreground">Nada registrado.</p>}
              </CardContent></Card>
          );
        })}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); buscar(); }}>
        <Input placeholder="Nome, nome de guerra, matrícula ou numeral" value={termo} onChange={e => setTermo(e.target.value)} />
        <Button type="submit" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}</Button>
      </form>
      {lista && lista.length === 0 && <p className="text-muted-foreground">Nenhum policial encontrado.</p>}
      <div className="grid gap-2">
        {lista?.map(p => (
          <button key={p.id} onClick={() => abrir(p)} className="text-left border border-border rounded-md p-3 hover:bg-muted">
            <p className="font-semibold text-foreground">{getPosto(p.data)} {getGuerra(p.data) || getNome(p.data)}</p>
            <p className="text-xs text-muted-foreground">{getNome(p.data)} • Mat. {getMatricula(p.data)} {getNumeral(p.data) && `• Nº ${getNumeral(p.data)}`} • {getSituacao(p.data)}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ConsultaRapida() {
  return (
    <Tabs defaultValue="material" className="space-y-4">
      <TabsList><TabsTrigger value="material">Material (nº de série)</TabsTrigger><TabsTrigger value="policial">Policial</TabsTrigger></TabsList>
      <TabsContent value="material"><ConsultaMaterial /></TabsContent>
      <TabsContent value="policial"><ConsultaPolicial /></TabsContent>
    </Tabs>
  );
}
