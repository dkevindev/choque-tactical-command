import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CATEGORIAS, LOCAIS, MOTIVOS_MOVIMENTACAO, SITUACOES_CARGA, movimentarSolipede,
  type Categoria, type DadosMovimentacao, type Local, type SituacaoCarga, type Solipede,
} from '@/lib/cavalhada';

interface Props {
  animal: Solipede;
  aberto: boolean;
  onFechar: () => void;
  onSalvo: () => Promise<void>;
}

const hojeISO = () => new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD no fuso local

const MovimentarSolipedeDialog = ({ animal, aberto, onFechar, onSalvo }: Props) => {
  const [m, setM] = useState<DadosMovimentacao>({
    categoria: animal.categoria, local: animal.local, situacaoCarga: animal.situacaoCarga,
    documentoCarga: animal.documentoCarga ?? '', motivo: '', documento: '', dataMovimentacao: hojeISO(), observacao: '',
  });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (aberto) setM({
      categoria: animal.categoria, local: animal.local, situacaoCarga: animal.situacaoCarga,
      documentoCarga: animal.documentoCarga ?? '', motivo: '', documento: '', dataMovimentacao: hojeISO(), observacao: '',
    });
  }, [aberto, animal]);

  const set = <K extends keyof DadosMovimentacao>(k: K, v: DadosMovimentacao[K]) => setM((x) => ({ ...x, [k]: v }));

  const salvar = async () => {
    if (!m.motivo) { toast.error('Escolha o motivo da movimentação.'); return; }
    if (!m.dataMovimentacao) { toast.error('Informe a data.'); return; }
    if ((m.situacaoCarga === 'CARGA_BCG' || m.situacaoCarga === 'CARGA_TOMBO') && !m.documentoCarga?.trim()) {
      toast.error('Informe o número do documento de carga (BCG ou tombo).'); return;
    }
    setSalvando(true);
    try {
      await movimentarSolipede(animal, {
        ...m, documentoCarga: m.situacaoCarga === 'PENDENTE' ? undefined : m.documentoCarga,
      });
      toast.success('Movimentação registrada.');
      await onSalvo();
      onFechar();
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Erro ao registrar.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Movimentar – {animal.registro} {animal.nome}</DialogTitle>
          <DialogDescription>Mude o que for necessário. A movimentação fica registrada no histórico do animal.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Categoria</Label>
            <Select value={m.categoria} onValueChange={(v) => set('categoria', v as Categoria)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(CATEGORIAS) as Categoria[]).map((k) => <SelectItem key={k} value={k}>{CATEGORIAS[k]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Local</Label>
            <Select value={m.local} onValueChange={(v) => set('local', v as Local)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(LOCAIS) as Local[]).map((k) => <SelectItem key={k} value={k}>{LOCAIS[k]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Situação de carga</Label>
            <Select value={m.situacaoCarga} onValueChange={(v) => set('situacaoCarga', v as SituacaoCarga)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(SITUACOES_CARGA) as SituacaoCarga[]).map((k) => <SelectItem key={k} value={k}>{SITUACOES_CARGA[k]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="mdoc">Documento de carga</Label>
            <Input id="mdoc" placeholder="BCG Nº 088/2022" value={m.documentoCarga ?? ''} disabled={m.situacaoCarga === 'PENDENTE'}
              onChange={(e) => set('documentoCarga', e.target.value.toUpperCase())} />
          </div>
          <div className="space-y-1">
            <Label>Motivo</Label>
            <Select value={m.motivo} onValueChange={(v) => set('motivo', v)}>
              <SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger>
              <SelectContent>{MOTIVOS_MOVIMENTACAO.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="mdata">Data</Label>
            <Input id="mdata" type="date" value={m.dataMovimentacao} onChange={(e) => set('dataMovimentacao', e.target.value)} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="mbcg">Documento que autorizou (opcional)</Label>
            <Input id="mbcg" placeholder="Ex.: BCG Nº 150/2026, ofício..." value={m.documento ?? ''} onChange={(e) => set('documento', e.target.value)} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="mobs">Observação (opcional)</Label>
            <Textarea id="mobs" rows={2} value={m.observacao ?? ''} onChange={(e) => set('observacao', e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar} disabled={salvando}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Registrar movimentação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MovimentarSolipedeDialog;
