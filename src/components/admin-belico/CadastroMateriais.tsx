import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Target, 
  Save,
  X,
  Search
} from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from 'sonner';

interface Material {
  id: string;
  nome: string;
  categoria: string;
  calibre?: string;
  numeroSerie?: string;
  disponivel: boolean;
  cautelado?: boolean;
  cauteladoPara?: string;
  fabricante?: string;
  anoFabricacao?: number;
  observacoes?: string;
  createdAt: Date;
}

const CadastroMateriais = () => {
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [filtro, setFiltro] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  const [formData, setFormData] = useState({
    nome: '',
    categoria: '',
    calibre: '',
    numeroSerie: '',
    disponivel: true,
    fabricante: '',
    anoFabricacao: '',
    observacoes: ''
  });

  const categorias = [
    'Armamento',
    'Munição',
    'EPI',
    'Acessório',
    'Equipamento Tático'
  ];

  useEffect(() => {
    loadMateriais();
  }, []);

  const loadMateriais = async () => {
    try {
      const q = query(collection(db, 'materiais_belicos'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const materiaisData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      } as Material));
      setMateriais(materiaisData);
    } catch (error) {
      console.error('Erro ao carregar materiais:', error);
      // Mock data for development
      setMateriais([
        {
          id: '1',
          nome: 'Pistola .40',
          categoria: 'Armamento',
          calibre: '.40',
          numeroSerie: 'BR001',
          disponivel: true,
          fabricante: 'Taurus',
          anoFabricacao: 2020,
          createdAt: new Date()
        },
        {
          id: '2',
          nome: 'Colete Balístico',
          categoria: 'EPI',
          disponivel: true,
          fabricante: 'Proteção',
          anoFabricacao: 2021,
          createdAt: new Date()
        }
      ]);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      categoria: '',
      calibre: '',
      numeroSerie: '',
      disponivel: true,
      fabricante: '',
      anoFabricacao: '',
      observacoes: ''
    });
    setEditingMaterial(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.categoria) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    try {
      const materialData = {
        ...formData,
        anoFabricacao: formData.anoFabricacao ? parseInt(formData.anoFabricacao) : undefined,
        createdAt: new Date()
      };

      if (editingMaterial) {
        await updateDoc(doc(db, 'materiais_belicos', editingMaterial.id), materialData);
        toast.success('Material atualizado com sucesso');
      } else {
        await addDoc(collection(db, 'materiais_belicos'), materialData);
        toast.success('Material cadastrado com sucesso');
      }

      resetForm();
      loadMateriais();
    } catch (error) {
      console.error('Erro ao salvar material:', error);
      toast.error('Erro ao salvar material');
    }
  };

  const handleEdit = (material: Material) => {
    setFormData({
      nome: material.nome,
      categoria: material.categoria,
      calibre: material.calibre || '',
      numeroSerie: material.numeroSerie || '',
      disponivel: material.disponivel,
      fabricante: material.fabricante || '',
      anoFabricacao: material.anoFabricacao?.toString() || '',
      observacoes: material.observacoes || ''
    });
    setEditingMaterial(material);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este material?')) return;

    try {
      await deleteDoc(doc(db, 'materiais_belicos', id));
      toast.success('Material excluído com sucesso');
      loadMateriais();
    } catch (error) {
      console.error('Erro ao excluir material:', error);
      toast.error('Erro ao excluir material');
    }
  };

  const materiaisFiltrados = materiais.filter(material => {
    const matchNome = material.nome?.toLowerCase().includes(filtro.toLowerCase()) || false;
    const matchSerie = material.numeroSerie?.toLowerCase().includes(filtro.toLowerCase()) || false;
    const matchCategoria = categoriaFiltro === 'todas' || categoriaFiltro === '' || material.categoria === categoriaFiltro;
    
    return (matchNome || matchSerie) && matchCategoria;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Cadastro de Materiais Bélicos</h3>
          <p className="text-sm text-muted-foreground">Gerencie armamentos, munições e equipamentos</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Material
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou série..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as categorias</SelectItem>
                {categorias.map(categoria => (
                  <SelectItem key={categoria} value={categoria}>{categoria}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Total: {materiaisFiltrados.length}</Badge>
              <Badge variant="default">
                Disponíveis: {materiaisFiltrados.filter(m => m.disponivel).length}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Modal */}
      {showForm && (
        <Card className="bg-primary/10 border-primary">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Target className="h-5 w-5" />
              {editingMaterial ? 'Editar Material' : 'Novo Material'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nome">Nome do Material *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Ex: Pistola .40"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="categoria">Categoria *</Label>
                  <Select value={formData.categoria} onValueChange={(value) => setFormData(prev => ({ ...prev, categoria: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map(categoria => (
                        <SelectItem key={categoria} value={categoria}>{categoria}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="calibre">Calibre</Label>
                  <Input
                    id="calibre"
                    value={formData.calibre}
                    onChange={(e) => setFormData(prev => ({ ...prev, calibre: e.target.value }))}
                    placeholder="Ex: .40, 12, 9mm"
                  />
                </div>

                <div>
                  <Label htmlFor="numeroSerie">Número de Série</Label>
                  <Input
                    id="numeroSerie"
                    value={formData.numeroSerie}
                    onChange={(e) => setFormData(prev => ({ ...prev, numeroSerie: e.target.value }))}
                    placeholder="Ex: BR001234"
                  />
                </div>

                <div>
                  <Label htmlFor="fabricante">Fabricante</Label>
                  <Input
                    id="fabricante"
                    value={formData.fabricante}
                    onChange={(e) => setFormData(prev => ({ ...prev, fabricante: e.target.value }))}
                    placeholder="Ex: Taurus, CBC"
                  />
                </div>

                <div>
                  <Label htmlFor="anoFabricacao">Ano de Fabricação</Label>
                  <Input
                    id="anoFabricacao"
                    type="number"
                    value={formData.anoFabricacao}
                    onChange={(e) => setFormData(prev => ({ ...prev, anoFabricacao: e.target.value }))}
                    placeholder="Ex: 2020"
                    min="1900"
                    max={new Date().getFullYear()}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Input
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                  placeholder="Observações adicionais..."
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="disponivel"
                  checked={formData.disponivel}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, disponivel: checked }))}
                />
                <Label htmlFor="disponivel">Material disponível para cautela</Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  {editingMaterial ? 'Atualizar' : 'Cadastrar'}
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

      {/* Materials Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Materiais Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Calibre</TableHead>
                  <TableHead>Série</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fabricante</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materiaisFiltrados.map(material => (
                  <TableRow key={material.id}>
                    <TableCell className="font-medium">{material.nome}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{material.categoria}</Badge>
                    </TableCell>
                    <TableCell>{material.calibre || '-'}</TableCell>
                    <TableCell className="font-mono text-sm">{material.numeroSerie || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={material.disponivel ? 'default' : 'secondary'}>
                        {material.disponivel ? 'Disponível' : 'Indisponível'}
                      </Badge>
                    </TableCell>
                    <TableCell>{material.fabricante || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(material)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(material.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CadastroMateriais;