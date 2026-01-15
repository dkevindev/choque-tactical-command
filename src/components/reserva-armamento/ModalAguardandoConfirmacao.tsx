import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, User } from "lucide-react";
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';

interface ModalAguardandoConfirmacaoProps {
  open: boolean;
  onClose: () => void;
  cautelaId: string;
  policialNome: string;
  onConfirmado: () => void;
}

const ModalAguardandoConfirmacao: React.FC<ModalAguardandoConfirmacaoProps> = ({
  open,
  onClose,
  cautelaId,
  policialNome,
  onConfirmado
}) => {
  const [confirmado, setConfirmado] = useState(false);
  const [contador, setContador] = useState(0);

  // Listener em tempo real para verificar confirmação a cada 2 segundos
  useEffect(() => {
    if (!open || !cautelaId) return;

    setConfirmado(false);
    setContador(0);

    const unsubscribe = onSnapshot(
      doc(db, 'cautelas_provisorias', cautelaId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.status === 'pendente') {
            setConfirmado(true);
            // Auto-fechar após 3 segundos
            setTimeout(() => {
              onConfirmado();
              onClose();
            }, 3000);
          }
        }
      },
      (error) => {
        console.error('Erro ao monitorar cautela:', error);
      }
    );

    // Contador de atualizações
    const interval = setInterval(() => {
      setContador(prev => prev + 1);
    }, 2000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [open, cautelaId, onClose, onConfirmado]);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        {!confirmado ? (
          <div className="text-center py-8 space-y-6">
            <div className="relative mx-auto w-20 h-20">
              <Loader2 className="w-20 h-20 text-primary animate-spin" />
            </div>
            
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                ⏳ AGUARDANDO CONFIRMAÇÃO
              </h2>
              
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-4">
                <User className="h-5 w-5" />
                <span className="font-medium">{policialNome}</span>
              </div>
              
              <p className="text-muted-foreground">
                Aguardando policial confirmar<br />
                recebimento na tela externa...
              </p>
            </div>
            
            <p className="text-xs text-muted-foreground">
              Atualizando a cada 2 segundos... ({contador} verificações)
            </p>
          </div>
        ) : (
          <div className="text-center py-8 space-y-6">
            <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            
            <div>
              <h2 className="text-xl font-bold text-green-600 mb-2">
                ✅ MATERIAL RECEBIDO!
              </h2>
              
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-4">
                <User className="h-5 w-5" />
                <span className="font-medium">{policialNome}</span>
              </div>
              
              <p className="text-muted-foreground">
                Recebimento confirmado com sucesso!
              </p>
            </div>
            
            <Button
              onClick={() => {
                onConfirmado();
                onClose();
              }}
              className="w-full bg-primary hover:bg-primary/90"
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
