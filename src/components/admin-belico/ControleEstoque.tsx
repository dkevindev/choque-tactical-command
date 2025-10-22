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
  transferido?: boolean;
  localTransferencia?: string;
  dataTransferencia?: Date;
  local?: string; // Fortaleza ou Crato
  tipoArma?: string; // Arma Curta ou Arma Longa
}

interface EstatisticasEstoque {
  totalMateriais: number;
  disponiveis: number;
  cautelados: number;
  manutencao: number;
  baixados: number;
  armasCurtas: number;
  armasLongas: number;
  fortaleza: number;
  crato: number;
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
    armasCurtas: 0,
    armasLongas: 0,
    fortaleza: 0,
    crato: 0,
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
      const materiaisData = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          dataUltimaMovimentacao: doc.data().dataUltimaMovimentacao?.toDate()
        } as MaterialEstoque))
        .filter(m => !m.transferido); // Não mostrar materiais transferidos na carga

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
      armasCurtas: materiaisData.filter(m => m.tipoArma === 'Arma Curta').length,
      armasLongas: materiaisData.filter(m => m.tipoArma === 'Arma Longa').length,
      fortaleza: materiaisData.filter(m => m.local === 'Fortaleza').length,
      crato: materiaisData.filter(m => m.local === 'Crato').length,
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
        <h3 className="text-lg font-semibold text-foreground">Controle de Carga</h3>
        <p className="text-sm text-muted-foreground">Visualize o status de todos os materiais bélicos da unidade</p>
      </div>

      {/* Estatísticas Detalhadas */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Estatísticas da Carga
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Status Geral */}
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-sm uppercase tracking-wide">Status Geral</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="font-bold text-foreground">{estatisticas.totalMateriais}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-950/20 rounded">
                  <span className="text-sm text-green-700 dark:text-green-400">Disponíveis</span>
                  <span className="font-bold text-green-700 dark:text-green-400">{estatisticas.disponiveis}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                  <span className="text-sm text-blue-700 dark:text-blue-400">Cautelados</span>
                  <span className="font-bold text-blue-700 dark:text-blue-400">{estatisticas.cautelados}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded">
                  <span className="text-sm text-yellow-700 dark:text-yellow-400">Manutenção</span>
                  <span className="font-bold text-yellow-700 dark:text-yellow-400">{estatisticas.manutencao}</span>
                </div>
              </div>
            </div>

            {/* Armamentos */}
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-sm uppercase tracking-wide">Armamentos</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <span className="text-sm text-muted-foreground">Total Armas</span>
                  <span className="font-bold text-foreground">{estatisticas.armasCurtas + estatisticas.armasLongas}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-purple-50 dark:bg-purple-950/20 rounded">
                  <span className="text-sm text-purple-700 dark:text-purple-400">Armas Curtas</span>
                  <span className="font-bold text-purple-700 dark:text-purple-400">{estatisticas.armasCurtas}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-indigo-50 dark:bg-indigo-950/20 rounded">
                  <span className="text-sm text-indigo-700 dark:text-indigo-400">Armas Longas</span>
                  <span className="font-bold text-indigo-700 dark:text-indigo-400">{estatisticas.armasLongas}</span>
                </div>
              </div>
            </div>

            {/* Localização */}
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-sm uppercase tracking-wide">Localização</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-orange-50 dark:bg-orange-950/20 rounded">
                  <span className="text-sm text-orange-700 dark:text-orange-400">Fortaleza</span>
                  <span className="font-bold text-orange-700 dark:text-orange-400">{estatisticas.fortaleza}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-cyan-50 dark:bg-cyan-950/20 rounded">
                  <span className="text-sm text-cyan-700 dark:text-cyan-400">Crato</span>
                  <span className="font-bold text-cyan-700 dark:text-cyan-400">{estatisticas.crato}</span>
                </div>
              </div>
            </div>

            {/* Por Categoria */}
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-sm uppercase tracking-wide">Por Categoria</h4>
              <div className="space-y-2">
                {Object.entries(estatisticas.porCategoria).slice(0, 4).map(([categoria, dados]) => (
                  <div key={categoria} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span className="text-sm text-muted-foreground truncate">{categoria}</span>
                    <div className="flex gap-2 items-center">
                      <span className="text-xs text-green-600 dark:text-green-400">{dados.disponiveis}</span>
                      <span className="text-xs text-muted-foreground">/</span>
                      <span className="font-bold text-foreground">{dados.total}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
          <CardTitle className="text-foreground">Materiais na Carga</CardTitle>
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