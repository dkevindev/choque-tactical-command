import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Calendar, AlertTriangle } from "lucide-react";
import { doc, updateDoc, getDoc, collection, query, where, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OrdemServico {
  id: string;
  numeroOS: string;
  placaViatura: string;
  modeloViatura: string;
  dataOS: string;
  valorOS: string;
  observacao: string;
  oficinaResponsavel: string;
  dataCriacao: any;
  saldoId?: string;
}

interface ModalEditarOSProps {
  open: boolean;
  onClose: () => void;
  os: OrdemServico;
  onSalvar: () => void;
}

const ModalEditarOS: React.FC<ModalEditarOSProps> = ({
  open,
  onClose,
  os,
  onSalvar
}) => {
  const [loading, setLoading] = useState(false);
  const [novaData, setNovaData] = useState(os.dataOS);
  
  const dataOriginal = new Date(os.dataOS);
  const mesOriginal = `${dataOriginal.getFullYear()}-${String(dataOriginal.getMonth() + 1).padStart(2, '0')}`;
  
  const novaDataObj = novaData ? new Date(novaData) : null;
  const mesNovo = novaDataObj ? `${novaDataObj.getFullYear()}-${String(novaDataObj.getMonth() + 1).padStart(2, '0')}` : '';
  
  const mesAlterado = mesNovo !== mesOriginal;

  const handleSalvar = async () => {
    if (!novaData) {
      toast({
        title: "Erro",
        description: "Selecione uma data válida.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      const valorNumerico = parseFloat(os.valorOS.replace(/[R$.,\s]/g, '')) || 0;

      // Se o mês mudou, precisamos recalcular os saldos
      if (mesAlterado && valorNumerico > 0) {
        // 1. Devolver o valor ao mês original
        const saldoOriginalQuery = query(
          collection(db, 'saldoOficina'),
          where('placaViatura', '==', os.placaViatura),
          where('mesReferencia', '==', mesOriginal)
        );
        const saldoOriginalSnap = await getDocs(saldoOriginalQuery);
        
        if (!saldoOriginalSnap.empty) {
          const saldoOriginalDoc = saldoOriginalSnap.docs[0];
          const saldoOriginalData = saldoOriginalDoc.data();
          const novoGastoOriginal = Math.max(0, (saldoOriginalData.gastoAcumulado || 0) - valorNumerico);
          const novoSaldoOriginal = (saldoOriginalData.cotaMensal || 0) - novoGastoOriginal;
          
          await updateDoc(doc(db, 'saldoOficina', saldoOriginalDoc.id), {
            gastoAcumulado: novoGastoOriginal,
            saldoAtual: novoSaldoOriginal,
            ultimaAtualizacao: new Date()
          });
        }

        // 2. Descontar o valor do novo mês
        const saldoNovoQuery = query(
          collection(db, 'saldoOficina'),
          where('placaViatura', '==', os.placaViatura),
          where('mesReferencia', '==', mesNovo)
        );
        const saldoNovoSnap = await getDocs(saldoNovoQuery);
        
        if (!saldoNovoSnap.empty) {
          // Atualizar saldo existente do novo mês
          const saldoNovoDoc = saldoNovoSnap.docs[0];
          const saldoNovoData = saldoNovoDoc.data();
          const novoGastoNovo = (saldoNovoData.gastoAcumulado || 0) + valorNumerico;
          const novoSaldoNovo = (saldoNovoData.cotaMensal || 0) - novoGastoNovo;
          
          await updateDoc(doc(db, 'saldoOficina', saldoNovoDoc.id), {
            gastoAcumulado: novoGastoNovo,
            saldoAtual: novoSaldoNovo,
            ultimaAtualizacao: new Date()
          });
        } else {
          // Criar registro de saldo para o novo mês se não existir
          // Buscar cota mensal da viatura
          const viaturasQuery = query(
            collection(db, 'viaturas'),
            where('placa', '==', os.placaViatura)
          );
          const viaturasSnap = await getDocs(viaturasQuery);
          
          let cotaMensal = 0;
          if (!viaturasSnap.empty) {
            const viaturaData = viaturasSnap.docs[0].data();
            cotaMensal = viaturaData.cotaOficina || 0;
          }
          
          await addDoc(collection(db, 'saldoOficina'), {
            placaViatura: os.placaViatura,
            mesReferencia: mesNovo,
            cotaMensal,
            gastoAcumulado: valorNumerico,
            saldoAtual: cotaMensal - valorNumerico,
            ultimaAtualizacao: new Date()
          });
        }
      }

      // Atualizar a OS com a nova data
      await updateDoc(doc(db, 'ordensDeServico', os.id), {
        dataOS: novaData,
        ultimaAtualizacao: new Date()
      });

      toast({
        title: "OS Atualizada",
        description: mesAlterado 
          ? `Data alterada e saldos recalculados. A OS agora está na cota de ${mesNovo}.`
          : "Data da OS atualizada com sucesso."
      });

      onSalvar();
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar OS:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar a ordem de serviço.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Editar Data da OS
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">OS: {os.numeroOS}</p>
            <p className="text-sm text-muted-foreground">
              Viatura: {os.modeloViatura} ({os.placaViatura})
            </p>
            <p className="text-sm text-muted-foreground">
              Valor: {os.valorOS}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Data da OS:</Label>
            <Input
              type="date"
              value={novaData}
              onChange={(e) => setNovaData(e.target.value)}
            />
          </div>

          {mesAlterado && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                A data selecionada pertence a outro mês ({mesNovo}). 
                O sistema irá recalcular os saldos automaticamente:
                <ul className="mt-2 text-sm list-disc list-inside">
                  <li>Devolver valor à cota de {mesOriginal}</li>
                  <li>Descontar valor da cota de {mesNovo}</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={loading || novaData === os.dataOS}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ModalEditarOS;
