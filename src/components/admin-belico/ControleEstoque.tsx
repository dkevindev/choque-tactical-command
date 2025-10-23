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
  total: {
    armasCurtasReserva: number;
    armasCurtasCauteladas: number;
    armasLongas: number;
    coletesReserva: number;
    coletesCautelados: number;
  };
  fortaleza: {
    armasCurtasReserva: number;
    armasCurtasCauteladas: number;
    armasLongas: number;
    coletesReserva: number;
    coletesCautelados: number;
  };
  crato: {
    armasCurtasReserva: number;
    armasCurtasCauteladas: number;
    armasLongas: number;
    coletesReserva: number;
    coletesCautelados: number;
  };
  porCategoria: Record<string, { total: number; disponiveis: number; cautelados: number }>;
}

const ControleEstoque = () => {
  const [materiais, setMateriais] = useState<MaterialEstoque[]>([]);
  const [estatisticas, setEstatisticas] = useState<EstatisticasEstoque>({
    total: {
      armasCurtasReserva: 0,
      armasCurtasCauteladas: 0,
      armasLongas: 0,
      coletesReserva: 0,
      coletesCautelados: 0
    },
    fortaleza: {
      armasCurtasReserva: 0,
      armasCurtasCauteladas: 0,
      armasLongas: 0,
      coletesReserva: 0,
      coletesCautelados: 0
    },
    crato: {
      armasCurtasReserva: 0,
      armasCurtasCauteladas: 0,
      armasLongas: 0,
      coletesReserva: 0,
      coletesCautelados: 0
    },
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
    // Calcular para TOTAL
    const armasCurtasTotal = materiaisData.filter(m => m.tipoArma === 'Arma Curta');
    const armasLongasTotal = materiaisData.filter(m => m.tipoArma === 'Arma Longa');
    const coletesTotal = materiaisData.filter(m => 
      m.categoria === 'Colete Balístico' || 
      (m.categoria === 'EPI' && m.nome && typeof m.nome === 'string' && m.nome.toLowerCase().includes('colete'))
    );

    // Calcular para FORTALEZA
    const materiaisFortaleza = materiaisData.filter(m => m.local === 'Fortaleza');
    const armasCurtasFortaleza = materiaisFortaleza.filter(m => m.tipoArma === 'Arma Curta');
    const armasLongasFortaleza = materiaisFortaleza.filter(m => m.tipoArma === 'Arma Longa');
    const coletesFortaleza = materiaisFortaleza.filter(m => 
      m.categoria === 'Colete Balístico' || 
      (m.categoria === 'EPI' && m.nome && typeof m.nome === 'string' && m.nome.toLowerCase().includes('colete'))
    );

    // Calcular para CRATO
    const materiaisCrato = materiaisData.filter(m => m.local === 'Crato');
    const armasCurtasCrato = materiaisCrato.filter(m => m.tipoArma === 'Arma Curta');
    const armasLongasCrato = materiaisCrato.filter(m => m.tipoArma === 'Arma Longa');
    const coletesCrato = materiaisCrato.filter(m => 
      m.categoria === 'Colete Balístico' || 
      (m.categoria === 'EPI' && m.nome && typeof m.nome === 'string' && m.nome.toLowerCase().includes('colete'))
    );

    const stats: EstatisticasEstoque = {
      total: {
        armasCurtasReserva: armasCurtasTotal.filter(m => m.disponivel && !m.cautelado).length,
        armasCurtasCauteladas: armasCurtasTotal.filter(m => m.cautelado).length,
        armasLongas: armasLongasTotal.length,
        coletesReserva: coletesTotal.filter(m => m.disponivel && !m.cautelado).length,
        coletesCautelados: coletesTotal.filter(m => m.cautelado).length
      },
      fortaleza: {
        armasCurtasReserva: armasCurtasFortaleza.filter(m => m.disponivel && !m.cautelado).length,
        armasCurtasCauteladas: armasCurtasFortaleza.filter(m => m.cautelado).length,
        armasLongas: armasLongasFortaleza.length,
        coletesReserva: coletesFortaleza.filter(m => m.disponivel && !m.cautelado).length,
        coletesCautelados: coletesFortaleza.filter(m => m.cautelado).length
      },
      crato: {
        armasCurtasReserva: armasCurtasCrato.filter(m => m.disponivel && !m.cautelado).length,
        armasCurtasCauteladas: armasCurtasCrato.filter(m => m.cautelado).length,
        armasLongas: armasLongasCrato.length,
        coletesReserva: coletesCrato.filter(m => m.disponivel && !m.cautelado).length,
        coletesCautelados: coletesCrato.filter(m => m.cautelado).length
      },
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* TOTAL */}
            <div className="space-y-2">
              <h4 className="font-bold text-foreground text-sm uppercase tracking-wide border-b pb-1">TOTAL</h4>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-900">
                  <span className="text-xs font-medium text-green-700 dark:text-green-400">Armas Curtas Reserva</span>
                  <span className="text-lg font-bold text-green-700 dark:text-green-400">{estatisticas.total.armasCurtasReserva}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-900">
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Armas Curtas Cauteladas</span>
                  <span className="text-lg font-bold text-blue-700 dark:text-blue-400">{estatisticas.total.armasCurtasCauteladas}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-purple-50 dark:bg-purple-950/20 rounded border border-purple-200 dark:border-purple-900">
                  <span className="text-xs font-medium text-purple-700 dark:text-purple-400">Armas Longas</span>
                  <span className="text-lg font-bold text-purple-700 dark:text-purple-400">{estatisticas.total.armasLongas}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-200 dark:border-amber-900">
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Coletes Reserva</span>
                  <span className="text-lg font-bold text-amber-700 dark:text-amber-400">{estatisticas.total.coletesReserva}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-orange-50 dark:bg-orange-950/20 rounded border border-orange-200 dark:border-orange-900">
                  <span className="text-xs font-medium text-orange-700 dark:text-orange-400">Coletes Cautelados</span>
                  <span className="text-lg font-bold text-orange-700 dark:text-orange-400">{estatisticas.total.coletesCautelados}</span>
                </div>
              </div>
            </div>

            {/* FORTALEZA */}
            <div className="space-y-2">
              <h4 className="font-bold text-foreground text-sm uppercase tracking-wide border-b pb-1">FORTALEZA</h4>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-900">
                  <span className="text-xs font-medium text-green-700 dark:text-green-400">Armas Curtas Reserva</span>
                  <span className="text-lg font-bold text-green-700 dark:text-green-400">{estatisticas.fortaleza.armasCurtasReserva}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-900">
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Armas Curtas Cauteladas</span>
                  <span className="text-lg font-bold text-blue-700 dark:text-blue-400">{estatisticas.fortaleza.armasCurtasCauteladas}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-purple-50 dark:bg-purple-950/20 rounded border border-purple-200 dark:border-purple-900">
                  <span className="text-xs font-medium text-purple-700 dark:text-purple-400">Armas Longas</span>
                  <span className="text-lg font-bold text-purple-700 dark:text-purple-400">{estatisticas.fortaleza.armasLongas}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-200 dark:border-amber-900">
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Coletes Reserva</span>
                  <span className="text-lg font-bold text-amber-700 dark:text-amber-400">{estatisticas.fortaleza.coletesReserva}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-orange-50 dark:bg-orange-950/20 rounded border border-orange-200 dark:border-orange-900">
                  <span className="text-xs font-medium text-orange-700 dark:text-orange-400">Coletes Cautelados</span>
                  <span className="text-lg font-bold text-orange-700 dark:text-orange-400">{estatisticas.fortaleza.coletesCautelados}</span>
                </div>
              </div>
            </div>

            {/* CRATO */}
            <div className="space-y-2">
              <h4 className="font-bold text-foreground text-sm uppercase tracking-wide border-b pb-1">CRATO</h4>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-900">
                  <span className="text-xs font-medium text-green-700 dark:text-green-400">Armas Curtas Reserva</span>
                  <span className="text-lg font-bold text-green-700 dark:text-green-400">{estatisticas.crato.armasCurtasReserva}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-900">
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Armas Curtas Cauteladas</span>
                  <span className="text-lg font-bold text-blue-700 dark:text-blue-400">{estatisticas.crato.armasCurtasCauteladas}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-purple-50 dark:bg-purple-950/20 rounded border border-purple-200 dark:border-purple-900">
                  <span className="text-xs font-medium text-purple-700 dark:text-purple-400">Armas Longas</span>
                  <span className="text-lg font-bold text-purple-700 dark:text-purple-400">{estatisticas.crato.armasLongas}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-200 dark:border-amber-900">
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Coletes Reserva</span>
                  <span className="text-lg font-bold text-amber-700 dark:text-amber-400">{estatisticas.crato.coletesReserva}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-orange-50 dark:bg-orange-950/20 rounded border border-orange-200 dark:border-orange-900">
                  <span className="text-xs font-medium text-orange-700 dark:text-orange-400">Coletes Cautelados</span>
                  <span className="text-lg font-bold text-orange-700 dark:text-orange-400">{estatisticas.crato.coletesCautelados}</span>
                </div>
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