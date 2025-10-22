import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { collection, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { Package, ArrowRight } from 'lucide-react';

interface Material {
  materialId: string;
  nome: string;
  categoria: string;
  numeroSerie?: string;
  fabricante?: string;
  modelo?: string;
  calibre?: string;
  quantidade: number;
  sexo?: string;
  tamanhoColete?: string;
  vencimento?: string;
  tipoArma?: string;
  quantidadeCarregadores?: number;
  quantidadeMunicoes?: number;
  subcategoria?: string;
}

interface Cautela {
  id: string;
  numeroCautela?: string;
  policialId: string;
  policialNome: string;
  policialPatente?: string;
  policialMatricula: string;
  numeral?: number;
  materiais: Material[];
  status: string;
}

interface Props {
  cautela: Cautela;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TransferenciaPolicialModal = ({ cautela, open, onClose, onSuccess }: Props) => {
  const [dataTransferencia, setDataTransferencia] = useState('');
  const [localDestino, setLocalDestino] = useState('');
  const [publicacao, setPublicacao] = useState('');
  const [materiaisStatus, setMateriaisStatus] = useState<Record<string, 'levado' | 'devolvido' | null>>({});
  const [loading, setLoading] = useState(false);

  const handleMaterialToggle = (materialId: string, status: 'levado' | 'devolvido') => {
    setMateriaisStatus(prev => ({
      ...prev,
      [materialId]: prev[materialId] === status ? null : status
    }));
  };

  const handleConfirmar = async () => {
    // Validações
    if (!dataTransferencia || !localDestino || !publicacao) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const materiaisSelecionados = Object.values(materiaisStatus).filter(s => s !== null);
    if (materiaisSelecionados.length === 0) {
      toast.error('Selecione pelo menos um material como levado ou devolvido');
      return;
    }

    setLoading(true);

    try {
      const materiaisLevados = cautela.materiais.filter(
        m => materiaisStatus[m.materialId] === 'levado'
      );
      const materiaisDevolvidos = cautela.materiais.filter(
        m => materiaisStatus[m.materialId] === 'devolvido'
      );

      // Criar registro de transferência
      const transferencia = {
        policialId: cautela.policialId,
        policialNome: cautela.policialNome,
        policialPatente: cautela.policialPatente || '',
        policialMatricula: cautela.policialMatricula,
        numeral: cautela.numeral || 0,
        dataTransferencia: Timestamp.fromDate(new Date(dataTransferencia)),
        localDestino,
        publicacao,
        cautelaOriginalId: cautela.id,
        numeroCautelaOriginal: cautela.numeroCautela || '',
        materiaisLevados,
        materiaisDevolvidos,
        documentosGerados: {
          baixaCautela: { gerado: false },
          transferenciaCautela: { gerado: false },
          termoEntrega: { gerado: false }
        },
        status: 'pendente',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await addDoc(collection(db, 'transferencias_policiais'), transferencia);

      // Atualizar cautela original
      await updateDoc(doc(db, 'cautelas_permanentes', cautela.id), {
        status: 'transferida',
        transferencia: {
          transferidoEm: Timestamp.fromDate(new Date(dataTransferencia)),
          transferidoPara: localDestino,
          transferenciaPolicialId: cautela.id
        }
      });

      // Atualizar materiais devolvidos para disponíveis
      for (const material of materiaisDevolvidos) {
        try {
          await updateDoc(doc(db, 'materiais_belicos', material.materialId), {
            disponivel: true,
            cautelado: false,
            historicoTransferencias: [
              {
                transferidoEm: Timestamp.fromDate(new Date(dataTransferencia)),
                transferidoPara: localDestino,
                policialNome: cautela.policialNome,
                tipo: 'devolvido'
              }
            ]
          });
        } catch (error) {
          console.error('Erro ao atualizar material:', material.materialId, error);
        }
      }

      // Atualizar histórico dos materiais levados
      for (const material of materiaisLevados) {
        try {
          await updateDoc(doc(db, 'materiais_belicos', material.materialId), {
            historicoTransferencias: [
              {
                transferidoEm: Timestamp.fromDate(new Date(dataTransferencia)),
                transferidoPara: localDestino,
                policialNome: cautela.policialNome,
                tipo: 'levado'
              }
            ]
          });
        } catch (error) {
          console.error('Erro ao atualizar material:', material.materialId, error);
        }
      }

      toast.success('Transferência registrada com sucesso!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao processar transferência:', error);
      toast.error('Erro ao processar transferência');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Transferência de Policial
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Dados do Policial */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">Policial</h4>
            <p className="text-sm">
              {cautela.policialPatente} {cautela.policialNome} - Mat: {cautela.policialMatricula}
            </p>
            <p className="text-xs text-muted-foreground">Cautela: {cautela.numeroCautela}</p>
          </div>

          {/* Dados da Transferência */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="dataTransferencia">Data da Transferência *</Label>
              <Input
                id="dataTransferencia"
                type="date"
                value={dataTransferencia}
                onChange={(e) => setDataTransferencia(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <Label htmlFor="localDestino">Local de Destino *</Label>
              <Input
                id="localDestino"
                placeholder="Ex: 1º BPChoque, BPRAIO, etc."
                value={localDestino}
                onChange={(e) => setLocalDestino(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="publicacao">Publicação *</Label>
              <Input
                id="publicacao"
                placeholder="Ex: BI nº 001/2024"
                value={publicacao}
                onChange={(e) => setPublicacao(e.target.value)}
              />
            </div>
          </div>

          {/* Seleção de Materiais */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Materiais da Cautela
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              Marque se o material será <Badge variant="default">Levado</Badge> ou{' '}
              <Badge variant="secondary">Devolvido</Badge>
            </p>

            <div className="space-y-3">
              {cautela.materiais.map((material) => (
                <div
                  key={material.materialId}
                  className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium">{material.nome}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Badge variant="outline">{material.categoria}</Badge>
                        {material.numeroSerie && (
                          <span className="text-xs text-muted-foreground">
                            N/S: {material.numeroSerie}
                          </span>
                        )}
                        {material.modelo && (
                          <span className="text-xs text-muted-foreground">
                            {material.fabricante} {material.modelo}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant={materiaisStatus[material.materialId] === 'levado' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleMaterialToggle(material.materialId, 'levado')}
                      >
                        Levado
                      </Button>
                      <Button
                        variant={
                          materiaisStatus[material.materialId] === 'devolvido' ? 'secondary' : 'outline'
                        }
                        size="sm"
                        onClick={() => handleMaterialToggle(material.materialId, 'devolvido')}
                      >
                        Devolvido
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmar} disabled={loading}>
            {loading ? 'Processando...' : 'Confirmar Transferência'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransferenciaPolicialModal;
