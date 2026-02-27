import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, FileText, AlertTriangle, Copy, CalendarCheck, Plus, Loader2, Clock, CheckCircle, Trash2, Download, BookOpen, Trophy, ArrowUpDown } from 'lucide-react';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { useToast } from "@/hooks/use-toast";
import { addDays, format, parseISO, getMonth, getYear, subMonths, startOfMonth } from 'date-fns';
import { buscarCid, CidItem } from '@/lib/cidData';

interface Policial {
  id: string;
  NOME?: string;
  'Post/Grad'?: string;
  Matrícula?: string;
  CPF?: string;
  cpf?: string;
  NUMERAL?: string;
  numeral?: string;
  'NOME DE GUERRA'?: string;
  nomeGuerra?: string;
  Unidade?: string;
  unidade?: string;
  [key: string]: any;
}

interface Atestado {
  id: string;
  policialId: string;
  policialNome: string;
  policialPostGrad: string;
  policialMatricula: string;
  policialCpf: string;
  policialNumeral: string;
  dataInicio: string;
  dias: number;
  dataFim: string;
  cid: string;
  cidDescricao: string;
  medico: string;
  crm: string;
  hospital: string;
  statusPericia: 'NAO_PRECISA' | 'PENDENTE' | 'AGENDADO' | 'HOMOLOGADO';
  dataPericia?: string;
  horaPericia?: string;
  criadoEm: string;
  boletimInterno?: string;
  bcgHomologacao?: string;
  periciaDocumental?: boolean;
}

interface RetornoLTS {
  policialId: string;
  policialNome: string;
  policialNomeGuerra: string;
  policialNumeral: string;
  policialMatricula: string;
  cid: string;
  cidDescricao: string;
  dataInicio: string;
  dataFim: string;
}

interface AtestadosMedicosTabProps {
  policiais: Policial[];
  onUpdate: () => void;
  avisoRetornos?: RetornoLTS[];
  onConfirmarAviso?: (policialId: string) => void;
  onConfirmarTodos?: () => void;
}

const MESES = [
  { value: '0', label: 'Janeiro' },
  { value: '1', label: 'Fevereiro' },
  { value: '2', label: 'Março' },
  { value: '3', label: 'Abril' },
  { value: '4', label: 'Maio' },
  { value: '5', label: 'Junho' },
  { value: '6', label: 'Julho' },
  { value: '7', label: 'Agosto' },
  { value: '8', label: 'Setembro' },
  { value: '9', label: 'Outubro' },
  { value: '10', label: 'Novembro' },
  { value: '11', label: 'Dezembro' },
];

