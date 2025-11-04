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
  const [instrutoresSelecionados, setInstrutoresSelecionados] = useState<string[]>([policialLogado.id]);
  const [alunosPresentes, setAlunosPresentes] = useState<string[]>([]);
  const [instrutoresDisponiveis, setInstrutoresDisponiveis] = useState<any[]>([]);
  const [alunos, setAlunos] = useState<any[]>([]);
  const [searchAluno, setSearchAluno] = useState('');
  const [loading, setLoading] = useState(false);

  const projeto = projetos[0]; // Por enquanto, pega o primeiro projeto
  const config = projeto?.configuracao || {};
  const diasSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  const hoje = new Date();
  const diaAtual = diasSemana[hoje.getDay()];

  console.log('Configuração do projeto:', config);
  console.log('Dias configurados:', config.diasSemana);
  console.log('Dia atual:', diaAtual);

  useEffect(() => {
    if (etapa === 2) {
      carregarInstrutores();
    } else if (etapa === 3) {
      carregarAlunos();
    }
  }, [etapa]);

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

      const instrutores = (await Promise.all(instrutoresPromises)).filter(i => i !== null && i.id !== policialLogado.id);
      setInstrutoresDisponiveis(instrutores);
    } catch (error) {
      console.error('Erro ao carregar instrutores:', error);
    }
  };

  const carregarAlunos = async () => {
    try {
      const q = query(
        collection(db, 'projetos_alunos'),
        where('projetoId', '==', projeto.id),
        where('ativo', '==', true)
      );
      const snapshot = await getDocs(q);
      const alunosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAlunos(alunosData);
    } catch (error) {
      console.error('Erro ao carregar alunos:', error);
    }
  };

  const validarEtapa = () => {
    if (etapa === 1 && turnoSelecionado === null) return false;
    if (etapa === 2 && instrutoresSelecionados.length === 0) return false;
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

      const aulaData = {
        projetoId: projeto.id,
        data: new Date(),
        turno: turnoSelecionado,
        instrutores: instrutoresSelecionados,
        instrutoresCompleto: instrutoresSelecionados.length === config.maxInstrutoresPorTurno,
        alunosPresentes,
        status: 'em_andamento',
        horaInicio: new Date(),
        horaFim: null,
        observacoes: ''
      };

      await addDoc(collection(db, 'projetos_aulas'), aulaData);
      
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
        {[1, 2, 3].map((step) => (
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
            {Array.from({ length: config.turnosPorDia || 1 }, (_, i) => i + 1).map((turno) => (
              <Card
                key={turno}
                className={`p-6 cursor-pointer hover:border-primary transition-all ${
                  turnoSelecionado === turno ? 'border-primary border-2' : ''
                }`}
                onClick={() => setTurnoSelecionado(turno)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xl font-bold">Turno {turno}</p>
                    <p className="text-sm text-muted-foreground">
                      {turno === 1 ? 'Manhã' : turno === 2 ? 'Tarde' : 'Noite'}
                    </p>
                  </div>
                  <ChevronRight className="h-8 w-8" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Etapa 2: Selecionar Instrutores */}
      {etapa === 2 && (
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

      {/* Etapa 3: Chamada dos Alunos */}
      {etapa === 3 && (
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
          onClick={etapa === 3 ? iniciarAula : proximaEtapa}
          disabled={!validarEtapa() || loading}
        >
          {etapa === 3 ? (loading ? 'Iniciando...' : 'Iniciar Aula') : 'Próximo'}
          {etapa < 3 && <ArrowRight className="ml-2" />}
        </Button>
      </div>
    </div>
  );
};

export default IniciarAulaWizard;
