import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRightLeft, Loader2, PencilLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  CATEGORIAS, LOCAIS, SEXOS, SITUACOES_CARGA, formatarNascimento, historicoDoSolipede, idade, pendencias,
  type EventoHistorico, type Solipede,
} from '@/lib/cavalhada';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import LinhaDoTempo from './LinhaDoTempo';
import FormSolipedeDialog from './FormSolipedeDialog';
import MovimentarSolipedeDialog from './MovimentarSolipedeDialog';

interface Props {
  animal: Solipede | null;
  aberto: boolean;
  onFechar: () => void;
  onAlterado: () => Promise<void>;
  /** Muda quando algo foi salvo, para recarregar o histórico. */
  versao: number;
}

const Campo = ({ rotulo, valor }: { rotulo: string; valor: string }) => (
  <div>
    <p className="text-xs text-muted-foreground">{rotulo}</p>
    <p className="text-sm font-medium text-foreground">{valor || '—'}</p>
  </div>
);

type RegistroDmv = { id: string } & Record<string, string>;

/** Atendimentos e vacinas do DMV ligados a este animal. */
const buscarDmv = async (colecao: string, animalId: string): Promise<RegistroDmv[]> => {
  const snap = await getDocs(query(collection(db, colecao), where('animalId', '==', animalId)));
  // Registros excluídos ficam guardados no banco (com quem excluiu), mas não aparecem.
  return snap.docs.filter((d) => d.data().excluido !== true).map((d) => ({ id: d.id, ...d.data() }) as RegistroDmv);
};

const dataBR = (v?: string) => (v ? v.split('-').reverse().join('/') : '-');

const FichaSolipede = ({ animal, aberto, onFechar, onAlterado, versao }: Props) => {
  const [historico, setHistorico] = useState<EventoHistorico[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [movimentando, setMovimentando] = useState(false);
  const [atendimentos, setAtendimentos] = useState<RegistroDmv[]>([]);
  const [vacinas, setVacinas] = useState<RegistroDmv[]>([]);

  useEffect(() => {
    if (!animal?.id || !aberto) return;
    let ativo = true;
    setCarregando(true);
    historicoDoSolipede(animal.id)
      .then((h) => { if (ativo) setHistorico(h); })
      .catch((e) => console.error(e))
      .finally(() => { if (ativo) setCarregando(false); });
    Promise.all([buscarDmv('dmv_atendimentos', animal.id), buscarDmv('dmv_vacinas', animal.id)])
      .then(([a, v]) => {
        if (!ativo) return;
        setAtendimentos(a.sort((x, y) => String(y.data ?? '').localeCompare(String(x.data ?? ''))));
        setVacinas(v.sort((x, y) => String(y.dataAplicacao ?? '').localeCompare(String(x.dataAplicacao ?? ''))));
      })
      .catch((e) => console.error(e));
    return () => { ativo = false; };
  }, [animal?.id, aberto, versao]);

  if (!animal) return null;
  const p = pendencias(animal);

  return (
    <>
      <Dialog open={aberto && !editando && !movimentando} onOpenChange={(o) => !o && onFechar()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-muted-foreground">{animal.registro}</span> {animal.nome}
            </DialogTitle>
            <DialogDescription>{CATEGORIAS[animal.categoria]} · {LOCAIS[animal.local]}</DialogDescription>
          </DialogHeader>

          {p.length > 0 && (
            <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm space-y-1">
              {p.map((t) => <p key={t} className="flex items-center gap-2 text-amber-700"><AlertTriangle className="h-4 w-4" />{t}</p>)}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Campo rotulo="Raça" valor={animal.raca} />
            <Campo rotulo="Sexo" valor={SEXOS[animal.sexo]} />
            <Campo rotulo="Pelagem" valor={animal.pelagem} />
            <Campo rotulo="Nascimento" valor={`${formatarNascimento(animal)} (${idade(animal)} anos)`} />
            <Campo rotulo="Categoria" valor={CATEGORIAS[animal.categoria]} />
            <Campo rotulo="Local" valor={LOCAIS[animal.local]} />
            <div>
              <p className="text-xs text-muted-foreground">Situação de carga</p>
              <Badge variant="outline">{SITUACOES_CARGA[animal.situacaoCarga]}</Badge>
            </div>
            <Campo rotulo="Documento de carga" valor={animal.documentoCarga ?? ''} />
          </div>
          {animal.observacoes && <Campo rotulo="Observações" valor={animal.observacoes} />}

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setMovimentando(true)}><ArrowRightLeft className="h-4 w-4 mr-2" />Movimentar</Button>
            <Button variant="outline" onClick={() => setEditando(true)}><PencilLine className="h-4 w-4 mr-2" />Corrigir dados</Button>
          </div>

          <Separator />
          <h3 className="font-semibold text-foreground">Prontuário ({atendimentos.length})</h3>
          {atendimentos.length === 0
            ? <p className="text-sm text-muted-foreground">Nenhum atendimento registrado.</p>
            : (
              <ul className="text-sm space-y-2">
                {atendimentos.slice(0, 5).map((a) => (
                  <li key={a.id} className="border-l-2 border-border pl-3">
                    <p className="text-foreground"><span className="font-medium">{dataBR(a.data)}</span> · {a.tipo} · {a.veterinario}</p>
                    {a.diagnostico && <p className="text-muted-foreground">{a.diagnostico}</p>}
                  </li>
                ))}
                {atendimentos.length > 5 && <li className="text-xs text-muted-foreground">+ {atendimentos.length - 5} na aba Prontuário</li>}
              </ul>
            )}

          <h3 className="font-semibold text-foreground">Vacinas e vermifugação ({vacinas.length})</h3>
          {vacinas.length === 0
            ? <p className="text-sm text-muted-foreground">Nenhuma aplicação registrada.</p>
            : (
              <ul className="text-sm space-y-1">
                {vacinas.slice(0, 5).map((v) => (
                  <li key={v.id} className="text-foreground">
                    <span className="font-medium">{dataBR(v.dataAplicacao)}</span> · {v.tipo} · {v.produto}
                    {v.proximaDose && <span className="text-muted-foreground"> · próxima: {dataBR(v.proximaDose)}</span>}
                  </li>
                ))}
                {vacinas.length > 5 && <li className="text-xs text-muted-foreground">+ {vacinas.length - 5} na aba Vacinas</li>}
              </ul>
            )}

          <Separator />
          <h3 className="font-semibold text-foreground">Movimentações</h3>
          {carregando
            ? <p className="text-sm text-muted-foreground flex items-center"><Loader2 className="h-4 w-4 animate-spin mr-2" />Carregando...</p>
            : <LinhaDoTempo eventos={historico} />}
        </DialogContent>
      </Dialog>

      <FormSolipedeDialog aberto={editando} animal={animal} onFechar={() => setEditando(false)} onSalvo={onAlterado} />
      <MovimentarSolipedeDialog aberto={movimentando} animal={animal} onFechar={() => setMovimentando(false)} onSalvo={onAlterado} />
    </>
  );
};

export default FichaSolipede;
