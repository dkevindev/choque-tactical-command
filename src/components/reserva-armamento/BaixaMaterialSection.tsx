import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, User, Package, CheckCircle, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { collection, query, where, getDocs, updateDoc, doc, addDoc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';

interface CautelaProvisoria {
  id: string;
  livroId: string;
  policialId: string;
  policialNome: string;
  policialMatricula: string;
  armeiroId: string;
  materiais: Array<{
    materialId: string;
    nome: string;
    categoria: string;
    quantidade: number;
    numeroSerie?: string;
  }>;
  dataCautela: Date;
  dataBaixa?: Date;
  status: 'ativo' | 'baixado';
}

interface Policial {
  id: string;
  NOME: string;
  'Matrícula': string | number;
  'Post/Grad': string;
}

interface BaixaMaterialSectionProps {
  livroId: string;
  onBaixaRealizada: () => void;
}

const BaixaMaterialSection = ({ livroId, onBaixaRealizada }: BaixaMaterialSectionProps) => {
  const [search, setSearch] = useState('');
  const [policiais, setPoliciais] = useState<Policial[]>([]);
  const [policiaisComCautela, setPoliciaisComCautela] = useState<Policial[]>([]);
  const [policialSelecionado, setPolicialSelecionado] = useState<Policial | null>(null);
  const [cautelasAtivas, setCautelasAtivas] = useState<CautelaProvisoria[]>([]);
  const [materiaisSelecionados, setMateriaisSelecionados] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Carregar policiais com cautela ativa
  useEffect(() => {
    const carregarPoliciaisComCautela = async () => {
      try {
        const querySnapshot = await getDocs(
          query(collection(db, 'cautelas_provisorias'), where('status', '==', 'ativo'))
        );
        
        const cautelasData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          dataCautela: doc.data().dataCautela?.toDate?.() || new Date()
        } as CautelaProvisoria));

        // Extrair policiais únicos
        const policialIds = [...new Set(cautelasData.map(c => c.policialId))];
        
        // Carregar dados dos policiais
        const policiaisData: Policial[] = [];
        for (const policialId of policialIds) {
          const policialDoc = await getDoc(doc(db, 'policiais', policialId));
          if (policialDoc.exists()) {
            policiaisData.push({
              id: policialDoc.id,
              ...policialDoc.data()
            } as Policial);
          }
        }
        
        setPoliciaisComCautela(policiaisData);
      } catch (error) {
        console.error('Erro ao carregar policiais com cautela:', error);
      }
    };

    carregarPoliciaisComCautela();
  }, []);

  // Carregar cautelas do policial selecionado
  useEffect(() => {
    if (!policialSelecionado) {
      setCautelasAtivas([]);
      return;
    }

    const carregarCautelas = async () => {
      try {
        const querySnapshot = await getDocs(
          query(
            collection(db, 'cautelas_provisorias'),
            where('policialId', '==', policialSelecionado.id),
            where('status', '==', 'ativo')
          )
        );
        
        const cautelasData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          dataCautela: doc.data().dataCautela?.toDate?.() || new Date()
        } as CautelaProvisoria));

        setCautelasAtivas(cautelasData);
      } catch (error) {
        console.error('Erro ao carregar cautelas:', error);
      }
    };

    carregarCautelas();
  }, [policialSelecionado]);

  const toggleMaterial = (materialId: string) => {
    setMateriaisSelecionados(prev =>
      prev.includes(materialId)
        ? prev.filter(id => id !== materialId)
        : [...prev, materialId]
    );
  };

  const realizarBaixa = async () => {
    if (materiaisSelecionados.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um material para dar baixa.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Coletar materiais para registro
      const materiaisDevolvidos: Array<{
        materialId: string;
        nome: string;
        quantidade: number;
        categoria?: string;
        numeroSerie?: string;
      }> = [];

      // Processar cada cautela
      for (const cautela of cautelasAtivas) {
        const materiaisParaBaixa = cautela.materiais.filter(m => 
          materiaisSelecionados.includes(m.materialId)
        );
        
        if (materiaisParaBaixa.length === 0) continue;

        // Devolver materiais ao estoque
        for (const material of materiaisParaBaixa) {
          const materialRef = doc(db, 'materiais_belicos', material.materialId);
          const materialDoc = await getDoc(materialRef);
          
          if (materialDoc.exists()) {
            const materialData = materialDoc.data();
            const isMunicao = materialData?.categoria?.toLowerCase().includes('munição') || 
                             materialData?.categoria?.toLowerCase().includes('municao');
            
            if (isMunicao) {
              // Para munição: AUMENTAR a quantidade no estoque
              const quantidadeAtual = materialData.quantidade || 0;
              const novaQuantidade = quantidadeAtual + material.quantidade;
              await updateDoc(materialRef, {
                quantidade: novaQuantidade,
                disponivel: true
              });
            } else {
              // Para armas e outros: marcar como disponível
              await updateDoc(materialRef, {
                disponivel: true,
                cauteladoPara: null,
                dataCautela: null
              });
            }
            
            // Adicionar ao registro
            materiaisDevolvidos.push({
              materialId: material.materialId,
              nome: material.nome,
              quantidade: material.quantidade,
              categoria: material.categoria,
              numeroSerie: material.numeroSerie
            });
          }
        }

        // Verificar se todos os materiais da cautela foram devolvidos
        const materiaisRestantes = cautela.materiais.filter(m =>
          !materiaisSelecionados.includes(m.materialId)
        );

        if (materiaisRestantes.length === 0) {
          // Todos devolvidos - marcar cautela como baixada
          await updateDoc(doc(db, 'cautelas_provisorias', cautela.id), {
            status: 'baixado',
            dataBaixa: new Date()
          });
        } else {
          // Atualizar lista de materiais da cautela
          await updateDoc(doc(db, 'cautelas_provisorias', cautela.id), {
            materiais: materiaisRestantes
          });
        }
      }

      // Registrar baixa no histórico com materiais detalhados
      const agora = new Date();
      const horaBaixa = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      const movimentacaoData: Record<string, any> = {
        tipo: 'baixa',
        policialId: policialSelecionado!.id,
        policialNome: policialSelecionado!.NOME,
        policialMatricula: String(policialSelecionado!['Matrícula'] || ''),
        materiais: materiaisDevolvidos,
        dataBaixa: agora,
        horaBaixa
      };
      
      // Vincular à cautela se houver apenas uma ativa
      if (cautelasAtivas.length === 1) {
        movimentacaoData.cautelaId = cautelasAtivas[0].id;
      }
      
      if (livroId) {
        movimentacaoData.livroId = livroId;
      }
      
      await addDoc(collection(db, 'movimentacoes_belicas'), movimentacaoData);

      toast({
        title: "Baixa Realizada",
        description: `${materiaisSelecionados.length} materiais devolvidos com sucesso.`,
      });

      setMateriaisSelecionados([]);
      setPolicialSelecionado(null);
      onBaixaRealizada();

    } catch (error) {
      console.error('Erro ao realizar baixa:', error);
      toast({
        title: "Erro",
        description: "Erro ao realizar baixa dos materiais.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const policiaisFiltrados = policiaisComCautela.filter(p => {
    const filtroLower = search.toLowerCase();
    return (
      p.NOME?.toLowerCase().includes(filtroLower) ||
      String(p['Matrícula']).includes(search)
    );
  });

  // Contar total de materiais nas cautelas ativas
  const totalMateriaisNaRua = cautelasAtivas.reduce(
    (acc, cautela) => acc + cautela.materiais.length, 
    0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RotateCcw className="h-5 w-5" />
          Baixa de Material
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!policialSelecionado ? (
          <>
            {/* Busca de Policial */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar policial com material cautelado..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {policiaisComCautela.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum policial com material cautelado</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {policiaisFiltrados.map((policial) => (
                  <div
                    key={policial.id}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => setPolicialSelecionado(policial)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        <div>
                          <div className="font-medium">{policial.NOME}</div>
                          <div className="text-sm text-muted-foreground">
                            {policial['Post/Grad']} - Mat: {policial['Matrícula']}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary">Com Material</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Policial Selecionado */}
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{policialSelecionado.NOME}</div>
                  <div className="text-sm text-muted-foreground">
                    {policialSelecionado['Post/Grad']} - Mat: {policialSelecionado['Matrícula']}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => {
                  setPolicialSelecionado(null);
                  setMateriaisSelecionados([]);
                }}>
                  Alterar
                </Button>
              </div>
            </div>

            {/* Materiais Cautelados */}
            {cautelasAtivas.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                Carregando materiais...
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Selecione os materiais para dar baixa:
                </p>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {cautelasAtivas.flatMap(cautela =>
                    cautela.materiais.map((material) => (
                      <div
                        key={`${cautela.id}-${material.materialId}`}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          materiaisSelecionados.includes(material.materialId)
                            ? 'bg-green-50 dark:bg-green-950/20 border-green-500'
                            : 'hover:bg-accent'
                        }`}
                        onClick={() => toggleMaterial(material.materialId)}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox 
                            checked={materiaisSelecionados.includes(material.materialId)}
                            onCheckedChange={() => toggleMaterial(material.materialId)}
                          />
                          <div className="flex-1">
                            <div className="font-medium">{material.nome}</div>
                            <div className="text-sm text-muted-foreground">
                              {material.categoria} - Qtd: {material.quantidade}
                              {material.numeroSerie && ` - Série: ${material.numeroSerie}`}
                            </div>
                          </div>
                          {materiaisSelecionados.includes(material.materialId) && (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Botão de Baixa */}
            <Button
              onClick={realizarBaixa}
              disabled={materiaisSelecionados.length === 0 || loading}
              className="w-full"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {loading ? 'Processando...' : `Dar Baixa (${materiaisSelecionados.length} materiais)`}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default BaixaMaterialSection;
