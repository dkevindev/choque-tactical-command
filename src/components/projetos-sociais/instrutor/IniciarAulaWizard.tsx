import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, ArrowRight, ChevronRight, Info, Users } from 'lucide-react';
import { toast } from 'sonner';

interface WizardProps {
  projetos: any[];
  policialLogado: any;
  onSuccess: () => void;
}

const IniciarAulaWizard = ({ projetos, policialLogado, onSuccess }: WizardProps) => {
  const [etapa, setEtapa] = useState(1);
  const [turnoSelecionado, setTurnoSelecionado] = useState<number | null>(null);
  const [turmaSelecionada, setTurmaSelecionada] = useState<string | null>(null);
  const [instrutoresSelecionados, setInstrutoresSelecionados] = useState<string[]>(() => {
    const id = policialLogado?.id || policialLogado?.usuarioId || (typeof policialLogado === 'string' ? policialLogado : '');
    console.log('ID do policial logado:', id);
    return id ? [id] : [];
  });
  const [alunosPresentes, setAlunosPresentes] = useState<string[]>([]);
  const [instrutoresDisponiveis, setInstrutoresDisponiveis] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [alunos, setAlunos] = useState<any[]>([]);
  const [searchAluno, setSearchAluno] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnosOcupados, setTurnosOcupados] = useState<number[]>([]);

  const projeto = projetos[0];
  const config = projeto?.configuracao || {};
  const usaTurmas = config.usaTurmas || false;
  const usaFrequencia = config.usaFrequencia !== undefined ? config.usaFrequencia : true;
  const turnosNomeclatura = config.turnosNomeclatura || ['Manhã', 'Tarde', 'Noite', 'Noturno'];
  const diasSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  const hoje = new Date();
  const diaAtual = diasSemana[hoje.getDay()];

  console.log('Configuração do projeto:', config);
  console.log('Dias configurados:', config.diasSemana);
  console.log('Dia atual:', diaAtual);

  useEffect(() => {
    if (projeto?.id) {
      verificarTurnosOcupados();
    }
  }, [projeto]);

  useEffect(() => {
    if (etapa === 2 && usaTurmas) {
      carregarTurmas();
    } else if ((etapa === 2 && !usaTurmas) || etapa === 3) {
      carregarInstrutores();
    } else if (etapa === (usaTurmas ? 4 : 3) && usaFrequencia) {
      carregarAlunos();
    }
  }, [etapa]);

  const verificarTurnosOcupados = async () => {
    try {
      const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0);
      const fimDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);
      
      const q = query(
        collection(db, 'projetos_aulas'),
        where('projetoId', '==', projeto.id),
        where('data', '>=', inicioDia),
        where('data', '<=', fimDia)
      );
      
      const snapshot = await getDocs(q);
      const turnosUsados = snapshot.docs.map(doc => doc.data().turno);
      setTurnosOcupados(turnosUsados);
      console.log('Turnos ocupados hoje:', turnosUsados);
    } catch (error) {
      console.error('Erro ao verificar turnos ocupados:', error);
    }
  };

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

      const policialIdAtual = policialLogado?.id || policialLogado;
      const instrutores = (await Promise.all(instrutoresPromises)).filter(i => i !== null && i.id !== policialIdAtual);
      setInstrutoresDisponiveis(instrutores);
    } catch (error) {
      console.error('Erro ao carregar instrutores:', error);
    }
  };

  const carregarAlunos = async () => {
    try {
      let q;
      
      if (usaTurmas && turmaSelecionada) {
        // Buscar turma e seus alunos
        const turmaDoc = await getDocs(
          query(collection(db, 'projetos_turmas'), where('__name__', '==', turmaSelecionada))
        );
        
        if (!turmaDoc.empty) {
          const turmaData = turmaDoc.docs[0].data();
          const alunosIds = turmaData.alunos || [];
          
          // Buscar detalhes dos alunos
          const alunosPromises = alunosIds.map(async (alunoId: string) => {
            const alunoSnap = await getDocs(
              query(collection(db, 'projetos_alunos'), where('__name__', '==', alunoId))
            );
            if (!alunoSnap.empty) {
              return {
                id: alunoSnap.docs[0].id,
                ...alunoSnap.docs[0].data()
              };
            }
            return null;
          });
          
          const alunosData = (await Promise.all(alunosPromises)).filter(a => a !== null);
          setAlunos(alunosData);
        }
      } else {
        // Buscar todos os alunos ativos
        q = query(
          collection(db, 'projetos_alunos'),
          where('projetoId', '==', projeto.id),
          where('ativo', '==', true)
        );
        const snapshot = await getDocs(q);
        const alunosData = snapshot.docs.map(doc => ({
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
    if (etapa === 1 && turnoSelecionado === null) return false;
    if (etapa === 2 && usaTurmas && turmaSelecionada === null) return false;
    if ((etapa === 2 && !usaTurmas || etapa === 3) && instrutoresSelecionados.length === 0) return false;
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

  const iniciarAula = async () => {
    try {
      setLoading(true);

      // Validar que os instrutores são IDs válidos (strings)
      const instrutoresValidos = instrutoresSelecionados.filter(id => typeof id === 'string' && id.length > 0);
      
      if (instrutoresValidos.length === 0) {
        toast.error('Erro: nenhum instrutor válido selecionado');
        setLoading(false);
        return;
      }

      console.log('Instrutores a serem salvos:', instrutoresValidos);

      const aulaData: any = {
        projetoId: projeto.id,
        data: new Date(),
        turno: turnoSelecionado,
        turnoNome: turnosNomeclatura[turnoSelecionado! - 1] || `Turno ${turnoSelecionado}`,
        instrutores: instrutoresValidos,
        instrutoresCompleto: instrutoresValidos.length === config.maxInstrutoresPorTurno,
        maxInstrutores: config.maxInstrutoresPorTurno,
        status: 'em_andamento',
        horaInicio: new Date(),
        horaFim: null,
        observacoes: '',
        historico: []
      };

      if (usaTurmas && turmaSelecionada) {
        aulaData.turmaId = turmaSelecionada;
      }

      if (usaFrequencia) {
        aulaData.alunosPresentes = alunosPresentes;
      }

      const docRef = await addDoc(collection(db, 'projetos_aulas'), aulaData);
      console.log('Aula salva com ID:', docRef.id);
      console.log('Dados salvos:', aulaData);
      
      toast.success('Aula iniciada com sucesso!');
      onSuccess();
    } catch (error) {
      console.error('Erro ao iniciar aula:', error);
      toast.error('Erro ao iniciar aula');
      setLoading(false);
    }
  };

  const alunosFiltrados = alunos.filter(a => 
    a.nomeCompleto.toLowerCase().includes(searchAluno.toLowerCase()) ||
    a.nomeGuerra.toLowerCase().includes(searchAluno.toLowerCase())
  );

  // Verificar se hoje tem aula
  if (!config.diasSemana?.includes(diaAtual)) {
    return (
      <div className="p-6 text-center">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Hoje ({diaAtual}) não há aula programada para este projeto.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Progress Bar */}
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: usaTurmas ? (usaFrequencia ? 4 : 3) : (usaFrequencia ? 3 : 2) }, (_, i) => i + 1).map((step) => (
          <div
            key={step}
            className={`h-2 flex-1 rounded-full ${
              step <= etapa ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Etapa 1: Selecionar Turno */}
      {etapa === 1 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Selecione o Turno</h2>
          <div className="space-y-3">
            {Array.from({ length: config.turnosPorDia || 1 }, (_, i) => i + 1).map((turno) => {
              const turnoOcupado = turnosOcupados.includes(turno);
              
              return (
                <Card
                  key={turno}
                  className={`p-6 transition-all ${
                    turnoOcupado 
                      ? 'opacity-50 cursor-not-allowed' 
                      : `cursor-pointer hover:border-primary ${turnoSelecionado === turno ? 'border-primary border-2' : ''}`
                  }`}
                  onClick={() => !turnoOcupado && setTurnoSelecionado(turno)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xl font-bold">Turno {turno}</p>
                      <p className="text-sm text-muted-foreground">
                        {turnosNomeclatura[turno - 1] || `Turno ${turno}`}
                      </p>
                      {turnoOcupado && (
                        <p className="text-sm text-destructive font-medium mt-1">
                          Aula já iniciada hoje
                        </p>
                      )}
                    </div>
                    <ChevronRight className={`h-8 w-8 ${turnoOcupado ? 'opacity-50' : ''}`} />
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Etapa 2: Selecionar Turma (Se usar turmas) */}
      {etapa === 2 && usaTurmas && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Selecione a Turma</h2>
          <div className="space-y-3">
            {turmas.map((turma) => (
              <Card
                key={turma.id}
                className={`p-6 cursor-pointer hover:border-primary transition-all ${
                  turmaSelecionada === turma.id ? 'border-primary border-2' : ''
                }`}
                onClick={() => setTurmaSelecionada(turma.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xl font-bold">{turma.nome}</p>
                    {turma.descricao && (
                      <p className="text-sm text-muted-foreground">{turma.descricao}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      {turma.alunos?.length || 0} aluno(s)
                    </p>
                  </div>
                  <ChevronRight className="h-8 w-8" />
                </div>
              </Card>
            ))}
            {turmas.length === 0 && (
              <p className="text-center text-muted-foreground">
                Nenhuma turma cadastrada ainda
              </p>
            )}
          </div>
        </div>
      )}

      {/* Etapa: Selecionar Instrutores */}
      {((etapa === 2 && !usaTurmas) || (etapa === 3 && usaTurmas)) && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Instrutores</h2>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Você já está incluído. Selecione até {config.maxInstrutoresPorTurno - 1} instrutor(es).
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            {instrutoresDisponiveis.map((instrutor) => (
              <label
                key={instrutor.id}
                className="flex items-center gap-4 p-4 border rounded-lg cursor-pointer hover:bg-muted"
              >
                <Checkbox
                  checked={instrutoresSelecionados.includes(instrutor.id)}
                  onCheckedChange={() => toggleInstrutor(instrutor.id)}
                  className="h-6 w-6"
                />
                <div className="flex-1">
                  <p className="font-medium">
                    {instrutor.postGrad} {instrutor.numeral} {instrutor.nome || instrutor.nomeGuerra}
                  </p>
                  {instrutor.matricula && (
                    <p className="text-sm text-muted-foreground">Mat: {instrutor.matricula}</p>
                  )}
                </div>
              </label>
            ))}
            {instrutoresDisponiveis.length === 0 && (
              <p className="text-center text-muted-foreground">Nenhum outro instrutor disponível</p>
            )}
          </div>
        </div>
      )}

      {/* Etapa: Chamada dos Alunos (Se usar frequência) */}
      {usaFrequencia && ((etapa === 3 && !usaTurmas) || (etapa === 4 && usaTurmas)) && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Chamada</h2>
          
          <Input
            placeholder="Buscar aluno..."
            className="h-12 text-lg"
            value={searchAluno}
            onChange={(e) => setSearchAluno(e.target.value)}
          />

          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription>
              {alunosPresentes.length} de {alunos.length} alunos presentes
            </AlertDescription>
          </Alert>

          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {alunosFiltrados.map((aluno) => (
                <label
                  key={aluno.id}
                  className="flex items-center gap-4 p-4 border rounded-lg cursor-pointer hover:bg-muted"
                >
                  <Checkbox
                    checked={alunosPresentes.includes(aluno.id)}
                    onCheckedChange={() => toggleAluno(aluno.id)}
                    className="h-6 w-6"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{aluno.nomeCompleto}</p>
                    <p className="text-sm text-muted-foreground">
                      {aluno.nomeGuerra} • {aluno.idade} anos
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Navegação */}
      <div className="flex gap-3 pt-4 border-t">
        {etapa > 1 && (
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={() => setEtapa(etapa - 1)}
            disabled={loading}
          >
            <ArrowLeft className="mr-2" />
            Voltar
          </Button>
        )}

        <Button
          size="lg"
          className="flex-1"
          onClick={() => {
            // Calcular última etapa dinamicamente
            const ultimaEtapa = usaTurmas ? (usaFrequencia ? 4 : 3) : (usaFrequencia ? 3 : 2);
            
            if (etapa === ultimaEtapa) {
              iniciarAula();
            } else {
              proximaEtapa();
            }
          }}
          disabled={!validarEtapa() || loading}
        >
          {(() => {
            const ultimaEtapa = usaTurmas ? (usaFrequencia ? 4 : 3) : (usaFrequencia ? 3 : 2);
            if (etapa === ultimaEtapa) {
              return loading ? 'Iniciando...' : 'Iniciar Aula';
            }
            return 'Próximo';
          })()}
          {(() => {
            const ultimaEtapa = usaTurmas ? (usaFrequencia ? 4 : 3) : (usaFrequencia ? 3 : 2);
            return etapa < ultimaEtapa && <ArrowRight className="ml-2" />;
          })()}
        </Button>
      </div>
    </div>
  );
};

export default IniciarAulaWizard;
