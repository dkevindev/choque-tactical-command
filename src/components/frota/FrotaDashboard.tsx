
import { useEffect, useState, useMemo } from 'react';
import { collection, getDocs, getDoc, query, where, orderBy, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Car,
  Fuel,
  Wrench,
  AlertTriangle,
  Calendar,
  DollarSign,
  Settings,
  Eye,
  RefreshCw,
  User,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import ModalDetalhesViatura from '@/components/ModalDetalhesViatura';
import GestaoSaldos from './GestaoSaldos';
import { Viatura } from '@/bot/types';
import { isFroteLeve, isFrotePesada, limparCacheViaturas } from '@/lib/viaturaUtils';
import AtualizarKmOleoDialog from '../gestao-pessoas/AtualizarKmOleoDialog';
import ModalCadastroViatura from './ModalCadastroViatura';
import { Plus } from 'lucide-react';

interface OrdemServico {
  id: string;
  cadastroViatura: string;
  placaViatura: string;
  modeloViatura: string;
  numeroOS: string;
  dataOS: string;
  valorOS: string;
  observacao: string;
  oficinaResponsavel: string;
  tipoFrota: string;
}

const FrotaDashboard = () => {
  const [viaturas, setViaturas] = useState<Viatura[]>([]);
  const [ordensServico, setOrdensServico] = useState<OrdemServico[]>([]);
  const [gastosMes, setGastosMes] = useState<any[]>([]);
  const [gastos12Meses, setGastos12Meses] = useState<any[]>([]);
  const [selectedViatura, setSelectedViatura] = useState<string | null>(null);
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
  const [viaturaDetalhes, setViaturaDetalhes] = useState<Viatura | null>(null);
  const [gestaoSaldosAberto, setGestaoSaldosAberto] = useState(false);
  const [configSaldos, setConfigSaldos] = useState({
    limiteMes: 5000,
    limite12Meses: 50000
  });
  const [isUpdatingSaldos, setIsUpdatingSaldos] = useState(false);
  const [gastoFroteLeveMes, setGastoFroteLeveMes] = useState(0);
  const [saldoFroteLeveMes, setSaldoFroteLeveMes] = useState(0);
  const [gastoFrotePesadaMes, setGastoFrotePesadaMes] = useState(0);
  const [totalOSMes, setTotalOSMes] = useState(0);
  const [kmDialogOpen, setKmDialogOpen] = useState(false);
  const [cadastroViaturaOpen, setCadastroViaturaOpen] = useState(false);
  const [avariasNaoVisualizadas, setAvariasNaoVisualizadas] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchViaturas();
    fetchOrdensServico();
  }, []);

  useEffect(() => {
    if (ordensServico.length > 0) {
      processarGastos();
      calcularMetricasDashboard();
    }
  }, [ordensServico, viaturas]);

  const fetchViaturas = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'frota'));
      const viaturasData: Viatura[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Viatura[];

      const ordenCustomizada = ['CAV - 11', 'CAV - 12', 'CAV - 13', 'CAV - 05', 'CAV - 06', 'TA - 01', 'TA - 02', 'TA - 03', 'TP'];

      const viaturasOrdenadas = viaturasData.sort((a, b) => {
        const cadastroA = String(a.CADASTRO || a.id || '');
        const cadastroB = String(b.CADASTRO || b.id || '');
        const indexA = ordenCustomizada.indexOf(cadastroA);
        const indexB = ordenCustomizada.indexOf(cadastroB);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return cadastroA.localeCompare(cadastroB);
      });
      
      setViaturas(viaturasOrdenadas);
    } catch (error) {
      console.error('Erro ao buscar viaturas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar viaturas. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const fetchOrdensServico = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'ordensDeServico'));
      const osData: OrdemServico[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as OrdemServico[];
      setOrdensServico(osData);
    } catch (error) {
      console.error('Erro ao buscar ordens de serviço:', error);
    }
  };

  const calcularMetricasDashboard = async () => {
    const agora = new Date();
    const mesAtual = agora.getMonth();
    const anoAtual = agora.getFullYear();

    try {
      // Usar viaturas do estado em vez de buscar novamente
      const viaturasLeves = viaturas.filter(v => v.tipo === 'leve');
      const viaturasPesadas = viaturas.filter(v => v.tipo === 'pesada');

      const placasFroteLeve = viaturasLeves.map(v => v.PLACA);
      const cadastrosFroteLeve = viaturasLeves.map(v => v.CADASTRO);
      const placasFrotePesada = viaturasPesadas.map(v => v.PLACA);
      const cadastrosFrotePesada = viaturasPesadas.map(v => v.CADASTRO);

      // Filtrar OS do mês atual
      const osDoMes = ordensServico.filter(os => {
        const dataOS = new Date(os.dataOS);
        return dataOS.getMonth() === mesAtual && dataOS.getFullYear() === anoAtual;
      });

      // Calcular gasto frota leve no mês
      const gastoLeve = osDoMes
        .filter(os => placasFroteLeve.includes(os.placaViatura) || cadastrosFroteLeve.includes(os.cadastroViatura))
        .reduce((total, os) => {
          const valor = parseFloat(os.valorOS.replace(/[R$.,\s]/g, '')) / 100;
          return total + valor;
        }, 0);

      // Calcular gasto frota pesada no mês
      const gastoPesada = osDoMes
        .filter(os => {
          return placasFrotePesada.includes(os.placaViatura) || 
                 cadastrosFrotePesada.includes(os.cadastroViatura) ||
                 (os.placaViatura === 'N/D' && cadastrosFrotePesada.includes(os.cadastroViatura));
        })
        .reduce((total, os) => {
          const valor = parseFloat(os.valorOS.replace(/[R$.,\s]/g, '')) / 100;
          return total + valor;
        }, 0);

      // Buscar saldo configurado da frota leve
      const saldosSnapshot = await getDocs(collection(db, 'saldosViaturas'));
      const saldoFroteLeve = saldosSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }) as any)
        .find((s: any) => s.tipo === 'frota_leve' && s.anoReferencia === anoAtual);
      
      const saldoConfigurado = (saldoFroteLeve as any)?.saldoMensal || 45000;
      const saldoRestante = saldoConfigurado - gastoLeve;

      setGastoFroteLeveMes(gastoLeve);
      setSaldoFroteLeveMes(saldoRestante);
      setGastoFrotePesadaMes(gastoPesada);
      setTotalOSMes(osDoMes.length);

    } catch (error) {
      console.error('Erro ao calcular métricas do dashboard:', error);
    }
  };

  const processarGastos = () => {
    const agora = new Date();
    const mesAtual = agora.getMonth();
    const anoAtual = agora.getFullYear();

    // Processar gastos do mês atual
    const gastosMesAtual = ordensServico
      .filter(os => {
        const dataOS = new Date(os.dataOS);
        return dataOS.getMonth() === mesAtual && dataOS.getFullYear() === anoAtual;
      })
      .reduce((acc, os) => {
        const valor = parseFloat(os.valorOS.replace(/[R$.,\s]/g, '')) / 100;
        const placa = os.placaViatura;

        if (!acc[placa]) {
          acc[placa] = { placa, valor: 0, count: 0 };
        }
        acc[placa].valor += valor;
        acc[placa].count += 1;

        return acc;
      }, {} as any);

    setGastosMes(Object.values(gastosMesAtual));

    // Processar gastos dos últimos 12 meses
    const gastos12MesesData = [];
    for (let i = 11; i >= 0; i--) {
      const data = new Date(anoAtual, mesAtual - i, 1);
      const mesLabel = data.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });

      const gastosMes = ordensServico
        .filter(os => {
          const dataOS = new Date(os.dataOS);
          return dataOS.getMonth() === data.getMonth() && dataOS.getFullYear() === data.getFullYear();
        })
        .reduce((total, os) => {
          const valor = parseFloat(os.valorOS.replace(/[R$.,\s]/g, '')) / 100;
          return total + valor;
        }, 0);

      gastos12MesesData.push({
        mes: mesLabel,
        valor: gastosMes
      });
    }

    setGastos12Meses(gastos12MesesData);
  };

  const getStatusViatura = (viatura: Viatura) => {
    const kmRestante = viatura.KMOLEO - viatura.KM;
    
    const ehFrotePesada = isFrotePesada(viatura);
    const ehFroteLeve = isFroteLeve(viatura);

    // Para frota pesada, apenas verificar KM (saldo é livre)
    if (ehFrotePesada) {
      if (kmRestante <= 1000) {
        return { status: 'CRÍTICO', variant: 'destructive' as const, cor: 'border-destructive bg-destructive/5' };
      } else if (kmRestante <= 3000) {
        return { status: 'ATENÇÃO', variant: 'secondary' as const, cor: 'border-yellow-500 bg-yellow-500/5' };
      }
      return { status: 'OK', variant: 'default' as const, cor: 'border-green-500 bg-green-500/5' };
    }

    // Para frota leve, verificar KM + saldo já calculado no dashboard
    if (ehFroteLeve) {
      if (kmRestante <= 1000 || saldoFroteLeveMes < 1000) {
        return { status: 'CRÍTICO', variant: 'destructive' as const, cor: 'border-destructive bg-destructive/5' };
      } else if (kmRestante <= 3000 || saldoFroteLeveMes < 2000) {
        return { status: 'ATENÇÃO', variant: 'secondary' as const, cor: 'border-yellow-500 bg-yellow-500/5' };
      }
    }

    // Para viaturas sem categoria definida
    if (kmRestante <= 1000) {
      return { status: 'CRÍTICO', variant: 'destructive' as const, cor: 'border-destructive bg-destructive/5' };
    } else if (kmRestante <= 3000) {
      return { status: 'ATENÇÃO', variant: 'secondary' as const, cor: 'border-yellow-500 bg-yellow-500/5' };
    }
    
    return { status: 'OK', variant: 'default' as const, cor: 'border-green-500 bg-green-500/5' };
  };

  const handleViaturaClick = (viaturaId: string) => {
    setSelectedViatura(selectedViatura === viaturaId ? null : viaturaId);
  };

  const handleVerDetalhes = (viatura: Viatura) => {
    setViaturaDetalhes(viatura);
    setModalDetalhesAberto(true);
  };

  const getOrdensViatura = (placa: string) => {
    return ordensServico.filter(os => os.placaViatura === placa);
  };

  // Função para atualizar saldo de todas as viaturas
  const handleAtualizarSaldos = async () => {
    setIsUpdatingSaldos(true);

    try {
      const agora = new Date();
      const mesAtual = agora.getMonth() + 1;
      const anoAtual = agora.getFullYear();

      // Usar ordensServico do estado em vez de buscar novamente
      const ordensMesAtual = ordensServico
        .map(os => ({
          id: os.id,
          placa: os.placaViatura,
          valorTotal: parseFloat(os.valorOS?.replace(/[R$.,\s]/g, '') || '0') / 100,
          dataOS: os.dataOS
        }))
        .filter(os => {
          const dataOS = new Date(os.dataOS);
          return dataOS.getMonth() + 1 === mesAtual && dataOS.getFullYear() === anoAtual;
        });

      // Usar viaturas do estado em vez de buscar novamente
      const viaturasPesadasLocal = viaturas.filter(v => v.tipo === 'pesada');
      const viaturasLevesLocal = viaturas.filter(v => v.tipo === 'leve');

      // Calcular saldo usado da frota leve
      const placasLeves = viaturasLevesLocal.map(v => v.PLACA);
      const saldoUsadoFroteLeve = ordensMesAtual
        .filter(os => placasLeves.includes(os.placa))
        .reduce((total, os) => total + (os.valorTotal || 0), 0);

      // Buscar cota da frota leve
      const saldosViaturasSnapshot = await getDocs(collection(db, 'saldosViaturas'));
      const saldoOficinaSnapshot = await getDocs(collection(db, 'saldoOficina'));

      const docFroteLeve = saldosViaturasSnapshot.docs.find(doc => doc.data().tipo === 'frota_leve');
      const cotaFroteLeve = docFroteLeve?.data()?.saldoMensal || 0;

      const mesReferenciaAtual = `${mesAtual.toString().padStart(2, '0')}/${anoAtual}`;

      // Criar/atualizar registros na coleção saldoOficina
      for (const viatura of viaturas) {
        let saldoUsado = 0;
        let saldoDisponivel = 0;
        let tipoSaldo = 'individual';

        if (isFrotePesada(viatura)) {
          // Para frota pesada, saldo livre (sem limitação)
          saldoUsado = ordensMesAtual
            .filter(os => os.placa === viatura.PLACA)
            .reduce((total, os) => total + (os.valorTotal || 0), 0);
          saldoDisponivel = 999999; // Valor simbólico para saldo livre
          tipoSaldo = 'livre';
        } else if (isFroteLeve(viatura)) {
          // Para frota leve, usar o saldo coletivo
          saldoUsado = saldoUsadoFroteLeve;
          saldoDisponivel = cotaFroteLeve - saldoUsadoFroteLeve;
          tipoSaldo = 'compartilhado';
        } else {
          // Viatura sem categoria
          saldoUsado = ordensMesAtual
            .filter(os => os.placa === viatura.PLACA)
            .reduce((total, os) => total + (os.valorTotal || 0), 0);
          saldoDisponivel = 0;
          tipoSaldo = 'indefinido';
        }

        // Verificar se já existe um registro para esta placa no mês atual
        const registroExistente = saldoOficinaSnapshot.docs.find(doc => {
          const data = doc.data();
          return data.placa === viatura.PLACA && data.mesReferencia === mesReferenciaAtual;
        });

        const dadosAtualizacao = {
          placa: viatura.PLACA,
          cadastro: viatura.CADASTRO || '',
          modelo: viatura.MODELO,
          tipo: viatura.tipo || 'indefinido',
          tipoSaldo: tipoSaldo,
          saldoUsado: saldoUsado,
          saldoDisponivel: saldoDisponivel,
          mesReferencia: mesReferenciaAtual,
          dataAtualizacao: new Date().toISOString(),
        };

        if (registroExistente) {
          // Atualizar registro existente
          await updateDoc(doc(db, 'saldoOficina', registroExistente.id), dadosAtualizacao);
        } else {
          // Criar novo registro
          await addDoc(collection(db, 'saldoOficina'), dadosAtualizacao);
        }
      }

      // Limpar cache para garantir dados atualizados
      limparCacheViaturas();

      // Recalcular métricas após atualização
      await calcularMetricasDashboard();

      toast({
        title: "Saldos atualizados",
        description: `Saldos de ${viaturas.length} viaturas atualizados para ${mesAtual.toString().padStart(2, '0')}/${anoAtual}`,
      });

    } catch (error) {
      console.error('Erro ao atualizar saldos:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar os saldos. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingSaldos(false);
    }
  };

  // Calcular status de todas as viaturas de forma síncrona usando useMemo
  const statusViaturas = useMemo(() => {
    const statusMap: Record<string, any> = {};
    for (const viatura of viaturas) {
      statusMap[viatura.id] = getStatusViatura(viatura);
    }
    return statusMap;
  }, [viaturas, ordensServico, saldoFroteLeveMes]);

  // Buscar avarias pendentes sem ciência
  useEffect(() => {
    const buscarAvariasSemCiencia = () => {
      const todasAvarias: any[] = [];
      
      viaturas.forEach(viatura => {
        const avarias = viatura.avarias || [];
        avarias
          .filter((a: any) => a.status === 'PENDENTE' && !a.ciencia)
          .forEach((avaria: any) => {
            todasAvarias.push({
              ...avaria,
              viaturaCadastro: viatura.CADASTRO,
              viaturaPlaca: viatura.PLACA,
              viaturaId: viatura.id
            });
          });
      });
      
      // Ordenar por data mais recente
      todasAvarias.sort((a, b) => 
        new Date(b.data).getTime() - new Date(a.data).getTime()
      );
      
      setAvariasNaoVisualizadas(todasAvarias);
    };

    if (viaturas.length > 0) {
      buscarAvariasSemCiencia();
    }
  }, [viaturas]);

  // Função para dar ciência em uma avaria
  const handleDarCiencia = async (avaria: any) => {
    try {
      const viaturaRef = doc(db, 'frota', avaria.viaturaId);
      
      // Buscar viatura atual do Firebase para garantir dados atualizados
      const viaturaDoc = await getDoc(viaturaRef);
      if (!viaturaDoc.exists()) {
        toast({
          title: "Erro",
          description: "Viatura não encontrada.",
          variant: "destructive"
        });
        return;
      }
      
      const viaturaData = viaturaDoc.data();
      
      // Buscar usuário logado
      const userStr = localStorage.getItem('policialLogado');
      const usuarioLogado = userStr ? JSON.parse(userStr) : null;
      
      // Atualizar avaria com ciência - usando data e tipo para identificar já que ID pode não existir
      const avariasAtualizadas = (viaturaData.avarias || []).map((a: any, index: number) => {
        // Comparar por múltiplos campos para garantir match correto
        const isMatch = (a.id && avaria.id && a.id === avaria.id) || 
          (a.data === avaria.data && a.tipo === avaria.tipo && a.descricao === avaria.descricao);
        
        if (isMatch) {
          return {
            ...a,
            ciencia: true,
            cienciaPor: usuarioLogado?.NOME || 'Admin',
            dataCiencia: new Date().toISOString()
          };
        }
        return a;
      });
      
      await updateDoc(viaturaRef, { avarias: avariasAtualizadas });
      
      // Remover do estado local
      setAvariasNaoVisualizadas(prev => 
        prev.filter(a => !(a.data === avaria.data && a.tipo === avaria.tipo && a.viaturaId === avaria.viaturaId))
      );
      
      toast({
        title: "Ciência registrada",
        description: "Alerta de avaria dispensado com sucesso."
      });
      
    } catch (error) {
      console.error('Erro ao registrar ciência:', error);
      toast({
        title: "Erro",
        description: "Não foi possível registrar ciência.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com configurações */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Dashboard de Frota</h2>
          <p className="text-muted-foreground">Visão geral das viaturas e gastos</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="default"
            onClick={() => setCadastroViaturaOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Cadastrar Viatura
          </Button>
          <Button
            variant="secondary"
            onClick={() => setKmDialogOpen(true)}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar KM e Óleo
          </Button>
        </div>
      </div>

      {/* Alerta de Troca de Óleo */}
      {viaturas.filter(v => {
        const VIATURAS_MONITORADAS = [
          'CAV - 04', 'CAV - 05', 'CAV - 06', 'CAV - 08', 'CAV - 11', 
          'CAV - 12', 'CAV - 13', 'TA - 01', 'TA - 02', 'TA - 03', 
          'TP', '6398', 'DUSTER'
        ];
        const isMonitorada = VIATURAS_MONITORADAS.includes(v.CADASTRO || '');
        const kmRestante = (v.KMOLEO || 0) - (v.KM || 0);
        return isMonitorada && kmRestante <= 500 && kmRestante > 0;
      }).length > 0 && (
        <Card className="border-orange-500 bg-orange-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Alerta de Troca de Óleo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {viaturas
                .filter(v => {
                  const VIATURAS_MONITORADAS = [
                    'CAV - 04', 'CAV - 05', 'CAV - 06', 'CAV - 08', 'CAV - 11', 
                    'CAV - 12', 'CAV - 13', 'TA - 01', 'TA - 02', 'TA - 03', 
                    'TP', '6398', 'DUSTER'
                  ];
                  const isMonitorada = VIATURAS_MONITORADAS.includes(v.CADASTRO || '');
                  const kmRestante = (v.KMOLEO || 0) - (v.KM || 0);
                  return isMonitorada && kmRestante <= 500 && kmRestante > 0;
                })
                .map(v => {
                  const kmRestante = (v.KMOLEO || 0) - (v.KM || 0);
                  return (
                    <div key={v.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{v.CADASTRO}</span>
                        <span className="text-sm text-muted-foreground">({v.PLACA})</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-orange-600">
                          Faltam {kmRestante.toLocaleString()} km para troca de óleo
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
        </CardContent>
        </Card>
      )}

      {/* Alertas de Novas Avarias */}
      {avariasNaoVisualizadas.length > 0 && (
        <Card className="border-red-500 bg-red-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Novas Avarias Constatadas ({avariasNaoVisualizadas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {avariasNaoVisualizadas.map((avaria, idx) => (
                <div 
                  key={`${avaria.viaturaId}-${avaria.id}-${idx}`} 
                  className="flex items-start justify-between p-3 bg-background rounded-lg border gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Car className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-semibold text-sm">
                        {avaria.viaturaCadastro} ({avaria.viaturaPlaca})
                      </span>
                      <Badge 
                        variant={avaria.gravidade === 'GRAVE' ? 'destructive' : 
                                avaria.gravidade === 'MODERADA' ? 'secondary' : 'outline'}
                        className="text-xs"
                      >
                        {avaria.gravidade || 'N/D'}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <p className="text-foreground">
                        <strong>Tipo:</strong> {avaria.tipo || 'N/D'}
                        {avaria.descricao && ` - ${avaria.descricao}`}
                      </p>
                      <p className="text-muted-foreground">
                        <strong>Local:</strong> {avaria.angulo?.toUpperCase() || 'N/D'}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Constatado por: {avaria.responsavel || 'N/D'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {avaria.data ? new Date(avaria.data).toLocaleDateString('pt-BR') : 'N/D'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDarCiencia(avaria)}
                    className="flex-shrink-0 gap-1"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Ciência
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Métricas Gerais - 4 Quadros Solicitados */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Car className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Viaturas</p>
                <p className="text-2xl font-bold">{viaturas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Frota Leve - Mês</p>
                <p className="text-lg font-bold text-red-600">
                  Gasto: R$ {gastoFroteLeveMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm font-semibold text-green-600">
                  Saldo: R$ {saldoFroteLeveMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Wrench className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Frota Pesada - Mês</p>
                <p className="text-2xl font-bold text-orange-600">
                  R$ {gastoFrotePesadaMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">OS Este Mês</p>
                <p className="text-2xl font-bold text-purple-600">{totalOSMes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid de Viaturas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Car className="h-5 w-5" />
            Viaturas da Frota
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {viaturas.map((viatura) => {
              const statusInfo = statusViaturas[viatura.id] || { status: 'OK', variant: 'default', cor: 'border-green-500 bg-green-500/5' };
              const ordensViatura = getOrdensViatura(viatura.PLACA);
              const isSelected = selectedViatura === viatura.id;

              return (
                <Card
                  key={viatura.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-primary' : ''
                    }`}
                  onClick={() => handleViaturaClick(viatura.id)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-sm">{viatura.CADASTRO || viatura.id}</h3>
                          <p className="text-xs text-muted-foreground">{viatura.PLACA}</p>
                        </div>
                        <Badge variant={statusInfo.variant} className="text-xs">
                          {statusInfo.status}
                        </Badge>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tipo:</span>
                           <Badge
                             variant={viatura.tipo === 'pesada' ? 'destructive' : 
                                     viatura.tipo === 'leve' ? 'default' : 'secondary'}
                             className="text-xs"
                           >
                             {viatura.tipo === 'pesada' ? 'Pesada' :
                               viatura.tipo === 'leve' ? 'Leve' :
                                 'Não definido'}
                           </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">KM:</span>
                          <span className="font-medium">{viatura.KM.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Próximo Óleo:</span>
                          <span className="font-medium">{viatura.KMOLEO.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">OS Total:</span>
                          <span className="font-medium">{ordensViatura.length}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVerDetalhes(viatura);
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Ver Detalhes
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Detalhes da Viatura */}
      <ModalDetalhesViatura
        isOpen={modalDetalhesAberto}
        onClose={() => setModalDetalhesAberto(false)}
        viatura={viaturaDetalhes}
      />

      {/* Modal de Gestão de Saldos */}
      <GestaoSaldos
        isOpen={gestaoSaldosAberto}
        onClose={() => setGestaoSaldosAberto(false)}
      />

      {/* Modal de Atualizar KM e Óleo */}
      <AtualizarKmOleoDialog 
        open={kmDialogOpen} 
        onOpenChange={setKmDialogOpen}
      />

      {/* Modal de Cadastrar Viatura */}
      <ModalCadastroViatura
        open={cadastroViaturaOpen}
        onOpenChange={setCadastroViaturaOpen}
        onSuccess={() => {
          fetchViaturas();
        }}
      />
    </div>
  );
};

export default FrotaDashboard;
