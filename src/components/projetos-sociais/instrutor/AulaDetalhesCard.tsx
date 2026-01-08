import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { buscarPolicialPorId, formatarNomePolicial } from '@/lib/policialUtils';

interface AulaDetalhesCardProps {
  aula: any;
}

export const AulaDetalhesCard = ({ aula }: AulaDetalhesCardProps) => {
  const [instrutoresNomes, setInstrutoresNomes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarInstrutores();
  }, [aula]);

  const carregarInstrutores = async () => {
    try {
      const nomes = await Promise.all(
        (aula.instrutores || []).map(async (instrutorId: string) => {
          const policial = await buscarPolicialPorId(instrutorId);
          return formatarNomePolicial(policial);
        })
      );
      setInstrutoresNomes(nomes);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar instrutores:', error);
      setLoading(false);
    }
  };

  return (
    <div className="p-3 border rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <Badge variant="secondary">{aula.turnoNome || aula.turno}</Badge>
        <span className="text-xs text-muted-foreground">3h</span>
      </div>
      
      {aula.turmaId && (
        <p className="text-sm font-medium">{aula.turmaNome}</p>
      )}
      
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Instrutores:</p>
        {loading ? (
          <p className="text-xs text-muted-foreground">Carregando...</p>
        ) : (
          instrutoresNomes.map((nome, idx) => (
            <p key={idx} className="text-xs">• {nome}</p>
          ))
        )}
      </div>
    </div>
  );
};
