import { useMemo } from 'react';
import { AlertTriangle, MapPin, ClipboardCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CATEGORIAS, LOCAIS, SITUACOES_CARGA, ativo, pendencias,
  type Categoria, type Local, type SituacaoCarga, type Solipede,
} from '@/lib/cavalhada';

interface Props {
  animais: Solipede[];
  onAbrir: (id: string) => void;
}

const contar = <K extends string>(lista: Solipede[], campo: (s: Solipede) => K) =>
  lista.reduce((acc, s) => { const k = campo(s); acc[k] = (acc[k] ?? 0) + 1; return acc; }, {} as Record<K, number>);

const PainelCavalhada = ({ animais, onAbrir }: Props) => {
  const efetivo = useMemo(() => animais.filter(ativo), [animais]);
  const porLocal = contar(efetivo, (s) => s.local);
  const porCategoria = contar(efetivo.filter((s) => s.local === 'RPMONT'), (s) => s.categoria);
  const porSituacao = contar(efetivo, (s) => s.situacaoCarga);
  const comPendencia = efetivo
    .map((s) => ({ s, p: pendencias(s) }))
    .filter((x) => x.p.length > 0);
  const baixados = animais.length - efetivo.length;

  return (
    <div className="space-y-6">
      {/* Totais por local */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total geral</p>
            <p className="text-3xl font-bold text-foreground tabular-nums">{efetivo.length}</p>
            {baixados > 0 && <p className="text-xs text-muted-foreground mt-1">+ {baixados} baixado(s) no histórico</p>}
          </CardContent>
        </Card>
        {(Object.keys(LOCAIS) as Local[]).map((l) => (
          <Card key={l}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{LOCAIS[l]}</p>
              <p className="text-3xl font-bold text-foreground tabular-nums">{porLocal[l] ?? 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* No regimento, por emprego */}
        <Card>
          <CardHeader><CardTitle className="text-base">No regimento, por categoria</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(Object.keys(CATEGORIAS) as Categoria[])
              .filter((c) => (porCategoria[c] ?? 0) > 0)
              .map((c) => (
                <div key={c} className="flex items-center gap-3">
                  <span className="text-sm flex-1 text-foreground">{CATEGORIAS[c]}</span>
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${((porCategoria[c] ?? 0) / (porLocal.RPMONT || 1)) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right font-semibold tabular-nums">{porCategoria[c]}</span>
                </div>
              ))}
          </CardContent>
        </Card>

        {/* Situação patrimonial */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ClipboardCheck className="h-4 w-4" />Situação de carga</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(Object.keys(SITUACOES_CARGA) as SituacaoCarga[]).map((k) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-foreground">{SITUACOES_CARGA[k]}</span>
                <span className="font-semibold tabular-nums">{porSituacao[k] ?? 0}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Pendências */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Pendências ({comPendencia.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {comPendencia.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma pendência. Todos os animais estão regularizados.</p>
          ) : (
            <ul className="divide-y divide-border">
              {comPendencia.map(({ s, p }) => (
                <li key={s.id}>
                  <button
                    className="w-full text-left py-2 flex flex-wrap items-center gap-2 hover:bg-muted/50 rounded px-2"
                    onClick={() => onAbrir(s.id)}
                  >
                    <span className="font-mono text-xs text-muted-foreground w-16">{s.registro}</span>
                    <span className="font-medium text-foreground flex-1 min-w-[8rem]">{s.nome}</span>
                    {p.map((t) => <Badge key={t} variant="outline" className="border-amber-500 text-amber-600">{t}</Badge>)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PainelCavalhada;
