import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EditarAulaDialog } from './EditarAulaDialog';

interface MinhasAulasTabProps {
  policialId: string;
  projetos: any[];
}

const MinhasAulasTab = ({ policialId, projetos }: MinhasAulasTabProps) => {
  const [aulas, setAulas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodoInicio, setPeriodoInicio] = useState<Date>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [periodoFim, setPeriodoFim] = useState<Date>(new Date());
  const [aulaEditando, setAulaEditando] = useState<any>(null);

  useEffect(() => {
    carregarAulas();
  }, [policialId, periodoInicio, periodoFim]);

  const carregarAulas = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'projetos_aulas'),
        where('instrutores', 'array-contains', policialId),
        where('data', '>=', periodoInicio),
        where('data', '<=', periodoFim),
        orderBy('data', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const aulasData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

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

  const calcularHorasCredito = (horaInicio: any, horaFim: any) => {
    try {
      const inicio = horaInicio?.toDate ? horaInicio.toDate() : new Date(horaInicio);
      const fim = horaFim?.toDate ? horaFim.toDate() : new Date(horaFim);
      const diffMs = fim.getTime() - inicio.getTime();
      const diffHrs = Math.round(diffMs / (1000 * 60 * 60));
      return diffHrs;
    } catch {
      return 0;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtro de Período */}
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="flex-1">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(periodoInicio, "dd/MM/yy")} - {format(periodoFim, "dd/MM/yy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-4 space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Data Início</p>
                <Calendar
                  mode="single"
                  selected={periodoInicio}
                  onSelect={(date) => date && setPeriodoInicio(date)}
                  locale={ptBR}
                />
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Data Fim</p>
                <Calendar
                  mode="single"
                  selected={periodoFim}
                  onSelect={(date) => date && setPeriodoFim(date)}
                  locale={ptBR}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Lista de Aulas */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Carregando...
        </div>
      ) : aulas.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhuma aula encontrada no período selecionado
        </div>
      ) : (
        <div className="space-y-3">
          {aulas.map((aula) => {
            const projeto = projetos.find(p => p.id === aula.projetoId);
            const statusCompleto = aula.status === 'encerrada' && aula.instrutoresCompleto;
            const vagasRestantes = (aula.maxInstrutores || 1) - (aula.instrutores?.length || 0);
            const podeAdicionarInstrutor = aula.status === 'encerrada' && vagasRestantes > 0;

            return (
              <Card key={aula.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-medium">{formatarData(aula.data)}</p>
                      <p className="text-sm text-muted-foreground">
                        {projeto?.nome} • {aula.turnoNome || `Turno ${aula.turno + 1}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {aula.alunosPresentes?.length || 0} alunos presentes
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Badge variant={aula.status === 'encerrada' ? 'default' : 'destructive'}>
                        {aula.status === 'encerrada' ? 'Encerrada' : 'Em Andamento'}
                      </Badge>
                      {statusCompleto ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Completa
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          Incompleta ({vagasRestantes} vaga{vagasRestantes !== 1 ? 's' : ''})
                        </Badge>
                      )}
                    </div>
                  </div>

                  {aula.status === 'encerrada' && aula.horaInicio && aula.horaFim && (
                    <p className="text-xs text-muted-foreground border-t pt-2">
                      ✓ {calcularHorasCredito(aula.horaInicio, aula.horaFim)} horas creditadas
                    </p>
                  )}

                  {podeAdicionarInstrutor && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => setAulaEditando(aula)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Adicionar Instrutor
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {aulaEditando && (
        <EditarAulaDialog
          aula={aulaEditando}
          projetoId={aulaEditando.projetoId}
          policialLogado={policialId}
          open={!!aulaEditando}
          onOpenChange={(open) => !open && setAulaEditando(null)}
          onSuccess={carregarAulas}
        />
      )}
    </div>
  );
};

export default MinhasAulasTab;
