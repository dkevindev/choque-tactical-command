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
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from 'sonner';
import {
  VIATURAS_CONTROLE_KM,
  MAPA_VIATURAS_CADASTRO,
  isNumeric,
  calcularKmRodada,
  calcularLitrosPorKm,
  formatarValorOuTraco,
} from '@/lib/kmUtils';
import PolicialSearchCombobox from './PolicialSearchCombobox';

export interface ControleKmViatura {
  placa: string;
  kmAtual: string | number;
  kmAnterior: number;
  kmRodada: number | null;
  valorAbastecimento?: number;
  litros?: number;
  motorista?: string;
  motoristaId?: string;
  motoristaNome?: string;
  docIdFrota?: string;
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
        const querySnapshot = await getDocs(viaturasRef);

        const kmAnteriorMap: { [placa: string]: { km: number, docId: string } } = {};
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const cadastro = data.CADASTRO;
          const placa = data.PLACA;
          
          // Verificar se o cadastro ou placa corresponde a alguma viatura monitorada
          const placaExibicao = Object.keys(MAPA_VIATURAS_CADASTRO).find(
            key => {
              const variacoes = MAPA_VIATURAS_CADASTRO[key];
              return variacoes.some(variacao => 
                variacao === cadastro || 
                variacao === placa ||
                variacao.replace(/\s/g, '') === (cadastro || '').replace(/\s/g, '') ||
                variacao.replace(/\s/g, '') === (placa || '').replace(/\s/g, '')
              );
            }
          );
          
          if (placaExibicao) {
            console.log(`✅ Viatura encontrada: ${placaExibicao} -> CADASTRO: ${cadastro}, PLACA: ${placa}, KM: ${data.KM}`);
            kmAnteriorMap[placaExibicao] = {
              km: data.KM || 0,
              docId: doc.id
            };
          }
        });

        console.log('KM Anterior carregado:', kmAnteriorMap);

        // Inicializar controleKm com todas as viaturas
        const controleInicial: ControleKmViatura[] = VIATURAS_CONTROLE_KM.map((placa) => ({
          placa,
          kmAtual: '',
          kmAnterior: kmAnteriorMap[placa]?.km || 0,
          kmRodada: null,
          valorAbastecimento: undefined,
          litros: undefined,
          motorista: '',
          motoristaId: '',
          motoristaNome: '',
          docIdFrota: kmAnteriorMap[placa]?.docId || '',
        }));

        setControleKm(controleInicial);
      } catch (error) {
        console.error('Erro ao carregar KM anterior das viaturas:', error);
        toast.error('Erro ao carregar dados das viaturas');
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
                  <div className="flex items-center gap-2">
                    <PolicialSearchCombobox
                      value={viatura.motoristaId || ''}
                      onSelect={(policialData) => {
                        if (policialData) {
                          atualizarViatura(viatura.placa, 'motoristaId', policialData.id);
                          atualizarViatura(viatura.placa, 'motoristaNome', 
                            `${policialData.posto} ${policialData.numeral} ${policialData.nomeGuerra}`.trim()
                          );
                        } else {
                          atualizarViatura(viatura.placa, 'motoristaId', '');
                          atualizarViatura(viatura.placa, 'motoristaNome', '');
                        }
                      }}
                      compact
                    />
                    {viatura.motoristaNome && (
                      <span className="text-sm font-medium text-foreground">
                        {viatura.motoristaNome}
                      </span>
                    )}
                  </div>
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
