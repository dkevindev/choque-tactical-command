import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Lock, Package, Minus, Plus, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { collection, doc, getDoc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '@/firebase';

interface MaterialPendente {
  materialId: string;
  nome: string;
  categoria: string;
  quantidade: number;
  numeroSerie?: string;
}

interface CautelaPendente {
  id: string;
  livroId: string;
  policialId: string;
  policialNome: string;
  policialNomeGuerra?: string;
  policialMatricula: string;
  postoGrad?: string;
  materiais: MaterialPendente[];
  dataCautela: Date;
  horaCautela: string;
  sequencial: number;
}

interface ModalRecebimentoPendenteProps {
  open: boolean;
  onClose: () => void;
  cautela: CautelaPendente | null;
  onRecebimentoConcluido: () => void;
}

interface MaterialDevolucao {
  materialId: string;
  nome: string;
  categoria: string;
  quantidadeCautelada: number;
  quantidadeDevolvida: number;
  motivoFalta?: string;
}

const ModalRecebimentoPendente = ({ open, onClose, cautela, onRecebimentoConcluido }: ModalRecebimentoPendenteProps) => {
  const [etapa, setEtapa] = useState<'senha' | 'materiais'>('senha');
  const [senha, setSenha] = useState('');
  const [senhaErro, setSenhaErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [materiaisDevolucao, setMateriaisDevolucao] = useState<MaterialDevolucao[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (cautela) {
      setEtapa('senha');
      setSenha('');
      setSenhaErro('');
      setMateriaisDevolucao(
        cautela.materiais.map(m => ({
          materialId: m.materialId,
          nome: m.nome,
          categoria: m.categoria,
          quantidadeCautelada: m.quantidade,
          quantidadeDevolvida: m.quantidade,
          motivoFalta: ''
        }))
      );
    }
  }, [cautela]);

  if (!cautela) return null;

  const validarSenha = async () => {
    try {
      setLoading(true);
      setSenhaErro('');

      const policialDoc = await getDoc(doc(db, 'policiais', cautela.policialId));
      
      if (!policialDoc.exists()) {
        setSenhaErro('Policial não encontrado.');
        return;
      }

      const policialData = policialDoc.data();
      
      if (policialData.senha !== senha) {
        setSenhaErro('Senha incorreta. Verifique e tente novamente.');
        return;
      }

      // Senha correta - avançar para etapa de materiais
      setEtapa('materiais');
    } catch (error) {
      console.error('Erro ao validar senha:', error);
      setSenhaErro('Erro ao validar senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const isMunicao = (categoria: string) => {
    return categoria?.toLowerCase().includes('munição') || 
           categoria?.toLowerCase().includes('municao');
  };

  const updateQuantidade = (index: number, delta: number) => {
    setMateriaisDevolucao(prev => {
      const novo = [...prev];
      const mat = novo[index];
      mat.quantidadeDevolvida = Math.max(0, Math.min(mat.quantidadeCautelada, mat.quantidadeDevolvida + delta));
      return novo;
    });
  };

  const updateMotivo = (index: number, motivo: string) => {
    setMateriaisDevolucao(prev => {
      const novo = [...prev];
      novo[index].motivoFalta = motivo;
      return novo;
    });
  };

  const confirmarRecebimento = async () => {
    try {
      setLoading(true);
      const agora = new Date();
      const horaBaixa = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      // Buscar nome do armeiro atual
      const userStorage = localStorage.getItem('user');
      let armeiroNome = 'Armeiro';
      let armeiroId = '';
      if (userStorage) {
        const userData = JSON.parse(userStorage);
        armeiroId = userData.id;
        const armeiroDoc = await getDoc(doc(db, 'policiais', userData.id));
        if (armeiroDoc.exists()) {
          const armeiroData = armeiroDoc.data();
          armeiroNome = armeiroData['NOME DE GUERRA1'] || armeiroData['NOME DE GUERRA'] || armeiroData.NOME;
        }
      }

      // Processar cada material
      for (const mat of materiaisDevolucao) {
        const materialRef = doc(db, 'materiais_belicos', mat.materialId);
        const materialDoc = await getDoc(materialRef);
        
        if (materialDoc.exists()) {
          const materialData = materialDoc.data();
          
          if (isMunicao(mat.categoria)) {
            // Munição - devolver quantidade
            const quantidadeAtual = materialData.quantidade || 0;
            const novaQuantidade = quantidadeAtual + mat.quantidadeDevolvida;
            await updateDoc(materialRef, {
              quantidade: novaQuantidade,
              disponivel: true
            });

            // Se faltou munição, criar alerta
            const faltante = mat.quantidadeCautelada - mat.quantidadeDevolvida;
            if (faltante > 0 && mat.motivoFalta) {
              await addDoc(collection(db, 'alertas_gestao'), {
                tipo: 'falta_municao',
                dataHora: agora,
                policialId: cautela.policialId,
                policialNome: cautela.policialNome,
                policialNomeGuerra: cautela.policialNomeGuerra || '',
                armeiroId,
                armeiroNome,
                materialNome: mat.nome,
                quantidadeCautelada: mat.quantidadeCautelada,
                quantidadeDevolvida: mat.quantidadeDevolvida,
                quantidadeFaltante: faltante,
                motivoFalta: mat.motivoFalta,
                livroOriginal: cautela.livroId,
                lido: false
              });
            }
          } else {
            // Armas e outros - marcar como disponível
            await updateDoc(materialRef, {
              disponivel: true,
              cauteladoPara: null,
              dataCautela: null
            });
          }
        }
      }

      // Atualizar a cautela original com status entregue
      await updateDoc(doc(db, 'cautelas_provisorias', cautela.id), {
        status: 'entregue',
        dataBaixa: agora,
        horaBaixa,
        recebidoPorId: armeiroId,
        recebidoPorNome: armeiroNome,
        assinaturaEntrada: {
          data: agora,
          hora: horaBaixa,
          policialId: cautela.policialId,
          validadoPorSenha: true
        }
      });

      // Registrar movimentação
      await addDoc(collection(db, 'movimentacoes_belicas'), {
        tipo: 'baixa_pendente',
        policialId: cautela.policialId,
        policialNome: cautela.policialNome,
        policialMatricula: cautela.policialMatricula,
        materiais: materiaisDevolucao.map(m => ({
          materialId: m.materialId,
          nome: m.nome,
          categoria: m.categoria,
          quantidade: m.quantidadeCautelada,
          quantidadeDevolvida: m.quantidadeDevolvida,
          quantidadeFaltante: m.quantidadeCautelada - m.quantidadeDevolvida
        })),
        dataBaixa: agora,
        horaBaixa,
        cautelaId: cautela.id,
        livroOriginalId: cautela.livroId,
        recebidoPorId: armeiroId,
        recebidoPorNome: armeiroNome
      });

      toast({
        title: "Recebimento Concluído",
        description: `Material de ${cautela.policialNome} recebido com sucesso.`,
      });

      onRecebimentoConcluido();
    } catch (error) {
      console.error('Erro ao confirmar recebimento:', error);
      toast({
        title: "Erro",
        description: "Erro ao registrar recebimento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const temFaltaSemMotivo = materiaisDevolucao.some(m => {
    const faltante = m.quantidadeCautelada - m.quantidadeDevolvida;
    return isMunicao(m.categoria) && faltante > 0 && !m.motivoFalta?.trim();
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {etapa === 'senha' ? (
              <>
                <Lock className="h-5 w-5" />
                Validação do Policial
              </>
            ) : (
              <>
                <Package className="h-5 w-5" />
                Recebimento de Material
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {etapa === 'senha' ? (
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="font-semibold">
                {cautela.postoGrad} {cautela.policialNomeGuerra || cautela.policialNome}
              </div>
              <div className="text-sm text-muted-foreground">
                Mat: {cautela.policialMatricula}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha">
                Digite a senha do policial para confirmar recebimento:
              </Label>
              <Input
                id="senha"
                type="password"
                placeholder="Senha do policial"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && validarSenha()}
              />
              {senhaErro && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  {senhaErro}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={validarSenha} disabled={!senha || loading}>
                {loading ? 'Validando...' : 'Validar Senha'}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="p-3 bg-green-950/20 border border-green-600 rounded-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-green-500 font-medium">Senha validada com sucesso</span>
            </div>

            <div className="space-y-4">
              {materiaisDevolucao.map((mat, index) => {
                const faltante = mat.quantidadeCautelada - mat.quantidadeDevolvida;
                const temFalta = faltante > 0;
                const isMunicaoMaterial = isMunicao(mat.categoria);

                return (
                  <div key={mat.materialId} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{mat.nome}</div>
                        <div className="text-sm text-muted-foreground">
                          Cautelado: {mat.quantidadeCautelada}
                        </div>
                      </div>
                      <Badge variant="outline">{mat.categoria}</Badge>
                    </div>

                    {isMunicaoMaterial ? (
                      <>
                        <div className="flex items-center justify-center gap-4">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => updateQuantidade(index, -1)}
                            disabled={mat.quantidadeDevolvida <= 0}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={mat.quantidadeDevolvida}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                const delta = val - mat.quantidadeDevolvida;
                                updateQuantidade(index, delta);
                              }}
                              className="w-20 text-center font-bold"
                            />
                            <span className="text-muted-foreground">/ {mat.quantidadeCautelada}</span>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => updateQuantidade(index, 1)}
                            disabled={mat.quantidadeDevolvida >= mat.quantidadeCautelada}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        {temFalta && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-destructive text-sm">
                              <AlertTriangle className="h-4 w-4" />
                              Faltam {faltante} unidade(s)
                            </div>
                            <Textarea
                              placeholder="Motivo da falta (obrigatório)"
                              value={mat.motivoFalta || ''}
                              onChange={(e) => updateMotivo(index, e.target.value)}
                              className="min-h-[80px]"
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-green-500">
                        <CheckCircle className="h-4 w-4" />
                        Material será marcado como devolvido
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button 
                onClick={confirmarRecebimento} 
                disabled={loading || temFaltaSemMotivo}
              >
                {loading ? 'Processando...' : 'Confirmar Recebimento'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ModalRecebimentoPendente;
