import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { 
  Package, 
  Search, 
  Truck, 
  Users, 
  Loader2,
  Target,
  Shield
} from 'lucide-react';

interface MaterialBelico {
  id: string;
  nome: string;
  categoria: string;
  numeroSerie?: string;
  calibre?: string;
  fabricante?: string;
  modelo?: string;
  quantidade?: number;
  disponivel?: boolean;
  tamanhoColete?: string;
}

interface CautelaAtiva {
  id: string;
  policialNome?: string;
  policialMatricula?: string;
  policialId?: string;
  materiais?: any[];
  dataInicio?: any;
  status?: string;
  tipo?: string;
  numeroCautela?: string;
}

interface Viatura {
  id: string;
  CADASTRO?: string;
  PLACA?: string;
  MODELO?: string;
  MARCA?: string;
  ANO?: number;
  situacao?: string;
  KM?: number;
  categoria?: string;
}

const ConsultaMaterialPolicial = () => {
  const [activeTab, setActiveTab] = useState('materiais');
  const [loading, setLoading] = useState(false);
  const [materiais, setMateriais] = useState<MaterialBelico[]>([]);
  const [cautelas, setCautelas] = useState<CautelaAtiva[]>([]);
  const [viaturas, setViaturas] = useState<Viatura[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchSerie, setSearchSerie] = useState('');
  const [searchCautela, setSearchCautela] = useState('');
  const [searchViatura, setSearchViatura] = useState('');
  const [searchSerieTab, setSearchSerieTab] = useState('');

  // Carregar materiais bélicos
  useEffect(() => {
    const carregarMateriais = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, 'materiais_belicos'));
        const lista = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as MaterialBelico[];
        setMateriais(lista);
      } catch (error) {
        console.error('Erro ao carregar materiais:', error);
      } finally {
        setLoading(false);
      }
    };
    carregarMateriais();
  }, []);

  // Carregar cautelas ativas
  useEffect(() => {
    const carregarCautelas = async () => {
      try {
        // Cautelas provisórias do dia
        const provisoriasSnap = await getDocs(collection(db, 'cautelas_provisorias'));
        const provisorias = provisoriasSnap.docs
          .filter(doc => doc.data().status !== 'devolvida')
          .map(doc => ({
            id: doc.id,
            tipo: 'provisória',
            ...doc.data()
          }));

        // Cautelas permanentes ativas
        const permanentesQuery = query(
          collection(db, 'cautelas_permanentes'),
          where('status', '==', 'ativa')
        );
        const permanentesSnap = await getDocs(permanentesQuery);
        const permanentes = permanentesSnap.docs.map(doc => ({
          id: doc.id,
          tipo: 'permanente',
          ...doc.data()
        }));

        setCautelas([...provisorias, ...permanentes] as CautelaAtiva[]);
      } catch (error) {
        console.error('Erro ao carregar cautelas:', error);
      }
    };
    carregarCautelas();
  }, []);

  // Carregar viaturas
  useEffect(() => {
    const carregarViaturas = async () => {
      try {
        const snap = await getDocs(collection(db, 'frota'));
        const lista = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Viatura[];
        setViaturas(lista);
      } catch (error) {
        console.error('Erro ao carregar viaturas:', error);
      }
    };
    carregarViaturas();
  }, []);

  // Filtrar materiais
  const materiaisFiltrados = materiais.filter(m => {
    const matchSearch = searchTerm === '' || 
      m.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.calibre?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchSerie = searchSerieTab === '' || 
      m.numeroSerie?.toLowerCase().includes(searchSerieTab.toLowerCase());
    
    return matchSearch && matchSerie;
  });

  // Filtrar por número de série
  const materiaisPorSerie = materiais.filter(m => 
    searchSerie !== '' && m.numeroSerie?.toLowerCase().includes(searchSerie.toLowerCase())
  );

  // Filtrar cautelas
  const cautelasFiltradas = cautelas.filter(c => {
    if (searchCautela === '') return true;
    return c.policialNome?.toLowerCase().includes(searchCautela.toLowerCase()) ||
           String(c.policialMatricula ?? '').includes(searchCautela) ||
           String(c.numeroCautela ?? '').includes(searchCautela);
  });

  // Filtrar viaturas
  const viaturasFiltradas = viaturas.filter(v => {
    if (searchViatura === '') return true;
    return v.CADASTRO?.toLowerCase().includes(searchViatura.toLowerCase()) ||
           v.PLACA?.toLowerCase().includes(searchViatura.toLowerCase()) ||
           v.MODELO?.toLowerCase().includes(searchViatura.toLowerCase());
  });

  // Verificar se material está cautelado
  const verificarCautelado = (numeroSerie: string) => {
    for (const cautela of cautelas) {
      const materialCautelado = cautela.materiais?.find(
        m => m.numeroSerie === numeroSerie
      );
      if (materialCautelado) {
        return {
          cautelado: true,
          policial: cautela.policialNome,
          matricula: cautela.policialMatricula,
          tipo: cautela.tipo
        };
      }
    }
    return { cautelado: false };
  };

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border shadow-tactical">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground flex items-center gap-2">
            <Target className="h-5 w-5" />
            CONSULTA DE MATERIAIS
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Consultas somente leitura de materiais bélicos e viaturas
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-4">
              <TabsTrigger value="materiais" className="text-xs md:text-sm">
                <Package className="h-4 w-4 mr-1 md:mr-2" />
                Materiais
              </TabsTrigger>
              <TabsTrigger value="cautelas" className="text-xs md:text-sm">
                <Users className="h-4 w-4 mr-1 md:mr-2" />
                Cautelas
              </TabsTrigger>
              <TabsTrigger value="serie" className="text-xs md:text-sm">
                <Search className="h-4 w-4 mr-1 md:mr-2" />
                Nº Série
              </TabsTrigger>
              <TabsTrigger value="viaturas" className="text-xs md:text-sm">
                <Truck className="h-4 w-4 mr-1 md:mr-2" />
                Viaturas
              </TabsTrigger>
            </TabsList>

            {/* Tab Materiais Disponíveis */}
            <TabsContent value="materiais" className="space-y-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="Buscar por nome ou calibre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div className="flex-1 md:flex-none md:w-56">
                  <Input
                    placeholder="Número de Série..."
                    value={searchSerieTab}
                    onChange={(e) => setSearchSerieTab(e.target.value)}
                    className="bg-background"
                  />
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Nº Série</TableHead>
                        <TableHead>Calibre</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {materiaisFiltrados.length > 0 ? (
                        materiaisFiltrados.map(m => (
                          <TableRow key={m.id}>
                            <TableCell className="font-medium">{m.nome}</TableCell>
                            <TableCell>{m.categoria || '-'}</TableCell>
                            <TableCell>{m.numeroSerie || '-'}</TableCell>
                            <TableCell>{m.calibre || m.tamanhoColete || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={m.disponivel !== false ? 'default' : 'secondary'}>
                                {m.disponivel !== false ? 'Disponível' : 'Cautelado'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            Nenhum material encontrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
              
              <div className="text-xs text-muted-foreground text-right">
                Total: {materiaisFiltrados.length} materiais
              </div>
            </TabsContent>

            {/* Tab Cautelas Ativas */}
            <TabsContent value="cautelas" className="space-y-4">
              <Input
                placeholder="Buscar por policial, matrícula ou nº cautela..."
                value={searchCautela}
                onChange={(e) => setSearchCautela(e.target.value)}
                className="bg-background"
              />

              <div className="space-y-3">
                {cautelasFiltradas.length > 0 ? (
                  cautelasFiltradas.map(c => (
                    <Card key={c.id} className="p-4 bg-muted">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-foreground">
                            {c.policialNome || 'Policial não identificado'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Mat: {c.policialMatricula || '-'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={c.tipo === 'permanente' ? 'default' : 'secondary'}>
                            {c.tipo?.toUpperCase()}
                          </Badge>
                          {c.numeroCautela && (
                            <Badge variant="outline">Nº {c.numeroCautela}</Badge>
                          )}
                        </div>
                      </div>
                      
                      {c.materiais && c.materiais.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-muted-foreground uppercase">
                            Materiais ({c.materiais.length})
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {c.materiais.map((mat, idx) => (
                              <div key={idx} className="text-sm flex items-center gap-2 p-2 bg-background rounded">
                                <Shield className="h-3 w-3 text-primary" />
                                <span>{mat.nome}</span>
                                {mat.numeroSerie && (
                                  <span className="text-muted-foreground text-xs">
                                    ({mat.numeroSerie})
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma cautela ativa encontrada
                  </p>
                )}
              </div>
              
              <div className="text-xs text-muted-foreground text-right">
                Total: {cautelasFiltradas.length} cautelas
              </div>
            </TabsContent>

            {/* Tab Consulta por Nº Série */}
            <TabsContent value="serie" className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Digite o número de série para buscar..."
                  value={searchSerie}
                  onChange={(e) => setSearchSerie(e.target.value)}
                  className="bg-background"
                />
              </div>

              {searchSerie === '' ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Digite um número de série para buscar</p>
                </div>
              ) : materiaisPorSerie.length > 0 ? (
                <div className="space-y-3">
                  {materiaisPorSerie.map(m => {
                    const statusCautela = verificarCautelado(m.numeroSerie || '');
                    return (
                      <Card key={m.id} className="p-4 bg-muted">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase">Material</p>
                            <p className="font-semibold text-foreground">{m.nome}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase">Nº Série</p>
                            <p className="font-mono text-foreground">{m.numeroSerie}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase">Categoria</p>
                            <p className="text-foreground">{m.categoria || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase">Calibre</p>
                            <p className="text-foreground">{m.calibre || m.tamanhoColete || '-'}</p>
                          </div>
                          {m.fabricante && (
                            <div>
                              <p className="text-xs text-muted-foreground uppercase">Fabricante</p>
                              <p className="text-foreground">{m.fabricante}</p>
                            </div>
                          )}
                          {m.modelo && (
                            <div>
                              <p className="text-xs text-muted-foreground uppercase">Modelo</p>
                              <p className="text-foreground">{m.modelo}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-4 pt-3 border-t border-border">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Status:</span>
                            {statusCautela.cautelado ? (
                              <div className="text-right">
                                <Badge variant="secondary">Cautelado</Badge>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Com: {statusCautela.policial} (Mat: {statusCautela.matricula})
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Cautela {statusCautela.tipo}
                                </p>
                              </div>
                            ) : (
                              <Badge variant="default">Disponível</Badge>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum material encontrado com esse número de série</p>
                </div>
              )}
            </TabsContent>

            {/* Tab Viaturas */}
            <TabsContent value="viaturas" className="space-y-4">
              <Input
                placeholder="Buscar por cadastro, placa ou modelo..."
                value={searchViatura}
                onChange={(e) => setSearchViatura(e.target.value)}
                className="bg-background"
              />

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cadastro</TableHead>
                      <TableHead>Placa</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead>Ano</TableHead>
                      <TableHead>KM Atual</TableHead>
                      <TableHead>Situação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viaturasFiltradas.length > 0 ? (
                      viaturasFiltradas.map(v => (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium">{v.CADASTRO || '-'}</TableCell>
                          <TableCell>{v.PLACA || '-'}</TableCell>
                          <TableCell>{v.MODELO || '-'}</TableCell>
                          <TableCell>{v.MARCA || '-'}</TableCell>
                          <TableCell>{v.ANO || '-'}</TableCell>
                          <TableCell>{v.KM?.toLocaleString('pt-BR') || '-'}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                v.situacao === 'Operacional' ? 'default' : 
                                v.situacao === 'Em manutenção' ? 'secondary' : 
                                'destructive'
                              }
                            >
                              {v.situacao || '-'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Nenhuma viatura encontrada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              
              <div className="text-xs text-muted-foreground text-right">
                Total: {viaturasFiltradas.length} viaturas
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConsultaMaterialPolicial;
