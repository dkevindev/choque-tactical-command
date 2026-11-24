import { ArrowRightLeft, FilePlus2, Import, PencilLine } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  formatarDataBR, formatarTimestamp, rotuloCampo, rotuloValor,
  type EventoHistorico, type TipoEventoHistorico,
} from '@/lib/cavalhada';

const ICONES: Record<TipoEventoHistorico, typeof Import> = {
  IMPORTACAO: Import, CADASTRO: FilePlus2, EDICAO: PencilLine, MOVIMENTACAO: ArrowRightLeft,
};
const ROTULOS: Record<TipoEventoHistorico, string> = {
  IMPORTACAO: 'Importação', CADASTRO: 'Cadastro', EDICAO: 'Correção de dados', MOVIMENTACAO: 'Movimentação',
};

interface Props {
  eventos: EventoHistorico[];
  /** Mostra registro e nome do animal (no histórico geral). */
  mostrarAnimal?: boolean;
  onAbrir?: (id: string) => void;
}

const LinhaDoTempo = ({ eventos, mostrarAnimal, onAbrir }: Props) => {
  if (!eventos.length) return <p className="text-sm text-muted-foreground py-4">Nenhum registro no histórico.</p>;
  return (
    <ol className="relative border-l border-border ml-3 space-y-5">
      {eventos.map((e) => {
        const Icone = ICONES[e.tipo] ?? ArrowRightLeft;
        const campos = e.depois ? Object.keys(e.depois) : [];
        return (
          <li key={e.id} className="ml-6">
            <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-muted ring-4 ring-background">
              <Icone className="h-3.5 w-3.5 text-foreground" />
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{ROTULOS[e.tipo] ?? e.tipo}</Badge>
              {mostrarAnimal && (
                <button className="font-medium text-foreground hover:underline" onClick={() => onAbrir?.(e.solipedeId)}>
                  {e.registro} {e.nome}
                </button>
              )}
              <span className="text-xs text-muted-foreground">
                {e.dataMovimentacao ? `em ${formatarDataBR(e.dataMovimentacao)} · ` : ''}lançado {formatarTimestamp(e.criadoEm)}
              </span>
            </div>
            {campos.length > 0 ? (
              <ul className="mt-1 text-sm text-foreground space-y-0.5">
                {campos.map((c) => (
                  <li key={c}>
                    <span className="text-muted-foreground">{rotuloCampo(c)}:</span>{' '}
                    <span className="line-through text-muted-foreground">{rotuloValor(c, e.antes?.[c])}</span>{' → '}
                    <span className="font-medium">{rotuloValor(c, e.depois?.[c])}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-foreground">{e.descricao}</p>
            )}
            {(e.motivo || e.documento) && (
              <p className="text-xs text-muted-foreground mt-1">
                {e.motivo && <>Motivo: {e.motivo}</>}{e.motivo && e.documento && ' · '}{e.documento && <>Doc.: {e.documento}</>}
              </p>
            )}
            {e.tipo === 'MOVIMENTACAO' && e.descricao.includes(' — ') && (
              <p className="text-xs text-muted-foreground mt-1">Obs.: {e.descricao.split(' — ').slice(1).join(' — ')}</p>
            )}
            {e.autor && <p className="text-xs text-muted-foreground">Por: {e.autor}</p>}
          </li>
        );
      })}
    </ol>
  );
};

export default LinhaDoTempo;
