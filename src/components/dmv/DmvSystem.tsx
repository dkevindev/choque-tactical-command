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
import { ArrowLeft, Pencil, Plus, Stethoscope, Trash2 } from 'lucide-react';

type Campo = {
  key: string;
  label: string;
  tipo?: 'texto' | 'data' | 'area' | 'opcoes' | 'animal';
  opcoes?: string[];
  obrigatorio?: boolean;
};

type Registro = { id: string } & Record<string, string>;

const ANIMAIS: Campo[] = [
  { key: 'nome', label: 'Nome', obrigatorio: true },
  { key: 'registro', label: 'Registro / Nº', obrigatorio: true },
  { key: 'raca', label: 'Raça' },
  { key: 'pelagem', label: 'Pelagem' },
  { key: 'sexo', label: 'Sexo', tipo: 'opcoes', opcoes: ['Macho', 'Fêmea', 'Castrado'] },
  { key: 'nascimento', label: 'Nascimento', tipo: 'data' },
  { key: 'situacao', label: 'Situação', tipo: 'opcoes', opcoes: ['Ativo', 'Em tratamento', 'Baixado'], obrigatorio: true },
  { key: 'observacoes', label: 'Observações', tipo: 'area' },
];

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
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [animais, setAnimais] = useState<Registro[]>([]);

  // Confere o acesso no cadastro atual do policial, não no localStorage (que o usuário pode editar).
  useEffect(() => {
    const id = localStorage.getItem('usuarioId');
    if (!id) { navigate('/'); return; }
    getDoc(doc(db, 'policiais', id))
      .then(s => (s.data()?.acessos?.dmv === true ? setUsuarioId(id) : navigate('/')))
      .catch(e => { console.error('Erro ao verificar acesso DMV:', e); navigate('/'); });
  }, [navigate]);

  const carregarAnimais = async () => {
    const snap = await getDocs(collection(db, 'dmv_animais'));
    setAnimais(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Registro));
  };

  useEffect(() => { if (usuarioId) carregarAnimais().catch(e => console.error('Erro ao carregar animais:', e)); }, [usuarioId]);

  if (!usuarioId) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Verificando acesso...</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" aria-label="Voltar" onClick={() => navigate('/')}><ArrowLeft className="h-5 w-5" /></Button>
          <Stethoscope className="h-6 w-6" />
          <div>
            <h1 className="text-xl font-bold">DMV</h1>
            <p className="text-sm text-muted-foreground">Departamento Médico Veterinário</p>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="animais">
          <TabsList>
            <TabsTrigger value="animais">Animais</TabsTrigger>
            <TabsTrigger value="atendimentos">Prontuário</TabsTrigger>
            <TabsTrigger value="vacinas">Vacinas e Vermifugação</TabsTrigger>
          </TabsList>
          <TabsContent value="animais">
            <ListaRegistros colecao="dmv_animais" titulo="Animal" campos={ANIMAIS} colunas={['nome', 'registro', 'raca', 'sexo', 'situacao']} animais={animais} usuarioId={usuarioId} onChange={carregarAnimais} />
          </TabsContent>
          <TabsContent value="atendimentos">
            <ListaRegistros colecao="dmv_atendimentos" titulo="Atendimento" campos={ATENDIMENTOS} colunas={['data', 'animalId', 'tipo', 'veterinario', 'diagnostico']} animais={animais} usuarioId={usuarioId} />
          </TabsContent>
          <TabsContent value="vacinas">
            <ListaRegistros colecao="dmv_vacinas" titulo="Vacina / Vermifugação" campos={VACINAS} colunas={['dataAplicacao', 'animalId', 'tipo', 'produto', 'proximaDose']} animais={animais} usuarioId={usuarioId} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default DmvSystem;
