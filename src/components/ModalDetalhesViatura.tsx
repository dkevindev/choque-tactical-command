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
import {
  Car,
  Wrench,
  Calendar,
  DollarSign,
  Fuel,
  Battery,
  Circle
} from 'lucide-react';

interface Viatura {
  id: string;
  MODELO: string;
  PLACA: string;
  KM: number;
  KMOLEO: number;
  SALDO: number;
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

  useEffect(() => {
    if (viatura && isOpen) {
      fetchOrdensServico();
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

  const getOrdensComFiltro = (filtro: string) => {
    return ordensServico.filter(os => 
      os.observacao.toLowerCase().includes(filtro.toLowerCase())
    );
  };

  const formatarMoeda = (valor: string) => {
    const numero = parseFloat(valor.replace(/[R$.,\s]/g, ''));
    return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const calcularTotalGasto = (ordens: OrdemServico[]) => {
    return ordens.reduce((total, os) => {
      const valor = parseFloat(os.valorOS.replace(/[R$.,\s]/g, ''));
      return total + valor;
    }, 0);
  };

  if (!viatura) return null;

  const ordensGerais = ordensServico;
  const ordensPneu = getOrdensComFiltro('pneu');
  const ordensBateria = getOrdensComFiltro('bateria');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Car className="h-6 w-6" />
            Detalhes da Viatura - {viatura.id}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
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
                    <p className="font-semibold">R$ {viatura.SALDO.toLocaleString()}</p>
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
    const numero = parseFloat(valor.replace(/[R$.,\s]/g, ''));
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