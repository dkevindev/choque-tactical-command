import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface VisualizarAulasTabProps {
  projeto: any;
}

const VisualizarAulasTab = ({ projeto }: VisualizarAulasTabProps) => {
  const [aulas, setAulas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarAulas();
  }, [projeto]);

  const carregarAulas = async () => {
    try {
      // Buscar todas as aulas sem orderBy para evitar índice composto
      const q = query(
        collection(db, 'projetos_aulas'),
        where('projetoId', '==', projeto.id)
      );
      
      const snapshot = await getDocs(q);
      const aulasData = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const aulaData = docSnap.data();
          
          // Buscar nomes dos instrutores
          const instrutoresNomes = await Promise.all(
            (aulaData.instrutores || []).map(async (instrutorId: string) => {
              const policialSnap = await getDocs(
                query(collection(db, 'policiais'), where('__name__', '==', instrutorId))
              );
              if (!policialSnap.empty) {
                const policial = policialSnap.docs[0].data();
                return `${policial.postGrad || ''} ${policial.numeral || ''} ${policial.nomeGuerra || policial.nome}`.trim();
              }
              return 'Desconhecido';
            })
          );

          return {
            id: docSnap.id,
            ...aulaData,
            instrutoresNomes
          } as any;
        })
      );

      // Ordenar em memória
      aulasData.sort((a: any, b: any) => {
        const dataA = a.data?.toDate ? a.data.toDate() : new Date(a.data);
        const dataB = b.data?.toDate ? b.data.toDate() : new Date(b.data);
        return dataB.getTime() - dataA.getTime();
      });

      setAulas(aulasData);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar aulas:', error);
      setLoading(false);
    }
  };

  const formatarData = (data: any) => {
    try {
      const dataObj = data?.toDate ? data.toDate() : new Date(data);
      return format(dataObj, "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Carregando aulas...
      </div>
    );
  }

  if (aulas.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma aula registrada ainda
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {aulas.map((aula) => (
        <Card key={aula.id} className="hover:border-primary transition-all">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-base">
                  {formatarData(aula.data)}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Turno {aula.turno}
                </p>
              </div>
              <Badge variant={aula.status === 'encerrada' ? 'default' : 'destructive'}>
                {aula.status === 'encerrada' ? 'Encerrada' : 'Em Andamento'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-1">Instrutores:</p>
              <div className="flex flex-wrap gap-1">
                {aula.instrutoresNomes.map((nome: string, idx: number) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {nome}
                  </Badge>
                ))}
              </div>
              {!aula.instrutoresCompleto && (
                <Badge variant="destructive" className="text-xs mt-1">
                  Instrutores incompletos
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {aula.alunosPresentes?.length || 0} presentes
                </span>
              </div>
            </div>

            {aula.status === 'encerrada' && (
              <p className="text-xs text-muted-foreground border-t pt-2">
                ✓ 3 horas creditadas por instrutor
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default VisualizarAulasTab;
