import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import {
  Car,
  Wrench,
  Calendar,
  DollarSign,
  Fuel,
  Battery,
  Circle,
  Settings
} from 'lucide-react';

interface Viatura {
  id: string;
  MODELO: string;
  PLACA: string;
  KM: number;
  KMOLEO: number;
  SALDO: number;
  cadastro?: string;
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

interface ModalDetalhesViaturaProps {
  isOpen: boolean;
  onClose: () => void;
  viatura: Viatura | null;
}

const ModalDetalhesViatura = ({ isOpen, onClose, viatura }: ModalDetalhesViaturaProps) => {
  const [ordensServico, setOrdensServico] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState(false);
  const [saldosHistorico, setSaldosHistorico] = useState<any[]>([]);

  useEffect(() => {
    if (viatura && isOpen) {
      fetchOrdensServico();
      fetchSaldosHistorico();
    }
  }, [viatura, isOpen]);

  const fetchOrdensServico = async () => {
    if (!viatura) return;
    
    setLoading(true);
    try {
      const q = query(
        collection(db, 'ordensDeServico'),
        where('placaViatura', '==', viatura.PLACA)
      );
      const querySnapshot = await getDocs(q);
      const osData: OrdemServico[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as OrdemServico[];
      
      // Ordenar por data mais recente
      osData.sort((a, b) => new Date(b.dataOS).getTime() - new Date(a.dataOS).getTime());
      setOrdensServico(osData);
    } catch (error) {
      console.error('Erro ao buscar ordens de serviço:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSaldosHistorico = async () => {
    if (!viatura) return;
    
    try {
      const querySnapshot = await getDocs(collection(db, 'saldosViaturas'));
      const saldosData = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }) as any)
        .filter((saldo: any) => {
          const FROTA_PESADA_PLACAS = ['PMH7342', 'PMH6432', 'HUQ4028', 'OCO3291'];
          const FROTA_PESADA_CADASTROS = ['TA01', 'TA02', 'TA03', 'TP'];
          return saldo.viaturaId === viatura.id || 
            (saldo.tipo === 'frota_pesada' && 
             (FROTA_PESADA_CADASTROS.includes(viatura.cadastro || viatura.id) || 
              FROTA_PESADA_PLACAS.includes(viatura.PLACA)))
        })
        .sort((a: any, b: any) => b.anoReferencia - a.anoReferencia);
      
      setSaldosHistorico(saldosData);
    } catch (error) {
      console.error('Erro ao buscar histórico de saldos:', error);
    }
  };

  const getOrdensComFiltro = (filtro: string) => {
    return ordensServico.filter(os => 
      os.observacao.toLowerCase().includes(filtro.toLowerCase())
    );
  };

  const formatarMoeda = (valor: string | number) => {
    let numero: number;
    if (typeof valor === 'string') {
      numero = parseFloat(valor.replace(/[R$.,\s]/g, '')) / 100;
    } else {
      numero = valor / 100;
    }
    return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const calcularTotalGasto = (ordens: OrdemServico[]) => {
    return ordens.reduce((total, os) => {
      const valor = parseFloat(os.valorOS.replace(/[R$.,\s]/g, '')) / 100;
      return total + valor;
    }, 0);
  };

  // Calcular gráficos de pizza baseado nos saldos configurados
  const calcularGraficoPizza = () => {
    const agora = new Date();
    const mesAtual = agora.getMonth();
    const anoAtual = agora.getFullYear();
    
    // Buscar saldo configurado para esta viatura ou para frota pesada
    const FROTA_PESADA_PLACAS = ['PMH7342', 'PMH6432', 'HUQ4028', 'OCO3291'];
    const FROTA_PESADA_CADASTROS = ['TA01', 'TA02', 'TA03', 'TP'];
    const cadastroViatura = viatura?.cadastro || viatura?.id;
    const placaViatura = viatura?.PLACA;
    
    let saldoMensal = 0;
    let saldo12Meses = 0;
    
    if (FROTA_PESADA_CADASTROS.includes(cadastroViatura || '') || FROTA_PESADA_PLACAS.includes(placaViatura || '')) {
      // Para frota pesada, buscar saldo compartilhado
      const saldoFrotaPesada = saldosHistorico.find(s => s.tipo === 'frota_pesada' && s.anoReferencia === anoAtual);
      if (saldoFrotaPesada) {
        saldoMensal = saldoFrotaPesada.saldoMensal || 0;
        saldo12Meses = saldoFrotaPesada.saldo12Meses || 0;
      }
    } else {
      // Para frota leve, buscar saldo individual
      const saldoIndividual = saldosHistorico.find(s => s.viaturaId === viatura?.id && s.anoReferencia === anoAtual);
      if (saldoIndividual) {
        saldoMensal = saldoIndividual.saldoMensal || 0;
        saldo12Meses = saldoIndividual.saldo12Meses || 0;
      }
    }
    
    // Gastos do mês atual
    const gastoMesAtual = ordensServico
      .filter(os => {
        const dataOS = new Date(os.dataOS);
        return dataOS.getMonth() === mesAtual && dataOS.getFullYear() === anoAtual;
      })
      .reduce((total, os) => {
        const valor = parseFloat(os.valorOS.replace(/[R$.,\s]/g, '')) / 100;
        return total + valor;
      }, 0);

    // Gastos dos últimos 12 meses
    const gasto12Meses = ordensServico
      .filter(os => {
        const dataOS = new Date(os.dataOS);
        const doze_meses_atras = new Date(anoAtual, mesAtual - 12, 1);
        return dataOS >= doze_meses_atras;
      })
      .reduce((total, os) => {
        const valor = parseFloat(os.valorOS.replace(/[R$.,\s]/g, '')) / 100;
        return total + valor;
      }, 0);

    const saldoDisponivelMes = Math.max(0, saldoMensal - gastoMesAtual);
    const saldoDisponivel12Meses = Math.max(0, saldo12Meses - gasto12Meses);

    return {
      mes: [
        { name: 'Usado', value: gastoMesAtual, fill: '#ef4444' },
        { name: 'Disponível', value: saldoDisponivelMes, fill: '#22c55e' }
      ],
      doze_meses: [
        { name: 'Usado', value: gasto12Meses, fill: '#ef4444' },
        { name: 'Disponível', value: saldoDisponivel12Meses, fill: '#22c55e' }
      ],
      totais: {
        saldoMensal,
        saldo12Meses,
        gastoMesAtual,
        gasto12Meses
      }
    };
  };

  const dadosGraficos = calcularGraficoPizza();

  if (!viatura) return null;

  const ordensGerais = ordensServico;
  const ordensPneu = getOrdensComFiltro('pneu');
  const ordensBateria = getOrdensComFiltro('bateria');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Car className="h-6 w-6" />
              Detalhes da Viatura - {viatura.cadastro || viatura.id}
            </DialogTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                // Aqui você pode abrir o modal de gestão de saldos específico para esta viatura
                console.log('Abrir gestão de saldos para:', viatura.id);
              }}
            >
              <Settings className="h-4 w-4 mr-2" />
              Configurar Saldos
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Histórico de Saldos */}
          {saldosHistorico.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Histórico de Saldos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {saldosHistorico.slice(0, 5).map((saldo) => (
                    <div key={saldo.id} className="flex justify-between items-center text-sm border-b pb-2">
                      <div>
                        <span className="font-medium">{saldo.mesReferencia}</span>
                        {saldo.tipo === 'frota_pesada' && (
                          <Badge variant="secondary" className="ml-2 text-xs">Frota Pesada</Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-green-600">
                          Mensal: R$ {saldo.saldoMensal?.toLocaleString() || 0}
                        </div>
                        <div className="text-blue-600">
                          Anual: R$ {saldo.saldo12Meses?.toLocaleString() || 0}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resumo de Saldos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Resumo Saldo Mensal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Saldo Configurado:</span>
                  <span className="font-semibold text-green-600">
                    R$ {dadosGraficos.totais.saldoMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Gasto Este Mês:</span>
                  <span className="font-semibold text-red-600">
                    R$ {dadosGraficos.totais.gastoMesAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span>Saldo Restante:</span>
                  <span className="font-semibold text-blue-600">
                    R$ {(dadosGraficos.totais.saldoMensal - dadosGraficos.totais.gastoMesAtual).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={dadosGraficos.mes}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={60}
                      dataKey="value"
                    >
                      {dadosGraficos.mes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Resumo Saldo 12 Meses
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Saldo Configurado:</span>
                  <span className="font-semibold text-green-600">
                    R$ {dadosGraficos.totais.saldo12Meses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Gasto 12 Meses:</span>
                  <span className="font-semibold text-red-600">
                    R$ {dadosGraficos.totais.gasto12Meses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span>Saldo Restante:</span>
                  <span className="font-semibold text-blue-600">
                    R$ {(dadosGraficos.totais.saldo12Meses - dadosGraficos.totais.gasto12Meses).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={dadosGraficos.doze_meses}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={60}
                      dataKey="value"
                    >
                      {dadosGraficos.doze_meses.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Informações da Viatura */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Car className="h-6 w-6 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Modelo</p>
                    <p className="font-semibold">{viatura.MODELO}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Fuel className="h-6 w-6 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">KM Atual</p>
                    <p className="font-semibold">{viatura.KM.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Wrench className="h-6 w-6 text-orange-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Próximo Óleo</p>
                    <p className="font-semibold">{viatura.KMOLEO.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-6 w-6 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Saldo</p>
                    <p className="font-semibold">R$ {(viatura.SALDO / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs com Ordens de Serviço */}
          <Tabs defaultValue="todas" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="todas" className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Todas ({ordensGerais.length})
              </TabsTrigger>
              <TabsTrigger value="pneus" className="flex items-center gap-2">
                <Circle className="h-4 w-4" />
                Pneus ({ordensPneu.length})
              </TabsTrigger>
              <TabsTrigger value="bateria" className="flex items-center gap-2">
                <Battery className="h-4 w-4" />
                Bateria ({ordensBateria.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="todas" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Ordens de Serviço</span>
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      Total: {formatarMoeda(calcularTotalGasto(ordensGerais).toString())}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TabelaOrdensServico ordens={ordensGerais} loading={loading} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pneus" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Serviços de Pneus</span>
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      Total: {formatarMoeda(calcularTotalGasto(ordensPneu).toString())}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TabelaOrdensServico ordens={ordensPneu} loading={loading} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bateria" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Serviços de Bateria</span>
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      Total: {formatarMoeda(calcularTotalGasto(ordensBateria).toString())}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TabelaOrdensServico ordens={ordensBateria} loading={loading} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface TabelaOrdensServicoProps {
  ordens: OrdemServico[];
  loading: boolean;
}

const TabelaOrdensServico = ({ ordens, loading }: TabelaOrdensServicoProps) => {
  const formatarMoeda = (valor: string) => {
    const numero = parseFloat(valor.replace(/[R$.,\s]/g, '')) / 100;
    return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (loading) {
    return <div className="text-center py-8">Carregando ordens de serviço...</div>;
  }

  if (ordens.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">Nenhuma ordem de serviço encontrada</div>;
  }

  return (
    <div className="max-h-96 overflow-y-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nº OS</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Oficina</TableHead>
            <TableHead>Observação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ordens.map((os) => (
            <TableRow key={os.id}>
              <TableCell className="font-medium">{os.numeroOS}</TableCell>
              <TableCell>
                {new Date(os.dataOS).toLocaleDateString('pt-BR')}
              </TableCell>
              <TableCell className="font-semibold text-green-600">
                {formatarMoeda(os.valorOS)}
              </TableCell>
              <TableCell>{os.oficinaResponsavel}</TableCell>
              <TableCell className="max-w-xs truncate" title={os.observacao}>
                {os.observacao}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ModalDetalhesViatura;