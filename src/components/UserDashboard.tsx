import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import TacticalSidebar from '@/components/TacticalSidebar';
import ProjetosSociaisSystem from '@/components/projetos-sociais/ProjetosSociaisSystem';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { 
  User, 
  Package,
  Truck,
  Menu,
  Loader2
} from 'lucide-react';

interface PolicialLogado {
  id: string;
  NOME: string;
  'Post/Grad': string;
  Matrícula: number | string;
  UNIDADE?: string;
  FUNÇÃO?: string;
  'NOME DE GUERRA1'?: string;
}

interface CautelaMaterial {
  nome: string;
  categoria: string;
  numeroSerie?: string;
  quantidade: number;
  calibre?: string;
  fabricante?: string;
  modelo?: string;
  tamanhoColete?: string;
  quantidadeCarregadores?: number;
  quantidadeMunicoes?: number;
}

interface ServicoMotorista {
  id: string;
  cadastro?: string;
  placa?: string;
  area?: string;
  kmInicial?: number;
  kmFinal?: number;
  status?: 'aberto' | 'encerrado';
  iniciadoEm?: string;
  encerradoEm?: string;
  motoristaMatricula?: string;
  motoristaNome?: string;
}

interface CautelaCompleta {
  id: string;
  numeroCautela?: string;
  dataInicio?: any;
  status?: string;
  materiais?: CautelaMaterial[];
}

