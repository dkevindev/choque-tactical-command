import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import TacticalSidebar from '@/components/TacticalSidebar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import MaterialNaRuaSection from '@/components/reserva-armamento/MaterialNaRuaSection';
import { db } from '@/firebase';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Car, Droplet } from 'lucide-react';
import AlertasGestaoSection from '@/components/gestao/AlertasGestaoSection';

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
      case 'na-rua':
        return <MaterialNaRuaSection />;
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

  // Função auxiliar para calcular tempo restante até vencimento
  const calcularTempoRestante = (dataVencimento: string) => {
    const hoje = new Date();
    const vencimento = new Date(dataVencimento);
    
    let anos = vencimento.getFullYear() - hoje.getFullYear();
    let meses = vencimento.getMonth() - hoje.getMonth();
    let dias = vencimento.getDate() - hoje.getDate();

    if (dias < 0) {
      meses--;
      const ultimoDiaMesAnterior = new Date(vencimento.getFullYear(), vencimento.getMonth(), 0).getDate();
      dias += ultimoDiaMesAnterior;
    }

    if (meses < 0) {
      anos--;
      meses += 12;
    }

    const totalMeses = anos * 12 + meses;

    if (totalMeses === 0 && dias === 0) {
      return 'Vence hoje';
    } else if (totalMeses === 0) {
      return `Vence em ${dias} dia${dias !== 1 ? 's' : ''}`;
    } else if (dias === 0) {
      return `Vence em ${totalMeses} ${totalMeses === 1 ? 'mês' : 'meses'}`;
    } else {
      return `Vence em ${totalMeses} ${totalMeses === 1 ? 'mês' : 'meses'} e ${dias} dia${dias !== 1 ? 's' : ''}`;
    }
  };
  
  const [coletesVencidos, setColetesVencidos] = useState<any[]>([]);
  const [coletesVencendo, setColetesVencendo] = useState<any[]>([]);
  const [alertasChegada, setAlertasChegada] = useState<any[]>([]);
  const [alertasChecklist, setAlertasChecklist] = useState<any[]>([]);
  const [showColetesVencendoModal, setShowColetesVencendoModal] = useState(false);
  const [showColetesVencidosModal, setShowColetesVencidosModal] = useState(false);

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

      // Buscar viaturas com problemas no checklist (sem ciência)
      const viaturasChecklists: any[] = [];
      viaturasSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.ultimoChecklist?.problemas?.length > 0 && !data.ultimoChecklist?.cienciaProblemas) {
          viaturasChecklists.push({
            viaturaId: docSnap.id,
            placa: data.PLACA,
            cadastro: data.CADASTRO,
            modelo: data.MODELO,
            problemas: data.ultimoChecklist.problemas,
            checklist: data.ultimoChecklist,
            dataVerificacao: data.ultimoChecklist.dataVerificacao,
            verificadoPor: data.ultimoChecklist.verificadoPor
          });
        }
      });
      setAlertasChecklist(viaturasChecklists);

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

  const handleCienciaChecklist = async (viaturaId: string, checklist: any) => {
    try {
      await updateDoc(doc(db, 'frota', viaturaId), {
        ultimoChecklist: {
          ...checklist,
          cienciaProblemas: true,
          dataCienciaProblemas: new Date().toISOString()
        }
      });
      
      setAlertasChecklist(prev => prev.filter(a => a.viaturaId !== viaturaId));
    } catch (error) {
      console.error('Erro ao registrar ciência:', error);
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
    <>
      {/* Modal Coletes Vencidos */}
      <Dialog open={showColetesVencidosModal} onOpenChange={setShowColetesVencidosModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] bg-destructive/10 dark:bg-destructive/20 border-destructive">
          <DialogHeader>
            <DialogTitle className="text-destructive">Coletes Balísticos Vencidos</DialogTitle>
            <DialogDescription>
              Total de {coletesVencidos.length} colete(s) com validade vencida
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {coletesVencidos.map((colete: any) => {
                const hoje = new Date();
                const vencimento = new Date(colete.vencimento);
                const diasVencidos = Math.floor((hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24));
                const mesesVencidos = Math.floor(diasVencidos / 30);
                const diasRestantes = diasVencidos % 30;

                let textoVencido = '';
                if (mesesVencidos > 0) {
                  textoVencido = `Vencido há ${mesesVencidos} ${mesesVencidos === 1 ? 'mês' : 'meses'}${diasRestantes > 0 ? ` e ${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''}` : ''}`;
                } else {
                  textoVencido = `Vencido há ${diasVencidos} dia${diasVencidos !== 1 ? 's' : ''}`;
                }

                return (
                  <div key={colete.id} className="border border-destructive/50 rounded-lg p-4 bg-destructive/20 dark:bg-destructive/30">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">
                          Número de Série: {colete.numeroSerie || 'S/N'}
                        </p>
                        <p className="text-sm text-destructive font-medium mt-1">
                          {textoVencido}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Vencimento: {new Date(colete.vencimento).toLocaleDateString('pt-BR')}
                        </p>
                        {colete.policialAssociadoNome && (
                          <p className="text-sm text-muted-foreground">
                            Cautelado: {colete.policialAssociadoNome}
                          </p>
                        )}
                        {colete.policialAssociadoPostGrad && (
                          <p className="text-sm text-muted-foreground">
                            Posto/Graduação: {colete.policialAssociadoPostGrad}
                          </p>
                        )}
                      </div>
                      <Badge variant="destructive" className="shrink-0">Vencido</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Modal Coletes Vencendo */}
      <Dialog open={showColetesVencendoModal} onOpenChange={setShowColetesVencendoModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] bg-orange-900/20 dark:bg-orange-950/40 border-orange-700">
          <DialogHeader>
            <DialogTitle className="text-orange-700 dark:text-orange-400">
              Coletes Vencendo nos Próximos 6 Meses
            </DialogTitle>
            <DialogDescription>
              Total de {coletesVencendo.length} colete(s) vencendo em breve
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {coletesVencendo.map((colete: any) => {
                const tempoRestante = calcularTempoRestante(colete.vencimento);

                return (
                  <div key={colete.id} className="border border-orange-700 dark:border-orange-600 rounded-lg p-4 bg-orange-900/30 dark:bg-orange-950/50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 space-y-2">
                        <div>
                          <p className="font-semibold text-foreground">
                            Número de Série: {colete.numeroSerie || 'S/N'}
                          </p>
                          <p className="text-sm text-orange-700 dark:text-orange-400 font-medium mt-1">
                            {tempoRestante}
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-2 border-t border-orange-700/30">
                          <div>
                            <p className="text-xs text-muted-foreground">Vencimento</p>
                            <p className="text-sm font-medium">{new Date(colete.vencimento).toLocaleDateString('pt-BR')}</p>
                          </div>
                          
                          {colete.dataFabricacao && (
                            <div>
                              <p className="text-xs text-muted-foreground">Data Fabricação</p>
                              <p className="text-sm font-medium">{new Date(colete.dataFabricacao).toLocaleDateString('pt-BR')}</p>
                            </div>
                          )}
                          
                          {colete.fabricante && (
                            <div>
                              <p className="text-xs text-muted-foreground">Fabricante</p>
                              <p className="text-sm font-medium">{colete.fabricante}</p>
                            </div>
                          )}
                          
                          {colete.tamanho && (
                            <div>
                              <p className="text-xs text-muted-foreground">Tamanho</p>
                              <p className="text-sm font-medium">{colete.tamanho}</p>
                            </div>
                          )}
                          
                          {colete.sexo && (
                            <div>
                              <p className="text-xs text-muted-foreground">Sexo</p>
                              <p className="text-sm font-medium">{colete.sexo}</p>
                            </div>
                          )}
                        </div>
                        
                        {(colete.policialAssociadoNome || colete.policialAssociadoPostGrad) && (
                          <div className="pt-2 border-t border-orange-700/30">
                            {colete.policialAssociadoNome && (
                              <p className="text-sm text-muted-foreground">
                                Cautelado: {colete.policialAssociadoNome}
                              </p>
                            )}
                            {colete.policialAssociadoPostGrad && (
                              <p className="text-sm text-muted-foreground">
                                Posto/Graduação: {colete.policialAssociadoPostGrad}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <Badge className="bg-orange-700 text-white shrink-0">Vencendo</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        {/* Alertas de Chegada de Policiais */}
      {alertasChegada.length > 0 && (
        <Alert className="border-blue-700 bg-blue-900/10 dark:bg-blue-950/20">
          <UserPlus className="h-4 w-4 text-blue-700" />
          <AlertTitle className="text-blue-700">Novos Policiais Chegaram</AlertTitle>
          <AlertDescription className="text-foreground">
            {alertasChegada.length} policial(is) recém-chegado(s) aguardando registro de materiais bélicos.
            <div className="mt-3 space-y-3">
              {alertasChegada.map((alerta: any) => (
                <div key={alerta.id} className="bg-background p-3 rounded-lg border border-blue-700/30">
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

      {/* Alertas de Checklist de Viaturas */}
      {alertasChecklist.length > 0 && (
        <Alert className="border-yellow-700 bg-yellow-900/10 dark:bg-yellow-950/20">
          <AlertTriangle className="h-4 w-4 text-yellow-700" />
          <AlertTitle className="text-yellow-700">Itens de Verificação com Problemas</AlertTitle>
          <AlertDescription className="text-foreground">
            {alertasChecklist.length} viatura(s) com problemas identificados no último checklist.
            <div className="mt-3 space-y-2 max-h-[200px] overflow-y-auto">
              {alertasChecklist.slice(0, 3).map((alerta: any, idx: number) => (
                <div key={idx} className="bg-background p-2 rounded border border-yellow-700/30 flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {alerta.cadastro} • {alerta.placa}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Verificado em: {new Date(alerta.dataVerificacao).toLocaleString('pt-BR')} por {alerta.verificadoPor}
                    </p>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {alerta.problemas.map((problema: string) => {
                        const traducoes: Record<string, string> = {
                          oleoMotor: 'Óleo do Motor', aguaRadiador: 'Água do Radiador', step: 'Step',
                          macaco: 'Macaco', chaveRoda: 'Chave de Roda', triangulo: 'Triângulo',
                          smartphone: 'Smartphone', radioFixo: 'Rádio Fixo', cartaoAbastecimento: 'Cartão'
                        };
                        return (
                          <Badge key={problema} variant="outline" className="text-xs">
                            {traducoes[problema] || problema}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCienciaChecklist(alerta.viaturaId, alerta.checklist)}
                    className="flex-shrink-0 gap-1"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Ciência
                  </Button>
                </div>
              ))}
              {alertasChecklist.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  + {alertasChecklist.length - 3} outras viaturas
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Alertas de Coletes */}
      {coletesVencidos.length > 0 && (
        <Alert variant="destructive" className="border-destructive bg-destructive/10 dark:bg-destructive/20">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-destructive">Coletes Balísticos Vencidos</AlertTitle>
          <AlertDescription>
            <p className="text-destructive font-medium">
              {coletesVencidos.length} colete(s) balístico(s) com validade vencida.
            </p>
            <ul className="mt-2 space-y-1 text-foreground">
              {coletesVencidos.slice(0, 3).map((colete: any) => {
                const hoje = new Date();
                const vencimento = new Date(colete.vencimento);
                const diasVencidos = Math.floor((hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24));
                const mesesVencidos = Math.floor(diasVencidos / 30);
                const diasRestantes = diasVencidos % 30;

                let textoVencido = '';
                if (mesesVencidos > 0) {
                  textoVencido = `há ${mesesVencidos} ${mesesVencidos === 1 ? 'mês' : 'meses'}${diasRestantes > 0 ? ` e ${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''}` : ''}`;
                } else {
                  textoVencido = `há ${diasVencidos} dia${diasVencidos !== 1 ? 's' : ''}`;
                }

                return (
                  <li key={colete.id} className="text-sm">
                    • {colete.numeroSerie || 'S/N'} - Vencido {textoVencido}
                    {colete.policialAssociadoNome && ` (Cautelado: ${colete.policialAssociadoNome})`}
                  </li>
                );
              })}
              {coletesVencidos.length > 3 && (
                <li className="text-sm font-medium">+ {coletesVencidos.length - 3} outros coletes vencidos</li>
              )}
            </ul>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => setShowColetesVencidosModal(true)}
            >
              Ver Todos os Coletes Vencidos
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {coletesVencendo.length > 0 && (
        <Alert className="border-orange-700 bg-orange-900/20 dark:bg-orange-950/40">
          <Clock className="h-4 w-4 text-orange-700 dark:text-orange-400" />
          <AlertTitle className="text-orange-700 dark:text-orange-400">
            Coletes Vencendo nos Próximos 6 Meses
          </AlertTitle>
          <AlertDescription>
            <p className="text-orange-700 dark:text-orange-300 font-medium">
              {coletesVencendo.length} colete(s) balístico(s) vencendo em breve.
            </p>
            <ul className="mt-2 space-y-1 text-foreground">
              {coletesVencendo.slice(0, 3).map((colete: any) => {
                const tempoRestante = calcularTempoRestante(colete.vencimento);
                
                return (
                  <li key={colete.id} className="text-sm">
                    • {colete.numeroSerie || 'S/N'} - {tempoRestante}
                    {colete.policialAssociadoNome && ` (Cautelado: ${colete.policialAssociadoNome})`}
                  </li>
                );
              })}
              {coletesVencendo.length > 3 && (
                <li className="text-sm font-medium">+ {coletesVencendo.length - 3} outros coletes vencendo</li>
              )}
            </ul>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 border-orange-700 text-orange-700 hover:bg-orange-800 hover:text-white dark:text-orange-300 dark:hover:bg-orange-900"
              onClick={() => setShowColetesVencendoModal(true)}
            >
              Ver Todos os Coletes Vencendo
            </Button>
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
        {/* Alerta de Óleo ATRASADO (crítico) */}
        <AlertaOleoAtrasado />
        
        {/* Alerta de Troca de Óleo PRÓXIMA (aviso) */}
        <AlertaTrocaOleo />
      </div>

      {/* Alertas da Reserva de Armamento */}
      <AlertasGestaoSection />
    </div>
    </>
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
  <div className="space-y-6">
    <Card className="bg-card border-border shadow-tactical">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Shield className="h-5 w-5" />
          GESTÃO E LOGÍSTICA
        </CardTitle>
      </CardHeader>
      <CardContent>
        <GestaoAcesso />
      </CardContent>
    </Card>
  </div>
);

// Alerta de viaturas ATRASADAS na troca de óleo (km ultrapassada)
const AlertaOleoAtrasado = () => {
  const [viaturasAtrasadas, setViaturasAtrasadas] = useState<any[]>([]);

  useEffect(() => {
    fetchViaturasAtrasadas();
  }, []);

  const fetchViaturasAtrasadas = async () => {
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

      const atrasadas = todasViaturas.filter(v => {
        const isMonitorada = VIATURAS_MONITORADAS.includes(v.CADASTRO || '');
        const kmRestante = (v.KMOLEO || 0) - (v.KM || 0);
        return isMonitorada && kmRestante <= 0;
      });

      setViaturasAtrasadas(atrasadas);
    } catch (error) {
      console.error('Erro ao buscar viaturas atrasadas:', error);
    }
  };

  if (viaturasAtrasadas.length === 0) {
    return null;
  }

  return (
    <Card className="border-red-600 bg-red-600/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="h-5 w-5" />
          ⚠️ TROCA DE ÓLEO ATRASADA
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {viaturasAtrasadas.map(v => {
            const kmAtrasada = Math.abs((v.KMOLEO || 0) - (v.KM || 0));
            return (
              <div key={v.id} className="flex items-center justify-between p-3 bg-background rounded-lg border border-red-300">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="font-bold">{v.CADASTRO}</span>
                    <span className="text-sm text-muted-foreground ml-2">({v.PLACA})</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-red-600">
                    ⚠️ {kmAtrasada.toLocaleString()} km atrasada
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

// Alerta de viaturas SE APROXIMANDO da troca de óleo
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
        return isMonitorada && kmRestante > 0 && kmRestante <= 500;
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