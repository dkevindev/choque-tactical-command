import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { MoveRight, Users, AlertTriangle, UserPlus } from 'lucide-react';
import { doc, deleteDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '@/firebase';
import { useToast } from "@/hooks/use-toast";

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

interface MovimentacoesTabProps {
  policiais: Policial[];
  onUpdate: () => void;
}

const MovimentacoesTab: React.FC<MovimentacoesTabProps> = ({ policiais, onUpdate }) => {
  // Estados para transferência
  const [selectedPolicial, setSelectedPolicial] = useState<string>('');
  const [destino, setDestino] = useState('');
  const [publicacao, setPublicacao] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Estados para chegada
  const [novoPolicial, setNovoPolicial] = useState({
    nome: '',
    nomeGuerra: '',
    nomeGuerra1: '',
    cpf: '',
    dataNascimento: '',
    postGrad: '',
    matricula: '',
    numeral: '',
    funcao: 'POLICIAL',
    unidade: 'CPCHOQUE',
    situacao: 'MONTADO - POLICIAMENTO OSTENSIVO',
    dataUltimaPromocao: '',
    previsaoFerias2024: '',
    telefone: '',
    email: '',
    endereco: '',
    bairro: '',
    banco: '',
    agencia: '',
    conta: '',
    unidadeOrigem: '',
    publicacao: ''
  });
  const [showChegadaDialog, setShowChegadaDialog] = useState(false);
  const [materiaisTrazidos, setMateriaisTrazidos] = useState({
    pistola: false,
    colete: false,
    municao: false
  });
  
  const { toast } = useToast();

  const handleTransferirPolicial = async () => {
    if (!selectedPolicial || !destino) {
      toast({
        title: "Erro",
        description: "Selecione um policial e informe o destino",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const policial = policiais.find(p => p.id === selectedPolicial);
      if (!policial) {
        throw new Error('Policial não encontrado');
      }

      // Criar registro na coleção de transferidos
      const transferidoData = {
        ...policial,
        dataTransferencia: new Date().toISOString(),
        destino,
        publicacao,
        unidadeOrigem: policial.Unidade
      };

      // Remover o campo 'id' do documento para evitar conflitos
      const { id, ...dadosSemId } = transferidoData;

      await addDoc(collection(db, 'policiais_transferidos'), dadosSemId);

      // Remover da coleção original
      await deleteDoc(doc(db, 'policiais', selectedPolicial));

      toast({
        title: "Sucesso",
        description: `${policial['Post/Grad']} ${policial.NOME} transferido para ${destino}`
      });

      // Reset form
      setSelectedPolicial('');
      setDestino('');
      setPublicacao('');
      setShowConfirmDialog(false);
      onUpdate();
    } catch (error) {
      console.error('Erro ao transferir policial:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar transferência",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdicionarChegada = async () => {
    if (!novoPolicial.nome || !novoPolicial.postGrad || !novoPolicial.unidadeOrigem || !novoPolicial.cpf) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios (Nome, CPF, Posto/Grad, Unidade de Origem)",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Calcular idade se data de nascimento fornecida
      let idade = null;
      let mesAniversario = null;
      if (novoPolicial.dataNascimento) {
        const dataNasc = new Date(novoPolicial.dataNascimento);
        const hoje = new Date();
        idade = hoje.getFullYear() - dataNasc.getFullYear();
        mesAniversario = dataNasc.getMonth() + 1;
      }

      // Adicionar policial na coleção principal
      const novoPolicialData = {
        NOME: novoPolicial.nome.toUpperCase(),
        'Nome de Guerra': novoPolicial.nomeGuerra.toUpperCase(),
        'Nome de Guerra 1': novoPolicial.nomeGuerra1.toUpperCase(),
        CPF: novoPolicial.cpf,
        'Data de Nascimento': novoPolicial.dataNascimento,
        Idade: idade,
        'Mês Aniversário': mesAniversario,
        'Post/Grad': novoPolicial.postGrad,
        Matrícula: novoPolicial.matricula,
        Numeral: novoPolicial.numeral || 'N/A',
        'FUNÇÃO': novoPolicial.funcao,
        Unidade: novoPolicial.unidade,
        SITUAÇÃO: novoPolicial.situacao,
        'Última Promoção': novoPolicial.dataUltimaPromocao,
        'PREVISAO FÉRIAS - AQUISITIVO 2024': novoPolicial.previsaoFerias2024,
        Telefone: novoPolicial.telefone,
        'E-mail': novoPolicial.email,
        Endereço: novoPolicial.endereco,
        Bairro: novoPolicial.bairro,
        Banco: novoPolicial.banco,
        Agência: novoPolicial.agencia,
        Conta: novoPolicial.conta,
        dataChegada: new Date().toISOString()
      };

      const policialRef = await addDoc(collection(db, 'policiais'), novoPolicialData);

      // Criar alerta de chegada
      await addDoc(collection(db, 'alertas_chegada'), {
        policialId: policialRef.id,
        policialNome: novoPolicial.nome.toUpperCase(),
        policialPostGrad: novoPolicial.postGrad,
        policialMatricula: novoPolicial.matricula,
        unidadeOrigem: novoPolicial.unidadeOrigem,
        publicacao: novoPolicial.publicacao,
        dataChegada: new Date().toISOString(),
        status: 'pendente',
        materiaisAdicionados: false,
        materiaisTrazidos: {
          pistola: materiaisTrazidos.pistola,
          colete: materiaisTrazidos.colete,
          municao: materiaisTrazidos.municao
        }
      });

      toast({
        title: "Sucesso",
        description: `${novoPolicial.postGrad} ${novoPolicial.nome} adicionado com sucesso!`
      });

      // Reset form
      setNovoPolicial({
        nome: '',
        nomeGuerra: '',
        nomeGuerra1: '',
        cpf: '',
        dataNascimento: '',
        postGrad: '',
        matricula: '',
        numeral: '',
        funcao: 'POLICIAL',
        unidade: 'CPCHOQUE',
        situacao: 'MONTADO - POLICIAMENTO OSTENSIVO',
        dataUltimaPromocao: '',
        previsaoFerias2024: '',
        telefone: '',
        email: '',
        endereco: '',
        bairro: '',
        banco: '',
        agencia: '',
        conta: '',
        unidadeOrigem: '',
        publicacao: ''
      });
      setShowChegadaDialog(false);
      setMateriaisTrazidos({ pistola: false, colete: false, municao: false });
      onUpdate();
    } catch (error) {
      console.error('Erro ao adicionar policial:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar policial",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedPolicialData = policiais.find(p => p.id === selectedPolicial);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="transferencia" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transferencia">Transferências (Saída)</TabsTrigger>
          <TabsTrigger value="chegada">Chegadas (Entrada)</TabsTrigger>
        </TabsList>

        <TabsContent value="transferencia" className="space-y-6">
          <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MoveRight className="h-5 w-5" />
            Transferência de Policiais
          </CardTitle>
          <CardDescription>
            Transferir policiais para outras unidades (ação irreversível)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formulário de Transferência */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="policial">Selecionar Policial</Label>
                <Select value={selectedPolicial} onValueChange={setSelectedPolicial}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um policial" />
                  </SelectTrigger>
                  <SelectContent>
                    {policiais.map(policial => (
                      <SelectItem key={policial.id} value={policial.id}>
                        {policial['Post/Grad']} {policial.NOME} - {policial.Unidade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="destino">Unidade de Destino</Label>
                <Input
                  id="destino"
                  placeholder="Ex: 1º BPM, CPCHOQUE, etc."
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="publicacao">Publicação</Label>
                <Input
                  id="publicacao"
                  placeholder="Ex: Portaria nº 123/2024"
                  value={publicacao}
                  onChange={(e) => setPublicacao(e.target.value)}
                />
              </div>

              <Button
                onClick={() => setShowConfirmDialog(true)}
                disabled={!selectedPolicial || !destino || loading}
                className="w-full"
                variant="destructive"
              >
                Transferir Policial
              </Button>
            </div>

            {/* Dados do Policial Selecionado */}
            {selectedPolicialData && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Dados do Policial</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="font-medium">Nome:</div>
                    <div>{selectedPolicialData.NOME}</div>
                    
                    <div className="font-medium">Post/Grad:</div>
                    <div>{selectedPolicialData['Post/Grad']}</div>
                    
                    <div className="font-medium">Matrícula:</div>
                    <div>{selectedPolicialData.Matrícula || 'N/A'}</div>
                    
                    <div className="font-medium">Situação:</div>
                    <div>
                      <Badge variant="outline">
                        {selectedPolicialData.SITUAÇÃO}
                      </Badge>
                    </div>
                    
                    <div className="font-medium">Função:</div>
                    <div>{selectedPolicialData['FUNÇÃO']}</div>
                    
                    <div className="font-medium">Unidade Atual:</div>
                    <div className="font-medium text-primary">
                      {selectedPolicialData.Unidade}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">Atenção - Ação Irreversível</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Ao transferir um policial, ele será removido da coleção atual e movido para 
                  a coleção "policiais_transferidos". Esta ação não pode ser desfeita através 
                  do sistema.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Confirmação */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirmar Transferência
            </DialogTitle>
            <DialogDescription>
              Esta ação é irreversível. O policial será removido da unidade atual.
            </DialogDescription>
          </DialogHeader>

          {selectedPolicialData && (
            <div className="my-4 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Dados da Transferência:</h4>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Policial:</span> {selectedPolicialData['Post/Grad']} {selectedPolicialData.NOME}</p>
                <p><span className="font-medium">De:</span> {selectedPolicialData.Unidade}</p>
                <p><span className="font-medium">Para:</span> {destino}</p>
                {publicacao && <p><span className="font-medium">Publicação:</span> {publicacao}</p>}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleTransferirPolicial}
              disabled={loading}
            >
              {loading ? "Transferindo..." : "Confirmar Transferência"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Policiais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{policiais.length}</div>
            <p className="text-xs text-muted-foreground">Na unidade atual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Disponíveis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {policiais.filter(p => 
                p.SITUAÇÃO === 'MONTADO - POLICIAMENTO OSTENSIVO' || 
                p.SITUAÇÃO === 'ATIVO'
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">Para transferência</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Em Situações Especiais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {policiais.filter(p => 
                p.SITUAÇÃO?.includes('FÉRIAS') || 
                p.SITUAÇÃO?.includes('LICENÇA') ||
                p.SITUAÇÃO?.includes('LUTO') ||
                p.SITUAÇÃO?.includes('CURSANDO')
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">Férias, licenças, etc.</p>
          </CardContent>
        </Card>
      </div>
        </TabsContent>

        <TabsContent value="chegada" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Registro de Chegada de Policial
              </CardTitle>
              <CardDescription>
                Registrar policial que está chegando de outra unidade
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Dados Pessoais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="nome">Nome Completo *</Label>
                    <Input
                      id="nome"
                      placeholder="Nome completo do policial"
                      value={novoPolicial.nome}
                      onChange={(e) => setNovoPolicial({...novoPolicial, nome: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="nomeGuerra">Nome de Guerra</Label>
                    <Input
                      id="nomeGuerra"
                      placeholder="Ex: LIBERATO"
                      value={novoPolicial.nomeGuerra}
                      onChange={(e) => setNovoPolicial({...novoPolicial, nomeGuerra: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="nomeGuerra1">Nome de Guerra 1</Label>
                    <Input
                      id="nomeGuerra1"
                      placeholder="Ex: TENCEL LIBERATO"
                      value={novoPolicial.nomeGuerra1}
                      onChange={(e) => setNovoPolicial({...novoPolicial, nomeGuerra1: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="cpf">CPF *</Label>
                    <Input
                      id="cpf"
                      placeholder="000.000.000-00"
                      value={novoPolicial.cpf}
                      onChange={(e) => setNovoPolicial({...novoPolicial, cpf: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                    <Input
                      id="dataNascimento"
                      type="date"
                      value={novoPolicial.dataNascimento}
                      onChange={(e) => setNovoPolicial({...novoPolicial, dataNascimento: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Dados Profissionais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="matricula">Matrícula</Label>
                    <Input
                      id="matricula"
                      placeholder="Número da matrícula"
                      value={novoPolicial.matricula}
                      onChange={(e) => setNovoPolicial({...novoPolicial, matricula: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="numeral">Numeral</Label>
                    <Input
                      id="numeral"
                      placeholder="Numeral"
                      value={novoPolicial.numeral}
                      onChange={(e) => setNovoPolicial({...novoPolicial, numeral: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="postGrad">Posto/Graduação *</Label>
                    <Select 
                      value={novoPolicial.postGrad} 
                      onValueChange={(value) => setNovoPolicial({...novoPolicial, postGrad: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CEL">CEL</SelectItem>
                        <SelectItem value="TENCEL">TENCEL</SelectItem>
                        <SelectItem value="MAJ">MAJ</SelectItem>
                        <SelectItem value="CAP">CAP</SelectItem>
                        <SelectItem value="1º TEN">1º TEN</SelectItem>
                        <SelectItem value="2º TEN">2º TEN</SelectItem>
                        <SelectItem value="SUBTEN">SUBTEN</SelectItem>
                        <SelectItem value="1º SGT">1º SGT</SelectItem>
                        <SelectItem value="2º SGT">2º SGT</SelectItem>
                        <SelectItem value="3º SGT">3º SGT</SelectItem>
                        <SelectItem value="CB">CB</SelectItem>
                        <SelectItem value="SD">SD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="funcao">Função</Label>
                    <Input
                      id="funcao"
                      placeholder="Ex: CMT RPMONT, POLICIAL"
                      value={novoPolicial.funcao}
                      onChange={(e) => setNovoPolicial({...novoPolicial, funcao: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="unidade">Unidade Atual</Label>
                    <Input
                      id="unidade"
                      placeholder="CPCHOQUE"
                      value={novoPolicial.unidade}
                      onChange={(e) => setNovoPolicial({...novoPolicial, unidade: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="situacao">Situação</Label>
                    <Select 
                      value={novoPolicial.situacao} 
                      onValueChange={(value) => setNovoPolicial({...novoPolicial, situacao: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MONTADO - POLICIAMENTO OSTENSIVO">MONTADO - POLICIAMENTO OSTENSIVO</SelectItem>
                        <SelectItem value="OFICIAL">OFICIAL</SelectItem>
                        <SelectItem value="ATIVO">ATIVO</SelectItem>
                        <SelectItem value="FÉRIAS">FÉRIAS</SelectItem>
                        <SelectItem value="LICENÇA TRATAMENTO">LICENÇA TRATAMENTO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="dataUltimaPromocao">Última Promoção</Label>
                    <Input
                      id="dataUltimaPromocao"
                      type="date"
                      value={novoPolicial.dataUltimaPromocao}
                      onChange={(e) => setNovoPolicial({...novoPolicial, dataUltimaPromocao: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="previsaoFerias2024">Previsão Férias 2024</Label>
                    <Input
                      id="previsaoFerias2024"
                      placeholder="Ex: DEZEMBRO"
                      value={novoPolicial.previsaoFerias2024}
                      onChange={(e) => setNovoPolicial({...novoPolicial, previsaoFerias2024: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Transferência</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="unidadeOrigem">Unidade de Origem *</Label>
                    <Input
                      id="unidadeOrigem"
                      placeholder="Ex: 1º BPM, RPMONT, etc."
                      value={novoPolicial.unidadeOrigem}
                      onChange={(e) => setNovoPolicial({...novoPolicial, unidadeOrigem: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="publicacaoChegada">Publicação</Label>
                    <Input
                      id="publicacaoChegada"
                      placeholder="Ex: Portaria nº 123/2024"
                      value={novoPolicial.publicacao}
                      onChange={(e) => setNovoPolicial({...novoPolicial, publicacao: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Contato e Dados Bancários</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      placeholder="(85) 98876-2147"
                      value={novoPolicial.telefone}
                      onChange={(e) => setNovoPolicial({...novoPolicial, telefone: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@exemplo.com"
                      value={novoPolicial.email}
                      onChange={(e) => setNovoPolicial({...novoPolicial, email: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="endereco">Endereço</Label>
                    <Input
                      id="endereco"
                      placeholder="Rua, número"
                      value={novoPolicial.endereco}
                      onChange={(e) => setNovoPolicial({...novoPolicial, endereco: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="bairro">Bairro</Label>
                    <Input
                      id="bairro"
                      placeholder="Nome do bairro"
                      value={novoPolicial.bairro}
                      onChange={(e) => setNovoPolicial({...novoPolicial, bairro: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="banco">Banco</Label>
                    <Input
                      id="banco"
                      placeholder="Ex: BRADESCO, CAIXA"
                      value={novoPolicial.banco}
                      onChange={(e) => setNovoPolicial({...novoPolicial, banco: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="agencia">Agência</Label>
                    <Input
                      id="agencia"
                      placeholder="Número da agência"
                      value={novoPolicial.agencia}
                      onChange={(e) => setNovoPolicial({...novoPolicial, agencia: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="conta">Conta</Label>
                    <Input
                      id="conta"
                      placeholder="Número da conta"
                      value={novoPolicial.conta}
                      onChange={(e) => setNovoPolicial({...novoPolicial, conta: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <UserPlus className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800">Alerta de Chegada</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Ao registrar a chegada, será criado um alerta no Sistema de Gestão para que 
                      você possa adicionar os materiais bélicos que o policial trouxe (arma, colete, etc.). 
                      O alerta permanecerá até que seja marcado como "sem alteração".
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setShowChegadaDialog(true)}
                disabled={!novoPolicial.nome || !novoPolicial.postGrad || !novoPolicial.unidadeOrigem || !novoPolicial.cpf || loading}
                className="w-full"
              >
                Registrar Chegada
              </Button>
            </CardContent>
          </Card>

          {/* Dialog de Confirmação Chegada */}
          <Dialog open={showChegadaDialog} onOpenChange={setShowChegadaDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-green-500" />
                  Confirmar Registro de Chegada
                </DialogTitle>
                <DialogDescription>
                  Confirme os dados do policial que está chegando
                </DialogDescription>
              </DialogHeader>

              <div className="my-4 p-4 bg-muted rounded-lg max-h-96 overflow-y-auto">
                <h4 className="font-medium mb-2">Dados do Policial:</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <p><span className="font-medium">Nome:</span> {novoPolicial.nome}</p>
                  <p><span className="font-medium">CPF:</span> {novoPolicial.cpf}</p>
                  <p><span className="font-medium">Post/Grad:</span> {novoPolicial.postGrad}</p>
                  <p><span className="font-medium">Matrícula:</span> {novoPolicial.matricula || 'N/A'}</p>
                  {novoPolicial.nomeGuerra && <p><span className="font-medium">Nome de Guerra:</span> {novoPolicial.nomeGuerra}</p>}
                  {novoPolicial.dataNascimento && <p><span className="font-medium">Nascimento:</span> {new Date(novoPolicial.dataNascimento).toLocaleDateString('pt-BR')}</p>}
                  <p><span className="font-medium">Função:</span> {novoPolicial.funcao}</p>
                  <p><span className="font-medium">Unidade:</span> {novoPolicial.unidade}</p>
                  <p><span className="font-medium">Situação:</span> {novoPolicial.situacao}</p>
                  <p><span className="font-medium">Origem:</span> {novoPolicial.unidadeOrigem}</p>
                  {novoPolicial.telefone && <p><span className="font-medium">Telefone:</span> {novoPolicial.telefone}</p>}
                  {novoPolicial.email && <p><span className="font-medium">E-mail:</span> {novoPolicial.email}</p>}
                  {novoPolicial.publicacao && <p className="col-span-2"><span className="font-medium">Publicação:</span> {novoPolicial.publicacao}</p>}
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Materiais Trazidos</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      id="pistola"
                      checked={materiaisTrazidos.pistola}
                      onCheckedChange={(checked) => 
                        setMateriaisTrazidos({...materiaisTrazidos, pistola: checked as boolean})
                      }
                    />
                    <Label htmlFor="pistola" className="cursor-pointer">Pistola</Label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      id="colete"
                      checked={materiaisTrazidos.colete}
                      onCheckedChange={(checked) => 
                        setMateriaisTrazidos({...materiaisTrazidos, colete: checked as boolean})
                      }
                    />
                    <Label htmlFor="colete" className="cursor-pointer">Colete Balístico</Label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      id="municao"
                      checked={materiaisTrazidos.municao}
                      onCheckedChange={(checked) => 
                        setMateriaisTrazidos({...materiaisTrazidos, municao: checked as boolean})
                      }
                    />
                    <Label htmlFor="municao" className="cursor-pointer">Munição</Label>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowChegadaDialog(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleAdicionarChegada}
                  disabled={loading}
                >
                  {loading ? "Registrando..." : "Confirmar Chegada"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MovimentacoesTab;