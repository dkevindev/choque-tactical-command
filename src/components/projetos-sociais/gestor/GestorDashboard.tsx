import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, Calendar, Clock } from 'lucide-react';
import ConfiguracaoProjetoTab from './ConfiguracaoProjetoTab';
import CadastroAlunosTab from './CadastroAlunosTab';
import VisualizarAulasTab from './VisualizarAulasTab';
import RelatoriosGestorTab from './RelatoriosGestorTab';
import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';

interface GestorDashboardProps {
  projetos: any[];
  policialLogado: any;
}

const GestorDashboard = ({ projetos, policialLogado }: GestorDashboardProps) => {
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
  }, [projetoSelecionado]);

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

      // Contar aulas do mês
      const hoje = new Date();
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      
      const aulasQuery = query(
        collection(db, 'projetos_aulas'),
        where('projetoId', '==', projetoSelecionado.id),
        where('data', '>=', primeiroDiaMes)
      );
      const aulasSnapshot = await getDocs(aulasQuery);
      const aulasMes = aulasSnapshot.size;
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="configuracao">Configuração</TabsTrigger>
            <TabsTrigger value="alunos">Alunos</TabsTrigger>
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
            <ConfiguracaoProjetoTab projeto={projetoSelecionado} onUpdate={carregarEstatisticas} />
          </TabsContent>

          <TabsContent value="alunos">
            <CadastroAlunosTab projeto={projetoSelecionado} onUpdate={carregarEstatisticas} />
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
