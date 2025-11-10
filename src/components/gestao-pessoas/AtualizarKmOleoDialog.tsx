import { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Car, Gauge, ArrowLeft, ArrowRight, CheckCircle, SkipForward } from 'lucide-react';

interface Viatura {
  id: string;
  CADASTRO: string;
  PLACA: string;
  MODELO: string;
  KM: number;
  KMOLEO: number;
}

interface AtualizarKmOleoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const VIATURAS_MONITORADAS = [
  'CAV - 04',
  'CAV - 05',
  'CAV - 06',
  'CAV - 08',
  'CAV - 11',
  'CAV - 12',
  'CAV - 13',
  'TA - 01',
  'TA - 02',
  'TA - 03',
  'TP',
  '6398',
  'DUSTER'
];

const AtualizarKmOleoDialog = ({ open, onOpenChange }: AtualizarKmOleoDialogProps) => {
  const [viaturas, setViaturas] = useState<Viatura[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updatedData, setUpdatedData] = useState<{ [id: string]: { KM: number; KMOLEO: number } }>({});
  const { toast } = useToast();

  const [novoKm, setNovoKm] = useState('');
  const [novoKmOleo, setNovoKmOleo] = useState('');

  useEffect(() => {
    if (open) {
      fetchViaturasMonitoradas();
    }
  }, [open]);

  useEffect(() => {
    if (viaturas.length > 0 && currentStep < viaturas.length) {
      const viatura = viaturas[currentStep];
      setNovoKm(viatura.KM.toString());
      setNovoKmOleo(viatura.KMOLEO.toString());
    }
  }, [currentStep, viaturas]);

  const fetchViaturasMonitoradas = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'frota'));
      const todasViaturas = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Viatura[];

      console.log('Buscando viaturas monitoradas. Todas as viaturas:', todasViaturas.map(v => v.CADASTRO));

      const viaturasOrdenadas = VIATURAS_MONITORADAS
        .map(cadastro => {
          // Buscar com e sem espaços para garantir compatibilidade
          const viatura = todasViaturas.find(v => 
            v.CADASTRO === cadastro || 
            v.CADASTRO?.replace(/\s/g, '') === cadastro.replace(/\s/g, '')
          );
          if (!viatura) {
            console.log(`Viatura não encontrada: ${cadastro}`);
          }
          return viatura;
        })
        .filter(v => v !== undefined) as Viatura[];

      console.log('Viaturas encontradas:', viaturasOrdenadas.map(v => v.CADASTRO));
      setViaturas(viaturasOrdenadas);
    } catch (error) {
      console.error('Erro ao buscar viaturas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as viaturas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProximo = () => {
    const viatura = viaturas[currentStep];
    const km = parseInt(novoKm);
    const kmOleo = parseInt(novoKmOleo);

    if (isNaN(km) || isNaN(kmOleo)) {
      toast({
        title: "Dados inválidos",
        description: "Por favor, preencha todos os campos corretamente",
        variant: "destructive"
      });
      return;
    }

    if (km < viatura.KM) {
      toast({
        title: "KM inválida",
        description: "A nova KM deve ser maior ou igual à atual",
        variant: "destructive"
      });
      return;
    }

    // Alerta se já passou da troca de óleo
    if (km >= viatura.KMOLEO) {
      toast({
        title: "⚠️ Atenção: Troca de óleo atrasada!",
        description: `A viatura ${viatura.CADASTRO} já ultrapassou a quilometragem de troca de óleo (${viatura.KMOLEO.toLocaleString()} km)`,
        variant: "destructive"
      });
    }

    const dadosAtualizados = {
      ...updatedData,
      [viatura.id]: { KM: km, KMOLEO: kmOleo }
    };

    setUpdatedData(dadosAtualizados);

    if (currentStep < viaturas.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Finalizar com os dados atualizados incluindo o último veículo
      handleFinalizar(dadosAtualizados);
    }
  };

  const handlePular = () => {
    if (currentStep < viaturas.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinalizar();
    }
  };

  const handleAnterior = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinalizar = async (dadosParaAtualizar = updatedData) => {
    try {
      const updates = Object.entries(dadosParaAtualizar).map(async ([id, data]) => {
        const viaturaRef = doc(db, 'frota', id);
        await updateDoc(viaturaRef, data);
      });

      await Promise.all(updates);

      toast({
        title: "Atualização concluída!",
        description: `${Object.keys(dadosParaAtualizar).length} viaturas foram atualizadas com sucesso`,
      });

      onOpenChange(false);
      setCurrentStep(0);
      setUpdatedData({});
    } catch (error) {
      console.error('Erro ao atualizar viaturas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar as viaturas",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="flex items-center justify-center p-8">
            <p className="text-muted-foreground">Carregando viaturas...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (viaturas.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="flex items-center justify-center p-8">
            <p className="text-muted-foreground">Nenhuma viatura encontrada</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const viatura = viaturas[currentStep];
  const progress = ((currentStep + 1) / viaturas.length) * 100;
  const kmRestante = viatura.KMOLEO - viatura.KM;
  const isUltimaViatura = currentStep === viaturas.length - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Atualizar KM e Troca de Óleo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Viatura {currentStep + 1} de {viaturas.length}
              </span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>

          {/* Info da viatura */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-lg">{viatura.CADASTRO}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Placa:</span>
                <span className="ml-2 font-medium">{viatura.PLACA}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Modelo:</span>
                <span className="ml-2 font-medium">{viatura.MODELO}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm mt-2 pt-2 border-t">
              <div>
                <span className="text-muted-foreground">KM Atual:</span>
                <span className="ml-2 font-medium">{viatura.KM.toLocaleString()} km</span>
              </div>
              <div>
                <span className="text-muted-foreground">Próxima Troca:</span>
                <span className="ml-2 font-medium">{viatura.KMOLEO.toLocaleString()} km</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">KM Restante:</span>
                <span className={`ml-2 font-medium ${kmRestante <= 1000 ? 'text-destructive' : kmRestante <= 3000 ? 'text-orange-500' : 'text-green-500'}`}>
                  {kmRestante.toLocaleString()} km
                </span>
              </div>
            </div>
          </div>

          {/* Inputs */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-2">
                <Gauge className="h-4 w-4" />
                Nova Quilometragem
              </label>
              <Input
                type="number"
                value={novoKm}
                onChange={(e) => setNovoKm(e.target.value)}
                placeholder="Digite a nova quilometragem"
                className="text-lg"
              />
            </div>

            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4" />
                Próxima Troca de Óleo (KM)
              </label>
              <Input
                type="number"
                value={novoKmOleo}
                onChange={(e) => setNovoKmOleo(e.target.value)}
                placeholder="Digite a KM da próxima troca"
                className="text-lg"
              />
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-between gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleAnterior}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Anterior
            </Button>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={handlePular}
              >
                <SkipForward className="h-4 w-4 mr-2" />
                Pular
              </Button>
              <Button onClick={handleProximo}>
                {isUltimaViatura ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Finalizar
                  </>
                ) : (
                  <>
                    Avançar
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AtualizarKmOleoDialog;
