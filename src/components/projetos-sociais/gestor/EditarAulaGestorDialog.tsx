import { useState, useEffect } from 'react';
import { collection, doc, getDocs, query, where, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { buscarPolicialPorId, formatarNomePolicial } from '@/lib/policialUtils';

interface Props {
  aula: any;
  projeto: any;
  policialLogado?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const toDate = (valor: any): Date => {
  try {
    return valor?.toDate ? valor.toDate() : new Date(valor);
  } catch {
    return new Date();
  }
};

const EditarAulaGestorDialog = ({ aula, projeto, policialLogado, open, onOpenChange, onSuccess }: Props) => {
  const config = projeto?.configuracao || {};
  const usaTurmas = config.usaTurmas || false;
  const turnosNomeclatura: string[] = config.turnosNomeclatura || ['Manhã', 'Tarde', 'Noite', 'Noturno'];
  const maxInstrutores = config.maxInstrutoresPorTurno || 2;

  const [data, setData] = useState<Date | undefined>(undefined);
  const [turno, setTurno] = useState<string>('');
  const [turmaId, setTurmaId] = useState<string>('');
  const [instrutoresSelecionados, setInstrutoresSelecionados] = useState<string[]>([]);
  const [instrutoresDisponiveis, setInstrutoresDisponiveis] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!open || !aula) return;
    setData(toDate(aula.data));
    setTurno(aula.turno != null ? String(aula.turno) : '');
    setTurmaId(aula.turmaId || '');
    setInstrutoresSelecionados(aula.instrutores || []);
    carregarDados();
  }, [open, aula?.id]);

  const carregarDados = async () => {
    setCarregando(true);
    try {
      const instrutoresSnap = await getDocs(
        query(collection(db, 'projetos_instrutores'), where('projetoId', '==', projeto.id))
      );
      const lista = await Promise.all(
        instrutoresSnap.docs.map(async (d) => {
          const policialId = d.data().policialId;
          if (!policialId) return null;
          const policial = await buscarPolicialPorId(policialId);
          return { id: policialId, nome: policial ? formatarNomePolicial(policial) : policialId };
        })
      );
      const unicos = new Map<string, any>();
      lista.filter(Boolean).forEach((i: any) => unicos.set(i.id, i));
      setInstrutoresDisponiveis(Array.from(unicos.values()));

      if (usaTurmas) {
        const turmasSnap = await getDocs(
          query(collection(db, 'projetos_turmas'), where('projetoId', '==', projeto.id))
        );
        setTurmas(turmasSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      }
    } catch (error) {
      console.error('Erro ao carregar dados da edição:', error);
      toast.error('Erro ao carregar instrutores/turmas');
    } finally {
      setCarregando(false);
    }
  };

  const toggleInstrutor = (id: string) => {
    setInstrutoresSelecionados((atual) => {
      if (atual.includes(id)) return atual.filter((i) => i !== id);
      if (atual.length >= maxInstrutores) {
        toast.error(`Máximo de ${maxInstrutores} instrutores por turno`);
        return atual;
      }
      return [...atual, id];
    });
  };

  const salvar = async () => {
    if (!data) {
      toast.error('Selecione a data da aula');
      return;
    }
    if (turno === '') {
      toast.error('Selecione o turno/horário');
      return;
    }
    if (usaTurmas && !turmaId) {
      toast.error('Selecione a turma');
      return;
    }
    if (instrutoresSelecionados.length === 0) {
      toast.error('Selecione ao menos um instrutor');
      return;
    }

    setSalvando(true);
    try {
      const turnoNum = Number(turno);
      const dataOriginal = toDate(aula.data);
      const mudancas: string[] = [];

      if (format(dataOriginal, 'dd/MM/yy') !== format(data, 'dd/MM/yy')) {
        mudancas.push(`Data: ${format(dataOriginal, 'dd/MM/yy')} → ${format(data, 'dd/MM/yy')}`);
      }
      if (Number(aula.turno) !== turnoNum) {
        mudancas.push(`Turno: ${aula.turnoNome || aula.turno} → ${turnosNomeclatura[turnoNum - 1] || turnoNum}`);
      }
      if ((aula.turmaId || '') !== turmaId) {
        const nomeNovo = turmas.find((t) => t.id === turmaId)?.nome || turmaId || '-';
        mudancas.push(`Turma alterada para: ${nomeNovo}`);
      }
      const antes = [...(aula.instrutores || [])].sort().join(',');
      const depois = [...instrutoresSelecionados].sort().join(',');
      if (antes !== depois) mudancas.push('Instrutores alterados');

      const payload: any = {
        data: Timestamp.fromDate(data),
        turno: turnoNum,
        turnoNome: turnosNomeclatura[turnoNum - 1] || `Turno ${turnoNum}`,
        instrutores: instrutoresSelecionados,
        instrutoresCompleto: instrutoresSelecionados.length === maxInstrutores,
        maxInstrutores,
        editadoEm: Timestamp.now(),
      };

      if (usaTurmas) {
        payload.turmaId = turmaId;
        payload.turmaNome = turmas.find((t) => t.id === turmaId)?.nome || '';
      }

      payload.historico = arrayUnion({
        tipo: 'edicao_aula',
        data: Timestamp.now(),
        realizadoPor: policialLogado?.id || policialLogado?.Matrícula || 'gestor',
        detalhes: mudancas.length ? mudancas.join(' | ') : 'Aula reeditada sem alterações de campos',
      });

      await updateDoc(doc(db, 'projetos_aulas', aula.id), payload);
      toast.success('Aula atualizada com sucesso!');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Erro ao editar aula:', error);
      toast.error('Erro ao salvar alterações da aula');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Aula</DialogTitle>
        </DialogHeader>

        {carregando ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Data da aula</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start text-left font-normal', !data && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {data ? format(data, 'dd/MM/yy', { locale: ptBR }) : 'Selecione a data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={data}
                    onSelect={setData}
                    locale={ptBR}
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Turno / Horário</Label>
              <Select value={turno} onValueChange={setTurno}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o turno" />
                </SelectTrigger>
                <SelectContent>
                  {turnosNomeclatura.map((nome, idx) => (
                    <SelectItem key={idx} value={String(idx + 1)}>
                      {nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {usaTurmas && (
              <div className="space-y-2">
                <Label>Turma</Label>
                <Select value={turmaId} onValueChange={setTurmaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a turma" />
                  </SelectTrigger>
                  <SelectContent>
                    {turmas.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nome || t.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>
                Instrutores ({instrutoresSelecionados.length}/{maxInstrutores})
              </Label>
              <ScrollArea className="max-h-52 rounded-md border p-3">
                <div className="space-y-2">
                  {instrutoresDisponiveis.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhum instrutor vinculado ao projeto</p>
                  )}
                  {instrutoresDisponiveis.map((inst) => (
                    <div key={inst.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`inst-${inst.id}`}
                        checked={instrutoresSelecionados.includes(inst.id)}
                        onCheckedChange={() => toggleInstrutor(inst.id)}
                      />
                      <Label htmlFor={`inst-${inst.id}`} className="text-sm font-normal cursor-pointer">
                        {inst.nome}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando || carregando}>
            {salvando ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...
              </>
            ) : (
              'Salvar alterações'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditarAulaGestorDialog;
