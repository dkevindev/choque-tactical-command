import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import PolicialSearchCombobox, { PolicialData } from './PolicialSearchCombobox';
import { FuncaoServico, PolicialEscalado } from './LivroGuardaPage';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface FuncaoCardProps {
  funcao: FuncaoServico;
  onUpdate: (funcao: FuncaoServico) => void;
  onRemove: () => void;
}

const FuncaoCard = ({ funcao, onUpdate, onRemove }: FuncaoCardProps) => {
  const [isOpen, setIsOpen] = useState(funcao.policiais.length > 0);

  const adicionarPolicial = () => {
    const novoPolicialVazio: PolicialEscalado = {
      id: '',
      posto: '',
      matricula: '',
      nomeGuerra: '',
      horario: '',
      observacao: '',
    };

    onUpdate({
      ...funcao,
      policiais: [...funcao.policiais, novoPolicialVazio],
    });
    setIsOpen(true);
  };

  const removerPolicial = (index: number) => {
    const novosPoliciais = funcao.policiais.filter((_, i) => i !== index);
    onUpdate({
      ...funcao,
      policiais: novosPoliciais,
    });
  };

  const atualizarPolicial = (index: number, policial: Partial<PolicialEscalado>) => {
    const novosPoliciais = [...funcao.policiais];
    novosPoliciais[index] = { ...novosPoliciais[index], ...policial };
    onUpdate({
      ...funcao,
      policiais: novosPoliciais,
    });
  };

  const selecionarPolicial = (index: number, policialData: PolicialData | null) => {
    if (policialData) {
      atualizarPolicial(index, {
        id: policialData.id,
        posto: policialData.posto,
        matricula: policialData.matricula,
        nomeGuerra: policialData.nomeGuerra,
      });
    }
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="flex-1 justify-start p-0 h-auto hover:bg-transparent">
                <div className="flex items-center gap-2">
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                  <CardTitle className="text-base">{funcao.nome}</CardTitle>
                  {funcao.policiais.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({funcao.policiais.length} {funcao.policiais.length === 1 ? 'policial' : 'policiais'})
                    </span>
                  )}
                </div>
              </Button>
            </CollapsibleTrigger>
            {funcao.removivel && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onRemove}
                className="h-8 w-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {funcao.policiais.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Nenhum policial escalado para esta função
                </p>
                <Button onClick={adicionarPolicial} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Policial
                </Button>
              </div>
            ) : (
              <>
                {funcao.policiais.map((policial, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">
                        Policial {index + 1}
                      </Label>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removerPolicial(index)}
                        className="h-7 w-7 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Selecionar Policial</Label>
                      <PolicialSearchCombobox
                        value={policial.id}
                        onSelect={(data) => selecionarPolicial(index, data)}
                        placeholder="Buscar por nome, matrícula ou numeral..."
                      />
                    </div>

                    {policial.id && (
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm font-medium">
                          {policial.posto} {policial.matricula} {policial.nomeGuerra}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`horario-${index}`} className="text-xs">
                          Horário (opcional)
                        </Label>
                        <Input
                          id={`horario-${index}`}
                          placeholder="Ex: 08h00 às 20h00"
                          value={policial.horario || ''}
                          onChange={(e) =>
                            atualizarPolicial(index, { horario: e.target.value })
                          }
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`obs-${index}`} className="text-xs">
                          Observação (opcional)
                        </Label>
                        <Input
                          id={`obs-${index}`}
                          placeholder="Ex: (Substituído)"
                          value={policial.observacao || ''}
                          onChange={(e) =>
                            atualizarPolicial(index, { observacao: e.target.value })
                          }
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <Button onClick={adicionarPolicial} variant="outline" size="sm" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Policial Adicional (turno dividido)
                </Button>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default FuncaoCard;
