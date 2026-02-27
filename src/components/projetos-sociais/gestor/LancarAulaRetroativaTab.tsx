import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { ArrowLeft, ArrowRight, Info, Users, CalendarDays, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LancarAulaRetroativaTabProps {
  projeto: any;
  onSuccess?: () => void;
}

const LancarAulaRetroativaTab = ({ projeto, onSuccess }: LancarAulaRetroativaTabProps) => {
  const [etapa, setEtapa] = useState(1);
  const [dataSelecionada, setDataSelecionada] = useState<Date | undefined>(undefined);
  const [turnoSelecionado, setTurnoSelecionado] = useState<number | null>(null);
  const [turmaSelecionada, setTurmaSelecionada] = useState<string | null>(null);
  const [instrutoresSelecionados, setInstrutoresSelecionados] = useState<string[]>([]);
  const [alunosPresentes, setAlunosPresentes] = useState<string[]>([]);
  const [instrutoresDisponiveis, setInstrutoresDisponiveis] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [alunos, setAlunos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchAluno, setSearchAluno] = useState('');
  const [aulasExistentes, setAulasExistentes] = useState<{ turno: number; turmaId?: string }[]>([]);

  const config = projeto?.configuracao || {};
  const usaTurmas = config.usaTurmas || false;
  const usaFrequencia = config.usaFrequencia !== undefined ? config.usaFrequencia : true;
  const turnosNomeclatura = config.turnosNomeclatura || ['Manhã', 'Tarde', 'Noite', 'Noturno'];
  const diasSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

  const hoje = new Date();

  // Verificar aulas existentes na data selecionada
  useEffect(() => {
    if (!dataSelecionada || !projeto?.id) return;

    const verificarAulasExistentes = async () => {
      try {
        const inicioDia = new Date(dataSelecionada.getFullYear(), dataSelecionada.getMonth(), dataSelecionada.getDate(), 0, 0, 0);
        const fimDia = new Date(dataSelecionada.getFullYear(), dataSelecionada.getMonth(), dataSelecionada.getDate(), 23, 59, 59);
        
        const q = query(
          collection(db, 'projetos_aulas'),
          where('projetoId', '==', projeto.id),
          where('data', '>=', inicioDia),
          where('data', '<=', fimDia)
        );
        
        const snapshot = await getDocs(q);
        const aulas = snapshot.docs.map(doc => ({
          turno: doc.data().turno as number,
          turmaId: doc.data().turmaId as string | undefined
        }));
        
        setAulasExistentes(aulas);
      } catch (error) {
        console.error('Erro ao verificar aulas existentes:', error);
      }
    };

    verificarAulasExistentes();
  }, [dataSelecionada, projeto?.id]);

  useEffect(() => {
    if (etapa === 3 && usaTurmas) {
      carregarTurmas();
    } else if ((etapa === 3 && !usaTurmas) || etapa === 4) {
      carregarInstrutores();
    } else if (etapa === (usaTurmas ? 5 : 4) && usaFrequencia) {
      carregarAlunos();
    }
  }, [etapa]);

  const carregarTurmas = async () => {
    try {
      const q = query(
        collection(db, 'projetos_turmas'),
        where('projetoId', '==', projeto.id),
        where('ativo', '==', true)
      );
      const snapshot = await getDocs(q);
      const turmasData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTurmas(turmasData);
    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
    }
  };

  const carregarInstrutores = async () => {
    try {
      const q = query(
        collection(db, 'projetos_instrutores'),
        where('projetoId', '==', projeto.id),
        where('ativo', '==', true)
      );
      const snapshot = await getDocs(q);
      
      const instrutoresPromises = snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const policialSnap = await getDocs(
          query(collection(db, 'policiais'), where('__name__', '==', data.policialId))
        );
        if (!policialSnap.empty) {
          const policialData = policialSnap.docs[0].data();
          return {
            id: data.policialId,
            postGrad: policialData['Post/Grad'] || policialData.postGrad || '',
            numeral: policialData.NUMERAL || policialData.numeral || '',
            nome: policialData.NOME || policialData.nome || '',
            nomeGuerra: policialData['NOME DE GUERRA'] || policialData.nomeGuerra || '',
            matricula: policialData.Matrícula || policialData.matricula || ''
          };
        }
        return null;
      });

      const instrutores = (await Promise.all(instrutoresPromises)).filter(i => i !== null);
      setInstrutoresDisponiveis(instrutores);
    } catch (error) {
      console.error('Erro ao carregar instrutores:', error);
    }
  };

  const carregarAlunos = async () => {
    try {
      let alunosData: any[] = [];
      const diaAtual = dataSelecionada ? diasSemana[dataSelecionada.getDay()] : '';
      
      if (usaTurmas && turmaSelecionada) {
        const turmaDoc = await getDocs(
          query(collection(db, 'projetos_turmas'), where('__name__', '==', turmaSelecionada))
        );
        
        if (!turmaDoc.empty) {
          const turmaData = turmaDoc.docs[0].data();
          const alunosIds = turmaData.alunos || [];
          
          const alunosPromises = alunosIds.map(async (alunoId: string) => {
            const alunoSnap = await getDocs(
              query(collection(db, 'projetos_alunos'), where('__name__', '==', alunoId))
            );
            if (!alunoSnap.empty) {
              const alunoData = alunoSnap.docs[0].data();
              if (alunoData.horarioEspecial) {
                return null;
              }
              return {
                id: alunoSnap.docs[0].id,
                ...alunoData
              };
            }
            return null;
          });
          
          const alunosTurma = (await Promise.all(alunosPromises)).filter(a => a !== null);
          
          // Buscar alunos com horário especial
          const qEspeciais = query(
            collection(db, 'projetos_alunos'),
            where('projetoId', '==', projeto.id),
            where('ativo', '==', true),
            where('horarioEspecial', '==', true)
          );
          const snapEspeciais = await getDocs(qEspeciais);
          
          const alunosEspeciaisFiltrados = snapEspeciais.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter((aluno: any) => {
              return aluno.diasEspeciais?.some(
                (d: any) => d.turmaId === turmaSelecionada && d.diaSemana === diaAtual
              );
            })
            .filter((aluno: any) => !alunosIds.includes(aluno.id));
          
          alunosData = [
            ...alunosTurma,
            ...alunosEspeciaisFiltrados.map(a => ({
              ...a,
              isHorarioEspecial: true
            }))
          ];
        }
        
        setAlunos(alunosData);
      } else {
        const q = query(
          collection(db, 'projetos_alunos'),
          where('projetoId', '==', projeto.id),
          where('ativo', '==', true)
        );
        const snapshot = await getDocs(q);
        alunosData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as any)
        }));
        setAlunos(alunosData);
      }
    } catch (error) {
      console.error('Erro ao carregar alunos:', error);
    }
  };

  const validarEtapa = () => {
    if (etapa === 1 && !dataSelecionada) return false;
    if (etapa === 2 && turnoSelecionado === null) return false;
    if (etapa === 3 && usaTurmas && turmaSelecionada === null) return false;
    if ((etapa === 3 && !usaTurmas || etapa === 4) && instrutoresSelecionados.length === 0) return false;
    return true;
  };

  const proximaEtapa = () => {
    if (validarEtapa()) {
      setEtapa(etapa + 1);
    }
  };

  const toggleInstrutor = (instrutorId: string) => {
    if (instrutoresSelecionados.includes(instrutorId)) {
      setInstrutoresSelecionados(instrutoresSelecionados.filter(id => id !== instrutorId));
    } else {
      if (instrutoresSelecionados.length < config.maxInstrutoresPorTurno) {
        setInstrutoresSelecionados([...instrutoresSelecionados, instrutorId]);
      } else {
        toast.error(`Máximo de ${config.maxInstrutoresPorTurno} instrutores permitido`);
      }
    }
  };

  const toggleAluno = (alunoId: string) => {
    if (alunosPresentes.includes(alunoId)) {
      setAlunosPresentes(alunosPresentes.filter(id => id !== alunoId));
    } else {
      setAlunosPresentes([...alunosPresentes, alunoId]);
    }
  };

  const lancarAula = async () => {
    if (!dataSelecionada) return;

    try {
      setLoading(true);

      const instrutoresValidos = instrutoresSelecionados.filter(id => typeof id === 'string' && id.length > 0);
      
      if (instrutoresValidos.length === 0) {
        toast.error('Erro: nenhum instrutor válido selecionado');
        setLoading(false);
        return;
      }

      const aulaData: any = {
        projetoId: projeto.id,
        data: dataSelecionada,
        turno: turnoSelecionado,
        turnoNome: turnosNomeclatura[turnoSelecionado! - 1] || `Turno ${turnoSelecionado}`,
        instrutores: instrutoresValidos,
        instrutoresCompleto: instrutoresValidos.length === config.maxInstrutoresPorTurno,
        maxInstrutores: config.maxInstrutoresPorTurno,
        status: 'encerrada',
        horaInicio: dataSelecionada,
        horaFim: dataSelecionada,
        observacoes: '',
        historico: [],
        lancadoRetroativamente: true,
        dataLancamento: new Date()
      };

      if (usaTurmas && turmaSelecionada) {
        aulaData.turmaId = turmaSelecionada;
      }

      if (usaFrequencia) {
        aulaData.alunosPresentes = alunosPresentes;
      }

      await addDoc(collection(db, 'projetos_aulas'), aulaData);
      
      toast.success('Aula lançada com sucesso!');
      
      // Reset form
      setEtapa(1);
      setDataSelecionada(undefined);
      setTurnoSelecionado(null);
      setTurmaSelecionada(null);
      setInstrutoresSelecionados([]);
      setAlunosPresentes([]);
      
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao lançar aula:', error);
      toast.error('Erro ao lançar aula');
    } finally {
      setLoading(false);
    }
  };

  const alunosFiltrados = alunos.filter(a => 
    a.nomeCompleto?.toLowerCase().includes(searchAluno.toLowerCase()) ||
    a.nomeGuerra?.toLowerCase().includes(searchAluno.toLowerCase())
  );

  // Verificar se turno já está ocupado
  const turnoOcupado = (turno: number) => {
    if (usaTurmas) {
      return false; // Verificar por turma na próxima etapa
    }
    return aulasExistentes.some(a => a.turno === turno);
  };

  // Verificar se turma já está ocupada no turno
  const turmaOcupadaNoTurno = (turmaId: string) => {
    return aulasExistentes.some(a => a.turno === turnoSelecionado && a.turmaId === turmaId);
  };

  // Verificar se a data é válida (dias que têm aula e anteriores a hoje)
  const dataValida = (date: Date) => {
    const diaAtual = diasSemana[date.getDay()];
    const ehDiaDeAula = config.diasSemana?.includes(diaAtual);
    const ehAnterior = isBefore(startOfDay(date), startOfDay(hoje));
    return ehDiaDeAula && ehAnterior;
  };

  const totalEtapas = usaTurmas ? (usaFrequencia ? 5 : 4) : (usaFrequencia ? 4 : 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Lançar Aula Retroativa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalEtapas }, (_, i) => i + 1).map((step) => (
            <div
              key={step}
              className={`h-2 flex-1 rounded-full ${
                step <= etapa ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Etapa 1: Selecionar Data */}
        {etapa === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Selecione a Data</h2>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Selecione uma data passada que teve aula programada.
              </AlertDescription>
            </Alert>
            
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={dataSelecionada}
                onSelect={setDataSelecionada}
                locale={ptBR}
                disabled={(date) => !dataValida(date)}
                className="rounded-md border"
              />
            </div>

            {dataSelecionada && (
              <p className="text-center text-sm text-muted-foreground">
                Data selecionada: {format(dataSelecionada, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            )}
          </div>
        )}

        {/* Etapa 2: Selecionar Turno */}
        {etapa === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Selecione o Turno</h2>
            <p className="text-sm text-muted-foreground">
              Data: {dataSelecionada && format(dataSelecionada, "dd/MM/yyyy")}
            </p>
            <div className="space-y-3">
              {Array.from({ length: config.turnosPorDia || 1 }, (_, i) => i + 1).map((turno) => {
                const ocupado = turnoOcupado(turno);
                
                return (
                  <Card
                    key={turno}
                    className={`p-4 transition-all ${
                      ocupado 
                        ? 'opacity-50 cursor-not-allowed' 
                        : `cursor-pointer hover:border-primary ${turnoSelecionado === turno ? 'border-primary border-2 bg-primary/10' : ''}`
                    }`}
                    onClick={() => !ocupado && setTurnoSelecionado(turno)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold">Turno {turno}</p>
                        <p className="text-sm text-muted-foreground">
                          {turnosNomeclatura[turno - 1] || `Turno ${turno}`}
                        </p>
                        {ocupado && (
                          <p className="text-sm text-destructive font-medium mt-1">
                            Aula já lançada neste turno
                          </p>
                        )}
                      </div>
                      {turnoSelecionado === turno && <Check className="h-5 w-5 text-primary" />}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Etapa 3: Selecionar Turma (Se usar turmas) */}
        {etapa === 3 && usaTurmas && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Selecione a Turma</h2>
            <div className="space-y-3">
              {turmas.map((turma) => {
                const ocupada = turmaOcupadaNoTurno(turma.id);
                
                return (
                  <Card
                    key={turma.id}
                    className={`p-4 transition-all ${
                      ocupada 
                        ? 'opacity-50 cursor-not-allowed' 
                        : `cursor-pointer hover:border-primary ${turmaSelecionada === turma.id ? 'border-primary border-2 bg-primary/10' : ''}`
                    }`}
                    onClick={() => !ocupada && setTurmaSelecionada(turma.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold">{turma.nome}</p>
                        {turma.descricao && (
                          <p className="text-sm text-muted-foreground">{turma.descricao}</p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          {turma.alunos?.length || 0} aluno(s)
                        </p>
                        {ocupada && (
                          <p className="text-sm text-destructive font-medium mt-1">
                            Aula já lançada neste turno
                          </p>
                        )}
                      </div>
                      {turmaSelecionada === turma.id && <Check className="h-5 w-5 text-primary" />}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Etapa: Selecionar Instrutores */}
        {((etapa === 3 && !usaTurmas) || (etapa === 4 && usaTurmas)) && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Selecione os Instrutores</h2>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Selecione até {config.maxInstrutoresPorTurno} instrutor(es) que ministraram a aula.
              </AlertDescription>
            </Alert>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {instrutoresDisponiveis.map((instrutor) => (
                <Card
                  key={instrutor.id}
                  className={`p-3 cursor-pointer transition-all ${
                    instrutoresSelecionados.includes(instrutor.id)
                      ? 'border-primary border-2 bg-primary/10'
                      : 'hover:border-primary'
                  }`}
                  onClick={() => toggleInstrutor(instrutor.id)}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={instrutoresSelecionados.includes(instrutor.id)}
                      onCheckedChange={() => toggleInstrutor(instrutor.id)}
                    />
                    <div>
                      <p className="font-medium">
                        {instrutor.postGrad} {instrutor.nomeGuerra || instrutor.nome}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Mat: {instrutor.matricula}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Etapa: Marcar Alunos Presentes */}
        {((etapa === 4 && !usaTurmas && usaFrequencia) || (etapa === 5 && usaTurmas && usaFrequencia)) && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Alunos Presentes</h2>
            <Alert>
              <Users className="h-4 w-4" />
              <AlertDescription>
                Marque os alunos que estiveram presentes na aula.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAlunosPresentes(alunos.map(a => a.id))}
              >
                Marcar Todos
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAlunosPresentes([])}
              >
                Desmarcar Todos
              </Button>
            </div>

            <ScrollArea className="h-60">
              <div className="space-y-2 pr-4">
                {alunosFiltrados.map((aluno) => (
                  <Card
                    key={aluno.id}
                    className={`p-3 cursor-pointer transition-all ${
                      alunosPresentes.includes(aluno.id)
                        ? 'border-green-500 border-2 bg-green-500/10'
                        : 'hover:border-primary'
                    }`}
                    onClick={() => toggleAluno(aluno.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={alunosPresentes.includes(aluno.id)}
                        onCheckedChange={() => toggleAluno(aluno.id)}
                      />
                      <div>
                        <p className="font-medium">{aluno.nomeCompleto}</p>
                        {aluno.nomeGuerra && (
                          <p className="text-sm text-muted-foreground">{aluno.nomeGuerra}</p>
                        )}
                        {aluno.isHorarioEspecial && (
                          <p className="text-xs text-amber-500">Horário Especial</p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <p className="text-center text-sm text-muted-foreground">
              {alunosPresentes.length} de {alunos.length} aluno(s) presente(s)
            </p>
          </div>
        )}

        {/* Navegação */}
        <div className="flex justify-between pt-4">
          {etapa > 1 ? (
            <Button variant="outline" onClick={() => setEtapa(etapa - 1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          ) : (
            <div />
          )}

          {etapa < totalEtapas ? (
            <Button onClick={proximaEtapa} disabled={!validarEtapa()}>
              Próximo
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={lancarAula} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Check className="h-4 w-4 mr-2" />
              Lançar Aula
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LancarAulaRetroativaTab;
