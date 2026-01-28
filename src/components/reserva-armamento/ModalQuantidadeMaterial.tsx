import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, Plus, Minus } from "lucide-react";

interface Material {
  id: string;
  nome: string;
  categoria: string;
  subcategoria?: string;
  calibre?: string;
  numeroSerie?: string;
  quantidade?: number;
  disponivel: boolean;
}

interface ModalQuantidadeMaterialProps {
  open: boolean;
  onClose: () => void;
  material: Material | null;
  onConfirmar: (quantidade: number, carregadores?: number) => void;
  tipo: 'municao' | 'arma';
}

const ModalQuantidadeMaterial = ({
  open,
  onClose,
  material,
  onConfirmar,
  tipo
}: ModalQuantidadeMaterialProps) => {
  const [quantidade, setQuantidade] = useState(tipo === 'municao' ? 15 : 1);
  const [carregadores, setCarregadores] = useState(2);

  const handleConfirmar = () => {
    if (tipo === 'arma') {
      onConfirmar(1, carregadores);
    } else {
      onConfirmar(quantidade);
    }
    setQuantidade(tipo === 'municao' ? 15 : 1);
    setCarregadores(2);
    onClose();
  };

  const handleClose = () => {
    setQuantidade(tipo === 'municao' ? 15 : 1);
    setCarregadores(2);
    onClose();
  };

  if (!material) return null;

  // Detectar se é Calibre 12 (não usa carregadores)
  const isCalibre12 = tipo === 'arma' && material?.calibre?.toLowerCase().includes('12');

  const handleCalibre12 = () => {
    onConfirmar(1, 0);
    setQuantidade(tipo === 'municao' ? 15 : 1);
    setCarregadores(2);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {tipo === 'municao' ? 'Quantidade de Munição' : 'Configurar Armamento'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info do Material */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="font-medium text-foreground">{material.nome}</div>
            <div className="text-sm text-muted-foreground">
              {material.categoria}
              {material.calibre && ` - Calibre: ${material.calibre}`}
            </div>
          </div>

          {tipo === 'municao' ? (
            /* Quantidade de Munição */
            <div className="space-y-3">
              <Label>Quantidade de munições</Label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantidade(Math.max(1, quantidade - 5))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  min={1}
                  max={material.quantidade || 1000}
                  value={quantidade}
                  onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                  className="text-center w-24"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantidade(quantidade + 5)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[15, 30, 45, 60, 100].map((qtd) => (
                  <Button
                    key={qtd}
                    variant={quantidade === qtd ? "default" : "outline"}
                    size="sm"
                    onClick={() => setQuantidade(qtd)}
                  >
                    {qtd}
                  </Button>
                ))}
              </div>
              {material.quantidade && (
                <p className="text-xs text-muted-foreground">
                  Disponível em estoque: {material.quantidade} unidades
                </p>
              )}
            </div>
          ) : isCalibre12 ? (
            /* Calibre 12 - Sem carregadores */
            <div className="space-y-3">
              <Button
                onClick={handleCalibre12}
                className="w-full h-16 bg-amber-600 hover:bg-amber-700 text-white border-2 border-amber-500"
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="font-bold text-lg">CALIBRE 12</span>
                  <span className="text-sm opacity-90">Não possui carregador</span>
                </div>
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Espingardas calibre 12 não utilizam carregadores convencionais.
              </p>
            </div>
          ) : (
            /* Quantidade de Carregadores */
            <div className="space-y-3">
              <Label>Quantidade de carregadores</Label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCarregadores(Math.max(0, carregadores - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  value={carregadores}
                  onChange={(e) => setCarregadores(Math.max(0, parseInt(e.target.value) || 0))}
                  className="text-center w-24"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCarregadores(Math.min(10, carregadores + 1))}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((qtd) => (
                  <Button
                    key={qtd}
                    variant={carregadores === qtd ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCarregadores(qtd)}
                  >
                    {qtd}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          {!isCalibre12 && (
            <Button onClick={handleConfirmar}>
              Adicionar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ModalQuantidadeMaterial;
