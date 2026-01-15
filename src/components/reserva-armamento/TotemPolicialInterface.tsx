import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  RefreshCw, User, Shield, Package, CheckCircle, 
  Lock, AlertCircle, Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  collection, query, where, onSnapshot, updateDoc, 
  doc, getDoc, addDoc
} from 'firebase/firestore';
import { db } from '@/firebase';

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
  const [searchTerm, setSearchTerm] = useState("");
  const [cautelasAguardando, setCautelasAguardando] = useState<CautelaAguardando[]>([]);
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [policialEncontrado, setPolicialEncontrado] = useState<{
    id: string;
    nome: string;
    nomeGuerra?: string;
    matricula: string;
  } | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  
  const { toast } = useToast();

  // Listener em tempo real para cautelas aguardando confirmação do policial
  useEffect(() => {
    if (!policialEncontrado) return;

    const unsubscribe = onSnapshot(
      query(
        collection(db, 'cautelas_provisorias'),
        where('policialId', '==', policialEncontrado.id),
        where('status', '==', 'aguardando_confirmacao')
      ),
      (snapshot) => {
        const cautelas: CautelaAguardando[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          cautelas.push({
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
        });
        setCautelasAguardando(cautelas);
      },
      (error) => {
        console.error('Erro ao buscar cautelas:', error);
      }
    );

    return () => unsubscribe();
  }, [policialEncontrado]);

  // Buscar policial por matrícula ou numeral
  const buscarPolicial = async () => {
    if (!searchTerm.trim()) {
      toast({
        title: "Atenção",
        description: "Digite sua matrícula ou numeral.",
        variant: "destructive",
      });
      return;
    }

    try {
      setBuscando(true);
      setMensagemSucesso("");
      
      // Buscar por matrícula
      const querySnapshot = await import('firebase/firestore').then(({ getDocs }) => 
        getDocs(query(collection(db, 'policiais')))
      );
      
      let policialDoc = null;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const matricula = String(data['Matrícula'] || '');
        const numeral = String(data['NUMERAL'] || '');
        
        if (matricula === searchTerm || numeral === searchTerm) {
          policialDoc = { id: doc.id, ...data };
        }
      });

      if (policialDoc) {
        setPolicialEncontrado({
          id: policialDoc.id,
          nome: policialDoc.NOME,
          nomeGuerra: policialDoc['NOME DE GUERRA1'] || policialDoc['NOME DE GUERRA'],
          matricula: String(policialDoc['Matrícula'])
        });
        toast({
          title: "Policial identificado",
          description: `${policialDoc['NOME DE GUERRA1'] || policialDoc['NOME DE GUERRA'] || policialDoc.NOME}`,
        });
      } else {
        toast({
          title: "Não encontrado",
          description: "Policial não encontrado. Verifique a matrícula ou numeral.",
          variant: "destructive",
        });
        setPolicialEncontrado(null);
      }
    } catch (error) {
      console.error('Erro ao buscar policial:', error);
      toast({
        title: "Erro",
        description: "Erro ao buscar policial.",
        variant: "destructive",
      });
    } finally {
      setBuscando(false);
    }
  };

  // Atualizar manualmente
  const handleAtualizar = () => {
    if (policialEncontrado) {
      // O listener já está ativo, mas podemos forçar uma busca nova
      buscarPolicial();
    }
  };

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

    if (cautelasAguardando.length === 0) {
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
      const policialRef = doc(db, 'policiais', policialEncontrado!.id);
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
        return;
      }

      // Confirmar todas as cautelas aguardando
      for (const cautela of cautelasAguardando) {
        // Atualizar status da cautela para "pendente" (confirmado, aguardando devolução)
        await updateDoc(doc(db, 'cautelas_provisorias', cautela.id), {
          status: 'pendente',
          dataConfirmacao: new Date(),
          horaConfirmacao: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        });

        // Registrar movimentação de confirmação
        await addDoc(collection(db, 'movimentacoes_belicas'), {
          tipo: 'confirmacao_recebimento',
          cautelaId: cautela.id,
          policialId: cautela.policialId,
          policialNome: cautela.policialNome,
          materiais: cautela.materiais,
          dataConfirmacao: new Date(),
          livroId: cautela.livroId
        });
      }

      setMensagemSucesso("Recebimento confirmado com sucesso!");
      setSenha("");
      setCautelasAguardando([]);
      
      toast({
        title: "✅ Recebimento Confirmado",
        description: "Materiais recebidos com sucesso!",
      });

      // Limpar tela após 3 segundos
      setTimeout(() => {
        setMensagemSucesso("");
        setPolicialEncontrado(null);
        setSearchTerm("");
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

  // Limpar e voltar
  const handleVoltar = () => {
    setPolicialEncontrado(null);
    setCautelasAguardando([]);
    setSearchTerm("");
    setSenha("");
    setMensagemSucesso("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="h-12 w-12 text-amber-500" />
            <h1 className="text-3xl font-bold text-white">RESERVA DE ARMAMENTO</h1>
          </div>
          <p className="text-xl text-slate-300">Confirmação de Recebimento</p>
        </div>

        {/* Mensagem de Sucesso */}
        {mensagemSucesso && (
          <Card className="mb-6 border-green-500 bg-green-500/20">
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <p className="text-2xl font-bold text-green-400">{mensagemSucesso}</p>
            </CardContent>
          </Card>
        )}

        {/* Identificação do Policial */}
        {!policialEncontrado ? (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <User className="h-6 w-6" />
                Identificação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Digite sua Matrícula ou Numeral
                </label>
                <Input
                  type="text"
                  placeholder="Ex: 123456 ou 45"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && buscarPolicial()}
                  className="text-2xl h-16 text-center bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>
              
              <Button
                onClick={buscarPolicial}
                disabled={buscando}
                className="w-full h-14 text-xl bg-amber-600 hover:bg-amber-700"
              >
                {buscando ? (
                  <>
                    <Loader2 className="h-6 w-6 mr-2 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-6 w-6 mr-2" />
                    BUSCAR
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Policial Identificado */}
            <Card className="mb-6 bg-slate-800/50 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <User className="h-8 w-8 text-amber-500" />
                    <div>
                      <p className="text-xl font-bold text-white">
                        {policialEncontrado.nomeGuerra || policialEncontrado.nome}
                      </p>
                      <p className="text-sm text-slate-400">
                        Matrícula: {policialEncontrado.matricula}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAtualizar}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Atualizar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleVoltar}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      Sair
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Materiais Aguardando */}
            <Card className="mb-6 bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Package className="h-6 w-6 text-amber-500" />
                  Materiais Aguardando Confirmação
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cautelasAguardando.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                    <p className="text-lg text-slate-400">
                      Nenhum material aguardando confirmação
                    </p>
                    <p className="text-sm text-slate-500 mt-2">
                      Clique em "Atualizar" para verificar novamente
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cautelasAguardando.map((cautela) => (
                      <div key={cautela.id} className="space-y-2">
                        <div className="text-xs text-slate-500">
                          Registrado às {cautela.horaCautela}
                        </div>
                        {cautela.materiais.map((material, idx) => (
                          <div
                            key={`${cautela.id}-${idx}`}
                            className="p-4 bg-slate-700/50 rounded-lg border border-slate-600"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-lg font-semibold text-white">
                                  {material.nome}
                                  {material.modelo && ` ${material.modelo}`}
                                </p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {material.numeroSerie && (
                                    <Badge variant="outline" className="border-amber-500 text-amber-400">
                                      Série: {material.numeroSerie}
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className="border-slate-500 text-slate-300">
                                    Qtd: {material.quantidade}
                                  </Badge>
                                  {material.carregadores && (
                                    <Badge variant="outline" className="border-blue-500 text-blue-400">
                                      {material.carregadores} carregadores
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Confirmação com Senha */}
            {cautelasAguardando.length > 0 && (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Lock className="h-6 w-6 text-amber-500" />
                    Confirmar Recebimento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Digite sua senha para confirmar
                    </label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleConfirmarRecebimento()}
                      className="text-xl h-14 text-center bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  
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
            )}
          </>
        )}

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-slate-500">
            Sistema de Reserva de Armamento - Totem de Confirmação
          </p>
        </div>
      </div>
    </div>
  );
};

export default TotemPolicialInterface;
