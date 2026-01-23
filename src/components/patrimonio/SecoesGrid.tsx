import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Package, Building2, Loader2 } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from '@/hooks/use-toast';
import { Secao, ItemPatrimonio, CategoriaPatrimonio } from './PatrimonioPage';
import SecaoDetalhes from './SecaoDetalhes';

const CORES_DISPONIVEIS = [
  { nome: 'Azul', valor: 'bg-blue-500' },
  { nome: 'Verde', valor: 'bg-green-500' },
  { nome: 'Vermelho', valor: 'bg-red-500' },
  { nome: 'Amarelo', valor: 'bg-yellow-500' },
  { nome: 'Roxo', valor: 'bg-purple-500' },
  { nome: 'Rosa', valor: 'bg-pink-500' },
  { nome: 'Laranja', valor: 'bg-orange-500' },
  { nome: 'Ciano', valor: 'bg-cyan-500' },
  { nome: 'Índigo', valor: 'bg-indigo-500' },
  { nome: 'Cinza', valor: 'bg-gray-500' },
];

const ICONES_DISPONIVEIS = [
  { nome: 'Prédio', valor: 'building' },
  { nome: 'Casa', valor: 'home' },
  { nome: 'Escritório', valor: 'briefcase' },
  { nome: 'Arquivo', valor: 'archive' },
  { nome: 'Pasta', valor: 'folder' },
  { nome: 'Estrela', valor: 'star' },
  { nome: 'Escudo', valor: 'shield' },
  { nome: 'Usuários', valor: 'users' },
];

interface SecoesGridProps {
  secoes: Secao[];
  itens: ItemPatrimonio[];
  categorias: CategoriaPatrimonio[];
  onUpdate: () => void;
  loading: boolean;
}

export default function SecoesGrid({ secoes, itens, categorias, onUpdate, loading }: SecoesGridProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingSecao, setEditingSecao] = useState<Secao | null>(null);
  const [selectedSecao, setSelectedSecao] = useState<Secao | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    cor: 'bg-blue-500',
    icone: 'building',
  });
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setFormData({ nome: '', descricao: '', cor: 'bg-blue-500', icone: 'building' });
    setEditingSecao(null);
    setShowForm(false);
  };

  const handleEdit = (secao: Secao) => {
    setEditingSecao(secao);
    setFormData({
      nome: secao.nome,
      descricao: secao.descricao || '',
      cor: secao.cor,
      icone: secao.icone,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      toast({ title: 'Erro', description: 'Nome da seção é obrigatório', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (editingSecao) {
        await updateDoc(doc(db, 'patrimonio_secoes', editingSecao.id), {
          ...formData,
          updatedAt: new Date(),
        });
        toast({ title: 'Sucesso', description: 'Seção atualizada com sucesso!' });
      } else {
        await addDoc(collection(db, 'patrimonio_secoes'), {
          ...formData,
          ativa: true,
          createdAt: new Date(),
        });
        toast({ title: 'Sucesso', description: 'Seção criada com sucesso!' });
      }
      resetForm();
      onUpdate();
    } catch (error) {
      console.error('Erro ao salvar seção:', error);
      toast({ title: 'Erro', description: 'Erro ao salvar seção', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (secao: Secao) => {
    const itensNaSecao = itens.filter(item => item.secaoId === secao.id);
    if (itensNaSecao.length > 0) {
      toast({
        title: 'Não é possível excluir',
        description: `Esta seção possui ${itensNaSecao.length} item(ns). Remova-os primeiro.`,
        variant: 'destructive',
      });
      return;
    }

    if (!confirm(`Deseja realmente excluir a seção "${secao.nome}"?`)) return;

    try {
      await deleteDoc(doc(db, 'patrimonio_secoes', secao.id));
      toast({ title: 'Sucesso', description: 'Seção excluída com sucesso!' });
      onUpdate();
    } catch (error) {
      console.error('Erro ao excluir seção:', error);
      toast({ title: 'Erro', description: 'Erro ao excluir seção', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Seções do Quartel</h2>
        <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); else setShowForm(true); }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nova Seção
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSecao ? 'Editar Seção' : 'Nova Seção'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Seção *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Rol, Dojô, P1, Sala do Comandante..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição opcional da seção..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <Select value={formData.cor} onValueChange={(v) => setFormData({ ...formData, cor: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CORES_DISPONIVEIS.map((cor) => (
                        <SelectItem key={cor.valor} value={cor.valor}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded ${cor.valor}`} />
                            {cor.nome}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Ícone</Label>
                  <Select value={formData.icone} onValueChange={(v) => setFormData({ ...formData, icone: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ICONES_DISPONIVEIS.map((icone) => (
                        <SelectItem key={icone.valor} value={icone.valor}>
                          {icone.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingSecao ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {secoes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Nenhuma seção cadastrada</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Seção
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {secoes.map((secao) => (
            <Card
              key={secao.id}
              className="cursor-pointer hover:shadow-lg transition-shadow group relative"
              onClick={() => setSelectedSecao(secao)}
            >
              <div className={`absolute top-0 left-0 right-0 h-2 rounded-t-lg ${secao.cor}`} />
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm font-medium truncate">{secao.nome}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Package className="h-4 w-4" />
                    <span className="text-sm font-semibold">{secao.totalItens || 0}</span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); handleEdit(secao); }}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={(e) => { e.stopPropagation(); handleDelete(secao); }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Card para adicionar nova seção */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow border-dashed flex items-center justify-center min-h-[100px]"
            onClick={() => setShowForm(true)}
          >
            <CardContent className="flex flex-col items-center py-4">
              <Plus className="h-8 w-8 text-muted-foreground mb-1" />
              <span className="text-xs text-muted-foreground">Nova Seção</span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de detalhes da seção */}
      {selectedSecao && (
        <SecaoDetalhes
          secao={selectedSecao}
          itens={itens.filter(item => item.secaoId === selectedSecao.id)}
          categorias={categorias}
          secoes={secoes}
          onClose={() => setSelectedSecao(null)}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
}
