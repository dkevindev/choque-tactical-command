import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, Package, ArrowRight, Search, User, KeyRound, RotateCcw, X } from "lucide-react";
import { doc, getDoc, updateDoc, collection, getDocs, query, where, onSnapshot, deleteField, addDoc, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from '@/hooks/use-toast';
import { buscarPolicialPorId } from '@/lib/policialUtils';

interface MaterialCautela {
  materialId: string;
  nome: string;
  categoria?: string;
  quantidade: number;
  numeroSerie?: string;
  carregadores?: number;
}

interface CautelaProvisoria {
  id: string;
  livroId: string;
  policialId: string;
  policialNome: string;
  policialMatricula: string;
  policialNomeGuerra?: string;
  policialNumeral?: number;
  postoGrad?: string;
  armeiroId: string;
  materiais: MaterialCautela[];
  dataCautela: Date;
  horaCautela?: string;
  status: string;
}

interface Policial {
  id: string;
  NOME: string;
  'Matrícula': string | number;
  'Post/Grad': string;
  'NOME DE GUERRA'?: string;
  'NOME DE GUERRA1'?: string;
  NUMERAL?: number;
  senha?: string;
  primeiroAcesso?: boolean;
}

interface ModalTransferenciaMaterialProps {
  open: boolean;
  onClose: () => void;
  cautela: CautelaProvisoria;
  policialOrigem: Policial;
  livroId: string;
  onTransferido: () => void;
}

type EtapaTransferencia = 'selecao_destino' | 'selecao_materiais' | 'aguardando' | 'confirmado';

const ModalTransferenciaMaterial: React.FC<ModalTransferenciaMaterialProps> = ({
  open,
  onClose,
  cautela,
  policialOrigem,
  livroId,
  onTransferido
}) => {
  const [etapa, setEtapa] = useState<EtapaTransferencia>('selecao_destino');
  const [loading, setLoading] = useState(false);
  
  // Seleção de policial destino
  const [policiais, setPoliciais] = useState<Policial[]>([]);
  const [searchPolicial, setSearchPolicial] = useState('');
  const [policialDestino, setPolicialDestino] = useState<Policial | null>(null);
  
  // Seleção de materiais - usa índice do array para evitar duplicatas
  const [materiaisSelecionados, setMateriaisSelecionados] = useState<number[]>([]);
  
  // Estados para confirmação com senha
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
      carregarPoliciais();
      carregarArmeiroId();
      setEtapa('selecao_destino');
      setPolicialDestino(null);
      setMateriaisSelecionados([]);
      setSenhaPolicial('');
      setConfirmarSenha('');
      setErroSenha('');
      setIsPrimeiroAcesso(false);
      setEtapaTotem('senha');
      setSenhaArmeiro('');
      setSearchPolicial('');
    }
  }, [open]);

  const carregarArmeiroId = async () => {
    try {
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

  const carregarPoliciais = async () => {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, 'policiais'), orderBy('NOME'))
      );
      
      const policiaisData = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Policial))
        .filter(p => p.id !== policialOrigem.id); // Excluir policial de origem
      
      setPoliciais(policiaisData);
    } catch (error) {
      console.error('Erro ao carregar policiais:', error);
    }
  };

  // Listener para detectar quando a transferência foi confirmada
  useEffect(() => {
    if (etapa !== 'aguardando' || !cautela?.id) return;

    const unsubscribe = onSnapshot(
      doc(db, 'cautelas_provisorias', cautela.id),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (!data.statusTransferencia || data.statusTransferencia === 'confirmado') {
            setEtapa('confirmado');
            setTimeout(() => {
              onTransferido();
              onClose();
            }, 1500);
          }
        }
      }
    );

    return () => unsubscribe();
  }, [etapa, cautela?.id]);

  // Sincronizar digitação de senha com Firebase
  useEffect(() => {
    if (etapa !== 'aguardando') return;

    const sincronizar = async () => {
      try {
        await updateDoc(doc(db, 'cautelas_provisorias', cautela.id), {
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
        // Usar string vazia em vez de null para evitar erro de undefined no Firebase
        await updateDoc(doc(db, 'cautelas_provisorias', cautela.id), {
          'sessaoDigitacao.erro': erroSenha || '',
          'sessaoDigitacao.timestamp': Date.now()
        });
      } catch (error) {
        console.error('Erro ao sincronizar erro:', error);
      }
    };

    sincronizarErro();
  }, [erroSenha, etapa]);

  // Sincronizar etapa com Firebase
  useEffect(() => {
    if (etapa !== 'aguardando') return;

    const sincronizarEtapa = async () => {
      try {
        await updateDoc(doc(db, 'cautelas_provisorias', cautela.id), {
          'sessaoDigitacao.etapa': etapaTotem,
          'sessaoDigitacao.timestamp': Date.now()
        });
      } catch (error) {
        console.error('Erro ao sincronizar etapa:', error);
      }
    };

    sincronizarEtapa();
  }, [etapaTotem, etapa]);

  const toggleMaterial = (index: number) => {
    setMateriaisSelecionados(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handleIniciarTransferencia = async () => {
    if (!policialDestino || materiaisSelecionados.length === 0) return;

    try {
      setLoading(true);

      // Verificar se é primeiro acesso do policial destino
      const policial = await buscarPolicialPorId(policialDestino.id);
      if (policial) {
        const senhaPol = policial.senha;
        const primeiroAcesso = policial.primeiroAcesso === true || !senhaPol || senhaPol === '';
        setIsPrimeiroAcesso(primeiroAcesso);
        setEtapaTotem(primeiroAcesso ? 'primeiro_acesso' : 'senha');
      }

      const materiaisParaTransferir = cautela.materiais.filter((_, index) =>
        materiaisSelecionados.includes(index)
      );

      const nomeGuerraDestino = policialDestino['NOME DE GUERRA1'] || policialDestino['NOME DE GUERRA'] || policialDestino.NOME;

      // Atualizar cautela com status de transferência
      await updateDoc(doc(db, 'cautelas_provisorias', cautela.id), {
        statusTransferencia: 'aguardando_confirmacao',
        transferenciaPara: {
          policialId: policialDestino.id,
          policialNome: policialDestino.NOME,
          policialNomeGuerra: nomeGuerraDestino,
          policialMatricula: String(policialDestino['Matrícula'] || ''),
          materiais: materiaisParaTransferir.map(m => ({
            materialId: m.materialId,
            nome: m.nome,
            quantidade: m.quantidade,
            ...(m.categoria && { categoria: m.categoria }),
            ...(m.numeroSerie && { numeroSerie: m.numeroSerie }),
            ...(m.carregadores !== undefined && { carregadores: m.carregadores })
          })),
          // Campos opcionais protegidos contra undefined
          ...(policialDestino.NUMERAL !== undefined && { policialNumeral: policialDestino.NUMERAL }),
          ...(policialDestino['Post/Grad'] && { postoGrad: policialDestino['Post/Grad'] })
        },
        sessaoDigitacao: {
          etapa: isPrimeiroAcesso ? 'primeiro_acesso' : 'senha',
          senhaLength: 0,
          confirmarSenhaLength: 0,
          erro: '',
          timestamp: Date.now()
        }
      });

      setEtapa('aguardando');
      
      setTimeout(() => {
        inputSenhaRef.current?.focus();
      }, 100);
    } catch (error) {
      console.error('Erro ao iniciar transferência:', error);
      toast({
        title: "Erro",
        description: "Erro ao iniciar transferência. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarComSenha = async () => {
    if (!senhaPolicial.trim() || !policialDestino) {
      setErroSenha('Digite a senha');
      return;
    }

    try {
      setLoading(true);
      setErroSenha('');

      const policial = await buscarPolicialPorId(policialDestino.id);
      
      if (!policial) {
        setErroSenha('Policial não encontrado');
        setLoading(false);
        return;
      }

      const senhaPol = policial.senha;
      const primeiroAcesso = policial.primeiroAcesso === true || !senhaPol || senhaPol === '';

      if (primeiroAcesso) {
        if (confirmarSenha !== senhaPolicial) {
          setErroSenha('Senhas não conferem');
          setSenhaPolicial('');
          setConfirmarSenha('');
          setLoading(false);
          return;
        }

        const policialDocRef = doc(db, 'policiais', policial.id);
        await updateDoc(policialDocRef, {
          senha: senhaPolicial,
          primeiroAcesso: false
        });
      } else {
        if (senhaPol !== senhaPolicial) {
          setErroSenha('Senha incorreta');
          setSenhaPolicial('');
          setLoading(false);
          return;
        }
      }

      // Processar transferência
      const materiaisParaTransferir = cautela.materiais.filter((_, index) =>
        materiaisSelecionados.includes(index)
      );
      const materiaisRestantes = cautela.materiais.filter((_, index) =>
        !materiaisSelecionados.includes(index)
      );

      const agora = new Date();
      const horaCautela = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const nomeGuerraDestino = policialDestino['NOME DE GUERRA1'] || policialDestino['NOME DE GUERRA'] || policialDestino.NOME;

      // Criar nova cautela para policial destino
      await addDoc(collection(db, 'cautelas_provisorias'), {
        livroId,
        policialId: policialDestino.id,
        policialNome: policialDestino.NOME,
        policialMatricula: String(policialDestino['Matrícula'] || ''),
        policialNomeGuerra: nomeGuerraDestino,
        armeiroId: cautela.armeiroId,
        materiais: materiaisParaTransferir.map(m => ({
          materialId: m.materialId,
          nome: m.nome,
          quantidade: m.quantidade,
          ...(m.categoria && { categoria: m.categoria }),
          ...(m.numeroSerie && { numeroSerie: m.numeroSerie }),
          ...(m.carregadores !== undefined && { carregadores: m.carregadores })
        })),
        dataCautela: agora,
        horaCautela,
        status: 'pendente',
        transferidoDe: {
          policialId: policialOrigem.id,
          policialNome: policialOrigem.NOME,
          cautelaId: cautela.id,
          ...((policialOrigem['NOME DE GUERRA1'] || policialOrigem['NOME DE GUERRA']) && {
            policialNomeGuerra: policialOrigem['NOME DE GUERRA1'] || policialOrigem['NOME DE GUERRA']
          })
        },
        // Campos opcionais protegidos contra undefined
        ...(policialDestino.NUMERAL !== undefined && { policialNumeral: policialDestino.NUMERAL }),
        ...(policialDestino['Post/Grad'] && { postoGrad: policialDestino['Post/Grad'] })
      });

      // Atualizar cautela original
      if (materiaisRestantes.length === 0) {
        // Todos transferidos - marcar como entregue
        await updateDoc(doc(db, 'cautelas_provisorias', cautela.id), {
          status: 'entregue',
          dataBaixa: agora,
          horaBaixa: horaCautela,
          recebidoPorNome: `Transferido para ${nomeGuerraDestino}`,
          statusTransferencia: deleteField(),
          transferenciaPara: deleteField(),
          sessaoDigitacao: deleteField()
        });
      } else {
        // Transferência parcial
        await updateDoc(doc(db, 'cautelas_provisorias', cautela.id), {
          materiais: materiaisRestantes,
          statusTransferencia: deleteField(),
          transferenciaPara: deleteField(),
          sessaoDigitacao: deleteField()
        });
      }

      // Atualizar sessão para confirmado
      await updateDoc(doc(db, 'cautelas_provisorias', cautela.id), {
        'sessaoDigitacao.etapa': 'confirmado'
      });

      toast({
        title: "Transferência Realizada",
        description: `${materiaisParaTransferir.length} material(is) transferido(s) para ${nomeGuerraDestino}.`
      });

      setEtapa('confirmado');
      
      setTimeout(() => {
        onTransferido();
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Erro ao confirmar transferência:', error);
      toast({
        title: "Erro",
        description: "Erro ao confirmar transferência. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetarSenha = async () => {
    if (!senhaArmeiro.trim() || !policialDestino) {
      setErroSenha('Digite a senha do armeiro');
      return;
    }

    try {
      setLoading(true);

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

      const policial = await buscarPolicialPorId(policialDestino.id);
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
      if (etapa === 'aguardando') {
        await updateDoc(doc(db, 'cautelas_provisorias', cautela.id), {
          statusTransferencia: deleteField(),
          transferenciaPara: deleteField(),
          sessaoDigitacao: deleteField()
        });
      }
    } catch (error) {
      console.error('Erro ao cancelar:', error);
    }
    onClose();
  };

  const policiaisFiltrados = policiais.filter(p => {
    if (!searchPolicial) return true;
    const filtroLower = searchPolicial.toLowerCase();
    return (
      p.NOME?.toLowerCase().includes(filtroLower) ||
      p['NOME DE GUERRA1']?.toLowerCase().includes(filtroLower) ||
      p['NOME DE GUERRA']?.toLowerCase().includes(filtroLower) ||
      String(p['Matrícula']).includes(searchPolicial)
    );
  });

  const nomeGuerraOrigem = policialOrigem['NOME DE GUERRA1'] || policialOrigem['NOME DE GUERRA'] || policialOrigem.NOME;
  const nomeGuerraDestino = policialDestino ? (policialDestino['NOME DE GUERRA1'] || policialDestino['NOME DE GUERRA'] || policialDestino.NOME) : '';

  return (
    <Dialog open={open} onOpenChange={handleCancelar}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Transferir Material
          </DialogTitle>
        </DialogHeader>

        {/* Etapa 1: Selecionar Policial Destino */}
        {etapa === 'selecao_destino' && (
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">De: {policialOrigem['Post/Grad']} {nomeGuerraOrigem}</p>
              <p className="text-sm text-muted-foreground">
                {cautela.materiais.length} material(is) disponível(is)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Transferir para:</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar policial..."
                  value={searchPolicial}
                  onChange={(e) => setSearchPolicial(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {policiaisFiltrados.slice(0, 20).map((policial) => (
                <div
                  key={policial.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    policialDestino?.id === policial.id
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-accent'
                  }`}
                  onClick={() => setPolicialDestino(policial)}
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <div>
                      <div className="font-medium">
                        {policial['NOME DE GUERRA1'] || policial['NOME DE GUERRA'] || policial.NOME}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {policial['Post/Grad']} - Mat: {policial['Matrícula']}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button 
                onClick={() => setEtapa('selecao_materiais')} 
                disabled={!policialDestino}
              >
                Próximo
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Etapa 2: Selecionar Materiais */}
        {etapa === 'selecao_materiais' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <span className="font-medium">{nomeGuerraOrigem}</span>
              <ArrowRight className="h-4 w-4" />
              <span className="font-medium text-primary">{nomeGuerraDestino}</span>
            </div>

            <div className="space-y-2">
              <Label>Selecione os materiais a transferir:</Label>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {cautela.materiais.map((material, index) => (
                  <div
                    key={`${material.materialId}-${index}`}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      materiaisSelecionados.includes(index)
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-accent'
                    }`}
                    onClick={() => toggleMaterial(index)}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        checked={materiaisSelecionados.includes(index)}
                        onCheckedChange={() => toggleMaterial(index)}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{material.nome}</div>
                        <div className="text-sm text-muted-foreground">
                          {material.categoria} - Qtd: {material.quantidade}
                          {material.numeroSerie && ` - Série: ${material.numeroSerie}`}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={() => setEtapa('selecao_destino')}>Voltar</Button>
              <Button 
                onClick={handleIniciarTransferencia} 
                disabled={materiaisSelecionados.length === 0 || loading}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Transferir ({materiaisSelecionados.length})
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Etapa 3: Aguardando Confirmação */}
        {etapa === 'aguardando' && (
          <div className="space-y-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <p className="text-sm font-medium">Transferir para {nomeGuerraDestino}:</p>
              <ul className="mt-2 space-y-1 text-sm">
                {cautela.materiais
                  .filter((_, index) => materiaisSelecionados.includes(index))
                  .map((m, idx) => (
                    <li key={idx}>• {m.nome} {m.quantidade > 1 && `(${m.quantidade})`}</li>
                  ))
                }
              </ul>
            </div>

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
                    {isPrimeiroAcesso ? 'Nova Senha:' : 'Senha do Policial Destino:'}
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
                          const confirmarInput = document.getElementById('confirmar-senha-transferencia');
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
                      id="confirmar-senha-transferencia"
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

        {/* Etapa 4: Confirmado */}
        {etapa === 'confirmado' && (
          <div className="py-8 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto animate-pulse" />
            <p className="text-xl font-bold text-green-500">TRANSFERÊNCIA CONFIRMADA!</p>
            <p className="text-sm text-muted-foreground">
              {materiaisSelecionados.length} material(is) transferido(s) para {nomeGuerraDestino}.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ModalTransferenciaMaterial;
