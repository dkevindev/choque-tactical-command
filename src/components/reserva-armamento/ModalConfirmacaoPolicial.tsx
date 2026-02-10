import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, CheckCircle, AlertCircle, User, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';

interface MaterialSelecionado {
  materialId: string;
  nome: string;
  categoria: string;
  quantidade: number;
  numeroSerie?: string;
}

interface Policial {
  id: string;
  'Matrícula': string | number;
  NOME: string;
  'Post/Grad': string;
  senha?: string;
}

interface ModalConfirmacaoPolicialProps {
  open: boolean;
  onClose: () => void;
  policial: Policial;
  materiais: MaterialSelecionado[];
  onConfirmar: () => Promise<void>;
}

const ModalConfirmacaoPolicial = ({
  open,
  onClose,
  policial,
  materiais,
  onConfirmar
}: ModalConfirmacaoPolicialProps) => {
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const { toast } = useToast();

  const handleConfirmar = async () => {
    if (!senha.trim()) {
      setErro('Digite sua senha para confirmar.');
      return;
    }

    try {
      setLoading(true);
      setErro('');

      // Verificar senha do policial no Firebase
      const matricula = policial['Matrícula'];
      let querySnapshot = await getDocs(
        query(collection(db, 'policiais'), where('Matrícula', '==', typeof matricula === 'number' ? matricula : parseInt(String(matricula))))
      );
      
      if (querySnapshot.empty) {
        querySnapshot = await getDocs(
          query(collection(db, 'policiais'), where('Matrícula', '==', String(matricula)))
        );
      }

      if (querySnapshot.empty) {
        setErro('Policial não encontrado.');
        return;
      }

      const policialData = querySnapshot.docs[0].data();
      
      // Verificar senha
      if (policialData.senha && policialData.senha !== senha) {
        setErro('Senha incorreta.');
        return;
      }

      // Se não tem senha cadastrada, aceitar para testes
      if (!policialData.senha) {
        console.log('⚠️ Policial sem senha cadastrada, permitindo acesso');
      }

      await onConfirmar();
      
      toast({
        title: "Recebimento Confirmado",
        description: `${materiais.length} materiais cautelados com sucesso.`,
      });

      // Limpar estado
      setSenha('');
      onClose();

    } catch (error) {
      console.error('Erro ao confirmar:', error);
      setErro('Erro ao confirmar recebimento.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSenha('');
    setErro('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Confirmação de Recebimento
          </DialogTitle>
          <DialogDescription className="sr-only">Confirme o recebimento dos materiais com sua senha</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info do Policial */}
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <span className="font-semibold text-foreground">{policial.NOME}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {policial['Post/Grad']} - Mat: {policial['Matrícula']}
            </p>
          </div>

          {/* Lista de Materiais (somente visualização) */}
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Materiais a receber:
            </h4>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {materiais.map((material) => (
                <div
                  key={material.materialId}
                  className="p-3 bg-muted border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{material.nome}</div>
                      <div className="text-sm text-muted-foreground">
                        {material.categoria} - Qtd: {material.quantidade}
                        {material.numeroSerie && ` - Série: ${material.numeroSerie}`}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Total: {materiais.length} {materiais.length === 1 ? 'item' : 'itens'}
            </p>
          </div>

          {/* Campo de Senha */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Senha do Policial
            </label>
            <Input
              type="password"
              placeholder="Digite sua senha para confirmar"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirmar()}
            />
          </div>

          {/* Erro */}
          {erro && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {erro}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmar} 
            disabled={!senha || loading}
          >
            {loading ? 'Confirmando...' : 'Confirmar Recebimento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ModalConfirmacaoPolicial;
