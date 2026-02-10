import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, PackageMinus, AlertTriangle } from 'lucide-react';
import { collection, getDocs, query, where, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from 'sonner';

interface MaterialBelico {
  id: string;
  nome: string;
  categoria: string;
  numeroSerie?: string;
  fabricante?: string;
  modelo?: string;
  vencimento?: string;
  sexo?: string;
  tamanhoColete?: string;
  cautelado?: boolean;
  policialAssociadoNome?: string;
  policialAssociadoId?: string;
  policialAssociadoMatricula?: string;
  disponivel?: boolean;
  transferido?: boolean;
  baixado?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const BaixaMaterialCargaModal = ({ open, onClose, onSuccess }: Props) => {
  const [materiais, setMateriais] = useState<MaterialBelico[]>([]);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [motivoBaixa, setMotivoBaixa] = useState('');
  const [destino, setDestino] = useState('');
  const [observacoes, setObservacoes] = useState('');

  useEffect(() => {
    if (open) {
      carregarMateriais();
      setSelecionados(new Set());
      setMotivoBaixa('');
      setDestino('');
      setObservacoes('');
      setBusca('');
      setCategoriaFiltro('todas');
    }
  }, [open]);

  const carregarMateriais = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'materiais_belicos'));
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as MaterialBelico))
        .filter(m => !m.transferido && !m.baixado);

      // Enriquecer com dados de cautelas
      const cautelasSnapshot = await getDocs(
        query(collection(db, 'cautelas_permanentes'), where('status', '==', 'ativa'))
      );
      const cautelaMap = new Map<string, { nome: string; matricula: string; id: string }>();
      cautelasSnapshot.docs.forEach(d => {
        const c = d.data();
        c.materiais?.forEach((m: any) => {
          if (m.materialId) {
            cautelaMap.set(m.materialId, {
              nome: `${c.policialPatente || ''} ${c.policialNome || ''}`.trim(),
              matricula: c.policialMatricula || '',
              id: c.policialId || ''
            });
          }
        });
      });

      const enriched = data.map(m => {
        const info = cautelaMap.get(m.id);
        if (info) {
          return { ...m, cautelado: true, policialAssociadoNome: info.nome, policialAssociadoMatricula: info.matricula, policialAssociadoId: info.id };
        }
        return m;
      });

      setMateriais(enriched);
    } catch (error) {
      console.error('Erro ao carregar materiais:', error);
    } finally {
      setLoading(false);
    }
  };

  const categorias = useMemo(() => {
    const unique = [...new Set(materiais.map(m => m.categoria).filter(Boolean))];
    return unique.sort();
  }, [materiais]);

  const materiaisFiltrados = useMemo(() => {
    return materiais.filter(m => {
      const matchBusca = !busca ||
        m.nome?.toLowerCase().includes(busca.toLowerCase()) ||
        m.numeroSerie?.toLowerCase().includes(busca.toLowerCase()) ||
        m.policialAssociadoNome?.toLowerCase().includes(busca.toLowerCase());
      const matchCategoria = categoriaFiltro === 'todas' || m.categoria === categoriaFiltro;
      return matchBusca && matchCategoria;
    });
  }, [materiais, busca, categoriaFiltro]);

  const toggleSelecionado = (id: string) => {
    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleTodos = () => {
    if (selecionados.size === materiaisFiltrados.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(materiaisFiltrados.map(m => m.id)));
    }
  };

  const handleConfirmar = async () => {
    if (selecionados.size === 0) {
      toast.error('Selecione pelo menos um material');
      return;
    }
    if (!motivoBaixa) {
      toast.error('Selecione o motivo da baixa');
      return;
    }
    if (!destino) {
      toast.error('Informe o destino');
      return;
    }

    setSalvando(true);
    try {
      const materiaisSelecionados = materiais.filter(m => selecionados.has(m.id));

      // Buscar cautelas ativas uma vez
      const cautelasSnapshot = await getDocs(
        query(collection(db, 'cautelas_permanentes'), where('status', '==', 'ativa'))
      );

      await Promise.all(materiaisSelecionados.map(async (material) => {
        // 1. Registrar histórico
        await addDoc(collection(db, 'historico_material'), {
          materialId: material.id,
          materialNome: material.nome || material.categoria,
          numeroSerie: material.numeroSerie || '',
          policialNome: material.policialAssociadoNome || '',
          policialId: material.policialAssociadoId || '',
          tipo: 'baixa',
          data: new Date(),
          observacoes: `Baixa: ${motivoBaixa} - Destino: ${destino}`
        });

        // 2. Criar registro de baixa
        await addDoc(collection(db, 'baixas_materiais'), {
          materialId: material.id,
          nome: material.nome || material.categoria,
          numeroSerie: material.numeroSerie || '',
          categoria: material.categoria || '',
          fabricante: material.fabricante || '',
          modelo: material.modelo || '',
          vencimento: material.vencimento || '',
          sexo: material.sexo || '',
          tamanhoColete: material.tamanhoColete || '',
          motivoBaixa,
          destino,
          observacoes,
          policialCauteladoNome: material.policialAssociadoNome || '',
          policialCauteladoMatricula: material.policialAssociadoMatricula || '',
          policialCauteladoId: material.policialAssociadoId || '',
          dataBaixa: Timestamp.now(),
          criadoPor: ''
        });

        // 3. Atualizar material
        await updateDoc(doc(db, 'materiais_belicos', material.id), {
          baixado: true,
          disponivel: false,
          cautelado: false,
          dataBaixa: Timestamp.now(),
          motivoBaixa
        });

        // 4. Remover de cautelas permanentes
        for (const cautelaDoc of cautelasSnapshot.docs) {
          const cautela = cautelaDoc.data();
          const materiaisAtuais = cautela.materiais || [];
          const materiaisAtualizados = materiaisAtuais.filter(
            (m: any) => m.materialId !== material.id
          );
          if (materiaisAtualizados.length !== materiaisAtuais.length) {
            await updateDoc(doc(db, 'cautelas_permanentes', cautelaDoc.id), {
              materiais: materiaisAtualizados
            });
          }
        }
      }));

      toast.success(`${materiaisSelecionados.length} material(is) baixado(s) com sucesso!`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao dar baixa:', error);
      toast.error('Erro ao processar baixa de materiais');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageMinus className="h-5 w-5" />
            Dar Baixa em Materiais
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, N/S ou policial..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as Categorias</SelectItem>
                {categorias.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Seleção de materiais */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={materiaisFiltrados.length > 0 && selecionados.size === materiaisFiltrados.length}
                onCheckedChange={toggleTodos}
              />
              <span className="text-sm">Selecionar todos ({materiaisFiltrados.length})</span>
            </div>
            <Badge>{selecionados.size} selecionado(s)</Badge>
          </div>

          <ScrollArea className="flex-1 min-h-0 max-h-[300px] border rounded-md">
            <div className="space-y-1 p-2">
              {loading ? (
                <p className="text-center py-4 text-muted-foreground">Carregando materiais...</p>
              ) : materiaisFiltrados.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">Nenhum material encontrado</p>
              ) : (
                materiaisFiltrados.map(m => (
                  <div
                    key={m.id}
                    className={`flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer ${
                      selecionados.has(m.id) ? 'bg-muted' : ''
                    }`}
                    onClick={() => toggleSelecionado(m.id)}
                  >
                    <Checkbox checked={selecionados.has(m.id)} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{m.nome || m.categoria}</p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        <Badge variant="outline" className="text-xs">{m.categoria}</Badge>
                        {m.numeroSerie && (
                          <span className="text-xs text-muted-foreground">N/S: {m.numeroSerie}</span>
                        )}
                        {m.policialAssociadoNome && (
                          <span className="text-xs text-muted-foreground">
                            → {m.policialAssociadoNome}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Dados da baixa */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Motivo da Baixa *</Label>
              <Select value={motivoBaixa} onValueChange={setMotivoBaixa}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vencimento">Vencimento</SelectItem>
                  <SelectItem value="Inservível">Inservível</SelectItem>
                  <SelectItem value="Avaria">Avaria</SelectItem>
                  <SelectItem value="Extravio">Extravio</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Destino *</Label>
              <Input
                placeholder="Ex: Enviado para destruição"
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea
              placeholder="Observações adicionais..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmar} disabled={salvando} variant="destructive" className="gap-2">
            <PackageMinus className="h-4 w-4" />
            {salvando ? 'Processando...' : `Dar Baixa (${selecionados.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BaixaMaterialCargaModal;
