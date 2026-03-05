import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, orderBy, query, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, FileText, Upload, XCircle, CheckCircle, Clock, Ban, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

interface ProcessoPneu {
  id: string;
  status: 'solicitado' | 'aprovado' | 'finalizado' | 'negado';
  nup: string;
  kmAtual: number;
  quantidadePneus: number;
  anexoLaudo_url: string | null;
  dataSolicitacao: any;
  origem: 'COLOG' | 'OFICINA' | null;
  nomeOficina: string | null;
  referenciaPneus: string | null;
  dataAprovacao: any;
  numeroOS: string | null;
  anexoOS_url: string | null;
  pneusRecebidosColog: boolean;
  dataConclusao: any;
  motivoNegacao: string | null;
  dataNegacao: any;
  criadoEm: any;
}

interface ProcessosPneusSectionProps {
  viaturaId: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  solicitado: { label: 'Solicitado', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock },
  aprovado: { label: 'Aprovado', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: CheckCircle },
  finalizado: { label: 'Finalizado', color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle },
  negado: { label: 'Negado', color: 'bg-red-100 text-red-800 border-red-300', icon: Ban },
};

const ProcessosPneusSection = ({ viaturaId }: ProcessosPneusSectionProps) => {
  const [processos, setProcessos] = useState<ProcessoPneu[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNovoForm, setShowNovoForm] = useState(false);
  const [processoSelecionado, setProcessoSelecionado] = useState<ProcessoPneu | null>(null);
  const [showNegadoDialog, setShowNegadoDialog] = useState(false);
  const [motivoNegacao, setMotivoNegacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const { toast } = useToast();

  // Form Etapa 1
  const [nup, setNup] = useState('');
  const [kmAtual, setKmAtual] = useState('');
  const [quantidadePneus, setQuantidadePneus] = useState('');
  const [arquivoLaudo, setArquivoLaudo] = useState<File | null>(null);

  // Form Etapa 2
  const [origem, setOrigem] = useState<'COLOG' | 'OFICINA' | ''>('');
  const [nomeOficina, setNomeOficina] = useState('');
  const [referenciaPneus, setReferenciaPneus] = useState('');

  // Form Etapa 3
  const [numeroOS, setNumeroOS] = useState('');
  const [arquivoOS, setArquivoOS] = useState<File | null>(null);
  const [pneusRecebidosColog, setPneusRecebidosColog] = useState(false);

  useEffect(() => {
    if (viaturaId) fetchProcessos();
  }, [viaturaId]);

  const fetchProcessos = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'frota', viaturaId, 'processos_pneus'),
        orderBy('criadoEm', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as ProcessoPneu[];
      setProcessos(data);
    } catch (error) {
      console.error('Erro ao buscar processos de pneus:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadArquivo = async (file: File, processoId: string, tipo: string): Promise<string> => {
    const path = `processos_pneus/${viaturaId}/${processoId}/${tipo}_${file.name}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };

  const handleNovaSolicitacao = async () => {
    if (!nup || !kmAtual || !quantidadePneus) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha NUP, KM atual e quantidade de pneus.', variant: 'destructive' });
      return;
    }
    setSalvando(true);
    try {
      const novoProcesso: any = {
        status: 'solicitado',
        nup,
        kmAtual: Number(kmAtual),
        quantidadePneus: Number(quantidadePneus),
        anexoLaudo_url: null,
        dataSolicitacao: Timestamp.now(),
        origem: null,
        nomeOficina: null,
        referenciaPneus: null,
        dataAprovacao: null,
        numeroOS: null,
        anexoOS_url: null,
        pneusRecebidosColog: false,
        dataConclusao: null,
        motivoNegacao: null,
        dataNegacao: null,
        criadoEm: Timestamp.now(),
        criadoPor: 'usuario',
      };

      const docRef = await addDoc(collection(db, 'frota', viaturaId, 'processos_pneus'), novoProcesso);

      if (arquivoLaudo) {
        const url = await uploadArquivo(arquivoLaudo, docRef.id, 'laudo');
        await updateDoc(doc(db, 'frota', viaturaId, 'processos_pneus', docRef.id), { anexoLaudo_url: url });
      }

      toast({ title: 'Solicitação criada', description: `Processo NUP ${nup} criado com sucesso.` });
      resetForm();
      setShowNovoForm(false);
      fetchProcessos();
    } catch (error) {
      console.error('Erro ao criar solicitação:', error);
      toast({ title: 'Erro', description: 'Erro ao criar a solicitação.', variant: 'destructive' });
    } finally {
      setSalvando(false);
    }
  };

  const handleAprovacao = async () => {
    if (!processoSelecionado || !origem) {
      toast({ title: 'Campos obrigatórios', description: 'Informe a origem dos pneus.', variant: 'destructive' });
      return;
    }
    if (origem === 'OFICINA' && !nomeOficina) {
      toast({ title: 'Campos obrigatórios', description: 'Informe o nome da oficina.', variant: 'destructive' });
      return;
    }
    setSalvando(true);
    try {
      await updateDoc(doc(db, 'frota', viaturaId, 'processos_pneus', processoSelecionado.id), {
        status: 'aprovado',
        origem,
        nomeOficina: origem === 'OFICINA' ? nomeOficina : null,
        referenciaPneus: referenciaPneus || null,
        dataAprovacao: Timestamp.now(),
      });
      toast({ title: 'Processo aprovado', description: 'Dados de aprovação registrados.' });
      setProcessoSelecionado(null);
      resetFormEtapa2();
      fetchProcessos();
    } catch (error) {
      console.error('Erro ao aprovar:', error);
      toast({ title: 'Erro', description: 'Erro ao registrar aprovação.', variant: 'destructive' });
    } finally {
      setSalvando(false);
    }
  };

  const handleConclusao = async () => {
    if (!processoSelecionado) return;
    const isOficina = processoSelecionado.origem === 'OFICINA';
    
    if (isOficina && !numeroOS) {
      toast({ title: 'Campos obrigatórios', description: 'Informe o número da OS.', variant: 'destructive' });
      return;
    }
    if (!isOficina && !pneusRecebidosColog) {
      toast({ title: 'Confirmação necessária', description: 'Confirme o recebimento dos pneus na COLOG.', variant: 'destructive' });
      return;
    }

    setSalvando(true);
    try {
      let anexoOS_url = null;
      if (isOficina && arquivoOS) {
        anexoOS_url = await uploadArquivo(arquivoOS, processoSelecionado.id, 'os');
      }

      await updateDoc(doc(db, 'frota', viaturaId, 'processos_pneus', processoSelecionado.id), {
        status: 'finalizado',
        numeroOS: isOficina ? numeroOS : null,
        anexoOS_url,
        pneusRecebidosColog: !isOficina ? pneusRecebidosColog : false,
        dataConclusao: Timestamp.now(),
      });
      toast({ title: 'Processo finalizado', description: 'Troca de pneus registrada no histórico.' });
      setProcessoSelecionado(null);
      resetFormEtapa3();
      fetchProcessos();
    } catch (error) {
      console.error('Erro ao finalizar:', error);
      toast({ title: 'Erro', description: 'Erro ao finalizar processo.', variant: 'destructive' });
    } finally {
      setSalvando(false);
    }
  };

  const handleNegar = async () => {
    if (!processoSelecionado || !motivoNegacao) {
      toast({ title: 'Campo obrigatório', description: 'Informe o motivo da negação.', variant: 'destructive' });
      return;
    }
    setSalvando(true);
    try {
      await updateDoc(doc(db, 'frota', viaturaId, 'processos_pneus', processoSelecionado.id), {
        status: 'negado',
        motivoNegacao,
        dataNegacao: Timestamp.now(),
      });
      toast({ title: 'Processo negado', description: 'O processo foi arquivado como negado.' });
      setShowNegadoDialog(false);
      setProcessoSelecionado(null);
      setMotivoNegacao('');
      fetchProcessos();
    } catch (error) {
      console.error('Erro ao negar:', error);
      toast({ title: 'Erro', description: 'Erro ao negar processo.', variant: 'destructive' });
    } finally {
      setSalvando(false);
    }
  };

  const resetForm = () => {
    setNup(''); setKmAtual(''); setQuantidadePneus(''); setArquivoLaudo(null);
  };
  const resetFormEtapa2 = () => {
    setOrigem(''); setNomeOficina(''); setReferenciaPneus('');
  };
  const resetFormEtapa3 = () => {
    setNumeroOS(''); setArquivoOS(null); setPneusRecebidosColog(false);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, 'dd/MM/yyyy');
  };

  const processosAndamento = processos.filter(p => p.status === 'solicitado' || p.status === 'aprovado');
  const processosFinalizados = processos.filter(p => p.status === 'finalizado');
  const processosNegados = processos.filter(p => p.status === 'negado');

  const abrirProcesso = (processo: ProcessoPneu) => {
    setProcessoSelecionado(processo);
    if (processo.status === 'aprovado') {
      resetFormEtapa3();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Processos de Troca de Pneus
        </h3>
        <Button onClick={() => { resetForm(); setShowNovoForm(true); }} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Novo Processo
        </Button>
      </div>

      {/* Formulário Nova Solicitação */}
      {showNovoForm && (
        <Card className="border-2 border-dashed border-primary/40">
          <CardHeader>
            <CardTitle className="text-sm">Nova Solicitação de Pneus</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>NUP (Nº do Processo) *</Label>
                <Input value={nup} onChange={e => setNup(e.target.value)} placeholder="Ex: 2026/001234" />
              </div>
              <div>
                <Label>KM Atual *</Label>
                <Input type="number" value={kmAtual} onChange={e => setKmAtual(e.target.value)} placeholder="Ex: 85000" />
              </div>
              <div>
                <Label>Quantidade de Pneus *</Label>
                <Input type="number" value={quantidadePneus} onChange={e => setQuantidadePneus(e.target.value)} placeholder="Ex: 4" />
              </div>
            </div>
            <div>
              <Label>Anexar Laudo dos Pneus (PDF)</Label>
              <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setArquivoLaudo(e.target.files?.[0] || null)} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNovoForm(false)}>Cancelar</Button>
              <Button onClick={handleNovaSolicitacao} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Criar Solicitação'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processos em Andamento */}
      {processosAndamento.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Processos em Andamento ({processosAndamento.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {processosAndamento.map(p => {
              const config = statusConfig[p.status];
              const Icon = config.icon;
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => abrirProcesso(p)}
                >
                  <div className="flex items-center gap-3">
                    <Badge className={config.color}>
                      <Icon className="h-3 w-3 mr-1" />
                      {config.label}
                    </Badge>
                    <div>
                      <span className="font-medium">NUP: {p.nup}</span>
                      <span className="text-sm text-muted-foreground ml-3">{p.quantidadePneus} pneus · KM {p.kmAtual?.toLocaleString()}</span>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">{formatDate(p.dataSolicitacao)}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Detalhes do Processo Selecionado */}
      {processoSelecionado && (
        <Card className="border-2 border-primary/30">
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Processo NUP: {processoSelecionado.nup}</span>
              <Badge className={statusConfig[processoSelecionado.status].color}>
                {statusConfig[processoSelecionado.status].label}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Dados da Solicitação */}
            <div className="bg-muted/30 rounded p-3 space-y-1">
              <p className="text-sm font-medium">Etapa 1 - Solicitação</p>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <span>KM: {processoSelecionado.kmAtual?.toLocaleString()}</span>
                <span>Pneus: {processoSelecionado.quantidadePneus}</span>
                <span>Data: {formatDate(processoSelecionado.dataSolicitacao)}</span>
              </div>
              {processoSelecionado.anexoLaudo_url && (
                <a href={processoSelecionado.anexoLaudo_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" /> Ver Laudo
                </a>
              )}
            </div>

            {/* Dados da Aprovação (se já preenchido) */}
            {processoSelecionado.status !== 'solicitado' && (
              <div className="bg-blue-50 rounded p-3 space-y-1">
                <p className="text-sm font-medium">Etapa 2 - Aprovação</p>
                <div className="text-sm space-y-1">
                  <span>Origem: {processoSelecionado.origem === 'COLOG' ? 'COLOG (Comando Logístico)' : `Oficina: ${processoSelecionado.nomeOficina}`}</span>
                  {processoSelecionado.referenciaPneus && <p>Referência: {processoSelecionado.referenciaPneus}</p>}
                </div>
              </div>
            )}

            {/* Dados da Conclusão (se finalizado) */}
            {processoSelecionado.status === 'finalizado' && (
              <div className="bg-green-50 rounded p-3 space-y-1">
                <p className="text-sm font-medium">Etapa 3 - Conclusão</p>
                <div className="text-sm">
                  {processoSelecionado.origem === 'OFICINA' ? (
                    <>
                      <p>OS: {processoSelecionado.numeroOS}</p>
                      {processoSelecionado.anexoOS_url && (
                        <a href={processoSelecionado.anexoOS_url} target="_blank" rel="noopener noreferrer" className="text-primary flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" /> Ver OS
                        </a>
                      )}
                    </>
                  ) : (
                    <p>✅ Pneus recebidos na COLOG</p>
                  )}
                </div>
              </div>
            )}

            {/* Formulário Etapa 2 - Aprovação */}
            {processoSelecionado.status === 'solicitado' && (
              <div className="border rounded-lg p-4 space-y-4">
                <p className="text-sm font-semibold">Informar Aprovação</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Origem dos Pneus *</Label>
                    <Select value={origem} onValueChange={v => setOrigem(v as 'COLOG' | 'OFICINA')}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COLOG">COLOG (Comando Logístico)</SelectItem>
                        <SelectItem value="OFICINA">Comprado em Oficina</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {origem === 'OFICINA' && (
                    <div>
                      <Label>Nome da Oficina *</Label>
                      <Input value={nomeOficina} onChange={e => setNomeOficina(e.target.value)} placeholder="Nome da oficina" />
                    </div>
                  )}
                </div>
                <div>
                  <Label>Referência dos Pneus</Label>
                  <Input value={referenciaPneus} onChange={e => setReferenciaPneus(e.target.value)} placeholder="Ex: 205/55 R16" />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="destructive" size="sm" onClick={() => setShowNegadoDialog(true)}>
                    <XCircle className="h-4 w-4 mr-1" /> Processo Negado
                  </Button>
                  <Button onClick={handleAprovacao} disabled={salvando}>
                    {salvando ? 'Salvando...' : 'Registrar Aprovação'}
                  </Button>
                </div>
              </div>
            )}

            {/* Formulário Etapa 3 - Conclusão */}
            {processoSelecionado.status === 'aprovado' && (
              <div className="border rounded-lg p-4 space-y-4">
                <p className="text-sm font-semibold">Registrar Conclusão</p>
                {processoSelecionado.origem === 'OFICINA' ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Número da OS *</Label>
                        <Input value={numeroOS} onChange={e => setNumeroOS(e.target.value)} placeholder="Nº da OS" />
                      </div>
                      <div>
                        <Label>Anexar OS (PDF)</Label>
                        <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setArquivoOS(e.target.files?.[0] || null)} />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={pneusRecebidosColog}
                      onCheckedChange={v => setPneusRecebidosColog(v === true)}
                    />
                    <Label>Pneus Recebidos na COLOG</Label>
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  <Button variant="destructive" size="sm" onClick={() => setShowNegadoDialog(true)}>
                    <XCircle className="h-4 w-4 mr-1" /> Processo Negado
                  </Button>
                  <Button onClick={handleConclusao} disabled={salvando}>
                    {salvando ? 'Salvando...' : 'Finalizar Processo'}
                  </Button>
                </div>
              </div>
            )}

            {processoSelecionado.status !== 'finalizado' && processoSelecionado.status !== 'negado' && (
              <Button variant="ghost" size="sm" onClick={() => setProcessoSelecionado(null)}>
                Fechar detalhes
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs: Histórico e Negados */}
      <Tabs defaultValue="historico">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="historico">Histórico de Trocas ({processosFinalizados.length})</TabsTrigger>
          <TabsTrigger value="negados">Negados ({processosNegados.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="historico">
          {processosFinalizados.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma troca de pneu finalizada.</p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NUP</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>KM</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead>OS</TableHead>
                    <TableHead>Anexos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processosFinalizados.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nup}</TableCell>
                      <TableCell>{formatDate(p.dataConclusao)}</TableCell>
                      <TableCell>{p.kmAtual?.toLocaleString()}</TableCell>
                      <TableCell>{p.quantidadePneus}</TableCell>
                      <TableCell>
                        {p.origem === 'COLOG' ? 'COLOG' : p.nomeOficina || 'Oficina'}
                      </TableCell>
                      <TableCell>{p.referenciaPneus || '-'}</TableCell>
                      <TableCell>{p.numeroOS || '-'}</TableCell>
                      <TableCell className="space-x-2">
                        {p.anexoLaudo_url && (
                          <a href={p.anexoLaudo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">Laudo</a>
                        )}
                        {p.anexoOS_url && (
                          <a href={p.anexoOS_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">OS</a>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="negados">
          {processosNegados.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum processo negado.</p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NUP</TableHead>
                    <TableHead>Data Solicitação</TableHead>
                    <TableHead>Data Negação</TableHead>
                    <TableHead>KM</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processosNegados.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nup}</TableCell>
                      <TableCell>{formatDate(p.dataSolicitacao)}</TableCell>
                      <TableCell>{formatDate(p.dataNegacao)}</TableCell>
                      <TableCell>{p.kmAtual?.toLocaleString()}</TableCell>
                      <TableCell>{p.quantidadePneus}</TableCell>
                      <TableCell className="max-w-xs truncate">{p.motivoNegacao}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog Negação */}
      <Dialog open={showNegadoDialog} onOpenChange={setShowNegadoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Negar Processo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Motivo da Negação *</Label>
              <Textarea value={motivoNegacao} onChange={e => setMotivoNegacao(e.target.value)} placeholder="Informe o motivo..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNegadoDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleNegar} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Confirmar Negação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading && <p className="text-sm text-muted-foreground text-center">Carregando processos...</p>}
      {!loading && processos.length === 0 && !showNovoForm && (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhum processo de troca de pneus registrado para esta viatura.</p>
      )}
    </div>
  );
};

export default ProcessosPneusSection;
