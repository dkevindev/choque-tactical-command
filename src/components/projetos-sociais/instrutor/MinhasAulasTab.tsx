import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
            return (
              <Card key={aula.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-medium">{formatarData(aula.data)}</p>
                      <p className="text-sm text-muted-foreground">
                        {projeto?.nome} • Turno {aula.turno}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {aula.alunosPresentes?.length || 0} alunos presentes
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Badge variant={aula.status === 'encerrada' ? 'default' : 'destructive'}>
                        {aula.status === 'encerrada' ? 'Encerrada' : 'Em Andamento'}
                      </Badge>
                      {!aula.instrutoresCompleto && (
                        <Badge variant="outline" className="text-xs">
                          Incompleto
                        </Badge>
                      )}
                    </div>
                  </div>

                  {aula.status === 'encerrada' && (
                    <p className="text-xs text-muted-foreground border-t pt-2">
                      ✓ 3 horas creditadas
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MinhasAulasTab;
