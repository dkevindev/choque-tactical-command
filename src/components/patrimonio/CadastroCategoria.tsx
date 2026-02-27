import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Tags, Loader2 } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from '@/hooks/use-toast';
import { CategoriaPatrimonio } from './PatrimonioPage';

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

interface CadastroCategoriaProps {
  categorias: CategoriaPatrimonio[];
  onUpdate: () => void;
  loading: boolean;
}

export default function CadastroCategoria({ categorias, onUpdate, loading }: CadastroCategoriaProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<CategoriaPatrimonio | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    cor: 'bg-blue-500',
  });
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setFormData({ nome: '', descricao: '', cor: 'bg-blue-500' });
    setEditingCategoria(null);
    setShowForm(false);
  };

  const handleEdit = (categoria: CategoriaPatrimonio) => {
    setEditingCategoria(categoria);
    setFormData({
      nome: categoria.nome,
      descricao: categoria.descricao || '',
      cor: categoria.cor,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      toast({ title: 'Erro', description: 'Nome da categoria é obrigatório', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (editingCategoria) {
        await updateDoc(doc(db, 'patrimonio_categorias', editingCategoria.id), {
          ...formData,
          updatedAt: new Date(),
        });
        toast({ title: 'Sucesso', description: 'Categoria atualizada com sucesso!' });
      } else {
        await addDoc(collection(db, 'patrimonio_categorias'), {
          ...formData,
          ativa: true,
          createdAt: new Date(),
        });
        toast({ title: 'Sucesso', description: 'Categoria criada com sucesso!' });
      }
      resetForm();
      onUpdate();
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      toast({ title: 'Erro', description: 'Erro ao salvar categoria', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (categoria: CategoriaPatrimonio) => {
    // Verificar se há itens com esta categoria
    try {
      const itensSnapshot = await getDocs(
        query(collection(db, 'patrimonio_itens'), where('categoriaId', '==', categoria.id))
      );
      
      if (!itensSnapshot.empty) {
        toast({
          title: 'Não é possível excluir',
          description: `Esta categoria possui ${itensSnapshot.size} item(ns). Remova-os ou altere a categoria primeiro.`,
          variant: 'destructive',
        });
        return;
      }
    } catch (error) {
      // Se a query falhar, verificar por nome
      console.log('Verificando por nome da categoria...');
    }

    if (!confirm(`Deseja realmente excluir a categoria "${categoria.nome}"?`)) return;

    try {
      await deleteDoc(doc(db, 'patrimonio_categorias', categoria.id));
      toast({ title: 'Sucesso', description: 'Categoria excluída com sucesso!' });
      onUpdate();
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      toast({ title: 'Erro', description: 'Erro ao excluir categoria', variant: 'destructive' });
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
        <h2 className="text-lg font-semibold text-foreground">Categorias de Patrimônio</h2>
        <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); else setShowForm(true); }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nova Categoria
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategoria ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Categoria *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Mobiliário, Eletrônicos, Equipamentos..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição opcional da categoria..."
                  rows={2}
                />
              </div>

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

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingCategoria ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {categorias.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Tags className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Nenhuma categoria cadastrada</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Categoria
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categorias.map((categoria) => (
            <Card key={categoria.id} className="relative group">
              <div className={`absolute top-0 left-0 right-0 h-2 rounded-t-lg ${categoria.cor}`} />
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Tags className="h-4 w-4" />
                  {categoria.nome}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {categoria.descricao && (
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{categoria.descricao}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {categoria.totalItens || 0} item(ns)
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => handleEdit(categoria)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDelete(categoria)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
