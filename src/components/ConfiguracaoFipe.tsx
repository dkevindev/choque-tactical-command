
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useFipeData } from '@/hooks/useFipeData';
import { DollarSign, Edit, Save, X } from 'lucide-react';

interface ConfiguracaoFipeProps {
  viaturaId: string;
  cadastro: string;
  placa: string;
}

const ConfiguracaoFipe = ({ viaturaId, cadastro, placa }: ConfiguracaoFipeProps) => {
  const { fipeData, saldoAnual, loading, saveFipeValue } = useFipeData(viaturaId, placa);
  const [isEditing, setIsEditing] = useState(false);
  const [valorInput, setValorInput] = useState('');

  const handleEdit = () => {
    setIsEditing(true);
    setValorInput(fipeData ? (fipeData.valorFipe / 100).toString() : '');
  };

  const handleSave = async () => {
    const valor = parseFloat(valorInput.replace(/[.,]/g, '.'));
    if (isNaN(valor) || valor <= 0) {
      return;
    }

    await saveFipeValue(Math.round(valor * 100), cadastro);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setValorInput('');
  };

  const formatCurrency = (value: number) => {
    return (value / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <DollarSign className="h-4 w-4" />
          Configuração FIPE
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">Valor Tabela FIPE</Label>
            {isEditing ? (
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  value={valorInput}
                  onChange={(e) => setValorInput(e.target.value)}
                  placeholder="Ex: 85000.00"
                  className="h-8"
                />
                <Button size="sm" onClick={handleSave} disabled={loading}>
                  <Save className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancel}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <span className="font-semibold">
                  {fipeData ? formatCurrency(fipeData.valorFipe) : 'Não configurado'}
                </span>
                <Button size="sm" variant="ghost" onClick={handleEdit}>
                  <Edit className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {fipeData && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Limite Anual (70%):</span>
              <Badge variant="secondary" className="ml-1">
                {saldoAnual ? formatCurrency(saldoAnual.limiteAnual * 100) : 'Calculando...'}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Limite por OS (20%):</span>
              <Badge variant="outline" className="ml-1">
                {saldoAnual ? formatCurrency(saldoAnual.limitePorOS * 100) : 'Calculando...'}
              </Badge>
            </div>
          </div>
        )}

        {fipeData?.dataAtualizacao && (
          <p className="text-xs text-muted-foreground">
            Última atualização: {new Date(fipeData.dataAtualizacao).toLocaleDateString('pt-BR')}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default ConfiguracaoFipe;
