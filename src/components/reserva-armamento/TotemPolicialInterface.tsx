import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  Package, CheckCircle, Lock, Loader2, AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  collection, query, where, getDocs, updateDoc, 
  doc, getDoc, addDoc
} from 'firebase/firestore';
import { db } from '@/firebase';
import logo from '@/assets/cavalaria-triade.png';

interface MaterialAguardando {
  materialId: string;
  nome: string;
  categoria: string;
  quantidade: number;
  numeroSerie?: string;
  carregadores?: number;
  modelo?: string;
  fabricante?: string;
}

interface CautelaAguardando {
  id: string;
  policialId: string;
  policialNome: string;
  policialNomeGuerra?: string;
  policialMatricula: string;
  policialNumeral?: number;
  postoGrad?: string;
  materiais: MaterialAguardando[];
  dataCautela: Date;
  horaCautela: string;
  armeiroId?: string;
  livroId?: string;
}

const TotemPolicialInterface = () => {
  const [cautelaAtual, setCautelaAtual] = useState<CautelaAguardando | null>(null);
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  
  // Modal primeiro acesso
  const [modalPrimeiroAcesso, setModalPrimeiroAcesso] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");
  const [erroNovaSenha, setErroNovaSenha] = useState("");
  const [policialPrimeiroAcesso, setPolicialPrimeiroAcesso] = useState<string | null>(null);
  
  const senhaInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Verificar automaticamente a cada 4 segundos se há cautela aguardando
  useEffect(() => {
    const verificarCautelaPendente = async () => {
      try {
        const snapshot = await getDocs(
          query(
            collection(db, 'cautelas_provisorias'),
            where('status', '==', 'aguardando_confirmacao')
          )
        );
        
        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          const data = docSnap.data();
          
          setCautelaAtual({
            id: docSnap.id,
            policialId: data.policialId,
            policialNome: data.policialNome,
            policialNomeGuerra: data.policialNomeGuerra,
            policialMatricula: data.policialMatricula,
            policialNumeral: data.policialNumeral,
            postoGrad: data.postoGrad,
            materiais: data.materiais || [],
            dataCautela: data.dataCautela?.toDate?.() || new Date(),
            horaCautela: data.horaCautela,
            armeiroId: data.armeiroId,
            livroId: data.livroId
          });
        } else {
          setCautelaAtual(null);
        }
      } catch (error) {
        console.error('Erro ao verificar cautelas:', error);
      } finally {
        setVerificando(false);
      }
    };

    // Verificar imediatamente
    verificarCautelaPendente();

    // Verificar a cada 4 segundos
    const interval = setInterval(verificarCautelaPendente, 4000);

    return () => clearInterval(interval);
  }, []);

  // Captura global de teclado para funcionar em tela estendida
  useEffect(() => {
    if (!cautelaAtual || mensagemSucesso || modalPrimeiroAcesso) return;
    
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignorar teclas de controle
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key === 'Tab' || e.key === 'Escape') return;
      
      // Se pressionar Enter, confirmar
      if (e.key === 'Enter') {
        handleConfirmarRecebimento();
        return;
      }
      
      // Se pressionar Backspace, remover último caractere
      if (e.key === 'Backspace') {
        e.preventDefault();
        setSenha(prev => prev.slice(0, -1));
        return;
      }
      
      // Adicionar caractere à senha (apenas caracteres válidos)
      if (e.key.length === 1) {
        e.preventDefault();
        setSenha(prev => prev + e.key);
      }
    };
    
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [cautelaAtual, mensagemSucesso, modalPrimeiroAcesso]);

  // Confirmar recebimento
  const handleConfirmarRecebimento = async () => {
    if (!senha.trim()) {
      toast({
        title: "Atenção",
        description: "Digite sua senha para confirmar.",
        variant: "destructive",
      });
      return;
    }

    if (!cautelaAtual) {
      toast({
        title: "Atenção",
        description: "Não há materiais aguardando confirmação.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Validar senha do policial
      const policialRef = doc(db, 'policiais', cautelaAtual.policialId);
      const policialDoc = await getDoc(policialRef);
      
      if (!policialDoc.exists()) {
        toast({
          title: "Erro",
          description: "Policial não encontrado.",
          variant: "destructive",
        });
        return;
      }

      const policialData = policialDoc.data();
      if (policialData.senha !== senha) {
        toast({
          title: "Senha incorreta",
          description: "A senha digitada não confere.",
          variant: "destructive",
        });
        setSenha("");
        return;
      }

      // Verificar se é primeiro acesso
      if (policialData.primeiroAcesso === true) {
        setPolicialPrimeiroAcesso(cautelaAtual.policialId);
        setModalPrimeiroAcesso(true);
        setLoading(false);
        return;
      }

      // Prosseguir com a confirmação
      await finalizarConfirmacao();

    } catch (error) {
      console.error('Erro ao confirmar recebimento:', error);
      toast({
        title: "Erro",
        description: "Erro ao confirmar recebimento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Finalizar confirmação (após validar senha ou definir nova senha)
  const finalizarConfirmacao = async () => {
    if (!cautelaAtual) return;

    try {
      setLoading(true);

      // Atualizar status da cautela para "pendente" (confirmado, aguardando devolução)
      await updateDoc(doc(db, 'cautelas_provisorias', cautelaAtual.id), {
        status: 'pendente',
        dataConfirmacao: new Date(),
        horaConfirmacao: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      });

      // Registrar movimentação de confirmação
      await addDoc(collection(db, 'movimentacoes_belicas'), {
        tipo: 'confirmacao_recebimento',
        cautelaId: cautelaAtual.id,
        policialId: cautelaAtual.policialId,
        policialNome: cautelaAtual.policialNome,
        materiais: cautelaAtual.materiais,
        dataConfirmacao: new Date(),
        livroId: cautelaAtual.livroId
      });

      setMensagemSucesso("RECEBIMENTO CONFIRMADO!");
      setSenha("");
      setCautelaAtual(null);
      
      toast({
        title: "✅ Recebimento Confirmado",
        description: "Materiais recebidos com sucesso!",
      });

      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => {
        setMensagemSucesso("");
      }, 3000);

    } catch (error) {
      console.error('Erro ao finalizar confirmação:', error);
      toast({
        title: "Erro",
        description: "Erro ao confirmar recebimento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Salvar nova senha no primeiro acesso
  const handleSalvarNovaSenha = async () => {
    setErroNovaSenha("");

    if (!novaSenha || novaSenha.length < 4) {
      setErroNovaSenha("A senha deve ter no mínimo 4 caracteres.");
      return;
    }

    if (novaSenha !== confirmarNovaSenha) {
      setErroNovaSenha("As senhas não coincidem.");
      return;
    }

    if (!policialPrimeiroAcesso) return;

    try {
      setLoading(true);

      // Atualizar senha e remover flag de primeiro acesso
      await updateDoc(doc(db, 'policiais', policialPrimeiroAcesso), {
        senha: novaSenha,
        primeiroAcesso: false
      });

      toast({
        title: "Senha Definida",
        description: "Sua nova senha foi salva com sucesso!",
      });

      // Fechar modal e continuar confirmação
      setModalPrimeiroAcesso(false);
      setNovaSenha("");
      setConfirmarNovaSenha("");
      setPolicialPrimeiroAcesso(null);

      // Finalizar confirmação
      await finalizarConfirmacao();

    } catch (error) {
      console.error('Erro ao salvar nova senha:', error);
      setErroNovaSenha("Erro ao salvar senha. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-2">
      <div className="w-full max-w-lg">
        {/* Header - Reduzido 30% */}
        <div className="text-center mb-4">
          <div className="flex flex-col items-center justify-center gap-2 mb-2">
            <img src={logo} alt="Logo Cavalaria" className="h-16 w-auto" />
            <div>
              <h1 className="text-lg font-bold text-foreground">CAVALARIA PMCE - P4</h1>
              <h2 className="text-base font-semibold text-white">RESERVA DE ARMAMENTO</h2>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Confirmação de Recebimento</p>
        </div>

        {/* Mensagem de Sucesso */}
        {mensagemSucesso && (
          <Card className="mb-4 border-green-500 bg-green-500/20 animate-pulse">
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-14 w-14 text-green-500 mx-auto mb-2" />
              <p className="text-xl font-bold text-green-400">{mensagemSucesso}</p>
            </CardContent>
          </Card>
        )}

        {/* Estado: Aguardando Material */}
        {!cautelaAtual && !mensagemSucesso && (
          <Card className="border-border">
            <CardContent className="p-6 text-center">
              <div className="mb-4">
                <Loader2 className="h-12 w-12 text-primary mx-auto animate-spin" />
              </div>
              <p className="text-lg font-semibold text-foreground mb-1">
                Aguardando material...
              </p>
              <p className="text-sm text-muted-foreground">
                Quando o armeiro registrar uma cautela,<br />
                ela aparecerá aqui automaticamente.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Verificando a cada 4 segundos
              </p>
            </CardContent>
          </Card>
        )}

        {/* Estado: Material Pendente para Confirmar */}
        {cautelaAtual && !mensagemSucesso && (
          <>
            {/* Identificação do Policial - Reduzido 30% */}
            <Card className="mb-3 border-primary bg-primary/10">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-primary-foreground">
                      {cautelaAtual.policialNumeral || '?'}
                    </span>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">
                      <span className="text-primary">{cautelaAtual.postoGrad}</span>
                      <span className="ml-2">{cautelaAtual.policialNomeGuerra || cautelaAtual.policialNome}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Matrícula: {cautelaAtual.policialMatricula}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Materiais para Receber - Reduzido 30% */}
            <Card className="mb-3 border-border">
              <CardHeader className="py-2 px-3">
                <CardTitle className="flex items-center gap-2 text-foreground text-base">
                  <Package className="h-4 w-4 text-primary" />
                  MATERIAIS PARA RECEBER
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="space-y-2">
                  {cautelaAtual.materiais.map((material, idx) => (
                    <div
                      key={`${cautelaAtual.id}-${idx}`}
                      className="p-2 bg-muted rounded-lg border border-border"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {material.nome}
                            {material.modelo && ` ${material.modelo}`}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {material.numeroSerie && (
                              <Badge variant="outline" className="border-primary text-primary text-xs">
                                Série: {material.numeroSerie}
                              </Badge>
                            )}
                            <Badge variant="outline" className="border-muted-foreground text-muted-foreground text-xs">
                              Qtd: {material.quantidade}
                            </Badge>
                            {material.carregadores && material.carregadores > 0 && (
                              <Badge variant="default" className="bg-blue-600 text-white text-xs">
                                📦 {material.carregadores} carregador(es)
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Campo de Senha - Reduzido 30% */}
            <Card className="border-border">
              <CardHeader className="py-2 px-3">
                <CardTitle className="flex items-center gap-2 text-foreground text-base">
                  <Lock className="h-4 w-4 text-primary" />
                  <span className="animate-pulse">DIGITE SUA SENHA</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-3 pb-3">
                <Input
                  ref={senhaInputRef}
                  type="password"
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirmarRecebimento()}
                  className="text-xl h-14 text-center bg-muted border-border text-foreground tracking-widest"
                  autoFocus
                />
                
                <p className="text-center text-muted-foreground text-xs">
                  Pressione <span className="text-primary font-bold">ENTER</span> para confirmar
                </p>
                
                <Button
                  onClick={handleConfirmarRecebimento}
                  disabled={loading || !senha}
                  className="w-full h-12 text-base bg-green-600 hover:bg-green-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Confirmando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      CONFIRMAR RECEBIMENTO
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {/* Footer */}
        <div className="text-center mt-4">
          <p className="text-xs text-muted-foreground">
            Cavalaria PMCE - P4 - Reserva de Armamento - Totem de Confirmação
          </p>
        </div>
      </div>

      {/* Modal Primeiro Acesso */}
      <Dialog open={modalPrimeiroAcesso} onOpenChange={setModalPrimeiroAcesso}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Primeiro Acesso - Defina sua Senha
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Esta é sua primeira autenticação. Por segurança, defina uma nova senha pessoal.
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="novaSenha">Nova Senha</Label>
              <Input
                id="novaSenha"
                type="password"
                placeholder="Mínimo 4 caracteres"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmarNovaSenha">Confirmar Nova Senha</Label>
              <Input
                id="confirmarNovaSenha"
                type="password"
                placeholder="Digite novamente"
                value={confirmarNovaSenha}
                onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSalvarNovaSenha()}
              />
            </div>
            
            {erroNovaSenha && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                {erroNovaSenha}
              </p>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              onClick={handleSalvarNovaSenha} 
              disabled={loading || !novaSenha || !confirmarNovaSenha}
            >
              {loading ? 'Salvando...' : 'Salvar e Continuar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TotemPolicialInterface;