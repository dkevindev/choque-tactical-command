import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RelatorioMensalGestorProps {
  projeto: any;
}

export const RelatorioMensalGestor = ({ projeto }: RelatorioMensalGestorProps) => {
  const [aulas, setAulas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth() + 1);
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());

  useEffect(() => {
    carregarAulas();
  }, [projeto, mesSelecionado, anoSelecionado]);

  const carregarAulas = async () => {
    try {
      setLoading(true);
      
      // Buscar todas as aulas encerradas do projeto
      const q = query(
        collection(db, 'projetos_aulas'),
        where('projetoId', '==', projeto.id),
        where('status', '==', 'encerrada')
      );
      
      const snapshot = await getDocs(q);
      const todasAulas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filtrar por mês/ano selecionado
      const dataInicio = new Date(anoSelecionado, mesSelecionado - 1, 1);
      const dataFim = endOfMonth(dataInicio);
      
      const aulasDoMes = todasAulas.filter((aula: any) => {
        const dataAula = aula.data?.toDate ? aula.data.toDate() : new Date(aula.data);
        return dataAula >= dataInicio && dataAula <= dataFim;
      });

      // Carregar nomes dos instrutores para cada aula
      const aulasComNomes = await Promise.all(
        aulasDoMes.map(async (aula: any) => {
          const instrutoresNomes = await Promise.all(
            (aula.instrutores || []).map(async (instrutorId: string) => {
              let policialSnap = await getDocs(
                query(collection(db, 'policiais'), where('id', '==', instrutorId))
              );

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
  const dataReferencia = new Date(anoSelecionado, mesSelecionado - 1, 1);
  const inicio = startOfMonth(dataReferencia);
  const fim = endOfMonth(dataReferencia);
  const todosDias = eachDayOfInterval({ start: inicio, end: fim });

  // Agrupar aulas por dia (mostrar TODOS os dias, com ou sem aulas)
  const aulasPorDia = todosDias.map(dia => {
    const aulasDoDia = aulas.filter((aula: any) => {
      const dataAula = aula.data?.toDate ? aula.data.toDate() : new Date(aula.data);
      return format(dataAula, 'yyyy-MM-dd') === format(dia, 'yyyy-MM-dd');
    });

    // Agrupar por turno
    const aulasPorTurno: { [key: string]: any[] } = {};
    aulasDoDia.forEach((aula: any) => {
      const turnoNome = aula.turnoNome || aula.turno || 'Sem turno';
      if (!aulasPorTurno[turnoNome]) {
        aulasPorTurno[turnoNome] = [];
      }
      aulasPorTurno[turnoNome].push(aula);
    });

    return {
      dia,
      aulasPorTurno,
      temAulas: Object.keys(aulasPorTurno).length > 0
    };
  });

  const meses = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  const anos = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Gerando relatório...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <Label>Mês</Label>
          <Select value={mesSelecionado.toString()} onValueChange={(v) => setMesSelecionado(Number(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {meses.map(mes => (
                <SelectItem key={mes.value} value={mes.value.toString()}>
                  {mes.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1">
          <Label>Ano</Label>
          <Select value={anoSelecionado.toString()} onValueChange={(v) => setAnoSelecionado(Number(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {anos.map(ano => (
                <SelectItem key={ano} value={ano.toString()}>
                  {ano}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="h-[70vh]">
        <div className="space-y-4 pr-4">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">
              Relatório de Aulas - Todos os Instrutores
            </h2>
            <p className="text-muted-foreground">
              {format(dataReferencia, "MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>

          {aulasPorDia.map(({ dia, aulasPorTurno, temAulas }) => (
            <Card key={dia.toISOString()} className={`p-4 ${!temAulas ? 'bg-muted/30' : ''}`}>
              <div className="flex items-center gap-3 mb-3 pb-3 border-b">
                <Badge variant={temAulas ? "default" : "outline"} className="text-base">
                  Dia {format(dia, "dd")}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  ({format(dia, 'EEEE', { locale: ptBR })})
                </span>
                {!temAulas && (
                  <Badge variant="secondary" className="ml-auto">Sem aulas</Badge>
                )}
              </div>

              {temAulas ? (
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
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Nenhuma aula registrada neste dia
                </p>
              )}
            </Card>
          ))}

          <Card className="p-4 bg-primary/10">
            <p className="text-sm font-medium">Total de Aulas no Mês: {aulas.length}</p>
            <p className="text-sm text-muted-foreground">Total de Horas: {aulas.length * 3}h</p>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
};