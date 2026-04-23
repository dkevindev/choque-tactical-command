import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Eye, Megaphone, AlertTriangle, Newspaper, Upload, X, Image as ImageIcon, RefreshCw, Cake } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, orderBy, query, Timestamp, setDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/firebase';
import { toast } from '@/hooks/use-toast';

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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editing, setEditing] = useState<Noticia | null>(null);

  const [tipo, setTipo] = useState<TipoNoticia>('noticia');
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [dataExpiracao, setDataExpiracao] = useState(todayPlusDays(7));
  const [prioridade, setPrioridade] = useState(5);
  const [ativa, setAtiva] = useState(true);
  const [imagemUrl, setImagemUrl] = useState<string>('');
  const [imagemPath, setImagemPath] = useState<string>('');
  const [uploading, setUploading] = useState(false);

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
      // Remover imagem anterior se houver
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
    const userRaw = localStorage.getItem('user');
    const autor = userRaw ? (JSON.parse(userRaw)['NOME DE GUERRA1'] || JSON.parse(userRaw).NOME || 'Sistema') : 'Sistema';
    const expDate = new Date(dataExpiracao + 'T23:59:59');

    const payload: any = {
      tipo,
      titulo: titulo.trim(),
      mensagem: mensagem.trim(),
      autor,
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

  const cfg = tipoConfig[tipo];
  const PreviewIcon = cfg.icon;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          Painel do Totem — Notícias e Determinações
        </CardTitle>
        <div className="flex items-center gap-2">
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
            <Cake className="h-4 w-4 mr-2" /> Atualizar aniversariantes
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

        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogContent className="max-w-2xl">
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

              {/* Upload de imagem */}
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

              {/* Preview */}
              <div>
                <Label>Pré-visualização</Label>
                <div className={`mt-2 rounded-xl bg-gradient-to-br ${cfg.gradient} p-6 text-white shadow-xl`}>
                  <div className="flex items-center gap-2 mb-3">
                    <PreviewIcon className="h-6 w-6" />
                    <Badge className="bg-white/20 text-white border-white/30">{cfg.label}</Badge>
                  </div>
                  <div className={imagemUrl ? 'grid grid-cols-2 gap-4 items-center' : ''}>
                    <div>
                      <h3 className="text-2xl font-bold mb-2">{titulo || 'Título da notícia'}</h3>
                      <p className="text-base opacity-90 whitespace-pre-wrap">{mensagem || 'Mensagem...'}</p>
                    </div>
                    {imagemUrl && (
                      <img src={imagemUrl} alt="" className="rounded-lg max-h-48 w-full object-cover" />
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
      </CardContent>
    </Card>
  );
};

export default GerenciarNoticiasTotem;
