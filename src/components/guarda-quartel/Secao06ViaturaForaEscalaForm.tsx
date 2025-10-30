import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Car } from 'lucide-react';
import { VIATURAS_CONTROLE_KM } from '@/lib/kmUtils';
import PolicialSearchCombobox from './PolicialSearchCombobox';

export interface ViaturaForaEscala {
  id: string;
  viatura: string;
  motorista: {
    id: string;
    posto: string;
    numeral: string;
    nomeGuerra: string;
  } | null;
  horarioSaida: string;
  horarioChegada: string;
  destino: string;
}

interface Secao06ViaturaForaEscalaFormProps {
  viaturasForaEscala: ViaturaForaEscala[];
  setViaturasForaEscala: (viaturas: ViaturaForaEscala[]) => void;
}

const Secao06ViaturaForaEscalaForm = ({
  viaturasForaEscala,
  setViaturasForaEscala,
}: Secao06ViaturaForaEscalaFormProps) => {
  const adicionarViatura = () => {
    const novaViatura: ViaturaForaEscala = {
      id: Date.now().toString(),
      viatura: '',
      motorista: null,
      horarioSaida: '',
      horarioChegada: '',
      destino: '',
    };
    setViaturasForaEscala([...viaturasForaEscala, novaViatura]);
  };

  const removerViatura = (id: string) => {
    setViaturasForaEscala(viaturasForaEscala.filter((v) => v.id !== id));
  };

  const atualizarViatura = (id: string, campo: keyof ViaturaForaEscala, valor: any) => {
    setViaturasForaEscala(
      viaturasForaEscala.map((v) =>
        v.id === id ? { ...v, [campo]: valor } : v
      )
    );
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Car className="h-5 w-5 text-destructive" />
          06. CONTROLE DAS VTRS UTILIZADAS FORA DE ESCALA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {viaturasForaEscala.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma viatura fora de escala registrada
          </p>
        ) : (
          <div className="space-y-4">
            {viaturasForaEscala.map((viatura) => (
              <div
                key={viatura.id}
                className="grid grid-cols-1 md:grid-cols-6 gap-3 p-4 bg-muted rounded-lg relative"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6 text-destructive"
                  onClick={() => removerViatura(viatura.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>

                <div>
                  <label className="text-xs text-muted-foreground">VTR</label>
                  <Select
                    value={viatura.viatura}
                    onValueChange={(valor) => atualizarViatura(viatura.id, 'viatura', valor)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {VIATURAS_CONTROLE_KM.map((vtr) => (
                        <SelectItem key={vtr} value={vtr}>
                          {vtr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Motorista</label>
                  <PolicialSearchCombobox
                    value={viatura.motorista?.id || ''}
                    onSelect={(policial) => atualizarViatura(viatura.id, 'motorista', policial)}
                    placeholder="Buscar..."
                    compact
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Saída</label>
                  <Input
                    type="time"
                    value={viatura.horarioSaida}
                    onChange={(e) => atualizarViatura(viatura.id, 'horarioSaida', e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Chegada</label>
                  <Input
                    type="time"
                    value={viatura.horarioChegada}
                    onChange={(e) => atualizarViatura(viatura.id, 'horarioChegada', e.target.value)}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs text-muted-foreground">Destino</label>
                  <Input
                    value={viatura.destino}
                    onChange={(e) => atualizarViatura(viatura.id, 'destino', e.target.value)}
                    placeholder="Ex: Água Fria"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <Button onClick={adicionarViatura} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar VTR Fora de Escala
        </Button>
      </CardContent>
    </Card>
  );
};

export default Secao06ViaturaForaEscalaForm;
