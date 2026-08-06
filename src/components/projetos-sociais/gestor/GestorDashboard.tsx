import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, Calendar, Clock, ArrowLeft, CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConfiguracaoProjetoTab from './ConfiguracaoProjetoTab';
import CadastroAlunosTab from './CadastroAlunosTab';
import VisualizarAulasTab from './VisualizarAulasTab';
import RelatoriosGestorTab from './RelatoriosGestorTab';
import TurmasTab from './TurmasTab';
import ConteudosAulaTab from './ConteudosAulaTab';
import FrequenciaMensalTab from './FrequenciaMensalTab';
import LancarAulaRetroativaTab from './LancarAulaRetroativaTab';

interface GestorDashboardProps {
  projetos: any[];
  projetoInicial: any;
  policialLogado: any;
  onVoltarSelecao?: () => void;
}

const GestorDashboard = ({ projetos: projetosIniciais, projetoInicial, policialLogado, onVoltarSelecao }: GestorDashboardProps) => {
  const [projetoSelecionado, setProjetoSelecionado] = useState(projetoInicial);
  const [abaAtiva, setAbaAtiva] = useState('overview');
  const [stats, setStats] = useState({
    totalAlunos: 0,
    totalInstrutores: 0,
    aulasMes: 0,
    horasMes: 0
  });

  useEffect(() => {
    if (projetoSelecionado) {
      carregarEstatisticas();
    }
  }, [projetoSelecionado?.id]);

  const recarregarProjeto = async () => {
    try {
      console.log('Recarregando dados do projeto...');
      const projetoDoc = await getDocs(
        query(collection(db, 'projetos_sociais'), where('__name__', '==', projetoSelecionado.id))
      );
      
      if (!projetoDoc.empty) {
        const projetoAtualizado = {
          id: projetoDoc.docs[0].id,
          ...projetoDoc.docs[0].data()
        };
        console.log('Projeto recarregado:', projetoAtualizado);
        setProjetoSelecionado(projetoAtualizado);
      }
    } catch (error) {
      console.error('Erro ao recarregar projeto:', error);
    }
  };

  const carregarEstatisticas = async () => {
    try {
      // Contar alunos ativos
      const alunosQuery = query(
        collection(db, 'projetos_alunos'),
        where('projetoId', '==', projetoSelecionado.id),
        where('ativo', '==', true)
      );
      const alunosSnapshot = await getDocs(alunosQuery);
      const totalAlunos = alunosSnapshot.size;

      // Contar instrutores ativos
      const instrutoresQuery = query(
        collection(db, 'projetos_instrutores'),
        where('projetoId', '==', projetoSelecionado.id),
        where('ativo', '==', true)
      );
      const instrutoresSnapshot = await getDocs(instrutoresQuery);
      const totalInstrutores = instrutoresSnapshot.size;

      // Contar aulas do mês - buscar todas e filtrar em memória
      const hoje = new Date();
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      
      const aulasQuery = query(
        collection(db, 'projetos_aulas'),
        where('projetoId', '==', projetoSelecionado.id)
      );
      const aulasSnapshot = await getDocs(aulasQuery);
      
      // Filtrar aulas encerradas do mês em memória
      const aulasDoMes = aulasSnapshot.docs.filter(doc => {
        const aula = doc.data();
        const aulaData = aula.data?.toDate ? aula.data.toDate() : new Date(aula.data);
        return aula.status === 'encerrada' && aulaData >= primeiroDiaMes;
      });
      
      const aulasMes = aulasDoMes.length;
      const horasMes = aulasMes * 3;

      setStats({
        totalAlunos,
        totalInstrutores,
        aulasMes,
        horasMes
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleUpdate = async () => {
    await recarregarProjeto();
    await carregarEstatisticas();
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center gap-4">
            {onVoltarSelecao && (
              <Button variant="ghost" size="sm" onClick={onVoltarSelecao}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Trocar Projeto
              </Button>
            )}
          </div>
          <h1 className="text-3xl font-bold text-foreground mt-2">
            {projetoSelecionado?.nome}
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestão do Projeto Social
          </p>
        </header>

        <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="space-y-6">
          <TabsList className={`grid w-full ${projetoSelecionado?.configuracao?.usaFrequencia !== false ? 'grid-cols-9' : 'grid-cols-8'}`}>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="configuracao">Configuração</TabsTrigger>
            {projetoSelecionado?.configuracao?.usaFrequencia !== false && (
              <TabsTrigger value="alunos">Alunos</TabsTrigger>
            )}
            <TabsTrigger value="turmas">Turmas</TabsTrigger>
            <TabsTrigger value="conteudos">Conteúdos</TabsTrigger>
            <TabsTrigger value="aulas">Aulas</TabsTrigger>
            <TabsTrigger value="lancar-aula" className="flex items-center gap-1">
              <CalendarPlus className="h-3 w-3" />
              Lançar Aula
            </TabsTrigger>
            <TabsTrigger value="frequencia">Frequência</TabsTrigger>
            <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className={`grid gap-6 ${projetoSelecionado?.configuracao?.usaFrequencia !== false ? 'grid-cols-4' : 'grid-cols-3'}`}>
              {projetoSelecionado?.configuracao?.usaFrequencia !== false && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Alunos Ativos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <Users className="h-8 w-8 text-primary" />
                      <p className="text-3xl font-bold">{stats.totalAlunos}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Instrutores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <UserCheck className="h-8 w-8 text-primary" />
                    <p className="text-3xl font-bold">{stats.totalInstrutores}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Aulas este Mês
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-8 w-8 text-primary" />
                    <p className="text-3xl font-bold">{stats.aulasMes}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Horas Ministradas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Clock className="h-8 w-8 text-primary" />
                    <p className="text-3xl font-bold">{stats.horasMes}h</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="configuracao">
            <ConfiguracaoProjetoTab projeto={projetoSelecionado} onUpdate={handleUpdate} />
          </TabsContent>

          {projetoSelecionado?.configuracao?.usaFrequencia !== false && (
            <TabsContent value="alunos">
              <CadastroAlunosTab projeto={projetoSelecionado} onUpdate={handleUpdate} />
            </TabsContent>
          )}

          <TabsContent value="turmas">
            <TurmasTab projeto={projetoSelecionado} onUpdate={handleUpdate} />
          </TabsContent>

          <TabsContent value="conteudos">
            <ConteudosAulaTab projeto={projetoSelecionado} />
          </TabsContent>

          <TabsContent value="aulas">
            <VisualizarAulasTab
              projeto={projetoSelecionado}
              policialLogado={policialLogado}
              onIrParaLancarAula={() => setAbaAtiva('lancar-aula')}
              onChange={carregarEstatisticas}
            />
          </TabsContent>

          <TabsContent value="lancar-aula">
            <LancarAulaRetroativaTab projeto={projetoSelecionado} onSuccess={handleUpdate} />
          </TabsContent>

          <TabsContent value="frequencia">
            <FrequenciaMensalTab projeto={projetoSelecionado} />
          </TabsContent>

          <TabsContent value="relatorios">
            <RelatoriosGestorTab projeto={projetoSelecionado} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default GestorDashboard;
