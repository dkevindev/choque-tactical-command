import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Wheat } from 'lucide-react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

export interface AlimentacaoSolipede {
  id: string;
  tipoAlimentacao: string;
  entrada: number;
  saida: number;
  saldoAnterior: number;
  consumo: number;
  saldoAtual: number;
}

interface Secao08AlimentacaoSolipedesFormProps {
  alimentacaoSolipedes: AlimentacaoSolipede[];
  setAlimentacaoSolipedes: (alimentacao: AlimentacaoSolipede[]) => void;
  dataRelatorio: string;
}

const TIPOS_ALIMENTACAO = [
  'CAVALO',
  'POTRO/ÉGUA',
  'SAL MINERAL',
  'ALFAFA',
  'FENO',
];

const Secao08AlimentacaoSolipedesForm = ({
  alimentacaoSolipedes,
  setAlimentacaoSolipedes,
  dataRelatorio,
}: Secao08AlimentacaoSolipedesFormProps) => {
  const { toast } = useToast();

  useEffect(() => {
    const inicializarAlimentacao = async () => {
      if (alimentacaoSolipedes.length === 0) {
        // Buscar saldo anterior do último livro finalizado
        try {
          const dataAnterior = new Date(dataRelatorio);
          dataAnterior.setDate(dataAnterior.getDate() - 1);

          const q = query(
            collection(db, 'livros_guarda'),
            where('status', '==', 'finalizado'),
            orderBy('data', 'desc'),
            limit(1)
          );

          const snapshot = await getDocs(q);

          let saldosAnteriores: { [key: string]: number } = {};

          if (!snapshot.empty) {
            const livroAnterior = snapshot.docs[0].data();
            if (livroAnterior.alimentacaoSolipedes) {
              livroAnterior.alimentacaoSolipedes.forEach((item: AlimentacaoSolipede) => {
                saldosAnteriores[item.tipoAlimentacao] = item.saldoAtual;
              });
              toast({
                title: 'Saldos Anteriores Carregados',
                description: 'Os saldos do último livro foram carregados automaticamente.',
              });
            }
          }

          // Inicializar com tipos fixos
          const alimentacaoInicial: AlimentacaoSolipede[] = TIPOS_ALIMENTACAO.map((tipo) => ({
            id: tipo,
            tipoAlimentacao: tipo,
            entrada: 0,
            saida: 0,
            saldoAnterior: saldosAnteriores[tipo] || 0,
            consumo: 0,
            saldoAtual: saldosAnteriores[tipo] || 0,
          }));

          setAlimentacaoSolipedes(alimentacaoInicial);
        } catch (error) {
          console.error('Erro ao buscar saldo anterior:', error);
          // Inicializar com zeros se houver erro
          const alimentacaoInicial: AlimentacaoSolipede[] = TIPOS_ALIMENTACAO.map((tipo) => ({
            id: tipo,
            tipoAlimentacao: tipo,
            entrada: 0,
            saida: 0,
            saldoAnterior: 0,
            consumo: 0,
            saldoAtual: 0,
          }));
          setAlimentacaoSolipedes(alimentacaoInicial);
        }
      }
    };

    inicializarAlimentacao();
  }, [dataRelatorio]);

  const atualizarAlimentacao = (id: string, campo: keyof AlimentacaoSolipede, valor: any) => {
    setAlimentacaoSolipedes(
      alimentacaoSolipedes.map((item) => {
        if (item.id !== id) return item;

        const atualizado = { ...item, [campo]: Number(valor) || 0 };

        // Calcular saldo atual: saldoAnterior + entrada - saida - consumo
        atualizado.saldoAtual =
          atualizado.saldoAnterior +
          atualizado.entrada -
          atualizado.saida -
          atualizado.consumo;

        return atualizado;
      })
    );
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Wheat className="h-5 w-5 text-amber-600" />
          08. CONTROLES DE ALIMENTAÇÃO DOS SOLÍPEDES
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-2 text-sm font-semibold text-foreground">Alimentação</th>
                <th className="text-center p-2 text-sm font-semibold text-foreground">Entrada</th>
                <th className="text-center p-2 text-sm font-semibold text-foreground">Saída</th>
                <th className="text-center p-2 text-sm font-semibold text-foreground">Saldo Ant.</th>
                <th className="text-center p-2 text-sm font-semibold text-foreground">Consumo</th>
                <th className="text-center p-2 text-sm font-semibold text-foreground bg-accent">Saldo Atual</th>
              </tr>
            </thead>
            <tbody>
              {alimentacaoSolipedes.map((item) => (
                <tr key={item.id} className="border-b border-border">
                  <td className="p-2 text-sm font-medium text-foreground">
                    {item.tipoAlimentacao}
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      value={item.entrada}
                      onChange={(e) => atualizarAlimentacao(item.id, 'entrada', e.target.value)}
                      className="text-center"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      value={item.saida}
                      onChange={(e) => atualizarAlimentacao(item.id, 'saida', e.target.value)}
                      className="text-center"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      value={item.saldoAnterior}
                      onChange={(e) => atualizarAlimentacao(item.id, 'saldoAnterior', e.target.value)}
                      className="text-center"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      value={item.consumo}
                      onChange={(e) => atualizarAlimentacao(item.id, 'consumo', e.target.value)}
                      className="text-center"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      value={item.saldoAtual}
                      readOnly
                      className="text-center bg-accent font-semibold"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default Secao08AlimentacaoSolipedesForm;
