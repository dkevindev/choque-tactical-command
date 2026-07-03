import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Eye, User, Phone, MapPin, Calendar, CreditCard, Mail, Building, FileText } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { sortByHierarquia } from '@/lib/policialUtils';

interface Policial {
  id: string;
  AGÊNCIA?: number;
  BANCO?: string;
  Bairro?: string;
  CONTA?: string;
  CPF?: string;
  'DATA ATUAL'?: number;
  'E-MAIL'?: string;
  Endereço?: string;
  FUNÇÃO?: string;
  IDADE?: number;
  'MUDANÇA COMPORTAMENTO'?: string;
  Matrícula?: string | number;
  'MÊS ANIVERSARIO'?: number;
  NASCIMENTO?: number;
  NOME?: string;
  'NOME DE GUERRA'?: string;
  'NOME DE GUERRA1'?: string;
  NUMERAL?: number;
  ORD?: number;
  'PREVISAO FÉRIAS - AQUISITIVO 2024'?: string;
  'Post/Grad'?: string;
  SITUAÇÃO?: string;
  'ULTIMA PROMOÇÃO'?: number;
  UNIDADE?: string;
  __EMPTY?: number;
  inclusão?: number;
  telefone?: string;
}

interface CautelaData {
  armamento?: string; // Número de série da arma
  armamentoSIARM?: string; // Número da Cautela SIARM
  colete?: string; // Número de série do colete
}

