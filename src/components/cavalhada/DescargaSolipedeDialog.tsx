import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MOTIVOS_DESCARGA, descarregarSolipede, type Solipede } from '@/lib/cavalhada';

interface Props {
  animal: Solipede;
  aberto: boolean;
  onFechar: () => void;
  onSalvo: () => Promise<void>;
}

const hojeISO = () => new Date().toLocaleDateString('sv-SE');

/** Descarga = o animal deixa de pertencer ao RPMont. */
const DescargaSolipedeDialog = ({ animal, aberto, onFechar, onSalvo }: Props) => {
  const [motivo, setMotivo] = useState('');
  const [data, setData] = useState(hojeISO());
  const [documento, setDocumento] = useState('');
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const obito = motivo === 'Óbito';

  useEffect(() => {
    if (aberto) { setMotivo(''); setData(hojeISO()); setDocumento(''); setObservacao(''); }
  }, [aberto]);

  const salvar = async () => {
    if (!motivo) { toast.error('Escolha o motivo da descarga.'); return; }
    if (!data) { toast.error('Informe a data.'); return; }
    if (data > hojeISO()) { toast.error('A data não pode ser no futuro.'); return; }
    if (obito && data < (animal.dataNascimento || `${animal.anoNascimento}-01-01`)) {
      toast.error('A data do óbito não pode ser antes do nascimento.'); return;
    }
    setSalvando(true);
    try {
      await descarregarSolipede(animal, {
        motivo, dataMovimentacao: data, documento, observacao, dataObito: obito ? data : undefined,
      });
      toast.success(`${animal.registro} ${animal.nome} descarregado.`);
      await onSalvo();
      onFechar();
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Erro ao registrar descarga.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Dar descarga – {animal.registro} {animal.nome}</DialogTitle>
          <DialogDescription>
            O animal deixa de pertencer ao RPMont: passa a "Baixado" com situação "Descarga". Fica registrado no histórico.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Motivo</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger>
              <SelectContent>{MOTIVOS_DESCARGA.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ddata">{obito ? 'Data do óbito' : 'Data da descarga'}</Label>
            <Input id="ddata" type="date" value={data} max={hojeISO()} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="ddoc">Documento (opcional)</Label>
            <Input id="ddoc" placeholder="Ex.: BCG Nº 150/2026, laudo, ofício..." value={documento} onChange={(e) => setDocumento(e.target.value)} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="dobs">Observação (opcional)</Label>
            <Textarea id="dobs" rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar} disabled={salvando}>Cancelar</Button>
          <Button variant="destructive" onClick={salvar} disabled={salvando}>
            {salvando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Confirmar descarga
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DescargaSolipedeDialog;
