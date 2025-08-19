import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';

interface Material {
  id: string;
  nome: string;
  categoria: string;
  subcategoria?: string;
  calibre?: string;
  numeroSerie?: string;
  quantidade?: number;
  disponivel: boolean;
  fabricante?: string;
  observacoes?: string;
}

interface MaterialCardProps {
  material: Material;
  onAdd: (material: Material, quantidade?: number) => void;
}

const MaterialCard = ({ material, onAdd }: MaterialCardProps) => {
  const [quantidadeDesejada, setQuantidadeDesejada] = useState(1);

  const handleAdd = () => {
    if (material.categoria === 'Munição' || material.categoria === 'EPI') {
      onAdd(material, quantidadeDesejada);
    } else {
      onAdd(material);
    }
  };

  const isQuantityBased = material.categoria === 'Munição' || material.categoria === 'EPI';

  return (
    <Card className="p-3 hover:bg-accent transition-colors">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-medium text-sm">{material.nome}</h4>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">{material.categoria}</Badge>
              {material.subcategoria && (
                <Badge 
                  variant={material.subcategoria === 'Letal' ? 'destructive' : 'secondary'}
                  className="text-xs"
                >
                  {material.subcategoria}
                </Badge>
              )}
            </div>
          </div>
          <Badge variant={material.disponivel ? "default" : "secondary"}>
            {material.disponivel ? "Disponível" : "Indisponível"}
          </Badge>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          {material.calibre && <p>Calibre: {material.calibre}</p>}
          {material.numeroSerie && <p>Série: {material.numeroSerie}</p>}
          {material.fabricante && <p>Fabricante: {material.fabricante}</p>}
          {material.quantidade && (
            <p className="font-medium text-primary">
              Estoque: {material.quantidade} {isQuantityBased ? 'unidades' : ''}
            </p>
          )}
        </div>

        {isQuantityBased && material.quantidade && (
          <div className="space-y-2">
            <Label htmlFor={`quantidade-${material.id}`} className="text-xs">
              Quantidade desejada:
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id={`quantidade-${material.id}`}
                type="number"
                value={quantidadeDesejada}
                onChange={(e) => setQuantidadeDesejada(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                max={material.quantidade}
                className="h-8 text-xs"
              />
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={!material.disponivel || quantidadeDesejada > material.quantidade}
                className="h-8 px-3"
              >
                <Plus className="h-3 w-3 mr-1" />
                Adicionar
              </Button>
            </div>
          </div>
        )}

        {!isQuantityBased && (
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!material.disponivel}
            className="w-full h-8 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Adicionar
          </Button>
        )}
      </div>
    </Card>
  );
};

export default MaterialCard;