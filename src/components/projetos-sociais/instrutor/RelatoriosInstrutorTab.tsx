import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card } from '@/components/ui/card';
import { Clock, TrendingUp } from 'lucide-react';

interface RelatoriosInstrutorTabProps {
  policialId: string;
}

const RelatoriosInstrutorTab = ({ policialId }: RelatoriosInstrutorTabProps) => {
  const [horasMesAtual, setHorasMesAtual] = useState(0);
  const [horasTotais, setHorasTotais] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDados();
  }, [policialId]);

  const carregarDados = async () => {
    try {
      // Horas do mês atual
      const hoje = new Date();
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      
      const qMes = query(
        collection(db, 'projetos_aulas'),
        where('instrutores', 'array-contains', policialId),
        where('status', '==', 'encerrada'),
        where('data', '>=', primeiroDiaMes)
      );
      const snapshotMes = await getDocs(qMes);
      const horasMes = snapshotMes.size * 3;
      setHorasMesAtual(horasMes);

      // Horas totais
      const qTotal = query(
        collection(db, 'projetos_aulas'),
        where('instrutores', 'array-contains', policialId),
        where('status', '==', 'encerrada')
      );
      const snapshotTotal = await getDocs(qTotal);
      const horasTotal = snapshotTotal.size * 3;
      setHorasTotais(horasTotal);

      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setLoading(false);
    }
  };

  const mesAtual = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Carregando...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards resumo */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 text-center">
          <Clock className="mx-auto h-8 w-8 text-primary mb-2" />
          <p className="text-3xl font-bold">{horasMesAtual}h</p>
          <p className="text-xs text-muted-foreground capitalize">{mesAtual}</p>
        </Card>
        
        <Card className="p-4 text-center">
          <TrendingUp className="mx-auto h-8 w-8 text-primary mb-2" />
          <p className="text-3xl font-bold">{horasTotais}h</p>
          <p className="text-xs text-muted-foreground">Total Acumulado</p>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-medium mb-4">Resumo</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Aulas ministradas (mês)</span>
            <span className="font-medium">{Math.floor(horasMesAtual / 3)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Aulas ministradas (total)</span>
            <span className="font-medium">{Math.floor(horasTotais / 3)}</span>
          </div>
          <div className="flex justify-between border-t pt-3">
            <span className="text-muted-foreground">Média de horas/mês</span>
            <span className="font-medium">{horasMesAtual}h</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default RelatoriosInstrutorTab;
