import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, User, XCircle, KeyRound, AlertTriangle, Package, Plus, Minus } from "lucide-react";
import { doc, onSnapshot, getDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from '@/hooks/use-toast';
import SeletorMateriaisModal from './SeletorMateriaisModal';

interface MaterialSelecionado {
  materialId?: string;
  id?: string;
  nome: string;
  quantidade: number;
  categoria?: string;
  numeroSerie?: string;
  carregadores?: number;
}

interface Material {
  id: string;
  nome: string;
  categoria: string;
  tipoArma?: string;
  calibre?: string;
  numeroSerie?: string;
  quantidade?: number;
  disponivel: boolean;
}

interface ModalAguardandoConfirmacaoProps {
  open: boolean;
  onClose: () => void;
  cautelaId: string;
  policialId: string;
  policialNome: string;
  materiais: MaterialSelecionado[];
  onConfirmado: () => void;
  onCancelar: () => void;
  onMateriaisAtualizados?: (materiais: MaterialSelecionado[]) => void;
}

type Etapa = 'senha' | 'primeiro_acesso' | 'resetar_senha' | 'confirmado' | 'adicionar_material';

const ModalAguardandoConfirmacao: React.FC<ModalAguardandoConfirmacaoProps> = ({
  open,
  onClose,
  cautelaId,
  policialId,
  policialNome,
  materiais,
  onConfirmado,
  onCancelar,
  onMateriaisAtualizados
}) => {
  const [etapa, setEtapa] = useState<Etapa>('senha');
  const [loading, setLoading] = useState(false);
  const [materiaisAtuais, setMateriaisAtuais] = useState<MaterialSelecionado[]>(materiais);
  
  // Senha do policial
  const [senhaPolicial, setSenhaPolicial] = useState('');
  const [erroSenha, setErroSenha] = useState('');
  const senhaInputRef = useRef<HTMLInputElement>(null);
  
  // Primeiro acesso
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
  const [erroNovaSenha, setErroNovaSenha] = useState('');
  
  // Resetar senha
  const [senhaArmeiro, setSenhaArmeiro] = useState('');
  const [erroSenhaArmeiro, setErroSenhaArmeiro] = useState('');
  
  // Adicionar material
  const [materiaisDisponiveis, setMateriaisDisponiveis] = useState<Material[]>([]);
  const [materialSelecionado, setMaterialSelecionado] = useState<string>('');
  const [quantidadeMaterial, setQuantidadeMaterial] = useState(1);
  const [loadingMateriais, setLoadingMateriais] = useState(false);
  
  // Sincronizar materiais quando props mudam
  useEffect(() => {
    setMateriaisAtuais(materiais);
  }, [materiais]);
  
  // Reset estados quando modal abre e inicializa sessão de digitação
  useEffect(() => {
    if (open) {
      setEtapa('senha');
      setSenhaPolicial('');
      setErroSenha('');
      setNovaSenha('');
      setConfirmarNovaSenha('');
      setErroNovaSenha('');
      setSenhaArmeiro('');
      setErroSenhaArmeiro('');
      setLoading(false);
      setMaterialSelecionado('');
      setQuantidadeMaterial(1);
      setMateriaisAtuais(materiais);

      // Inicializar sessão de digitação no Firebase para o totem espelhar
      if (cautelaId) {
        updateDoc(doc(db, 'cautelas_provisorias', cautelaId), {
          sessaoDigitacao: {
            etapa: 'senha',
            senhaLength: 0,
            erro: null,
            timestamp: Date.now()
          }
        }).catch(console.error);
      }
    }
  }, [open, cautelaId, materiais]);
  
  // Carregar materiais disponíveis quando entra na etapa de adicionar material
  const carregarMateriaisDisponiveis = async () => {
    try {
      setLoadingMateriais(true);
      const querySnapshot = await getDocs(
        query(collection(db, 'materiais_belicos'), where('disponivel', '==', true))
      );
      
      const materiaisData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Material));
      
      // Filtrar materiais que já estão na cautela (exceto munição que pode ser adicionada)
      const materiaisJaNaCautela = materiaisAtuais.map(m => m.materialId);
      const materiaisFiltrados = materiaisData.filter(m => {
        const isMunicao = m.categoria?.toLowerCase().includes('munição') || 
                         m.categoria?.toLowerCase().includes('municao');
        // Munição pode ser adicionada novamente, outros materiais não
        return isMunicao || !materiaisJaNaCautela.includes(m.id);
      });
      
      setMateriaisDisponiveis(materiaisFiltrados);
    } catch (error) {
      console.error('Erro ao carregar materiais:', error);
    } finally {
      setLoadingMateriais(false);
    }
  };
  
  // Adicionar material à cautela
  const handleAdicionarMaterial = async () => {
    if (!materialSelecionado) {
      toast({
        title: "Atenção",
        description: "Selecione um material para adicionar.",
        variant: "destructive"
      });
      return;
    }
    
    const material = materiaisDisponiveis.find(m => m.id === materialSelecionado);
    if (!material) return;
    
    try {
      setLoading(true);
      
      const novoMaterial: MaterialSelecionado = {
        materialId: material.id,
        nome: material.nome,
        quantidade: quantidadeMaterial,
        categoria: material.categoria,
        numeroSerie: material.numeroSerie
      };
      
      const novosMateriaisAtuais = [...materiaisAtuais, novoMaterial];
      
      // Atualizar no Firebase
      await updateDoc(doc(db, 'cautelas_provisorias', cautelaId), {
        materiais: novosMateriaisAtuais.map(m => ({
          materialId: m.materialId || m.id,
          nome: m.nome,
          quantidade: m.quantidade,
          categoria: m.categoria,
          ...(m.numeroSerie && { numeroSerie: m.numeroSerie }),
          ...(m.carregadores && { carregadores: m.carregadores })
        }))
      });
      
      // Marcar material como indisponível (se não for munição)
      const isMunicao = material.categoria?.toLowerCase().includes('munição') || 
                       material.categoria?.toLowerCase().includes('municao');
      
      if (isMunicao && material.quantidade) {
        const novaQuantidade = Math.max(0, material.quantidade - quantidadeMaterial);
        await updateDoc(doc(db, 'materiais_belicos', material.id), {
          quantidade: novaQuantidade,
          ...(novaQuantidade <= 0 && { disponivel: false })
        });
      } else {
        await updateDoc(doc(db, 'materiais_belicos', material.id), {
          disponivel: false,
          cauteladoPara: policialId,
          dataCautela: new Date()
        });
      }
      
      // Atualizar estado local
      setMateriaisAtuais(novosMateriaisAtuais);
      onMateriaisAtualizados?.(novosMateriaisAtuais);
      
      toast({
        title: "Material Adicionado",
        description: `${material.nome} foi adicionado à cautela.`
      });
      
      // Voltar para etapa de senha
      setMaterialSelecionado('');
      setQuantidadeMaterial(1);
      setEtapa('senha');
      
    } catch (error) {
      console.error('Erro ao adicionar material:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar material. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Sincronizar tamanho da senha com Firebase (para o totem espelhar)
  useEffect(() => {
    if (open && cautelaId && etapa === 'senha') {
      updateDoc(doc(db, 'cautelas_provisorias', cautelaId), {
        'sessaoDigitacao.senhaLength': senhaPolicial.length,
        'sessaoDigitacao.erro': null,
        'sessaoDigitacao.timestamp': Date.now()
      }).catch(console.error);
    }
  }, [senhaPolicial, open, cautelaId, etapa]);

  // Sincronizar tamanho da nova senha (primeiro acesso)
  useEffect(() => {
    if (open && cautelaId && etapa === 'primeiro_acesso') {
      updateDoc(doc(db, 'cautelas_provisorias', cautelaId), {
        'sessaoDigitacao.etapa': 'primeiro_acesso',
        'sessaoDigitacao.senhaLength': novaSenha.length,
        'sessaoDigitacao.confirmarSenhaLength': confirmarNovaSenha.length,
        'sessaoDigitacao.erro': null,
        'sessaoDigitacao.timestamp': Date.now()
      }).catch(console.error);
    }
  }, [novaSenha, confirmarNovaSenha, open, cautelaId, etapa]);

  // Atualizar etapa no Firebase quando muda
  useEffect(() => {
    if (open && cautelaId) {
      updateDoc(doc(db, 'cautelas_provisorias', cautelaId), {
        'sessaoDigitacao.etapa': etapa,
        'sessaoDigitacao.senhaLength': 0,
        'sessaoDigitacao.timestamp': Date.now()
      }).catch(console.error);
    }
  }, [etapa, open, cautelaId]);

  // 🔥 REALTIME: Escutar mudanças no status da cautela para detectar confirmação externa
  useEffect(() => {
    if (!open || !cautelaId) return;

    console.log('[ModalAguardando] Iniciando listener realtime para cautela:', cautelaId);

    const unsubscribe = onSnapshot(
      doc(db, 'cautelas_provisorias', cautelaId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // Se o status mudou para 'pendente' e ainda não estamos na etapa confirmado
          if (data.status === 'pendente' && etapa !== 'confirmado') {
            console.log('[ModalAguardando] Cautela confirmada via realtime');
            setEtapa('confirmado');
            
            setTimeout(() => {
              onConfirmado();
              onClose();
            }, 2000);
          }
        } else {
          // Documento foi deletado (cautela cancelada)
          console.log('[ModalAguardando] Cautela removida - fechando modal');
          onClose();
        }
      },
      (error) => {
        console.error('[ModalAguardando] Erro no listener realtime:', error);
      }
    );

    return () => {
      console.log('[ModalAguardando] Desconectando listener realtime');
      unsubscribe();
    };
  }, [open, cautelaId, etapa, onConfirmado, onClose]);

  // Auto-foco no campo de senha
  useEffect(() => {
    if (open && etapa === 'senha') {
      setTimeout(() => senhaInputRef.current?.focus(), 100);
    }
  }, [open, etapa]);

  // Validar senha do policial
  const handleValidarSenha = async () => {
    if (!senhaPolicial.trim()) {
      setErroSenha('Digite a senha do policial');
      return;
    }

    if (!policialId) {
      setErroSenha('ID do policial não encontrado');
      return;
    }

    setLoading(true);
    setErroSenha('');

    try {
      const policialDoc = await getDoc(doc(db, 'policiais', policialId));
      
      if (!policialDoc.exists()) {
        setErroSenha('Policial não encontrado');
        setLoading(false);
        return;
      }

      const policialData = policialDoc.data();
      const matricula = String(policialData['Matrícula'] || policialData.matricula || '');
      
      // Verificar se é primeiro acesso (não tem senha ou primeiroAcesso é true)
      const isPrimeiroAcesso = policialData.primeiroAcesso === true || !policialData.senha;
      
      // No primeiro acesso, a senha é a matrícula
      // Caso contrário, verificar a senha salva
      let senhaValida = false;
      
      if (isPrimeiroAcesso) {
        // Primeiro acesso: senha deve ser a matrícula
        senhaValida = senhaPolicial === matricula;
      } else {
        // Acesso normal: verificar senha cadastrada
        senhaValida = policialData.senha === senhaPolicial;
      }

      if (!senhaValida) {
        setErroSenha(isPrimeiroAcesso ? 'Senha incorreta. No primeiro acesso, use sua matrícula.' : 'Senha incorreta');
        
        // Notificar totem do erro
        if (cautelaId) {
          updateDoc(doc(db, 'cautelas_provisorias', cautelaId), {
            'sessaoDigitacao.erro': 'Senha incorreta',
            'sessaoDigitacao.senhaLength': 0,
            'sessaoDigitacao.timestamp': Date.now()
          }).catch(console.error);
        }
        
        setSenhaPolicial('');
        setLoading(false);
        setTimeout(() => senhaInputRef.current?.focus(), 100);
        return;
      }

      // Verificar se precisa criar nova senha (primeiro acesso)
      if (isPrimeiroAcesso) {
        setEtapa('primeiro_acesso');
        setLoading(false);
        return;
      }

      // Senha correta - confirmar recebimento
      await confirmarRecebimento();
    } catch (error) {
      console.error('Erro ao validar senha:', error);
      setErroSenha('Erro ao validar senha. Tente novamente.');
      setLoading(false);
    }
  };

  // Salvar nova senha (primeiro acesso)
  const handleSalvarNovaSenha = async () => {
    if (!novaSenha.trim()) {
      setErroNovaSenha('Digite a nova senha');
      return;
    }

    if (novaSenha.length < 4) {
      setErroNovaSenha('A senha deve ter no mínimo 4 caracteres');
      return;
    }

    if (novaSenha !== confirmarNovaSenha) {
      setErroNovaSenha('As senhas não coincidem');
      return;
    }

    setLoading(true);
    setErroNovaSenha('');

    try {
      // Atualizar senha do policial
      await updateDoc(doc(db, 'policiais', policialId), {
        senha: novaSenha,
        primeiroAcesso: false
      });

      toast({
        title: "✅ Senha definida com sucesso!",
        description: "A nova senha foi salva."
      });

      // Confirmar recebimento
      await confirmarRecebimento();
    } catch (error) {
      console.error('Erro ao salvar nova senha:', error);
      setErroNovaSenha('Erro ao salvar senha. Tente novamente.');
      setLoading(false);
    }
  };

  // Confirmar recebimento (atualiza status da cautela)
  const confirmarRecebimento = async () => {
    try {
      // Atualizar status da cautela para 'pendente' (recebido pelo policial)
      await updateDoc(doc(db, 'cautelas_provisorias', cautelaId), {
        status: 'pendente',
        dataConfirmacao: new Date().toISOString(),
        horaConfirmacao: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      });

      setEtapa('confirmado');
      
      // Auto-fechar após 3 segundos
      setTimeout(() => {
        onConfirmado();
        onClose();
      }, 3000);
    } catch (error) {
      console.error('Erro ao confirmar recebimento:', error);
      toast({
        title: "Erro",
        description: "Erro ao confirmar recebimento. Tente novamente.",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  // Validar senha do armeiro para resetar senha do policial
  const handleResetarSenha = async () => {
    if (!senhaArmeiro.trim()) {
      setErroSenhaArmeiro('Digite sua senha de armeiro');
      return;
    }

    setLoading(true);
    setErroSenhaArmeiro('');

    try {
      // Buscar armeiro logado
      const userStorage = localStorage.getItem('user');
      if (!userStorage) {
        setErroSenhaArmeiro('Usuário não logado');
        setLoading(false);
        return;
      }

      const userData = JSON.parse(userStorage);
      const armeiroDoc = await getDoc(doc(db, 'policiais', userData.id));

      if (!armeiroDoc.exists()) {
        setErroSenhaArmeiro('Armeiro não encontrado');
        setLoading(false);
        return;
      }

      const armeiroData = armeiroDoc.data();

      // Validar senha do armeiro
      if (armeiroData.senha !== senhaArmeiro) {
        setErroSenhaArmeiro('Senha do armeiro incorreta');
        setSenhaArmeiro('');
        setLoading(false);
        return;
      }

      // Buscar dados do policial para obter matrícula
      const policialDoc = await getDoc(doc(db, 'policiais', policialId));
      if (!policialDoc.exists()) {
        setErroSenhaArmeiro('Policial não encontrado');
        setLoading(false);
        return;
      }

      const policialData = policialDoc.data();
      const matricula = String(policialData['Matrícula'] || policialData.matricula || '');

      // Resetar senha do policial para matrícula + primeiro acesso
      await updateDoc(doc(db, 'policiais', policialId), {
        senha: matricula,
        primeiroAcesso: true
      });

      toast({
        title: "🔑 Senha resetada!",
        description: `A senha de ${policialNome} foi resetada para a matrícula. O policial deve definir uma nova senha.`
      });

      // Voltar para estado de primeiro acesso
      setEtapa('primeiro_acesso');
      setSenhaArmeiro('');
      setLoading(false);
    } catch (error) {
      console.error('Erro ao resetar senha:', error);
      setErroSenhaArmeiro('Erro ao resetar senha. Tente novamente.');
      setLoading(false);
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        {/* ETAPA: AGUARDANDO SENHA */}
        {etapa === 'senha' && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-lg font-bold text-foreground flex items-center justify-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                AGUARDANDO CONFIRMAÇÃO
              </h2>
            </div>

            {/* Policial */}
            <div className="flex items-center justify-center gap-2 p-2 bg-muted rounded-lg">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{policialNome}</span>
            </div>

            {/* Materiais */}
            {materiaisAtuais && materiaisAtuais.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 max-h-32 overflow-y-auto">
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  MATERIAIS ({materiaisAtuais.length}):
                </p>
                <div className="space-y-1">
                  {materiaisAtuais.map((m, idx) => (
                    <div key={idx} className="text-xs text-foreground">
                      • {m.nome}
                      {m.numeroSerie && <span className="text-muted-foreground"> - Série: {m.numeroSerie}</span>}
                      {m.quantidade > 1 && <span className="text-muted-foreground"> (Qtd: {m.quantidade})</span>}
                      {m.carregadores && m.carregadores > 0 && (
                        <span className="text-muted-foreground"> 📦 {m.carregadores} carreg.</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Campo de senha */}
            <div className="space-y-2">
              <Label htmlFor="senha-policial" className="text-sm">
                🔐 SENHA DO POLICIAL:
              </Label>
              <Input
                ref={senhaInputRef}
                id="senha-policial"
                type="password"
                value={senhaPolicial}
                onChange={(e) => setSenhaPolicial(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, handleValidarSenha)}
                placeholder="Digite a senha..."
                className="h-12 text-lg text-center"
                disabled={loading}
              />
              {erroSenha && (
                <p className="text-xs text-destructive text-center">{erroSenha}</p>
              )}
              <p className="text-xs text-muted-foreground text-center">
                Pressione ENTER para confirmar
              </p>
            </div>

            {/* Botão Confirmar */}
            <Button
              onClick={handleValidarSenha}
              disabled={loading || !senhaPolicial.trim()}
              className="w-full h-10 gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              CONFIRMAR RECEBIMENTO
            </Button>

            {/* Divisor */}
            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    carregarMateriaisDisponiveis();
                    setEtapa('adicionar_material');
                  }}
                  className="flex-1 text-xs gap-1"
                  disabled={loading}
                >
                  <Plus className="h-3 w-3" />
                  Adicionar Material
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEtapa('resetar_senha')}
                  className="flex-1 text-xs gap-1"
                  disabled={loading}
                >
                  <KeyRound className="h-3 w-3" />
                  Resetar Senha
                </Button>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={onCancelar}
                className="w-full text-xs gap-1"
                disabled={loading}
              >
                <XCircle className="h-3 w-3" />
                CANCELAR
              </Button>
            </div>
          </div>
        )}

        {/* ETAPA: PRIMEIRO ACESSO */}
        {etapa === 'primeiro_acesso' && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-lg font-bold text-foreground flex items-center justify-center gap-2">
                <KeyRound className="h-5 w-5 text-amber-500" />
                PRIMEIRO ACESSO
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Definir nova senha para {policialNome}
              </p>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                O policial precisa definir uma nova senha pessoal e intransferível.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="nova-senha" className="text-sm">Nova Senha:</Label>
                <Input
                  id="nova-senha"
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Digite a nova senha..."
                  className="h-10"
                  disabled={loading}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="confirmar-senha" className="text-sm">Confirmar Senha:</Label>
                <Input
                  id="confirmar-senha"
                  type="password"
                  value={confirmarNovaSenha}
                  onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, handleSalvarNovaSenha)}
                  placeholder="Confirme a nova senha..."
                  className="h-10"
                  disabled={loading}
                />
              </div>

              {erroNovaSenha && (
                <p className="text-xs text-destructive text-center">{erroNovaSenha}</p>
              )}
            </div>

            <Button
              onClick={handleSalvarNovaSenha}
              disabled={loading || !novaSenha.trim() || !confirmarNovaSenha.trim()}
              className="w-full h-10 gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              SALVAR E CONFIRMAR RECEBIMENTO
            </Button>

            <Button
              variant="outline"
              onClick={onCancelar}
              disabled={loading}
              className="w-full gap-2"
            >
              <XCircle className="h-4 w-4" />
              CANCELAR
            </Button>
          </div>
        )}

        {/* ETAPA: RESETAR SENHA (pede senha do armeiro) */}
        {etapa === 'resetar_senha' && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-lg font-bold text-foreground flex items-center justify-center gap-2">
                <KeyRound className="h-5 w-5 text-amber-500" />
                RESETAR SENHA
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Resetar senha de {policialNome}
              </p>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ⚠️ O policial esqueceu a senha? Digite SUA SENHA (armeiro) para autorizar o reset.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Após o reset, a senha será a matrícula do policial e ele deverá definir uma nova senha.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha-armeiro" className="text-sm">Senha do Armeiro:</Label>
              <Input
                id="senha-armeiro"
                type="password"
                value={senhaArmeiro}
                onChange={(e) => setSenhaArmeiro(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, handleResetarSenha)}
                placeholder="Digite sua senha de armeiro..."
                className="h-10"
                disabled={loading}
                autoFocus
              />
              {erroSenhaArmeiro && (
                <p className="text-xs text-destructive text-center">{erroSenhaArmeiro}</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleResetarSenha}
                disabled={loading || !senhaArmeiro.trim()}
                className="flex-1 h-10 gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                CONFIRMAR RESET
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEtapa('senha');
                  setSenhaArmeiro('');
                  setErroSenhaArmeiro('');
                }}
                disabled={loading}
                className="flex-1 h-10"
              >
                VOLTAR
              </Button>
            </div>
          </div>
        )}

        {/* ETAPA: ADICIONAR MATERIAL */}
        {etapa === 'adicionar_material' && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-lg font-bold text-foreground flex items-center justify-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                ADICIONAR MATERIAL
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Adicionar item à cautela de {policialNome}
              </p>
            </div>

            {/* Materiais atuais */}
            {materiaisAtuais.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 max-h-24 overflow-y-auto">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Materiais na cautela ({materiaisAtuais.length}):
                </p>
                <div className="space-y-1">
                  {materiaisAtuais.map((m, idx) => (
                    <div key={idx} className="text-xs text-foreground">
                      • {m.nome} {m.quantidade > 1 && `(${m.quantidade})`}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Seletor de Materiais com Abas */}
            <SeletorMateriaisModal
              materiaisDisponiveis={materiaisDisponiveis}
              materiaisExcluidos={materiaisAtuais.map(m => m.materialId || m.id || '')}
              onSelecionarMaterial={(material) => {
                setMaterialSelecionado(material.id);
                // Verificar se é munição para mostrar quantidade
                const isMunicao = material.categoria?.toLowerCase().includes('munição') || 
                                 material.categoria?.toLowerCase().includes('municao');
                if (isMunicao) {
                  setQuantidadeMaterial(30); // Valor padrão para munição
                } else {
                  setQuantidadeMaterial(1);
                }
              }}
              loading={loadingMateriais}
            />

            {/* Quantidade para o material selecionado */}
            {materialSelecionado && (
              <div className="space-y-2 p-3 bg-primary/5 rounded-lg border">
                <div className="font-medium text-sm">
                  {materiaisDisponiveis.find(m => m.id === materialSelecionado)?.nome}
                </div>
                <div className="flex items-center gap-3">
                  <Label className="text-sm">Quantidade:</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantidadeMaterial(Math.max(1, quantidadeMaterial - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    value={quantidadeMaterial}
                    onChange={(e) => setQuantidadeMaterial(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 text-center"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantidadeMaterial(quantidadeMaterial + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleAdicionarMaterial}
                disabled={loading || !materialSelecionado || loadingMateriais}
                className="flex-1 gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                ADICIONAR
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEtapa('senha');
                  setMaterialSelecionado('');
                  setQuantidadeMaterial(1);
                }}
                disabled={loading}
                className="flex-1"
              >
                VOLTAR
              </Button>
            </div>
          </div>
        )}

        {/* ETAPA: CONFIRMADO */}
        {etapa === 'confirmado' && (
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            
            <div>
              <h2 className="text-lg font-bold text-green-600 mb-1">
                ✅ MATERIAL RECEBIDO!
              </h2>
              
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
                <User className="h-4 w-4" />
                <span className="font-medium text-sm">{policialNome}</span>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Recebimento confirmado com sucesso!
              </p>
            </div>
            
            <Button
              onClick={() => {
                onConfirmado();
                onClose();
              }}
              className="w-full"
            >
              🔄 NOVO ATENDIMENTO
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ModalAguardandoConfirmacao;
