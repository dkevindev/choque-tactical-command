import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Package, 
  AlertTriangle, 
  CheckCircle, 
  Search,
  BarChart3,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';

interface MaterialEstoque {
  id: string;
  nome: string;
  categoria: string;
  numeroSerie?: string;
  disponivel: boolean;
  cautelado: boolean;
  cauteladoPara?: string;
  dataUltimaMovimentacao?: Date;
  statusManutencao?: 'ok' | 'manutencao' | 'baixa';
  observacoes?: string;
}

interface EstatisticasEstoque {
  totalMateriais: number;
  disponiveis: number;
  cautelados: number;
  manutencao: number;
  baixados: number;
  porCategoria: Record<string, { total: number; disponiveis: number; cautelados: number }>;
}

const ControleEstoque = () => {
  const [materiais, setMateriais] = useState<MaterialEstoque[]>([]);
  const [estatisticas, setEstatisticas] = useState<EstatisticasEstoque>({
    totalMateriais: 0,
    disponiveis: 0,
    cautelados: 0,
    manutencao: 0,
    baixados: 0,
    porCategoria: {}
  });
  const [filtro, setFiltro] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  const [statusFiltro, setStatusFiltro] = useState('todos');

  useEffect(() => {
    loadDadosEstoque();
  }, []);

  const loadDadosEstoque = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'materiais_belicos'));
      const materiaisData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dataUltimaMovimentacao: doc.data().dataUltimaMovimentacao?.toDate()
      } as MaterialEstoque));

      setMateriais(materiaisData);
      calcularEstatisticas(materiaisData);
    } catch (error) {
      console.error('Erro ao carregar dados do estoque:', error);
      // Mock data for development
      const mockMateriais: MaterialEstoque[] = [
        {
          id: '1',
          nome: 'Pistola .40 - BR001',
          categoria: 'Armamento',
          numeroSerie: 'BR001',
          disponivel: true,
          cautelado: false,
          statusManutencao: 'ok'
        },
        {
          id: '2',
          nome: 'Pistola .40 - BR002',
          categoria: 'Armamento',
          numeroSerie: 'BR002',
          disponivel: false,
          cautelado: true,
          cauteladoPara: 'Cb. Silva',
          statusManutencao: 'ok'
        },
        {
          id: '3',
          nome: 'Colete Balístico - CB001',
          categoria: 'EPI',
          numeroSerie: 'CB001',
          disponivel: true,
          cautelado: false,
          statusManutencao: 'ok'
        },
        {
          id: '4',
          nome: 'Espingarda 12 - ES001',
          categoria: 'Armamento',
          numeroSerie: 'ES001',
          disponivel: false,
          cautelado: false,
          statusManutencao: 'manutencao'
        }
      ];
      setMateriais(mockMateriais);
      calcularEstatisticas(mockMateriais);
    }
  };

  const calcularEstatisticas = (materiaisData: MaterialEstoque[]) => {
    const stats: EstatisticasEstoque = {
      totalMateriais: materiaisData.length,
      disponiveis: materiaisData.filter(m => m.disponivel && !m.cautelado).length,
      cautelados: materiaisData.filter(m => m.cautelado).length,
      manutencao: materiaisData.filter(m => m.statusManutencao === 'manutencao').length,
      baixados: materiaisData.filter(m => m.statusManutencao === 'baixa').length,
      porCategoria: {}
    };

    // Calculate by category
    const categorias = [...new Set(materiaisData.map(m => m.categoria))];
    categorias.forEach(categoria => {
      const materiaisCategoria = materiaisData.filter(m => m.categoria === categoria);
      stats.porCategoria[categoria] = {
        total: materiaisCategoria.length,
        disponiveis: materiaisCategoria.filter(m => m.disponivel && !m.cautelado).length,
        cautelados: materiaisCategoria.filter(m => m.cautelado).length
      };
    });

    setEstatisticas(stats);
  };

  const getStatusBadge = (material: MaterialEstoque) => {
    if (material.statusManutencao === 'baixa') {
      return <Badge variant="destructive">Baixado</Badge>;
    }
    if (material.statusManutencao === 'manutencao') {
      return <Badge variant="secondary">Manutenção</Badge>;
    }
    if (material.cautelado) {
      return <Badge variant="outline">Cautelado</Badge>;
    }
    if (material.disponivel) {
      return <Badge variant="default">Disponível</Badge>;
    }
    return <Badge variant="secondary">Indisponível</Badge>;
  };

  const materiaisFiltrados = materiais.filter(material => {
    const matchNome = material.nome?.toLowerCase().includes(filtro.toLowerCase()) || false;
    const matchSerie = material.numeroSerie?.toLowerCase().includes(filtro.toLowerCase()) || false;
    const matchCategoria = categoriaFiltro === 'todas' || categoriaFiltro === '' || material.categoria === categoriaFiltro;
    
    let matchStatus = true;
    if (statusFiltro === 'disponivel') matchStatus = material.disponivel && !material.cautelado;
    else if (statusFiltro === 'cautelado') matchStatus = material.cautelado;
    else if (statusFiltro === 'manutencao') matchStatus = material.statusManutencao === 'manutencao';
    else if (statusFiltro === 'baixado') matchStatus = material.statusManutencao === 'baixa';
    else if (statusFiltro === 'todos' || statusFiltro === '') matchStatus = true;
    
    return (matchNome || matchSerie) && matchCategoria && matchStatus;
  });

  const categorias = [...new Set(materiais.map(m => m.categoria))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-foreground">Controle de Estoque</h3>
        <p className="text-sm text-muted-foreground">Visualize o status de todos os materiais bélicos</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <Package className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{estatisticas.totalMateriais}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{estatisticas.disponiveis}</p>
            <p className="text-xs text-muted-foreground">Disponíveis</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{estatisticas.cautelados}</p>
            <p className="text-xs text-muted-foreground">Cautelados</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{estatisticas.manutencao}</p>
            <p className="text-xs text-muted-foreground">Manutenção</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <TrendingDown className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{estatisticas.baixados}</p>
            <p className="text-xs text-muted-foreground">Baixados</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Statistics */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Estatísticas por Categoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(estatisticas.porCategoria).map(([categoria, dados]) => (
              <div key={categoria} className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">{categoria}</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-medium text-foreground">{dados.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Disponíveis:</span>
                    <span className="font-medium text-green-600">{dados.disponiveis}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cautelados:</span>
                    <span className="font-medium text-blue-600">{dados.cautelados}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${(dados.disponiveis / dados.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar material..."
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

            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="disponivel">Disponível</SelectItem>
                <SelectItem value="cautelado">Cautelado</SelectItem>
                <SelectItem value="manutencao">Manutenção</SelectItem>
                <SelectItem value="baixado">Baixado</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Badge variant="outline">
                Exibindo: {materiaisFiltrados.length} de {materiais.length}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Materials Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Materiais em Estoque</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Série</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cautelado Para</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materiaisFiltrados.map(material => (
                  <TableRow key={material.id}>
                    <TableCell className="font-medium">{material.nome}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{material.categoria}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {material.numeroSerie || '-'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(material)}
                    </TableCell>
                    <TableCell>
                      {material.cauteladoPara || '-'}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {material.observacoes || '-'}
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

export default ControleEstoque;