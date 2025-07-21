
import { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Truck, Car, Info } from 'lucide-react';

interface SaldoConfig {
  id: string;
  tipo: 'frota_leve';
  saldoMensal: number;
  saldo12Meses: number;
  mesReferencia: string;
  anoReferencia: number;
}

interface Viatura {
  id: string;
  MODELO: string;
  PLACA: string;
  cadastro?: string;
  tipo?: 'leve' | 'pesada';
}

interface GestaoSaldosProps {
  isOpen: boolean;
  onClose: () => void;
}

const FROTA_PESADA_PLACAS = ['PMH7342', 'PMH6432', 'HUQ4028', 'OCO3291'];
const FROTA_PESADA_CADASTROS = ['TA01', 'TA02', 'TA03', 'TP'];

const GestaoSaldos = ({ isOpen, onClose }: GestaoSaldosProps) => {
  const [viaturas, setViaturas] = useState<Viatura[]>([]);
  const [saldos, setSaldos] = useState<SaldoConfig[]>([]);
  const [saldoFroteLeve, setSaldoFroteLeve] = useState({ mensal: 0, anual: 0 });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const mesAtual = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const anoAtual = new Date().getFullYear();

  useEffect(() => {
    if (isOpen) {
      fetchViaturas();
      fetchSaldos();
    }
  }, [isOpen]);

  const fetchViaturas = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'frota'));
      const viaturasData: Viatura[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Viatura[];
      setViaturas(viaturasData);
    } catch (error) {
      console.error('Erro ao buscar viaturas:', error);
    }
  };

  const fetchSaldos = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'saldosViaturas'));
      const saldosData: SaldoConfig[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as SaldoConfig[];
      setSaldos(saldosData);

      // Configurar saldo da frota leve
      const saldoFroteLeveDoc = saldosData.find(s => s.tipo === 'frota_leve' && s.anoReferencia === anoAtual);
      if (saldoFroteLeveDoc) {
        setSaldoFroteLeve({
          mensal: saldoFroteLeveDoc.saldoMensal,
          anual: saldoFroteLeveDoc.saldo12Meses
        });
      }
    } catch (error) {
      console.error('Erro ao buscar saldos:', error);
    }
  };

  const handleSalvarSaldoFroteLeve = async () => {
    try {
      const docId = `frota_leve_${anoAtual}`;
      const saldoConfig: SaldoConfig = {
        id: docId,
        tipo: 'frota_leve',
        saldoMensal: saldoFroteLeve.mensal,
        saldo12Meses: saldoFroteLeve.anual,
        mesReferencia: mesAtual,
        anoReferencia: anoAtual
      };

      await setDoc(doc(db, 'saldosViaturas', docId), saldoConfig);
      
      // Atualizar estado local
      setSaldos(prev => {
        const filtered = prev.filter(s => s.id !== docId);
        return [...filtered, saldoConfig];
      });

      toast({
        title: "Saldo salvo",
        description: "Saldo da frota leve salvo com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao salvar saldo da frota leve:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar saldo da frota leve.",
        variant: "destructive",
      });
    }
  };

  const viaturasFroteLeve = viaturas.filter(v => 
    !FROTA_PESADA_PLACAS.includes(v.PLACA) && 
    !FROTA_PESADA_CADASTROS.includes(v.cadastro || v.id) &&
    v.tipo !== 'pesada'
  );
  
  const viaturasFrotePesada = viaturas.filter(v => 
    FROTA_PESADA_PLACAS.includes(v.PLACA) || 
    FROTA_PESADA_CADASTROS.includes(v.cadastro || v.id) ||
    v.tipo === 'pesada'
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <DollarSign className="h-6 w-6" />
            Gestão de Saldos - {mesAtual}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Frota Leve */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Frota Leve (Saldo Compartilhado)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground mb-2">
                Viaturas: {viaturasFroteLeve.map(v => v.cadastro || v.id).join(', ')}
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                <div className="flex items-center gap-2 text-blue-800 text-sm">
                  <Info className="h-4 w-4" />
                  <span className="font-medium">
                    Todas as viaturas da frota leve compartilham este saldo único
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="saldo-mensal-leve">Saldo Mensal</Label>
                  <Input
                    id="saldo-mensal-leve"
                    type="number"
                    value={saldoFroteLeve.mensal}
                    onChange={(e) => setSaldoFroteLeve(prev => ({ ...prev, mensal: Number(e.target.value) }))}
                    placeholder="Ex: 30000"
                  />
                </div>
                <div>
                  <Label htmlFor="saldo-anual-leve">Saldo 12 Meses</Label>
                  <Input
                    id="saldo-anual-leve"
                    type="number"
                    value={saldoFroteLeve.anual}
                    onChange={(e) => setSaldoFroteLeve(prev => ({ ...prev, anual: Number(e.target.value) }))}
                    placeholder="Ex: 300000"
                  />
                </div>
              </div>
              
              <Button onClick={handleSalvarSaldoFroteLeve} className="w-full">
                Salvar Saldo da Frota Leve
              </Button>
            </CardContent>
          </Card>

          <Separator />

          {/* Frota Pesada */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Frota Pesada (Saldo Livre)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-4">
                Viaturas: {viaturasFrotePesada.map(v => v.cadastro || v.id).join(', ')}
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex items-center gap-2 text-green-800 mb-2">
                  <Info className="h-4 w-4" />
                  <span className="font-medium">Saldo Livre</span>
                </div>
                <p className="text-green-700 text-sm">
                  A frota pesada não possui limitação de saldo. As viaturas podem realizar 
                  serviços sem restrições de valor mensal ou anual.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {viaturasFrotePesada.map((viatura) => (
                  <Card key={viatura.id} className="border-green-200 bg-green-50/30">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <h3 className="font-semibold text-sm">
                          {viatura.cadastro || viatura.id} - {viatura.PLACA}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {viatura.MODELO}
                        </p>
                        <div className="mt-2 px-2 py-1 bg-green-100 rounded text-green-800 text-xs font-medium">
                          Saldo Livre
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GestaoSaldos;
