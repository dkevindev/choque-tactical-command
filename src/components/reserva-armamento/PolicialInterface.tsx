import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Lock, Check, X, Clock, Package, Shield, Key, CheckCircle, AlertCircle, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { collection, query, where, onSnapshot, updateDoc, doc, addDoc, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';

interface Policial {
  id: string;
  'Matrícula': string | number;
  NOME: string;
  'Post/Grad': string;
  'SITUAÇÃO': string;
  senha?: string;
}

interface ReservaAtiva {
  id: string;
  policialId: string;
  armeiro: string;
  materiais: Array<{
    materialId: string;
    nome: string;
    categoria: string;
    quantidade: number;
    confirmado: boolean;
  }>;
  status: 'ativo' | 'finalizado';
  createdAt: Date;
}

const PolicialInterface = () => {
  const [step, setStep] = useState<'login' | 'reservas'>('login');
  const [policialLogado, setPolicialLogado] = useState<Policial | null>(null);
  const [matricula, setMatricula] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [reservaAtiva, setReservaAtiva] = useState<ReservaAtiva | null>(null);
  const [materiaisSelecionados, setMateriaisSelecionados] = useState<string[]>([]);
  
  const { toast } = useToast();

  // Auto logout após 2 minutos de inatividade
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (policialLogado) {
      const resetTimeout = () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          logout();
          toast({
            title: "Sessão Expirada",
            description: "Faça login novamente para continuar.",
            variant: "destructive",
          });
        }, 120000); // 2 minutos
      };

      resetTimeout();
      
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
      events.forEach(event => {
        document.addEventListener(event, resetTimeout, true);
      });

      return () => {
        clearTimeout(timeout);
        events.forEach(event => {
          document.removeEventListener(event, resetTimeout, true);
        });
      };
    }
  }, [policialLogado]);

  const verificarCredenciais = async (mat: string, pass: string): Promise<Policial | null> => {
    try {
      console.log('🔍 Tentando login com matrícula:', mat, 'e senha:', pass);
      
      // Buscar policial no Firebase por matrícula (tentar como número e string)
      let querySnapshot = await getDocs(
        query(collection(db, 'policiais'), where('Matrícula', '==', parseInt(mat)))
      );
      
      // Se não encontrou como número, tentar como string
      if (querySnapshot.empty) {
        console.log('Não encontrou como número, tentando como string');
        querySnapshot = await getDocs(
          query(collection(db, 'policiais'), where('Matrícula', '==', mat))
        );
      }
      
      if (querySnapshot.empty) {
        console.log('❌ Policial não encontrado no Firebase');
        return null;
      }

      const docSnapshot = querySnapshot.docs[0];
      const data = docSnapshot.data();
      console.log('📊 Dados do policial encontrado:', data);

      // Verificar senha (se existir o campo senha)
      if (data.senha && data.senha !== pass) {
        console.log('❌ Senha incorreta');
        return null;
      }

      // Se não tem campo senha, aceitar qualquer senha para testes
      if (!data.senha) {
        console.log('⚠️ Policial sem senha cadastrada, permitindo acesso');
      }

      return {
        id: docSnapshot.id,
        ...data
      } as Policial;

    } catch (error) {
      console.error('❌ Erro ao verificar credenciais:', error);
      return null;
    }
  };

  const handleLogin = async () => {
    if (!matricula || !senha) {
      toast({
        title: "Erro",
        description: "Informe matrícula e senha.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      const policial = await verificarCredenciais(matricula, senha);
      
      if (!policial) {
        toast({
          title: "Erro de Login",
          description: "Matrícula ou senha incorretos.",
          variant: "destructive",
        });
        return;
      }

      setPolicialLogado(policial);
      setMatricula('');
      setSenha('');
      setStep('reservas');
      
      // Configurar listener para reservas do policial
      setupReservaListener(policial.id);
      
      toast({
        title: "Login Realizado",
        description: `Bem-vindo, ${policial.NOME}!`,
      });
      
    } catch (error) {
      console.error('Erro no login:', error);
      toast({
        title: "Erro",
        description: "Erro interno do sistema.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setupReservaListener = (policialId: string) => {
    console.log('🔍 Configurando listener para reservas do policial:', policialId);
    
    const q = query(
      collection(db, 'reservas_ativas'),
      where('policialId', '==', policialId),
      where('status', '==', 'ativo')
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      if (!querySnapshot.empty) {
        const reserva = {
          id: querySnapshot.docs[0].id,
          ...querySnapshot.docs[0].data()
        } as ReservaAtiva;
        console.log('📊 Reserva ativa encontrada:', reserva);
        setReservaAtiva(reserva);
      } else {
        console.log('ℹ️ Nenhuma reserva ativa encontrada');
        setReservaAtiva(null);
      }
    }, (error) => {
      console.error('❌ Erro ao escutar reservas:', error);
    });

    return unsubscribe;
  };

  const confirmarMaterial = (materialId: string) => {
    if (materiaisSelecionados.includes(materialId)) {
      setMateriaisSelecionados(prev => prev.filter(id => id !== materialId));
      toast({
        title: "Material Desmarcado",
        description: "Material removido da confirmação.",
      });
    } else {
      setMateriaisSelecionados(prev => [...prev, materialId]);
      toast({
        title: "Material Confirmado",
        description: "Material marcado para confirmação.",
      });
    }
  };

  const finalizarRecebimento = async () => {
    if (!reservaAtiva || materiaisSelecionados.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um material para confirmar.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Atualizar materiais confirmados
      const materiaisAtualizados = reservaAtiva.materiais.map(material => ({
        ...material,
        confirmado: materiaisSelecionados.includes(material.materialId)
      }));

      await updateDoc(doc(db, 'reservas_ativas', reservaAtiva.id), {
        materiais: materiaisAtualizados
      });

      // Criar registro de movimentação
      await addDoc(collection(db, 'movimentacoes_belicas'), {
        policialId: policialLogado!.id,
        armeiro: reservaAtiva.armeiro,
        materiais: materiaisAtualizados.filter(m => m.confirmado),
        tipo: 'cautela',
        assinatura: {
          matricula: policialLogado!['Matrícula'],
          timestamp: new Date()
        },
        createdAt: new Date()
      });

      // Verificar se todos os materiais foram confirmados
      const todosConfirmados = materiaisAtualizados.every(m => m.confirmado);
      if (todosConfirmados) {
        await updateDoc(doc(db, 'reservas_ativas', reservaAtiva.id), {
          status: 'finalizado'
        });
      }

      toast({
        title: "Recebimento Confirmado",
        description: `${materiaisSelecionados.length} materiais confirmados com sucesso.`,
      });

      setMateriaisSelecionados([]);
      
      // Fazer logout após confirmação
      setTimeout(() => {
        logout();
      }, 2000);
      
    } catch (error) {
      console.error('Erro ao confirmar recebimento:', error);
      toast({
        title: "Erro",
        description: "Erro ao confirmar recebimento dos materiais.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setPolicialLogado(null);
    setReservaAtiva(null);
    setMateriaisSelecionados([]);
    setMatricula('');
    setSenha('');
    setStep('login');
  };

  if (step === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
              <User className="h-6 w-6" />
              Acesso do Policial
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Matrícula</label>
              <Input
                placeholder="Digite sua matrícula"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Senha</label>
              <Input
                type="password"
                placeholder="Digite sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            
            <Button 
              onClick={handleLogin}
              disabled={loading}
              className="w-full"
            >
              <Lock className="h-4 w-4 mr-2" />
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>

            <div className="text-xs text-muted-foreground text-center">
              Sistema de Reserva de Armamento - Firebase
            </div>
            
            <div className="text-xs text-yellow-600 text-center border border-yellow-200 rounded p-2 bg-yellow-50">
              💡 Use qualquer matrícula cadastrada no sistema. Se não há campo senha, use qualquer senha.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="container mx-auto max-w-4xl space-y-6">
        {/* Header com info do usuário */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold">{policialLogado?.NOME}</h1>
                <p className="text-sm text-muted-foreground">
                  {policialLogado?.['Post/Grad']} - Mat: {policialLogado?.['Matrícula']}
                </p>
              </div>
              <Button variant="destructive" size="sm" onClick={logout}>
                Sair
              </Button>
            </div>
          </CardContent>
        </Card>

        {reservaAtiva ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <Clock className="h-5 w-5" />
                Reserva Pendente - Confirme o Recebimento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-orange-50 rounded-lg">
                <p className="text-sm font-medium">
                  Armeiro: {reservaAtiva.armeiro}
                </p>
                <p className="text-xs text-muted-foreground">
                  Enviado em: {reservaAtiva.createdAt.toLocaleString()}
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Materiais Enviados:</h4>
                {reservaAtiva.materiais.map((material, index) => {
                  const isConfirmado = materiaisSelecionados.includes(material.materialId);
                  
                  return (
                    <div
                      key={index}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        isConfirmado
                          ? 'bg-green-50 border-green-200'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                      onClick={() => confirmarMaterial(material.materialId)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {material.nome}
                            {isConfirmado && <CheckCircle className="h-4 w-4 text-green-600" />}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {material.categoria} - Quantidade: {material.quantidade}
                          </div>
                        </div>
                        <Badge variant={isConfirmado ? "default" : "outline"}>
                          {isConfirmado ? 'Selecionado' : 'Pendente'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Separator />

              <div className="flex gap-3">
                <Button
                  onClick={finalizarRecebimento}
                  disabled={materiaisSelecionados.length === 0 || loading}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Confirmar Recebimento ({materiaisSelecionados.length})
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setMateriaisSelecionados([])}
                >
                  <X className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma Reserva Ativa</h3>
              <p className="text-muted-foreground">
                Você não possui materiais aguardando confirmação no momento.
              </p>
              <div className="mt-6 flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <span className="text-sm text-muted-foreground">
                  Sistema em tempo real - Firebase
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PolicialInterface;