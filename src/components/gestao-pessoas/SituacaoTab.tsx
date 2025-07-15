import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, Calendar, Users, Bell } from 'lucide-react';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/firebase';
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isWithinInterval, addDays } from 'date-fns';

interface Policial {
  id: string;
  NOME: string;
  'Post/Grad': string;
  SITUAÇÃO: string;
  'FUNÇÃO': string;
  Unidade: string;
  inicioSituacao?: string;
  fimSituacao?: string;
  observacaoSituacao?: string;
}

interface SituacaoTabProps {
  policiais: Policial[];
  onUpdate: () => void;
}

const SITUACOES_DISPONIVEIS = [
  'FÉRIAS',
  'READAPTAÇÃO FUNCIONAL',
  'LICENÇA TRATAMENTO DE SAUDE',
  'LICENÇA PATERNIDADE',
  'LICENÇA MATERNIDADE',
  'RECOMPENSA MILITAR',
  'NUPCIAS',
  'LUTO',
  'CURSANDO',
  'TRANSITO',
  'RESP. PROCESSO',
  'DESERTOR',
  'A DISP. DE OUTROS ORGÃOS',
  'RECOLHIDO PRES. MILITAR',
  'AGREGADO',
  'AGREGADO - AGUARDANDO RESERVA'
];