const UserDashboard = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [policialLogado, setPolicialLogado] = useState<PolicialLogado | null>(null);
  const [materiaisCautelados, setMateriaisCautelados] = useState<CautelaMaterial[]>([]);
  const [ultimosServicos, setUltimosServicos] = useState<ServicoMotorista[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setPolicialLogado(user);

          // Buscar cautela permanente do policial
          try {
            const cautelasQuery = query(
              collection(db, 'cautelas_permanentes'),
              where('policialId', '==', user.id),
              where('status', '==', 'ativa')
            );
            const cautelasSnap = await getDocs(cautelasQuery);
            
            if (!cautelasSnap.empty) {
              const cautela = cautelasSnap.docs[0].data();
              setMateriaisCautelados(cautela.materiais || []);
            }
          } catch (error) {
            console.error('Erro ao buscar cautela:', error);
          }

          // Buscar últimos serviços como motorista
          try {
            const servicosQuery = query(
              collection(db, 'servicosDiarios'),
              where('motoristaId', '==', user.id),
              orderBy('iniciadoEm', 'desc')
            );
            const servicosSnap = await getDocs(servicosQuery);
            const servicos = servicosSnap.docs.slice(0, 5).map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as ServicoMotorista[];
            setUltimosServicos(servicos);
          } catch (error) {
            console.error('Erro ao buscar serviços:', error);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, []);

  const renderContent = () => {
    switch (activeSection) {
      case 'servicos':
        return <ServicosMotorista policialLogado={policialLogado} />;
      case 'cautela':
        return <MinhaCautela policialLogado={policialLogado} />;
      case 'projetos-sociais':
        return <ProjetosSociaisSystem />;
      default:
        return (
          <DashboardContent 
            policialLogado={policialLogado} 
            materiaisCautelados={materiaisCautelados} 
            ultimosServicos={ultimosServicos}
            loading={loading}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-background font-military">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <div className="flex">
        {/* Mobile Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <TacticalSidebar 
            activeSection={activeSection} 
            onSectionChange={(section) => {
              setActiveSection(section);
              setSidebarOpen(false);
            }} 
            isAdmin={false} 
          />
        </div>
        
        <main className="flex-1 min-h-screen">
          {/* Mobile Header */}
          <div className="md:hidden bg-background border-b border-border p-4 flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="text-foreground"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">PAINEL POLICIAL</h1>
            <div className="w-10" />
          </div>
          
          <div className="p-3 md:p-6 overflow-auto">
            <div className="max-w-5xl mx-auto">
              {/* Desktop Header */}
              <header className="mb-4 md:mb-8 hidden md:block">
                <h1 className="text-3xl font-bold text-foreground tracking-wide">
                  PAINEL DO POLICIAL
                </h1>
                <p className="text-muted-foreground mt-2">
                  Informações pessoais e operacionais
                </p>
              </header>
              
              {renderContent()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

interface DashboardContentProps {
  policialLogado: PolicialLogado | null;
  materiaisCautelados: CautelaMaterial[];
  ultimosServicos: ServicoMotorista[];
  loading: boolean;
}

const DashboardContent = ({ policialLogado, materiaisCautelados, ultimosServicos, loading }: DashboardContentProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-6">
      {/* Perfil do Policial */}
      <Card className="lg:col-span-2 bg-card border-border shadow-tactical">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground flex items-center gap-2 text-sm md:text-base">
            <User className="h-4 w-4 md:h-5 md:w-5" />
            DADOS PESSOAIS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 md:gap-6">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-tactical-medium rounded-full flex items-center justify-center flex-shrink-0">
              <User className="h-6 w-6 md:h-8 md:w-8 text-tactical-text" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="grid grid-cols-1 gap-3 md:gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Nome Completo
                  </label>
                  <p className="text-sm md:text-base text-foreground font-medium truncate">
                    {policialLogado?.['Post/Grad']} {policialLogado?.NOME || 'Carregando...'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Matrícula
                    </label>
                    <p className="text-sm md:text-base text-foreground font-medium">
                      {policialLogado?.Matrícula || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Posto/Graduação
                    </label>
                    <p className="text-sm md:text-base text-foreground font-medium">
                      {policialLogado?.['Post/Grad'] || '-'}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Unidade
                  </label>
                  <p className="text-sm md:text-base text-foreground font-medium">
                    {policialLogado?.UNIDADE || 'RPMONT'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Badge variant="default" className="bg-primary text-xs">
                  ATIVO
                </Badge>
                <Badge variant="outline" className="text-xs">
                  OPERACIONAL
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Material Cautelado */}
      <Card className="bg-card border-border shadow-tactical">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground flex items-center gap-2 text-sm md:text-base">
            <Package className="h-4 w-4 md:h-5 md:w-5" />
            MATERIAL CAUTELADO
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {materiaisCautelados.length > 0 ? (
              materiaisCautelados.map((material, index) => (
                <div key={index} className="flex items-center justify-between p-2 md:p-3 bg-muted rounded">
                  <div className="flex items-center gap-2 min-w-0">
                    <Package className="h-3 w-3 md:h-4 md:w-4 text-primary flex-shrink-0" />
                    <span className="text-xs md:text-sm font-medium text-foreground truncate">
                      {material.nome} {material.calibre && `(${material.calibre})`}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {material.quantidade} {material.numeroSerie && `- ${material.numeroSerie}`}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum material cautelado
              </p>
            )}
          </div>
          
          <div className="text-xs text-muted-foreground text-center border-t pt-2">
            Total de itens: {materiaisCautelados.length}
          </div>
        </CardContent>
      </Card>

      {/* Últimos Serviços */}
      <Card className="lg:col-span-3 bg-card border-border shadow-tactical">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground flex items-center gap-2 text-sm md:text-base">
            <Truck className="h-4 w-4 md:h-5 md:w-5" />
            ÚLTIMOS SERVIÇOS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {ultimosServicos.length > 0 ? (
              ultimosServicos.map((servico) => (
                <div key={servico.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                  <Truck className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-medium text-foreground truncate">
                      {servico.cadastro || servico.placa || 'Viatura'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {servico.iniciadoEm ? new Date(servico.iniciadoEm).toLocaleDateString('pt-BR') : '-'}
                      {' - '}{servico.area || 'Local não informado'}
                    </p>
                  </div>
                  <Badge variant={servico.status === 'aberto' ? 'secondary' : 'default'}>
                    {servico.status?.toUpperCase() || '-'}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum serviço registrado
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface ServicosMotoristaProps {
  policialLogado: PolicialLogado | null;
}

const ServicosMotorista = ({ policialLogado }: ServicosMotoristaProps) => {
  const [servicos, setServicos] = useState<ServicoMotorista[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarServicos = async () => {
      if (!policialLogado?.id) {
        setLoading(false);
        return;
      }
      
      try {
        const servicosQuery = query(
          collection(db, 'servicosDiarios'),
          where('motoristaId', '==', policialLogado.id),
          orderBy('iniciadoEm', 'desc')
        );
        const snap = await getDocs(servicosQuery);
        const data = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ServicoMotorista[];
        setServicos(data);
      } catch (error) {
        console.error('Erro ao carregar serviços:', error);
      } finally {
        setLoading(false);
      }
    };
    
    carregarServicos();
  }, [policialLogado]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="bg-card border-border shadow-tactical">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Truck className="h-5 w-5" />
          SERVIÇOS COMO MOTORISTA
        </CardTitle>
      </CardHeader>
      <CardContent>
        {servicos.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Viatura</TableHead>
                  <TableHead>Local/Área</TableHead>
                  <TableHead>KM Inicial</TableHead>
                  <TableHead>KM Final</TableHead>
                  <TableHead>KM Rodados</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servicos.map(s => {
                  const kmRodados = (s.kmFinal && s.kmInicial) ? s.kmFinal - s.kmInicial : null;
                  return (
                    <TableRow key={s.id}>
                      <TableCell>{s.iniciadoEm ? new Date(s.iniciadoEm).toLocaleString('pt-BR') : '-'}</TableCell>
                      <TableCell>{s.cadastro || s.placa || '-'}</TableCell>
                      <TableCell>{s.area || '-'}</TableCell>
                      <TableCell>{s.kmInicial ?? '-'}</TableCell>
                      <TableCell>{s.kmFinal ?? '-'}</TableCell>
                      <TableCell>{kmRodados !== null ? `${kmRodados} km` : '-'}</TableCell>
                      <TableCell>
                        <Badge variant={s.status === 'aberto' ? 'secondary' : 'default'}>
                          {s.status?.toUpperCase() || '-'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Nenhum serviço registrado como motorista.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

interface MinhaCautelaProps {
  policialLogado: PolicialLogado | null;
}

const MinhaCautela = ({ policialLogado }: MinhaCautelaProps) => {
  const [cautela, setCautela] = useState<CautelaCompleta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarCautela = async () => {
      if (!policialLogado?.id) {
        setLoading(false);
        return;
      }
      
      try {
        const cautelasQuery = query(
          collection(db, 'cautelas_permanentes'),
          where('policialId', '==', policialLogado.id),
          where('status', '==', 'ativa')
        );
        const snap = await getDocs(cautelasQuery);
        
        if (!snap.empty) {
          setCautela({
            id: snap.docs[0].id,
            ...snap.docs[0].data()
          } as CautelaCompleta);
        }
      } catch (error) {
        console.error('Erro ao carregar cautela:', error);
      } finally {
        setLoading(false);
      }
    };
    
    carregarCautela();
  }, [policialLogado]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border shadow-tactical">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Package className="h-5 w-5" />
            MINHA CAUTELA PERMANENTE
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cautela ? (
            <>
              <div className="mb-4 p-3 bg-muted rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <p><strong>Nº da Cautela:</strong> {cautela.numeroCautela || '-'}</p>
                  <p><strong>Data de Início:</strong> {cautela.dataInicio?.toDate?.().toLocaleDateString('pt-BR') || '-'}</p>
                  <p><strong>Status:</strong> <Badge variant="default">Ativa</Badge></p>
                </div>
              </div>
              
              <h4 className="font-semibold mb-3">Materiais Cautelados</h4>
              <div className="space-y-3">
                {cautela.materiais?.map((material, index) => (
                  <Card key={index} className="p-4 bg-muted">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      <div><strong>Material:</strong> {material.nome}</div>
                      <div><strong>Categoria:</strong> {material.categoria}</div>
                      {material.numeroSerie && <div><strong>Nº Série:</strong> {material.numeroSerie}</div>}
                      {material.calibre && <div><strong>Calibre:</strong> {material.calibre}</div>}
                      {material.fabricante && <div><strong>Fabricante:</strong> {material.fabricante}</div>}
                      {material.modelo && <div><strong>Modelo:</strong> {material.modelo}</div>}
                      <div><strong>Quantidade:</strong> {material.quantidade}</div>
                      {material.tamanhoColete && <div><strong>Tamanho:</strong> {material.tamanhoColete}</div>}
                      {material.quantidadeCarregadores && <div><strong>Carregadores:</strong> {material.quantidadeCarregadores}</div>}
                      {material.quantidadeMunicoes && <div><strong>Munições:</strong> {material.quantidadeMunicoes}</div>}
                    </div>
                  </Card>
                ))}
                
                {(!cautela.materiais || cautela.materiais.length === 0) && (
                  <p className="text-center text-muted-foreground py-4">
                    Nenhum material na cautela.
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Você não possui cautela permanente ativa.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserDashboard;
