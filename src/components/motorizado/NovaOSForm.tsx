
import { useState, useEffect } from 'react';
import { addDoc, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { 
  CalendarIcon, 
  Plus, 
  Car, 
  Wrench, 
  DollarSign, 
  AlertTriangle,
  CheckCircle,
  RefreshCw 
} from 'lucide-react';
import { Viatura } from '@/bot/types';
import { ViaturaFipe } from '@/types/fipe';
import { isFroteLeve, isFrotePesada, buscarViaturasLeves, buscarViaturasPesadas, limparCacheViaturas } from '@/lib/viaturaUtils';

interface NovaOSFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const NovaOSForm = ({ onClose, onSuccess }: NovaOSFormProps) => {
  const [viaturas, setViaturas] = useState<Viatura[]>([]);
  const [viaturasSaldos, setViaturasSaldos] = useState<Record<string, any>>({});
  const [fipeData, setFipeData] = useState<Record<string, ViaturaFipe>>({});
  const [loading, setLoading] = useState(false);
  const [loadingViaturas, setLoadingViaturas] = useState(true);
  const { toast } = useToast();

  // Dados do formulário
  const [placaViatura, setPlacaViatura] = useState('');
  const [cadastroViatura, setCadastroViatura] = useState('');
  const [modeloViatura, setModeloViatura] = useState('');
  const [numeroOS, setNumeroOS] = useState('');
  const [dataOS, setDataOS] = useState<Date>();
  const [valorOS, setValorOS] = useState('');
  const [observacao, setObservacao] = useState('');
  const [oficinaResponsavel, setOficinaResponsavel] = useState('');
  const [tipoFrota, setTipoFrota] = useState('');

  // Estados para validações
  const [limitesValidacao, setLimitesValidacao] = useState({
    mensal: { excedido: false, valor: 0, limite: 0 },
    anual: { excedido: false, valor: 0, limite: 0 },
    porOS: { excedido: false, valor: 0, limite: 0 }
  });

  useEffect(() => {
    carregarViaturas();
    carregarDadosFipe();
  }, []);

  useEffect(() => {
    if (placaViatura && viaturas.length > 0) {
      atualizarSaldosViatura();
    }
  }, [placaViatura, viaturas]);

  useEffect(() => {
    if (valorOS && placaViatura) {
      validarLimites();
    }
  }, [valorOS, placaViatura, viaturasSaldos, fipeData]);

  const carregarViaturas = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'frota'));
      const viaturasData: Viatura[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Viatura[];

      // Ordenar viaturas
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
      console.error('Erro ao carregar viaturas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar viaturas. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoadingViaturas(false);
    }
  };

  const carregarDadosFipe = async () => {
    try {
      const q = query(
        collection(db, 'viaturasFipe'),
        where('ativo', '==', true)
      );
      const querySnapshot = await getDocs(q);
      const fipeMap: Record<string, ViaturaFipe> = {};
      
      querySnapshot.docs.forEach(doc => {
        const data = { id: doc.id, ...doc.data() } as ViaturaFipe;
        fipeMap[data.placa] = data;
      });
      
      setFipeData(fipeMap);
    } catch (error) {
      console.error('Erro ao carregar dados FIPE:', error);
    }
  };

  const atualizarSaldosViatura = async () => {
    const viaturaSelecionada = viaturas.find(v => v.PLACA === placaViatura);
    if (!viaturaSelecionada) return;

    setCadastroViatura(viaturaSelecionada.CADASTRO || '');
    setModeloViatura(viaturaSelecionada.MODELO || '');

    // Determinar tipo da frota
    const ehFrotePesada = isFrotePesada(viaturaSelecionada);
    const ehFroteLeve = isFroteLeve(viaturaSelecionada);
    
    if (ehFrotePesada) {
      setTipoFrota('pesada');
    } else if (ehFroteLeve) {
      setTipoFrota('leve');
    } else {
      setTipoFrota('indefinido');
    }

    try {
      const agora = new Date();
      const mesAtual = agora.getMonth();
      const anoAtual = agora.getFullYear();
      const doze_meses_atras = new Date();
      doze_meses_atras.setMonth(agora.getMonth() - 12);

      // Buscar todas as OS
      const osSnapshot = await getDocs(collection(db, 'ordensDeServico'));
      const todasOS = osSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));

      let saldoMensal = 0;
      let gastoMesAtual = 0;
      let gastoUltimos12Meses = 0;

      if (ehFrotePesada) {
        // Frota pesada: saldo livre, calcular apenas gastos
        gastoMesAtual = todasOS
          .filter(os => {
            if (os.placaViatura !== placaViatura) return false;
            const dataOS = new Date(os.dataOS);
            return dataOS.getMonth() === mesAtual && dataOS.getFullYear() === anoAtual;
          })
          .reduce((total, os) => {
            const valor = parseFloat(os.valorOS?.replace(/[R$.,\s]/g, '') || '0') / 100;
            return total + valor;
          }, 0);

        gastoUltimos12Meses = todasOS
          .filter(os => {
            if (os.placaViatura !== placaViatura) return false;
            const dataOS = new Date(os.dataOS);
            return dataOS >= doze_meses_atras && dataOS <= agora;
          })
          .reduce((total, os) => {
            const valor = parseFloat(os.valorOS?.replace(/[R$.,\s]/g, '') || '0') / 100;
            return total + valor;
          }, 0);

        saldoMensal = 999999; // Saldo livre
      } else if (ehFroteLeve) {
        // Frota leve: saldo compartilhado
        try {
          const saldosSnapshot = await getDocs(collection(db, 'saldosViaturas'));
          const saldoFroteLeve = saldosSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .find(s => s.tipo === 'frota_leve' && s.anoReferencia === anoAtual);
          
          saldoMensal = saldoFroteLeve?.saldoMensal || 45000;

          // Buscar placas da frota leve dinamicamente
          const viaturasLeves = await buscarViaturasLeves();
          const placasFroteLeve = viaturasLeves.map(v => v.PLACA);

          gastoMesAtual = todasOS
            .filter(os => {
              const dataOS = new Date(os.dataOS);
              return placasFroteLeve.includes(os.placaViatura) &&
                     dataOS.getMonth() === mesAtual && 
                     dataOS.getFullYear() === anoAtual;
            })
            .reduce((total, os) => {
              const valor = parseFloat(os.valorOS?.replace(/[R$.,\s]/g, '') || '0') / 100;
              return total + valor;
            }, 0);

          gastoUltimos12Meses = todasOS
            .filter(os => {
              if (os.placaViatura !== placaViatura) return false;
              const dataOS = new Date(os.dataOS);
              return dataOS >= doze_meses_atras && dataOS <= agora;
            })
            .reduce((total, os) => {
              const valor = parseFloat(os.valorOS?.replace(/[R$.,\s]/g, '') || '0') / 100;
              return total + valor;
            }, 0);

        } catch (error) {
          console.error('Erro ao buscar saldo da frota leve:', error);
        }
      }

      setViaturasSaldos(prev => ({
        ...prev,
        [placaViatura]: {
          saldoMensal,
          gastoMesAtual,
          gastoUltimos12Meses,
          saldoDisponivelMes: Math.max(0, saldoMensal - gastoMesAtual),
          tipo: ehFrotePesada ? 'pesada' : ehFroteLeve ? 'leve' : 'indefinido'
        }
      }));

    } catch (error) {
      console.error('Erro ao calcular saldos:', error);
    }
  };

  const validarLimites = () => {
    const valorOSNumerico = parseFloat(valorOS.replace(/[.,]/g, '.')) || 0;
    const saldoViatura = viaturasSaldos[placaViatura];
    const dadosFipe = fipeData[placaViatura];

    if (!saldoViatura) return;

    let validacao = {
      mensal: { excedido: false, valor: 0, limite: 0 },
      anual: { excedido: false, valor: 0, limite: 0 },
      porOS: { excedido: false, valor: 0, limite: 0 }
    };

    // Validação mensal (apenas para frota leve)
    if (saldoViatura.tipo === 'leve') {
      const novoGastoMensal = saldoViatura.gastoMesAtual + valorOSNumerico;
      validacao.mensal = {
        excedido: novoGastoMensal > saldoViatura.saldoMensal,
        valor: novoGastoMensal,
        limite: saldoViatura.saldoMensal
      };
    }

    // Validação anual e por OS (baseada em FIPE)
    if (dadosFipe) {
      const valorFipeReais = dadosFipe.valorFipe / 100;
      const limiteAnual = valorFipeReais * 0.70;
      const limitePorOS = valorFipeReais * 0.20;
      
      const novoGastoAnual = saldoViatura.gastoUltimos12Meses + valorOSNumerico;
      
      validacao.anual = {
        excedido: novoGastoAnual > limiteAnual,
        valor: novoGastoAnual,
        limite: limiteAnual
      };

      validacao.porOS = {
        excedido: valorOSNumerico > limitePorOS,
        valor: valorOSNumerico,
        limite: limitePorOS
      };
    }

    setLimitesValidacao(validacao);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar se há excesso de limites críticos
    if (limitesValidacao.mensal.excedido || limitesValidacao.anual.excedido || limitesValidacao.porOS.excedido) {
      toast({
        title: "Limite excedido",
        description: "Esta OS excede os limites configurados. Verifique os valores antes de continuar.",
        variant: "destructive",
      });
      return;
    }

    if (!placaViatura || !numeroOS || !dataOS || !valorOS || !observacao || !oficinaResponsavel) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      await addDoc(collection(db, 'ordensDeServico'), {
        placaViatura,
        cadastroViatura,
        modeloViatura,
        numeroOS,
        dataOS: dataOS.toISOString(),
        valorOS,
        observacao,
        oficinaResponsavel,
        tipoFrota,
        criadoEm: new Date().toISOString(),
      });

      // Limpar cache para garantir dados atualizados
      limparCacheViaturas();

      toast({
        title: "OS criada com sucesso",
        description: `Ordem de serviço ${numeroOS} foi registrada.`,
      });

      onSuccess?.();
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

  const saldoViatura = placaViatura ? viaturasSaldos[placaViatura] : null;
  const dadosFipe = placaViatura ? fipeData[placaViatura] : null;

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Nova Ordem de Serviço
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Seleção da Viatura */}
          <div>
            <Label htmlFor="viatura">Viatura *</Label>
            <Select value={placaViatura} onValueChange={setPlacaViatura} disabled={loadingViaturas}>
              <SelectTrigger>
                <SelectValue placeholder={loadingViaturas ? "Carregando viaturas..." : "Selecione a viatura"} />
              </SelectTrigger>
              <SelectContent>
                {viaturas.map((viatura) => (
                  <SelectItem key={viatura.id} value={viatura.PLACA}>
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      <span>{viatura.CADASTRO || viatura.id} - {viatura.PLACA}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Informações da Viatura Selecionada */}
          {saldoViatura && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Tipo de Frota:</span>
                    <Badge variant={
                      saldoViatura.tipo === 'pesada' ? 'destructive' : 
                      saldoViatura.tipo === 'leve' ? 'default' : 'secondary'
                    }>
                      {saldoViatura.tipo === 'pesada' ? 'Pesada' :
                       saldoViatura.tipo === 'leve' ? 'Leve' : 'Indefinido'}
                    </Badge>
                  </div>
                  
                  {saldoViatura.tipo === 'leve' && (
                    <div className="flex items-center justify-between text-sm">
                      <span>Saldo Mensal Disponível:</span>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(saldoViatura.saldoDisponivelMes)}
                      </span>
                    </div>
                  )}

                  {dadosFipe && (
                    <div className="space-y-1 text-sm border-t pt-2">
                      <div className="flex items-center justify-between">
                        <span>Valor FIPE:</span>
                        <span className="font-semibold">{formatCurrency(dadosFipe.valorFipe / 100)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Limite Anual (70%):</span>
                        <span className="font-semibold text-blue-600">
                          {formatCurrency((dadosFipe.valorFipe / 100) * 0.70)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Limite por OS (20%):</span>
                        <span className="font-semibold text-orange-600">
                          {formatCurrency((dadosFipe.valorFipe / 100) * 0.20)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dados da OS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="numeroOS">Número da OS *</Label>
              <Input
                id="numeroOS"
                value={numeroOS}
                onChange={(e) => setNumeroOS(e.target.value)}
                placeholder="Ex: OS-2024-001"
                required
              />
            </div>

            <div>
              <Label>Data da OS *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dataOS && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataOS ? format(dataOS, "dd/MM/yyyy") : "Selecionar data"}
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
            <Label htmlFor="valorOS">Valor da OS (R$) *</Label>
            <Input
              id="valorOS"
              type="number"
              step="0.01"
              value={valorOS}
              onChange={(e) => setValorOS(e.target.value)}
              placeholder="Ex: 1500.00"
              required
            />
          </div>

          {/* Alertas de Validação */}
          {valorOS && placaViatura && (
            <div className="space-y-2">
              {limitesValidacao.mensal.excedido && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Limite mensal excedido!</strong> Este valor excede o saldo mensal disponível da frota leve 
                    ({formatCurrency(limitesValidacao.mensal.valor)} > {formatCurrency(limitesValidacao.mensal.limite)})
                  </AlertDescription>
                </Alert>
              )}

              {limitesValidacao.anual.excedido && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Limite anual excedido!</strong> Este valor excede 70% do valor FIPE nos últimos 12 meses 
                    ({formatCurrency(limitesValidacao.anual.valor)} > {formatCurrency(limitesValidacao.anual.limite)})
                  </AlertDescription>
                </Alert>
              )}

              {limitesValidacao.porOS.excedido && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Limite por OS excedido!</strong> Este valor excede 20% do valor FIPE 
                    ({formatCurrency(limitesValidacao.porOS.valor)} > {formatCurrency(limitesValidacao.porOS.limite)})
                  </AlertDescription>
                </Alert>
              )}

              {!limitesValidacao.mensal.excedido && !limitesValidacao.anual.excedido && !limitesValidacao.porOS.excedido && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Valor dentro dos limites!</strong> Esta OS está dentro de todos os limites configurados.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="oficinaResponsavel">Oficina Responsável *</Label>
            <Select value={oficinaResponsavel} onValueChange={setOficinaResponsavel}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a oficina" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Oficina Central">Oficina Central</SelectItem>
                <SelectItem value="Oficina Norte">Oficina Norte</SelectItem>
                <SelectItem value="Oficina Sul">Oficina Sul</SelectItem>
                <SelectItem value="Terceirizada A">Terceirizada A</SelectItem>
                <SelectItem value="Terceirizada B">Terceirizada B</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="observacao">Observação *</Label>
            <Textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Descreva o serviço realizado, peças trocadas, etc."
              className="min-h-[100px]"
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || limitesValidacao.mensal.excedido || limitesValidacao.anual.excedido || limitesValidacao.porOS.excedido}
              className="flex-1"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar OS
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default NovaOSForm;
