import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Pencil, Trash2, Megaphone, AlertTriangle, Newspaper, Upload, X, RefreshCw, Cake, Settings, Wand2, Search, Users } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, orderBy, query, Timestamp, setDoc, getDoc, getDocs, writeBatch } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/firebase';
import { toast } from '@/hooks/use-toast';

// ============ Helpers de data de nascimento ============
const EXCEL_EPOCH_OFFSET = 25569; // dias entre 1899-12-30 e 1970-01-01

const dateToExcelSerial = (d: Date): number => {
  // Usa UTC para evitar drift por timezone
  const utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor(utc / 86400000) + EXCEL_EPOCH_OFFSET;
};

const excelSerialToDate = (n: number): Date => {
  return new Date((n - EXCEL_EPOCH_OFFSET) * 86400 * 1000);
};

const parseNascimento = (raw: any): Date | null => {
  if (raw === null || raw === undefined || raw === '') return null;
  try {
    if (typeof raw === 'number') return excelSerialToDate(raw);
    if (raw?.toDate) return raw.toDate();
    if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
    if (typeof raw === 'string') {
      const s = raw.trim();
      if (!s) return null;
      if (/^\d+$/.test(s)) return excelSerialToDate(Number(s));
      // dd/mm/yyyy ou dd-mm-yyyy
      const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
      if (m) {
        const dia = Number(m[1]);
        const mes = Number(m[2]) - 1;
        let ano = Number(m[3]);
        if (ano < 100) ano += ano < 30 ? 2000 : 1900;
        const d = new Date(ano, mes, dia);
        return isNaN(d.getTime()) ? null : d;
      }
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  } catch {
    return null;
  }
};

const lerCampoNascimento = (p: any): { raw: any; campoUsado: string | null } => {
  const candidatos = ['NASCIMENTO', 'Data de Nascimento', 'dataNascimento', 'data_nascimento'];
  for (const c of candidatos) {
    if (p[c] !== undefined && p[c] !== null && p[c] !== '') {
      return { raw: p[c], campoUsado: c };
    }
  }
  for (const k of Object.keys(p)) {
    if (k.toLowerCase().includes('nascimento') && p[k] !== undefined && p[k] !== null && p[k] !== '') {
      return { raw: p[k], campoUsado: k };
    }
  }
  return { raw: null, campoUsado: null };
};


type TipoNoticia = 'noticia' | 'determinacao' | 'aviso';

interface Noticia {
  id: string;
  tipo: TipoNoticia;
  titulo: string;
  mensagem: string;
  autor?: string;
  origemPainel?: string;
  dataPublicacao?: any;
  dataExpiracao?: any;
  prioridade?: number;
  ativa?: boolean;
  imagemUrl?: string;
  imagemPath?: string;
}

interface Props {
  origemPainel: 'gestao_logistica' | 'gestao_pessoas';
}

const tipoConfig: Record<TipoNoticia, { label: string; bg: string; gradient: string; icon: any }> = {
  noticia: { label: 'NOTÍCIA', bg: 'bg-blue-600', gradient: 'from-blue-600 to-blue-800', icon: Newspaper },
  determinacao: { label: 'DETERMINAÇÃO', bg: 'bg-red-600', gradient: 'from-red-600 to-red-800', icon: Megaphone },
  aviso: { label: 'AVISO', bg: 'bg-amber-500', gradient: 'from-amber-500 to-amber-700', icon: AlertTriangle },
};

const DEFAULT_TEMPLATE = {
  titulo: '🎉 PARABÉNS {POSTO} {NOME DE GUERRA1} 🎉',
  mensagem: 'O RPMONT deseja muitas felicidades — que Deus abençoe sua jornada!',
};

const VARIAVEIS: { token: string; descricao: string }[] = [
  { token: '{POSTO}', descricao: 'Posto/Graduação (ex.: SD, CB, SGT)' },
  { token: '{NOME DE GUERRA1}', descricao: 'Nome de guerra do policial' },
  { token: '{NOME}', descricao: 'Nome completo' },
  { token: '{MATRICULA}', descricao: 'Matrícula' },
  { token: '{IDADE}', descricao: 'Idade que está completando' },
];

const PREVIEW_DATA = { POSTO: 'SD', 'NOME DE GUERRA1': 'KEVIN', NOME: 'Kevin Silva', MATRICULA: '123456', IDADE: '30' };

const aplicarPreview = (texto: string): string => {
  return texto
    .replace(/\{NOME DE GUERRA1\}/gi, PREVIEW_DATA['NOME DE GUERRA1'])
    .replace(/\{NOME\}/gi, PREVIEW_DATA.NOME)
    .replace(/\{POST\/GRAD\}/gi, PREVIEW_DATA.POSTO)
    .replace(/\{POSTO\}/gi, PREVIEW_DATA.POSTO)
    .replace(/\{MATRICULA\}/gi, PREVIEW_DATA.MATRICULA)
    .replace(/\{IDADE\}/gi, PREVIEW_DATA.IDADE);
};

const formatDate = (d?: any) => {
  if (!d) return '-';
  const dt = d?.toDate ? d.toDate() : new Date(d);
  return dt.toLocaleDateString('pt-BR');
};

const todayPlusDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

const GerenciarNoticiasTotem = ({ origemPainel }: Props) => {
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Noticia | null>(null);

  const [tipo, setTipo] = useState<TipoNoticia>('noticia');
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [autor, setAutor] = useState('');
  const [dataExpiracao, setDataExpiracao] = useState(todayPlusDays(7));
  const [prioridade, setPrioridade] = useState(5);
  const [ativa, setAtiva] = useState(true);
  const [imagemUrl, setImagemUrl] = useState<string>('');
  const [imagemPath, setImagemPath] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  // Template parabéns
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateTitulo, setTemplateTitulo] = useState(DEFAULT_TEMPLATE.titulo);
  const [templateMensagem, setTemplateMensagem] = useState(DEFAULT_TEMPLATE.mensagem);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const tituloRef = useRef<HTMLInputElement>(null);
  const mensagemRef = useRef<HTMLTextAreaElement>(null);
  const [activeField, setActiveField] = useState<'titulo' | 'mensagem'>('mensagem');

  // Aniversariantes / policiais
  const [anivOpen, setAnivOpen] = useState(false);
  const [policiais, setPoliciais] = useState<any[]>([]);
  const [loadingPoliciais, setLoadingPoliciais] = useState(false);
  const [reformatando, setReformatando] = useState(false);
  const [busca, setBusca] = useState('');
  const [editDataOpen, setEditDataOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editDataValue, setEditDataValue] = useState('');
  const [savingData, setSavingData] = useState(false);

  const carregarPoliciais = async () => {
    try {
      setLoadingPoliciais(true);
      const snap = await getDocs(collection(db, 'policiais'));
      const list: any[] = [];
      snap.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
      setPoliciais(list);
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao carregar policiais', variant: 'destructive' });
    } finally {
      setLoadingPoliciais(false);
    }
  };

  const abrirAniv = async () => {
    setAnivOpen(true);
    if (policiais.length === 0) await carregarPoliciais();
  };

  const solicitarRefreshTotens = async () => {
    try {
      await setDoc(doc(db, 'config_painel', 'aniversariantes'), { refreshAt: Timestamp.now() }, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  const aniversariantesHoje = useMemo(() => {
    const hoje = new Date();
    const dia = hoje.getDate();
    const mes = hoje.getMonth();
    const ano = hoje.getFullYear();
    return policiais
      .map(p => {
        const { raw, campoUsado } = lerCampoNascimento(p);
        const dt = parseNascimento(raw);
        if (!dt) return null;
        if (dt.getDate() !== dia || dt.getMonth() !== mes) return null;
        const anoNasc = dt.getFullYear();
        const idade = anoNasc > 1900 ? ano - anoNasc - (
          (hoje.getMonth() < dt.getMonth() || (hoje.getMonth() === dt.getMonth() && hoje.getDate() < dt.getDate())) ? 1 : 0
        ) : null;
        return { policial: p, dt, raw, campoUsado, idade };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [policiais]);

  const policiaisFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const lista = q
      ? policiais.filter(p => {
          const blob = `${p.NOME || ''} ${p['NOME DE GUERRA1'] || p['NOME DE GUERRA'] || ''} ${p.MATRICULA || p.matricula || ''} ${p.NUMERAL || ''}`.toLowerCase();
          return blob.includes(q);
        })
      : policiais;
    return lista.slice(0, 200);
  }, [policiais, busca]);

  const abrirEditarData = (p: any) => {
    setEditTarget(p);
    const { raw } = lerCampoNascimento(p);
    const dt = parseNascimento(raw);
    setEditDataValue(dt ? `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}` : '');
    setEditDataOpen(true);
  };

  const salvarData = async () => {
    if (!editTarget || !editDataValue) {
      toast({ title: 'Selecione uma data', variant: 'destructive' });
      return;
    }
    try {
      setSavingData(true);
      const [y, m, d] = editDataValue.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      const serial = dateToExcelSerial(date);
      await updateDoc(doc(db, 'policiais', editTarget.id), { NASCIMENTO: serial });
      // Atualizar local
      setPoliciais(prev => prev.map(p => p.id === editTarget.id ? { ...p, NASCIMENTO: serial } : p));
      await solicitarRefreshTotens();
      toast({ title: 'Data atualizada', description: 'Os totens serão atualizados em segundos.' });
      setEditDataOpen(false);
      setEditTarget(null);
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao salvar data', variant: 'destructive' });
    } finally {
      setSavingData(false);
    }
  };

  const reformatarTodas = async () => {
    if (!confirm('Padronizar o campo NASCIMENTO de TODOS os policiais para o formato Excel serial (int)? Esta ação atualiza o banco.')) return;
    if (!confirm('Confirmar novamente: esta operação modificará registros no Firestore.')) return;
    try {
      setReformatando(true);
      let convertidos = 0, jaOk = 0, semData = 0, invalidos = 0;
      const lote: { id: string; serial: number }[] = [];
      for (const p of policiais) {
        const { raw, campoUsado } = lerCampoNascimento(p);
        if (raw === null || raw === undefined || raw === '') { semData++; continue; }
        const dt = parseNascimento(raw);
        if (!dt) {
          invalidos++;
          console.warn('[Reformatar] Inválido:', p.MATRICULA || p.id, raw);
          continue;
        }
        const serial = dateToExcelSerial(dt);
        // Já está no formato correto?
        if (typeof raw === 'number' && raw === serial && campoUsado === 'NASCIMENTO') {
          jaOk++;
          continue;
        }
        lote.push({ id: p.id, serial });
      }
      // Commits em batches de 400
      for (let i = 0; i < lote.length; i += 400) {
        const batch = writeBatch(db);
        lote.slice(i, i + 400).forEach(item => {
          batch.update(doc(db, 'policiais', item.id), { NASCIMENTO: item.serial });
        });
        await batch.commit();
        convertidos += Math.min(400, lote.length - i);
      }
      // Atualiza estado local
      const map = new Map(lote.map(l => [l.id, l.serial]));
      setPoliciais(prev => prev.map(p => map.has(p.id) ? { ...p, NASCIMENTO: map.get(p.id) } : p));
      await solicitarRefreshTotens();
      toast({
        title: 'Reformatação concluída',
        description: `Convertidos: ${convertidos} · Já no formato: ${jaOk} · Sem data: ${semData} · Inválidos: ${invalidos}`,
      });
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao reformatar', variant: 'destructive' });
    } finally {
      setReformatando(false);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'noticias_totem'), orderBy('dataPublicacao', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setNoticias(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, []);

  const resetForm = () => {
    setEditing(null);
    setTipo('noticia');
    setTitulo('');
    setMensagem('');
    setAutor('');
    setDataExpiracao(todayPlusDays(7));
    setPrioridade(5);
    setAtiva(true);
    setImagemUrl('');
    setImagemPath('');
  };

  const handleOpenNew = () => {
    resetForm();
    setOpen(true);
  };

  const handleEdit = (n: Noticia) => {
    setEditing(n);
    setTipo(n.tipo);
    setTitulo(n.titulo);
    setMensagem(n.mensagem);
    setAutor(n.autor || '');
    setPrioridade(n.prioridade ?? 5);
    setAtiva(n.ativa ?? true);
    setImagemUrl(n.imagemUrl || '');
    setImagemPath(n.imagemPath || '');
    const exp = n.dataExpiracao?.toDate ? n.dataExpiracao.toDate() : (n.dataExpiracao ? new Date(n.dataExpiracao) : new Date());
    setDataExpiracao(exp.toISOString().split('T')[0]);
    setOpen(true);
  };

  const handleUploadImagem = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Selecione uma imagem válida', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Imagem deve ter até 5MB', variant: 'destructive' });
      return;
    }
    try {
      setUploading(true);
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `noticias_totem/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const sref = storageRef(storage, path);
      await uploadBytes(sref, file);
      const url = await getDownloadURL(sref);
      if (imagemPath) {
        try { await deleteObject(storageRef(storage, imagemPath)); } catch {}
      }
      setImagemUrl(url);
      setImagemPath(path);
      toast({ title: 'Imagem carregada' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao fazer upload', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoverImagem = async () => {
    if (imagemPath) {
      try { await deleteObject(storageRef(storage, imagemPath)); } catch {}
    }
    setImagemUrl('');
    setImagemPath('');
  };

  const handleSave = async () => {
    if (!titulo.trim() || !mensagem.trim()) {
      toast({ title: 'Preencha título e mensagem', variant: 'destructive' });
      return;
    }
    if (!autor.trim()) {
      toast({ title: 'Informe o autor / responsável', variant: 'destructive' });
      return;
    }
    const expDate = new Date(dataExpiracao + 'T23:59:59');

    const payload: any = {
      tipo,
      titulo: titulo.trim(),
      mensagem: mensagem.trim(),
      autor: autor.trim(),
      origemPainel,
      dataExpiracao: Timestamp.fromDate(expDate),
      prioridade,
      ativa,
      imagemUrl: imagemUrl || null,
      imagemPath: imagemPath || null,
    };

    try {
      if (editing) {
        await updateDoc(doc(db, 'noticias_totem', editing.id), payload);
        toast({ title: 'Notícia atualizada' });
      } else {
        payload.dataPublicacao = Timestamp.now();
        await addDoc(collection(db, 'noticias_totem'), payload);
        toast({ title: 'Notícia publicada no totem' });
      }
      setOpen(false);
      resetForm();
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta notícia?')) return;
    const target = noticias.find(n => n.id === id);
    if (target?.imagemPath) {
      try { await deleteObject(storageRef(storage, target.imagemPath)); } catch {}
    }
    await deleteDoc(doc(db, 'noticias_totem', id));
    toast({ title: 'Notícia excluída' });
  };

  const toggleAtiva = async (n: Noticia) => {
    await updateDoc(doc(db, 'noticias_totem', n.id), { ativa: !n.ativa });
  };

  // Template
  const abrirTemplate = async () => {
    try {
      const snap = await getDoc(doc(db, 'config_painel', 'template_aniversario'));
      const data: any = snap.data();
      setTemplateTitulo(data?.titulo || DEFAULT_TEMPLATE.titulo);
      setTemplateMensagem(data?.mensagem || DEFAULT_TEMPLATE.mensagem);
    } catch {
      setTemplateTitulo(DEFAULT_TEMPLATE.titulo);
      setTemplateMensagem(DEFAULT_TEMPLATE.mensagem);
    }
    setTemplateOpen(true);
  };

  const inserirVariavel = (token: string) => {
    if (activeField === 'titulo') {
      const el = tituloRef.current;
      const start = el?.selectionStart ?? templateTitulo.length;
      const end = el?.selectionEnd ?? templateTitulo.length;
      const novo = templateTitulo.slice(0, start) + token + templateTitulo.slice(end);
      setTemplateTitulo(novo);
      setTimeout(() => { el?.focus(); el?.setSelectionRange(start + token.length, start + token.length); }, 0);
    } else {
      const el = mensagemRef.current;
      const start = el?.selectionStart ?? templateMensagem.length;
      const end = el?.selectionEnd ?? templateMensagem.length;
      const novo = templateMensagem.slice(0, start) + token + templateMensagem.slice(end);
      setTemplateMensagem(novo);
      setTimeout(() => { el?.focus(); el?.setSelectionRange(start + token.length, start + token.length); }, 0);
    }
  };

  const salvarTemplate = async () => {
    if (!templateTitulo.trim() || !templateMensagem.trim()) {
      toast({ title: 'Preencha título e mensagem do modelo', variant: 'destructive' });
      return;
    }
    try {
      setSavingTemplate(true);
      await setDoc(doc(db, 'config_painel', 'template_aniversario'), {
        titulo: templateTitulo.trim(),
        mensagem: templateMensagem.trim(),
        atualizadoEm: Timestamp.now(),
      }, { merge: true });
      // Forçar refresh dos totens
      await setDoc(doc(db, 'config_painel', 'aniversariantes'), { refreshAt: Timestamp.now() }, { merge: true });
      toast({ title: 'Modelo salvo', description: 'Os totens serão atualizados em segundos.' });
      setTemplateOpen(false);
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao salvar modelo', variant: 'destructive' });
    } finally {
      setSavingTemplate(false);
    }
  };

  const cfg = tipoConfig[tipo];
  const PreviewIcon = cfg.icon;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          Painel do Totem — Notícias e Determinações
        </CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await setDoc(doc(db, 'config_painel', 'aniversariantes'), { refreshAt: Timestamp.now() }, { merge: true });
                toast({ title: 'Atualização solicitada', description: 'Os totens serão atualizados em segundos.' });
              } catch (e) {
                console.error(e);
                toast({ title: 'Erro ao solicitar atualização', variant: 'destructive' });
              }
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Atualizar aniversariantes
          </Button>
          <Button variant="outline" onClick={abrirAniv}>
            <Cake className="h-4 w-4 mr-2" /> Aniversariantes
          </Button>
          <Button variant="outline" onClick={abrirTemplate}>
            <Settings className="h-4 w-4 mr-2" /> Editar modelo de parabéns
          </Button>
          <Button onClick={handleOpenNew}>
            <Plus className="h-4 w-4 mr-2" /> Nova
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Ativa</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {noticias.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma notícia cadastrada</TableCell></TableRow>
            )}
            {noticias.map(n => {
              const c = tipoConfig[n.tipo];
              return (
                <TableRow key={n.id}>
                  <TableCell><Badge className={`${c.bg} text-white`}>{c.label}</Badge></TableCell>
                  <TableCell className="font-medium max-w-xs truncate">{n.titulo}</TableCell>
                  <TableCell>{formatDate(n.dataExpiracao)}</TableCell>
                  <TableCell>{n.prioridade ?? 5}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{n.origemPainel === 'gestao_pessoas' ? 'Gestão Pessoas' : 'Gestão Logística'}</TableCell>
                  <TableCell><Switch checked={!!n.ativa} onCheckedChange={() => toggleAtiva(n)} /></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(n)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(n.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Dialog Notícia */}
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar' : 'Nova'} notícia do totem</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <Select value={tipo} onValueChange={(v) => setTipo(v as TipoNoticia)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="noticia">Notícia</SelectItem>
                      <SelectItem value="determinacao">Determinação</SelectItem>
                      <SelectItem value="aviso">Aviso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Prioridade (0-10)</Label>
                  <Input type="number" min={0} max={10} value={prioridade} onChange={e => setPrioridade(Number(e.target.value))} />
                </div>
              </div>
              <div>
                <Label>Título</Label>
                <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex.: Formatura Geral 7h" />
              </div>
              <div>
                <Label>Mensagem</Label>
                <Textarea rows={4} value={mensagem} onChange={e => setMensagem(e.target.value)} placeholder="Conteúdo da notícia ou determinação" />
              </div>
              <div>
                <Label>Autor / Responsável <span className="text-destructive">*</span></Label>
                <Input value={autor} onChange={e => setAutor(e.target.value)} placeholder="Ex.: CAP FULANO" />
                <p className="text-xs text-muted-foreground mt-1">Quem está publicando a notícia/determinação. Será exibido no totem.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Validade até</Label>
                  <Input type="date" value={dataExpiracao} onChange={e => setDataExpiracao(e.target.value)} />
                </div>
                <div className="flex items-end gap-2">
                  <Switch checked={ativa} onCheckedChange={setAtiva} id="ativa" />
                  <Label htmlFor="ativa">Ativa</Label>
                </div>
              </div>

              <div>
                <Label>Imagem (opcional)</Label>
                {imagemUrl ? (
                  <div className="mt-2 relative inline-block">
                    <img src={imagemUrl} alt="Preview" className="max-h-40 rounded-lg border border-border" />
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-7 w-7 rounded-full"
                      onClick={handleRemoverImagem}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="mt-2">
                    <label className="flex items-center justify-center gap-2 h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {uploading ? 'Enviando...' : 'Clique para enviar imagem (até 5MB)'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadImagem(f);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>

              <div>
                <Label>Pré-visualização</Label>
                <div className={`mt-2 rounded-xl bg-gradient-to-br ${cfg.gradient} p-6 text-white shadow-xl`}>
                  <div className="flex items-center gap-2 mb-3">
                    <PreviewIcon className="h-6 w-6" />
                    <Badge className="bg-white/20 text-white border-white/30">{cfg.label}</Badge>
                  </div>
                  <div className={imagemUrl ? 'flex gap-4 items-center' : ''}>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <h3 className="text-2xl font-bold mb-2 break-words [overflow-wrap:anywhere]">{titulo || 'Título da notícia'}</h3>
                      <p className="text-base opacity-90 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{mensagem || 'Mensagem...'}</p>
                      {autor && <p className="text-xs opacity-75 mt-3">— {autor}</p>}
                    </div>
                    {imagemUrl && (
                      <img src={imagemUrl} alt="" className="rounded-lg max-h-48 w-2/5 flex-shrink-0 object-cover" />
                    )}
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={uploading}>{editing ? 'Salvar' : 'Publicar'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Template */}
        <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Cake className="h-5 w-5 text-pink-500" /> Modelo de parabéns aos aniversariantes
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg border border-border p-3 bg-muted/30">
                <p className="text-sm font-medium mb-2">Variáveis disponíveis (clique para inserir)</p>
                <div className="flex flex-wrap gap-2">
                  {VARIAVEIS.map(v => (
                    <Button
                      key={v.token}
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => inserirVariavel(v.token)}
                      title={v.descricao}
                    >
                      {v.token}
                    </Button>
                  ))}
                </div>
                <ul className="text-xs text-muted-foreground mt-2 space-y-0.5">
                  {VARIAVEIS.map(v => (
                    <li key={v.token}><code className="font-mono">{v.token}</code> — {v.descricao}</li>
                  ))}
                </ul>
              </div>

              <div>
                <Label>Título</Label>
                <Input
                  ref={tituloRef}
                  value={templateTitulo}
                  onFocus={() => setActiveField('titulo')}
                  onChange={e => setTemplateTitulo(e.target.value)}
                  placeholder={DEFAULT_TEMPLATE.titulo}
                />
              </div>
              <div>
                <Label>Mensagem</Label>
                <Textarea
                  ref={mensagemRef}
                  rows={3}
                  value={templateMensagem}
                  onFocus={() => setActiveField('mensagem')}
                  onChange={e => setTemplateMensagem(e.target.value)}
                  placeholder={DEFAULT_TEMPLATE.mensagem}
                />
              </div>

              <div>
                <Label>Pré-visualização (com dados de exemplo: SD KEVIN, 30 anos)</Label>
                <div className="mt-2 rounded-xl bg-gradient-to-br from-yellow-400 via-amber-500 to-pink-600 p-8 text-white shadow-xl text-center">
                  <div className="text-5xl mb-3">🎂</div>
                  <h3 className="text-3xl font-extrabold mb-3 break-words [overflow-wrap:anywhere]">
                    {aplicarPreview(templateTitulo) || 'Título...'}
                  </h3>
                  <p className="text-lg italic opacity-95 break-words [overflow-wrap:anywhere]">
                    {aplicarPreview(templateMensagem) || 'Mensagem...'}
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTemplateOpen(false)}>Cancelar</Button>
              <Button onClick={salvarTemplate} disabled={savingTemplate}>
                {savingTemplate ? 'Salvando...' : 'Salvar modelo'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default GerenciarNoticiasTotem;
