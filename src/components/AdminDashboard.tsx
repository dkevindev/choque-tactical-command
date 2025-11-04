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
  TrendingUp,
  UserPlus
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
import MateriaisTransferidos from '@/components/admin-belico/MateriaisTransferidos';
import AdminProjetosSociais from '@/components/projetos-sociais/admin/AdminProjetosSociais';
import { db } from '@/firebase';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Car, Droplet } from 'lucide-react';

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
      case 'guarda-quartel':
        return <GuardaQuartelContent />;
      case 'gestao':
        return <GestaoContent />;
      case 'documentos':
        return <DocumentosContent locationState={location.state} />;
      case 'ordens-servico': // <--- Adicione este novo case
        return <OrdemServicoPage />; // <--- Renderiza o novo componente
      case 'servicos':
        return <ServicosPage />;
      case 'projetos-sociais':
        return <AdminProjetosSociais />;
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
  const [alertasChegada, setAlertasChegada] = useState<any[]>([]);

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

      // Buscar alertas de chegada pendentes
      const alertasSnapshot = await getDocs(
        query(collection(db, 'alertas_chegada'), where('status', '==', 'pendente'))
      );
      const alertasData = alertasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAlertasChegada(alertasData);

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

  const handleMarcarSemAlteracao = async (alertaId: string) => {
    try {
      await updateDoc(doc(db, 'alertas_chegada', alertaId), {
        status: 'sem_alteracao',
        dataResolucao: new Date().toISOString()
      });
      
      setAlertasChegada(prev => prev.filter(a => a.id !== alertaId));
      
      // Toast de sucesso seria bom aqui
    } catch (error) {
      console.error('Erro ao marcar como sem alteração:', error);
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
      {/* Alertas de Chegada de Policiais */}
      {alertasChegada.length > 0 && (
        <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
          <UserPlus className="h-4 w-4" />
          <AlertTitle>Novos Policiais Chegaram</AlertTitle>
          <AlertDescription>
            {alertasChegada.length} policial(is) recém-chegado(s) aguardando registro de materiais bélicos.
            <div className="mt-3 space-y-3">
              {alertasChegada.map((alerta: any) => (
                <div key={alerta.id} className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-blue-200">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium">{alerta.policialPostGrad} {alerta.policialNome}</p>
                      <p className="text-sm text-muted-foreground">
                        Origem: {alerta.unidadeOrigem} • Chegada: {new Date(alerta.dataChegada).toLocaleDateString('pt-BR')}
                      </p>
                      {alerta.policialMatricula && (
                        <p className="text-sm text-muted-foreground">Matrícula: {alerta.policialMatricula}</p>
                      )}
                      {alerta.materiaisTrazidos && (
                        <div className="mt-2 flex gap-2">
                          {alerta.materiaisTrazidos.pistola && (
                            <Badge variant="secondary" className="text-xs">Pistola</Badge>
                          )}
                          {alerta.materiaisTrazidos.colete && (
                            <Badge variant="secondary" className="text-xs">Colete</Badge>
                          )}
                          {alerta.materiaisTrazidos.municao && (
                            <Badge variant="secondary" className="text-xs">Munição</Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMarcarSemAlteracao(alerta.id)}
                    >
                      Sem Alteração
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs mt-3 font-medium">
              💡 Vá até o Controle Bélico para adicionar os materiais que o policial trouxe (arma, colete, etc.)
            </p>
          </AlertDescription>
        </Alert>
      )}

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

      {/* Dashboard Rico com Múltiplas Informações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerta de Troca de Óleo */}
        <AlertaTrocaOleo />
        
        {/* Cards de Informações Adicionais podem ser adicionados aqui */}
      </div>
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
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="cautelas">Cautelas</TabsTrigger>
              <TabsTrigger value="transferencias">Transferências</TabsTrigger>
              <TabsTrigger value="materiais">Materiais</TabsTrigger>
              <TabsTrigger value="estoque">Carga</TabsTrigger>
              <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
            </TabsList>

            <TabsContent value="cautelas">
              <GerenciarCautelas />
            </TabsContent>

            <TabsContent value="transferencias">
              <MateriaisTransferidos />
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

const AlertaTrocaOleo = () => {
  const [viaturasAlerta, setViaturasAlerta] = useState<any[]>([]);

  useEffect(() => {
    fetchViaturasAlerta();
  }, []);

  const fetchViaturasAlerta = async () => {
    try {
      const VIATURAS_MONITORADAS = [
        'CAV - 04', 'CAV - 05', 'CAV - 06', 'CAV - 08', 'CAV - 11', 
        'CAV - 12', 'CAV - 13', 'TA - 01', 'TA - 02', 'TA - 03', 
        'TP', '6398', 'DUSTER'
      ];

      const viaturasSnapshot = await getDocs(collection(db, 'frota'));
      const todasViaturas = viaturasSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];

      const viaturasComAlerta = todasViaturas.filter(v => {
        const isMonitorada = VIATURAS_MONITORADAS.includes(v.CADASTRO || '');
        const kmRestante = (v.KMOLEO || 0) - (v.KM || 0);
        return isMonitorada && kmRestante <= 500 && kmRestante > 0;
      });

      setViaturasAlerta(viaturasComAlerta);
    } catch (error) {
      console.error('Erro ao buscar viaturas com alerta:', error);
    }
  };

  if (viaturasAlerta.length === 0) {
    return null;
  }

  return (
    <Card className="border-orange-500 bg-orange-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-600">
          <Droplet className="h-5 w-5" />
          Alerta de Troca de Óleo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {viaturasAlerta.map(v => {
            const kmRestante = (v.KMOLEO || 0) - (v.KM || 0);
            return (
              <div key={v.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="font-medium">{v.CADASTRO}</span>
                    <span className="text-sm text-muted-foreground ml-2">({v.PLACA})</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-orange-600">
                    Faltam {kmRestante.toLocaleString()} km
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

const GuardaQuartelContent = () => {
  const navigate = (path: string) => {
    window.location.href = path;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">GUARDA DO QUARTEL</h2>
        <p className="text-muted-foreground">
          Sistema de controle e registro das atividades da guarda
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary"
          onClick={() => navigate('/guarda-quartel')}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Novo Livro da Guarda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Criar novo relatório do oficial de operações (24h) com todas as escalas e ocorrências do dia
            </p>
          </CardContent>
        </Card>

        <Card className="border-dashed opacity-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <Shield className="h-6 w-6" />
              Histórico de Livros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Em breve: Consultar e imprimir livros anteriores
            </p>
          </CardContent>
        </Card>

        <Card className="border-dashed opacity-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-6 w-6" />
              Escalas de Serviço
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Em breve: Gerenciar escalas de serviço interno e externo
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;