const SituacaoTab: React.FC<SituacaoTabProps> = ({ policiais, onUpdate }) => {
  const [selectedPoliciais, setSelectedPoliciais] = useState<string[]>([]);
  const [novaSituacao, setNovaSituacao] = useState('');
  const [inicioSituacao, setInicioSituacao] = useState('');
  const [fimSituacao, setFimSituacao] = useState('');
  const [observacao, setObservacao] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const { toast } = useToast();

  // Policiais com situações que têm data de fim próxima (próximos 7 dias)
  const alertasSituacao = policiais.filter(policial => {
    if (!policial.fimSituacao) return false;
    try {
      const fimData = parseISO(policial.fimSituacao);
      const agora = new Date();
      const em7dias = addDays(agora, 7);
      return isWithinInterval(fimData, { start: agora, end: em7dias });
    } catch {
      return false;
    }
  });

  const handleUpdateSituacao = async (policialId: string, dadosSituacao: any) => {
    setLoading(true);
    try {
      const policialRef = doc(db, 'policiais', policialId);
      await updateDoc(policialRef, {
        SITUAÇÃO: dadosSituacao.situacao,
        inicioSituacao: dadosSituacao.inicio,
        fimSituacao: dadosSituacao.fim || null,
        observacaoSituacao: dadosSituacao.observacao || ''
      });

      const policial = policiais.find(p => p.id === policialId);
      toast({
        title: "Sucesso",
        description: `Situação de ${policial?.NOME} atualizada`
      });

      onUpdate();
    } catch (error) {
      console.error('Erro ao atualizar situação:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar situação",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpdateSituacao = async () => {
    if (selectedPoliciais.length === 0 || !novaSituacao) {
      toast({
        title: "Erro",
        description: "Selecione policiais e uma situação",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const batch = writeBatch(db);

      selectedPoliciais.forEach(policialId => {
        const policialRef = doc(db, 'policiais', policialId);
        batch.update(policialRef, {
          SITUAÇÃO: novaSituacao,
          inicioSituacao: inicioSituacao,
          fimSituacao: fimSituacao || null,
          observacaoSituacao: observacao || ''
        });
      });

      await batch.commit();

      toast({
        title: "Sucesso",
        description: `Situação de ${selectedPoliciais.length} policial(is) atualizada`
      });

      // Reset form
      setSelectedPoliciais([]);
      setNovaSituacao('');
      setInicioSituacao('');
      setFimSituacao('');
      setObservacao('');
      setShowBulkDialog(false);
      onUpdate();
    } catch (error) {
      console.error('Erro ao atualizar situações:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar situações",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getBadgeVariant = (situacao: string) => {
    if (situacao.includes('FÉRIAS')) return 'secondary';
    if (situacao.includes('LICENÇA')) return 'destructive';
    if (situacao.includes('CURSANDO')) return 'default';
    if (situacao.includes('LUTO') || situacao.includes('DESERTOR')) return 'destructive';
    return 'outline';
  };

  return (
    <div className="space-y-6">
      {/* Alertas de Situações Próximas do Fim */}
      {alertasSituacao.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Bell className="h-5 w-5" />
              Alertas - Situações Terminando em Breve
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alertasSituacao.map(policial => (
                <div key={policial.id} className="flex justify-between items-center p-2 bg-white rounded">
                  <div>
                    <span className="font-medium">{policial['Post/Grad']} {policial.NOME}</span>
                    <Badge variant="outline" className="ml-2">
                      {policial.SITUAÇÃO}
                    </Badge>
                  </div>
                  <Badge variant="destructive">
                    Termina em {policial.fimSituacao ? format(parseISO(policial.fimSituacao), 'dd/MM/yyyy') : 'Data não informada'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Atualização em Lote */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Atualizar Situação (Múltiplos Policiais)
          </CardTitle>
          <CardDescription>
            Selecione vários policiais para alterar a situação de uma vez
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setShowBulkDialog(true)}>
            Atualizar em Lote ({selectedPoliciais.length} selecionados)
          </Button>
        </CardContent>
      </Card>

      {/* Tabela de Policiais */}
      <Card>
        <CardHeader>
          <CardTitle>Situação Atual dos Policiais</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPoliciais(policiais.map(p => p.id));
                      } else {
                        setSelectedPoliciais([]);
                      }
                    }}
                    checked={selectedPoliciais.length === policiais.length}
                  />
                </TableHead>
                <TableHead>Post/Grad</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Situação Atual</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Fim</TableHead>
                <TableHead>Observação</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policiais.map(policial => (
                <TableRow key={policial.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedPoliciais.includes(policial.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPoliciais([...selectedPoliciais, policial.id]);
                        } else {
                          setSelectedPoliciais(selectedPoliciais.filter(id => id !== policial.id));
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>{policial['Post/Grad']}</TableCell>
                  <TableCell>{policial.NOME}</TableCell>
                  <TableCell>
                    <Badge variant={getBadgeVariant(policial.SITUAÇÃO)}>
                      {policial.SITUAÇÃO}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {policial.inicioSituacao ? format(parseISO(policial.inicioSituacao), 'dd/MM/yyyy') : '-'}
                  </TableCell>
                  <TableCell>
                    {policial.fimSituacao ? format(parseISO(policial.fimSituacao), 'dd/MM/yyyy') : '-'}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {policial.observacaoSituacao || '-'}
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          Editar
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Alterar Situação</DialogTitle>
                          <DialogDescription>
                            {policial['Post/Grad']} {policial.NOME}
                          </DialogDescription>
                        </DialogHeader>
                        <EditSituacaoForm
                          policial={policial}
                          onSave={(dados) => handleUpdateSituacao(policial.id, dados)}
                          loading={loading}
                        />
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de Atualização em Lote */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Atualizar Situação em Lote</DialogTitle>
            <DialogDescription>
              Alterar situação de {selectedPoliciais.length} policial(is) selecionado(s)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nova Situação</Label>
              <Select value={novaSituacao} onValueChange={setNovaSituacao}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma situação" />
                </SelectTrigger>
                <SelectContent>
                  {SITUACOES_DISPONIVEIS.map(situacao => (
                    <SelectItem key={situacao} value={situacao}>
                      {situacao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data de Início</Label>
                <Input
                  type="date"
                  value={inicioSituacao}
                  onChange={(e) => setInicioSituacao(e.target.value)}
                />
              </div>
              <div>
                <Label>Data de Fim (opcional)</Label>
                <Input
                  type="date"
                  value={fimSituacao}
                  onChange={(e) => setFimSituacao(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Observação (opcional)</Label>
              <Input
                placeholder="Ex: Portaria nº 123/2024"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleBulkUpdateSituacao} disabled={loading}>
              {loading ? "Atualizando..." : "Confirmar Alteração"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Componente para editar situação individual
const EditSituacaoForm: React.FC<{
  policial: Policial;
  onSave: (dados: any) => void;
  loading: boolean;
}> = ({ policial, onSave, loading }) => {
  const [situacao, setSituacao] = useState(policial.SITUAÇÃO || '');
  const [inicio, setInicio] = useState(policial.inicioSituacao || '');
  const [fim, setFim] = useState(policial.fimSituacao || '');
  const [observacao, setObservacao] = useState(policial.observacaoSituacao || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      situacao,
      inicio,
      fim,
      observacao
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Situação</Label>
        <Select value={situacao} onValueChange={setSituacao}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma situação" />
          </SelectTrigger>
          <SelectContent>
            {SITUACOES_DISPONIVEIS.map(sit => (
              <SelectItem key={sit} value={sit}>
                {sit}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Data de Início</Label>
          <Input
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
          />
        </div>
        <div>
          <Label>Data de Fim (opcional)</Label>
          <Input
            type="date"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label>Observação</Label>
        <Input
          placeholder="Ex: Portaria nº 123/2024"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
        />
      </div>

      <DialogFooter>
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default SituacaoTab;