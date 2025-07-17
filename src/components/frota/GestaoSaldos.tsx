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
import { DollarSign, Truck, Car } from 'lucide-react';

interface SaldoConfig {
  id: string;
  tipo: 'individual' | 'frota_pesada';
  viaturaId?: string;
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
}

interface GestaoSaldosProps {
  isOpen: boolean;
  onClose: () => void;
}

const FROTA_PESADA = ['TA01', 'TA02', 'TA03', 'TP'];

const GestaoSaldos = ({ isOpen, onClose }: GestaoSaldosProps) => {
  const [viaturas, setViaturas] = useState<Viatura[]>([]);
  const [saldos, setSaldos] = useState<SaldoConfig[]>([]);
  const [saldoFrotaPesada, setSaldoFrotaPesada] = useState({ mensal: 0, anual: 0 });
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

      // Configurar saldo da frota pesada
      const saldoFrotaPesadaDoc = saldosData.find(s => s.tipo === 'frota_pesada' && s.anoReferencia === anoAtual);
      if (saldoFrotaPesadaDoc) {
        setSaldoFrotaPesada({
          mensal: saldoFrotaPesadaDoc.saldoMensal,
          anual: saldoFrotaPesadaDoc.saldo12Meses
        });
      }
    } catch (error) {
      console.error('Erro ao buscar saldos:', error);
    }
  };

  const getSaldoViatura = (viaturaId: string) => {
    const saldo = saldos.find(s => s.viaturaId === viaturaId && s.anoReferencia === anoAtual);
    return saldo || { saldoMensal: 0, saldo12Meses: 0 };
  };

  const handleSalvarSaldoViatura = async (viaturaId: string, saldoMensal: number, saldo12Meses: number) => {
    try {
      const docId = `${viaturaId}_${anoAtual}`;
      const saldoConfig: SaldoConfig = {
        id: docId,
        tipo: 'individual',
        viaturaId,
        saldoMensal,
        saldo12Meses,
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
        description: `Saldo da viatura ${viaturaId} salvo com sucesso.`,
      });
    } catch (error) {
      console.error('Erro ao salvar saldo:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar saldo da viatura.",
        variant: "destructive",
      });
    }
  };

  const handleSalvarSaldoFrotaPesada = async () => {
    try {
      const docId = `frota_pesada_${anoAtual}`;
      const saldoConfig: SaldoConfig = {
        id: docId,
        tipo: 'frota_pesada',
        saldoMensal: saldoFrotaPesada.mensal,
        saldo12Meses: saldoFrotaPesada.anual,
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
        description: "Saldo da frota pesada salvo com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao salvar saldo da frota pesada:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar saldo da frota pesada.",
        variant: "destructive",
      });
    }
  };

  const viaturasFroteLeve = viaturas.filter(v => !FROTA_PESADA.includes(v.cadastro || v.id));
  const viaturasFrotePesada = viaturas.filter(v => FROTA_PESADA.includes(v.cadastro || v.id));

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
          {/* Frota Pesada */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Frota Pesada (Saldo Compartilhado)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground mb-2">
                Viaturas: {viaturasFrotePesada.map(v => v.cadastro || v.id).join(', ')}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="saldo-mensal-pesada">Saldo Mensal</Label>
                  <Input
                    id="saldo-mensal-pesada"
                    type="number"
                    value={saldoFrotaPesada.mensal}
                    onChange={(e) => setSaldoFrotaPesada(prev => ({ ...prev, mensal: Number(e.target.value) }))}
                    placeholder="Ex: 10000"
                  />
                </div>
                <div>
                  <Label htmlFor="saldo-anual-pesada">Saldo 12 Meses</Label>
                  <Input
                    id="saldo-anual-pesada"
                    type="number"
                    value={saldoFrotaPesada.anual}
                    onChange={(e) => setSaldoFrotaPesada(prev => ({ ...prev, anual: Number(e.target.value) }))}
                    placeholder="Ex: 100000"
                  />
                </div>
              </div>
              
              <Button onClick={handleSalvarSaldoFrotaPesada} className="w-full">
                Salvar Saldo da Frota Pesada
              </Button>
            </CardContent>
          </Card>

          <Separator />

          {/* Frota Leve */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Frota Leve (Saldos Individuais)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {viaturasFroteLeve.map((viatura) => {
                  const saldoAtual = getSaldoViatura(viatura.id);
                  return (
                    <SaldoViaturaCard
                      key={viatura.id}
                      viatura={viatura}
                      saldoAtual={saldoAtual}
                      onSalvar={handleSalvarSaldoViatura}
                    />
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface SaldoViaturaCardProps {
  viatura: Viatura;
  saldoAtual: any;
  onSalvar: (viaturaId: string, saldoMensal: number, saldo12Meses: number) => void;
}

const SaldoViaturaCard = ({ viatura, saldoAtual, onSalvar }: SaldoViaturaCardProps) => {
  const [saldoMensal, setSaldoMensal] = useState(saldoAtual.saldoMensal || 0);
  const [saldo12Meses, setSaldo12Meses] = useState(saldoAtual.saldo12Meses || 0);

  const handleSalvar = () => {
    onSalvar(viatura.id, saldoMensal, saldo12Meses);
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">
          {viatura.cadastro || viatura.id} - {viatura.PLACA}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label htmlFor={`saldo-mensal-${viatura.id}`}>Saldo Mensal</Label>
          <Input
            id={`saldo-mensal-${viatura.id}`}
            type="number"
            value={saldoMensal}
            onChange={(e) => setSaldoMensal(Number(e.target.value))}
            placeholder="Ex: 3000"
            className="text-sm"
          />
        </div>
        <div>
          <Label htmlFor={`saldo-anual-${viatura.id}`}>Saldo 12 Meses</Label>
          <Input
            id={`saldo-anual-${viatura.id}`}
            type="number"
            value={saldo12Meses}
            onChange={(e) => setSaldo12Meses(Number(e.target.value))}
            placeholder="Ex: 30000"
            className="text-sm"
          />
        </div>
        <Button onClick={handleSalvar} size="sm" className="w-full">
          Salvar
        </Button>
      </CardContent>
    </Card>
  );
};

export default GestaoSaldos;