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
    postGrad: '',
    matricula: '',
    unidadeOrigem: '',
    publicacao: '',
    funcao: 'POLICIAL',
    situacao: 'MONTADO - POLICIAMENTO OSTENSIVO'
  });
  const [showChegadaDialog, setShowChegadaDialog] = useState(false);
  
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
    if (!novoPolicial.nome || !novoPolicial.postGrad || !novoPolicial.unidadeOrigem) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Adicionar policial na coleção principal
      const novoPolicialData = {
        NOME: novoPolicial.nome.toUpperCase(),
        'Post/Grad': novoPolicial.postGrad,
        Matrícula: novoPolicial.matricula,
        'FUNÇÃO': novoPolicial.funcao,
        SITUAÇÃO: novoPolicial.situacao,
        Unidade: 'CPCHOQUE',
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
        materiaisAdicionados: false
      });

      toast({
        title: "Sucesso",
        description: `${novoPolicial.postGrad} ${novoPolicial.nome} adicionado com sucesso!`
      });

      // Reset form
      setNovoPolicial({
        nome: '',
        postGrad: '',
        matricula: '',
        unidadeOrigem: '',
        publicacao: '',
        funcao: 'POLICIAL',
        situacao: 'MONTADO - POLICIAMENTO OSTENSIVO'
      });
      setShowChegadaDialog(false);
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
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="nome">Nome Completo *</Label>
                    <Input
                      id="nome"
                      placeholder="Nome do policial"
                      value={novoPolicial.nome}
                      onChange={(e) => setNovoPolicial({...novoPolicial, nome: e.target.value})}
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
                        <SelectItem value="TEN CEL">TEN CEL</SelectItem>
                        <SelectItem value="MAJ">MAJ</SelectItem>
                        <SelectItem value="CAP">CAP</SelectItem>
                        <SelectItem value="1º TEN">1º TEN</SelectItem>
                        <SelectItem value="2º TEN">2º TEN</SelectItem>
                        <SelectItem value="SUB TEN">SUB TEN</SelectItem>
                        <SelectItem value="1º SGT">1º SGT</SelectItem>
                        <SelectItem value="2º SGT">2º SGT</SelectItem>
                        <SelectItem value="3º SGT">3º SGT</SelectItem>
                        <SelectItem value="CB">CB</SelectItem>
                        <SelectItem value="SD">SD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="matricula">Matrícula</Label>
                    <Input
                      id="matricula"
                      placeholder="Número da matrícula"
                      value={novoPolicial.matricula}
                      onChange={(e) => setNovoPolicial({...novoPolicial, matricula: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="unidadeOrigem">Unidade de Origem *</Label>
                    <Input
                      id="unidadeOrigem"
                      placeholder="Ex: 1º BPM, 2º BPM, etc."
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

                  <div>
                    <Label htmlFor="funcao">Função</Label>
                    <Input
                      id="funcao"
                      placeholder="Função do policial"
                      value={novoPolicial.funcao}
                      onChange={(e) => setNovoPolicial({...novoPolicial, funcao: e.target.value})}
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
                disabled={!novoPolicial.nome || !novoPolicial.postGrad || !novoPolicial.unidadeOrigem || loading}
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

              <div className="my-4 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Dados do Policial:</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Nome:</span> {novoPolicial.nome}</p>
                  <p><span className="font-medium">Post/Grad:</span> {novoPolicial.postGrad}</p>
                  <p><span className="font-medium">Matrícula:</span> {novoPolicial.matricula || 'Não informada'}</p>
                  <p><span className="font-medium">Unidade de Origem:</span> {novoPolicial.unidadeOrigem}</p>
                  <p><span className="font-medium">Função:</span> {novoPolicial.funcao}</p>
                  {novoPolicial.publicacao && <p><span className="font-medium">Publicação:</span> {novoPolicial.publicacao}</p>}
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