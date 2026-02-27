import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, Calendar, Users, Bell, Search, Filter, Settings, Plus, Pencil, Trash2 } from 'lucide-react';
import { doc, updateDoc, writeBatch, collection, addDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isWithinInterval, addDays } from 'date-fns';
import { sortByHierarquia } from '@/lib/policialUtils';

interface Policial {
  id: string;
  NOME: string;
  'Post/Grad': string;
  SITUAÇÃO: string;
  'FUNÇÃO': string;
  Unidade: string;
  Matrícula?: string;
  inicioSituacao?: string;
  fimSituacao?: string;
  observacaoSituacao?: string;
  funcaoOrigem?: string;
  publicacaoSituacao?: string;
}

interface SituacaoTabProps {
  policiais: Policial[];
  onUpdate: () => void;
}

interface ConfigSituacao {
  id: string;
  nome: string;
  indisponivel: boolean;
}

const SITUACOES_SEED = [
  { nome: 'FÉRIAS', indisponivel: true },
  { nome: 'READAPTAÇÃO FUNCIONAL', indisponivel: true },
  { nome: 'LICENÇA TRATAMENTO DE SAUDE', indisponivel: true },
  { nome: 'LICENÇA PATERNIDADE', indisponivel: true },
  { nome: 'LICENÇA MATERNIDADE', indisponivel: true },
  { nome: 'RECOMPENSA MILITAR', indisponivel: true },
  { nome: 'NUPCIAS', indisponivel: true },
  { nome: 'LUTO', indisponivel: true },
  { nome: 'CURSANDO', indisponivel: true },
  { nome: 'TRANSITO', indisponivel: true },
  { nome: 'RESP. PROCESSO', indisponivel: true },
  { nome: 'DESERTOR', indisponivel: true },
  { nome: 'A DISP. DE OUTROS ORGÃOS', indisponivel: true },
  { nome: 'RECOLHIDO PRES. MILITAR', indisponivel: true },
  { nome: 'AGREGADO', indisponivel: true },
  { nome: 'AGREGADO - AGUARDANDO RESERVA', indisponivel: true },
];

const SituacaoTab: React.FC<SituacaoTabProps> = ({ policiais, onUpdate }) => {
  const [selectedPoliciais, setSelectedPoliciais] = useState<string[]>([]);
  const [novaSituacao, setNovaSituacao] = useState('');
  const [inicioSituacao, setInicioSituacao] = useState('');
  const [fimSituacao, setFimSituacao] = useState('');
  const [observacao, setObservacao] = useState('');
  const [publicacao, setPublicacao] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSituacao, setFilterSituacao] = useState('all');
  const { toast } = useToast();

  // Config situações
  const [situacoes, setSituacoes] = useState<ConfigSituacao[]>([]);
  const [showGerenciar, setShowGerenciar] = useState(false);
  const [showAddSituacaoDialog, setShowAddSituacaoDialog] = useState(false);
  const [editingSituacao, setEditingSituacao] = useState<ConfigSituacao | null>(null);
  const [novaSituacaoNome, setNovaSituacaoNome] = useState('');
  const [novaSituacaoIndisponivel, setNovaSituacaoIndisponivel] = useState(true);

  // Config funções (para dialog retirada)
  const [funcoes, setFuncoes] = useState<string[]>([]);

  // Dialog retirada
  const [showRetiradaDialog, setShowRetiradaDialog] = useState(false);
  const [policialRetirada, setPolicialRetirada] = useState<Policial | null>(null);
  const [retiradaNovaSituacao, setRetiradaNovaSituacao] = useState('MONTADO - POLICIAMENTO OSTENSIVO');
  const [retiradaNovaFuncao, setRetiradaNovaFuncao] = useState('');
  const [retiradaPublicacao, setRetiradaPublicacao] = useState('');

  // Carregar configurações
  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        // Situações
        const sitSnap = await getDocs(collection(db, 'config_situacoes'));
        if (sitSnap.empty) {
          const batch = writeBatch(db);
          const items: ConfigSituacao[] = [];
          for (const s of SITUACOES_SEED) {
            const ref = doc(collection(db, 'config_situacoes'));
            batch.set(ref, { ...s, criadoEm: new Date().toISOString() });
            items.push({ id: ref.id, ...s });
          }
          await batch.commit();
          setSituacoes(items);
        } else {
          setSituacoes(sitSnap.docs.map(d => ({ id: d.id, nome: d.data().nome, indisponivel: d.data().indisponivel ?? true })));
        }

        // Funções
        const funcSnap = await getDocs(collection(db, 'config_funcoes'));
        setFuncoes(funcSnap.docs.map(d => d.data().nome as string).sort());
      } catch (error) {
        console.error('Erro ao carregar configs:', error);
      }
    };
    fetchConfigs();
  }, []);

  const situacoesNomes = useMemo(() => situacoes.map(s => s.nome).sort(), [situacoes]);

  const policiaisDisponiveis = useMemo(() => {
    return policiais
      .filter(p => p.SITUAÇÃO === 'MONTADO - POLICIAMENTO OSTENSIVO' || !p.SITUAÇÃO || p.SITUAÇÃO === 'VIATURA')
      .sort(sortByHierarquia);
  }, [policiais]);

  const policiaisEmSituacao = useMemo(() => {
    return policiais
      .filter(p => p.SITUAÇÃO !== 'MONTADO - POLICIAMENTO OSTENSIVO' && p.SITUAÇÃO !== 'VIATURA' && p.SITUAÇÃO)
      .sort(sortByHierarquia);
  }, [policiais]);

  const policiaisDisponiveisFiltrados = useMemo(() => {
    return policiaisDisponiveis.filter(policial => {
      const matchesSearch = !searchTerm ||
        policial.NOME?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        policial['Post/Grad']?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(policial.Matrícula || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSituacao = filterSituacao === 'all' || !filterSituacao || policial.SITUAÇÃO === filterSituacao;
      return matchesSearch && matchesSituacao;
    });
  }, [policiaisDisponiveis, searchTerm, filterSituacao]);

  const policiaisEmSituacaoFiltrados = useMemo(() => {
    return policiaisEmSituacao.filter(policial => {
      const matchesSearch = !searchTerm ||
        policial.NOME?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        policial['Post/Grad']?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(policial.Matrícula || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSituacao = filterSituacao === 'all' || !filterSituacao || policial.SITUAÇÃO === filterSituacao;
      return matchesSearch && matchesSituacao;
    });
  }, [policiaisEmSituacao, searchTerm, filterSituacao]);

  const alertasSituacao = policiaisEmSituacao.filter(policial => {
    if (!policial.fimSituacao) return false;
    try {
      const fimData = parseISO(policial.fimSituacao);
      const agora = new Date();
      const em7dias = addDays(agora, 7);
      return isWithinInterval(fimData, { start: agora, end: em7dias });
    } catch { return false; }
  });

  const handleSelectPolicial = (policialId: string, checked: boolean) => {
    setSelectedPoliciais(prev => checked ? [...prev, policialId] : prev.filter(id => id !== policialId));
  };

  const handleColocarSituacao = async () => {
    if (selectedPoliciais.length === 0 || !novaSituacao || !inicioSituacao) {
      toast({ title: "Erro", description: "Selecione policiais, situação e data de início", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const batch = writeBatch(db);
      for (const policialId of selectedPoliciais) {
        const policial = policiais.find(p => p.id === policialId);
        if (policial) {
          const policialRef = doc(db, 'policiais', policialId);
          batch.update(policialRef, {
            SITUAÇÃO: novaSituacao,
            inicioSituacao,
            fimSituacao: fimSituacao || null,
            observacaoSituacao: observacao || '',
            publicacaoSituacao: publicacao || '',
            funcaoOrigem: policial['FUNÇÃO'] || 'MONTADO - POLICIAMENTO OSTENSIVO'
          });

          // Registrar assentamento
          const assentRef = doc(collection(db, 'assentamentos'));
          batch.set(assentRef, {
            policialId,
            tipo: 'Mudança de Situação',
            data: new Date().toISOString().split('T')[0],
            descricao: `Colocado em ${novaSituacao}. Função anterior: ${policial['FUNÇÃO'] || 'N/A'}`,
            situacaoAnterior: policial.SITUAÇÃO || 'MONTADO - POLICIAMENTO OSTENSIVO',
            novaSituacao,
            novaFuncao: policial['FUNÇÃO'] || '',
            publicacao: publicacao || '',
            criadoEm: new Date().toISOString()
          });
        }
      }
      await batch.commit();
      toast({ title: "Sucesso", description: `${selectedPoliciais.length} policial(is) colocado(s) em ${novaSituacao}` });
      setSelectedPoliciais([]);
      setNovaSituacao('');
      setInicioSituacao('');
      setFimSituacao('');
      setObservacao('');
      setPublicacao('');
      onUpdate();
    } catch (error) {
      console.error('Erro:', error);
      toast({ title: "Erro", description: "Erro ao processar solicitação", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openRetiradaDialog = (policial: Policial) => {
    setPolicialRetirada(policial);
    setRetiradaNovaSituacao('MONTADO - POLICIAMENTO OSTENSIVO');
    setRetiradaNovaFuncao(policial.funcaoOrigem || 'MONTADO - POLICIAMENTO OSTENSIVO');
    setRetiradaPublicacao('');
    setShowRetiradaDialog(true);
  };

  const handleConfirmarRetirada = async () => {
    if (!policialRetirada) return;
    setLoading(true);
    try {
      const policialRef = doc(db, 'policiais', policialRetirada.id);
      await updateDoc(policialRef, {
        SITUAÇÃO: retiradaNovaSituacao,
        'FUNÇÃO': retiradaNovaFuncao,
        funcaoOrigem: retiradaNovaFuncao,
        inicioSituacao: null,
        fimSituacao: null,
        observacaoSituacao: null,
        publicacaoSituacao: null
      });

      // Registrar assentamento
      await addDoc(collection(db, 'assentamentos'), {
        policialId: policialRetirada.id,
        tipo: 'Mudança de Situação',
        data: new Date().toISOString().split('T')[0],
        descricao: `Retirado de ${policialRetirada.SITUAÇÃO}. Nova situação: ${retiradaNovaSituacao}. Nova função: ${retiradaNovaFuncao}${retiradaPublicacao ? `. Publicação: ${retiradaPublicacao}` : ''}`,
        situacaoAnterior: policialRetirada.SITUAÇÃO,
        novaSituacao: retiradaNovaSituacao,
        novaFuncao: retiradaNovaFuncao,
        publicacao: retiradaPublicacao || '',
        criadoEm: new Date().toISOString()
      });

      toast({ title: "Sucesso", description: `${policialRetirada['Post/Grad']} ${policialRetirada.NOME} retirado da situação` });
      setShowRetiradaDialog(false);
      setPolicialRetirada(null);
      onUpdate();
    } catch (error) {
      console.error('Erro:', error);
      toast({ title: "Erro", description: "Erro ao processar solicitação", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // CRUD situações
  const handleAddSituacao = async () => {
    if (!novaSituacaoNome.trim()) return;
    try {
      const ref = await addDoc(collection(db, 'config_situacoes'), {
        nome: novaSituacaoNome.trim().toUpperCase(),
        indisponivel: novaSituacaoIndisponivel,
        criadoEm: new Date().toISOString()
      });
      setSituacoes(prev => [...prev, { id: ref.id, nome: novaSituacaoNome.trim().toUpperCase(), indisponivel: novaSituacaoIndisponivel }]);
      setNovaSituacaoNome('');
      setNovaSituacaoIndisponivel(true);
      setShowAddSituacaoDialog(false);
      toast({ title: "Situação adicionada" });
    } catch (error) {
      toast({ title: "Erro", variant: "destructive" });
    }
  };

  const handleEditSituacao = async () => {
    if (!editingSituacao || !novaSituacaoNome.trim()) return;
    try {
      await updateDoc(doc(db, 'config_situacoes', editingSituacao.id), {
        nome: novaSituacaoNome.trim().toUpperCase(),
        indisponivel: novaSituacaoIndisponivel
      });
      setSituacoes(prev => prev.map(s => s.id === editingSituacao.id
        ? { ...s, nome: novaSituacaoNome.trim().toUpperCase(), indisponivel: novaSituacaoIndisponivel }
        : s
      ));
      setEditingSituacao(null);
      setNovaSituacaoNome('');
      setShowAddSituacaoDialog(false);
      toast({ title: "Situação atualizada" });
    } catch (error) {
      toast({ title: "Erro", variant: "destructive" });
    }
  };

  const handleDeleteSituacao = async (sit: ConfigSituacao) => {
    if (!confirm(`Excluir "${sit.nome}"?`)) return;
    try {
      await deleteDoc(doc(db, 'config_situacoes', sit.id));
      setSituacoes(prev => prev.filter(s => s.id !== sit.id));
      toast({ title: "Situação excluída" });
    } catch (error) {
      toast({ title: "Erro", variant: "destructive" });
    }
  };

  const handleToggleIndisponivel = async (sit: ConfigSituacao) => {
    try {
      await updateDoc(doc(db, 'config_situacoes', sit.id), { indisponivel: !sit.indisponivel });
      setSituacoes(prev => prev.map(s => s.id === sit.id ? { ...s, indisponivel: !s.indisponivel } : s));
    } catch (error) {
      toast({ title: "Erro", variant: "destructive" });
    }
  };

  const getBadgeVariant = (situacao: string) => {
    if (situacao.includes('FÉRIAS')) return 'secondary' as const;
    if (situacao.includes('LICENÇA')) return 'destructive' as const;
    if (situacao.includes('CURSANDO')) return 'default' as const;
    if (situacao.includes('LUTO') || situacao.includes('DESERTOR')) return 'destructive' as const;
    return 'outline' as const;
  };

  return (
    <div className="space-y-6">
      {/* Gerenciar Situações */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Gerenciar Situações
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowGerenciar(!showGerenciar)}>
                {showGerenciar ? 'Ocultar' : 'Mostrar'}
              </Button>
              <Button size="sm" onClick={() => {
                setNovaSituacaoNome('');
                setNovaSituacaoIndisponivel(true);
                setEditingSituacao(null);
                setShowAddSituacaoDialog(true);
              }}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </div>
          </div>
        </CardHeader>
        {showGerenciar && (
          <CardContent>
            <div className="border rounded-lg max-h-72 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Situação</TableHead>
                    <TableHead className="w-36">Indisponibilidade</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {situacoes.sort((a, b) => a.nome.localeCompare(b.nome)).map(sit => (
                    <TableRow key={sit.id}>
                      <TableCell>{sit.nome}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={sit.indisponivel}
                            onCheckedChange={() => handleToggleIndisponivel(sit)}
                          />
                          <span className="text-xs text-muted-foreground">{sit.indisponivel ? 'Sim' : 'Não'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => {
                            setEditingSituacao(sit);
                            setNovaSituacaoNome(sit.nome);
                            setNovaSituacaoIndisponivel(sit.indisponivel);
                            setShowAddSituacaoDialog(true);
                          }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteSituacao(sit)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Alertas */}
      {alertasSituacao.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Bell className="h-5 w-5" />
              Alertas - Situações Terminando em Breve
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alertasSituacao.map(policial => (
                <div key={policial.id} className="flex justify-between items-center p-2 bg-white rounded">
                  <div>
                    <span className="font-medium">{policial['Post/Grad']} {policial.NOME}</span>
                    <Badge variant="outline" className="ml-2">{policial.SITUAÇÃO}</Badge>
                  </div>
                  <Badge variant="destructive">
                    Termina em {policial.fimSituacao ? format(parseISO(policial.fimSituacao), 'dd/MM/yyyy') : 'N/A'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Buscar por Nome/Graduação/Matrícula</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Digite para buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
            </div>
            <div>
              <Label>Filtrar por Situação</Label>
              <Select value={filterSituacao} onValueChange={setFilterSituacao}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as situações</SelectItem>
                  <SelectItem value="MONTADO - POLICIAMENTO OSTENSIVO">Montado</SelectItem>
                  {situacoesNomes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => { setSearchTerm(''); setFilterSituacao('all'); }}>Limpar Filtros</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colocar em Situação */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Colocar em Situação
            </CardTitle>
            <CardDescription>Selecione os policiais e a situação</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Situação</Label>
              <Select value={novaSituacao} onValueChange={setNovaSituacao}>
                <SelectTrigger><SelectValue placeholder="Selecione uma situação" /></SelectTrigger>
                <SelectContent>
                  {situacoesNomes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data de Início</Label>
                <Input type="date" value={inicioSituacao} onChange={(e) => setInicioSituacao(e.target.value)} />
              </div>
              <div>
                <Label>Data de Fim (opcional)</Label>
                <Input type="date" value={fimSituacao} onChange={(e) => setFimSituacao(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Publicação (opcional)</Label>
              <Input placeholder="Ex: Portaria nº 123/2024" value={publicacao} onChange={(e) => setPublicacao(e.target.value)} />
            </div>
            <div>
              <Label>Observação (opcional)</Label>
              <Input placeholder="Observações adicionais" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
            </div>
            <div className="max-h-60 overflow-y-auto border rounded-lg p-4 space-y-2">
              <Label>Selecionar Policiais ({selectedPoliciais.length} selecionados)</Label>
              {policiaisDisponiveisFiltrados.map(policial => (
                <div key={policial.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`policial-${policial.id}`}
                    checked={selectedPoliciais.includes(policial.id)}
                    onCheckedChange={(checked) => handleSelectPolicial(policial.id, checked as boolean)}
                  />
                  <label htmlFor={`policial-${policial.id}`} className="text-sm font-medium leading-none cursor-pointer flex-1">
                    {policial['Post/Grad']} {policial.NOME}
                    {policial.Matrícula && <span className="text-muted-foreground ml-2">({policial.Matrícula})</span>}
                  </label>
                </div>
              ))}
            </div>
            <Button onClick={handleColocarSituacao} disabled={loading || selectedPoliciais.length === 0} className="w-full">
              {loading ? "Processando..." : `Colocar ${selectedPoliciais.length} Policial(is) em Situação`}
            </Button>
          </CardContent>
        </Card>

        {/* Policiais em Situação */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Policiais em Situação ({policiaisEmSituacaoFiltrados.length})
            </CardTitle>
            <CardDescription>Policiais atualmente em situação especial</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {policiaisEmSituacaoFiltrados.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum policial em situação especial</p>
              ) : (
                policiaisEmSituacaoFiltrados.map(policial => (
                  <div key={policial.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{policial['Post/Grad']} {policial.NOME}</p>
                      <Badge variant={getBadgeVariant(policial.SITUAÇÃO)} className="mt-1">{policial.SITUAÇÃO}</Badge>
                      <div className="flex gap-2 mt-2">
                        {policial.inicioSituacao && (
                          <Badge variant="outline" className="text-xs">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(policial.inicioSituacao).toLocaleDateString()}
                            {policial.fimSituacao && ` - ${new Date(policial.fimSituacao).toLocaleDateString()}`}
                          </Badge>
                        )}
                        {policial.publicacaoSituacao && (
                          <Badge variant="secondary" className="text-xs">{policial.publicacaoSituacao}</Badge>
                        )}
                      </div>
                      {policial.observacaoSituacao && (
                        <p className="text-xs text-muted-foreground mt-1">{policial.observacaoSituacao}</p>
                      )}
                      {policial.funcaoOrigem && (
                        <p className="text-xs text-muted-foreground mt-1">Função original: {policial.funcaoOrigem}</p>
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => openRetiradaDialog(policial)} disabled={loading}>
                      Retirar da Situação
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog Adicionar/Editar Situação */}
      <Dialog open={showAddSituacaoDialog} onOpenChange={setShowAddSituacaoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSituacao ? 'Editar Situação' : 'Adicionar Situação'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nome da Situação</Label>
              <Input value={novaSituacaoNome} onChange={(e) => setNovaSituacaoNome(e.target.value)} placeholder="Ex: FÉRIAS" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={novaSituacaoIndisponivel} onCheckedChange={setNovaSituacaoIndisponivel} />
              <Label>Conta como indisponibilidade</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddSituacaoDialog(false); setEditingSituacao(null); }}>Cancelar</Button>
            <Button onClick={editingSituacao ? handleEditSituacao : handleAddSituacao} disabled={!novaSituacaoNome.trim()}>
              {editingSituacao ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Retirar da Situação */}
      <Dialog open={showRetiradaDialog} onOpenChange={setShowRetiradaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retirar da Situação</DialogTitle>
            <DialogDescription>
              {policialRetirada && `${policialRetirada['Post/Grad']} ${policialRetirada.NOME} — ${policialRetirada.SITUAÇÃO}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nova Situação</Label>
              <Select value={retiradaNovaSituacao} onValueChange={setRetiradaNovaSituacao}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTADO - POLICIAMENTO OSTENSIVO">MONTADO - POLICIAMENTO OSTENSIVO</SelectItem>
                  <SelectItem value="VIATURA">VIATURA</SelectItem>
                  {situacoesNomes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nova Função</Label>
              <Select value={retiradaNovaFuncao} onValueChange={setRetiradaNovaFuncao}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {funcoes.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Publicação (opcional)</Label>
              <Input value={retiradaPublicacao} onChange={(e) => setRetiradaPublicacao(e.target.value)} placeholder="Ex: Portaria nº 123/2024" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRetiradaDialog(false)}>Cancelar</Button>
            <Button onClick={handleConfirmarRetirada} disabled={loading}>
              {loading ? 'Processando...' : 'Confirmar Retirada'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SituacaoTab;
