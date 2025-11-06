import { useState, useEffect } from 'react';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { CheckCircle, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AulaEmAndamentoProps {
  aula: any;
  onUpdate: () => void;
  projetos: any[];
}

const AulaEmAndamento = ({ aula, onUpdate, projetos }: AulaEmAndamentoProps) => {
  const [loading, setLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [alunosDisponiveis, setAlunosDisponiveis] = useState<any[]>([]);
  const [searchAluno, setSearchAluno] = useState('');
  const [alunosSelecionados, setAlunosSelecionados] = useState<string[]>([]);
  const [loadingAlunos, setLoadingAlunos] = useState(false);

  const projeto = projetos.find(p => p.id === aula.projetoId);

  const encerrarAula = async () => {
    try {
      setLoading(true);
      await updateDoc(doc(db, 'projetos_aulas', aula.id), {
        status: 'encerrada',
        horaFim: new Date()
      });
      toast.success('Aula encerrada com sucesso!');
      onUpdate();
    } catch (error) {
      console.error('Erro ao encerrar aula:', error);
      toast.error('Erro ao encerrar aula');
      setLoading(false);
    }
  };

  const carregarAlunos = async () => {
    try {
      setLoadingAlunos(true);
      let alunos = [];
      
      if (aula.turmaId) {
        // Buscar alunos da turma específica
        const turmaSnap = await getDocs(
          query(collection(db, 'projetos_turmas'), where('__name__', '==', aula.turmaId))
        );
        if (!turmaSnap.empty) {
          const alunosIds = turmaSnap.docs[0].data().alunos || [];
          const alunosPromises = alunosIds.map(async (id: string) => {
            const alunoSnap = await getDocs(
              query(collection(db, 'projetos_alunos'), where('__name__', '==', id))
            );
            if (!alunoSnap.empty) {
              return { id: alunoSnap.docs[0].id, ...alunoSnap.docs[0].data() };
            }
            return null;
          });
          alunos = (await Promise.all(alunosPromises)).filter(a => a !== null);
        }
      } else {
        // Buscar todos os alunos do projeto
        const q = query(
          collection(db, 'projetos_alunos'),
          where('projetoId', '==', aula.projetoId),
          where('ativo', '==', true)
        );
        const snapshot = await getDocs(q);
        alunos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
      
      setAlunosDisponiveis(alunos);
      setLoadingAlunos(false);
    } catch (error) {
      console.error('Erro ao carregar alunos:', error);
      setLoadingAlunos(false);
    }
  };

  useEffect(() => {
    if (sheetOpen) {
      carregarAlunos();
      setAlunosSelecionados([]);
    }
  }, [sheetOpen]);

  const adicionarAlunos = async () => {
    try {
      setLoading(true);
      const novosPresentes = [...(aula.alunosPresentes || []), ...alunosSelecionados];
      
      await updateDoc(doc(db, 'projetos_aulas', aula.id), {
        alunosPresentes: novosPresentes
      });
      
      toast.success(`${alunosSelecionados.length} aluno(s) adicionado(s)!`);
      setSheetOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Erro ao adicionar alunos:', error);
      toast.error('Erro ao adicionar alunos');
      setLoading(false);
    }
  };

  const calcularTempoDecorrido = () => {
    try {
      const horaInicio = aula.horaInicio?.toDate ? aula.horaInicio.toDate() : new Date(aula.horaInicio);
      return formatDistanceToNow(horaInicio, { addSuffix: true, locale: ptBR });
    } catch {
      return 'há alguns momentos';
    }
  };

  return (
    <Card className="border-primary border-2 shadow-lg">
      <CardHeader className="bg-primary/10">
        <CardTitle className="flex items-center gap-2">
          <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
          AULA EM ANDAMENTO
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Projeto</p>
          <p className="font-medium">{projeto?.nome}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-sm text-muted-foreground">Turno</p>
            <p className="text-2xl font-bold">{aula.turno}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Presentes</p>
            <p className="text-2xl font-bold">{aula.alunosPresentes?.length || 0}</p>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t">
          {/* Botão Adicionar Alunos */}
          {projeto?.configuracao?.usaFrequencia && (
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button size="lg" variant="outline" className="flex-1" disabled={loading}>
                  <UserPlus className="mr-2 h-5 w-5" />
                  Adicionar Alunos
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh]">
                <SheetHeader>
                  <SheetTitle>Adicionar Alunos Presentes</SheetTitle>
                </SheetHeader>
                <div className="py-4 space-y-4">
                  <Input
                    placeholder="Buscar aluno..."
                    value={searchAluno}
                    onChange={(e) => setSearchAluno(e.target.value)}
                  />
                  <ScrollArea className="h-[50vh]">
                    {loadingAlunos ? (
                      <p className="text-center text-muted-foreground">Carregando...</p>
                    ) : (
                      <div className="space-y-2">
                        {alunosDisponiveis
                          .filter(a => !aula.alunosPresentes?.includes(a.id))
                          .filter(a => 
                            a.nomeCompleto?.toLowerCase().includes(searchAluno.toLowerCase()) ||
                            a.nomeGuerra?.toLowerCase().includes(searchAluno.toLowerCase())
                          )
                          .map(aluno => (
                            <div key={aluno.id} className="flex items-center space-x-2 p-2 border rounded">
                              <Checkbox
                                checked={alunosSelecionados.includes(aluno.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setAlunosSelecionados([...alunosSelecionados, aluno.id]);
                                  } else {
                                    setAlunosSelecionados(alunosSelecionados.filter(id => id !== aluno.id));
                                  }
                                }}
                              />
                              <label className="text-sm flex-1">
                                {aluno.nomeCompleto} ({aluno.nomeGuerra})
                              </label>
                            </div>
                          ))}
                      </div>
                    )}
                  </ScrollArea>
                  <Button
                    className="w-full"
                    onClick={adicionarAlunos}
                    disabled={alunosSelecionados.length === 0 || loading}
                  >
                    Adicionar {alunosSelecionados.length} aluno(s)
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          )}
          
          {/* Botão Encerrar */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="lg" className="flex-1" disabled={loading}>
                <CheckCircle className="mr-2 h-5 w-5" />
                Encerrar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Encerrar Aula?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja encerrar a aula? Esta ação não pode ser desfeita.
                  <br />
                  <br />
                  Serão creditadas 3 horas para cada instrutor.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={encerrarAula}>
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Iniciada {calcularTempoDecorrido()}
        </p>
      </CardContent>
    </Card>
  );
};

export default AulaEmAndamento;
