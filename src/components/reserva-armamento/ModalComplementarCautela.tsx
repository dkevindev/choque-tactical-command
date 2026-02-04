import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, Package, Plus, Minus, KeyRound, RotateCcw, X } from "lucide-react";
import { doc, getDoc, updateDoc, collection, getDocs, query, where, onSnapshot, deleteField } from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from '@/hooks/use-toast';
import SeletorMateriaisModal from './SeletorMateriaisModal';
import ModalQuantidadeMaterial from './ModalQuantidadeMaterial';
import { buscarPolicialPorId } from '@/lib/policialUtils';

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

interface MaterialSelecionado {
  materialId: string;
  nome: string;
  quantidade: number;
  categoria?: string;
  numeroSerie?: string;
  carregadores?: number;
}

interface ModalComplementarCautelaProps {
  open: boolean;
  onClose: () => void;
  cautelaId: string;
  policialId: string;
  policialNome: string;
  materiaisAtuais: MaterialSelecionado[];
  onComplementado: () => void;
}

type Etapa = 'selecao' | 'aguardando' | 'confirmado';

const ModalComplementarCautela: React.FC<ModalComplementarCautelaProps> = ({
  open,
  onClose,
  cautelaId,
  policialId,
  policialNome,
  materiaisAtuais,
  onComplementado
}) => {
  const [etapa, setEtapa] = useState<Etapa>('selecao');
  const [loading, setLoading] = useState(false);
  const [loadingMateriais, setLoadingMateriais] = useState(false);
  
  const [materiaisDisponiveis, setMateriaisDisponiveis] = useState<Material[]>([]);
  const [materialSelecionado, setMaterialSelecionado] = useState<string>('');
  const [quantidadeMaterial, setQuantidadeMaterial] = useState(1);
  const [materiaisAdicionados, setMateriaisAdicionados] = useState<MaterialSelecionado[]>([]);
  
  // Modal de quantidade (munição ou arma com carregadores)
  const [modalQuantidade, setModalQuantidade] = useState(false);
  const [materialParaQuantidade, setMaterialParaQuantidade] = useState<Material | null>(null);
  const [tipoQuantidade, setTipoQuantidade] = useState<'municao' | 'arma'>('municao');
  
  // Estados para integração com Totem
  const [senhaPolicial, setSenhaPolicial] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [erroSenha, setErroSenha] = useState('');
  const [isPrimeiroAcesso, setIsPrimeiroAcesso] = useState(false);
  const [etapaTotem, setEtapaTotem] = useState<'senha' | 'primeiro_acesso' | 'resetar_senha'>('senha');
  const [senhaArmeiro, setSenhaArmeiro] = useState('');
  const [armeiroId, setArmeiroId] = useState<string | null>(null);
  
  const inputSenhaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      carregarMateriaisDisponiveis();
      carregarArmeiroId();
      setEtapa('selecao');
      setMaterialSelecionado('');
      setQuantidadeMaterial(1);
      setMateriaisAdicionados([]);
      setSenhaPolicial('');
      setConfirmarSenha('');
      setErroSenha('');
      setIsPrimeiroAcesso(false);
      setEtapaTotem('senha');
      setSenhaArmeiro('');
    }
  }, [open]);

  const carregarArmeiroId = async () => {
    try {
      // Buscar o livro aberto atual para obter o armeiroId
      const livrosSnap = await getDocs(
        query(collection(db, 'livros_reserva_armamento'), where('status', '==', 'aberto'))
      );
      if (!livrosSnap.empty) {
        const livroData = livrosSnap.docs[0].data();
        setArmeiroId(livroData.armeiroId);
      }
    } catch (error) {
      console.error('Erro ao carregar armeiroId:', error);
    }
  };

  // Listener para detectar quando o complemento foi confirmado
  useEffect(() => {
    if (etapa !== 'aguardando' || !cautelaId) return;

    const unsubscribe = onSnapshot(
      doc(db, 'cautelas_provisorias', cautelaId),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          // Se statusComplemento foi removido ou é 'confirmado', significa que foi processado
          if (!data.statusComplemento || data.statusComplemento === 'confirmado') {
            setEtapa('confirmado');
            setTimeout(() => {
              onComplementado();
              onClose();
            }, 1500);
          }
        }
      }
    );

    return () => unsubscribe();
  }, [etapa, cautelaId]);

  // Sincronizar digitação de senha com Firebase (para o Totem)
  useEffect(() => {
    if (etapa !== 'aguardando') return;

    const sincronizar = async () => {
      try {
        await updateDoc(doc(db, 'cautelas_provisorias', cautelaId), {
          'sessaoDigitacao.senhaLength': senhaPolicial.length,
          'sessaoDigitacao.confirmarSenhaLength': confirmarSenha.length,
          'sessaoDigitacao.timestamp': Date.now()
        });
      } catch (error) {
        console.error('Erro ao sincronizar digitação:', error);
      }
    };

    sincronizar();
  }, [senhaPolicial, confirmarSenha, etapa]);

  // Sincronizar erro com Firebase
  useEffect(() => {
    if (etapa !== 'aguardando') return;

    const sincronizarErro = async () => {
      try {
        // Usar string vazia em vez de null para evitar undefined
        await updateDoc(doc(db, 'cautelas_provisorias', cautelaId), {
          'sessaoDigitacao.erro': erroSenha || '',
          'sessaoDigitacao.timestamp': Date.now()
        });
      } catch (error) {
        console.error('Erro ao sincronizar erro:', error);
      }
    };

    sincronizarErro();
  }, [erroSenha, etapa, cautelaId]);

  // Sincronizar etapa com Firebase
  useEffect(() => {
    if (etapa !== 'aguardando') return;

    const sincronizarEtapa = async () => {
      try {
        await updateDoc(doc(db, 'cautelas_provisorias', cautelaId), {
          'sessaoDigitacao.etapa': etapaTotem,
          'sessaoDigitacao.timestamp': Date.now()
        });
      } catch (error) {
        console.error('Erro ao sincronizar etapa:', error);
      }
    };

    sincronizarEtapa();
  }, [etapaTotem, etapa]);

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
      
      // Filtrar materiais que já estão na cautela (exceto munição)
      const materiaisJaNaCautela = materiaisAtuais.map(m => m.materialId);
      const materiaisFiltrados = materiaisData.filter(m => {
        const isMunicao = m.categoria?.toLowerCase().includes('munição') || 
                         m.categoria?.toLowerCase().includes('municao');
        return isMunicao || !materiaisJaNaCautela.includes(m.id);
      });
      
      setMateriaisDisponiveis(materiaisFiltrados);
    } catch (error) {
      console.error('Erro ao carregar materiais:', error);
    } finally {
      setLoadingMateriais(false);
    }
  };

  const handleAdicionarALista = () => {
    if (!materialSelecionado) return;
    
    const material = materiaisDisponiveis.find(m => m.id === materialSelecionado);
    if (!material) return;
    
    const novoMaterial: MaterialSelecionado = {
      materialId: material.id,
      nome: material.nome,
      quantidade: quantidadeMaterial,
      categoria: material.categoria,
      numeroSerie: material.numeroSerie
    };
    
    setMateriaisAdicionados(prev => [...prev, novoMaterial]);
    setMaterialSelecionado('');
    setQuantidadeMaterial(1);
    
    // Remover da lista de disponíveis (exceto munição)
    const isMunicao = material.categoria?.toLowerCase().includes('munição') || 
                     material.categoria?.toLowerCase().includes('municao');
    if (!isMunicao) {
      setMateriaisDisponiveis(prev => prev.filter(m => m.id !== material.id));
    }
  };

  const handleRemoverDaLista = (index: number) => {
    const material = materiaisAdicionados[index];
    setMateriaisAdicionados(prev => prev.filter((_, i) => i !== index));
    
    // Adicionar de volta aos disponíveis (se não for munição)
    const isMunicao = material.categoria?.toLowerCase().includes('munição') || 
                     material.categoria?.toLowerCase().includes('municao');
    if (!isMunicao) {
      const materialOriginal = {
        id: material.materialId,
        nome: material.nome,
        categoria: material.categoria || '',
        numeroSerie: material.numeroSerie,
        disponivel: true
      } as Material;
      setMateriaisDisponiveis(prev => [...prev, materialOriginal]);
    }
  };

  const handleIniciarConfirmacao = async () => {
    try {
      setLoading(true);

      // Verificar se é primeiro acesso do policial
      const policial = await buscarPolicialPorId(policialId);
      if (policial) {
        const senhaPol = policial.senha;
        const primeiroAcesso = policial.primeiroAcesso === true || !senhaPol || senhaPol === '';
        setIsPrimeiroAcesso(primeiroAcesso);
        setEtapaTotem(primeiroAcesso ? 'primeiro_acesso' : 'senha');
      }

      // Atualizar cautela com status de complemento aguardando
      const primeiroAcessoAtual = isPrimeiroAcesso;
      await updateDoc(doc(db, 'cautelas_provisorias', cautelaId), {
        statusComplemento: 'aguardando_confirmacao',
        materiaisComplemento: materiaisAdicionados.map(m => ({
          materialId: m.materialId,
          nome: m.nome,
          quantidade: m.quantidade,
          ...(m.categoria && { categoria: m.categoria }),
          ...(m.numeroSerie && { numeroSerie: m.numeroSerie }),
          ...(m.carregadores !== undefined && { carregadores: m.carregadores })
        })),
        sessaoDigitacao: {
          etapa: primeiroAcessoAtual ? 'primeiro_acesso' : 'senha',
          senhaLength: 0,
          confirmarSenhaLength: 0,
          erro: '',
          timestamp: Date.now()
        }
      });

      setEtapa('aguardando');
      
      // Focar no input de senha
      setTimeout(() => {
        inputSenhaRef.current?.focus();
      }, 100);
    } catch (error) {
      console.error('Erro ao iniciar confirmação:', error);
      toast({
        title: "Erro",
        description: "Erro ao iniciar confirmação. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarComSenha = async () => {
    if (!senhaPolicial.trim()) {
      setErroSenha('Digite a senha');
      return;
    }

    try {
      setLoading(true);
      setErroSenha('');

      // Buscar policial com fallback
      const policial = await buscarPolicialPorId(policialId);
      
      if (!policial) {
        setErroSenha('Policial não encontrado');
        setLoading(false);
        return;
      }

      // Verificar primeiro acesso
      const senhaPol = policial.senha;
      const primeiroAcesso = policial.primeiroAcesso === true || !senhaPol || senhaPol === '';

      if (primeiroAcesso) {
        // Primeiro acesso: definir nova senha
        if (confirmarSenha !== senhaPolicial) {
          setErroSenha('Senhas não conferem');
          setSenhaPolicial('');
          setConfirmarSenha('');
          setLoading(false);
          return;
        }

        // Salvar nova senha
        const policialDocRef = doc(db, 'policiais', policial.id);
        await updateDoc(policialDocRef, {
          senha: senhaPolicial,
          primeiroAcesso: false
        });
      } else {
        // Validar senha normal
        if (senhaPol !== senhaPolicial) {
          setErroSenha('Senha incorreta');
          setSenhaPolicial('');
          setLoading(false);
          return;
        }
      }

      // Atualizar sessão para confirmado
      await updateDoc(doc(db, 'cautelas_provisorias', cautelaId), {
        'sessaoDigitacao.etapa': 'confirmado'
      });

      // Atualizar cautela no Firebase com os novos materiais
      const novosMateriais = [...materiaisAtuais, ...materiaisAdicionados];
      
      await updateDoc(doc(db, 'cautelas_provisorias', cautelaId), {
        materiais: novosMateriais.map(m => ({
          materialId: m.materialId,
          nome: m.nome,
          quantidade: m.quantidade,
          ...(m.categoria && { categoria: m.categoria }),
          ...(m.numeroSerie && { numeroSerie: m.numeroSerie }),
          ...(m.carregadores !== undefined && { carregadores: m.carregadores })
        })),
        statusComplemento: deleteField(),
        materiaisComplemento: deleteField(),
        sessaoDigitacao: deleteField()
      });

      // Marcar novos materiais como indisponíveis
      for (const material of materiaisAdicionados) {
        const materialRef = doc(db, 'materiais_belicos', material.materialId);
        const materialDoc = await getDoc(materialRef);
        
        if (materialDoc.exists()) {
          const materialData = materialDoc.data();
          const isMunicao = materialData?.categoria?.toLowerCase().includes('munição') || 
                           materialData?.categoria?.toLowerCase().includes('municao');
          
          if (isMunicao && materialData?.quantidade) {
            const novaQuantidade = Math.max(0, materialData.quantidade - material.quantidade);
            await updateDoc(materialRef, {
              quantidade: novaQuantidade,
              ...(novaQuantidade <= 0 && { disponivel: false })
            });
          } else {
            await updateDoc(materialRef, {
              disponivel: false,
              cauteladoPara: policialId,
              dataCautela: new Date()
            });
          }
        }
      }

      toast({
        title: "Cautela Complementada",
        description: `${materiaisAdicionados.length} material(is) adicionado(s) à cautela.`
      });

      setEtapa('confirmado');
      
      setTimeout(() => {
        onComplementado();
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Erro ao complementar cautela:', error);
      toast({
        title: "Erro",
        description: "Erro ao complementar cautela. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetarSenha = async () => {
    if (!senhaArmeiro.trim()) {
      setErroSenha('Digite a senha do armeiro');
      return;
    }

    try {
      setLoading(true);

      // Verificar senha do armeiro
      if (armeiroId) {
        const armeiroDoc = await getDoc(doc(db, 'policiais', armeiroId));
        if (armeiroDoc.exists()) {
          const armeiroData = armeiroDoc.data();
          if (armeiroData.senha !== senhaArmeiro) {
            setErroSenha('Senha do armeiro incorreta');
            setSenhaArmeiro('');
            setLoading(false);
            return;
          }
        }
      }

      // Resetar senha do policial
      const policial = await buscarPolicialPorId(policialId);
      if (policial) {
        await updateDoc(doc(db, 'policiais', policial.id), {
          senha: '',
          primeiroAcesso: true
        });

        setIsPrimeiroAcesso(true);
        setEtapaTotem('primeiro_acesso');
        setSenhaArmeiro('');
        setSenhaPolicial('');
        setConfirmarSenha('');
        setErroSenha('');

        toast({
          title: "Senha Resetada",
          description: "O policial deve definir uma nova senha."
        });
      }
    } catch (error) {
      console.error('Erro ao resetar senha:', error);
      setErroSenha('Erro ao resetar senha');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = async () => {
    try {
      // Limpar status de complemento no Firebase
      await updateDoc(doc(db, 'cautelas_provisorias', cautelaId), {
        statusComplemento: deleteField(),
        materiaisComplemento: deleteField(),
        sessaoDigitacao: deleteField()
      });
    } catch (error) {
      console.error('Erro ao cancelar:', error);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleCancelar}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Complementar Cautela
          </DialogTitle>
        </DialogHeader>

        {etapa === 'selecao' && (
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">{policialNome}</p>
              <p className="text-sm text-muted-foreground">
                {materiaisAtuais.length} material(is) na cautela atual
              </p>
            </div>

            {/* Lista de materiais atuais */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Materiais atuais:</Label>
              <div className="max-h-24 overflow-y-auto space-y-1 text-sm">
                {materiaisAtuais.map((m, idx) => (
                  <div key={idx} className="text-muted-foreground">
                    • {m.nome} {m.quantidade > 1 && `(${m.quantidade})`}
                  </div>
                ))}
              </div>
            </div>

            {/* Materiais a adicionar */}
            {materiaisAdicionados.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-primary">Materiais a adicionar:</Label>
                <div className="space-y-1">
                  {materiaisAdicionados.map((m, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-primary/10 rounded">
                      <span className="text-sm">
                        {m.nome} {m.quantidade > 1 && `(${m.quantidade})`}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoverDaLista(idx)}
                      >
                        ✕
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Seletor de material com abas */}
            {loadingMateriais ? (
              <div className="text-center py-4">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              </div>
            ) : (
              <div className="space-y-3 border-t pt-3">
                <Label>Adicionar material:</Label>
                <SeletorMateriaisModal
                  materiaisDisponiveis={materiaisDisponiveis}
                  materiaisExcluidos={[
                    ...materiaisAtuais.map(m => m.materialId),
                    ...materiaisAdicionados.map(m => m.materialId)
                  ]}
                  onSelecionarMaterial={(material) => {
                    const categoriaNorm = (material.categoria || '').toLowerCase();
                    
                    if (categoriaNorm.includes('munição') || categoriaNorm.includes('municao')) {
                      // Munição: abrir modal de quantidade
                      setMaterialParaQuantidade(material);
                      setTipoQuantidade('municao');
                      setModalQuantidade(true);
                    } else if (categoriaNorm.includes('arma')) {
                      // Arma: abrir modal de carregadores
                      setMaterialParaQuantidade(material);
                      setTipoQuantidade('arma');
                      setModalQuantidade(true);
                    } else {
                      // Outros itens (HT, coletes, EPI, acessórios): adicionar direto com quantidade 1
                      const novoMaterial: MaterialSelecionado = {
                        materialId: material.id,
                        nome: material.nome,
                        quantidade: 1,
                        categoria: material.categoria,
                        numeroSerie: material.numeroSerie
                      };
                      
                      setMateriaisAdicionados(prev => [...prev, novoMaterial]);
                      
                      // Remover da lista de disponíveis
                      setMateriaisDisponiveis(prev => prev.filter(m => m.id !== material.id));
                      
                      toast({
                        title: "Material Adicionado",
                        description: `${material.nome} foi adicionado à lista.`
                      });
                    }
                  }}
                  loading={loadingMateriais}
                />
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button 
                onClick={handleIniciarConfirmacao} 
                disabled={materiaisAdicionados.length === 0 || loading}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Continuar ({materiaisAdicionados.length})
              </Button>
            </DialogFooter>
          </div>
        )}

        {etapa === 'aguardando' && (
          <div className="space-y-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <p className="text-sm font-medium">Adicionar à cautela de {policialNome}:</p>
              <ul className="mt-2 space-y-1 text-sm">
                {materiaisAdicionados.map((m, idx) => (
                  <li key={idx}>• {m.nome} {m.quantidade > 1 && `(${m.quantidade})`}</li>
                ))}
              </ul>
            </div>

            {/* Etapa: Senha Normal ou Primeiro Acesso */}
            {(etapaTotem === 'senha' || etapaTotem === 'primeiro_acesso') && (
              <div className="space-y-3">
                {isPrimeiroAcesso && (
                  <div className="p-2 bg-amber-500/20 rounded text-sm text-center text-amber-500 font-medium">
                    🔑 PRIMEIRO ACESSO - Definir nova senha
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4" />
                    {isPrimeiroAcesso ? 'Nova Senha:' : 'Senha do Policial:'}
                  </Label>
                  <Input
                    ref={inputSenhaRef}
                    type="password"
                    value={senhaPolicial}
                    onChange={(e) => setSenhaPolicial(e.target.value)}
                    placeholder="Digite a senha..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (isPrimeiroAcesso) {
                          // Focar no campo de confirmação
                          const confirmarInput = document.getElementById('confirmar-senha');
                          confirmarInput?.focus();
                        } else {
                          handleConfirmarComSenha();
                        }
                      }
                    }}
                  />
                </div>

                {isPrimeiroAcesso && (
                  <div className="space-y-2">
                    <Label>Confirmar Senha:</Label>
                    <Input
                      id="confirmar-senha"
                      type="password"
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      placeholder="Confirme a senha..."
                      onKeyDown={(e) => e.key === 'Enter' && handleConfirmarComSenha()}
                    />
                  </div>
                )}

                {erroSenha && (
                  <p className="text-sm text-destructive font-bold">{erroSenha}</p>
                )}

                {!isPrimeiroAcesso && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setEtapaTotem('resetar_senha')}
                    className="text-amber-500"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Resetar Senha
                  </Button>
                )}
              </div>
            )}

            {/* Etapa: Resetar Senha */}
            {etapaTotem === 'resetar_senha' && (
              <div className="space-y-3">
                <div className="p-2 bg-amber-500/20 rounded text-sm text-center text-amber-500 font-medium">
                  🔑 RESETAR SENHA DO POLICIAL
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4" />
                    Senha do Armeiro:
                  </Label>
                  <Input
                    type="password"
                    value={senhaArmeiro}
                    onChange={(e) => setSenhaArmeiro(e.target.value)}
                    placeholder="Digite a senha do armeiro..."
                    onKeyDown={(e) => e.key === 'Enter' && handleResetarSenha()}
                  />
                </div>

                {erroSenha && (
                  <p className="text-sm text-destructive font-bold">{erroSenha}</p>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEtapaTotem('senha');
                      setSenhaArmeiro('');
                      setErroSenha('');
                    }}
                  >
                    Voltar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleResetarSenha}
                    disabled={loading}
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Confirmar Reset
                  </Button>
                </div>
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={handleCancelar}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              {(etapaTotem === 'senha' || etapaTotem === 'primeiro_acesso') && (
                <Button onClick={handleConfirmarComSenha} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Confirmar
                </Button>
              )}
            </DialogFooter>
          </div>
        )}

        {etapa === 'confirmado' && (
          <div className="py-8 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto animate-pulse" />
            <p className="text-xl font-bold text-green-500">COMPLEMENTO CONFIRMADO!</p>
            <p className="text-sm text-muted-foreground">
              {materiaisAdicionados.length} material(is) adicionado(s).
            </p>
          </div>
        )}
      </DialogContent>
      
      {/* Modal de Quantidade para Munição ou Carregadores para Armas */}
      <ModalQuantidadeMaterial
        open={modalQuantidade}
        onClose={() => {
          setModalQuantidade(false);
          setMaterialParaQuantidade(null);
        }}
        material={materialParaQuantidade}
        tipo={tipoQuantidade}
        onConfirmar={(quantidade, carregadores) => {
          if (materialParaQuantidade) {
            const novoMaterial: MaterialSelecionado = {
              materialId: materialParaQuantidade.id,
              nome: materialParaQuantidade.nome,
              quantidade: quantidade,
              categoria: materialParaQuantidade.categoria,
              numeroSerie: materialParaQuantidade.numeroSerie,
              ...(carregadores !== undefined && { carregadores })
            };
            
            setMateriaisAdicionados(prev => [...prev, novoMaterial]);
            
            // Remover da lista de disponíveis (se não for munição)
            const isMunicao = materialParaQuantidade.categoria?.toLowerCase().includes('munição') || 
                             materialParaQuantidade.categoria?.toLowerCase().includes('municao');
            if (!isMunicao) {
              setMateriaisDisponiveis(prev => prev.filter(m => m.id !== materialParaQuantidade.id));
            }
            
            toast({
              title: "Material Adicionado",
              description: `${materialParaQuantidade.nome} foi adicionado à lista.`
            });
          }
          setModalQuantidade(false);
          setMaterialParaQuantidade(null);
        }}
      />
    </Dialog>
  );
};

export default ModalComplementarCautela;