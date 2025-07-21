import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarIcon, Car, CheckCheck, DollarSign, XCircle } from 'lucide-react';

interface NovaOSFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const NovaOSForm = ({ isOpen, onClose }: NovaOSFormProps) => {
  const [placaViatura, setPlacaViatura] = useState('');
  const [modeloViatura, setModeloViatura] = useState('');
  const [numeroOS, setNumeroOS] = useState('');
  const [dataOS, setDataOS] = useState<Date | undefined>();
  const [valorOS, setValorOS] = useState('');
  const [observacao, setObservacao] = useState('');
  const [oficinaResponsavel, setOficinaResponsavel] = useState('');
  const [placas, setPlacas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saldoInfo, setSaldoInfo] = useState<{ saldoDisponivel: number; cotaMensal: number; tipoSaldo: string; observacao?: string }>({
    saldoDisponivel: 0,
    cotaMensal: 0,
    tipoSaldo: 'desconhecido'
  });
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchPlacas();
      setPlacaViatura('');
      setModeloViatura('');
      setNumeroOS('');
      setDataOS(undefined);
      setValorOS('');
      setObservacao('');
      setOficinaResponsavel('');
      setSaldoInfo({ saldoDisponivel: 0, cotaMensal: 0, tipoSaldo: 'desconhecido' });
    }
  }, [isOpen]);

  useEffect(() => {
    if (placaViatura) {
      buscarSaldoECota(placaViatura);
    } else {
      setSaldoInfo({ saldoDisponivel: 0, cotaMensal: 0, tipoSaldo: 'desconhecido' });
    }
  }, [placaViatura]);

  const fetchPlacas = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'frota'));
      const placasData = querySnapshot.docs.map((doc) => doc.data().PLACA) as string[];
      setPlacas(placasData);
    } catch (error) {
      console.error('Erro ao buscar placas:', error);
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (!placaViatura || !modeloViatura || !numeroOS || !dataOS || !valorOS || !oficinaResponsavel) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos!",
        variant: "destructive",
      });
      return;
    }

    const valorNumerico = parseFloat(valorOS.replace(/[R$.,\s]/g, '')) / 100;

    if (saldoInfo.tipoSaldo !== 'livre' && valorNumerico > saldoInfo.saldoDisponivel) {
      toast({
        title: "Saldo Insuficiente",
        description: `O valor da OS excede o saldo disponível. Saldo disponível: R$ ${saldoInfo.saldoDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'ordensDeServico'), {
        placaViatura,
        modeloViatura,
        numeroOS,
        dataOS: dataOS.toISOString(),
        valorOS,
        observacao,
        oficinaResponsavel,
      });

      toast({
        title: "OS Criada",
        description: "Ordem de serviço criada com sucesso!",
      });

      onClose();
    } catch (error) {
      console.error('Erro ao criar OS:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar ordem de serviço. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const buscarSaldoECota = async (placa: string) => {
    try {
      console.log('Buscando saldo para placa:', placa);
      
      // Buscar viatura para identificar o tipo
      const frotaSnapshot = await getDocs(collection(db, 'frota'));
      const viatura = frotaSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }) as any)
        .find(v => v.PLACA === placa);

      if (!viatura) {
        console.log('Viatura não encontrada');
        return { saldoDisponivel: 0, cotaMensal: 0, tipoSaldo: 'desconhecido' };
      }

      // Verificar se é frota pesada
      const FROTA_PESADA_PLACAS = ['PMH7342', 'PMH6432', 'HUQ4028', 'OCO3291'];
      const FROTA_PESADA_CADASTROS = ['TA01', 'TA02', 'TA03', 'TP'];
      const cadastroViatura = viatura.cadastro || viatura.id;
      const isFrotePesada = FROTA_PESADA_PLACAS.includes(placa) || 
                           FROTA_PESADA_CADASTROS.includes(cadastroViatura) ||
                           viatura.tipo === 'pesada';

      if (isFrotePesada) {
        // Frota pesada tem saldo livre
        console.log('Frota pesada detectada - saldo livre');
        return { 
          saldoDisponivel: 999999, 
          cotaMensal: 999999, 
          tipoSaldo: 'livre',
          observacao: 'Frota pesada - Saldo livre'
        };
      }

      // Para frota leve, buscar saldo compartilhado
      const agora = new Date();
      const anoAtual = agora.getFullYear();
      
      const saldosSnapshot = await getDocs(collection(db, 'saldosViaturas'));
      const saldoFroteLeve = saldosSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }) as any)
        .find(s => s.tipo === 'frota_leve' && s.anoReferencia === anoAtual);

      if (!saldoFroteLeve) {
        console.log('Configuração de saldo da frota leve não encontrada');
        return { saldoDisponivel: 0, cotaMensal: 0, tipoSaldo: 'compartilhado' };
      }

      const cotaMensal = saldoFroteLeve.saldoMensal || 0;

      // Calcular gastos da frota leve no mês atual
      const mesAtual = agora.getMonth() + 1;
      
      // Buscar todas as viaturas da frota leve
      const todasViaturas = frotaSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any);
      const placasFroteLeve = todasViaturas
        .filter(v => !FROTA_PESADA_PLACAS.includes(v.PLACA) && 
                     !FROTA_PESADA_CADASTROS.includes(v.cadastro || v.id) &&
                     v.tipo !== 'pesada')
        .map(v => v.PLACA);

      // Buscar OS da frota leve no mês atual
      const osSnapshot = await getDocs(collection(db, 'ordensDeServico'));
      const gastoMesAtual = osSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }) as any)
        .filter(os => {
          const dataOS = new Date(os.dataOS);
          return placasFroteLeve.includes(os.placaViatura) &&
                 dataOS.getMonth() + 1 === mesAtual && 
                 dataOS.getFullYear() === anoAtual;
        })
        .reduce((total, os) => {
          const valor = parseFloat(os.valorOS?.replace(/[R$.,\s]/g, '') || '0') / 100;
          return total + valor;
        }, 0);

      const saldoDisponivel = cotaMensal - gastoMesAtual;

      console.log('Saldo frota leve calculado:', {
        cotaMensal,
        gastoMesAtual,
        saldoDisponivel,
        placasFroteLeve: placasFroteLeve.length
      });

      return { 
        saldoDisponivel, 
        cotaMensal, 
        tipoSaldo: 'compartilhado',
        observacao: `Saldo compartilhado da frota leve (${placasFroteLeve.length} viaturas)`
      };

    } catch (error) {
      console.error('Erro ao buscar saldo:', error);
      return { saldoDisponivel: 0, cotaMensal: 0, tipoSaldo: 'erro' };
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Nova Ordem de Serviço
          </DialogTitle>
          <DialogDescription>
            Preencha os campos abaixo para criar uma nova ordem de serviço.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="placa">Placa da Viatura</Label>
              <Select onValueChange={setPlacaViatura} value={placaViatura}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione a placa" />
                </SelectTrigger>
                <SelectContent>
                  {placas.map((placa) => (
                    <SelectItem key={placa} value={placa}>{placa}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="modelo">Modelo da Viatura</Label>
              <Input
                type="text"
                id="modelo"
                value={modeloViatura}
                onChange={(e) => setModeloViatura(e.target.value)}
                placeholder="Ex: Fiat Uno"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="numeroOS">Número da OS</Label>
              <Input
                type="text"
                id="numeroOS"
                value={numeroOS}
                onChange={(e) => setNumeroOS(e.target.value)}
                placeholder="Ex: 123456"
              />
            </div>
            <div>
              <Label htmlFor="dataOS">Data da OS</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dataOS && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataOS ? format(dataOS, "dd/MM/yyyy") : <span>Selecionar Data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataOS}
                    onSelect={setDataOS}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div>
            <Label htmlFor="valorOS">Valor da OS</Label>
            <Input
              type="text"
              id="valorOS"
              value={valorOS}
              onChange={(e) => setValorOS(e.target.value)}
              placeholder="Ex: R$ 150,00"
            />
          </div>

          <div>
            <Label htmlFor="oficina">Oficina Responsável</Label>
            <Input
              type="text"
              id="oficina"
              value={oficinaResponsavel}
              onChange={(e) => setOficinaResponsavel(e.target.value)}
              placeholder="Ex: Auto Mecânica Silva"
            />
          </div>

          <div>
            <Label htmlFor="observacao">Observação</Label>
            <Input
              type="text"
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Troca de óleo e filtro"
            />
          </div>

          {saldoInfo.tipoSaldo !== 'desconhecido' && (
            <div className="rounded-md border p-4 bg-muted">
              <div className="font-semibold">
                <DollarSign className="h-4 w-4 inline-block mr-1" />
                Informações de Saldo
              </div>
              {saldoInfo.tipoSaldo === 'erro' ? (
                <div className="text-red-500 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Erro ao buscar informações de saldo.
                </div>
              ) : (
                <>
                  {saldoInfo.tipoSaldo === 'livre' ? (
                    <div className="text-green-500 flex items-center gap-2">
                      <CheckCheck className="h-4 w-4" />
                      Saldo Livre (Frota Pesada)
                    </div>
                  ) : (
                    <>
                      <div className="text-sm">
                        Cota Mensal: R$ {saldoInfo.cotaMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-sm">
                        Saldo Disponível: R$ {saldoInfo.saldoDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </>
                  )}
                  {saldoInfo.observacao && (
                    <div className="text-xs text-gray-500 mt-1">
                      {saldoInfo.observacao}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                Criando...
                <svg className="animate-spin h-5 w-5 ml-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
              </>
            ) : (
              "Criar OS"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NovaOSForm;
