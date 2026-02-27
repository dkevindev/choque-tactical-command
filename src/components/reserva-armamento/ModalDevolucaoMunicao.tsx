import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Minus, Plus, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MaterialCautela {
  materialId: string;
  nome: string;
  categoria: string;
  quantidade: number;
  numeroSerie?: string;
}

interface ModalDevolucaoMunicaoProps {
  open: boolean;
  onClose: () => void;
  material: MaterialCautela | null;
  onConfirmar: (quantidadeDevolvida: number, quantidadeFaltante: number, motivoFalta?: string) => void;
}

const ModalDevolucaoMunicao = ({ open, onClose, material, onConfirmar }: ModalDevolucaoMunicaoProps) => {
  const [quantidadeDevolvida, setQuantidadeDevolvida] = useState(0);
  const [motivoFalta, setMotivoFalta] = useState('');

  useEffect(() => {
    if (material) {
      setQuantidadeDevolvida(material.quantidade);
      setMotivoFalta('');
    }
  }, [material]);

  if (!material) return null;

  const quantidadeFaltante = material.quantidade - quantidadeDevolvida;
  const temFalta = quantidadeFaltante > 0;

  const handleIncrement = () => {
    if (quantidadeDevolvida < material.quantidade) {
      setQuantidadeDevolvida(prev => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (quantidadeDevolvida > 0) {
      setQuantidadeDevolvida(prev => prev - 1);
    }
  };

  const handleConfirmar = () => {
    // Verificar se é munição para exigir motivo
    const ehMunicaoLocal = material.categoria?.toLowerCase().includes('munição') || 
                          material.categoria?.toLowerCase().includes('municao');
    
    if (temFalta && ehMunicaoLocal && !motivoFalta.trim()) {
      return;
    }
    onConfirmar(quantidadeDevolvida, quantidadeFaltante, temFalta ? motivoFalta : undefined);
  };

  const handleClose = () => {
    setQuantidadeDevolvida(0);
    setMotivoFalta('');
    onClose();
  };

  // Título dinâmico baseado na categoria
  const ehMunicao = material.categoria?.toLowerCase().includes('munição') || 
                    material.categoria?.toLowerCase().includes('municao');
  const titulo = ehMunicao ? 'Devolução de Munição' : 'Devolução de Material';
  const exigirMotivo = ehMunicao; // Só exigir motivo para munição

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {titulo}
          </DialogTitle>
          <DialogDescription className="sr-only">Informe a quantidade devolvida do material</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informações do Material */}
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-semibold text-lg">{material.nome}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Cautelado: <span className="font-bold text-foreground">{material.quantidade}</span> unidade(s)
            </p>
          </div>

          {/* Quantidade Devolvida */}
          <div className="space-y-2">
            <Label>Quantidade sendo devolvida:</Label>
            <div className="flex items-center justify-center gap-4">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleDecrement}
                disabled={quantidadeDevolvida <= 0}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={quantidadeDevolvida}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setQuantidadeDevolvida(Math.min(Math.max(0, val), material.quantidade));
                  }}
                  className="w-24 text-center text-xl font-bold"
                  min={0}
                  max={material.quantidade}
                />
                <span className="text-muted-foreground">/ {material.quantidade}</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleIncrement}
                disabled={quantidadeDevolvida >= material.quantidade}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Alerta de Falta */}
          {temFalta && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">
                    Faltam {quantidadeFaltante} unidade(s)
                  </p>
                  {exigirMotivo && (
                    <p className="text-xs text-muted-foreground">
                      É obrigatório informar o motivo da falta
                    </p>
                  )}
                  {!exigirMotivo && (
                    <p className="text-xs text-muted-foreground">
                      Material permanecerá pendente para próximo turno
                    </p>
                  )}
                </div>
              </div>

              {exigirMotivo && (
                <div className="space-y-2">
                  <Label htmlFor="motivo" className="flex items-center gap-1">
                    Motivo da falta:
                    <Badge variant="destructive" className="text-xs">Obrigatório</Badge>
                  </Label>
                  <Textarea
                    id="motivo"
                    placeholder="Ex: Disparo em ocorrência, perda durante operação..."
                    value={motivoFalta}
                    onChange={(e) => setMotivoFalta(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmar}
            disabled={temFalta && exigirMotivo && !motivoFalta.trim()}
          >
            Confirmar Devolução
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ModalDevolucaoMunicao;
