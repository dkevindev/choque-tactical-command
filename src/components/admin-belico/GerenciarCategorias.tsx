import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Folder, 
  Save,
  X
} from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from 'sonner';

interface Categoria {
  id: string;
  nome: string;
  descricao: string;
  cor: string;
  icone: string;
  ativa: boolean;
  totalMateriais: number;
  createdAt: Date;
}

const GerenciarCategorias = () => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    cor: '#1f2937',
    icone: 'Target',
    ativa: true
  });

  const coresDisponiveis = [
    { valor: '#1f2937', nome: 'Cinza Escuro' },
    { valor: '#dc2626', nome: 'Vermelho' },
    { valor: '#ea580c', nome: 'Laranja' },
    { valor: '#ca8a04', nome: 'Amarelo' },
    { valor: '#16a34a', nome: 'Verde' },
    { valor: '#2563eb', nome: 'Azul' },
    { valor: '#9333ea', nome: 'Roxo' },
    { valor: '#ec4899', nome: 'Rosa' }
  ];

  const iconesDisponiveis = [
    'Target', 'Shield', 'Zap', 'Settings', 'Tool', 'Package', 'Star', 'Flag'
  ];

  useEffect(() => {
    loadCategorias();
  }, []);

  const loadCategorias = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'categorias_belicas'));
      const categoriasData = await Promise.all(
        querySnapshot.docs.map(async (docSnap) => {
          const categoria = {
            id: docSnap.id,
            ...docSnap.data(),
            createdAt: docSnap.data().createdAt?.toDate() || new Date()
          } as Categoria;

          // Count materials in this category
          const materiaisQuery = query(
            collection(db, 'materiais_belicos'), 
            where('categoria', '==', categoria.nome)
          );
          const materiaisSnapshot = await getDocs(materiaisQuery);
          categoria.totalMateriais = materiaisSnapshot.size;

          return categoria;
        })
      );
      setCategorias(categoriasData);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      // Mock data for development
      setCategorias([
        {
          id: '1',
          nome: 'Armamento',
          descricao: 'Armas de fogo e equipamentos relacionados',
          cor: '#dc2626',
          icone: 'Target',
          ativa: true,
          totalMateriais: 15,
          createdAt: new Date()
        },
        {
          id: '2',
          nome: 'EPI',
          descricao: 'Equipamentos de Proteção Individual',
          cor: '#16a34a',
          icone: 'Shield',
          ativa: true,
          totalMateriais: 8,
          createdAt: new Date()
        },
        {
          id: '3',
          nome: 'Munição',
          descricao: 'Cartuchos e projéteis',
          cor: '#ca8a04',
          icone: 'Zap',
          ativa: true,
          totalMateriais: 12,
          createdAt: new Date()
        }
      ]);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      cor: '#1f2937',
      icone: 'Target',
      ativa: true
    });
    setEditingCategoria(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.descricao) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const categoriaData = {
        ...formData,
        createdAt: new Date()
      };

      if (editingCategoria) {
        await updateDoc(doc(db, 'categorias_belicas', editingCategoria.id), categoriaData);
        toast.success('Categoria atualizada com sucesso');
      } else {
        await addDoc(collection(db, 'categorias_belicas'), categoriaData);
        toast.success('Categoria criada com sucesso');
      }

      resetForm();
      loadCategorias();
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      toast.error('Erro ao salvar categoria');
    }
  };

  const handleEdit = (categoria: Categoria) => {
    setFormData({
      nome: categoria.nome,
      descricao: categoria.descricao,
      cor: categoria.cor,
      icone: categoria.icone,
      ativa: categoria.ativa
    });
    setEditingCategoria(categoria);
    setShowForm(true);
  };

  const handleDelete = async (categoria: Categoria) => {
    if (categoria.totalMateriais > 0) {
      toast.error('Não é possível excluir categoria com materiais associados');
      return;
    }

    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;

    try {
      await deleteDoc(doc(db, 'categorias_belicas', categoria.id));
      toast.success('Categoria excluída com sucesso');
      loadCategorias();
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      toast.error('Erro ao excluir categoria');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Gerenciar Categorias</h3>
          <p className="text-sm text-muted-foreground">Organize os materiais em categorias</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nova Categoria
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="bg-primary/10 border-primary">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Folder className="h-5 w-5" />
              {editingCategoria ? 'Editar Categoria' : 'Nova Categoria'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nome">Nome da Categoria *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Ex: Armamento"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="icone">Ícone</Label>
                  <select
                    id="icone"
                    value={formData.icone}
                    onChange={(e) => setFormData(prev => ({ ...prev, icone: e.target.value }))}
                    className="w-full p-2 border border-input rounded-md bg-background"
                  >
                    {iconesDisponiveis.map(icone => (
                      <option key={icone} value={icone}>{icone}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="descricao">Descrição *</Label>
                <Input
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descreva o tipo de materiais desta categoria"
                  required
                />
              </div>

              <div>
                <Label>Cor da Categoria</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {coresDisponiveis.map(cor => (
                    <button
                      key={cor.valor}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, cor: cor.valor }))}
                      className={`p-3 rounded border-2 flex items-center justify-center ${
                        formData.cor === cor.valor ? 'border-foreground' : 'border-border'
                      }`}
                      style={{ backgroundColor: cor.valor }}
                    >
                      <span className="text-white font-semibold text-xs">{cor.nome}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  {editingCategoria ? 'Atualizar' : 'Criar'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} className="flex items-center gap-2">
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categorias.map(categoria => (
          <Card key={categoria.id} className="bg-card border-border hover:shadow-tactical transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="p-2 rounded"
                    style={{ backgroundColor: categoria.cor }}
                  >
                    <Folder className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{categoria.nome}</CardTitle>
                    <Badge variant={categoria.ativa ? 'default' : 'secondary'}>
                      {categoria.ativa ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{categoria.descricao}</p>
              
              <div className="flex items-center justify-between mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{categoria.totalMateriais}</p>
                  <p className="text-xs text-muted-foreground">Materiais</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Criada em</p>
                  <p className="text-xs font-medium text-foreground">
                    {categoria.createdAt.toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(categoria)}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(categoria)}
                  className="text-destructive hover:text-destructive"
                  disabled={categoria.totalMateriais > 0}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {categorias.length === 0 && (
        <Card className="bg-card border-border">
          <CardContent className="p-12 text-center">
            <Folder className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhuma categoria encontrada
            </h3>
            <p className="text-muted-foreground mb-6">
              Crie sua primeira categoria para organizar os materiais
            </p>
            <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Criar Primeira Categoria
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GerenciarCategorias;