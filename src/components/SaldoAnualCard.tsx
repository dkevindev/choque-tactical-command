
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Calendar, TrendingUp, AlertTriangle } from 'lucide-react';
import { SaldoAnual } from '@/types/fipe';

interface SaldoAnualCardProps {
  saldoAnual: SaldoAnual | null;
}

const SaldoAnualCard = ({ saldoAnual }: SaldoAnualCardProps) => {
  if (!saldoAnual) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Saldo Últimos 12 Meses
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-4">
          <p className="text-sm text-muted-foreground">
            Configure o valor FIPE para visualizar o saldo anual
          </p>
        </CardContent>
      </Card>
    );
  }

  const dadosGrafico = [
    { 
      name: 'Usado', 
      value: saldoAnual.gastoUltimos12Meses, 
      fill: '#ef4444' 
    },
    { 
      name: 'Disponível', 
      value: Math.max(0, saldoAnual.saldoRestante), 
      fill: '#22c55e' 
    }
  ];

  const percentualUsado = (saldoAnual.gastoUltimos12Meses / saldoAnual.limiteAnual) * 100;
  const isOverLimit = saldoAnual.saldoRestante < 0;

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Saldo Últimos 12 Meses
          {isOverLimit && <AlertTriangle className="h-4 w-4 text-red-500" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Valor FIPE:</span>
            <span className="font-semibold text-blue-600">
              {formatCurrency(saldoAnual.valorFipe)}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Limite Anual (70%):</span>
            <span className="font-semibold text-green-600">
              {formatCurrency(saldoAnual.limiteAnual)}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Gasto 12 Meses:</span>
            <span className="font-semibold text-orange-600">
              {formatCurrency(saldoAnual.gastoUltimos12Meses)}
            </span>
          </div>
          
          <div className="flex justify-between border-t pt-2">
            <span className="text-muted-foreground">Saldo Restante:</span>
            <span className={`font-semibold ${isOverLimit ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(saldoAnual.saldoRestante)}
            </span>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-2">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-blue-600" />
              <span className="text-xs font-medium text-blue-800">
                Limite por OS: {formatCurrency(saldoAnual.limitePorOS)}
              </span>
            </div>
          </div>
        </div>

        {saldoAnual.limiteAnual > 0 && (
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie
                data={dadosGrafico}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={60}
                dataKey="value"
              >
                {dadosGrafico.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => formatCurrency(Number(value))}
              />
            </PieChart>
          </ResponsiveContainer>
        )}

        <div className="text-center">
          <div className={`text-xs font-medium ${
            percentualUsado > 90 ? 'text-red-600' : 
            percentualUsado > 70 ? 'text-orange-600' : 'text-green-600'
          }`}>
            {percentualUsado.toFixed(1)}% do limite anual utilizado
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SaldoAnualCard;
