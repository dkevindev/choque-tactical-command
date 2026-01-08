import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { buscarPolicialPorId, formatarNomePolicial } from '@/lib/policialUtils';

interface RelatorioMensalCompletoProps {
  policialId: string;
  mesSelecionado: Date;
}

export const RelatorioMensalCompleto = ({ policialId, mesSelecionado }: RelatorioMensalCompletoProps) => {
  const [aulas, setAulas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarAulas();
  }, [policialId, mesSelecionado]);

  const carregarAulas = async () => {
    try {
      setLoading(true);
      
      // Buscar todas as aulas do instrutor
      const q = query(
        collection(db, 'projetos_aulas'),
        where('instrutores', 'array-contains', policialId),
        where('status', '==', 'encerrada')
      );
      
      const snapshot = await getDocs(q);
      const todasAulas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filtrar por mês selecionado
      const inicio = startOfMonth(mesSelecionado);
      const fim = endOfMonth(mesSelecionado);
      
      const aulasDoMes = todasAulas.filter((aula: any) => {
        const dataAula = aula.data?.toDate ? aula.data.toDate() : new Date(aula.data);
        return dataAula >= inicio && dataAula <= fim;
      });

      // Carregar nomes dos instrutores para cada aula usando função utilitária
      const aulasComNomes = await Promise.all(
        aulasDoMes.map(async (aula: any) => {
          const instrutoresNomes = await Promise.all(
            (aula.instrutores || []).map(async (instrutorId: string) => {
              const policial = await buscarPolicialPorId(instrutorId);
              return formatarNomePolicial(policial);
            })
          );

          return {
            ...aula,
            instrutoresNomes
          };
        })
      );

      setAulas(aulasComNomes);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar aulas:', error);
      setLoading(false);
    }
  };

  // Gerar todos os dias do mês
  const inicio = startOfMonth(mesSelecionado);
  const fim = endOfMonth(mesSelecionado);
  const todosDias = eachDayOfInterval({ start: inicio, end: fim });

  // Agrupar aulas por dia
  const aulasPorDia = todosDias.map(dia => {
    const aulasDoDia = aulas.filter((aula: any) => {
      const dataAula = aula.data?.toDate ? aula.data.toDate() : new Date(aula.data);
      return format(dataAula, 'yyyy-MM-dd') === format(dia, 'yyyy-MM-dd');
    });

    // Agrupar por turno
    const aulasPorTurno: { [key: string]: any[] } = {};
    aulasDoDia.forEach((aula: any) => {
      const turnoNome = aula.turnoNome || `Turno ${aula.turno}`;
      if (!aulasPorTurno[turnoNome]) {
        aulasPorTurno[turnoNome] = [];
      }
      aulasPorTurno[turnoNome].push(aula);
    });

    return {
      dia,
      aulasPorTurno
    };
  }).filter(d => Object.keys(d.aulasPorTurno).length > 0); // Mostrar apenas dias com aulas

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Gerando relatório...
      </div>
    );
  }

  if (aulasPorDia.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma aula encontrada em {format(mesSelecionado, 'MMMM/yyyy', { locale: ptBR })}
      </div>
    );
  }

  return (
    <ScrollArea className="h-[70vh]">
      <div className="space-y-4 pr-4">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">
            Relatório de Aulas
          </h2>
          <p className="text-muted-foreground">
            {format(mesSelecionado, "MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        {aulasPorDia.map(({ dia, aulasPorTurno }) => (
          <Card key={dia.toISOString()} className="p-4">
            <div className="flex items-center gap-3 mb-3 pb-3 border-b">
              <Badge variant="outline" className="text-base">
                {format(dia, "dd 'de' MMMM", { locale: ptBR })}
              </Badge>
              <span className="text-sm text-muted-foreground">
                ({format(dia, 'EEEE', { locale: ptBR })})
              </span>
            </div>

            <div className="space-y-3">
              {Object.entries(aulasPorTurno).map(([turno, aulasDoTurno]) => (
                <div key={turno} className="pl-4">
                  <p className="font-medium text-sm mb-2">{turno}</p>
                  <div className="space-y-1 pl-4">
                    {aulasDoTurno.flatMap((aula: any) => 
                      aula.instrutoresNomes.map((nome: string, idx: number) => (
                        <p key={`${aula.id}-${idx}`} className="text-sm">
                          • {nome}
                        </p>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}

        <Card className="p-4 bg-muted/50">
          <p className="text-sm font-medium">Total de Aulas: {aulas.length}</p>
          <p className="text-sm text-muted-foreground">Total de Horas: {aulas.length * 3}h</p>
        </Card>
      </div>
    </ScrollArea>
  );
};
