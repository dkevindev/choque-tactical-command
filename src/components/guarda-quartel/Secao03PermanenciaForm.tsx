import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Home } from 'lucide-react';
import PolicialSearchCombobox, { PolicialData } from './PolicialSearchCombobox';

export interface PolicialPermanencia {
  id: string;
  posto: string;
  numeral: string;
  nomeGuerra: string;
  funcao: string;
  horario?: string;
  observacao?: string;
}

interface Secao03PermanenciaFormProps {
  escalaPermanencia: PolicialPermanencia[];
  setEscalaPermanencia: (escala: PolicialPermanencia[]) => void;
}

const FUNCOES_PERMANENCIA = [
  'Adjunto',
  'Aux Adjunto',
  'Armeiro',
  'Motorista',
  'Seleiro',
  'Aux. de Méd.Vet.',
  'Cavalariço',
  'Posto avançado',
  'Outra',
];

const Secao03PermanenciaForm = ({
  escalaPermanencia,
  setEscalaPermanencia,
}: Secao03PermanenciaFormProps) => {
  const [policialSelecionadoId, setPolicialSelecionadoId] = useState<string>('');
  const [funcaoSelecionada, setFuncaoSelecionada] = useState<string>('');
  const [funcaoCustomizada, setFuncaoCustomizada] = useState<string>('');
  const [horario, setHorario] = useState<string>('');
  const [observacao, setObservacao] = useState<string>('');

  const handleAdicionarPolicial = (policialData: PolicialData | null) => {
    if (!policialData) return;
    setPolicialSelecionadoId(policialData.id);
  };

  const handleConfirmarAdicao = () => {
    if (!policialSelecionadoId || !funcaoSelecionada) return;

    // Buscar dados do policial já carregado no combobox
    const funcaoFinal = funcaoSelecionada === 'Outra' ? funcaoCustomizada : funcaoSelecionada;
    
    if (!funcaoFinal) return;

    // Precisamos buscar o policial do combobox
    // Por isso vamos fazer diferente: vamos adicionar diretamente quando selecionar
  };

  const adicionarPolicialPermanencia = (policialData: PolicialData) => {
    const novoPolicialPermanencia: PolicialPermanencia = {
      id: `perm_${Date.now()}_${Math.random()}`,
      posto: policialData.posto,
      numeral: policialData.numeral ? String(policialData.numeral) : '',
      nomeGuerra: policialData.nomeGuerra,
      funcao: '',
      horario: '',
      observacao: '',
    };

    setEscalaPermanencia([...escalaPermanencia, novoPolicialPermanencia]);
  };

  const atualizarPolicialPermanencia = (id: string, campo: keyof PolicialPermanencia, valor: string) => {
    setEscalaPermanencia(
      escalaPermanencia.map((p) =>
        p.id === id ? { ...p, [campo]: valor } : p
      )
    );
  };

  const removerPolicialPermanencia = (id: string) => {
    setEscalaPermanencia(escalaPermanencia.filter((p) => p.id !== id));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="h-5 w-5" />
          03. ESCALA DE PERMANÊNCIA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Botão para adicionar novo policial */}
        <PolicialSearchCombobox
          onSelect={(policial) => {
            if (policial) adicionarPolicialPermanencia(policial);
          }}
          placeholder="Buscar policial para adicionar à permanência..."
        />

        {/* Tabela de policiais escalados */}
        {escalaPermanencia.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">GRAD</TableHead>
                  <TableHead className="w-[80px]">Nº</TableHead>
                  <TableHead className="w-[150px]">NOME</TableHead>
                  <TableHead className="w-[180px]">FUNÇÃO</TableHead>
                  <TableHead className="w-[120px]">HORÁRIO</TableHead>
                  <TableHead className="w-[150px]">OBS</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {escalaPermanencia.map((policial) => (
                  <TableRow key={policial.id}>
                    <TableCell className="font-medium">{policial.posto}</TableCell>
                    <TableCell>{policial.numeral}</TableCell>
                    <TableCell>{policial.nomeGuerra}</TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <Select
                          value={policial.funcao && !FUNCOES_PERMANENCIA.includes(policial.funcao) ? 'Outra' : policial.funcao}
                          onValueChange={(value) => {
                            if (value === 'Outra') {
                              atualizarPolicialPermanencia(policial.id, 'funcao', '');
                            } else {
                              atualizarPolicialPermanencia(policial.id, 'funcao', value);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {FUNCOES_PERMANENCIA.map((funcao) => (
                              <SelectItem key={funcao} value={funcao}>
                                {funcao}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {(!FUNCOES_PERMANENCIA.includes(policial.funcao) || policial.funcao === '') && (
                          <Input
                            placeholder="Digite a função..."
                            value={policial.funcao}
                            onChange={(e) => atualizarPolicialPermanencia(policial.id, 'funcao', e.target.value)}
                            className="h-8"
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="08-20h"
                        value={policial.horario || ''}
                        onChange={(e) => atualizarPolicialPermanencia(policial.id, 'horario', e.target.value)}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="Obs..."
                        value={policial.observacao || ''}
                        onChange={(e) => atualizarPolicialPermanencia(policial.id, 'observacao', e.target.value)}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removerPolicialPermanencia(policial.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {escalaPermanencia.length === 0 && (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
            <Home className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum policial adicionado à permanência</p>
            <p className="text-sm">Use o campo acima para buscar e adicionar policiais</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Secao03PermanenciaForm;
