import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Play, Clock, CheckCircle, Home, History, BarChart } from 'lucide-react';
import IniciarAulaWizard from './IniciarAulaWizard';
import AulaEmAndamento from './AulaEmAndamento';
import MinhasAulasTab from './MinhasAulasTab';
import RelatoriosInstrutorTab from './RelatoriosInstrutorTab';

interface InstrutorDashboardProps {
  projetos: any[];
  policialLogado: any;
}

const InstrutorDashboard = ({ projetos, policialLogado }: InstrutorDashboardProps) => {
  const [activeTab, setActiveTab] = useState<'inicio' | 'aulas' | 'relatorios'>('inicio');
  const [aulaEmAndamento, setAulaEmAndamento] = useState<any>(null);
  const [horasMes, setHorasMes] = useState(0);
  const [aulasMes, setAulasMes] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    carregarDados();
  }, [policialLogado]);

  const carregarDados = async () => {
    try {
      // Verificar aula em andamento
      const aulaQuery = query(
        collection(db, 'projetos_aulas'),
        where('instrutores', 'array-contains', policialLogado.id),
        where('status', '==', 'em_andamento')
      );
      const aulaSnapshot = await getDocs(aulaQuery);
      
      if (!aulaSnapshot.empty) {
        const aulaData = {
          id: aulaSnapshot.docs[0].id,
          ...aulaSnapshot.docs[0].data()
        };
        setAulaEmAndamento(aulaData);
      }

      // Calcular horas e aulas do mês
      const hoje = new Date();
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      
      const aulasQuery = query(
        collection(db, 'projetos_aulas'),
        where('instrutores', 'array-contains', policialLogado.id),
        where('status', '==', 'encerrada'),
        where('data', '>=', primeiroDiaMes)
      );
      const aulasSnapshot = await getDocs(aulasQuery);
      
      const totalAulas = aulasSnapshot.size;
      const totalHoras = totalAulas * 3; // Cada aula = 3 horas
      
      setAulasMes(totalAulas);
      setHorasMes(totalHoras);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'aulas':
        return <MinhasAulasTab policialId={policialLogado.id} projetos={projetos} />;
      case 'relatorios':
        return <RelatoriosInstrutorTab policialId={policialLogado.id} />;
      default:
        return (
          <div className="space-y-4">
            {/* Aula em andamento */}
            {aulaEmAndamento && (
              <AulaEmAndamento 
                aula={aulaEmAndamento} 
                onUpdate={carregarDados}
                projetos={projetos}
              />
            )}

            {/* Botão Iniciar Instrução */}
            {!aulaEmAndamento && (
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button 
                    size="lg" 
                    className="w-full h-20 text-xl font-bold shadow-lg"
                  >
                    <Play className="mr-3 h-8 w-8" />
                    INICIAR INSTRUÇÃO
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[90vh] overflow-auto">
                  <IniciarAulaWizard 
                    projetos={projetos}
                    policialLogado={policialLogado}
                    onSuccess={() => {
                      setSheetOpen(false);
                      carregarDados();
                    }}
                  />
                </SheetContent>
              </Sheet>
            )}

            {/* Cards de informação */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 text-center">
                <Clock className="mx-auto h-8 w-8 text-primary mb-2" />
                <p className="text-2xl font-bold">{horasMes}h</p>
                <p className="text-xs text-muted-foreground">Horas no Mês</p>
              </Card>
              
              <Card className="p-4 text-center">
                <CheckCircle className="mx-auto h-8 w-8 text-primary mb-2" />
                <p className="text-2xl font-bold">{aulasMes}</p>
                <p className="text-xs text-muted-foreground">Aulas no Mês</p>
              </Card>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header fixo */}
      <header className="sticky top-0 z-10 bg-background border-b p-4">
        <h1 className="text-xl font-bold">Projetos Sociais</h1>
        <p className="text-sm text-muted-foreground">
          {projetos.map(p => p.nome).join(', ')}
        </p>
      </header>

      {/* Content */}
      <div className="p-4">
        {renderContent()}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t z-10">
        <div className="flex justify-around p-2">
          <Button 
            variant={activeTab === 'inicio' ? 'default' : 'ghost'} 
            size="lg" 
            className="flex-col h-16"
            onClick={() => setActiveTab('inicio')}
          >
            <Home className="h-6 w-6" />
            <span className="text-xs mt-1">Início</span>
          </Button>
          <Button 
            variant={activeTab === 'aulas' ? 'default' : 'ghost'} 
            size="lg" 
            className="flex-col h-16"
            onClick={() => setActiveTab('aulas')}
          >
            <History className="h-6 w-6" />
            <span className="text-xs mt-1">Aulas</span>
          </Button>
          <Button 
            variant={activeTab === 'relatorios' ? 'default' : 'ghost'} 
            size="lg" 
            className="flex-col h-16"
            onClick={() => setActiveTab('relatorios')}
          >
            <BarChart className="h-6 w-6" />
            <span className="text-xs mt-1">Relatórios</span>
          </Button>
        </div>
      </nav>
    </div>
  );
};

export default InstrutorDashboard;
