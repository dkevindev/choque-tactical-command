import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Download, History, LayoutDashboard, List, Loader2, Pencil, Plus, Stethoscope, Syringe, Trash2, ClipboardList } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  DATA_RELACAO_IMPORTADA, formatarDataBR, importarRelacao, listarSolipedes, type Solipede,
} from '@/lib/cavalhada';
import { RELACAO_CAVALHADA_2026_07_15 as relacao } from '@/data/cavalhada-2026-07-15';
import PainelCavalhada from '@/components/cavalhada/PainelCavalhada';
import ListaSolipedes from '@/components/cavalhada/ListaSolipedes';
import HistoricoCavalhada from '@/components/cavalhada/HistoricoCavalhada';
import FichaSolipede from '@/components/cavalhada/FichaSolipede';

type Campo = {
  key: string;
  label: string;
  tipo?: 'texto' | 'data' | 'area' | 'opcoes' | 'animal';
  opcoes?: string[];
  obrigatorio?: boolean;
};

type Registro = { id: string } & Record<string, string>;

// O cadastro dos animais é o da Cavalhada (coleção "solipedes"), em src/lib/cavalhada.ts.

const ATENDIMENTOS: Campo[] = [
  { key: 'animalId', label: 'Animal', tipo: 'animal', obrigatorio: true },
  { key: 'data', label: 'Data', tipo: 'data', obrigatorio: true },
  { key: 'tipo', label: 'Tipo', tipo: 'opcoes', opcoes: ['Consulta', 'Emergência', 'Cirurgia', 'Retorno', 'Exame'], obrigatorio: true },
  { key: 'veterinario', label: 'Veterinário', obrigatorio: true },
  { key: 'diagnostico', label: 'Diagnóstico', tipo: 'area' },
  { key: 'tratamento', label: 'Tratamento / Prescrição', tipo: 'area' },
];

const VACINAS: Campo[] = [
  { key: 'animalId', label: 'Animal', tipo: 'animal', obrigatorio: true },
  { key: 'tipo', label: 'Tipo', tipo: 'opcoes', opcoes: ['Vacina', 'Vermifugação'], obrigatorio: true },
  { key: 'produto', label: 'Produto', obrigatorio: true },
  { key: 'dataAplicacao', label: 'Aplicação', tipo: 'data', obrigatorio: true },
  { key: 'proximaDose', label: 'Próxima dose', tipo: 'data' },
];

const MAX_TEXTO = 2000;

const formatarData = (v?: string) => (v ? v.split('-').reverse().join('/') : '-');

// Dias até a data (negativo = vencida). null se não houver data.
const diasAte = (data?: string, hoje = new Date()): number | null => {
  if (!data) return null;
  const alvo = new Date(`${data}T00:00:00`);
  const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((alvo.getTime() - base.getTime()) / 86400000);
};

const StatusDose = ({ data }: { data?: string }) => {
  const dias = diasAte(data);
  if (dias === null) return <span>-</span>;
  if (dias < 0) return <Badge variant="destructive">{formatarData(data)} · vencida</Badge>;
  if (dias <= 30) return <Badge className="bg-yellow-500 text-black">{formatarData(data)} · em {dias}d</Badge>;
  return <span>{formatarData(data)}</span>;
};

