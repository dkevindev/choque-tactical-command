import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, TrendingUp, Calendar as CalendarIcon } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

interface RelatoriosInstrutorTabProps {
  policialId: string;
}

const RelatoriosInstrutorTab = ({ policialId }: RelatoriosInstrutorTabProps) => {
  const [horasMesAtual, setHorasMesAtual] = useState(0);
  const [horasTotais, setHorasTotais] = useState(0);
  const [loading, setLoading] = useState(true);
  const [aulas, setAulas] = useState<any[]>([]);
  const [dataSelecionada, setDataSelecionada] = useState<Date>();
  const [mesSelecionado, setMesSelecionado] = useState(new Date());

  useEffect(() => {
    carregarDados();
  }, [policialId]);

  const carregarDados = async () => {
    try {
      // Buscar todas as aulas do instrutor
      const qTotal = query(
        collection(db, 'projetos_aulas'),
        where('instrutores', 'array-contains', policialId),
        where('status', '==', 'encerrada')
      );
      const snapshotTotal = await getDocs(qTotal);
      const aulasData = snapshotTotal.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      setAulas(aulasData);

      // Horas do mês atual
      const hoje = new Date();
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const aulasMes = aulasData.filter(a => {
        const dataAula = a.data?.toDate ? a.data.toDate() : new Date(a.data);
        return dataAula >= primeiroDiaMes;
      });
      setHorasMesAtual(aulasMes.length * 3);

      // Horas totais
      setHorasTotais(aulasData.length * 3);

      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setLoading(false);
    }
  };

  const diasComAulas = aulas.map(aula => {
    const data = aula.data?.toDate ? aula.data.toDate() : new Date(aula.data);
    return data;
  });

  const aulasNoDia = dataSelecionada 
    ? aulas.filter(aula => {
        const dataAula = aula.data?.toDate ? aula.data.toDate() : new Date(aula.data);
        return isSameDay(dataAula, dataSelecionada);
      })
    : [];

  const aulasMes = aulas.filter(aula => {
    const dataAula = aula.data?.toDate ? aula.data.toDate() : new Date(aula.data);
    return dataAula.getMonth() === mesSelecionado.getMonth() && 
           dataAula.getFullYear() === mesSelecionado.getFullYear();
  });

  const mesAtual = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Carregando...
      </div>
    );
  }

  return (
    <Tabs defaultValue="resumo" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="resumo">Resumo</TabsTrigger>
        <TabsTrigger value="calendario">Calendário</TabsTrigger>
      </TabsList>

      <TabsContent value="resumo" className="space-y-6">
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
      </TabsContent>

      <TabsContent value="calendario" className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 text-center">
            <CalendarIcon className="mx-auto h-8 w-8 text-primary mb-2" />
            <p className="text-3xl font-bold">{aulasMes.length}</p>
            <p className="text-xs text-muted-foreground">
              Aulas em {format(mesSelecionado, 'MMMM/yyyy', { locale: ptBR })}
            </p>
          </Card>
          
          <Card className="p-4 text-center">
            <Clock className="mx-auto h-8 w-8 text-primary mb-2" />
            <p className="text-3xl font-bold">{aulasMes.length * 3}h</p>
            <p className="text-xs text-muted-foreground">Horas no mês</p>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Calendário de Aulas</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="single"
                selected={dataSelecionada}
                onSelect={setDataSelecionada}
                month={mesSelecionado}
                onMonthChange={setMesSelecionado}
                locale={ptBR}
                modifiers={{
                  comAula: diasComAulas
                }}
                modifiersStyles={{
                  comAula: {
                    fontWeight: 'bold',
                    textDecoration: 'underline',
                    color: 'hsl(var(--primary))'
                  }
                }}
                className="pointer-events-auto"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {dataSelecionada 
                  ? format(dataSelecionada, "dd 'de' MMMM", { locale: ptBR })
                  : 'Selecione um dia'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!dataSelecionada && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Clique em um dia no calendário para ver as aulas
                </p>
              )}
              {dataSelecionada && aulasNoDia.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma aula neste dia
                </p>
              )}
              {dataSelecionada && aulasNoDia.length > 0 && (
                <div className="space-y-3">
                  {aulasNoDia.map(aula => (
                    <div key={aula.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="secondary">{aula.turnoNome || aula.turno}</Badge>
                        <span className="text-xs text-muted-foreground">3h</span>
                      </div>
                      {aula.turmaId && (
                        <p className="text-sm font-medium">{aula.turmaNome}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {aula.instrutores?.length || 1} instrutor(es)
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default RelatoriosInstrutorTab;
