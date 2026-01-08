import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Check } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface MinhasAulasMesSimplificadoProps {
  policialId: string;
}

export const MinhasAulasMesSimplificado = ({ policialId }: MinhasAulasMesSimplificadoProps) => {
  const [aulas, setAulas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mesSelecionado, setMesSelecionado] = useState(new Date());
  const [copiado, setCopiado] = useState(false);

  // Gerar lista de meses (últimos 6 meses e próximo mês)
  const mesesDisponiveis = [];
  for (let i = -6; i <= 1; i++) {
    const data = i < 0 ? subMonths(new Date(), Math.abs(i)) : addMonths(new Date(), i);
    mesesDisponiveis.push({
      value: format(data, 'yyyy-MM'),
      label: format(data, 'MMMM/yyyy', { locale: ptBR })
    });
  }

  useEffect(() => {
    carregarAulas();
  }, [policialId, mesSelecionado]);

  const carregarAulas = async () => {
    setLoading(true);
    try {
      const aulasQuery = query(
        collection(db, 'projetos_aulas'),
        where('instrutores', 'array-contains', policialId),
        where('status', '==', 'encerrada')
      );
      
      const aulasSnapshot = await getDocs(aulasQuery);
      const todasAulas: any[] = aulasSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filtrar pelo mês selecionado
      const inicio = startOfMonth(mesSelecionado);
      const fim = endOfMonth(mesSelecionado);
      
      const aulasDoMes = todasAulas.filter(aula => {
        const aulaData = aula.data?.toDate ? aula.data.toDate() : new Date(aula.data);
        return aulaData >= inicio && aulaData <= fim;
      });
      
      // Ordenar por data
      aulasDoMes.sort((a, b) => {
        const dataA = a.data?.toDate ? a.data.toDate() : new Date(a.data);
        const dataB = b.data?.toDate ? b.data.toDate() : new Date(b.data);
        return dataA.getTime() - dataB.getTime();
      });
      
      setAulas(aulasDoMes);
    } catch (error) {
      console.error('Erro ao carregar aulas:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (data: any) => {
    if (!data) return '';
    const d = data.toDate ? data.toDate() : new Date(data);
    return format(d, 'dd/MM', { locale: ptBR });
  };

  const getTurnoSimples = (turno: string | number) => {
    if (typeof turno === 'string') {
      if (turno.toLowerCase().includes('manhã') || turno.toLowerCase().includes('manha')) {
        return 'Manhã';
      }
      if (turno.toLowerCase().includes('tarde')) {
        return 'Tarde';
      }
      return turno;
    }
    return turno === 1 ? 'Manhã' : 'Tarde';
  };

  const handleMesChange = (value: string) => {
    const [ano, mes] = value.split('-');
    setMesSelecionado(new Date(parseInt(ano), parseInt(mes) - 1, 1));
  };

  const copiarParaClipboard = () => {
    const texto = aulas.map(aula => {
      const data = formatarData(aula.data);
      const turno = getTurnoSimples(aula.turnoNome || aula.turno);
      return `${data} - ${turno}`;
    }).join('\n');
    
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    toast.success('Lista copiada para a área de transferência!');
    
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Minhas Aulas do Mês</CardTitle>
          <Select 
            value={format(mesSelecionado, 'yyyy-MM')} 
            onValueChange={handleMesChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {mesesDisponiveis.map(mes => (
                <SelectItem key={mes.value} value={mes.value}>
                  {mes.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-center py-4">Carregando...</p>
        ) : aulas.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Nenhuma aula neste mês.
          </p>
        ) : (
          <>
            <div className="bg-muted rounded-lg p-3 mb-4 font-mono text-sm space-y-1">
              {aulas.map((aula, idx) => (
                <div key={aula.id || idx}>
                  {formatarData(aula.data)} - {getTurnoSimples(aula.turnoNome || aula.turno)}
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Total: {aulas.length} aulas ({aulas.length * 3}h)
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={copiarParaClipboard}
              >
                {copiado ? (
                  <><Check className="h-4 w-4 mr-2" /> Copiado!</>
                ) : (
                  <><Copy className="h-4 w-4 mr-2" /> Copiar Lista</>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
