import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Car } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import {
  VIATURAS_CONTROLE_KM,
  isNumeric,
  calcularKmRodada,
  calcularLitrosPorKm,
  formatarValorOuTraco,
} from '@/lib/kmUtils';

export interface ControleKmViatura {
  placa: string;
  kmAtual: string | number;
  kmAnterior: number;
  kmRodada: number | null;
  valorAbastecimento?: number;
  litros?: number;
  motorista?: string;
}

interface Secao05ControleKmFormProps {
  controleKm: ControleKmViatura[];
  setControleKm: (controle: ControleKmViatura[]) => void;
}

const Secao05ControleKmForm = ({
  controleKm,
  setControleKm,
}: Secao05ControleKmFormProps) => {
  const [loading, setLoading] = useState(true);

  // Carregar KM anterior das viaturas do Firebase
  useEffect(() => {
    const carregarKmAnterior = async () => {
      setLoading(true);
      try {
        const viaturasRef = collection(db, 'frota');
        const q = query(viaturasRef, where('PLACA', 'in', VIATURAS_CONTROLE_KM));
        const querySnapshot = await getDocs(q);

        const kmAnteriorMap: { [placa: string]: number } = {};
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const placa = data.PLACA;
          const km = data.KM || 0;
          kmAnteriorMap[placa] = km;
        });

        // Inicializar controleKm com todas as viaturas
        const controleInicial: ControleKmViatura[] = VIATURAS_CONTROLE_KM.map((placa) => ({
          placa,
          kmAtual: '',
          kmAnterior: kmAnteriorMap[placa] || 0,
          kmRodada: null,
          valorAbastecimento: undefined,
          litros: undefined,
          motorista: '',
        }));

        setControleKm(controleInicial);
      } catch (error) {
        console.error('Erro ao carregar KM anterior das viaturas:', error);
      } finally {
        setLoading(false);
      }
    };

    if (controleKm.length === 0) {
      carregarKmAnterior();
    } else {
      setLoading(false);
    }
  }, []);

  const atualizarViatura = (placa: string, campo: keyof ControleKmViatura, valor: any) => {
    setControleKm(
      controleKm.map((v) => {
        if (v.placa !== placa) return v;

        const viaturaAtualizada = { ...v, [campo]: valor };

        // Recalcular KM rodada se mudou KM atual
        if (campo === 'kmAtual') {
          viaturaAtualizada.kmRodada = calcularKmRodada(valor, v.kmAnterior);
        }

        return viaturaAtualizada;
      })
    );
  };

  const calcularLKm = (viatura: ControleKmViatura): string => {
    if (!viatura.litros || !viatura.kmRodada) return '-';
    const lKm = calcularLitrosPorKm(viatura.litros, viatura.kmRodada);
    return lKm ? lKm.toFixed(2) : '-';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            05. CONTROLE DE QUILOMETRAGEM DAS VTRs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Carregando dados das viaturas...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Car className="h-5 w-5" />
          05. CONTROLE DE QUILOMETRAGEM DAS VTRs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">VIATURA</TableHead>
                <TableHead className="w-[120px]">KM ATUAL</TableHead>
                <TableHead className="w-[100px]">KM ANT.</TableHead>
                <TableHead className="w-[100px]">KM ROD.</TableHead>
                <TableHead className="w-[120px]">ABAST. (R$)</TableHead>
                <TableHead className="w-[100px]">LITROS</TableHead>
                <TableHead className="w-[100px]">L/KM</TableHead>
                <TableHead className="w-[180px]">MOTORISTA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {controleKm.map((viatura) => (
                <TableRow key={viatura.placa}>
                  <TableCell className="font-medium">{viatura.placa}</TableCell>
                  <TableCell>
                    <Input
                      placeholder="KM ou texto"
                      value={viatura.kmAtual}
                      onChange={(e) => atualizarViatura(viatura.placa, 'kmAtual', e.target.value)}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatarValorOuTraco(viatura.kmAnterior)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatarValorOuTraco(viatura.kmRodada)}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={viatura.valorAbastecimento || ''}
                      onChange={(e) =>
                        atualizarViatura(viatura.placa, 'valorAbastecimento', parseFloat(e.target.value) || undefined)
                      }
                      className="h-8"
                      step="0.01"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      placeholder="0"
                      value={viatura.litros || ''}
                      onChange={(e) =>
                        atualizarViatura(viatura.placa, 'litros', parseFloat(e.target.value) || undefined)
                      }
                      className="h-8"
                      step="0.01"
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {calcularLKm(viatura)}
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="Nome do motorista"
                      value={viatura.motorista || ''}
                      onChange={(e) => atualizarViatura(viatura.placa, 'motorista', e.target.value)}
                      className="h-8"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          * KM Atual pode ser número ou texto (ex: "HTC"). Apenas valores numéricos atualizarão o banco de dados.
        </p>
      </CardContent>
    </Card>
  );
};

export default Secao05ControleKmForm;
