import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Filter, Calendar, FileText, DollarSign, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import ModalEditarOS from './ModalEditarOS';

interface OrdemServico {
  id: string;
  numeroOS: string;
  placaViatura: string;
  modeloViatura: string;
  dataOS: string;
  valorOS: string;
  observacao: string;
  oficinaResponsavel: string;
  dataCriacao: any;
  saldoId?: string;
}

interface SaldoOficina {
  id: string;
  mes: number;
  ano: number;
  valorInicial: number;
  valorUtilizado: number;
  valorRestante: number;
}

const OrdensServicoPage = () => {
  const [ordensServico, setOrdensServico] = useState<OrdemServico[]>([]);
  const [ordensFiltered, setOrdensFiltered] = useState<OrdemServico[]>([]);
  const [filtros, setFiltros] = useState({
    numeroOS: '',
    placa: '',
    mes: '',
    tipoServico: '',
    oficina: ''
  });
  const [loading, setLoading] = useState(true);
  
  // Modal de edição
  const [modalEditar, setModalEditar] = useState(false);
  const [osParaEditar, setOsParaEditar] = useState<OrdemServico | null>(null);
  
  // Cota do mês selecionado
  const [cotaMes, setCotaMes] = useState<number>(new Date().getMonth());
  const [cotaAno, setCotaAno] = useState<number>(new Date().getFullYear());
  const [cotaValor, setCotaValor] = useState<SaldoOficina | null>(null);
  const [loadingCota, setLoadingCota] = useState(false);

  useEffect(() => {
    fetchOrdensServico();
  }, []);

  useEffect(() => {
    fetchCotaMes();
  }, [cotaMes, cotaAno]);

  useEffect(() => {
    aplicarFiltros();
  }, [filtros, ordensServico]);

  const fetchCotaMes = async () => {
    try {
      setLoadingCota(true);
      
      // Primeiro tenta buscar da coleção saldoOficina (específica por mês)
      const saldosSnap = await getDocs(
        query(
          collection(db, 'saldoOficina'),
          where('mes', '==', cotaMes + 1),
          where('ano', '==', cotaAno)
        )
      );

      if (!saldosSnap.empty) {
        const saldoData = saldosSnap.docs[0].data();
        setCotaValor({
          id: saldosSnap.docs[0].id,
          mes: saldoData.mes,
          ano: saldoData.ano,
          valorInicial: saldoData.valorInicial || 0,
          valorUtilizado: saldoData.valorUtilizado || 0,
          valorRestante: saldoData.valorRestante || saldoData.valorInicial || 0
        });
      } else {
        // Se não encontrou, busca da configuração de saldos (frota_leve)
        const configSnap = await getDocs(collection(db, 'saldos_config'));
        const frotaLeveConfig = configSnap.docs.find(doc => doc.data().tipo === 'frota_leve');
        
        if (frotaLeveConfig) {
          const configData = frotaLeveConfig.data();
          setCotaValor({
            id: frotaLeveConfig.id,
            mes: cotaMes + 1,
            ano: cotaAno,
            valorInicial: configData.saldoMensal || 0,
            valorUtilizado: 0,
            valorRestante: configData.saldoMensal || 0
          });
        } else {
          setCotaValor(null);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar cota:', error);
      setCotaValor(null);
    } finally {
      setLoadingCota(false);
    }
  };

  const handleMesAnterior = () => {
    if (cotaMes === 0) {
      setCotaMes(11);
      setCotaAno(cotaAno - 1);
    } else {
      setCotaMes(cotaMes - 1);
    }
  };

  const handleProximoMes = () => {
    if (cotaMes === 11) {
      setCotaMes(0);
      setCotaAno(cotaAno + 1);
    } else {
      setCotaMes(cotaMes + 1);
    }
  };

  const getNomeMes = (mes: number) => {
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return meses[mes];
  };

  const fetchOrdensServico = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'ordensDeServico'));
      const osData: OrdemServico[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as OrdemServico[];
      
      // Ordenar por data mais recente
      const osSorted = osData.sort((a, b) => 
        new Date(b.dataOS).getTime() - new Date(a.dataOS).getTime()
      );
      
      setOrdensServico(osSorted);
    } catch (error) {
      console.error('Erro ao buscar ordens de serviço:', error);
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    let ordens = [...ordensServico];

    if (filtros.numeroOS) {
      ordens = ordens.filter(os => 
        (os.numeroOS || '').toLowerCase().includes(filtros.numeroOS.toLowerCase())
      );
    }

    if (filtros.placa) {
      ordens = ordens.filter(os => 
        (os.placaViatura || '').toLowerCase().includes(filtros.placa.toLowerCase())
      );
    }

    if (filtros.mes) {
      ordens = ordens.filter(os => {
        const dataOS = new Date(os.dataOS);
        const mesAno = `${dataOS.getFullYear()}-${String(dataOS.getMonth() + 1).padStart(2, '0')}`;
        return mesAno === filtros.mes;
      });
    }

    if (filtros.tipoServico) {
      ordens = ordens.filter(os => 
        (os.observacao || '').toLowerCase().includes(filtros.tipoServico.toLowerCase())
      );
    }

    if (filtros.oficina) {
      ordens = ordens.filter(os => 
        (os.oficinaResponsavel || '').toLowerCase().includes(filtros.oficina.toLowerCase())
      );
    }

    setOrdensFiltered(ordens);
  };

  const limparFiltros = () => {
    setFiltros({
      numeroOS: '',
      placa: '',
      mes: '',
      tipoServico: '',
      oficina: ''
    });
  };

  const getTipoServico = (observacao: string | undefined) => {
    const obs = (observacao || '').toLowerCase();
    if (obs.includes('óleo') || obs.includes('oleo')) return 'MANUTENÇÃO';
    if (obs.includes('pneu') || obs.includes('roda')) return 'PNEUS';
    if (obs.includes('farol') || obs.includes('luz')) return 'ELÉTRICA';
    if (obs.includes('motor') || obs.includes('correia')) return 'MOTOR';
    if (obs.includes('freio') || obs.includes('pastilha')) return 'FREIOS';
    return 'OUTROS';
  };

  const getValorNumerico = (valorStr: string) => {
    return parseFloat(valorStr.replace(/[R$.,\s]/g, '')) || 0;
  };

  const totalGasto = ordensFiltered.reduce((total, os) => 
    total + getValorNumerico(os.valorOS), 0
  );

  if (loading) {
    return (
      <Card className="bg-card border-border shadow-tactical">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Carregando ordens de serviço...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border shadow-tactical">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5" />
              GESTÃO DE ORDENS DE SERVIÇO (OS's)
            </CardTitle>
            
            {/* Cota do Mês */}
            <div className="flex items-center gap-3 bg-muted/50 rounded-lg px-4 py-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={handleMesAnterior}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="text-center min-w-[140px]">
                <div className="text-xs text-muted-foreground uppercase">Cota do Mês</div>
                <div className="font-semibold text-sm">{getNomeMes(cotaMes)} {cotaAno}</div>
              </div>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={handleProximoMes}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <div className="border-l pl-3 ml-1">
                {loadingCota ? (
                  <div className="text-sm text-muted-foreground">Carregando...</div>
                ) : cotaValor ? (
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Restante / Total</div>
                    <div className="font-bold text-sm">
                      <span className={cotaValor.valorRestante < 0 ? 'text-destructive' : 'text-green-600'}>
                        R$ {cotaValor.valorRestante.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-muted-foreground font-normal">
                        {' / R$ '}{cotaValor.valorInicial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Sem cota definida</div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Número da OS
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Digite o número da OS..."
                    value={filtros.numeroOS}
                    onChange={(e) => setFiltros(prev => ({ ...prev, numeroOS: e.target.value }))}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Placa da Viatura
                </label>
                <Input
                  placeholder="Digite a placa..."
                  value={filtros.placa}
                  onChange={(e) => setFiltros(prev => ({ ...prev, placa: e.target.value }))}
                />
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Mês/Ano
                </label>
                <Input
                  type="month"
                  value={filtros.mes}
                  onChange={(e) => setFiltros(prev => ({ ...prev, mes: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Tipo de Serviço
                </label>
                <Input
                  placeholder="Ex: óleo, pneu, farol..."
                  value={filtros.tipoServico}
                  onChange={(e) => setFiltros(prev => ({ ...prev, tipoServico: e.target.value }))}
                />
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Oficina
                </label>
                <Input
                  placeholder="Nome da oficina..."
                  value={filtros.oficina}
                  onChange={(e) => setFiltros(prev => ({ ...prev, oficina: e.target.value }))}
                />
              </div>

              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={limparFiltros}
                  className="mb-0"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </div>


          {/* Tabela */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº OS</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Viatura</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Oficina</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordensFiltered.map((os) => (
                  <TableRow key={os.id}>
                    <TableCell className="font-medium">{os.numeroOS}</TableCell>
                    <TableCell>
                      {new Date(os.dataOS).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="font-medium">{os.modeloViatura}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{os.placaViatura}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{getTipoServico(os.observacao)}</Badge>
                    </TableCell>
                    <TableCell className="font-medium text-green-600">
                      {os.valorOS}
                    </TableCell>
                    <TableCell>{os.oficinaResponsavel}</TableCell>
                    <TableCell className="max-w-md truncate" title={os.observacao}>
                      {os.observacao}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setOsParaEditar(os);
                          setModalEditar(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {ordensFiltered.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma ordem de serviço encontrada com os filtros aplicados.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Edição */}
      {osParaEditar && (
        <ModalEditarOS
          open={modalEditar}
          onClose={() => {
            setModalEditar(false);
            setOsParaEditar(null);
          }}
          os={osParaEditar}
          onSalvar={() => {
            fetchOrdensServico();
          }}
        />
      )}
    </div>
  );
};

export default OrdensServicoPage;