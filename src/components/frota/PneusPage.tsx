import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Disc, ExternalLink, Search } from 'lucide-react';
import { format } from 'date-fns';
import { buscarTodasViaturas, ViaturaBasica } from '@/lib/viaturaUtils';

interface UltimaTroca {
  dataConclusao?: any;
  kmAtual?: number;
  referenciaPneus?: string | null;
  origem?: 'COLOG' | 'OFICINA' | null;
  numeroOS?: string | null;
  anexoOS_url?: string | null;
  quantidadePneus?: number;
  nup?: string;
}

interface Linha {
  viatura: ViaturaBasica & { PREFIXO?: number; operacional?: boolean };
  ultima: UltimaTroca | null;
}

const fmt = (ts: any) => {
  if (!ts) return '—';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return format(d, 'dd/MM/yy');
};

const PneusPage = () => {
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const viaturas = await buscarTodasViaturas() as any[];
        const resultados = await Promise.all(
          viaturas.map(async (v) => {
            try {
              const snap = await getDocs(collection(db, 'frota', v.id, 'processos_pneus'));
              const finalizados = snap.docs
                .map(d => d.data() as any)
                .filter(p => p.status === 'finalizado')
                .sort((a, b) => {
                  const da = a.dataConclusao?.toDate ? a.dataConclusao.toDate().getTime() : 0;
                  const db_ = b.dataConclusao?.toDate ? b.dataConclusao.toDate().getTime() : 0;
                  return db_ - da;
                });
              return { viatura: v, ultima: finalizados[0] || null } as Linha;
            } catch {
              return { viatura: v, ultima: null } as Linha;
            }
          })
        );
        setLinhas(resultados);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtradas = useMemo(() => {
    const b = busca.trim().toLowerCase();
    const arr = b
      ? linhas.filter(l => {
          const v = l.viatura as any;
          return (
            String(v.PREFIXO ?? '').toLowerCase().includes(b) ||
            String(v.PLACA ?? '').toLowerCase().includes(b) ||
            String(v.MODELO ?? '').toLowerCase().includes(b)
          );
        })
      : linhas;

    const operacionais = arr
      .filter(l => (l.viatura as any).operacional === true)
      .sort((a, b) => Number((a.viatura as any).PREFIXO || 0) - Number((b.viatura as any).PREFIXO || 0));
    const adms = arr
      .filter(l => (l.viatura as any).operacional !== true)
      .sort((a, b) => Number((a.viatura as any).PREFIXO || 0) - Number((b.viatura as any).PREFIXO || 0));

    return { operacionais, adms };
  }, [linhas, busca]);

  const total = linhas.length;
  const comTroca = linhas.filter(l => l.ultima).length;
  const semTroca = total - comTroca;

  const renderLinha = (l: Linha) => {
    const v = l.viatura as any;
    const u = l.ultima;
    return (
      <TableRow key={v.id}>
        <TableCell className="font-semibold">{v.PREFIXO ?? '—'}</TableCell>
        <TableCell>{v.PLACA ?? '—'}</TableCell>
        <TableCell>{v.MODELO ?? '—'}</TableCell>
        <TableCell>
          {v.operacional ? (
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Operacional</Badge>
          ) : (
            <Badge variant="outline">ADM</Badge>
          )}
        </TableCell>
        <TableCell>{fmt(u?.dataConclusao)}</TableCell>
        <TableCell>{u?.kmAtual != null ? u.kmAtual.toLocaleString('pt-BR') : '—'}</TableCell>
        <TableCell>{u?.referenciaPneus || '—'}</TableCell>
        <TableCell>
          {!u ? '—' : u.origem === 'OFICINA' ? (
            <span className="flex items-center gap-1">
              OS {u.numeroOS || '—'}
              {u.anexoOS_url && (
                <a href={u.anexoOS_url} target="_blank" rel="noopener noreferrer" className="text-primary">
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </span>
          ) : u.origem === 'COLOG' ? (
            <Badge variant="secondary">COLOG</Badge>
          ) : '—'}
        </TableCell>
        <TableCell className="text-center">{u?.quantidadePneus ?? '—'}</TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Disc className="h-5 w-5" />
            Controle de Pneus por Viatura
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar prefixo, placa ou modelo..."
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 text-xs">
              <Badge variant="outline">Total: {total}</Badge>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Com troca: {comTroca}</Badge>
              <Badge className="bg-amber-100 text-amber-800 border-amber-300">Sem registro: {semTroca}</Badge>
            </div>
          </div>

          {loading ? (
            <p className="text-center text-sm text-muted-foreground py-8">Carregando...</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Prefixo</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Última troca</TableHead>
                    <TableHead>KM na troca</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead>OS / Origem</TableHead>
                    <TableHead className="text-center">Qtd</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtradas.operacionais.length > 0 && (
                    <TableRow className="bg-emerald-50/60 hover:bg-emerald-50/60">
                      <TableCell colSpan={9} className="font-semibold text-emerald-900 py-2">
                        VTRs Operacionais ({filtradas.operacionais.length})
                      </TableCell>
                    </TableRow>
                  )}
                  {filtradas.operacionais.map(renderLinha)}

                  {filtradas.adms.length > 0 && (
                    <TableRow className="bg-slate-100 hover:bg-slate-100">
                      <TableCell colSpan={9} className="font-semibold text-slate-700 py-2">
                        VTRs Administrativas ({filtradas.adms.length})
                      </TableCell>
                    </TableRow>
                  )}
                  {filtradas.adms.map(renderLinha)}

                  {filtradas.operacionais.length === 0 && filtradas.adms.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-6">
                        Nenhuma viatura encontrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PneusPage;
