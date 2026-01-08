import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, Calendar, Clock } from 'lucide-react';
import ConfiguracaoProjetoTab from './ConfiguracaoProjetoTab';
import CadastroAlunosTab from './CadastroAlunosTab';
import VisualizarAulasTab from './VisualizarAulasTab';
import RelatoriosGestorTab from './RelatoriosGestorTab';
import TurmasTab from './TurmasTab';
import ConteudosAulaTab from './ConteudosAulaTab';

interface GestorDashboardProps {
  projetos: any[];
  policialLogado: any;
}

const GestorDashboard = ({ projetos: projetosIniciais, policialLogado }: GestorDashboardProps) => {
  const [projetos, setProjetos] = useState(projetosIniciais);
  const [stats, setStats] = useState({
    totalAlunos: 0,
    totalInstrutores: 0,
    aulasMes: 0,
    horasMes: 0
  });

  const projetoSelecionado = projetos[0]; // Por enquanto, pega o primeiro projeto

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
        setProjetos([projetoAtualizado]);
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
          <h1 className="text-3xl font-bold text-foreground">
            {projetoSelecionado?.nome}
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestão do Projeto Social
          </p>
        </header>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className={`grid w-full ${projetoSelecionado?.configuracao?.usaTurmas ? 'grid-cols-7' : 'grid-cols-6'}`}>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="configuracao">Configuração</TabsTrigger>
            <TabsTrigger value="alunos">Alunos</TabsTrigger>
            {projetoSelecionado?.configuracao?.usaTurmas && (
              <TabsTrigger value="turmas">Turmas</TabsTrigger>
            )}
            <TabsTrigger value="conteudos">Conteúdos</TabsTrigger>
            <TabsTrigger value="aulas">Aulas</TabsTrigger>
            <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-4 gap-6">
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

          <TabsContent value="alunos">
            <CadastroAlunosTab projeto={projetoSelecionado} onUpdate={handleUpdate} />
          </TabsContent>

          {projetoSelecionado?.configuracao?.usaTurmas && (
            <TabsContent value="turmas">
              <TurmasTab projeto={projetoSelecionado} onUpdate={handleUpdate} />
            </TabsContent>
          )}

          <TabsContent value="conteudos">
            <ConteudosAulaTab projeto={projetoSelecionado} />
          </TabsContent>

          <TabsContent value="aulas">
            <VisualizarAulasTab projeto={projetoSelecionado} />
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
