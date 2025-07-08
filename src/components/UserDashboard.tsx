import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import TacticalSidebar from '@/components/TacticalSidebar';
import { 
  User, 
  Calendar,
  Clock,
  MapPin,
  RadioIcon as Radio,
  AlertCircle,
  CheckCircle2,
  FileText
} from 'lucide-react';

const UserDashboard = () => {
  return (
    <div className="min-h-screen bg-background flex font-military">
      <TacticalSidebar activeSection="dashboard" onSectionChange={() => {}} isAdmin={false} />
      
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-5xl mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-foreground tracking-wide">
              PAINEL DO POLICIAL
            </h1>
            <p className="text-muted-foreground mt-2">
              Informações pessoais e operacionais
            </p>
          </header>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Perfil do Policial */}
            <Card className="lg:col-span-2 bg-card border-border shadow-tactical">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <User className="h-5 w-5" />
                  DADOS PESSOAIS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-6">
                  <div className="w-24 h-24 bg-tactical-medium rounded-full flex items-center justify-center">
                    <User className="h-12 w-12 text-tactical-text" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Nome Completo
                        </label>
                        <p className="text-foreground font-medium">
                          CABO JOÃO DA SILVA SANTOS
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Matrícula
                        </label>
                        <p className="text-foreground font-medium">
                          PM-123456-SP
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Posto/Graduação
                        </label>
                        <p className="text-foreground font-medium">
                          CABO PM
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Unidade
                        </label>
                        <p className="text-foreground font-medium">
                          CPCHOQUE - 1ª CIA
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Badge variant="default" className="bg-primary">
                        ATIVO
                      </Badge>
                      <Badge variant="outline">
                        OPERACIONAL
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status Operacional */}
            <Card className="bg-card border-border shadow-tactical">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Radio className="h-5 w-5" />
                  STATUS
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted rounded">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-foreground">
                      EM SERVIÇO
                    </span>
                  </div>
                  <Badge variant="default">ATIVO</Badge>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Turno:</span>
                    <span className="text-foreground font-medium">12h às 24h</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Setor:</span>
                    <span className="text-foreground font-medium">CENTRO</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Viatura:</span>
                    <span className="text-foreground font-medium">VTR-045</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Agenda */}
            <Card className="bg-card border-border shadow-tactical">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  PRÓXIMAS ATIVIDADES
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { 
                      title: 'Treinamento Tático', 
                      time: '08:00', 
                      date: 'Amanhã',
                      type: 'training' 
                    },
                    { 
                      title: 'Inspeção de Equipamentos', 
                      time: '14:00', 
                      date: 'Quinta',
                      type: 'inspection' 
                    },
                    { 
                      title: 'Reunião de Briefing', 
                      time: '06:00', 
                      date: 'Sexta',
                      type: 'meeting' 
                    }
                  ].map((activity, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 bg-muted rounded">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {activity.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.date} - {activity.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Comunicados */}
            <Card className="bg-card border-border shadow-tactical">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  COMUNICADOS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { 
                      title: 'Nova Diretriz Operacional', 
                      priority: 'high',
                      read: false 
                    },
                    { 
                      title: 'Atualização de Protocolos', 
                      priority: 'medium',
                      read: true 
                    },
                    { 
                      title: 'Cronograma de Treinamentos', 
                      priority: 'low',
                      read: true 
                    }
                  ].map((notice, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 bg-muted rounded">
                      {notice.read ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        <FileText className="h-4 w-4 text-destructive" />
                      )}
                      <div className="flex-1">
                        <p className={`text-sm ${notice.read ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>
                          {notice.title}
                        </p>
                        <Badge 
                          variant={notice.priority === 'high' ? 'destructive' : 'outline'}
                          className="text-xs mt-1"
                        >
                          {notice.priority === 'high' ? 'URGENTE' : 
                           notice.priority === 'medium' ? 'IMPORTANTE' : 'INFORMATIVO'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Localização */}
            <Card className="bg-card border-border shadow-tactical">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  LOCALIZAÇÃO ATUAL
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-32 bg-tactical-medium rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="h-8 w-8 text-primary mx-auto mb-2" />
                      <p className="text-sm text-foreground font-medium">
                        REGIÃO CENTRAL
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Setor 12 - Patrulhamento
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground text-center">
                    Última atualização: 14:35
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserDashboard;