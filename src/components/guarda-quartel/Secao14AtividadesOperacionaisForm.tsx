import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, BarChart } from 'lucide-react';

export interface AtividadeOperacional {
  id: string;
  ordem: number;
  localHorario: string;
  tipoOcorrencia: string;
  quantidade: number;
}

interface Secao14AtividadesOperacionaisFormProps {
  atividadesOperacionais: AtividadeOperacional[];
  setAtividadesOperacionais: (atividades: AtividadeOperacional[]) => void;
}

const Secao14AtividadesOperacionaisForm = ({
  atividadesOperacionais,
  setAtividadesOperacionais,
}: Secao14AtividadesOperacionaisFormProps) => {
  const adicionarAtividade = () => {
    const novaAtividade: AtividadeOperacional = {
      id: Date.now().toString(),
      ordem: atividadesOperacionais.length + 1,
      localHorario: '',
      tipoOcorrencia: '',
      quantidade: 0,
    };
    setAtividadesOperacionais([...atividadesOperacionais, novaAtividade]);
  };

  const removerAtividade = (id: string) => {
    const atualizada = atividadesOperacionais.filter((a) => a.id !== id);
    // Renumerar as atividades
    const renumerada = atualizada.map((a, index) => ({ ...a, ordem: index + 1 }));
    setAtividadesOperacionais(renumerada);
  };

  const atualizarAtividade = (id: string, campo: keyof AtividadeOperacional, valor: any) => {
    setAtividadesOperacionais(
      atividadesOperacionais.map((a) =>
        a.id === id ? { ...a, [campo]: valor } : a
      )
    );
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <BarChart className="h-5 w-5 text-green-500" />
          14. ATIVIDADES DOS SERVIÇOS OPERACIONAIS
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {atividadesOperacionais.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma atividade operacional registrada
          </p>
        ) : (
          <div className="space-y-4">
            {atividadesOperacionais.map((atividade) => (
              <div
                key={atividade.id}
                className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-muted rounded-lg relative"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6 text-destructive"
                  onClick={() => removerAtividade(atividade.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>

                <div>
                  <label className="text-xs text-muted-foreground">Ordem</label>
                  <Input
                    type="number"
                    value={atividade.ordem}
                    readOnly
                    className="bg-accent font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Local/Horário</label>
                  <Input
                    value={atividade.localHorario}
                    onChange={(e) => atualizarAtividade(atividade.id, 'localHorario', e.target.value)}
                    placeholder="Ex: Centro 14h30"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Tipo de Ocorrência</label>
                  <Input
                    value={atividade.tipoOcorrencia}
                    onChange={(e) => atualizarAtividade(atividade.id, 'tipoOcorrencia', e.target.value)}
                    placeholder="Ex: Abordagem"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Quantidade</label>
                  <Input
                    type="number"
                    value={atividade.quantidade}
                    onChange={(e) => atualizarAtividade(atividade.id, 'quantidade', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <Button onClick={adicionarAtividade} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Atividade
        </Button>
      </CardContent>
    </Card>
  );
};

export default Secao14AtividadesOperacionaisForm;
