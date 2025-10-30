import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import PolicialSearchCombobox from './PolicialSearchCombobox';

export interface PermutaServico {
  id: string;
  horario: string;
  local: string;
  pmSubstituido: {
    id: string;
    posto: string;
    numeral: string;
    nomeGuerra: string;
  } | null;
  pmSubstituto: {
    id: string;
    posto: string;
    numeral: string;
    nomeGuerra: string;
  } | null;
  autorizadoPor: {
    id: string;
    posto: string;
    numeral: string;
    nomeGuerra: string;
  } | null;
}

interface Secao12PermutasServicoFormProps {
  permutasServico: PermutaServico[];
  setPermutasServico: (permutas: PermutaServico[]) => void;
}

const Secao12PermutasServicoForm = ({
  permutasServico,
  setPermutasServico,
}: Secao12PermutasServicoFormProps) => {
  const adicionarPermuta = () => {
    const novaPermuta: PermutaServico = {
      id: Date.now().toString(),
      horario: '',
      local: '',
      pmSubstituido: null,
      pmSubstituto: null,
      autorizadoPor: null,
    };
    setPermutasServico([...permutasServico, novaPermuta]);
  };

  const removerPermuta = (id: string) => {
    setPermutasServico(permutasServico.filter((p) => p.id !== id));
  };

  const atualizarPermuta = (id: string, campo: keyof PermutaServico, valor: any) => {
    setPermutasServico(
      permutasServico.map((p) =>
        p.id === id ? { ...p, [campo]: valor } : p
      )
    );
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <RefreshCw className="h-5 w-5 text-blue-500" />
          12. PERMUTAS DE SERVIÇO
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground font-medium">
          Foram realizadas as seguintes substituições (permutas de serviço):
        </p>

        {permutasServico.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma permuta de serviço registrada
          </p>
        ) : (
          <div className="space-y-4">
            {permutasServico.map((permuta) => (
              <div
                key={permuta.id}
                className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 bg-muted rounded-lg relative"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6 text-destructive"
                  onClick={() => removerPermuta(permuta.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>

                <div>
                  <label className="text-xs text-muted-foreground">Horário</label>
                  <Input
                    value={permuta.horario}
                    onChange={(e) => atualizarPermuta(permuta.id, 'horario', e.target.value)}
                    placeholder="Ex: 14h30"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Local</label>
                  <Input
                    value={permuta.local}
                    onChange={(e) => atualizarPermuta(permuta.id, 'local', e.target.value)}
                    placeholder="Ex: Portão Principal"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">PM Substituído</label>
                  <PolicialSearchCombobox
                    value={permuta.pmSubstituido?.id || ''}
                    onSelect={(policial) => atualizarPermuta(permuta.id, 'pmSubstituido', policial)}
                    placeholder="Buscar..."
                    compact
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">PM Substituto</label>
                  <PolicialSearchCombobox
                    value={permuta.pmSubstituto?.id || ''}
                    onSelect={(policial) => atualizarPermuta(permuta.id, 'pmSubstituto', policial)}
                    placeholder="Buscar..."
                    compact
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Autorizado Por</label>
                  <PolicialSearchCombobox
                    value={permuta.autorizadoPor?.id || ''}
                    onSelect={(policial) => atualizarPermuta(permuta.id, 'autorizadoPor', policial)}
                    placeholder="Buscar..."
                    compact
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <Button onClick={adicionarPermuta} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Permuta
        </Button>
      </CardContent>
    </Card>
  );
};

export default Secao12PermutasServicoForm;
