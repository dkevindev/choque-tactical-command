import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';

export interface Ocorrencia {
  id: string;
  numero: number;
  descricao: string;
}

interface Secao15OcorrenciasFormProps {
  ocorrencias: Ocorrencia[];
  setOcorrencias: (ocorrencias: Ocorrencia[]) => void;
}

const Secao15OcorrenciasForm = ({
  ocorrencias,
  setOcorrencias,
}: Secao15OcorrenciasFormProps) => {
  const [openItems, setOpenItems] = useState<{ [key: string]: boolean }>({});

  const adicionarOcorrencia = () => {
    const novaOcorrencia: Ocorrencia = {
      id: Date.now().toString(),
      numero: ocorrencias.length + 1,
      descricao: '',
    };
    setOcorrencias([...ocorrencias, novaOcorrencia]);
    setOpenItems({ ...openItems, [novaOcorrencia.id]: true });
  };

  const removerOcorrencia = (id: string) => {
    const atualizada = ocorrencias.filter((o) => o.id !== id);
    // Renumerar as ocorrências
    const renumerada = atualizada.map((o, index) => ({ ...o, numero: index + 1 }));
    setOcorrencias(renumerada);
    
    const newOpenItems = { ...openItems };
    delete newOpenItems[id];
    setOpenItems(newOpenItems);
  };

  const atualizarOcorrencia = (id: string, campo: keyof Ocorrencia, valor: any) => {
    setOcorrencias(
      ocorrencias.map((o) =>
        o.id === id ? { ...o, [campo]: valor } : o
      )
    );
  };

  const toggleItem = (id: string) => {
    setOpenItems({ ...openItems, [id]: !openItems[id] });
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <AlertCircle className="h-5 w-5 text-destructive" />
          15. OCORRÊNCIAS
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {ocorrencias.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma ocorrência registrada
          </p>
        ) : (
          <div className="space-y-3">
            {ocorrencias.map((ocorrencia) => (
              <Card key={ocorrencia.id} className="bg-muted border-border">
                <Collapsible open={openItems[ocorrencia.id]} onOpenChange={() => toggleItem(ocorrencia.id)}>
                  <div className="flex items-center justify-between p-4">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="flex items-center gap-2 p-0 hover:bg-transparent">
                        <span className="font-semibold text-foreground">
                          Ocorrência {String(ocorrencia.numero).padStart(2, '0')}
                        </span>
                        {openItems[ocorrencia.id] ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => removerOcorrencia(ocorrencia.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <CollapsibleContent>
                    <CardContent className="space-y-4 pt-0">
                      <div>
                        <label className="text-sm font-medium text-foreground">Descrição:</label>
                        <Textarea
                          value={ocorrencia.descricao}
                          onChange={(e) => atualizarOcorrencia(ocorrencia.id, 'descricao', e.target.value)}
                          placeholder="Descreva a ocorrência..."
                          rows={4}
                          className="mt-1 resize-none"
                        />
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        )}

        <Button onClick={adicionarOcorrencia} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Ocorrência
        </Button>
      </CardContent>
    </Card>
  );
};

export default Secao15OcorrenciasForm;
