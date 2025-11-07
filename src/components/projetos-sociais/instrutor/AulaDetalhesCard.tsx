import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { Badge } from '@/components/ui/badge';

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
          // Tentar buscar por id
          let policialSnap = await getDocs(
            query(collection(db, 'policiais'), where('id', '==', instrutorId))
          );

          // Se não encontrar, tentar por usuarioId
          if (policialSnap.empty) {
            policialSnap = await getDocs(
              query(collection(db, 'policiais'), where('usuarioId', '==', instrutorId))
            );
          }

              if (!policialSnap.empty) {
                const policial = policialSnap.docs[0].data();
                const postGrad = policial['Post/Grad'] || policial.postGrad || policial.patente || '';
                const nomeGuerra = policial['NOME DE GUERRA'] || policial.nomeGuerra || '';
                return `${postGrad} ${nomeGuerra}`.trim();
              }
              return 'Desconhecido';
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
