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
  Search,
  User
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
  policialAssociadoId?: string;
  policialAssociadoNome?: string;
  fabricante?: string;
  modelo?: string;
  observacoes?: string;
  createdAt: Date;
  local: string; // Fortaleza ou Crato
  // Campos específicos para armas
  tipoArma?: string; // Arma Curta ou Arma Longa
  quantidadeCarregadores?: number;
  quantidadeMunicoes?: number;
  calibreMunicao?: string;
  numeroSIARM?: string;
  // Campos específicos para coletes
  termoEntrega?: string;
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
    modelo: '',
    observacoes: '',
    local: 'Fortaleza',
    tamanhoColete: '',
    vencimento: '',
    dataFabricacao: '',
    anosValidade: '',
    sexo: '',
    termoEntrega: '',
    // Campos para cautela
    policialAssociadoId: '',
    policialAssociadoNome: '',
    // Campos específicos para armas
    tipoArma: '',
    quantidadeCarregadores: '',
    quantidadeMunicoes: '',
    calibreMunicao: '',
    numeroSIARM: ''
  });

  const [policiais, setPoliciais] = useState<any[]>([]);
  const [buscaPolicial, setBuscaPolicial] = useState('');

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
    carregarPoliciais();
  }, []);

  const carregarPoliciais = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'policiais'));
      const policiaisData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          nome: data.NOME,
          matricula: data.Matrícula || '',
          patente: data['Post/Grad'],
          numeral: data.NUMERAL || ''
        };
      });
      setPoliciais(policiaisData);
    } catch (error) {
      console.error('Erro ao carregar policiais:', error);
      setPoliciais([]);
    }
  };

  const loadMateriais = async () => {
    try {
      const q = query(collection(db, 'materiais_belicos'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      let materiaisData = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        } as Material))
        .filter((m: any) => !m.transferido); // Excluir materiais transferidos

      // Carregar cautelas ativas para sincronizar status dos materiais
      const cautelasQuery = query(collection(db, 'cautelas_permanentes'));
      const cautelasSnapshot = await getDocs(cautelasQuery);
      const cautelasAtivas = cautelasSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((c: any) => c.status === 'ativa');

      // Criar mapa de materiais cautelados
      const materiaisCautelados = new Map<string, { policialNome: string, policialId: string }>();
      cautelasAtivas.forEach((cautela: any) => {
        if (cautela.materiais && Array.isArray(cautela.materiais)) {
          cautela.materiais.forEach((mat: any) => {
            if (mat.materialId) {
              materiaisCautelados.set(mat.materialId, {
                policialNome: `${cautela.policialPatente} ${cautela.policialNome}`,
                policialId: cautela.policialId
              });
            }
          });
        }
      });

      // Atualizar status dos materiais baseado nas cautelas ativas
      materiaisData = materiaisData.map(material => {
        const cautelaInfo = materiaisCautelados.get(material.id);
        if (cautelaInfo) {
          return {
            ...material,
            cautelado: true,
            disponivel: false,
            policialAssociadoNome: cautelaInfo.policialNome,
            policialAssociadoId: cautelaInfo.policialId
          };
        }
        return material;
      });

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
          local: 'Fortaleza',
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
          local: 'Fortaleza',
          createdAt: new Date()
        },
        {
          id: '3',
          nome: 'Escudo Balístico',
          categoria: 'EPI',
          quantidade: 10,
          disponivel: true,
          fabricante: 'Proteção',
          local: 'Fortaleza',
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
      modelo: '',
      observacoes: '',
      local: 'Fortaleza',
      tamanhoColete: '',
      vencimento: '',
      dataFabricacao: '',
      anosValidade: '',
      sexo: '',
      termoEntrega: '',
      policialAssociadoId: '',
      policialAssociadoNome: '',
      tipoArma: '',
      quantidadeCarregadores: '',
      quantidadeMunicoes: '',
      calibreMunicao: '',
      numeroSIARM: ''
    });
    setBuscaPolicial('');
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

    // Validação para munição e EPI (apenas se NÃO estiver associando a um policial)
    if ((formData.categoria === 'Munição' || formData.categoria === 'EPI') && 
        !formData.policialAssociadoId && 
        !formData.quantidade) {
      toast.error('Quantidade é obrigatória para Munição e EPI que não são cautelados');
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

    // Validação específica para Armamento
    if (formData.categoria === 'Armamento' && !formData.tipoArma) {
      toast.error('Selecione o tipo de arma (Curta ou Longa)');
      return;
    }

    // Validação obrigatória para armamentos
    if (formData.categoria === 'Armamento') {
      if (!formData.calibre) {
        toast.error('Calibre é obrigatório para armamentos');
        return;
      }
      
      // Carregadores e munições são obrigatórios APENAS quando associando a um policial
      if (formData.policialAssociadoId) {
        if (!formData.quantidadeCarregadores || parseInt(formData.quantidadeCarregadores) === 0) {
          toast.error('Quantidade de carregadores é obrigatória ao cautelar um armamento');
          return;
        }
        if (!formData.quantidadeMunicoes || parseInt(formData.quantidadeMunicoes) === 0) {
          toast.error('Quantidade de munições é obrigatória ao cautelar um armamento');
          return;
        }
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

      // Criar objeto base com campos obrigatórios
      const materialDataBase: any = {
        nome: formData.nome || formData.categoria,
        categoria: formData.categoria,
        disponivel: formData.policialAssociadoId ? false : true,
        cautelado: formData.policialAssociadoId ? true : false,
        local: formData.local,
        createdAt: new Date()
      };

      // Adicionar campos opcionais apenas se tiverem valor
      if (formData.subcategoria) materialDataBase.subcategoria = formData.subcategoria;
      if (formData.calibre) materialDataBase.calibre = formData.calibre;
      if (formData.numeroSerie) materialDataBase.numeroSerie = formData.numeroSerie;
      if (formData.quantidade !== '') materialDataBase.quantidade = parseInt(formData.quantidade);
      if (formData.policialAssociadoId) materialDataBase.policialAssociadoId = formData.policialAssociadoId;
      if (formData.policialAssociadoNome) materialDataBase.policialAssociadoNome = formData.policialAssociadoNome;
      if (formData.fabricante) materialDataBase.fabricante = formData.fabricante;
      if (formData.modelo) materialDataBase.modelo = formData.modelo;
      if (formData.observacoes) materialDataBase.observacoes = formData.observacoes;
      if (vencimentoCalculado) materialDataBase.vencimento = vencimentoCalculado;
      if (formData.anosValidade) materialDataBase.anosValidade = parseInt(formData.anosValidade);
      if (formData.tamanhoColete) materialDataBase.tamanhoColete = formData.tamanhoColete;
      if (formData.dataFabricacao) materialDataBase.dataFabricacao = formData.dataFabricacao;
      if (formData.sexo) materialDataBase.sexo = formData.sexo;
      if (formData.termoEntrega) materialDataBase.termoEntrega = formData.termoEntrega;
      if (formData.tipoArma) materialDataBase.tipoArma = formData.tipoArma;
      if (formData.quantidadeCarregadores) materialDataBase.quantidadeCarregadores = parseInt(formData.quantidadeCarregadores);
      if (formData.quantidadeMunicoes) materialDataBase.quantidadeMunicoes = parseInt(formData.quantidadeMunicoes);
      if (formData.calibreMunicao) materialDataBase.calibreMunicao = formData.calibreMunicao;
      if (formData.numeroSIARM) materialDataBase.numeroSIARM = formData.numeroSIARM;

      const materialData = materialDataBase;

      let materialId: string;
      
      if (editingMaterial) {
        await updateDoc(doc(db, 'materiais_belicos', editingMaterial.id), materialData);
        materialId = editingMaterial.id;
        toast.success('Material atualizado com sucesso');
      } else {
        const docRef = await addDoc(collection(db, 'materiais_belicos'), materialData);
        materialId = docRef.id;
        toast.success('Material cadastrado com sucesso');
      }

      // Se foi associado a um policial, criar ou atualizar cautela automaticamente
      if (formData.policialAssociadoId && !editingMaterial) {
        const policial = policiais.find(p => p.id === formData.policialAssociadoId);
        
        // Verificar se já existe uma cautela ativa para este policial
        const cautelasQuery = query(
          collection(db, 'cautelas_permanentes'),
          orderBy('createdAt', 'desc')
        );
        const cautelasSnapshot = await getDocs(cautelasQuery);
        const cautelaExistente = cautelasSnapshot.docs.find(doc => {
          const data = doc.data();
          return data.policialId === formData.policialAssociadoId && data.status === 'ativa';
        });

        // Criar array de materiais para a cautela
        const materiaisParaCautela: any[] = [];
        
        // Item principal (arma/material)
        const itemPrincipal: any = {
          materialId: materialId,
          nome: materialData.nome,
          categoria: materialData.categoria,
          quantidade: 1
        };
        
        // Adicionar campos opcionais apenas se existirem
        if (materialData.numeroSerie) itemPrincipal.numeroSerie = materialData.numeroSerie;
        if (materialData.tamanhoColete) itemPrincipal.tamanhoColete = materialData.tamanhoColete;
        if (materialData.sexo) itemPrincipal.sexo = materialData.sexo;
        if (materialData.fabricante) itemPrincipal.fabricante = materialData.fabricante;
        if (materialData.modelo) itemPrincipal.modelo = materialData.modelo;
        if (materialData.numeroSIARM) itemPrincipal.numeroSIARM = materialData.numeroSIARM;
        
        // Para armamentos, adicionar calibre e quantidades na arma principal
        if (materialData.categoria === 'Armamento') {
          itemPrincipal.calibre = materialData.calibre;
          itemPrincipal.quantidadeCarregadores = parseInt(materialData.quantidadeCarregadores) || 0;
          itemPrincipal.quantidadeMunicoes = parseInt(materialData.quantidadeMunicoes) || 0;
        }
        
        materiaisParaCautela.push(itemPrincipal);
        
        // Se for armamento, adicionar carregadores e munições como itens separados COM DADOS COMPLETOS
        if (materialData.categoria === 'Armamento') {
          if (materialData.quantidadeCarregadores && parseInt(materialData.quantidadeCarregadores) > 0) {
            materiaisParaCautela.push({
              materialId: `${materialId}_carregadores`,
              nome: `Carregadores - ${materialData.nome}`,
              categoria: 'Acessório',
              quantidade: parseInt(materialData.quantidadeCarregadores),
              fabricante: materialData.fabricante || 'N/D',
              modelo: materialData.modelo || 'N/D',
              calibre: materialData.calibre,
              numeroSerie: 'N/D'
            });
          }
          
          if (materialData.quantidadeMunicoes && parseInt(materialData.quantidadeMunicoes) > 0) {
            materiaisParaCautela.push({
              materialId: `${materialId}_municoes`,
              nome: `Munição ${materialData.calibre}`,
              categoria: 'Munição',
              subcategoria: 'Letal',
              quantidade: parseInt(materialData.quantidadeMunicoes),
              calibre: materialData.calibre,
              numeroSerie: 'N/D',
              fabricante: 'N/D'
            });
          }
        }

        if (cautelaExistente) {
          // Atualizar cautela existente adicionando os novos materiais
          const materiaisAtualizados = [...(cautelaExistente.data().materiais || []), ...materiaisParaCautela];
          await updateDoc(doc(db, 'cautelas_permanentes', cautelaExistente.id), {
            materiais: materiaisAtualizados,
            observacoes: formData.observacoes 
              ? `${cautelaExistente.data().observacoes}\n${formData.observacoes}`.trim()
              : cautelaExistente.data().observacoes
          });
          toast.success('Material(is) adicionado(s) à cautela existente do policial');
        } else {
          // Criar nova cautela com numeração
          // Gerar número da cautela - sequência simples
          const querySnapshot = await getDocs(collection(db, 'cautelas_permanentes'));
          const totalCautelas = querySnapshot.size;
          
          // Gerar próximo número
          const proximoNumero = totalCautelas + 1;
          const numeroCautela = String(proximoNumero).padStart(3, '0');
          
          console.log(`Gerando cautela ${numeroCautela} (${totalCautelas} cautelas existentes)`);
          
          const cautelaData = {
            numeroCautela,
            numeroSequencial: proximoNumero,
            policialId: formData.policialAssociadoId,
            policialNome: policial?.nome,
            policialMatricula: policial?.matricula,
            policialPatente: policial?.patente,
            numeral: policial?.numeral,
            materiais: materiaisParaCautela,
            observacoes: formData.observacoes || '',
            status: 'ativa',
            tipoDocumento: 'permanente',
            dataInicio: new Date(),
            createdAt: new Date(),
            createdBy: 'admin'
          };

          await addDoc(collection(db, 'cautelas_permanentes'), cautelaData);
          toast.success(`Cautela ${numeroCautela} criada automaticamente para o policial`);
        }
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
      modelo: material.modelo || '',
      observacoes: material.observacoes || '',
      local: material.local || 'Fortaleza',
      tamanhoColete: (material as any).tamanhoColete || '',
      vencimento: (material as any).vencimento || '',
      dataFabricacao: (material as any).dataFabricacao || '',
      anosValidade: (material as any).anosValidade?.toString() || '',
      sexo: (material as any).sexo || '',
      termoEntrega: (material as any).termoEntrega || '',
      policialAssociadoId: material.policialAssociadoId || '',
      policialAssociadoNome: material.policialAssociadoNome || '',
      tipoArma: material.tipoArma || '',
      quantidadeCarregadores: material.quantidadeCarregadores?.toString() || '',
      quantidadeMunicoes: material.quantidadeMunicoes?.toString() || '',
      calibreMunicao: material.calibreMunicao || '',
      numeroSIARM: material.numeroSIARM || ''
    });
    if (material.policialAssociadoNome) {
      setBuscaPolicial(material.policialAssociadoNome);
    }
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

                <div>
                  <Label htmlFor="local">Local *</Label>
                  <Select value={formData.local} onValueChange={(value) => setFormData(prev => ({ ...prev, local: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o local" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Fortaleza">Fortaleza</SelectItem>
                      <SelectItem value="Crato">Crato</SelectItem>
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

                <div>
                  <Label htmlFor="modelo">Modelo</Label>
                  <Input
                    id="modelo"
                    value={formData.modelo}
                    onChange={(e) => setFormData(prev => ({ ...prev, modelo: e.target.value }))}
                    placeholder="Ex: PT 100, MD2, MD6"
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
                    <div>
                      <Label htmlFor="termoEntrega">Termo de Entrega</Label>
                      <Input
                        id="termoEntrega"
                        value={formData.termoEntrega}
                        onChange={(e) => setFormData(prev => ({ ...prev, termoEntrega: e.target.value }))}
                        placeholder="Ex: Termo 2024/001"
                      />
                    </div>
                    <div>
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

                {/* Campos específicos para Armamento */}
                {formData.categoria === 'Armamento' && (
                  <>
                    <div>
                      <Label htmlFor="tipoArma">Tipo de Arma *</Label>
                      <Select value={formData.tipoArma} onValueChange={(value) => setFormData(prev => ({ ...prev, tipoArma: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Arma Curta">Arma Curta</SelectItem>
                          <SelectItem value="Arma Longa">Arma Longa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="quantidadeCarregadores">
                        Quantidade de Carregadores {formData.policialAssociadoId && '*'}
                        {!formData.policialAssociadoId && ' (Opcional - apenas para cautelas)'}
                      </Label>
                      <Input
                        id="quantidadeCarregadores"
                        type="number"
                        value={formData.quantidadeCarregadores}
                        onChange={(e) => setFormData(prev => ({ ...prev, quantidadeCarregadores: e.target.value }))}
                        placeholder="Ex: 3"
                        min="1"
                        required={!!formData.policialAssociadoId}
                      />
                    </div>
                    <div>
                      <Label htmlFor="quantidadeMunicoes">
                        Quantidade de Munições {formData.policialAssociadoId && '*'}
                        {!formData.policialAssociadoId && ' (Opcional - apenas para cautelas)'}
                      </Label>
                      <Input
                        id="quantidadeMunicoes"
                        type="number"
                        value={formData.quantidadeMunicoes}
                        onChange={(e) => setFormData(prev => ({ ...prev, quantidadeMunicoes: e.target.value }))}
                        placeholder="Ex: 50"
                        min="1"
                        required={!!formData.policialAssociadoId}
                      />
                    </div>
                    <div>
                      <Label htmlFor="calibreMunicao">Calibre da Munição</Label>
                      <Input
                        id="calibreMunicao"
                        value={formData.calibreMunicao}
                        onChange={(e) => setFormData(prev => ({ ...prev, calibreMunicao: e.target.value }))}
                        placeholder="Ex: .40, 9mm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="numeroSIARM">Número da Cautela SIARM</Label>
                      <Input
                        id="numeroSIARM"
                        value={formData.numeroSIARM}
                        onChange={(e) => setFormData(prev => ({ ...prev, numeroSIARM: e.target.value }))}
                        placeholder="Ex: 2024/123"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Seção de Associação ao Policial */}
              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <h4 className="font-semibold text-foreground">Associar ao Policial (Opcional)</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Se este material será cautelado imediatamente a um policial, selecione abaixo. 
                  Caso contrário, ele ficará na reserva de armamento.
                </p>
                
                <div className="space-y-2">
                  <Label htmlFor="buscaPolicial">Buscar Policial</Label>
                  <Input
                    id="buscaPolicial"
                    placeholder="Buscar por nome, matrícula ou numeral..."
                    value={buscaPolicial}
                    onChange={(e) => setBuscaPolicial(e.target.value)}
                  />
                </div>

                {buscaPolicial && (
                  <div className="space-y-2">
                    <Label>Selecionar Policial</Label>
                    <Select 
                      value={formData.policialAssociadoId} 
                      onValueChange={(value) => {
                        const policial = policiais.find(p => p.id === value);
                        setFormData(prev => ({ 
                          ...prev, 
                          policialAssociadoId: value === 'none' ? '' : value,
                          policialAssociadoNome: policial ? `${policial.patente} ${policial.nome}` : ''
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o policial" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum (Reserva de Armamento)</SelectItem>
                        {policiais
                          .filter(p => {
                            const busca = buscaPolicial.toLowerCase();
                            return (
                              p.nome.toLowerCase().includes(busca) ||
                              String(p.matricula).toLowerCase().includes(busca) ||
                              String(p.numeral || '').toLowerCase().includes(busca)
                            );
                          })
                          .map(policial => (
                            <SelectItem key={policial.id} value={policial.id}>
                              {policial.patente} {policial.nome} - Mat: {policial.matricula}
                              {policial.numeral ? ` - ${policial.numeral}` : ''}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.policialAssociadoNome && (
                  <Badge variant="default" className="text-sm">
                    Será cautelado para: {formData.policialAssociadoNome}
                  </Badge>
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

              <div className="flex items-center space-x-2 p-3 rounded-lg border" style={{
                borderColor: formData.disponivel ? '#22c55e' : '#ef4444',
                backgroundColor: formData.disponivel ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'
              }}>
                <Switch
                  id="disponivel"
                  checked={formData.disponivel}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, disponivel: checked }))}
                  className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-600"
                />
                <div className="flex flex-col">
                  <Label htmlFor="disponivel" className="cursor-pointer">
                    Material disponível para cautela
                  </Label>
                  <span className="text-xs" style={{ color: formData.disponivel ? '#22c55e' : '#ef4444' }}>
                    {formData.disponivel ? '✅ Disponível' : '❌ Indisponível'}
                  </span>
                </div>
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
                  <TableHead>Série</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cautelado Para</TableHead>
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
                    <TableCell className="font-mono text-sm">{material.numeroSerie || '-'}</TableCell>
                    <TableCell>
                      {material.cautelado ? (
                        <Badge variant="secondary">Cautelado</Badge>
                      ) : (
                        <Badge variant="default">Reserva</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {material.policialAssociadoNome || '-'}
                    </TableCell>
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