import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import TacticalSidebar from '@/components/TacticalSidebar';
import UserViaturaAvarias from '@/components/UserViaturaAvarias';
import { 
  User, 
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  FileText,
  Package,
  Signature,
  CheckSquare,
  ArrowDown
} from 'lucide-react';

const UserDashboard = () => {
  const [activeSection, setActiveSection] = useState('dashboard');

  const renderContent = () => {
    switch (activeSection) {
      case 'reserva':
        return <ReservaArmamento />;
      case 'avarias':
        return <UserViaturaAvarias />;
      default:
        return <DashboardContent />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex font-military">
      <TacticalSidebar activeSection={activeSection} onSectionChange={setActiveSection} isAdmin={false} />
      
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
           
           {renderContent()}
         </div>
       </main>
     </div>
   );
 };

 const DashboardContent = () => {
  return (
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

      {/* Material Cautelado */}
      <Card className="bg-card border-border shadow-tactical">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Package className="h-5 w-5" />
            MATERIAL CAUTELADO
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  PISTOLA .40
                </span>
              </div>
              <Badge variant="default">001</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted rounded">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  MUNIÇÃO .40
                </span>
              </div>
              <Badge variant="outline">45 UN</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted rounded">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  COLETE BALÍSTICO
                </span>
              </div>
              <Badge variant="default">001</Badge>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground text-center border-t pt-3">
            Total de itens: 3
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
    </div>
  );
};

const ReservaArmamento = () => {
  const [materiaisRecebidos, setMateriaisRecebidos] = useState([
    { id: 1, nome: 'PISTOLA .40', serie: 'PM001234', quantidadeRecebida: 1, observacao: 'Conferida e operacional' },
    { id: 2, nome: 'MUNIÇÃO .40', lote: 'L2024001', quantidadeRecebida: 30, observacao: 'Conferida' },
    { id: 3, nome: 'COLETE BALÍSTICO', patrimonio: 'CB001567', quantidadeRecebida: 1, observacao: 'Tamanho G' }
  ]);
  
  const [baixaItems, setBaixaItems] = useState({});
  const [justificativas, setJustificativas] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleBaixaQuantidade = (id, quantidade) => {
    setBaixaItems(prev => ({ ...prev, [id]: quantidade }));
  };

  const handleJustificativa = (id, texto) => {
    setJustificativas(prev => ({ ...prev, [id]: texto }));
  };

  const finalizarBaixa = () => {
    // Lógica para finalizar a baixa
    console.log('Baixa realizada:', { baixaItems, justificativas });
    setIsModalOpen(false);
    setBaixaItems({});
    setJustificativas({});
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border shadow-tactical">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Signature className="h-5 w-5" />
            MATERIAIS RECEBIDOS - SERVIÇO ATUAL
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {materiaisRecebidos.map((item) => (
              <div key={item.id} className="p-4 bg-muted rounded border">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-foreground">{item.nome}</h4>
                    <p className="text-sm text-muted-foreground">
                      {item.serie && `Série: ${item.serie}`}
                      {item.lote && `Lote: ${item.lote}`}
                      {item.patrimonio && `Patrimônio: ${item.patrimonio}`}
                    </p>
                  </div>
                  <Badge variant="outline">
                    QTD: {item.quantidadeRecebida}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{item.observacao}</p>
              </div>
            ))}
            
            <div className="flex gap-3 pt-4 border-t">
              <Button className="flex-1" variant="outline">
                <Signature className="h-4 w-4 mr-2" />
                ASSINAR RECEBIMENTO
              </Button>
              
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button className="flex-1">
                    <ArrowDown className="h-4 w-4 mr-2" />
                    DAR BAIXA
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>BAIXA DE MATERIAL</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {materiaisRecebidos.map((item) => (
                      <div key={item.id} className="p-4 border rounded">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-medium">{item.nome}</h4>
                            <p className="text-sm text-muted-foreground">
                              Recebido: {item.quantidadeRecebida}
                            </p>
                          </div>
                          <CheckSquare className="h-5 w-5 text-primary" />
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor={`quantidade-${item.id}`}>
                              Quantidade devolvida
                            </Label>
                            <Input
                              id={`quantidade-${item.id}`}
                              type="number"
                              max={item.quantidadeRecebida}
                              placeholder="0"
                              onChange={(e) => handleBaixaQuantidade(item.id, parseInt(e.target.value) || 0)}
                            />
                          </div>
                          
                          {baixaItems[item.id] < item.quantidadeRecebida && baixaItems[item.id] !== undefined && (
                            <div>
                              <Label htmlFor={`justificativa-${item.id}`} className="text-destructive">
                                Justificativa obrigatória (diferença: {item.quantidadeRecebida - baixaItems[item.id]})
                              </Label>
                              <Textarea
                                id={`justificativa-${item.id}`}
                                placeholder="Descreva o motivo da diferença (disparos, etc.)"
                                onChange={(e) => handleJustificativa(item.id, e.target.value)}
                                required
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={finalizarBaixa}>
                      Finalizar Baixa
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserDashboard;