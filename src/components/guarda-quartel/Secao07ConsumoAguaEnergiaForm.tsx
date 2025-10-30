import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Zap } from 'lucide-react';

export interface ConsumoServico {
  id: string;
  nomeServico: string;
  leituraFinal: number;
  leituraInicial: number;
  consumo: number;
}

interface Secao07ConsumoAguaEnergiaFormProps {
  consumoServicos: ConsumoServico[];
  setConsumoServicos: (servicos: ConsumoServico[]) => void;
}

const Secao07ConsumoAguaEnergiaForm = ({
  consumoServicos,
  setConsumoServicos,
}: Secao07ConsumoAguaEnergiaFormProps) => {
  const adicionarServico = () => {
    const novoServico: ConsumoServico = {
      id: Date.now().toString(),
      nomeServico: '',
      leituraFinal: 0,
      leituraInicial: 0,
      consumo: 0,
    };
    setConsumoServicos([...consumoServicos, novoServico]);
  };

  const removerServico = (id: string) => {
    setConsumoServicos(consumoServicos.filter((s) => s.id !== id));
  };

  const atualizarServico = (id: string, campo: keyof ConsumoServico, valor: any) => {
    setConsumoServicos(
      consumoServicos.map((s) => {
        if (s.id !== id) return s;

        const atualizado = { ...s, [campo]: valor };

        // Calcular consumo automaticamente
        if (campo === 'leituraFinal' || campo === 'leituraInicial') {
          const final = campo === 'leituraFinal' ? Number(valor) : s.leituraFinal;
          const inicial = campo === 'leituraInicial' ? Number(valor) : s.leituraInicial;
          atualizado.consumo = Math.max(0, final - inicial);
        }

        return atualizado;
      })
    );
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Zap className="h-5 w-5 text-yellow-500" />
          07. CONTROLES DE CONSUMO ÁGUA/ENERGIA ELÉTRICA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {consumoServicos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum serviço de consumo registrado
          </p>
        ) : (
          <div className="space-y-4">
            {consumoServicos.map((servico) => (
              <div
                key={servico.id}
                className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-muted rounded-lg relative"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6 text-destructive"
                  onClick={() => removerServico(servico.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>

                <div>
                  <label className="text-xs text-muted-foreground">Serviço</label>
                  <Input
                    value={servico.nomeServico}
                    onChange={(e) => atualizarServico(servico.id, 'nomeServico', e.target.value)}
                    placeholder="Ex: ENERGIA 01"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Leitura Final 07h00</label>
                  <Input
                    type="number"
                    value={servico.leituraFinal}
                    onChange={(e) => atualizarServico(servico.id, 'leituraFinal', e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Leitura Inicial 07h00</label>
                  <Input
                    type="number"
                    value={servico.leituraInicial}
                    onChange={(e) => atualizarServico(servico.id, 'leituraInicial', e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Consumo</label>
                  <Input
                    type="number"
                    value={servico.consumo}
                    readOnly
                    className="bg-accent text-foreground font-semibold"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <Button onClick={adicionarServico} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Serviço
        </Button>
      </CardContent>
    </Card>
  );
};

export default Secao07ConsumoAguaEnergiaForm;
