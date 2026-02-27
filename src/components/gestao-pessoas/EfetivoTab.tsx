import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit, Search, Filter, Eye, User, Phone, MapPin, CreditCard, Mail, Building, TrendingUp, FileText, Calendar, Clock } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { format, parseISO } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { sortByHierarquia } from '@/lib/policialUtils';

interface Policial {
  id: string;
  NOME: string;
  'Post/Grad': string;
  SITUAÇÃO: string;
  'FUNÇÃO': string;
  Unidade: string;
  Matrícula?: string;
  [key: string]: any;
}

interface EfetivoTabProps {
  policiais: Policial[];
  onUpdate: () => void;
}

const EfetivoTab: React.FC<EfetivoTabProps> = ({ policiais, onUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSituacao, setFilterSituacao] = useState('ALL_SITUATIONS');
  const [filterPostGrad, setFilterPostGrad] = useState('ALL_GRADUATIONS');
  const [editingPolicial, setEditingPolicial] = useState<Policial | null>(null);
  const [viewingPolicial, setViewingPolicial] = useState<Policial | null>(null);
  const [showPromocaoDialog, setShowPromocaoDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Função para ordenar por Post/Graduação (mesma lógica do PolicialTable)
  const getPostGradOrder = (postGrad: string): number => {
    const ordem = {
      'TEN CEL': 1, 'MAJ': 2, 'CAP': 3, '1º TEN': 4, '2º TEN': 5,
      '1º SGT': 6, '2º SGT': 7, '3º SGT': 8, 'CB': 9, 'SD': 10
    };
    return ordem[postGrad as keyof typeof ordem] || 999;
  };

  const hasCmtRpmont = (policial: Policial): boolean => {
    return policial['FUNÇÃO']?.includes('CMT RPMONT') || false;
  };

  const shouldCapComeFirst = (policial: Policial): boolean => {
    return policial['Post/Grad'] === 'CAP' && hasCmtRpmont(policial);
  };

  // Filtrar e ordenar policiais
  const filteredPoliciais = policiais
    .filter(policial => {
      const matchesSearch = !searchTerm || 
        policial.NOME?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        policial['Post/Grad']?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(policial.Matrícula || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSituacao = filterSituacao === 'ALL_SITUATIONS' || !filterSituacao || policial.SITUAÇÃO === filterSituacao;
      const matchesPostGrad = filterPostGrad === 'ALL_GRADUATIONS' || !filterPostGrad || policial['Post/Grad'] === filterPostGrad;
      
      return matchesSearch && matchesSituacao && matchesPostGrad;
    })
    .sort(sortByHierarquia);

  // Obter valores únicos para filtros
  const situacoes = [...new Set(policiais.map(p => p.SITUAÇÃO).filter(Boolean))];
  const postGrads = [...new Set(policiais.map(p => p['Post/Grad']).filter(Boolean))];

  const handleEditPolicial = async (updatedData: Partial<Policial>) => {
    if (!editingPolicial) return;

    setLoading(true);
    try {
      const policialRef = doc(db, 'policiais', editingPolicial.id);
      
      // Usar setDoc com merge para evitar problemas com campos como "Post/Grad"
      await setDoc(policialRef, updatedData, { merge: true });

      toast({
        title: "Sucesso",
        description: "Dados do policial atualizados com sucesso"
      });

      setEditingPolicial(null);
      onUpdate();
    } catch (error) {
      console.error('Erro ao atualizar policial:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar dados do policial",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateValue: number | undefined) => {
    if (!dateValue) return 'N/A';
    const excelEpoch = new Date(1900, 0, 1);
    const jsDate = new Date(excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000);
    return jsDate.toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Efetivo Total ({filteredPoliciais.length} de {policiais.length})
            </CardTitle>
            <Button onClick={() => setShowPromocaoDialog(true)}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Gerenciar Promoções
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nome, graduação ou matrícula..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="filter-situacao">Situação</Label>
              <Select value={filterSituacao} onValueChange={setFilterSituacao}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as situações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_SITUATIONS">Todas as situações</SelectItem>
                  {situacoes.map(situacao => (
                    <SelectItem key={situacao} value={situacao}>
                      {situacao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="filter-postgrad">Post/Graduação</Label>
              <Select value={filterPostGrad} onValueChange={setFilterPostGrad}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as graduações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_GRADUATIONS">Todas as graduações</SelectItem>
                  {postGrads.map(postGrad => (
                    <SelectItem key={postGrad} value={postGrad}>
                      {postGrad}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setFilterSituacao('ALL_SITUATIONS');
                  setFilterPostGrad('ALL_GRADUATIONS');
                }}
                className="w-full"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>

          {/* Tabela */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Post/Grad</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPoliciais.map((policial) => (
                  <TableRow key={policial.id}>
                    <TableCell className="font-medium">
                      {policial['Post/Grad']}
                    </TableCell>
                    <TableCell>{policial.NOME}</TableCell>
                    <TableCell>{policial.Matrícula || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={
                        policial.SITUAÇÃO?.includes('FÉRIAS') ? 'secondary' :
                        policial.SITUAÇÃO?.includes('LICENÇA') ? 'destructive' :
                        'default'
                      }>
                        {policial.SITUAÇÃO}
                      </Badge>
                    </TableCell>
                    <TableCell>{policial['FUNÇÃO']}</TableCell>
                    <TableCell>{policial['UNIDADE"RPMONT"'] || policial.Unidade || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingPolicial(policial)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingPolicial(policial)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          {editingPolicial?.id === policial.id && (
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Editar Policial</DialogTitle>
                                <DialogDescription>
                                  Edite os dados de {policial['Post/Grad']} {policial.NOME}
                                </DialogDescription>
                              </DialogHeader>
                              <EditPolicialForm
                                policial={editingPolicial}
                                onSave={handleEditPolicial}
                                onCancel={() => setEditingPolicial(null)}
                                loading={loading}
                              />
                            </DialogContent>
                          )}
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredPoliciais.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum policial encontrado com os filtros aplicados
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Visualização Completa */}
      <Dialog open={!!viewingPolicial} onOpenChange={(open) => !open && setViewingPolicial(null)}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Informações Completas do Policial</DialogTitle>
          </DialogHeader>
          {viewingPolicial && (
            <Tabs defaultValue="dados">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="dados">Dados Pessoais</TabsTrigger>
                <TabsTrigger value="assentamentos">Assentamentos</TabsTrigger>
              </TabsList>

              <TabsContent value="dados">
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
                      <div><span className="font-semibold">Nome:</span><p>{viewingPolicial.NOME || 'N/A'}</p></div>
                      <div><span className="font-semibold">Nome de Guerra:</span><p>{viewingPolicial['NOME DE GUERRA'] || viewingPolicial.nomeGuerra || 'N/A'}</p></div>
                      <div><span className="font-semibold">Nome de Guerra 1:</span><p>{viewingPolicial['NOME DE GUERRA1'] || viewingPolicial.nomeGuerra1 || 'N/A'}</p></div>
                      <div><span className="font-semibold">CPF:</span><p>{viewingPolicial.CPF || viewingPolicial.cpf || 'N/A'}</p></div>
                      <div><span className="font-semibold">Idade:</span><p>{viewingPolicial.IDADE || viewingPolicial.idade || 'N/A'} anos</p></div>
                      <div><span className="font-semibold">Nascimento:</span><p>{formatDate(viewingPolicial.NASCIMENTO) || (viewingPolicial.dataNascimento ? new Date(viewingPolicial.dataNascimento).toLocaleDateString('pt-BR') : 'N/A')}</p></div>
                      <div><span className="font-semibold">Mês Aniversário:</span><p>{viewingPolicial['MÊS ANIVERSARIO'] || viewingPolicial.mesAniversario || 'N/A'}</p></div>
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
                      <div><span className="font-semibold">Matrícula:</span><p>{viewingPolicial.Matrícula || 'N/A'}</p></div>
                      <div><span className="font-semibold">Numeral:</span><p>{viewingPolicial.NUMERAL || viewingPolicial.numeral || 'N/A'}</p></div>
                      <div><span className="font-semibold">Posto/Graduação:</span><p>{viewingPolicial['Post/Grad'] || 'N/A'}</p></div>
                      <div><span className="font-semibold">Função:</span><p>{viewingPolicial['FUNÇÃO'] || 'N/A'}</p></div>
                      <div><span className="font-semibold">Unidade:</span><p>{viewingPolicial['UNIDADE"RPMONT"'] || viewingPolicial.Unidade || viewingPolicial.unidade || 'N/A'}</p></div>
                      <div>
                        <span className="font-semibold">Situação:</span>
                        <div className="mt-1">
                          <Badge variant={
                            viewingPolicial.SITUAÇÃO?.includes('FÉRIAS') ? 'secondary' :
                            viewingPolicial.SITUAÇÃO?.includes('LICENÇA') ? 'destructive' :
                            'default'
                          }>{viewingPolicial.SITUAÇÃO || 'N/A'}</Badge>
                        </div>
                      </div>
                      <div><span className="font-semibold">Inclusão:</span><p>{formatDate(viewingPolicial.inclusão) || 'N/A'}</p></div>
                      <div><span className="font-semibold">Última Promoção:</span><p>{formatDate(viewingPolicial['ULTIMA PROMOÇÃO']) || (viewingPolicial.dataUltimaPromocao ? new Date(viewingPolicial.dataUltimaPromocao).toLocaleDateString('pt-BR') : 'N/A')}</p></div>
                      <div><span className="font-semibold">Previsão Férias 2024:</span><p>{viewingPolicial['PREVISAO FÉRIAS - AQUISITIVO 2024'] || viewingPolicial.previsaoFerias2024 || 'N/A'}</p></div>
                      <div><span className="font-semibold">Mudança Comportamento:</span><p>{viewingPolicial['MUDANÇA COMPORTAMENTO'] || 'N/A'}</p></div>
                    </CardContent>
                  </Card>

                  {/* Contato e Dados Bancários */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Phone className="h-5 w-5" />
                        Contato e Dados Bancários
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div><span className="font-semibold flex items-center gap-1"><Phone className="h-4 w-4" />Telefone:</span><p>{viewingPolicial.telefone || 'N/A'}</p></div>
                      <div><span className="font-semibold flex items-center gap-1"><Mail className="h-4 w-4" />E-mail:</span><p>{viewingPolicial['E-MAIL'] || viewingPolicial.email || 'N/A'}</p></div>
                      <div><span className="font-semibold flex items-center gap-1"><MapPin className="h-4 w-4" />Endereço:</span><p>{viewingPolicial.Endereço || viewingPolicial.endereco || 'N/A'}</p></div>
                      <div><span className="font-semibold">Bairro:</span><p>{viewingPolicial.Bairro || viewingPolicial.bairro || 'N/A'}</p></div>
                      <div><span className="font-semibold flex items-center gap-1"><CreditCard className="h-4 w-4" />Banco:</span><p>{viewingPolicial.BANCO || viewingPolicial.banco || 'N/A'}</p></div>
                      <div><span className="font-semibold">Agência:</span><p>{viewingPolicial.AGÊNCIA || viewingPolicial.agencia || 'N/A'}</p></div>
                      <div><span className="font-semibold">Conta:</span><p>{viewingPolicial.CONTA || viewingPolicial.conta || 'N/A'}</p></div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="assentamentos">
                <AssentamentosSection policialId={viewingPolicial.id} policial={viewingPolicial} />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Promoções */}
      {showPromocaoDialog && (
        <PromocaoDialog
          policiais={policiais}
          onClose={() => setShowPromocaoDialog(false)}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
};

// Componente de Assentamentos
const AssentamentosSection: React.FC<{ policialId: string; policial: Policial }> = ({ policialId, policial }) => {
  const [atestados, setAtestados] = React.useState<any[]>([]);
  const [assentamentos, setAssentamentos] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchAssentamentos = async () => {
      try {
        setLoading(true);
        // Buscar atestados médicos
        const atestadosRef = collection(db, 'atestados_medicos');
        const q = query(atestadosRef, where('policialId', '==', policialId));
        const snap = await getDocs(q);
        const atestadosData = snap.docs.map(d => ({ id: d.id, tipo: 'Atestado Médico', ...d.data() }));
        setAtestados(atestadosData);

        // Buscar assentamentos (mudanças de situação/função)
        const assentRef = collection(db, 'assentamentos');
        const qAssent = query(assentRef, where('policialId', '==', policialId));
        const snapAssent = await getDocs(qAssent);
        setAssentamentos(snapAssent.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error('Erro ao buscar assentamentos:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAssentamentos();
  }, [policialId]);

  const formatDateStr = (d: string) => {
    if (!d) return 'N/A';
    try { return format(parseISO(d), 'dd/MM/yyyy'); } catch { return d; }
  };

  const timeline = React.useMemo(() => {
    const items: { data: string; tipo: string; descricao: string; status?: string; publicacao?: string }[] = [];

    // Atestados
    atestados.forEach(a => {
      items.push({
        data: a.dataInicio || a.criadoEm || '',
        tipo: 'Atestado Médico',
        descricao: `CID ${a.cid} - ${a.cidDescricao} | ${a.dias} dias | Médico: ${a.medico || 'N/A'}`,
        status: a.statusPericia === 'PENDENTE' ? 'Pendente Perícia' :
                a.statusPericia === 'AGENDADO' ? 'Perícia Agendada' :
                a.statusPericia === 'HOMOLOGADO' ? 'Homologado' : 'OK',
      });
    });

    // Assentamentos (mudanças de situação)
    assentamentos.forEach(a => {
      items.push({
        data: a.data || a.criadoEm || '',
        tipo: a.tipo || 'Mudança de Situação',
        descricao: a.descricao || `${a.situacaoAnterior} → ${a.novaSituacao}`,
        status: a.novaSituacao || '',
        publicacao: a.publicacao || '',
      });
    });

    // Férias (se houver)
    if (policial.inicioFerias) {
      items.push({
        data: policial.inicioFerias,
        tipo: 'Férias',
        descricao: `Férias de ${formatDateStr(policial.inicioFerias)} a ${formatDateStr(policial.fimFerias || '')}`,
        status: policial.SITUAÇÃO?.includes('FÉRIAS') ? 'Em andamento' : 'Concluído',
      });
    }

    // Situação atual
    if (policial.SITUAÇÃO && !policial.SITUAÇÃO.includes('PRONTO')) {
      items.push({
        data: new Date().toISOString(),
        tipo: 'Situação',
        descricao: policial.SITUAÇÃO,
        status: 'Atual',
      });
    }

    items.sort((a, b) => {
      const dateA = a.data ? new Date(a.data).getTime() : 0;
      const dateB = b.data ? new Date(b.data).getTime() : 0;
      return dateB - dateA;
    });

    return items;
  }, [atestados, assentamentos, policial]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
        Carregando assentamentos...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <FileText className="h-5 w-5" />
        Ficha de Assentamentos — {policial['Post/Grad']} {policial.NOME}
      </h3>

      {timeline.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">Nenhum assentamento registrado para este policial</p>
      ) : (
        <div className="space-y-3">
          {timeline.map((item, idx) => (
            <div key={idx} className="flex gap-4 p-3 border rounded-lg">
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full ${
                  item.tipo === 'Atestado Médico' ? 'bg-red-500' :
                  item.tipo === 'Férias' ? 'bg-blue-500' :
                  item.tipo === 'Mudança de Situação' ? 'bg-amber-500' : 'bg-muted-foreground'
                }`} />
                {idx < timeline.length - 1 && <div className="w-px h-full bg-border mt-1" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{item.tipo}</Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDateStr(item.data)}
                  </span>
                </div>
                <p className="text-sm mt-1">{item.descricao}</p>
                {item.publicacao && (
                  <p className="text-xs text-muted-foreground mt-1">📄 Publicação: {item.publicacao}</p>
                )}
                {item.status && (
                  <Badge variant="secondary" className="mt-1 text-xs">{item.status}</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Componente para editar policial
const EditPolicialForm: React.FC<{
  policial: Policial;
  onSave: (data: Partial<Policial>) => void;
  onCancel: () => void;
  loading: boolean;
}> = ({ policial, onSave, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    // Dados Pessoais
    NOME: policial.NOME || '',
    'NOME DE GUERRA': policial['NOME DE GUERRA'] || policial.nomeGuerra || '',
    'NOME DE GUERRA1': policial['NOME DE GUERRA1'] || policial.nomeGuerra1 || '',
    CPF: policial.CPF || policial.cpf || '',
    dataNascimento: policial.dataNascimento || '',
    
    // Dados Profissionais
    Matrícula: policial.Matrícula || '',
    NUMERAL: policial.NUMERAL || policial.numeral || '',
    'Post/Grad': policial['Post/Grad'] || '',
    'FUNÇÃO': policial['FUNÇÃO'] || '',
    'UNIDADE"RPMONT"': policial['UNIDADE"RPMONT"'] || policial.Unidade || policial.unidade || '',
    SITUAÇÃO: policial.SITUAÇÃO || '',
    'PREVISAO FÉRIAS - AQUISITIVO 2024': policial['PREVISAO FÉRIAS - AQUISITIVO 2024'] || policial.previsaoFerias2024 || '',
    'MUDANÇA COMPORTAMENTO': policial['MUDANÇA COMPORTAMENTO'] || '',
    
    // Contato e Dados Bancários
    telefone: policial.telefone || '',
    'E-MAIL': policial['E-MAIL'] || policial.email || '',
    Endereço: policial.Endereço || policial.endereco || '',
    Bairro: policial.Bairro || policial.bairro || '',
    BANCO: policial.BANCO || policial.banco || '',
    AGÊNCIA: policial.AGÊNCIA || policial.agencia || '',
    CONTA: policial.CONTA || policial.conta || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calcular idade e mês de aniversário se data de nascimento foi alterada
    let updateData: any = { ...formData };
    
    if (formData.dataNascimento) {
      const dataNasc = new Date(formData.dataNascimento);
      const hoje = new Date();
      let idade = hoje.getFullYear() - dataNasc.getFullYear();
      const mesAtual = hoje.getMonth();
      const mesNasc = dataNasc.getMonth();
      
      if (mesAtual < mesNasc || (mesAtual === mesNasc && hoje.getDate() < dataNasc.getDate())) {
        idade--;
      }
      
      updateData.IDADE = idade;
      updateData['MÊS ANIVERSARIO'] = mesNasc + 1;
      updateData.idade = idade;
      updateData.mesAniversario = mesNasc + 1;
    }
    
    onSave(updateData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
      {/* Dados Pessoais */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <User className="h-5 w-5" />
          Dados Pessoais
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor="nome">Nome Completo</Label>
            <Input
              id="nome"
              value={formData.NOME}
              onChange={(e) => setFormData(prev => ({ ...prev, NOME: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="nomeGuerra">Nome de Guerra</Label>
            <Input
              id="nomeGuerra"
              value={formData['NOME DE GUERRA']}
              onChange={(e) => setFormData(prev => ({ ...prev, 'NOME DE GUERRA': e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="nomeGuerra1">Nome de Guerra 1</Label>
            <Input
              id="nomeGuerra1"
              value={formData['NOME DE GUERRA1']}
              onChange={(e) => setFormData(prev => ({ ...prev, 'NOME DE GUERRA1': e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              value={formData.CPF}
              onChange={(e) => setFormData(prev => ({ ...prev, CPF: e.target.value }))}
              placeholder="000.000.000-00"
            />
          </div>
          <div>
            <Label htmlFor="dataNascimento">Data de Nascimento</Label>
            <Input
              id="dataNascimento"
              type="date"
              value={formData.dataNascimento}
              onChange={(e) => setFormData(prev => ({ ...prev, dataNascimento: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* Dados Profissionais */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Building className="h-5 w-5" />
          Dados Profissionais
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="matricula">Matrícula</Label>
            <Input
              id="matricula"
              value={formData.Matrícula}
              onChange={(e) => setFormData(prev => ({ ...prev, Matrícula: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="numeral">Numeral</Label>
            <Input
              id="numeral"
              value={formData.NUMERAL}
              onChange={(e) => setFormData(prev => ({ ...prev, NUMERAL: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="postgrad">Posto/Graduação</Label>
            <Input
              id="postgrad"
              value={formData['Post/Grad']}
              onChange={(e) => setFormData(prev => ({ ...prev, 'Post/Grad': e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="situacao">Situação</Label>
            <Input
              id="situacao"
              value={formData.SITUAÇÃO}
              onChange={(e) => setFormData(prev => ({ ...prev, SITUAÇÃO: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="funcao">Função</Label>
            <Input
              id="funcao"
              value={formData['FUNÇÃO']}
              onChange={(e) => setFormData(prev => ({ ...prev, 'FUNÇÃO': e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="unidade">Unidade (RPMONT)</Label>
            <Input
              id="unidade"
              value={formData['UNIDADE"RPMONT"']}
              onChange={(e) => setFormData(prev => ({ ...prev, 'UNIDADE"RPMONT"': e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="previsaoFerias">Previsão Férias 2024</Label>
            <Input
              id="previsaoFerias"
              value={formData['PREVISAO FÉRIAS - AQUISITIVO 2024']}
              onChange={(e) => setFormData(prev => ({ ...prev, 'PREVISAO FÉRIAS - AQUISITIVO 2024': e.target.value }))}
              placeholder="Ex: DEZEMBRO"
            />
          </div>
          <div>
            <Label htmlFor="mudancaComportamento">Mudança Comportamento</Label>
            <Input
              id="mudancaComportamento"
              value={formData['MUDANÇA COMPORTAMENTO']}
              onChange={(e) => setFormData(prev => ({ ...prev, 'MUDANÇA COMPORTAMENTO': e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* Contato e Dados Bancários */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Contato e Dados Bancários
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              value={formData.telefone}
              onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
              placeholder="(00) 00000-0000"
            />
          </div>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={formData['E-MAIL']}
              onChange={(e) => setFormData(prev => ({ ...prev, 'E-MAIL': e.target.value }))}
              placeholder="exemplo@email.com"
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Input
              id="endereco"
              value={formData.Endereço}
              onChange={(e) => setFormData(prev => ({ ...prev, Endereço: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="bairro">Bairro</Label>
            <Input
              id="bairro"
              value={formData.Bairro}
              onChange={(e) => setFormData(prev => ({ ...prev, Bairro: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="banco">Banco</Label>
            <Input
              id="banco"
              value={formData.BANCO}
              onChange={(e) => setFormData(prev => ({ ...prev, BANCO: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="agencia">Agência</Label>
            <Input
              id="agencia"
              value={formData.AGÊNCIA}
              onChange={(e) => setFormData(prev => ({ ...prev, AGÊNCIA: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="conta">Conta</Label>
            <Input
              id="conta"
              value={formData.CONTA}
              onChange={(e) => setFormData(prev => ({ ...prev, CONTA: e.target.value }))}
            />
          </div>
        </div>
      </div>
      
      <DialogFooter className="sticky bottom-0 bg-background pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </DialogFooter>
    </form>
  );
};

// Importar componente de promoções
import PromocaoDialog from './PromocaoDialog';

export default EfetivoTab;