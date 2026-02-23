import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, FileText, AlertTriangle, Copy, CalendarCheck, Plus, Loader2, Clock, CheckCircle } from 'lucide-react';
import { collection, getDocs, addDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { useToast } from "@/hooks/use-toast";
import { addDays, format, parseISO } from 'date-fns';
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
}

interface AtestadosMedicosTabProps {
  policiais: Policial[];
  onUpdate: () => void;
}

const AtestadosMedicosTab: React.FC<AtestadosMedicosTabProps> = ({ policiais, onUpdate }) => {
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
      const result = addDays(parseISO(dataInicio), Number(dias));
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
    if (!selectedPolicial || !dataInicio || !dias || !selectedCid) {
      toast({ title: "Erro", description: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const numDias = Number(dias);
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
        cid: selectedCid.codigo,
        cidDescricao: selectedCid.descricao,
        medico,
        crm,
        hospital,
        statusPericia: numDias > 3 ? 'PENDENTE' : 'NAO_PRECISA',
        criadoEm: new Date().toISOString(),
      };

      await addDoc(collection(db, 'atestados_medicos'), atestado);
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
    if (!periciaAtestado || !dataPericia || !horaPericia) {
      toast({ title: "Erro", description: "Preencha data e hora da perícia", variant: "destructive" });
      return;
    }
    try {
      await updateDoc(doc(db, 'atestados_medicos', periciaAtestado.id), {
        statusPericia: 'AGENDADO',
        dataPericia,
        horaPericia,
      });
      toast({ title: "Sucesso", description: "Perícia agendada com sucesso" });
      setShowPericiaDialog(false);
      setPericiaAtestado(null);
      setDataPericia('');
      setHoraPericia('');
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

  const formatDate = (d: string) => {
    if (!d) return 'N/A';
    try { return format(parseISO(d), 'dd/MM/yyyy'); } catch { return d; }
  };

  const pendentesPericia = atestados.filter(a => a.dias > 3 && (a.statusPericia === 'PENDENTE' || a.statusPericia === 'AGENDADO'));

  const filteredAtestados = atestados.filter(a =>
    a.policialNome?.toLowerCase().includes(searchAtestado.toLowerCase()) ||
    a.policialPostGrad?.toLowerCase().includes(searchAtestado.toLowerCase()) ||
    a.cid?.toLowerCase().includes(searchAtestado.toLowerCase())
  );

  const statusBadge = (status: string) => {
    switch (status) {
      case 'NAO_PRECISA': return <Badge variant="secondary">Não precisa</Badge>;
      case 'PENDENTE': return <Badge variant="destructive">Pendente de Perícia</Badge>;
      case 'AGENDADO': return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Agendado</Badge>;
      case 'HOMOLOGADO': return <Badge className="bg-green-600 hover:bg-green-700 text-white">Homologado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cadastro">Cadastro / Lista</TabsTrigger>
              <TabsTrigger value="pendentes" className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                Pendentes de Perícia ({pendentesPericia.length})
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
                    <Label>Localizar Policial (numeral, nome ou nome de guerra)</Label>
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
                    <Label>CID *</Label>
                    <Input
                      placeholder="Digite o código ou descrição do CID..."
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Médico</Label>
                      <Input value={medico} onChange={e => setMedico(e.target.value)} placeholder="Nome do médico" />
                    </div>
                    <div>
                      <Label>CRM</Label>
                      <Input value={crm} onChange={e => setCrm(e.target.value)} placeholder="CRM" />
                    </div>
                    <div>
                      <Label>Hospital</Label>
                      <Input value={hospital} onChange={e => setHospital(e.target.value)} placeholder="Hospital/Clínica" />
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
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar atestados por nome, graduação ou CID..."
                    value={searchAtestado}
                    onChange={e => setSearchAtestado(e.target.value)}
                    className="pl-8"
                  />
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
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAtestados.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center text-muted-foreground">
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
                              <span className="font-mono text-xs">{a.cid}</span>
                              <p className="text-xs text-muted-foreground">{a.cidDescricao}</p>
                            </TableCell>
                            <TableCell>{a.medico || 'N/A'}</TableCell>
                            <TableCell>{a.hospital || 'N/A'}</TableCell>
                            <TableCell>{statusBadge(a.statusPericia)}</TableCell>
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
                                <span className="font-mono text-xs">{a.cid}</span>
                              </TableCell>
                              <TableCell>{statusBadge(a.statusPericia)}</TableCell>
                              <TableCell>
                                {a.statusPericia === 'AGENDADO' && a.dataPericia && (
                                  <span className="text-xs">{formatDate(a.dataPericia)} às {a.horaPericia}</span>
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
            <div>
              <Label>Data da Perícia</Label>
              <Input type="date" value={dataPericia} onChange={e => setDataPericia(e.target.value)} />
            </div>
            <div>
              <Label>Hora da Perícia</Label>
              <Input type="time" value={horaPericia} onChange={e => setHoraPericia(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPericiaDialog(false)}>Cancelar</Button>
            <Button onClick={handleConfirmarPericia}>Confirmar Agendamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AtestadosMedicosTab;