const ListaRegistros = ({
  colecao, titulo, campos, colunas, animais, usuarioId, onChange,
}: {
  colecao: string;
  titulo: string;
  campos: Campo[];
  colunas: string[];
  animais: Registro[];
  usuarioId: string;
  onChange?: () => void;
}) => {
  const { toast } = useToast();
  const [itens, setItens] = useState<Registro[]>([]);
  const [busca, setBusca] = useState('');
  const [editando, setEditando] = useState<Record<string, string> | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    try {
      const snap = await getDocs(collection(db, colecao));
      setItens(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Registro));
    } catch (e) {
      console.error(`Erro ao carregar ${colecao}:`, e);
      toast({ title: 'Erro ao carregar dados', variant: 'destructive' });
    }
  };

  useEffect(() => { carregar(); }, [colecao]);

  const nomeAnimal = (id: string) => {
    const a = animais.find(x => x.id === id);
    return a ? `${a.nome} (${a.registro})` : '—';
  };

  const valorCelula = (item: Registro, key: string) => {
    const campo = campos.find(c => c.key === key)!;
    if (key === 'proximaDose') return <StatusDose data={item[key]} />;
    if (campo.tipo === 'animal') return nomeAnimal(item[key]);
    if (campo.tipo === 'data') return formatarData(item[key]);
    return item[key] || '-';
  };

  const salvar = async () => {
    if (!editando) return;
    const dados: Record<string, string> = {};
    for (const c of campos) {
      const v = String(editando[c.key] ?? '').trim().slice(0, MAX_TEXTO);
      if (c.obrigatorio && !v) {
        toast({ title: `Preencha: ${c.label}`, variant: 'destructive' });
        return;
      }
      if (c.tipo === 'opcoes' && v && !c.opcoes!.includes(v)) return;
      if (c.tipo === 'animal' && v && !animais.some(a => a.id === v)) return;
      dados[c.key] = v;
    }
    setSalvando(true);
    try {
      if (editando.id) {
        await updateDoc(doc(db, colecao, editando.id), { ...dados, atualizadoPor: usuarioId, atualizadoEm: serverTimestamp() });
      } else {
        await addDoc(collection(db, colecao), { ...dados, criadoPor: usuarioId, criadoEm: serverTimestamp() });
      }
      toast({ title: 'Salvo com sucesso' });
      setEditando(null);
      await carregar();
      onChange?.();
    } catch (e) {
      console.error(`Erro ao salvar em ${colecao}:`, e);
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (item: Registro) => {
    if (!window.confirm('Excluir este registro? Esta ação não pode ser desfeita.')) return;
    try {
      await deleteDoc(doc(db, colecao, item.id));
      await carregar();
      onChange?.();
    } catch (e) {
      console.error(`Erro ao excluir em ${colecao}:`, e);
      toast({ title: 'Erro ao excluir', variant: 'destructive' });
    }
  };

  const termo = busca.toLowerCase();
  const filtrados = itens
    .filter(i => !termo || colunas.some(k => String(campos.find(c => c.key === k)?.tipo === 'animal' ? nomeAnimal(i[k]) : i[k] ?? '').toLowerCase().includes(termo)))
    .sort((a, b) => String(b.data ?? b.dataAplicacao ?? '').localeCompare(String(a.data ?? a.dataAplicacao ?? '')) || String(a.nome ?? '').localeCompare(String(b.nome ?? '')));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 justify-between">
        <Input placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} className="sm:max-w-xs" />
        <Button onClick={() => setEditando({})} disabled={campos.some(c => c.tipo === 'animal') && animais.length === 0}>
          <Plus className="h-4 w-4 mr-2" /> Novo
        </Button>
      </div>

      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {colunas.map(k => <TableHead key={k}>{campos.find(c => c.key === k)!.label}</TableHead>)}
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.length === 0 && (
              <TableRow><TableCell colSpan={colunas.length + 1} className="text-center text-muted-foreground">Nenhum registro</TableCell></TableRow>
            )}
            {filtrados.map(item => (
              <TableRow key={item.id}>
                {colunas.map(k => <TableCell key={k}>{valorCelula(item, k)}</TableCell>)}
                <TableCell className="flex gap-1">
                  <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => setEditando({ ...item })}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => excluir(item)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editando} onOpenChange={o => !o && setEditando(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editando?.id ? 'Editar' : 'Novo'} — {titulo}</DialogTitle></DialogHeader>
          {editando && campos.map(c => (
            <div key={c.key} className="space-y-1">
              <Label htmlFor={`f-${c.key}`}>{c.label}{c.obrigatorio && ' *'}</Label>
              {c.tipo === 'area' ? (
                <Textarea id={`f-${c.key}`} maxLength={MAX_TEXTO} value={editando[c.key] ?? ''} onChange={e => setEditando({ ...editando, [c.key]: e.target.value })} />
              ) : c.tipo === 'opcoes' || c.tipo === 'animal' ? (
                <Select value={editando[c.key] ?? ''} onValueChange={v => setEditando({ ...editando, [c.key]: v })}>
                  <SelectTrigger id={`f-${c.key}`}><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {c.tipo === 'animal'
                      ? animais.map(a => <SelectItem key={a.id} value={a.id}>{a.nome} ({a.registro})</SelectItem>)
                      : c.opcoes!.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input id={`f-${c.key}`} type={c.tipo === 'data' ? 'date' : 'text'} maxLength={200} value={editando[c.key] ?? ''} onChange={e => setEditando({ ...editando, [c.key]: e.target.value })} />
              )}
            </div>
          ))}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const DmvSystem = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [animais, setAnimais] = useState<Solipede[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [importando, setImportando] = useState(false);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [versaoHistorico, setVersaoHistorico] = useState(0);

  // Confere o acesso no cadastro atual do policial, não no localStorage (que o usuário pode editar).
  useEffect(() => {
    const id = localStorage.getItem('usuarioId');
    if (!id) { navigate('/'); return; }
    getDoc(doc(db, 'policiais', id))
      .then(s => (s.data()?.acessos?.dmv === true ? setUsuarioId(id) : navigate('/')))
      .catch(e => { console.error('Erro ao verificar acesso DMV:', e); navigate('/'); });
  }, [navigate]);

  const carregarAnimais = async () => {
    try {
      setAnimais(await listarSolipedes());
    } catch (e) {
      console.error('Erro ao carregar animais:', e);
      toast({ title: 'Erro ao carregar os animais', variant: 'destructive' });
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { if (usuarioId) carregarAnimais(); }, [usuarioId]);

  const aposAlterar = async () => {
    await carregarAnimais();
    setVersaoHistorico(v => v + 1);
  };

  const importar = async () => {
    setImportando(true);
    try {
      const r = await importarRelacao(relacao);
      toast({ title: `${r.importados} animais importados${r.jaExistiam ? ` (${r.jaExistiam} já estavam cadastrados)` : ''}.` });
      await aposAlterar();
    } catch (e) {
      console.error('Erro na importação:', e);
      toast({ title: 'Falha na importação. Nada foi perdido; tente novamente.', variant: 'destructive' });
    } finally {
      setImportando(false);
    }
  };

  // Formato usado pelas listas de prontuário e vacinas (seleção do animal).
  // Animais baixados continuam aparecendo para manter o histórico de atendimentos legível.
  const opcoesAnimais: Registro[] = animais.map(a => ({ id: a.id, nome: a.nome, registro: a.registro }));
  const selecionado = animais.find(a => a.id === selecionadoId) ?? null;

  if (!usuarioId) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Verificando acesso...</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" aria-label="Voltar" onClick={() => navigate('/')}><ArrowLeft className="h-5 w-5" /></Button>
          <Stethoscope className="h-6 w-6" />
          <div>
            <h1 className="text-xl font-bold">DMV</h1>
            <p className="text-sm text-muted-foreground">Departamento Médico Veterinário · Cavalhada do RPMont</p>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6 space-y-6">
        {carregando ? (
          <div className="flex justify-center py-20 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Carregando...
          </div>
        ) : (
          <>
            {animais.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center space-y-3">
                  <p className="font-semibold text-foreground">Nenhum animal cadastrado ainda.</p>
                  <p className="text-sm text-muted-foreground">
                    Importe a Relação Geral da Cavalhada de {formatarDataBR(DATA_RELACAO_IMPORTADA)} ({relacao.length} animais, dados já padronizados).
                  </p>
                  <Button onClick={importar} disabled={importando}>
                    {importando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                    Importar relação
                  </Button>
                </CardContent>
              </Card>
            )}

            <Tabs defaultValue="painel">
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="painel"><LayoutDashboard className="h-4 w-4 mr-2" />Painel</TabsTrigger>
                <TabsTrigger value="animais"><List className="h-4 w-4 mr-2" />Animais</TabsTrigger>
                <TabsTrigger value="atendimentos"><ClipboardList className="h-4 w-4 mr-2" />Prontuário</TabsTrigger>
                <TabsTrigger value="vacinas"><Syringe className="h-4 w-4 mr-2" />Vacinas e Vermifugação</TabsTrigger>
                <TabsTrigger value="historico"><History className="h-4 w-4 mr-2" />Movimentações</TabsTrigger>
              </TabsList>
              <TabsContent value="painel" className="mt-4">
                <PainelCavalhada animais={animais} onAbrir={setSelecionadoId} />
              </TabsContent>
              <TabsContent value="animais" className="mt-4">
                <ListaSolipedes animais={animais} onAbrir={setSelecionadoId} onAlterado={aposAlterar} />
              </TabsContent>
              <TabsContent value="atendimentos" className="mt-4">
                <ListaRegistros colecao="dmv_atendimentos" titulo="Atendimento" campos={ATENDIMENTOS} colunas={['data', 'animalId', 'tipo', 'veterinario', 'diagnostico']} animais={opcoesAnimais} usuarioId={usuarioId} />
              </TabsContent>
              <TabsContent value="vacinas" className="mt-4">
                <ListaRegistros colecao="dmv_vacinas" titulo="Vacina / Vermifugação" campos={VACINAS} colunas={['dataAplicacao', 'animalId', 'tipo', 'produto', 'proximaDose']} animais={opcoesAnimais} usuarioId={usuarioId} />
              </TabsContent>
              <TabsContent value="historico" className="mt-4">
                <HistoricoCavalhada versao={versaoHistorico} onAbrir={setSelecionadoId} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>

      <FichaSolipede
        animal={selecionado}
        aberto={!!selecionado}
        onFechar={() => setSelecionadoId(null)}
        onAlterado={aposAlterar}
        versao={versaoHistorico}
      />
    </div>
  );
};

export default DmvSystem;