const PolicialTable = () => {
  const [policiais, setPoliciais] = useState<Policial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPolicial, setSelectedPolicial] = useState<Policial | null>(null);
  const [cautelasMap, setCautelasMap] = useState<Map<string, CautelaData>>(new Map());

  useEffect(() => {
    const loadData = async () => {
      try {
        // Carregar policiais
        const querySnapshot = await getDocs(collection(db, 'policiais'));
        const policiaisData: Policial[] = [];

        querySnapshot.forEach((doc) => {
          policiaisData.push({
            id: doc.id,
            ...doc.data()
          } as Policial);
        });

        setPoliciais(policiaisData);

        // Carregar materiais_belicos (fonte da verdade dos dados atuais)
        const materiaisSnapshot = await getDocs(collection(db, 'materiais_belicos'));
        const materiaisById = new Map<string, any>();
        materiaisSnapshot.forEach((d) => {
          const m: any = d.data();
          if (m.baixado || m.transferido) return;
          materiaisById.set(d.id, m);
        });

        const cautelasData = new Map<string, CautelaData>();

        // 1) Vínculo direto no material (policialAssociadoId)
        materiaisById.forEach((m) => {
          const policialId = m.policialAssociadoId;
          if (!policialId) return;
          const numeroSerie = m.numeroSerie || 'S/N';
          const atual = cautelasData.get(policialId) || {};
          if (m.categoria === 'Armamento' && !atual.armamento) {
            atual.armamento = numeroSerie;
            atual.armamentoSIARM = m.numeroSIARM || '';
          }
          else if (m.categoria === 'Colete Balístico' && !atual.colete) atual.colete = numeroSerie;
          if (atual.armamento || atual.colete) cautelasData.set(policialId, atual);
        });

        // 2) Vínculo via cautelas_permanentes ativas (resolvendo dados atuais do material)
        const cautelasSnap = await getDocs(collection(db, 'cautelas_permanentes'));
        cautelasSnap.forEach((d) => {
          const c: any = d.data();
          if (c.status && c.status !== 'ativa') return;
          const policialId = c.policialId;
          if (!policialId) return;
          const itens: any[] = Array.isArray(c.materiais) ? c.materiais : [];
          const atual = cautelasData.get(policialId) || {};
          itens.forEach((it) => {
            const mat = it?.materialId ? materiaisById.get(it.materialId) : null;
            if (!mat) return; // material foi baixado/transferido/excluído
            const numeroSerie = mat.numeroSerie || it.numeroSerie || 'S/N';
            if (mat.categoria === 'Armamento' && !atual.armamento) atual.armamento = numeroSerie;
            else if (mat.categoria === 'Colete Balístico' && !atual.colete) atual.colete = numeroSerie;
          });
          if (atual.armamento || atual.colete) cautelasData.set(policialId, atual);
        });

        setCautelasMap(cautelasData);
        console.log('Policiais e materiais carregados');
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);


  const filteredPoliciais = policiais.filter(policial => {
    const cautelaData = cautelasMap.get(policial.id);
    const armamentoSerie = cautelaData?.armamento || '';
    const coleteSerie = cautelaData?.colete || '';
    
    return (
      (policial.NOME || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (policial.Matrícula?.toString() || '').includes(searchTerm) ||
      (policial['Post/Grad'] || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (policial.NUMERAL?.toString() || '').includes(searchTerm) ||
      armamentoSerie.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coleteSerie.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }).sort(sortByHierarquia);

  const getStatusBadge = (situacao: string) => {
    const status = situacao?.toLowerCase() || '';
    if (status.includes('operando') || status.includes('ativo')) {
      return <Badge variant="default">ATIVO</Badge>;
    } else if (status.includes('licen') || status.includes('férias')) {
      return <Badge variant="secondary">LICENÇA</Badge>;
    } else if (status.includes('afastado')) {
      return <Badge variant="destructive">AFASTADO</Badge>;
    }
    return <Badge variant="outline">{situacao || 'N/A'}</Badge>;
  };

  const formatDate = (dateValue: number | undefined) => {
    if (!dateValue) return 'N/A';
    // Converter data Excel para JavaScript (1900-01-01 = 1)
    const excelEpoch = new Date(1900, 0, 1);
    const jsDate = new Date(excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000);
    return jsDate.toLocaleDateString('pt-BR');
  };

  if (loading) {
    return <div className="p-4">Carregando policiais...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, matrícula, posto, numeral ou nº de série..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>MATRÍCULA</TableHead>
            <TableHead>NUMERAL</TableHead>
            <TableHead>NOME</TableHead>
            <TableHead>POSTO</TableHead>
            <TableHead>ARMAMENTO</TableHead>
            <TableHead>COLETE</TableHead>
            <TableHead>AÇÕES</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredPoliciais.map((policial) => {
            const cautelaData = cautelasMap.get(policial.id);
            return (
              <TableRow key={policial.id}>
                <TableCell className="font-medium">{policial.Matrícula || 'N/A'}</TableCell>
                <TableCell className="font-medium">{policial.NUMERAL || 'N/A'}</TableCell>
                <TableCell>{policial.NOME || 'N/A'}</TableCell>
                <TableCell>{policial['Post/Grad'] || 'N/A'}</TableCell>
                <TableCell className="font-mono text-sm">
                  {cautelaData?.armamento ? (
                    <Badge variant="default">{cautelaData.armamento}</Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {cautelaData?.colete ? (
                    <Badge variant="secondary">{cautelaData.colete}</Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedPolicial(policial)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Exibir
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Informações Completas do Policial</DialogTitle>
                      </DialogHeader>
                      {selectedPolicial && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Dados Pessoais */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Dados Pessoais
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div>
                                <span className="font-semibold">Nome:</span>
                                <p>{selectedPolicial.NOME || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="font-semibold">Nome de Guerra:</span>
                                <p>{selectedPolicial['NOME DE GUERRA'] || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="font-semibold">Nome de Guerra 1:</span>
                                <p>{selectedPolicial['NOME DE GUERRA1'] || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="font-semibold">CPF:</span>
                                <p>{selectedPolicial.CPF || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="font-semibold">Idade:</span>
                                <p>{selectedPolicial.IDADE || 'N/A'} anos</p>
                              </div>
                              <div>
                                <span className="font-semibold">Nascimento:</span>
                                <p>{formatDate(selectedPolicial.NASCIMENTO)}</p>
                              </div>
                              <div>
                                <span className="font-semibold">Mês Aniversário:</span>
                                <p>{selectedPolicial['MÊS ANIVERSARIO'] || 'N/A'}</p>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Dados Profissionais */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Building className="h-5 w-5" />
                                Dados Profissionais
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div>
                                <span className="font-semibold">Matrícula:</span>
                                <p>{selectedPolicial.Matrícula || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="font-semibold">Numeral:</span>
                                <p>{selectedPolicial.NUMERAL || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="font-semibold">Posto/Graduação:</span>
                                <p>{selectedPolicial['Post/Grad'] || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="font-semibold">Função:</span>
                                <p>{selectedPolicial.FUNÇÃO || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="font-semibold">Unidade:</span>
                                <p>{selectedPolicial.UNIDADE || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="font-semibold">Situação:</span>
                                <div className="mt-1">{getStatusBadge(selectedPolicial.SITUAÇÃO || '')}</div>
                              </div>
                              <div>
                                <span className="font-semibold">Inclusão:</span>
                                <p>{formatDate(selectedPolicial.inclusão)}</p>
                              </div>
                              <div>
                                <span className="font-semibold">Última Promoção:</span>
                                <p>{formatDate(selectedPolicial['ULTIMA PROMOÇÃO'])}</p>
                              </div>
                              <div>
                                <span className="font-semibold">Previsão Férias 2024:</span>
                                <p>{selectedPolicial['PREVISAO FÉRIAS - AQUISITIVO 2024'] || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="font-semibold">Mudança Comportamento:</span>
                                <p>{selectedPolicial['MUDANÇA COMPORTAMENTO'] || 'N/A'}</p>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Dados de Contato e Bancários */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Phone className="h-5 w-5" />
                                Contato e Dados Bancários
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div>
                                <span className="font-semibold flex items-center gap-1">
                                  <Phone className="h-4 w-4" />
                                  Telefone:
                                </span>
                                <p>{selectedPolicial.telefone || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="font-semibold flex items-center gap-1">
                                  <Mail className="h-4 w-4" />
                                  E-mail:
                                </span>
                                <p>{selectedPolicial['E-MAIL'] || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="font-semibold flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  Endereço:
                                </span>
                                <p>{selectedPolicial.Endereço || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="font-semibold">Bairro:</span>
                                <p>{selectedPolicial.Bairro || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="font-semibold flex items-center gap-1">
                                  <CreditCard className="h-4 w-4" />
                                  Banco:
                                </span>
                                <p>{selectedPolicial.BANCO || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="font-semibold">Agência:</span>
                                <p>{selectedPolicial.AGÊNCIA || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="font-semibold">Conta:</span>
                                <p>{selectedPolicial.CONTA || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="font-semibold flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  Data Atual:
                                </span>
                                <p>{formatDate(selectedPolicial['DATA ATUAL'])}</p>
                              </div>
                              <div>
                                <span className="font-semibold">Ordem:</span>
                                <p>{selectedPolicial.ORD || 'N/A'}</p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </TableCell>
            </TableRow>
          );
          })}
        </TableBody>
      </Table>

      {filteredPoliciais.length === 0 && !loading && (
        <div className="text-center py-8 text-muted-foreground">
          {searchTerm ? 'Nenhum policial encontrado com os critérios de busca.' : 'Nenhum policial cadastrado.'}
        </div>
      )}
    </div>
  );
};

export default PolicialTable;