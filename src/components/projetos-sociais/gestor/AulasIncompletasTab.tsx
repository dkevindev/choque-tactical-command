import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EditarAulaDialog } from "../instrutor/EditarAulaDialog";
import { PermutarInstrutoresDialog } from "./PermutarInstrutoresDialog";

interface AulasIncompletasTabProps {
  projetoId: string;
  gestorId: string;
}

export default function AulasIncompletasTab({ projetoId, gestorId }: AulasIncompletasTabProps) {
  const [aulasIncompletas, setAulasIncompletas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodoInicio, setPeriodoInicio] = useState<Date>(new Date(new Date().setDate(1)));
  const [periodoFim, setPeriodoFim] = useState<Date>(new Date());
  const [aulaEditando, setAulaEditando] = useState<any>(null);
  const [aulaPermutando, setAulaPermutando] = useState<any>(null);
  const [instrutoresMap, setInstrutoresMap] = useState<Record<string, string>>({});

  useEffect(() => {
    carregarAulasIncompletas();
  }, [projetoId, periodoInicio, periodoFim]);

  const carregarAulasIncompletas = async () => {
    setLoading(true);
    try {
      // Buscar aulas incompletas
      const aulasRef = collection(db, "projetos_aulas");
      const q = query(
        aulasRef,
        where("projetoId", "==", projetoId),
        where("instrutoresCompleto", "==", false),
        where("data", ">=", periodoInicio),
        where("data", "<=", periodoFim),
        orderBy("data", "desc")
      );

      const snapshot = await getDocs(q);
      const aulas = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      // Buscar nomes dos instrutores
      const instrutoresIds = new Set<string>();
      aulas.forEach((aula: any) => {
        aula.instrutores?.forEach((id: string) => instrutoresIds.add(id));
      });

      const instrutoresNomes: Record<string, string> = {};
      for (const id of Array.from(instrutoresIds)) {
        const policialSnapshot = await getDocs(
          query(collection(db, "policiais"), where("usuarioId", "==", id))
        );
        if (!policialSnapshot.empty) {
          const policialData = policialSnapshot.docs[0].data();
          instrutoresNomes[id] = `${policialData.patente} ${policialData.nomeGuerra}`;
        }
      }

      setInstrutoresMap(instrutoresNomes);
      setAulasIncompletas(aulas);
    } catch (error) {
      console.error("Erro ao carregar aulas incompletas:", error);
      toast.error("Erro ao carregar aulas incompletas");
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (data: any): string => {
    if (!data) return "Data inválida";
    const dataObj = data.toDate ? data.toDate() : data;
    return format(dataObj, "dd/MM/yyyy", { locale: ptBR });
  };

  if (loading) {
    return <div className="text-center p-8">Carregando aulas incompletas...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filtro de Período */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtrar por Período</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {periodoInicio ? formatarData(periodoInicio) : "Data inicial"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={periodoInicio}
                  onSelect={(date) => date && setPeriodoInicio(date)}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {periodoFim ? formatarData(periodoFim) : "Data final"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={periodoFim}
                  onSelect={(date) => date && setPeriodoFim(date)}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Aulas Incompletas */}
      {aulasIncompletas.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Nenhuma aula incompleta encontrada no período selecionado
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {aulasIncompletas.map((aula) => {
            const vagasPreenchidas = aula.instrutores?.length || 0;
            const totalVagas = aula.maxInstrutores || 1;
            const vagasRestantes = totalVagas - vagasPreenchidas;

            return (
              <Card key={aula.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{formatarData(aula.data)}</h3>
                        <Badge variant="secondary">
                          {aula.turnoNome || `Turno ${aula.turno + 1}`}
                        </Badge>
                        <Badge variant="destructive">
                          {vagasRestantes} vaga{vagasRestantes !== 1 ? 's' : ''} disponível{vagasRestantes !== 1 ? 'eis' : ''}
                        </Badge>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Instrutores:</p>
                        <div className="flex flex-wrap gap-2">
                          {aula.instrutores?.map((instrutorId: string) => (
                            <Badge key={instrutorId} variant="outline">
                              {instrutoresMap[instrutorId] || instrutorId}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <p className="text-sm">
                        <Users className="inline h-4 w-4 mr-1" />
                        {vagasPreenchidas}/{totalVagas} instrutores
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        onClick={() => setAulaEditando(aula)}
                        className="w-full md:w-auto"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Adicionar Instrutor
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAulaPermutando(aula)}
                        className="w-full md:w-auto"
                      >
                        Permutar Instrutor
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Diálogos */}
      {aulaEditando && (
        <EditarAulaDialog
          aula={aulaEditando}
          projetoId={projetoId}
          policialLogado={gestorId}
          open={!!aulaEditando}
          onOpenChange={(open) => !open && setAulaEditando(null)}
          onSuccess={carregarAulasIncompletas}
        />
      )}

      {aulaPermutando && (
        <PermutarInstrutoresDialog
          aula={aulaPermutando}
          projetoId={projetoId}
          gestorId={gestorId}
          open={!!aulaPermutando}
          onOpenChange={(open) => !open && setAulaPermutando(null)}
          onSuccess={carregarAulasIncompletas}
        />
      )}
    </div>
  );
}
