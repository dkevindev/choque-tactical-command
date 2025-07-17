import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy, addDoc, updateDoc, doc } from 'firebase/firestore';
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
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import ModalDetalhesViatura from '@/components/ModalDetalhesViatura';
import GestaoSaldos from './GestaoSaldos';

interface Viatura {
  id: string;
  MODELO: string;
  PLACA: string;
  KM: number;
  KMOLEO: number;
  SALDO: number;
  CADASTRO?: string;
  cadastro: string;
  tipo?: 'leve' | 'pesada';
}

interface OrdemServico {
  id: string;
  placaViatura: string;
  modeloViatura: string;
  numeroOS: string;
  dataOS: string;
  valorOS: string;
  observacao: string;
  oficinaResponsavel: string;
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
  const { toast } = useToast();

  useEffect(() => {
    fetchViaturas();
    fetchOrdensServico();
  }, []);

  useEffect(() => {
    if (ordensServico.length > 0) {
      processarGastos();
    }
  }, [ordensServico]);

  const fetchViaturas = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'frota'));
      const viaturasData: Viatura[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Viatura[];

      // Ordenar viaturas conforme solicitado
      const ordenCustomizada = ['CAV - 11', 'CAV - 12', 'CAV - 13', 'CAV - 05', 'CAV - 06', 'TA - 01', 'TA - 02', 'TA - 03', 'TP'];

      const viaturasOrdenadas = viaturasData.sort((a, b) => {
        const cadastroA = a.cadastro || a.id;
        const cadastroB = b.cadastro || b.id;

        const indexA = ordenCustomizada.indexOf(cadastroA);
        const indexB = ordenCustomizada.indexOf(cadastroB);

        // Se os dois estão na lista personalizada, usa a ordem dela
        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB;
        }

        // Se apenas A está na lista, ele vem primeiro
        if (indexA !== -1) return -1;

        // Se apenas B está na lista, ele vem primeiro
        if (indexB !== -1) return 1;

        // Se nenhum está na lista, ordena por nome (opcional)
        return cadastroA.localeCompare(cadastroB);
      });
      setViaturas(viaturasOrdenadas);
    } catch (error) {
      console.error('Erro ao buscar viaturas:', error);
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

    if (kmRestante <= 1000 || viatura.SALDO < 1000) {
      return { status: 'CRÍTICO', variant: 'destructive' as const, cor: 'border-destructive bg-destructive/5' };
    } else if (kmRestante <= 3000 || viatura.SALDO < 2000) {
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

      // Buscar todas as OS do mês atual
      const osSnapshot = await getDocs(collection(db, 'ordensDeServico'));
      const ordensMesAtual = osSnapshot.docs
        .map(doc => ({
          id: doc.id,
          placa: doc.data().placaViatura,
          valorTotal: parseFloat(doc.data().valorOS?.replace(/[R$.,\s]/g, '') || '0') / 100,
          dataOS: doc.data().dataOS
        }))
        .filter(os => {
          const dataOS = new Date(os.dataOS);
          return dataOS.getMonth() + 1 === mesAtual && dataOS.getFullYear() === anoAtual;
        });

      // Separar viaturas por tipo
      const viaturasPesadas = viaturas.filter(v => v.tipo === 'pesada');
      const viaturasLeves = viaturas.filter(v => v.tipo === 'leve' || !v.tipo);

      // Calcular saldo usado da frota pesada (soma de todas as OS das viaturas pesadas no mês)
      const placasPesadas = viaturasPesadas.map(v => v.PLACA);
      const saldoUsadoFrotaPesada = ordensMesAtual
        .filter(os => placasPesadas.includes(os.placa))
        .reduce((total, os) => total + (os.valorTotal || 0), 0);

      // Buscar cota da frota pesada e registros existentes
      const saldosViaturasSnapshot = await getDocs(collection(db, 'saldosViaturas'));
      const saldoOficinaSnapshot = await getDocs(collection(db, 'saldoOficina'));

      const docFrotaPesada = saldosViaturasSnapshot.docs.find(doc => doc.data().tipo === 'frota_pesada');
      const cotaFrotaPesada = docFrotaPesada?.data()?.saldoMensal || 0;

      const mesReferenciaAtual = `${mesAtual.toString().padStart(2, '0')}/${anoAtual}`;

      // Criar/atualizar registros na coleção saldoOficina
      for (const viatura of viaturas) {
        let saldoUsado = 0;
        let saldoDisponivel = 0;

        if (viatura.tipo === 'pesada') {
          // Para frota pesada, usar o saldo coletivo
          saldoUsado = saldoUsadoFrotaPesada;
          saldoDisponivel = cotaFrotaPesada - saldoUsadoFrotaPesada;
        } else {
          // Para frota leve, calcular individualmente
          saldoUsado = ordensMesAtual
            .filter(os => os.placa === viatura.PLACA)
            .reduce((total, os) => total + (os.valorTotal || 0), 0);

          // Buscar cota individual da viatura na coleção saldosViaturas
          const cotaViatura = saldosViaturasSnapshot.docs
            .find(doc => {
              const data = doc.data();
              return data.placa === viatura.PLACA || data.viaturaId === viatura.PLACA;
            })?.data()?.saldoMensal || viatura.SALDO || 0;

          saldoDisponivel = cotaViatura - saldoUsado;
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
          tipo: viatura.tipo || 'leve',
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
            onClick={handleAtualizarSaldos}
            disabled={isUpdatingSaldos}
            variant="secondary"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isUpdatingSaldos ? 'animate-spin' : ''}`} />
            {isUpdatingSaldos ? 'Atualizando...' : 'Atualizar Saldos'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setGestaoSaldosAberto(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Configurar Saldos
          </Button>
        </div>
      </div>

      {/* Métricas Gerais */}
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
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Críticas/Atenção</p>
                <p className="text-2xl font-bold">
                  {viaturas.filter(v => getStatusViatura(v).status !== 'OK').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Gasto Mês Atual</p>
                <p className="text-2xl font-bold">
                  R$ {gastosMes.reduce((total, item) => total + item.valor, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Wrench className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">OS Este Mês</p>
                <p className="text-2xl font-bold">
                  {gastosMes.reduce((total, item) => total + item.count, 0)}
                </p>
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
              const statusInfo = getStatusViatura(viatura);
              const ordensViatura = getOrdensViatura(viatura.PLACA);
              const isSelected = selectedViatura === viatura.id;

              return (
                <Card
                  key={viatura.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${statusInfo.cor} ${isSelected ? 'ring-2 ring-primary' : ''
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
                            variant={viatura.tipo === 'pesada' ? 'destructive' : 'default'}
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
                          <span className="text-muted-foreground">Saldo:</span>
                          <span className="font-medium">R$ {(viatura.SALDO / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
    </div>
  );
};

export default FrotaDashboard;