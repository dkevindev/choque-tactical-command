import { useEffect, useMemo, useState } from 'react';
import { collection, addDoc, getDocs, query, where, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Copy, Download, Trash2, Pencil, UserCheck, Wand2, Search, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const CARREGADORES = 2;
const MUNICOES = 20;

interface Recruta { id: string; NOME: string; 'NOME DE GUERRA'?: string; 'Matrícula'?: any; TELEFONE?: string; 'ENDEREÇO'?: string; 'Post/Grad'?: string; }
interface Pistola { id: string; nome: string; fabricante?: string; modelo?: string; calibre?: string; numeroSerie: string; disponivel: boolean; }
interface CautelaD { id: string; numeroCautela: string; policialId: string; policialNome: string; policialMatricula: string; policialPatente?: string; materiais: any[]; status: 'ativa' | 'finalizada'; dataInicio: Date; dataFim?: Date; }

const fmt = (d?: Date) => d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-';

const DisposicaoPage = () => {
  const [recrutas, setRecrutas] = useState<Recruta[]>([]);
  const [pistolas, setPistolas] = useState<Pistola[]>([]);
  const [cautelas, setCautelas] = useState<CautelaD[]>([]);
  const [busca, setBusca] = useState('');
  const [editando, setEditando] = useState<Recruta | null>(null);
  const [lote, setLote] = useState({ fabricante: '', modelo: '', calibre: '9mm', series: '' });
  const [gerando, setGerando] = useState(false);
  const link = `${window.location.origin}/cadastro-disposicao`;

  const carregar = async () => {
    const [p, m, c] = await Promise.all([
      getDocs(query(collection(db, 'policiais'), where('aDisposicao', '==', true))),
      getDocs(collection(db, 'materiais_disposicao')),
      getDocs(collection(db, 'cautelas_disposicao')),
    ]);
    setRecrutas(p.docs.map(d => ({ id: d.id, ...d.data() } as Recruta)).sort((a, b) => (a.NOME || '').localeCompare(b.NOME || '')));
    setPistolas(m.docs.map(d => ({ id: d.id, ...d.data() } as Pistola)).sort((a, b) => a.numeroSerie.localeCompare(b.numeroSerie)));
    setCautelas(c.docs.map(d => {
      const x: any = d.data();
      return { id: d.id, ...x, dataInicio: x.dataInicio?.toDate?.() || new Date(), dataFim: x.dataFim?.toDate?.() } as CautelaD;
    }).sort((a, b) => b.numeroCautela.localeCompare(a.numeroCautela)));
  };
  useEffect(() => { carregar().catch(e => { console.error(e); toast.error('Erro ao carregar dados'); }); }, []);

  const ativasPorPolicial = useMemo(() => new Set(cautelas.filter(c => c.status === 'ativa').map(c => c.policialId)), [cautelas]);
  const filtro = (s: string) => s.toLowerCase().includes(busca.toLowerCase());

  // ---------- Policiais ----------
  const salvarEdicao = async () => {
    if (!editando) return;
    const { id, ...rest } = editando;
    const limpo = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
    await updateDoc(doc(db, 'policiais', id), limpo);
    toast.success('Dados atualizados');
    setEditando(null); carregar();
  };
  const excluirRecruta = async (r: Recruta) => {
    if (ativasPorPolicial.has(r.id)) { toast.error('Baixe a cautela antes de excluir'); return; }
    if (!confirm(`Excluir ${r.NOME}?`)) return;
    await deleteDoc(doc(db, 'policiais', r.id));
    toast.success('Excluído'); carregar();
  };
  const efetivar = async (r: Recruta) => {
    if (!confirm(`Incluir ${r.NOME} no efetivo do regimento?`)) return;
    await updateDoc(doc(db, 'policiais', r.id), { aDisposicao: false, 'SITUAÇÃO': 'MONTADO' });
    toast.success('Policial incluído no efetivo'); carregar();
  };

  // ---------- Pistolas ----------
  const cadastrarLote = async () => {
    const series = Array.from(new Set(lote.series.split(/[\n,;]+/).map(s => s.trim().toUpperCase()).filter(Boolean)));
    if (!lote.modelo.trim() || series.length === 0) { toast.error('Informe o modelo e os números de série'); return; }
    const existentes = new Set(pistolas.map(p => p.numeroSerie));
    const novas = series.filter(s => !existentes.has(s));
    if (novas.length === 0) { toast.error('Todas essas séries já estão cadastradas'); return; }
    const batch = writeBatch(db);
    novas.forEach(numeroSerie => {
      batch.set(doc(collection(db, 'materiais_disposicao')), {
        nome: `Pistola ${lote.modelo.trim()}`.toUpperCase(),
        categoria: 'Armamento', subcategoria: 'Pistola',
        fabricante: lote.fabricante.trim().toUpperCase(), modelo: lote.modelo.trim().toUpperCase(), calibre: lote.calibre.trim(),
        numeroSerie, disponivel: true, aDisposicao: true, createdAt: new Date(),
      });
    });
    await batch.commit();
    toast.success(`${novas.length} pistola(s) cadastrada(s)${series.length > novas.length ? ` — ${series.length - novas.length} repetida(s) ignorada(s)` : ''}`);
    setLote(l => ({ ...l, series: '' })); carregar();
  };
  const excluirPistola = async (p: Pistola) => {
    if (!p.disponivel) { toast.error('Pistola cautelada — baixe a cautela antes'); return; }
    if (!confirm(`Excluir pistola ${p.numeroSerie}?`)) return;
    await deleteDoc(doc(db, 'materiais_disposicao', p.id)); carregar();
  };

  // ---------- Cautelas ----------
  const proximoNumero = (offset: number) => {
    const max = cautelas.reduce((m, c) => Math.max(m, parseInt(c.numeroCautela.replace(/\D/g, '')) || 0), 0);
    return `D-${String(max + offset).padStart(3, '0')}`;
  };
  const criarCautela = async (r: Recruta, p: Pistola, numero: string) => {
    await addDoc(collection(db, 'cautelas_disposicao'), {
      numeroCautela: numero,
      policialId: r.id, policialNome: r.NOME, policialMatricula: String(r['Matrícula'] ?? ''), policialPatente: r['Post/Grad'] || 'ALUNO SOLDADO',
      materiais: [{
        materialId: p.id, nome: p.nome, categoria: 'Armamento', subcategoria: 'Pistola',
        fabricante: p.fabricante || '', modelo: p.modelo || '', calibre: p.calibre || '', calibreMunicao: p.calibre || '',
        numeroSerie: p.numeroSerie, quantidade: 1, quantidadeCarregadores: CARREGADORES, quantidadeMunicoes: MUNICOES,
      }],
      status: 'ativa', tipoDocumento: 'permanente', aDisposicao: true, dataInicio: new Date(), createdAt: new Date(),
    });
    await updateDoc(doc(db, 'materiais_disposicao', p.id), { disponivel: false, policialId: r.id });
  };
  const gerarAutomatico = async () => {
    const semCautela = recrutas.filter(r => !ativasPorPolicial.has(r.id));
    const livres = pistolas.filter(p => p.disponivel);
    const n = Math.min(semCautela.length, livres.length);
    if (n === 0) { toast.error(semCautela.length === 0 ? 'Todos já possuem cautela' : 'Não há pistolas livres'); return; }
    if (!confirm(`Gerar ${n} cautela(s)? Cada uma: 1 pistola, ${CARREGADORES} carregadores e ${MUNICOES} munições.`)) return;
    setGerando(true);
    try {
      for (let i = 0; i < n; i++) await criarCautela(semCautela[i], livres[i], proximoNumero(i + 1));
      toast.success(`${n} cautela(s) gerada(s)`);
      if (semCautela.length > livres.length) toast.warning(`${semCautela.length - livres.length} recruta(s) sem pistola disponível`);
    } catch (e) { console.error(e); toast.error('Erro ao gerar cautelas'); }
    finally { setGerando(false); carregar(); }
  };
  const [manual, setManual] = useState<{ recruta: string; pistola: string }>({ recruta: '', pistola: '' });
  const gerarManual = async () => {
    const r = recrutas.find(x => x.id === manual.recruta); const p = pistolas.find(x => x.id === manual.pistola);
    if (!r || !p) { toast.error('Escolha o recruta e a pistola'); return; }
    await criarCautela(r, p, proximoNumero(1));
    toast.success('Cautela criada'); setManual({ recruta: '', pistola: '' }); carregar();
  };
  const finalizar = async (c: CautelaD) => {
    if (!confirm(`Dar baixa na cautela ${c.numeroCautela}?`)) return;
    await updateDoc(doc(db, 'cautelas_disposicao', c.id), { status: 'finalizada', dataFim: new Date() });
    for (const m of c.materiais) if (m.materialId) await updateDoc(doc(db, 'materiais_disposicao', m.materialId), { disponivel: true, policialId: null }).catch(() => {});
    toast.success('Cautela baixada — pistola liberada'); carregar();
  };
  const excluirCautela = async (c: CautelaD) => {
    if (!confirm(`Excluir definitivamente a cautela ${c.numeroCautela}?`)) return;
    await deleteDoc(doc(db, 'cautelas_disposicao', c.id));
    toast.success('Cautela excluída'); carregar();
  };
  const baixarDocumento = async (c: CautelaD) => {
    try {
      const r = recrutas.find(x => x.id === c.policialId);
      const nome = r?.NOME || c.policialNome;
      const response = await fetch('https://gerarcauteladocx-owvlmrnsjq-uc.a.run.app', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numeroCautela: c.numeroCautela,
          policial: { nome, matricula: c.policialMatricula, grad: r?.['Post/Grad'] || c.policialPatente || 'ALUNO SOLDADO', numeral: '' },
          materiais: c.materiais.flatMap(m => [m, ...(m.categoria === 'Armamento' ? [
            ...(m.quantidadeCarregadores ? [{ nome: `CARREGADOR ${m.modelo || ''}`.trim(), categoria: 'Acessório', subcategoria: 'Carregador', fabricante: m.fabricante, modelo: m.modelo, calibre: m.calibre, quantidade: m.quantidadeCarregadores }] : []),
            ...(m.quantidadeMunicoes ? [{ nome: `Munição ${m.calibre || ''}`.trim(), categoria: 'Munição', subcategoria: 'Letal', calibre: m.calibre, calibreMunicao: m.calibre, fabricante: 'N/D', numeroSerie: 'N/D', quantidade: m.quantidadeMunicoes }] : []),
          ] : [])]).map(m => ({
            nome: m.nome || '', categoria: m.categoria || '', subcategoria: m.subcategoria || '', fabricante: m.fabricante || '',
            modelo: m.modelo || '', calibre: m.calibre || '', calibreMunicao: m.calibreMunicao || '', sexo: '', tamanhoColete: '',
            numeroSerie: m.numeroSerie || '', quantidade: m.quantidade || 1,
            quantidadeCarregadores: m.quantidadeCarregadores || 0, quantidadeMunicoes: m.quantidadeMunicoes || 0,
          })),
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      const url = URL.createObjectURL(await response.blob());
      const a = document.createElement('a');
      a.href = url; a.download = `Cautela-${c.numeroCautela}-${nome.replace(/\s+/g, '_')}.docx`;
      document.body.appendChild(a); a.click(); a.remove();
      toast.success('Documento gerado');
    } catch (e) { console.error(e); toast.error('Erro ao gerar documento'); }
  };

  const livres = pistolas.filter(p => p.disponivel);

  return (
    <Card className="bg-card border-border shadow-tactical">
      <CardHeader>
        <CardTitle className="text-foreground">À DISPOSIÇÃO — ALUNOS SOLDADOS</CardTitle>
        <p className="text-sm text-muted-foreground">Separado do efetivo e da carga do regimento.</p>
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(link)}`} alt="QR Code do cadastro" className="h-[110px] w-[110px] rounded bg-background" />
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Link de autocadastro (celular)</p>
            <code className="block break-all text-xs text-muted-foreground">{link}</code>
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(link); toast.success('Link copiado'); }}>
              <Copy className="mr-2 h-4 w-4" />Copiar link
            </Button>
          </div>
          <div className="ml-auto flex gap-2">
            <Badge variant="secondary">{recrutas.length} recrutas</Badge>
            <Badge variant="secondary">{pistolas.length} pistolas ({livres.length} livres)</Badge>
            <Badge variant="secondary">{cautelas.filter(c => c.status === 'ativa').length} cautelas ativas</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar nome, matrícula ou série..." className="pl-9" />
        </div>
        <Tabs defaultValue="policiais">
          <TabsList>
            <TabsTrigger value="policiais">Policiais</TabsTrigger>
            <TabsTrigger value="pistolas">Pistolas</TabsTrigger>
            <TabsTrigger value="cautelas">Cautelas</TabsTrigger>
          </TabsList>

          <TabsContent value="policiais">
            <Table>
              <TableHeader><TableRow><TableHead>Grad.</TableHead><TableHead>Nome</TableHead><TableHead>Guerra</TableHead><TableHead>Matrícula</TableHead><TableHead>Telefone</TableHead><TableHead>Endereço</TableHead><TableHead>Cautela</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {recrutas.filter(r => filtro(`${r.NOME} ${r['NOME DE GUERRA']} ${r['Matrícula']}`)).map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">{r['Post/Grad']}</TableCell>
                    <TableCell>{r.NOME}</TableCell><TableCell>{r['NOME DE GUERRA']}</TableCell><TableCell>{r['Matrícula']}</TableCell>
                    <TableCell>{r.TELEFONE}</TableCell><TableCell className="max-w-[220px] truncate">{r['ENDEREÇO']}</TableCell>
                    <TableCell>{ativasPorPolicial.has(r.id) ? <Badge>Sim</Badge> : <Badge variant="outline">Não</Badge>}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Button size="icon" variant="ghost" title="Editar" onClick={() => setEditando({ ...r })}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title="Incluir no efetivo" onClick={() => efetivar(r)}><UserCheck className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title="Excluir" onClick={() => excluirRecruta(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {recrutas.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Nenhum cadastro ainda. Envie o link aos recrutas.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="pistolas" className="space-y-4">
            <div className="grid gap-3 rounded-lg border border-border p-4 md:grid-cols-4">
              <Input placeholder="Fabricante (ex.: TAURUS)" value={lote.fabricante} onChange={e => setLote(l => ({ ...l, fabricante: e.target.value }))} />
              <Input placeholder="Modelo (ex.: TS9)" value={lote.modelo} onChange={e => setLote(l => ({ ...l, modelo: e.target.value }))} />
              <Input placeholder="Calibre" value={lote.calibre} onChange={e => setLote(l => ({ ...l, calibre: e.target.value }))} />
              <div className="text-xs text-muted-foreground">Cada pistola: {CARREGADORES} carregadores e {MUNICOES} munições na cautela.</div>
              <Textarea className="md:col-span-4" rows={5} placeholder="Números de série — um por linha (pode colar uma lista)" value={lote.series} onChange={e => setLote(l => ({ ...l, series: e.target.value }))} />
              <Button className="md:col-span-4" onClick={cadastrarLote}>Cadastrar em lote</Button>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Série</TableHead><TableHead>Fabricante</TableHead><TableHead>Modelo</TableHead><TableHead>Calibre</TableHead><TableHead>Situação</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {pistolas.filter(p => filtro(`${p.numeroSerie} ${p.modelo}`)).map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono">{p.numeroSerie}</TableCell><TableCell>{p.fabricante}</TableCell><TableCell>{p.modelo}</TableCell><TableCell>{p.calibre}</TableCell>
                    <TableCell>{p.disponivel ? <Badge variant="outline">Livre</Badge> : <Badge>Cautelada</Badge>}</TableCell>
                    <TableCell><Button size="icon" variant="ghost" onClick={() => excluirPistola(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="cautelas" className="space-y-4">
            <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4">
              <Button onClick={gerarAutomatico} disabled={gerando}><Wand2 className="mr-2 h-4 w-4" />{gerando ? 'Gerando...' : 'Gerar automaticamente'}</Button>
              <span className="text-sm text-muted-foreground">ou manual:</span>
              <select className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground" value={manual.recruta} onChange={e => setManual(m => ({ ...m, recruta: e.target.value }))}>
                <option value="">Recruta...</option>
                {recrutas.filter(r => !ativasPorPolicial.has(r.id)).map(r => <option key={r.id} value={r.id}>{r.NOME} ({r['Matrícula']})</option>)}
              </select>
              <select className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground" value={manual.pistola} onChange={e => setManual(m => ({ ...m, pistola: e.target.value }))}>
                <option value="">Pistola...</option>
                {livres.map(p => <option key={p.id} value={p.id}>{p.modelo} — {p.numeroSerie}</option>)}
              </select>
              <Button variant="outline" onClick={gerarManual}>Criar cautela</Button>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Nº</TableHead><TableHead>Policial</TableHead><TableHead>Matrícula</TableHead><TableHead>Pistola</TableHead><TableHead>Carreg./Mun.</TableHead><TableHead>Início</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {cautelas.filter(c => filtro(`${c.policialNome} ${c.policialMatricula} ${c.numeroCautela} ${c.materiais.map(m => m.numeroSerie).join(' ')}`)).map(c => (
                  <TableRow key={c.id}>
                    <TableCell>{c.numeroCautela}</TableCell>
                    <TableCell>{recrutas.find(r => r.id === c.policialId)?.NOME || c.policialNome}</TableCell>
                    <TableCell>{c.policialMatricula}</TableCell>
                    <TableCell className="font-mono">{c.materiais.map(m => `${m.modelo} ${m.numeroSerie}`).join(', ')}</TableCell>
                    <TableCell>{c.materiais[0]?.quantidadeCarregadores} / {c.materiais[0]?.quantidadeMunicoes}</TableCell>
                    <TableCell>{fmt(c.dataInicio)}</TableCell>
                    <TableCell>{c.status === 'ativa' ? <Badge>Ativa</Badge> : <Badge variant="secondary">Finalizada {fmt(c.dataFim)}</Badge>}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Button size="icon" variant="ghost" title="Baixar documento" onClick={() => baixarDocumento(c)}><Download className="h-4 w-4" /></Button>
                      {c.status === 'ativa' && <Button size="icon" variant="ghost" title="Dar baixa" onClick={() => finalizar(c)}><CheckCircle className="h-4 w-4" /></Button>}
                      {c.status === 'finalizada' && <Button size="icon" variant="ghost" title="Excluir cautela" onClick={() => excluirCautela(c)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog open={!!editando} onOpenChange={o => !o && setEditando(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar recruta</DialogTitle></DialogHeader>
          {editando && (
            <div className="space-y-3">
              {([['NOME', 'Nome completo'], ['NOME DE GUERRA', 'Nome de guerra'], ['Matrícula', 'Matrícula'], ['TELEFONE', 'Telefone'], ['ENDEREÇO', 'Endereço']] as const).map(([k, l]) => (
                <div key={k}><label className="text-sm text-muted-foreground">{l}</label>
                  <Input value={String(editando[k] ?? '')} onChange={e => setEditando({ ...editando, [k]: k === 'Matrícula' ? (/^\d+$/.test(e.target.value) ? parseInt(e.target.value) : e.target.value) : e.target.value })} /></div>
              ))}
            </div>
          )}
          <DialogFooter><Button onClick={salvarEdicao}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default DisposicaoPage;
