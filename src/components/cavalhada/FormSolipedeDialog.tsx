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
  CATEGORIAS, LOCAIS, PELAGENS, RACAS, SEXOS, SITUACOES_CARGA,
  cadastrarSolipede, editarSolipede, normalizarRegistro,
  type Categoria, type DadosSolipede, type Local, type SituacaoCarga, type Sexo, type Solipede,
} from '@/lib/cavalhada';

interface Props {
  aberto: boolean;
  onFechar: () => void;
  onSalvo: () => Promise<void>;
  /** Se informado, edita os dados de identificação deste animal. */
  animal?: Solipede | null;
}

const vazio: DadosSolipede = {
  registro: '', nome: '', raca: 'MESTIÇO', sexo: 'MACHO', pelagem: '', anoNascimento: new Date().getFullYear(),
  categoria: 'ADAPTACAO', local: 'RPMONT', situacaoCarga: 'PENDENTE', documentoCarga: '', observacoes: '', dataNascimento: '', dataObito: '',
};

const FormSolipedeDialog = ({ aberto, onFechar, onSalvo, animal }: Props) => {
  const edicao = !!animal;
  const [f, setF] = useState<DadosSolipede>(vazio);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    if (animal) {
      const { id: _id, atualizadoEm: _a, ...dados } = animal;
      setF({ ...vazio, ...dados });
    } else setF(vazio);
  }, [aberto, animal]);

  const set = <K extends keyof DadosSolipede>(k: K, v: DadosSolipede[K]) => setF((x) => ({ ...x, [k]: v }));

  const salvar = async () => {
    const registro = normalizarRegistro(f.registro);
    if (!/^(EG|CV) \d{3,}$/.test(registro)) { toast.error('Registro inválido. Use EG (égua) ou CV (cavalo) + número. Ex.: EG 524'); return; }
    if (!f.nome.trim()) { toast.error('Informe o nome do animal.'); return; }
    if (!f.pelagem.trim()) { toast.error('Informe a pelagem.'); return; }
    const ano = f.dataNascimento ? Number(f.dataNascimento.slice(0, 4)) : Number(f.anoNascimento);
    if (f.dataObito && f.dataObito < (f.dataNascimento || `${ano}-01-01`)) { toast.error('A data do óbito não pode ser antes do nascimento.'); return; }
    if (!ano || ano < 1980 || ano > new Date().getFullYear()) { toast.error('Ano de nascimento inválido.'); return; }

    const dados: DadosSolipede = {
      ...f, registro, nome: f.nome.trim().toUpperCase(), pelagem: f.pelagem.trim().toUpperCase(),
      raca: f.raca.trim().toUpperCase(), anoNascimento: ano,
      dataNascimento: f.dataNascimento || undefined,
      dataObito: f.dataObito || undefined,
      documentoCarga: f.situacaoCarga === 'PENDENTE' ? undefined : f.documentoCarga?.trim() || undefined,
      observacoes: f.observacoes?.trim() || undefined,
    };
    setSalvando(true);
    try {
      if (animal) {
        await editarSolipede(animal, {
          nome: dados.nome, raca: dados.raca, sexo: dados.sexo, pelagem: dados.pelagem,
          anoNascimento: dados.anoNascimento, dataNascimento: dados.dataNascimento, dataObito: dados.dataObito,
          observacoes: dados.observacoes, documentoCarga: dados.documentoCarga,
        });
        toast.success('Dados atualizados.');
      } else {
        await cadastrarSolipede(dados);
        toast.success(`${registro} ${dados.nome} cadastrado.`);
      }
      await onSalvo();
      onFechar();
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{edicao ? `Corrigir dados – ${animal?.registro}` : 'Novo animal'}</DialogTitle>
          <DialogDescription>
            {edicao
              ? 'Corrija os dados do animal. Para mudar categoria, local ou carga, use "Movimentar"; para tirar do efetivo, "Dar descarga".'
              : 'Cadastre um solípede que entrou no efetivo.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="reg">Registro</Label>
            <Input id="reg" placeholder="EG 524 ou CV 349" value={f.registro} disabled={edicao}
              onChange={(e) => set('registro', e.target.value.toUpperCase())} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" value={f.nome} onChange={(e) => set('nome', e.target.value.toUpperCase())} />
          </div>
          <div className="space-y-1">
            <Label>Sexo</Label>
            <Select value={f.sexo} onValueChange={(v) => set('sexo', v as Sexo)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(SEXOS) as Sexo[]).map((k) => <SelectItem key={k} value={k}>{SEXOS[k]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="raca">Raça</Label>
            <Input id="raca" list="lista-racas" value={f.raca} onChange={(e) => set('raca', e.target.value.toUpperCase())} />
            <datalist id="lista-racas">{RACAS.map((r) => <option key={r} value={r} />)}</datalist>
          </div>
          <div className="space-y-1">
            <Label htmlFor="pel">Pelagem</Label>
            <Input id="pel" list="lista-pelagens" value={f.pelagem} onChange={(e) => set('pelagem', e.target.value.toUpperCase())} />
            <datalist id="lista-pelagens">{PELAGENS.map((p) => <option key={p} value={p} />)}</datalist>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="ano">Ano de nasc.</Label>
              <Input id="ano" type="number" inputMode="numeric" value={f.anoNascimento} disabled={!!f.dataNascimento}
                onChange={(e) => set('anoNascimento', Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dn">Data (se souber)</Label>
              <Input id="dn" type="date" value={f.dataNascimento ?? ''} onChange={(e) => set('dataNascimento', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="dob">Data do óbito (se morreu)</Label>
            <Input id="dob" type="date" value={f.dataObito ?? ''} onChange={(e) => set('dataObito', e.target.value)} />
          </div>
          {edicao && f.situacaoCarga !== 'PENDENTE' && (
            <div className="space-y-1">
              <Label htmlFor="edoc">Documento de carga</Label>
              <Input id="edoc" value={f.documentoCarga ?? ''} onChange={(e) => set('documentoCarga', e.target.value.toUpperCase())} />
            </div>
          )}

          {!edicao && (
            <>
              <div className="space-y-1">
                <Label>Categoria</Label>
                <Select value={f.categoria} onValueChange={(v) => set('categoria', v as Categoria)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.keys(CATEGORIAS) as Categoria[]).filter((k) => k !== 'BAIXADO').map((k) => <SelectItem key={k} value={k}>{CATEGORIAS[k]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Local</Label>
                <Select value={f.local} onValueChange={(v) => set('local', v as Local)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.keys(LOCAIS) as Local[]).map((k) => <SelectItem key={k} value={k}>{LOCAIS[k]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Situação de carga</Label>
                <Select value={f.situacaoCarga} onValueChange={(v) => set('situacaoCarga', v as SituacaoCarga)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.keys(SITUACOES_CARGA) as SituacaoCarga[]).map((k) => <SelectItem key={k} value={k}>{SITUACOES_CARGA[k]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="doc">Documento de carga</Label>
                <Input id="doc" placeholder="BCG Nº 088/2022 ou TOMBO Nº 024221" value={f.documentoCarga ?? ''}
                  disabled={f.situacaoCarga === 'PENDENTE'} onChange={(e) => set('documentoCarga', e.target.value.toUpperCase())} />
              </div>
            </>
          )}

          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="obs">Observações</Label>
            <Textarea id="obs" rows={3} value={f.observacoes ?? ''} onChange={(e) => set('observacoes', e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar} disabled={salvando}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {edicao ? 'Salvar correção' : 'Cadastrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FormSolipedeDialog;
