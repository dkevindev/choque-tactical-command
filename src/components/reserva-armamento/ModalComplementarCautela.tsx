import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, Package, Plus, Minus, KeyRound } from "lucide-react";
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from '@/hooks/use-toast';
import SeletorMateriaisModal from './SeletorMateriaisModal';

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

const ModalComplementarCautela: React.FC<ModalComplementarCautelaProps> = ({
  open,
  onClose,
  cautelaId,
  policialId,
  policialNome,
  materiaisAtuais,
  onComplementado
}) => {
  const [etapa, setEtapa] = useState<'selecao' | 'confirmacao'>('selecao');
  const [loading, setLoading] = useState(false);
  const [loadingMateriais, setLoadingMateriais] = useState(false);
  
  const [materiaisDisponiveis, setMateriaisDisponiveis] = useState<Material[]>([]);
  const [materialSelecionado, setMaterialSelecionado] = useState<string>('');
  const [quantidadeMaterial, setQuantidadeMaterial] = useState(1);
  const [materiaisAdicionados, setMateriaisAdicionados] = useState<MaterialSelecionado[]>([]);
  
  const [senhaPolicial, setSenhaPolicial] = useState('');
  const [erroSenha, setErroSenha] = useState('');

  useEffect(() => {
    if (open) {
      carregarMateriaisDisponiveis();
      setEtapa('selecao');
      setMaterialSelecionado('');
      setQuantidadeMaterial(1);
      setMateriaisAdicionados([]);
      setSenhaPolicial('');
      setErroSenha('');
    }
  }, [open]);

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

  const handleConfirmarComSenha = async () => {
    if (!senhaPolicial.trim()) {
      setErroSenha('Digite a senha do policial');
      return;
    }

    try {
      setLoading(true);
      setErroSenha('');

      // Validar senha do policial
      const policialDoc = await getDoc(doc(db, 'policiais', policialId));
      if (!policialDoc.exists()) {
        setErroSenha('Policial não encontrado');
        setLoading(false);
        return;
      }

      const policialData = policialDoc.data();
      if (policialData.senha !== senhaPolicial) {
        setErroSenha('Senha incorreta');
        setSenhaPolicial('');
        setLoading(false);
        return;
      }

      // Atualizar cautela no Firebase
      const novosMateriais = [...materiaisAtuais, ...materiaisAdicionados];
      
      await updateDoc(doc(db, 'cautelas_provisorias', cautelaId), {
        materiais: novosMateriais.map(m => ({
          materialId: m.materialId,
          nome: m.nome,
          quantidade: m.quantidade,
          categoria: m.categoria,
          ...(m.numeroSerie && { numeroSerie: m.numeroSerie })
        }))
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

      onComplementado();
      onClose();
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
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
                    setMaterialSelecionado(material.id);
                    // Verificar se é munição para ajustar quantidade padrão
                    const isMunicao = material.categoria?.toLowerCase().includes('munição') || 
                                     material.categoria?.toLowerCase().includes('municao');
                    if (isMunicao) {
                      setQuantidadeMaterial(30);
                    } else {
                      setQuantidadeMaterial(1);
                    }
                  }}
                  loading={loadingMateriais}
                />

                {materialSelecionado && (
                  <div className="p-3 bg-primary/5 rounded-lg border space-y-2">
                    <div className="font-medium text-sm">
                      {materiaisDisponiveis.find(m => m.id === materialSelecionado)?.nome}
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="text-sm">Qtd:</Label>
                      <Button
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
                        className="w-16 text-center"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantidadeMaterial(quantidadeMaterial + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button onClick={handleAdicionarALista}>
                        Adicionar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button 
                onClick={() => setEtapa('confirmacao')} 
                disabled={materiaisAdicionados.length === 0}
              >
                Continuar ({materiaisAdicionados.length})
              </Button>
            </DialogFooter>
          </div>
        )}

        {etapa === 'confirmacao' && (
          <div className="space-y-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <p className="text-sm font-medium">Confirmar adição de:</p>
              <ul className="mt-2 space-y-1 text-sm">
                {materiaisAdicionados.map((m, idx) => (
                  <li key={idx}>• {m.nome} {m.quantidade > 1 && `(${m.quantidade})`}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                Senha do Policial:
              </Label>
              <Input
                type="password"
                value={senhaPolicial}
                onChange={(e) => setSenhaPolicial(e.target.value)}
                placeholder="Digite a senha..."
                onKeyDown={(e) => e.key === 'Enter' && handleConfirmarComSenha()}
              />
              {erroSenha && (
                <p className="text-sm text-destructive">{erroSenha}</p>
              )}
            </div>

            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={() => setEtapa('selecao')}>Voltar</Button>
              <Button onClick={handleConfirmarComSenha} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Confirmar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ModalComplementarCautela;