const AtestadosMedicosTab: React.FC<AtestadosMedicosTabProps> = ({ policiais, onUpdate, avisoRetornos = [], onConfirmarAviso, onConfirmarTodos }) => {
  const [showAvisoModal, setShowAvisoModal] = useState(false);
  const [atestados, setAtestados] = useState<Atestado[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState('cadastro');
  const [searchPolicial, setSearchPolicial] = useState('');
  const [selectedPolicial, setSelectedPolicial] = useState<Policial | null>(null);
  const [showResultados, setShowResultados] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchAtestado, setSearchAtestado] = useState('');

  // Form fields
  const [dataInicio, setDataInicio] = useState('');
  const [dias, setDias] = useState('');
  const [cidSearch, setCidSearch] = useState('');
  const [selectedCid, setSelectedCid] = useState<CidItem | null>(null);
  const [showCidResults, setShowCidResults] = useState(false);
  const [medico, setMedico] = useState('');
  const [crm, setCrm] = useState('');
  const [hospital, setHospital] = useState('');

  // Dialog perícia
  const [showPericiaDialog, setShowPericiaDialog] = useState(false);
  const [periciaAtestado, setPericiaAtestado] = useState<Atestado | null>(null);
  const [dataPericia, setDataPericia] = useState('');
  const [horaPericia, setHoraPericia] = useState('');
  const [periciaDocumental, setPericiaDocumental] = useState(false);

  // Dialog BI
  const [showBIDialog, setShowBIDialog] = useState(false);
  const [biAtestado, setBiAtestado] = useState<Atestado | null>(null);
  const [boletimInternoInput, setBoletimInternoInput] = useState('');

  // Dialog BCG
  const [showBCGDialog, setShowBCGDialog] = useState(false);
  const [bcgAtestado, setBcgAtestado] = useState<Atestado | null>(null);
  const [bcgInput, setBcgInput] = useState('');

  // Filtros
  const [filtroPolicial, setFiltroPolicial] = useState('todos');
  const [filtroMes, setFiltroMes] = useState('todos');
  const [filtroAno, setFiltroAno] = useState('todos');
  const [filtroDe, setFiltroDe] = useState('');
  const [filtroAte, setFiltroAte] = useState('');
  const [rankingPeriodo, setRankingPeriodo] = useState('geral');
  const [rankingOrdem, setRankingOrdem] = useState<'dias' | 'qtd'>('dias');

  const { toast } = useToast();

  useEffect(() => {
    fetchAtestados();
  }, []);

  const fetchAtestados = async () => {
    try {
      setLoading(true);
      const ref = collection(db, 'atestados_medicos');
      let snapshot;
      try {
        const q = query(ref, orderBy('criadoEm', 'desc'));
        snapshot = await getDocs(q);
      } catch {
        snapshot = await getDocs(ref);
      }
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Atestado[];
      setAtestados(data);
    } catch (error) {
      console.error('Erro ao buscar atestados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Buscar policial
  const resultadosBusca = useMemo(() => {
    if (searchPolicial.length < 2) return [];
    const term = searchPolicial.toLowerCase();
    return policiais.filter(p =>
      (p.NOME || '').toLowerCase().includes(term) ||
      (p['NOME DE GUERRA'] || p.nomeGuerra || '').toLowerCase().includes(term) ||
      String(p.NUMERAL || p.numeral || '').includes(term)
    ).slice(0, 10);
  }, [searchPolicial, policiais]);

  // CID autocomplete
  const cidResults = useMemo(() => {
    if (cidSearch.length < 1) return [];
    return buscarCid(cidSearch);
  }, [cidSearch]);

  // Data fim calculada
  const dataFimCalculada = useMemo(() => {
    if (!dataInicio || !dias || isNaN(Number(dias))) return '';
    try {
      const result = addDays(parseISO(dataInicio), Number(dias) - 1);
      return format(result, 'yyyy-MM-dd');
    } catch {
      return '';
    }
  }, [dataInicio, dias]);

  const getCpf = (p: Policial) => p.CPF || p.cpf || '';
  const getNumeral = (p: Policial) => String(p.NUMERAL || p.numeral || '');

  const selecionarPolicial = (p: Policial) => {
    setSelectedPolicial(p);
    setShowResultados(false);
    setSearchPolicial(`${p['Post/Grad'] || ''} ${p.NOME || ''}`);
  };

  const limparForm = () => {
    setSelectedPolicial(null);
    setSearchPolicial('');
    setDataInicio('');
    setDias('');
    setCidSearch('');
    setSelectedCid(null);
    setMedico('');
    setCrm('');
    setHospital('');
  };

  const handleSalvar = async () => {
    if (!selectedPolicial || !dataInicio || !dias) {
      toast({ title: "Erro", description: "Preencha policial, data início e quantidade de dias", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const numDias = Number(dias);
      const cidCodigo = selectedCid ? selectedCid.codigo : cidSearch.trim();
      const cidDesc = selectedCid ? selectedCid.descricao : '';
      const atestado = {
        policialId: selectedPolicial.id,
        policialNome: selectedPolicial.NOME || '',
        policialPostGrad: selectedPolicial['Post/Grad'] || '',
        policialMatricula: selectedPolicial.Matrícula || '',
        policialCpf: getCpf(selectedPolicial),
        policialNumeral: getNumeral(selectedPolicial),
        dataInicio,
        dias: numDias,
        dataFim: dataFimCalculada,
        cid: cidCodigo,
        cidDescricao: cidDesc,
        medico,
        crm,
        hospital,
        statusPericia: numDias > 3 ? 'PENDENTE' : 'NAO_PRECISA',
        criadoEm: new Date().toISOString(),
      };

      await addDoc(collection(db, 'atestados_medicos'), atestado);

      // Auto-LTS: se dias > 3, colocar policial em LTS automaticamente
      if (numDias > 3) {
        try {
          const policialRef = doc(db, 'policiais', selectedPolicial.id);
          await updateDoc(policialRef, {
            SITUAÇÃO: 'LICENÇA TRATAMENTO DE SAUDE',
            inicioSituacao: dataInicio,
            fimSituacao: dataFimCalculada,
            funcaoOrigem: selectedPolicial['FUNÇÃO'] || selectedPolicial['funcao'] || '',
          });
          await addDoc(collection(db, 'assentamentos'), {
            policialId: selectedPolicial.id,
            tipo: 'mudanca_situacao',
            descricao: `Entrada automática em LTS - Atestado de ${numDias} dias (CID: ${cidCodigo || 'N/I'})`,
            situacaoAnterior: selectedPolicial.SITUAÇÃO || selectedPolicial['situacao'] || 'EM ATIVIDADE',
            situacaoNova: 'LICENÇA TRATAMENTO DE SAUDE',
            funcaoAnterior: selectedPolicial['FUNÇÃO'] || '',
            data: new Date().toISOString(),
            automatico: true,
          });
          toast({ title: "LTS Automático", description: `${selectedPolicial.NOME} foi colocado em LTS automaticamente` });
        } catch (e) {
          console.error('Erro ao atualizar LTS automático:', e);
        }
        onUpdate();
      }

      toast({ title: "Sucesso", description: "Atestado cadastrado com sucesso" });
      limparForm();
      fetchAtestados();
    } catch (error) {
      console.error('Erro ao salvar atestado:', error);
      toast({ title: "Erro", description: "Erro ao salvar atestado", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCopiarCpf = (cpf: string) => {
    navigator.clipboard.writeText(cpf);
    toast({ title: "CPF copiado!", description: cpf });
  };

  const handleConfirmarPericia = async () => {
    if (!periciaAtestado) return;
    if (!periciaDocumental && (!dataPericia || !horaPericia)) {
      toast({ title: "Erro", description: "Preencha data e hora da perícia", variant: "destructive" });
      return;
    }
    try {
      const updateData: any = {
        statusPericia: 'AGENDADO',
        periciaDocumental,
      };
      if (periciaDocumental) {
        updateData.dataPericia = '';
        updateData.horaPericia = '';
      } else {
        updateData.dataPericia = dataPericia;
        updateData.horaPericia = horaPericia;
      }
      await updateDoc(doc(db, 'atestados_medicos', periciaAtestado.id), updateData);
      toast({ title: "Sucesso", description: periciaDocumental ? "Perícia documental registrada" : "Perícia agendada com sucesso" });
      setShowPericiaDialog(false);
      setPericiaAtestado(null);
      setDataPericia('');
      setHoraPericia('');
      setPericiaDocumental(false);
      fetchAtestados();
    } catch (error) {
      console.error('Erro ao agendar perícia:', error);
      toast({ title: "Erro", description: "Erro ao agendar perícia", variant: "destructive" });
    }
  };

  const handleHomologar = async (atestado: Atestado) => {
    try {
      await updateDoc(doc(db, 'atestados_medicos', atestado.id), { statusPericia: 'HOMOLOGADO' });
      toast({ title: "Sucesso", description: "Perícia homologada" });
      fetchAtestados();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao homologar", variant: "destructive" });
    }
  };

  const handleSalvarBI = async () => {
    if (!biAtestado || !boletimInternoInput.trim()) {
      toast({ title: "Erro", description: "Preencha o número do Boletim Interno", variant: "destructive" });
      return;
    }
    try {
      await updateDoc(doc(db, 'atestados_medicos', biAtestado.id), { boletimInterno: boletimInternoInput.trim() });
      toast({ title: "Sucesso", description: "Boletim Interno registrado" });
      setShowBIDialog(false);
      setBiAtestado(null);
      setBoletimInternoInput('');
      fetchAtestados();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao salvar BI", variant: "destructive" });
    }
  };

  const handleSalvarBCG = async () => {
    if (!bcgAtestado || !bcgInput.trim()) {
      toast({ title: "Erro", description: "Preencha o número do BCG", variant: "destructive" });
      return;
    }
    try {
      await updateDoc(doc(db, 'atestados_medicos', bcgAtestado.id), { bcgHomologacao: bcgInput.trim() });
      toast({ title: "Sucesso", description: "BCG de homologação registrado" });
      setShowBCGDialog(false);
      setBcgAtestado(null);
      setBcgInput('');
      fetchAtestados();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao salvar BCG", variant: "destructive" });
    }
  };

  const handleExcluir = async (atestado: Atestado) => {
    if (!confirm(`Excluir atestado de ${atestado.policialNome}${atestado.cid ? ` (CID: ${atestado.cid})` : ''}?`)) return;
    try {
      await deleteDoc(doc(db, 'atestados_medicos', atestado.id));
      toast({ title: "Sucesso", description: "Atestado excluído com sucesso" });
      fetchAtestados();
    } catch (error) {
      console.error('Erro ao excluir atestado:', error);
      toast({ title: "Erro", description: "Erro ao excluir atestado", variant: "destructive" });
    }
  };

  const formatDate = (d: string) => {
    if (!d) return 'N/A';
    try { return format(parseISO(d), 'dd/MM/yyyy'); } catch { return d; }
  };

  const pendentesPericia = atestados.filter(a => a.dias > 3 && (a.statusPericia === 'PENDENTE' || a.statusPericia === 'AGENDADO' || a.statusPericia === 'HOMOLOGADO'));

  // Anos disponíveis nos atestados
  const anosDisponiveis = useMemo(() => {
    const anos = new Set<number>();
    atestados.forEach(a => {
      if (a.dataInicio) {
        try { anos.add(getYear(parseISO(a.dataInicio))); } catch {}
      }
    });
    return Array.from(anos).sort((a, b) => b - a);
  }, [atestados]);

  // Policiais únicos nos atestados
  const policiaisUnicos = useMemo(() => {
    const nomes = new Map<string, string>();
    atestados.forEach(a => {
      if (a.policialNome && !nomes.has(a.policialId)) {
        nomes.set(a.policialId, `${a.policialPostGrad} ${a.policialNome}`);
      }
    });
    return Array.from(nomes.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [atestados]);

  // Filtrar atestados
  const filteredAtestados = useMemo(() => {
    return atestados.filter(a => {
      if (searchAtestado) {
        const term = searchAtestado.toLowerCase();
        const match = a.policialNome?.toLowerCase().includes(term) ||
          a.policialPostGrad?.toLowerCase().includes(term) ||
          a.cid?.toLowerCase().includes(term);
        if (!match) return false;
      }
      if (filtroPolicial !== 'todos' && a.policialId !== filtroPolicial) return false;
      if (filtroMes !== 'todos' && a.dataInicio) {
        try {
          if (getMonth(parseISO(a.dataInicio)) !== Number(filtroMes)) return false;
        } catch { return false; }
      }
      if (filtroAno !== 'todos' && a.dataInicio) {
        try {
          if (getYear(parseISO(a.dataInicio)) !== Number(filtroAno)) return false;
        } catch { return false; }
      }
      if (filtroDe && a.dataInicio && a.dataInicio < filtroDe) return false;
      if (filtroAte && a.dataInicio && a.dataInicio > filtroAte) return false;
      return true;
    }).sort((a, b) => {
      if (!a.dataInicio || !b.dataInicio) return 0;
      return b.dataInicio.localeCompare(a.dataInicio);
    });
  }, [atestados, searchAtestado, filtroPolicial, filtroMes, filtroAno, filtroDe, filtroAte]);

  // Exportar CSV
  const handleExportarCSV = () => {
    const headers = ['Policial', 'Post/Grad', 'Matrícula', 'Data Início', 'Dias', 'Data Fim', 'CID', 'Descrição CID', 'Médico', 'CRM', 'Hospital', 'Status Perícia', 'Boletim Interno'];
    const rows = filteredAtestados.map(a => [
      a.policialNome,
      a.policialPostGrad,
      a.policialMatricula,
      formatDate(a.dataInicio),
      a.dias,
      formatDate(a.dataFim),
      a.cid || '',
      a.cidDescricao || '',
      a.medico || '',
      a.crm || '',
      a.hospital || '',
      a.statusPericia === 'NAO_PRECISA' ? 'Não precisa' : a.statusPericia === 'PENDENTE' ? 'Pendente' : a.statusPericia === 'AGENDADO' ? 'Agendado' : 'Homologado',
      a.boletimInterno || '',
    ]);

    const csvContent = '\uFEFF' + [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `atestados_medicos_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exportado!", description: `${filteredAtestados.length} atestados exportados` });
  };

  // Ranking computation
  const rankingData = useMemo(() => {
    const now = new Date();
    let dataLimite: Date | null = null;
    if (rankingPeriodo === 'mes') dataLimite = startOfMonth(now);
    else if (rankingPeriodo === '3meses') dataLimite = subMonths(now, 3);
    else if (rankingPeriodo === '6meses') dataLimite = subMonths(now, 6);
    else if (rankingPeriodo === '1ano') dataLimite = subMonths(now, 12);

    const filtrados = dataLimite
      ? atestados.filter(a => a.dataInicio && a.dataInicio >= format(dataLimite!, 'yyyy-MM-dd'))
      : atestados;

    const mapa = new Map<string, { nome: string, postGrad: string, qtd: number, dias: number }>();
    filtrados.forEach(a => {
      const key = a.policialId;
      const cur = mapa.get(key) || { nome: a.policialNome, postGrad: a.policialPostGrad, qtd: 0, dias: 0 };
      cur.qtd += 1;
      cur.dias += a.dias || 0;
      mapa.set(key, cur);
    });

    return Array.from(mapa.values()).sort((a, b) => 
      rankingOrdem === 'dias' ? (b.dias - a.dias || b.qtd - a.qtd) : (b.qtd - a.qtd || b.dias - a.dias)
    );
  }, [atestados, rankingPeriodo, rankingOrdem]);

  const statusBadge = (status: string) => {
    switch (status) {
      case 'NAO_PRECISA': return <Badge variant="secondary">Não precisa</Badge>;
      case 'PENDENTE': return <Badge variant="destructive">Pendente de Perícia</Badge>;
      case 'AGENDADO': return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Agendado</Badge>;
      case 'HOMOLOGADO': return <Badge className="bg-green-600 hover:bg-green-700 text-white">Homologado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Mostrar modal de aviso quando há retornos
  useEffect(() => {
    if (avisoRetornos.length > 0) {
      setShowAvisoModal(true);
    }
  }, [avisoRetornos]);

  const formatDateSimple = (d: string) => {
    if (!d) return '-';
    try { return format(parseISO(d), 'dd/MM/yyyy'); } catch { return d; }
  };

  return (
    <div className="space-y-6">
      {/* Modal de aviso de retornos de LTS */}
      <Dialog open={showAvisoModal && avisoRetornos.length > 0} onOpenChange={setShowAvisoModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Policiais que retornaram de LTS automaticamente
            </DialogTitle>
            <DialogDescription>
              Os policiais abaixo tiveram seus atestados vencidos e foram retornados automaticamente para "EM ATIVIDADE". Confirme a leitura de cada um.
            </DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome de Guerra</TableHead>
                <TableHead>Numeral</TableHead>
                <TableHead>Matrícula</TableHead>
                <TableHead>CID</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Fim</TableHead>
                <TableHead>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {avisoRetornos.map(r => (
                <TableRow key={r.policialId}>
                  <TableCell className="font-medium">{r.policialNomeGuerra}</TableCell>
                  <TableCell>{r.policialNumeral || '-'}</TableCell>
                  <TableCell>{r.policialMatricula || '-'}</TableCell>
                  <TableCell>
                    <span className="font-mono text-xs">{r.cid || '-'}</span>
                    {r.cidDescricao && <span className="block text-xs text-muted-foreground">{r.cidDescricao}</span>}
                  </TableCell>
                  <TableCell>{formatDateSimple(r.dataInicio)}</TableCell>
                  <TableCell>{formatDateSimple(r.dataFim)}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => onConfirmarAviso?.(r.policialId)}>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Confirmar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <DialogFooter>
            <Button onClick={() => { onConfirmarTodos?.(); setShowAvisoModal(false); }}>
              Confirmar Todos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Atestados Médicos
          </CardTitle>
          <CardDescription>Cadastro e controle de atestados médicos do efetivo</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={subTab} onValueChange={setSubTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="cadastro">Cadastro / Lista</TabsTrigger>
              <TabsTrigger value="pendentes" className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                Pendentes ({pendentesPericia.length})
              </TabsTrigger>
              <TabsTrigger value="ranking" className="flex items-center gap-1">
                <Trophy className="h-4 w-4" />
                Ranking
              </TabsTrigger>
            </TabsList>

            {/* CADASTRO / LISTA */}
            <TabsContent value="cadastro" className="space-y-6">
              {/* Formulário de cadastro */}
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Novo Atestado
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Busca de policial */}
                  <div className="relative">
                    <Label>Localizar Policial (numeral, nome ou nome de guerra) *</Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Digite o numeral, nome ou nome de guerra..."
                        value={searchPolicial}
                        onChange={(e) => {
                          setSearchPolicial(e.target.value);
                          setShowResultados(true);
                          if (selectedPolicial) setSelectedPolicial(null);
                        }}
                        className="pl-8"
                      />
                    </div>
                    {showResultados && resultadosBusca.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {resultadosBusca.map(p => (
                          <button
                            key={p.id}
                            className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                            onClick={() => selecionarPolicial(p)}
                          >
                            <span className="font-medium">{p['Post/Grad']}</span> {p.NOME}
                            <span className="text-muted-foreground ml-2">
                              (Num: {p.NUMERAL || p.numeral || 'N/A'})
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Dados do policial selecionado */}
                  {selectedPolicial && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-muted rounded-lg text-sm">
                      <div><span className="font-semibold">Numeral:</span> {getNumeral(selectedPolicial)}</div>
                      <div><span className="font-semibold">Post/Grad:</span> {selectedPolicial['Post/Grad']}</div>
                      <div><span className="font-semibold">Matrícula:</span> {selectedPolicial.Matrícula || 'N/A'}</div>
                      <div><span className="font-semibold">CPF:</span> {getCpf(selectedPolicial) || 'N/A'}</div>
                    </div>
                  )}

                  {/* Campos do atestado */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Data Início *</Label>
                      <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
                    </div>
                    <div>
                      <Label>Quantidade de Dias *</Label>
                      <Input type="number" min="1" value={dias} onChange={e => setDias(e.target.value)} placeholder="Ex: 5" />
                    </div>
                    <div>
                      <Label>Data Fim (calculada)</Label>
                      <Input value={dataFimCalculada ? formatDate(dataFimCalculada) : ''} disabled className="bg-muted" />
                    </div>
                  </div>

                  {Number(dias) > 3 && (
                    <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-amber-800 text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      Atestado com mais de 3 dias — será encaminhado para perícia
                    </div>
                  )}

                  {/* CID */}
                  <div className="relative">
                    <Label>CID</Label>
                    <Input
                      placeholder="Digite o código ou descrição do CID (opcional)..."
                      value={selectedCid ? `${selectedCid.codigo} - ${selectedCid.descricao}` : cidSearch}
                      onChange={e => {
                        setCidSearch(e.target.value);
                        setSelectedCid(null);
                        setShowCidResults(true);
                      }}
                    />
                    {showCidResults && cidResults.length > 0 && !selectedCid && (
                      <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {cidResults.map(cid => (
                          <button
                            key={cid.codigo}
                            className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                            onClick={() => {
                              setSelectedCid(cid);
                              setShowCidResults(false);
                            }}
                          >
                            <span className="font-medium">{cid.codigo}</span> — {cid.descricao}
                          </button>
                        ))}
                      </div>
                    )}
                    {cidSearch && !selectedCid && cidResults.length === 0 && cidSearch.length >= 2 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        CID "{cidSearch}" não encontrado na lista, mas será salvo como digitado
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Médico</Label>
                      <Input value={medico} onChange={e => setMedico(e.target.value)} placeholder="Nome do médico (opcional)" />
                    </div>
                    <div>
                      <Label>CRM</Label>
                      <Input value={crm} onChange={e => setCrm(e.target.value)} placeholder="CRM (opcional)" />
                    </div>
                    <div>
                      <Label>Hospital</Label>
                      <Input value={hospital} onChange={e => setHospital(e.target.value)} placeholder="Hospital/Clínica (opcional)" />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={limparForm}>Limpar</Button>
                    <Button onClick={handleSalvar} disabled={saving || !selectedPolicial}>
                      {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : 'Cadastrar Atestado'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Lista de atestados */}
              <div className="space-y-4">
                {/* Filtros */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                  <div className="relative lg:col-span-2">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome, graduação ou CID..."
                      value={searchAtestado}
                      onChange={e => setSearchAtestado(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Select value={filtroPolicial} onValueChange={setFiltroPolicial}>
                    <SelectTrigger>
                      <SelectValue placeholder="Policial" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os policiais</SelectItem>
                      {policiaisUnicos.map(([id, nome]) => (
                        <SelectItem key={id} value={id}>{nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filtroMes} onValueChange={setFiltroMes}>
                    <SelectTrigger>
                      <SelectValue placeholder="Mês" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os meses</SelectItem>
                      {MESES.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filtroAno} onValueChange={setFiltroAno}>
                    <SelectTrigger>
                      <SelectValue placeholder="Ano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os anos</SelectItem>
                      {anosDisponiveis.map(a => (
                        <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={handleExportarCSV} className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Exportar CSV
                  </Button>
                </div>

                {/* Filtro por período */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm whitespace-nowrap">De:</Label>
                    <Input type="date" value={filtroDe} onChange={e => setFiltroDe(e.target.value)} className="w-40" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm whitespace-nowrap">Até:</Label>
                    <Input type="date" value={filtroAte} onChange={e => setFiltroAte(e.target.value)} className="w-40" />
                  </div>
                  {(filtroDe || filtroAte || filtroPolicial !== 'todos' || filtroMes !== 'todos' || filtroAno !== 'todos') && (
                    <Button variant="ghost" size="sm" onClick={() => {
                      setFiltroDe('');
                      setFiltroAte('');
                      setFiltroPolicial('todos');
                      setFiltroMes('todos');
                      setFiltroAno('todos');
                      setSearchAtestado('');
                    }}>
                      Limpar filtros
                    </Button>
                  )}
                  <span className="text-sm text-muted-foreground ml-auto">
                    {filteredAtestados.length} atestado(s)
                  </span>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    Carregando...
                  </div>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Policial</TableHead>
                          <TableHead>Post/Grad</TableHead>
                          <TableHead>Data Início</TableHead>
                          <TableHead>Dias</TableHead>
                          <TableHead>Data Fim</TableHead>
                          <TableHead>CID</TableHead>
                          <TableHead>Médico</TableHead>
                          <TableHead>Hospital</TableHead>
                          <TableHead>Status Perícia</TableHead>
                          <TableHead>BI</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAtestados.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={11} className="text-center text-muted-foreground">
                              Nenhum atestado encontrado
                            </TableCell>
                          </TableRow>
                        ) : filteredAtestados.map(a => (
                          <TableRow key={a.id}>
                            <TableCell className="font-medium">{a.policialNome}</TableCell>
                            <TableCell>{a.policialPostGrad}</TableCell>
                            <TableCell>{formatDate(a.dataInicio)}</TableCell>
                            <TableCell>{a.dias}</TableCell>
                            <TableCell>{formatDate(a.dataFim)}</TableCell>
                            <TableCell>
                              {a.cid ? (
                                <>
                                  <span className="font-mono text-xs">{a.cid}</span>
                                  {a.cidDescricao && <p className="text-xs text-muted-foreground">{a.cidDescricao}</p>}
                                </>
                              ) : (
                                <span className="text-xs text-muted-foreground">N/A</span>
                              )}
                            </TableCell>
                            <TableCell>{a.medico || 'N/A'}</TableCell>
                            <TableCell>{a.hospital || 'N/A'}</TableCell>
                            <TableCell>{statusBadge(a.statusPericia)}</TableCell>
                            <TableCell>
                              {a.boletimInterno ? (
                                <span className="text-xs font-mono">{a.boletimInterno}</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Registrar Boletim Interno" onClick={() => {
                                  setBiAtestado(a);
                                  setBoletimInternoInput(a.boletimInterno || '');
                                  setShowBIDialog(true);
                                }}>
                                  <BookOpen className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleExcluir(a)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* PENDENTES DE PERÍCIA */}
            <TabsContent value="pendentes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Atestados Pendentes de Perícia (mais de 3 dias)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pendentesPericia.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">Nenhum atestado pendente de perícia</p>
                  ) : (
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                         <TableRow>
                            <TableHead>Policial</TableHead>
                            <TableHead>Post/Grad</TableHead>
                            <TableHead>CPF</TableHead>
                            <TableHead>Data Início</TableHead>
                            <TableHead>Dias</TableHead>
                            <TableHead>CID</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Perícia</TableHead>
                            <TableHead>BCG</TableHead>
                            <TableHead>Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendentesPericia.map(a => (
                            <TableRow key={a.id}>
                              <TableCell className="font-medium">{a.policialNome}</TableCell>
                              <TableCell>{a.policialPostGrad}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <span className="font-mono text-xs">{a.policialCpf || 'N/A'}</span>
                                  {a.policialCpf && (
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleCopiarCpf(a.policialCpf)}>
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{formatDate(a.dataInicio)}</TableCell>
                              <TableCell>{a.dias}</TableCell>
                              <TableCell>
                                <span className="font-mono text-xs">{a.cid || 'N/A'}</span>
                              </TableCell>
                              <TableCell>{statusBadge(a.statusPericia)}</TableCell>
                              <TableCell>
                                {a.statusPericia === 'AGENDADO' && a.periciaDocumental && (
                                  <span className="text-xs font-medium text-muted-foreground">Documental</span>
                                )}
                                {a.statusPericia === 'AGENDADO' && !a.periciaDocumental && a.dataPericia && (
                                  <span className="text-xs">{formatDate(a.dataPericia)} às {a.horaPericia}</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {a.bcgHomologacao ? (
                                  <span className="text-xs font-mono">{a.bcgHomologacao}</span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  {a.statusPericia === 'PENDENTE' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setPericiaAtestado(a);
                                        setShowPericiaDialog(true);
                                      }}
                                    >
                                      <CalendarCheck className="h-4 w-4 mr-1" />
                                      Agendar
                                    </Button>
                                  )}
                                  {a.statusPericia === 'AGENDADO' && (
                                    <Button size="sm" variant="outline" onClick={() => handleHomologar(a)}>
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Homologar
                                    </Button>
                                  )}
                                  {(a.statusPericia === 'HOMOLOGADO' || a.statusPericia === 'AGENDADO') && (
                                    <Button size="sm" variant="outline" title="Registrar BCG" onClick={() => {
                                      setBcgAtestado(a);
                                      setBcgInput(a.bcgHomologacao || '');
                                      setShowBCGDialog(true);
                                    }}>
                                      <BookOpen className="h-4 w-4 mr-1" />
                                      BCG
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* RANKING */}
            <TabsContent value="ranking" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    Ranking de Atestados
                  </CardTitle>
                  <CardDescription>Policiais com mais atestados e dias de licença</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { value: 'mes', label: 'Mês Atual' },
                      { value: '3meses', label: 'Últimos 3 Meses' },
                      { value: '6meses', label: 'Últimos 6 Meses' },
                      { value: '1ano', label: 'Último Ano' },
                      { value: 'geral', label: 'Geral' },
                    ].map(p => (
                      <Button
                        key={p.value}
                        variant={rankingPeriodo === p.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setRankingPeriodo(p.value)}
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => {
                      const periodoLabel = { mes: 'Mes_Atual', '3meses': '3_Meses', '6meses': '6_Meses', '1ano': '1_Ano', geral: 'Geral' }[rankingPeriodo] || 'Geral';
                      const bom = '\uFEFF';
                      const headers = ['#', 'Post/Grad', 'Policial', 'Atestados', 'Total de Dias'];
                      const rows = rankingData.map((r, idx) => [idx + 1, r.postGrad, r.nome, r.qtd, r.dias].join(';'));
                      const csv = bom + [headers.join(';'), ...rows].join('\n');
                      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url; a.download = `ranking_atestados_${periodoLabel}.csv`; a.click();
                      URL.revokeObjectURL(url);
                    }}>
                      <Download className="h-4 w-4 mr-1" /> Exportar
                    </Button>
                  </div>

                  {rankingData.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Nenhum atestado encontrado para o período selecionado.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Post/Grad</TableHead>
                            <TableHead>Policial</TableHead>
                            <TableHead className="text-center cursor-pointer select-none" onClick={() => setRankingOrdem('qtd')}>
                              <span className="inline-flex items-center gap-1">
                                Atestados <ArrowUpDown className="h-3 w-3" />
                                {rankingOrdem === 'qtd' && <span className="text-primary">●</span>}
                              </span>
                            </TableHead>
                            <TableHead className="text-center cursor-pointer select-none" onClick={() => setRankingOrdem('dias')}>
                              <span className="inline-flex items-center gap-1">
                                Total de Dias <ArrowUpDown className="h-3 w-3" />
                                {rankingOrdem === 'dias' && <span className="text-primary">●</span>}
                              </span>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rankingData.map((r, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-bold">
                                {idx < 3 ? (
                                  <Badge variant={idx === 0 ? 'destructive' : 'secondary'}>
                                    {idx + 1}º
                                  </Badge>
                                ) : (
                                  `${idx + 1}º`
                                )}
                              </TableCell>
                              <TableCell>{r.postGrad}</TableCell>
                              <TableCell className="font-medium">{r.nome}</TableCell>
                              <TableCell className="text-center font-semibold">{r.qtd}</TableCell>
                              <TableCell className="text-center font-semibold">{r.dias}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialog Agendar Perícia */}
      <Dialog open={showPericiaDialog} onOpenChange={setShowPericiaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendar Perícia Médica</DialogTitle>
            <DialogDescription>
              {periciaAtestado && `${periciaAtestado.policialPostGrad} ${periciaAtestado.policialNome}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="periciaDocumental"
                checked={periciaDocumental}
                onCheckedChange={(checked) => {
                  setPericiaDocumental(!!checked);
                  if (checked) { setDataPericia(''); setHoraPericia(''); }
                }}
              />
              <Label htmlFor="periciaDocumental">Perícia Documental (online, sem agendamento)</Label>
            </div>
            <div>
              <Label>Data da Perícia</Label>
              <Input type="date" value={dataPericia} onChange={e => setDataPericia(e.target.value)} disabled={periciaDocumental} />
            </div>
            <div>
              <Label>Hora da Perícia</Label>
              <Input type="time" value={horaPericia} onChange={e => setHoraPericia(e.target.value)} disabled={periciaDocumental} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPericiaDialog(false)}>Cancelar</Button>
            <Button onClick={handleConfirmarPericia}>Confirmar Agendamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Boletim Interno */}
      <Dialog open={showBIDialog} onOpenChange={setShowBIDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Boletim Interno</DialogTitle>
            <DialogDescription>
              {biAtestado && `${biAtestado.policialPostGrad} ${biAtestado.policialNome} — ${formatDate(biAtestado.dataInicio)}`}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Número do Boletim Interno</Label>
            <Input value={boletimInternoInput} onChange={e => setBoletimInternoInput(e.target.value)} placeholder="Ex: BI nº 045/2026" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBIDialog(false)}>Cancelar</Button>
            <Button onClick={handleSalvarBI}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog BCG Homologação */}
      <Dialog open={showBCGDialog} onOpenChange={setShowBCGDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar BCG de Homologação</DialogTitle>
            <DialogDescription>
              {bcgAtestado && `${bcgAtestado.policialPostGrad} ${bcgAtestado.policialNome} — ${formatDate(bcgAtestado.dataInicio)}`}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Número do BCG</Label>
            <Input value={bcgInput} onChange={e => setBcgInput(e.target.value)} placeholder="Ex: BCG nº 123/2026" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBCGDialog(false)}>Cancelar</Button>
            <Button onClick={handleSalvarBCG}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AtestadosMedicosTab;
