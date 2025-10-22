import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import TacticalSidebar from '@/components/TacticalSidebar';
import ViaturaTable from '@/components/ViaturaTable';
import PolicialTable from '@/components/PolicialTable';
import {
  Shield,
  Users,
  Truck,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FrotaPage from '@/components/FrotaPage';
import DocumentosPage from './DocumentosPaga';
import OrdemServicoPage from '@/components/OrdemServicoPage';
import GestaoAcesso from '@/components/GestaoAcesso';
import ServicosPage from '@/components/frota/ServicosPage';
import CadastroMateriais from '@/components/admin-belico/CadastroMateriais';
import GerenciarCategorias from '@/components/admin-belico/GerenciarCategorias';
import ControleEstoque from '@/components/admin-belico/ControleEstoque';
import GerenciarCautelas from '@/components/admin-belico/GerenciarCautelas';
import RelatoriosBelico from '@/components/admin-belico/RelatoriosBelico';
import { db } from '@/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const location = useLocation();

  useEffect(() => {
    if (location.state?.activeSection) {
      setActiveSection(location.state.activeSection);
    }
  }, [location.state]);

  const renderContent = () => {
    switch (activeSection) {
      case 'patrimonio':
        return <PatrimonioContent />;
      case 'belico':
        return <BelicoContent />;
      case 'frota':
        return <FrotaContent />;
      case 'policial':
        return <PolicialContent />;
      case 'gestao':
        return <GestaoContent />;
      case 'documentos':
        return <DocumentosContent locationState={location.state} />;
      case 'ordens-servico': // <--- Adicione este novo case
        return <OrdemServicoPage />; // <--- Renderiza o novo componente
      case 'servicos':
        return <ServicosPage />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex font-military">
      <TacticalSidebar activeSection={activeSection} onSectionChange={setActiveSection} isAdmin={true} />

      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-foreground tracking-wide">
              PAINEL ADMINISTRATIVO
            </h1>
            <p className="text-muted-foreground mt-2">
              Comando de Policiamento de Choque - Sistema de Gestão
            </p>
          </header>

          {renderContent()}
        </div>
      </main>
    </div>
  );
};

const DashboardOverview = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Array<{
    title: string;
    value: string;
    icon: any;
    status: 'operational' | 'warning';
    description: string;
  }>>([
    {
      title: 'EFETIVO ATIVO',
      value: '0',
      icon: Users,
      status: 'operational',
      description: 'Policiais em serviço'
    },
    {
      title: 'VIATURAS ATIVAS',
      value: '0',
      icon: Truck,
      status: 'operational',
      description: 'Frota operacional'
    },
    {
      title: 'ARMAMENTOS',
      value: '0',
      icon: Target,
      status: 'operational',
      description: 'Itens bélicos registrados'
    },
    {
      title: 'EQUIPAMENTOS',
      value: '0',
      icon: Shield,
      status: 'operational',
      description: 'Patrimônio total'
    }
  ]);
  
  const [coletesVencidos, setColetesVencidos] = useState<any[]>([]);
  const [coletesVencendo, setColetesVencendo] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Buscar policiais
      const policiaisSnapshot = await getDocs(collection(db, 'policiais'));
      const totalPoliciais = policiaisSnapshot.size;

      // Buscar viaturas
      const viaturasSnapshot = await getDocs(collection(db, 'frota'));
      const totalViaturas = viaturasSnapshot.size;

      // Buscar materiais bélicos
      const materiaisSnapshot = await getDocs(collection(db, 'materiais_belicos'));
      const materiais = materiaisSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Contar armamentos (excluindo coletes)
      const armamentos = materiais.filter((m: any) => 
        m.categoria && m.categoria !== 'Colete Balístico'
      );
      
      // Total de equipamentos (todos os materiais)
      const totalEquipamentos = materiais.length;

      // Verificar coletes vencidos e vencendo
      const hoje = new Date();
      const seisAPartir = new Date();
      seisAPartir.setMonth(seisAPartir.getMonth() + 6);

      const coletes = materiais.filter((m: any) => m.categoria === 'Colete Balístico');
      
      const vencidos = coletes.filter((c: any) => {
        if (!c.vencimento) return false;
        const dataVencimento = new Date(c.vencimento);
        return dataVencimento < hoje;
      });

      const vencendo = coletes.filter((c: any) => {
        if (!c.vencimento) return false;
        const dataVencimento = new Date(c.vencimento);
        return dataVencimento >= hoje && dataVencimento <= seisAPartir;
      });

      setColetesVencidos(vencidos);
      setColetesVencendo(vencendo);

      // Atualizar stats
      setStats([
        {
          title: 'EFETIVO ATIVO',
          value: totalPoliciais.toString(),
          icon: Users,
          status: 'operational',
          description: 'Policiais em serviço'
        },
        {
          title: 'VIATURAS ATIVAS',
          value: totalViaturas.toString(),
          icon: Truck,
          status: 'operational',
          description: 'Frota operacional'
        },
        {
          title: 'ARMAMENTOS',
          value: armamentos.length.toString(),
          icon: Target,
          status: vencidos.length > 0 ? 'warning' : 'operational',
          description: 'Itens bélicos registrados'
        },
        {
          title: 'EQUIPAMENTOS',
          value: totalEquipamentos.toString(),
          icon: Shield,
          status: 'operational',
          description: 'Patrimônio total'
        }
      ]);

      setLoading(false);
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-card border-border shadow-tactical">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-muted rounded w-24"></div>
                  <div className="h-8 bg-muted rounded w-16"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alertas de Coletes */}
      {coletesVencidos.length > 0 && (
        <Alert variant="destructive" className="border-red-500">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Coletes Balísticos Vencidos</AlertTitle>
          <AlertDescription>
            {coletesVencidos.length} colete(s) balístico(s) com validade vencida. 
            <ul className="mt-2 space-y-1">
              {coletesVencidos.slice(0, 3).map((colete: any) => (
                <li key={colete.id} className="text-sm">
                  • {colete.numeroSerie || 'S/N'} - Vencimento: {new Date(colete.vencimento).toLocaleDateString('pt-BR')}
                  {colete.policialAssociadoNome && ` (Cautelado: ${colete.policialAssociadoNome})`}
                </li>
              ))}
              {coletesVencidos.length > 3 && (
                <li className="text-sm font-medium">+ {coletesVencidos.length - 3} outros coletes vencidos</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {coletesVencendo.length > 0 && (
        <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <Clock className="h-4 w-4" />
          <AlertTitle>Coletes Vencendo nos Próximos 6 Meses</AlertTitle>
          <AlertDescription>
            {coletesVencendo.length} colete(s) balístico(s) vencendo em breve.
            <ul className="mt-2 space-y-1">
              {coletesVencendo.slice(0, 3).map((colete: any) => (
                <li key={colete.id} className="text-sm">
                  • {colete.numeroSerie || 'S/N'} - Vencimento: {new Date(colete.vencimento).toLocaleDateString('pt-BR')}
                  {colete.policialAssociadoNome && ` (Cautelado: ${colete.policialAssociadoNome})`}
                </li>
              ))}
              {coletesVencendo.length > 3 && (
                <li className="text-sm font-medium">+ {coletesVencendo.length - 3} outros coletes vencendo</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="bg-card border-border shadow-tactical">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                </div>
                <div className="p-3 bg-accent rounded-lg">
                  <stat.icon className="h-6 w-6 text-accent-foreground" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <Badge variant={stat.status === 'operational' ? 'default' : 'secondary'}>
                  {stat.status === 'operational' ? 'OPERACIONAL' : 'ATENÇÃO'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Frota - Viaturas com Alertas */}
      <Card className="bg-card border-border shadow-tactical">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Truck className="h-5 w-5" />
            FROTA - VIATURAS COM ALERTAS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ViaturaTable />
        </CardContent>
      </Card>
    </div>
  );
};

const PatrimonioContent = () => (
  <Card className="bg-card border-border shadow-tactical">
    <CardHeader>
      <CardTitle className="text-foreground">GESTÃO DE PATRIMÔNIO</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground">
        Módulo de controle patrimonial em desenvolvimento...
      </p>
    </CardContent>
  </Card>
);

const BelicoContent = () => {
  return (
    <div className="space-y-6">
      <Card className="bg-card border-border shadow-tactical">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Target className="h-5 w-5" />
            CONTROLE BÉLICO - CAUTELAS PERMANENTES
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Sistema para gerenciar cautelas permanentes de materiais bélicos aos policiais
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="cautelas" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="cautelas">Cautelas Permanentes</TabsTrigger>
              <TabsTrigger value="materiais">Materiais</TabsTrigger>
              <TabsTrigger value="estoque">Estoque</TabsTrigger>
              <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
            </TabsList>

            <TabsContent value="cautelas">
              <GerenciarCautelas />
            </TabsContent>

            <TabsContent value="materiais">
              <CadastroMateriais />
            </TabsContent>

            <TabsContent value="estoque">
              <ControleEstoque />
            </TabsContent>

            <TabsContent value="relatorios">
              <RelatoriosBelico />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

const FrotaContent = () => (
  <FrotaPage />
);

const PolicialContent = () => (
  <Card className="bg-card border-border shadow-tactical">
    <CardHeader>
      <CardTitle className="text-foreground">GESTÃO DE PESSOAL</CardTitle>
    </CardHeader>
    <CardContent>
      <PolicialTable />
    </CardContent>
  </Card>
);

const DocumentosContent = ({ locationState }: { locationState?: any }) => (
  <DocumentosPage locationState={locationState} />
);

const GestaoContent = () => (
  <GestaoAcesso />
);

export default AdminDashboard;