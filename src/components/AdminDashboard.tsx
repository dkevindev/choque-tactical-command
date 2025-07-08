import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import TacticalSidebar from '@/components/TacticalSidebar';
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

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState('dashboard');

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
  const stats = [
    { 
      title: 'EFETIVO ATIVO', 
      value: '1,247', 
      icon: Users, 
      status: 'operational',
      description: 'Policiais em serviço'
    },
    { 
      title: 'VIATURAS ATIVAS', 
      value: '89', 
      icon: Truck, 
      status: 'operational',
      description: 'Frota operacional'
    },
    { 
      title: 'ARMAMENTOS', 
      value: '2,156', 
      icon: Target, 
      status: 'warning',
      description: 'Itens bélicos registrados'
    },
    { 
      title: 'EQUIPAMENTOS', 
      value: '3,421', 
      icon: Shield, 
      status: 'operational',
      description: 'Patrimônio total'
    }
  ];

  return (
    <div className="space-y-6">
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
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border shadow-tactical">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              ALERTAS RECENTES
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { type: 'CRÍTICO', message: 'Manutenção viatura VTR-001 vencida', time: '14:30' },
                { type: 'ATENÇÃO', message: 'Estoque de munição baixo - Lote 45', time: '13:15' },
                { type: 'INFO', message: 'Relatório mensal gerado com sucesso', time: '12:00' }
              ].map((alert, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded border-l-4 border-destructive">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <Badge variant="outline" className="mb-1">{alert.type}</Badge>
                    <p className="text-sm text-foreground">{alert.message}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{alert.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border shadow-tactical">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              ATIVIDADES RECENTES
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { action: 'Cadastro de novo equipamento', user: 'Sgt. Silva', time: '15:45' },
                { action: 'Atualização de dados - Policial', user: 'Cb. Santos', time: '14:20' },
                { action: 'Relatório de manutenção enviado', user: 'Ten. Oliveira', time: '13:30' }
              ].map((activity, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">por {activity.user}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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

const BelicoContent = () => (
  <Card className="bg-card border-border shadow-tactical">
    <CardHeader>
      <CardTitle className="text-foreground">CONTROLE BÉLICO</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground">
        Módulo de armamentos e munições em desenvolvimento...
      </p>
    </CardContent>
  </Card>
);

const FrotaContent = () => (
  <Card className="bg-card border-border shadow-tactical">
    <CardHeader>
      <CardTitle className="text-foreground">GESTÃO DE FROTA</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground">
        Módulo de controle de viaturas em desenvolvimento...
      </p>
    </CardContent>
  </Card>
);

const PolicialContent = () => (
  <Card className="bg-card border-border shadow-tactical">
    <CardHeader>
      <CardTitle className="text-foreground">GESTÃO DE PESSOAL</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground">
        Módulo de controle de efetivo em desenvolvimento...
      </p>
    </CardContent>
  </Card>
);

export default AdminDashboard;