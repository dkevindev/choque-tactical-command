import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Wrench, Search, AlertCircle } from 'lucide-react';

interface Registro {
  id: string;
  cadastro: string;
  placa?: string | null;
  modelo?: string | null;
  viaturaNaoCadastrada?: boolean;
  tipoFrota?: 'leve' | 'pesada';
  oficina: string;
  defeitoRelatado: string;
  dataEntrada: string;
  deixadoPorNomeGuerra1?: string;
  deixadoPorMatricula?: string;
  status: 'na-oficina' | 'saiu';
  retiradoPorNomeGuerra1?: string;
  retiradoPorMatricula?: string;
  dataSaida?: string;
  observacaoServico?: string;
  diasNaOficina?: number;
}

const fmtData = (iso?: string) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`;
};

const diasParado = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

const ControleOficinaPage = () => {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(query(collection(db, 'oficina_controle'), orderBy('dataEntrada', 'desc')));
        setRegistros(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
      } finally { setLoading(false); }
    })();
  }, []);

  const filtrar = (lista: Registro[]) => {
    const t = busca.trim().toLowerCase();
    if (!t) return lista;
    return lista.filter(r => [r.cadastro, r.placa, r.oficina, r.deixadoPorNomeGuerra1, r.retiradoPorNomeGuerra1, r.defeitoRelatado]
      .filter(Boolean).some(v => String(v).toLowerCase().includes(t)));
  };

  const naOficina = useMemo(() => filtrar(registros.filter(r => r.status === 'na-oficina')), [registros, busca]);
  const historico = useMemo(() => filtrar(registros.filter(r => r.status === 'saiu')), [registros, busca]);

  const tempoMedio = useMemo(() => {
    const com = historico.filter(r => typeof r.diasNaOficina === 'number');
    if (!com.length) return 0;
    return Math.round(com.reduce((s, r) => s + (r.diasNaOficina || 0), 0) / com.length);
  }, [historico]);

  const badgeDias = (d: number) => {
    if (d <= 3) return <Badge className="bg-emerald-500">{d}d</Badge>;
    if (d <= 7) return <Badge className="bg-amber-500">{d}d</Badge>;
    return <Badge className="bg-red-500">{d}d</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Na oficina</div>
          <div className="text-2xl font-bold text-amber-600">{naOficina.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Histórico</div>
          <div className="text-2xl font-bold text-emerald-600">{historico.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Tempo médio</div>
          <div className="text-2xl font-bold">{tempoMedio} dias</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" /> Controle de Oficina</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Buscar VTR, oficina, policial..."
              value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : (
            <>
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  <h3 className="font-semibold">Viaturas atualmente na oficina</h3>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>VTR</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Deixada por</TableHead>
                        <TableHead>Entrada</TableHead>
                        <TableHead>Dias parada</TableHead>
                        <TableHead>Oficina</TableHead>
                        <TableHead>Defeito</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {naOficina.map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">
                            {r.cadastro} {r.viaturaNaoCadastrada && <Badge variant="outline" className="ml-1 text-[10px]">não cadastrada</Badge>}
                            {r.placa && <div className="text-xs text-muted-foreground">{r.placa}</div>}
                          </TableCell>
                          <TableCell><Badge variant="secondary">{r.tipoFrota || '-'}</Badge></TableCell>
                          <TableCell className="text-sm">
                            {r.deixadoPorNomeGuerra1 || '-'}<br/>
                            <span className="text-xs text-muted-foreground">Mat. {r.deixadoPorMatricula}</span>
                          </TableCell>
                          <TableCell>{fmtData(r.dataEntrada)}</TableCell>
                          <TableCell>{badgeDias(diasParado(r.dataEntrada))}</TableCell>
                          <TableCell>{r.oficina}</TableCell>
                          <TableCell className="max-w-xs text-sm">{r.defeitoRelatado}</TableCell>
                        </TableRow>
                      ))}
                      {naOficina.length === 0 && (
                        <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-4">Nenhuma viatura na oficina.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Histórico de retiradas</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>VTR</TableHead>
                        <TableHead>Deixada por</TableHead>
                        <TableHead>Entrada</TableHead>
                        <TableHead>Retirada por</TableHead>
                        <TableHead>Saída</TableHead>
                        <TableHead>Dias</TableHead>
                        <TableHead>Oficina</TableHead>
                        <TableHead>Serviço realizado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historico.map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.cadastro}</TableCell>
                          <TableCell className="text-sm">{r.deixadoPorNomeGuerra1 || '-'}</TableCell>
                          <TableCell>{fmtData(r.dataEntrada)}</TableCell>
                          <TableCell className="text-sm">{r.retiradoPorNomeGuerra1 || '-'}</TableCell>
                          <TableCell>{fmtData(r.dataSaida)}</TableCell>
                          <TableCell><Badge variant="secondary">{r.diasNaOficina ?? '-'}</Badge></TableCell>
                          <TableCell>{r.oficina}</TableCell>
                          <TableCell className="max-w-xs text-sm">{r.observacaoServico || '-'}</TableCell>
                        </TableRow>
                      ))}
                      {historico.length === 0 && (
                        <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-4">Sem histórico ainda.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ControleOficinaPage;
