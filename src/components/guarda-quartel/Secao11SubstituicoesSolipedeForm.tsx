import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, RefreshCw } from 'lucide-react';

export interface SubstituicaoSolipede {
  id: string;
  horario: string;
  local: string;
  solipedeSubstituido: string;
  solipedeSubstituto: string;
}

interface Secao11SubstituicoesSolipedeFormProps {
  substituicoesSolipede: SubstituicaoSolipede[];
  setSubstituicoesSolipede: (substituicoes: SubstituicaoSolipede[]) => void;
}

const Secao11SubstituicoesSolipedeForm = ({
  substituicoesSolipede,
  setSubstituicoesSolipede,
}: Secao11SubstituicoesSolipedeFormProps) => {
  const adicionarSubstituicao = () => {
    const novaSubstituicao: SubstituicaoSolipede = {
      id: Date.now().toString(),
      horario: '',
      local: '',
      solipedeSubstituido: '',
      solipedeSubstituto: '',
    };
    setSubstituicoesSolipede([...substituicoesSolipede, novaSubstituicao]);
  };

  const removerSubstituicao = (id: string) => {
    setSubstituicoesSolipede(substituicoesSolipede.filter((s) => s.id !== id));
  };

  const atualizarSubstituicao = (id: string, campo: keyof SubstituicaoSolipede, valor: string) => {
    setSubstituicoesSolipede(
      substituicoesSolipede.map((s) =>
        s.id === id ? { ...s, [campo]: valor } : s
      )
    );
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <RefreshCw className="h-5 w-5 text-blue-500" />
          11. SUBSTITUIÇÕES DE SOLÍPEDE
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground font-medium">
          Foram realizadas as seguintes substituições:
        </p>

        {substituicoesSolipede.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma substituição de solípede registrada
          </p>
        ) : (
          <div className="space-y-4">
            {substituicoesSolipede.map((substituicao) => (
              <div
                key={substituicao.id}
                className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-muted rounded-lg relative"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6 text-destructive"
                  onClick={() => removerSubstituicao(substituicao.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>

                <div>
                  <label className="text-xs text-muted-foreground">Horário</label>
                  <Input
                    value={substituicao.horario}
                    onChange={(e) => atualizarSubstituicao(substituicao.id, 'horario', e.target.value)}
                    placeholder="Ex: 14h30"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Local</label>
                  <Input
                    value={substituicao.local}
                    onChange={(e) => atualizarSubstituicao(substituicao.id, 'local', e.target.value)}
                    placeholder="Ex: Portão Principal"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Solípede Substituído</label>
                  <Input
                    value={substituicao.solipedeSubstituido}
                    onChange={(e) => atualizarSubstituicao(substituicao.id, 'solipedeSubstituido', e.target.value)}
                    placeholder="Nome do solípede"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Solípede Substituto</label>
                  <Input
                    value={substituicao.solipedeSubstituto}
                    onChange={(e) => atualizarSubstituicao(substituicao.id, 'solipedeSubstituto', e.target.value)}
                    placeholder="Nome do solípede"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <Button onClick={adicionarSubstituicao} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Substituição
        </Button>
      </CardContent>
    </Card>
  );
};

export default Secao11SubstituicoesSolipedeForm;
