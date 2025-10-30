import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import PolicialSearchCombobox from './PolicialSearchCombobox';

export interface RemanejamentoServico {
  id: string;
  policial: {
    id: string;
    posto: string;
    numeral: string;
    nomeGuerra: string;
  } | null;
  horarioAnterior: string;
  servicoAnterior: string;
  horarioAtual: string;
  servicoAtual: string;
}

interface Secao13RemanejamentosServicoFormProps {
  remanejamentosServico: RemanejamentoServico[];
  setRemanejamentosServico: (remanejamentos: RemanejamentoServico[]) => void;
}

const Secao13RemanejamentosServicoForm = ({
  remanejamentosServico,
  setRemanejamentosServico,
}: Secao13RemanejamentosServicoFormProps) => {
  const adicionarRemanejamento = () => {
    const novoRemanejamento: RemanejamentoServico = {
      id: Date.now().toString(),
      policial: null,
      horarioAnterior: '',
      servicoAnterior: '',
      horarioAtual: '',
      servicoAtual: '',
    };
    setRemanejamentosServico([...remanejamentosServico, novoRemanejamento]);
  };

  const removerRemanejamento = (id: string) => {
    setRemanejamentosServico(remanejamentosServico.filter((r) => r.id !== id));
  };

  const atualizarRemanejamento = (id: string, campo: keyof RemanejamentoServico, valor: any) => {
    setRemanejamentosServico(
      remanejamentosServico.map((r) =>
        r.id === id ? { ...r, [campo]: valor } : r
      )
    );
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <RefreshCw className="h-5 w-5 text-blue-500" />
          13. REMANEJAMENTOS DE SERVIÇO
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {remanejamentosServico.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum remanejamento de serviço registrado
          </p>
        ) : (
          <div className="space-y-4">
            {remanejamentosServico.map((remanejamento) => (
              <div
                key={remanejamento.id}
                className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 bg-muted rounded-lg relative"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6 text-destructive"
                  onClick={() => removerRemanejamento(remanejamento.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>

                <div>
                  <label className="text-xs text-muted-foreground">Nome</label>
                  <PolicialSearchCombobox
                    value={remanejamento.policial?.id || ''}
                    onSelect={(policial) => atualizarRemanejamento(remanejamento.id, 'policial', policial)}
                    placeholder="Buscar..."
                    compact
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Horário Serv. Ant.</label>
                  <Input
                    value={remanejamento.horarioAnterior}
                    onChange={(e) => atualizarRemanejamento(remanejamento.id, 'horarioAnterior', e.target.value)}
                    placeholder="Ex: 08h00-16h00"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Serviço Anterior</label>
                  <Input
                    value={remanejamento.servicoAnterior}
                    onChange={(e) => atualizarRemanejamento(remanejamento.id, 'servicoAnterior', e.target.value)}
                    placeholder="Ex: Portão 1"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Horário Serv. Atual</label>
                  <Input
                    value={remanejamento.horarioAtual}
                    onChange={(e) => atualizarRemanejamento(remanejamento.id, 'horarioAtual', e.target.value)}
                    placeholder="Ex: 16h00-00h00"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Serviço Atual</label>
                  <Input
                    value={remanejamento.servicoAtual}
                    onChange={(e) => atualizarRemanejamento(remanejamento.id, 'servicoAtual', e.target.value)}
                    placeholder="Ex: Ronda"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <Button onClick={adicionarRemanejamento} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Remanejamento
        </Button>
      </CardContent>
    </Card>
  );
};

export default Secao13RemanejamentosServicoForm;
