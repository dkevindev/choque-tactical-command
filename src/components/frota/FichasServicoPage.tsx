import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, FileText, AlertTriangle, Search } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import DetalheFichaModal from './DetalheFichaModal';

interface FichaServico {
  id: string;
  viaturaId?: string;
  cadastro?: string;
  placa?: string;
  motorista?: string;
  motoristaId?: string;
  policialNomeGuerra1?: string;
  kmInicial?: number;
  kmFinal?: number;
  kmRodada?: number;
  area?: string;
  localAtuacao?: string;
  status?: 'aberto' | 'encerrado';
  iniciadoEm?: string;
  encerradoEm?: string;
  encerradoPorNomeGuerra1?: string;
  encerradoPorNome?: string;
  constatouAvaria?: boolean;
  descricaoAvariaFim?: string | null;
  checklistInicial?: any;
  avariasIniciais?: any[];
  problemasChecklist?: string[];
}

const fmtHora = (iso?: string) => {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '-';
  }
};

const fmtDataBR = (iso?: string) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  } catch {
    return '';
  }
};

const chaveDia = (iso?: string) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return '';
  }
};

const FichasServicoPage = () => {
  const [fichas, setFichas] = useState<FichaServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [diaIdx, setDiaIdx] = useState(0);
  const [busca, setBusca] = useState('');
  const [fichaSel, setFichaSel] = useState<FichaServico | null>(null);

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'servicosDiarios'), orderBy('iniciadoEm', 'desc'));
        const snap = await getDocs(q);
        const arr = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as FichaServico[];
        setFichas(arr);
      } catch (e) {
        console.error('Erro ao carregar fichas:', e);
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, []);

  // Agrupa por dia (baseado em iniciadoEm), ordenado desc
  const dias = useMemo(() => {
    const map = new Map<string, FichaServico[]>();
    fichas.forEach(f => {
      const k = chaveDia(f.iniciadoEm);
      if (!k) return;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(f);
    });
    const arr = Array.from(map.entries()).map(([k, lista]) => ({
      chave: k,
      data: lista[0]?.iniciadoEm,
      fichas: lista.sort((a, b) => (b.iniciadoEm || '').localeCompare(a.iniciadoEm || '')),
    }));
    arr.sort((a, b) => b.chave.localeCompare(a.chave));
    return arr;
  }, [fichas]);

  const diaAtual = dias[diaIdx];

  const fichasFiltradas = useMemo(() => {
    if (!diaAtual) return [];
    const termo = busca.trim().toLowerCase();
    if (!termo) return diaAtual.fichas;
    return diaAtual.fichas.filter(f =>
      [f.cadastro, f.placa, f.motorista, f.policialNomeGuerra1, f.area, f.localAtuacao]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(termo))
    );
  }, [diaAtual, busca]);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <FileText className="h-5 w-5" />
          Fichas de Serviço
        </CardTitle>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por VTR, motorista ou área"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="pl-8"
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center text-muted-foreground py-8">Carregando fichas...</div>
        ) : dias.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">Nenhum serviço registrado ainda.</div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4 gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={diaIdx >= dias.length - 1}
                onClick={() => setDiaIdx(i => Math.min(i + 1, dias.length - 1))}
              >
                <ChevronLeft className="h-4 w-4" /> Dia anterior
              </Button>
              <div className="text-center">
                <div className="text-lg font-semibold text-foreground">
                  {fmtDataBR(diaAtual?.data)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {diaAtual?.fichas.length} ficha(s) • Página {diaIdx + 1} de {dias.length}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={diaIdx <= 0}
                onClick={() => setDiaIdx(i => Math.max(i - 1, 0))}
              >
                Próximo dia <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>VTR</TableHead>
                    <TableHead>Motorista</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Fim</TableHead>
                    <TableHead className="text-right">KM inicial</TableHead>
                    <TableHead className="text-right">KM final</TableHead>
                    <TableHead className="text-right">KM rodada</TableHead>
                    <TableHead>Avaria</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fichasFiltradas.map(f => {
                    const kmRod =
                      typeof f.kmRodada === 'number'
                        ? f.kmRodada
                        : typeof f.kmFinal === 'number' && typeof f.kmInicial === 'number'
                        ? f.kmFinal - f.kmInicial
                        : null;
                    const qtdEntrada = Array.isArray(f.avariasIniciais) ? f.avariasIniciais.length : 0;
                    return (
                      <TableRow key={f.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setFichaSel(f)}>
                        <TableCell className="font-medium">
                          {f.cadastro || f.placa || '-'}
                        </TableCell>
                        <TableCell>{f.policialNomeGuerra1 || f.motorista || '-'}</TableCell>
                        <TableCell>{f.area || f.localAtuacao || '-'}</TableCell>
                        <TableCell>{fmtHora(f.iniciadoEm)}</TableCell>
                        <TableCell>{fmtHora(f.encerradoEm)}</TableCell>
                        <TableCell className="text-right">{f.kmInicial ?? '-'}</TableCell>
                        <TableCell className="text-right">{f.kmFinal ?? '-'}</TableCell>
                        <TableCell className="text-right">
                          {kmRod !== null ? kmRod : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {qtdEntrada > 0 && (
                              <div className="flex items-center gap-1">
                                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                                <span className="text-xs">Entrada: {qtdEntrada}</span>
                              </div>
                            )}
                            {f.status === 'encerrado' && f.constatouAvaria && (
                              <div className="flex items-start gap-1">
                                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                                <span className="text-xs" title={f.descricaoAvariaFim || ''}>
                                  {f.descricaoAvariaFim
                                    ? f.descricaoAvariaFim.length > 30
                                      ? f.descricaoAvariaFim.slice(0, 30) + '…'
                                      : f.descricaoAvariaFim
                                    : 'Fim: Sim'}
                                </span>
                              </div>
                            )}
                            {qtdEntrada === 0 && !(f.status === 'encerrado' && f.constatouAvaria) && (
                              <span className="text-xs text-muted-foreground">
                                {f.status === 'encerrado' ? 'Não' : '—'}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {f.status === 'encerrado' ? (
                            <Badge variant="secondary">Encerrado</Badge>
                          ) : (
                            <Badge className="bg-primary">Aberto</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {fichasFiltradas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-6">
                        Nenhuma ficha encontrada para os filtros.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default FichasServicoPage;
