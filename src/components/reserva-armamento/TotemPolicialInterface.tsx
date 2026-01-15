import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Package, CheckCircle, Lock, Loader2
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

  // Auto-focus no campo de senha quando aparecer cautela
  useEffect(() => {
    if (cautelaAtual && senhaInputRef.current) {
      setTimeout(() => {
        senhaInputRef.current?.focus();
      }, 100);
    }
  }, [cautelaAtual]);

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
        setTimeout(() => senhaInputRef.current?.focus(), 100);
        return;
      }

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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex flex-col items-center justify-center gap-4 mb-4">
            <img src={logo} alt="Logo Cavalaria" className="h-24 w-auto" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">CAVALARIA PMCE - P4</h1>
              <h2 className="text-xl font-semibold text-white">RESERVA DE ARMAMENTO</h2>
            </div>
          </div>
          <p className="text-lg text-muted-foreground">Confirmação de Recebimento</p>
        </div>

        {/* Mensagem de Sucesso */}
        {mensagemSucesso && (
          <Card className="mb-6 border-green-500 bg-green-500/20 animate-pulse">
            <CardContent className="p-8 text-center">
              <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
              <p className="text-3xl font-bold text-green-400">{mensagemSucesso}</p>
            </CardContent>
          </Card>
        )}

        {/* Estado: Aguardando Material */}
        {!cautelaAtual && !mensagemSucesso && (
          <Card className="border-border">
            <CardContent className="p-12 text-center">
              <div className="mb-6">
                <Loader2 className="h-16 w-16 text-primary mx-auto animate-spin" />
              </div>
              <p className="text-2xl font-semibold text-foreground mb-2">
                Aguardando material...
              </p>
              <p className="text-muted-foreground">
                Quando o armeiro registrar uma cautela,<br />
                ela aparecerá aqui automaticamente.
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                Verificando a cada 4 segundos
              </p>
            </CardContent>
          </Card>
        )}

        {/* Estado: Material Pendente para Confirmar */}
        {cautelaAtual && !mensagemSucesso && (
          <>
            {/* Identificação do Policial */}
            <Card className="mb-6 border-primary bg-primary/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary-foreground">
                      {cautelaAtual.policialNumeral || '?'}
                    </span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      <span className="text-primary">{cautelaAtual.postoGrad}</span>
                      <span className="ml-2">{cautelaAtual.policialNomeGuerra || cautelaAtual.policialNome}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Matrícula: {cautelaAtual.policialMatricula}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Materiais para Receber */}
            <Card className="mb-6 border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Package className="h-6 w-6 text-primary" />
                  MATERIAIS PARA RECEBER
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cautelaAtual.materiais.map((material, idx) => (
                    <div
                      key={`${cautelaAtual.id}-${idx}`}
                      className="p-4 bg-muted rounded-lg border border-border"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-lg font-semibold text-foreground">
                            {material.nome}
                            {material.modelo && ` ${material.modelo}`}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {material.numeroSerie && (
                              <Badge variant="outline" className="border-primary text-primary">
                                Série: {material.numeroSerie}
                              </Badge>
                            )}
                            <Badge variant="outline" className="border-muted-foreground text-muted-foreground">
                              Qtd: {material.quantidade}
                            </Badge>
                            {material.carregadores && material.carregadores > 0 && (
                              <Badge variant="default" className="bg-blue-600 text-white text-base">
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

            {/* Campo de Senha */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Lock className="h-6 w-6 text-primary" />
                  DIGITE SUA SENHA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  ref={senhaInputRef}
                  type="password"
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirmarRecebimento()}
                  className="text-3xl h-20 text-center bg-muted border-border text-foreground tracking-widest"
                  autoFocus
                />
                
                <p className="text-center text-muted-foreground text-sm">
                  Pressione <span className="text-primary font-bold">ENTER</span> para confirmar
                </p>
                
                <Button
                  onClick={handleConfirmarRecebimento}
                  disabled={loading || !senha}
                  className="w-full h-16 text-xl bg-green-600 hover:bg-green-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-6 w-6 mr-2 animate-spin" />
                      Confirmando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-6 w-6 mr-2" />
                      CONFIRMAR RECEBIMENTO
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            Cavalaria PMCE - P4 - Reserva de Armamento - Totem de Confirmação
          </p>
        </div>
      </div>
    </div>
  );
};

export default TotemPolicialInterface;
