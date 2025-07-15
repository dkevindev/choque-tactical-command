import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Users } from 'lucide-react';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/firebase';
import { useToast } from "@/hooks/use-toast";

interface Policial {
  id: string;
  NOME: string;
  'Post/Grad': string;
  SITUAÇÃO: string;
  'FUNÇÃO': string;
  Unidade: string;
  funcaoOrigem?: string;
}

interface FuncaoTabProps {
  policiais: Policial[];
  onUpdate: () => void;
}

const FUNCOES_DISPONIVEIS = [
  'OFICIAL',
  'A DISP DE OUTROS',
  'RESP A PROCESSO (PAD/CD...)',
  'FERRADOR',
  'FISCAL DE DIA',
  'AUXILIAR 1ª SECAO',
  'MOTORISTA ADM',
  'FISCAL DE BAIA',
  'PROJETOS SOCIAIS',
  'SENTINELA CAVALARICO',
  'MONTADO - POLICIAMENTO OSTENSIVO',
  'AUXILIAR DE MEDICO VETERINARIO',
  'GUARDA DO QUARTEL',
  'DOMA',
  'LTS',
  'ARMEIRO',
  'MOTORISTA TA-TP',
  'AUXILIAR 5ª SECAO',
  'CORREEIRO',
  'VIATURA',
  'AUXILIAR DO DMV',
  'SELEIRO',
  'AUXILIAR 6ª SECAO',
  'RR AGUARDANDO',
  'TRATORISTA',
  'AUXILIAR 3ª SECAO',
  'AUXILIAR 4ª SECAO'
];

const FuncaoTab: React.FC<FuncaoTabProps> = ({ policiais, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Organizar policiais por função
  const policiaisPorFuncao = FUNCOES_DISPONIVEIS.reduce((acc, funcao) => {
    acc[funcao] = policiais.filter(p => p['FUNÇÃO'] === funcao);
    return acc;
  }, {} as Record<string, Policial[]>);

  // Policiais sem função definida ou com função não listada
  const policiaisSemFuncao = policiais.filter(p => 
    !p['FUNÇÃO'] || !FUNCOES_DISPONIVEIS.includes(p['FUNÇÃO'])
  );

  const handleDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    // Se foi solto no mesmo lugar
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const novaFuncao = destination.droppableId;
    const policialId = draggableId;

    setLoading(true);
    try {
      const policial = policiais.find(p => p.id === policialId);
      if (!policial) return;

      const policialRef = doc(db, 'policiais', policialId);
      await updateDoc(policialRef, {
        'FUNÇÃO': novaFuncao,
        funcaoOrigem: novaFuncao // Atualizar função origem também
      });

      toast({
        title: "Sucesso",
        description: `${policial['Post/Grad']} ${policial.NOME} movido para ${novaFuncao}`
      });

      onUpdate();
    } catch (error) {
      console.error('Erro ao atualizar função:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar função do policial",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const PolicialCard = ({ policial, index }: { policial: Policial; index: number }) => (
    <Draggable draggableId={policial.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`p-3 bg-white border rounded-lg shadow-sm mb-2 flex items-center gap-2 ${
            snapshot.isDragging ? 'shadow-lg' : ''
          }`}
        >
          <GripVertical className="h-4 w-4 text-gray-400" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {policial['Post/Grad']}
              </Badge>
              <span className="font-medium text-sm">{policial.NOME}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {policial.SITUAÇÃO}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestão de Funções - Drag & Drop
          </CardTitle>
          <CardDescription>
            Arraste os policiais entre as funções para reorganizar o efetivo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Como usar:</strong> Clique e arraste os policiais pelos cartões para movê-los entre as diferentes funções. 
              A alteração será salva automaticamente no Firebase.
            </p>
          </div>
        </CardContent>
      </Card>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Policiais sem função definida */}
          <Card className="border-orange-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-orange-800">
                Sem Função Definida ({policiaisSemFuncao.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Droppable droppableId="SEM_FUNCAO">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[100px] p-2 rounded-lg ${
                      snapshot.isDraggingOver ? 'bg-orange-100' : 'bg-orange-50'
                    }`}
                  >
                    {policiaisSemFuncao.map((policial, index) => (
                      <PolicialCard key={policial.id} policial={policial} index={index} />
                    ))}
                    {provided.placeholder}
                    {policiaisSemFuncao.length === 0 && (
                      <div className="text-center text-muted-foreground text-sm py-8">
                        Nenhum policial sem função
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </CardContent>
          </Card>

          {/* Funções organizadas */}
          {FUNCOES_DISPONIVEIS.map(funcao => (
            <Card key={funcao}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  {funcao} ({policiaisPorFuncao[funcao]?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Droppable droppableId={funcao}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[100px] p-2 rounded-lg ${
                        snapshot.isDraggingOver ? 'bg-blue-100' : 'bg-gray-50'
                      }`}
                    >
                      {policiaisPorFuncao[funcao]?.map((policial, index) => (
                        <PolicialCard key={policial.id} policial={policial} index={index} />
                      ))}
                      {provided.placeholder}
                      {(!policiaisPorFuncao[funcao] || policiaisPorFuncao[funcao].length === 0) && (
                        <div className="text-center text-muted-foreground text-sm py-8">
                          Arraste policiais aqui
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>
          ))}
        </div>
      </DragDropContext>

      {/* Estatísticas */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo por Funções</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {FUNCOES_DISPONIVEIS
              .filter(funcao => policiaisPorFuncao[funcao]?.length > 0)
              .map(funcao => (
                <div key={funcao} className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {policiaisPorFuncao[funcao]?.length || 0}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {funcao.length > 20 ? `${funcao.substring(0, 17)}...` : funcao}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Atualizando função...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FuncaoTab;