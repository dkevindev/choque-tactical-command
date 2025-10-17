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
  subcategoria?: string; // Para munição: "Letal" ou "IMPO"
  calibre?: string;
  numeroSerie?: string;
  quantidade?: number; // Para munição e EPI
  disponivel: boolean;
  cautelado?: boolean;
  cauteladoPara?: string;
  fabricante?: string;
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
    subcategoria: '',
    calibre: '',
    numeroSerie: '',
    quantidade: '',
    disponivel: true,
    fabricante: '',
    observacoes: '',
    tamanhoColete: '',
    vencimento: '',
    dataFabricacao: '',
    anosValidade: '',
    sexo: ''
  });

  const categorias = [
    'Armamento',
    'Munição',
    'EPI',
    'Colete Balístico',
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
          createdAt: new Date()
        },
        {
          id: '2',
          nome: 'Munição .40',
          categoria: 'Munição',
          subcategoria: 'Letal',
          calibre: '.40',
          quantidade: 500,
          disponivel: true,
          fabricante: 'CBC',
          createdAt: new Date()
        },
        {
          id: '3',
          nome: 'Escudo Balístico',
          categoria: 'EPI',
          quantidade: 10,
          disponivel: true,
          fabricante: 'Proteção',
          createdAt: new Date()
        }
      ]);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      categoria: '',
      subcategoria: '',
      calibre: '',
      numeroSerie: '',
      quantidade: '',
      disponivel: true,
      fabricante: '',
      observacoes: '',
      tamanhoColete: '',
      vencimento: '',
      dataFabricacao: '',
      anosValidade: '',
      sexo: ''
    });
    setEditingMaterial(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação condicional: nome não é obrigatório para Colete Balístico
    if (formData.categoria !== 'Colete Balístico' && !formData.nome) {
      toast.error('Preencha o nome do material');
      return;
    }
    
    if (!formData.categoria) {
      toast.error('Selecione a categoria');
      return;
    }

    // Validação para munição e EPI
    if ((formData.categoria === 'Munição' || formData.categoria === 'EPI') && !formData.quantidade) {
      toast.error('Quantidade é obrigatória para Munição e EPI');
      return;
    }

    if (formData.categoria === 'Munição' && !formData.subcategoria) {
      toast.error('Subcategoria é obrigatória para Munição');
      return;
    }

    // Validação específica para Colete Balístico
    if (formData.categoria === 'Colete Balístico') {
      if (!formData.tamanhoColete || !formData.dataFabricacao || !formData.anosValidade || !formData.sexo) {
        toast.error('Preencha todos os campos obrigatórios do Colete Balístico');
        return;
      }
    }

    try {
      // Calcular vencimento automaticamente para Colete Balístico
      let vencimentoCalculado = formData.vencimento;
      if (formData.categoria === 'Colete Balístico' && formData.dataFabricacao && formData.anosValidade) {
        const dataFab = new Date(formData.dataFabricacao);
        const anosVal = parseInt(formData.anosValidade);
        const dataVencimento = new Date(dataFab);
        dataVencimento.setFullYear(dataVencimento.getFullYear() + anosVal);
        vencimentoCalculado = dataVencimento.toISOString().split('T')[0];
      }

      const materialData = {
        ...formData,
        vencimento: vencimentoCalculado,
        quantidade: formData.quantidade !== '' ? parseInt(formData.quantidade) : null,
        anosValidade: formData.anosValidade ? parseInt(formData.anosValidade) : undefined,
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
      subcategoria: material.subcategoria || '',
      calibre: material.calibre || '',
      numeroSerie: material.numeroSerie || '',
      quantidade: material.quantidade?.toString() || '',
      disponivel: material.disponivel,
      fabricante: material.fabricante || '',
      observacoes: material.observacoes || '',
      tamanhoColete: (material as any).tamanhoColete || '',
      vencimento: (material as any).vencimento || '',
      dataFabricacao: (material as any).dataFabricacao || '',
      anosValidade: (material as any).anosValidade?.toString() || '',
      sexo: (material as any).sexo || ''
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
          <p className="text-sm text-muted-foreground">
            Cadastre armamentos, munições e equipamentos para cautelas permanentes
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowForm(true)} 
            className="flex items-center gap-2"
          >
            <Target className="h-4 w-4" />
            Gerenciar Categorias
          </Button>
          <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Novo Material
          </Button>
        </div>
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
                {formData.categoria !== 'Colete Balístico' && (
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
                )}

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

                {formData.categoria !== 'Colete Balístico' && (
                  <div>
                    <Label htmlFor="calibre">Calibre</Label>
                    <Input
                      id="calibre"
                      value={formData.calibre}
                      onChange={(e) => setFormData(prev => ({ ...prev, calibre: e.target.value }))}
                      placeholder="Ex: .40, 12, 9mm"
                    />
                  </div>
                )}

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

                {/* Subcategoria - apenas para munição */}
                {formData.categoria === 'Munição' && (
                  <div>
                    <Label htmlFor="subcategoria">Subcategoria *</Label>
                    <Select value={formData.subcategoria} onValueChange={(value) => setFormData(prev => ({ ...prev, subcategoria: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a subcategoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Letal">Letal</SelectItem>
                        <SelectItem value="IMPO">IMPO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Quantidade - para munição e EPI */}
                {(formData.categoria === 'Munição' || formData.categoria === 'EPI') && (
                  <div>
                    <Label htmlFor="quantidade">Quantidade *</Label>
                    <Input
                      id="quantidade"
                      type="number"
                      value={formData.quantidade}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantidade: e.target.value }))}
                      placeholder="Ex: 500"
                      min="0"
                    />
                  </div>
                )}

                {/* Campos específicos para Colete Balístico */}
                {formData.categoria === 'Colete Balístico' && (
                  <>
                    <div>
                      <Label htmlFor="tamanhoColete">Tamanho do Colete *</Label>
                      <Select value={formData.tamanhoColete} onValueChange={(value) => setFormData(prev => ({ ...prev, tamanhoColete: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tamanho" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="P">P</SelectItem>
                          <SelectItem value="M">M</SelectItem>
                          <SelectItem value="G">G</SelectItem>
                          <SelectItem value="GG">GG</SelectItem>
                          <SelectItem value="XG">XG</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="sexo">Sexo *</Label>
                      <Select value={formData.sexo} onValueChange={(value) => setFormData(prev => ({ ...prev, sexo: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o sexo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Masculino">Masculino</SelectItem>
                          <SelectItem value="Feminino">Feminino</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="dataFabricacao">Data de Fabricação *</Label>
                      <Input
                        id="dataFabricacao"
                        type="date"
                        value={formData.dataFabricacao}
                        onChange={(e) => setFormData(prev => ({ ...prev, dataFabricacao: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="anosValidade">Anos de Validade *</Label>
                      <Input
                        id="anosValidade"
                        type="number"
                        value={formData.anosValidade}
                        onChange={(e) => setFormData(prev => ({ ...prev, anosValidade: e.target.value }))}
                        placeholder="Ex: 5"
                        min="1"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="vencimento">Vencimento (calculado automaticamente)</Label>
                      <Input
                        id="vencimento"
                        type="date"
                        value={
                          formData.dataFabricacao && formData.anosValidade
                            ? (() => {
                                const dataFab = new Date(formData.dataFabricacao);
                                const anosVal = parseInt(formData.anosValidade);
                                const dataVenc = new Date(dataFab);
                                dataVenc.setFullYear(dataVenc.getFullYear() + anosVal);
                                return dataVenc.toISOString().split('T')[0];
                              })()
                            : ''
                        }
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </>
                )}
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
                  <TableHead>Subcategoria</TableHead>
                  <TableHead>Calibre</TableHead>
                  <TableHead>Série</TableHead>
                  <TableHead>Quantidade</TableHead>
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
                    <TableCell>
                      {material.subcategoria ? (
                        <Badge variant={material.subcategoria === 'Letal' ? 'destructive' : 'secondary'}>
                          {material.subcategoria}
                        </Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell>{material.calibre || '-'}</TableCell>
                    <TableCell className="font-mono text-sm">{material.numeroSerie || '-'}</TableCell>
                    <TableCell>
                      {material.quantidade ? (
                        <Badge variant="outline">{material.quantidade}</Badge>
                      ) : '-'}
                    </TableCell>
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