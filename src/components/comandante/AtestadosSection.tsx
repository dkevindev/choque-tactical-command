import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileHeart, Download, FileText, Trophy, Calendar, ArrowUpDown } from 'lucide-react';
import { exportarCSV, exportarPDF } from './exportUtils';
import { format, subMonths, startOfMonth, parseISO, isAfter } from 'date-fns';

interface Props { policiais: any[]; atestados: any[]; }

const AtestadosSection: React.FC<Props> = ({ policiais, atestados }) => {
  const [filtro, setFiltro] = useState('TODOS');
  const [filterUnidade, setFilterUnidade] = useState('TODAS');
  const [rankingPeriodo, setRankingPeriodo] = useState('geral');
  const [rankingOrdem, setRankingOrdem] = useState<'dias' | 'qtd'>('dias');

  const unidades = useMemo(() => ['TODAS', ...new Set(policiais.map(p => p.Unidade || p.UNIDADE).filter(Boolean))], [policiais]);

  const now = new Date();
  
  const filteredAtestados = useMemo(() => {
    let list = [...atestados];
    if (filtro === 'DIA') {
      const hoje = format(now, 'yyyy-MM-dd');
      list = list.filter(a => a.dataInicio === hoje);
    }
    if (filtro === 'SEMANA') {
      const limit = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      list = list.filter(a => a.dataInicio && a.dataInicio >= limit);
    }
    if (filtro === 'MES') {
      const limit = format(startOfMonth(now), 'yyyy-MM-dd');
      list = list.filter(a => a.dataInicio && a.dataInicio >= limit);
    }
    if (filterUnidade !== 'TODAS') {
      const polIds = new Set(policiais.filter(p => (p.Unidade || p.UNIDADE) === filterUnidade).map(p => p.id));
      list = list.filter(a => polIds.has(a.policialId));
    }
    return list;
  }, [atestados, filtro, filterUnidade, policiais]);

  // Atestados ativos (data fim > hoje)
  const atestadosAtivos = useMemo(() => {
    const hoje = format(now, 'yyyy-MM-dd');
    return atestados.filter(a => a.dataFim && a.dataFim >= hoje);
  }, [atestados]);

  // Ranking com filtro de período (igual ao sistema de gestão de pessoas)
  const rankingData = useMemo(() => {
    let dataLimite: string | null = null;
    if (rankingPeriodo === 'mes') dataLimite = format(startOfMonth(now), 'yyyy-MM-dd');
    else if (rankingPeriodo === '3meses') dataLimite = format(subMonths(now, 3), 'yyyy-MM-dd');
    else if (rankingPeriodo === '6meses') dataLimite = format(subMonths(now, 6), 'yyyy-MM-dd');
    else if (rankingPeriodo === '1ano') dataLimite = format(subMonths(now, 12), 'yyyy-MM-dd');

    const filtrados = dataLimite
      ? atestados.filter(a => a.dataInicio && a.dataInicio >= dataLimite!)
      : atestados;

    const mapa = new Map<string, { nome: string; postGrad: string; qtd: number; dias: number }>();
    filtrados.forEach(a => {
      const key = a.policialId;
      if (!key) return;
      const cur = mapa.get(key) || { nome: a.policialNome || '', postGrad: a.policialPostGrad || '', qtd: 0, dias: 0 };
      cur.qtd += 1;
      cur.dias += a.dias || 0;
      if (!cur.nome && a.policialNome) cur.nome = a.policialNome;
      if (!cur.postGrad && a.policialPostGrad) cur.postGrad = a.policialPostGrad;
      mapa.set(key, cur);
    });

    return Array.from(mapa.values()).sort((a, b) =>
      rankingOrdem === 'dias' ? (b.dias - a.dias || b.qtd - a.qtd) : (b.qtd - a.qtd || b.dias - a.dias)
    );
  }, [atestados, rankingPeriodo, rankingOrdem]);

  const formatDate = (d: string) => {
    if (!d) return '-';
    try { return format(parseISO(d), 'dd/MM/yyyy'); } catch { return d; }
  };

  const handleCSV = () => {
    const h = ['Policial', 'Post/Grad', 'CID', 'Descrição CID', 'Dias', 'Início', 'Fim'];
    const r = filteredAtestados.map(a => [
      a.policialNome || '', a.policialPostGrad || '', a.cid || '', a.cidDescricao || '',
      String(a.dias || ''), formatDate(a.dataInicio), formatDate(a.dataFim)
    ]);
    exportarCSV(h, r, 'atestados_rpmont');
  };
  const handlePDF = () => {
    const h = ['Policial', 'Post/Grad', 'CID', 'Descrição', 'Dias', 'Início', 'Fim'];
    const r = filteredAtestados.map(a => [
      a.policialNome || '', a.policialPostGrad || '', a.cid || '', a.cidDescricao || '',
      String(a.dias || ''), formatDate(a.dataInicio), formatDate(a.dataFim)
    ]);
    exportarPDF('Atestados Médicos', h, r, 'atestados_rpmont');
  };

  const handleRankingCSV = () => {
    const h = ['Posição', 'Policial', 'Post/Grad', 'Atestados', 'Total Dias'];
    const r = rankingData.map((item, i) => [String(i + 1), item.nome, item.postGrad, String(item.qtd), String(item.dias)]);
    exportarCSV(h, r, 'ranking_atestados_rpmont');
  };

  return (
    <div className="space-y-6">
      {/* Cards resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-pink-600 to-rose-800 border-0 text-white">
          <CardContent className="p-6 text-center">
            <FileHeart className="h-8 w-8 mx-auto mb-2 opacity-80" />
            <p className="text-4xl font-bold">{atestados.length}</p>
            <p className="text-white/70 text-sm mt-1">Total de Atestados</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-600 to-red-800 border-0 text-white">
          <CardContent className="p-6 text-center">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-80" />
            <p className="text-4xl font-bold">{atestadosAtivos.length}</p>
            <p className="text-white/70 text-sm mt-1">Atestados Ativos</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-600 to-amber-800 border-0 text-white">
          <CardContent className="p-6 text-center">
            <Trophy className="h-8 w-8 mx-auto mb-2 opacity-80" />
            <p className="text-4xl font-bold">{rankingData[0]?.qtd || 0}</p>
            <p className="text-white/70 text-sm mt-1">Maior nº de atestados</p>
          </CardContent>
        </Card>
      </div>

      {/* Ranking de Atestados */}
      <Card className="bg-slate-800/60 border-indigo-500/20">
        <CardContent className="p-4">
          <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-400" /> Ranking de Atestados
            </h3>
            <div className="flex gap-2">
              <Button onClick={handleRankingCSV} variant="outline" size="sm" className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/20">
                <Download className="h-4 w-4 mr-1" /> Excel
              </Button>
            </div>
          </div>
          <p className="text-slate-400 text-sm mb-3">Policiais com mais atestados e dias de licença</p>

          {/* Filtros de período */}
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { key: 'mes', label: 'Mês Atual' },
              { key: '3meses', label: 'Últimos 3 Meses' },
              { key: '6meses', label: 'Últimos 6 Meses' },
              { key: '1ano', label: 'Último Ano' },
              { key: 'geral', label: 'Geral' },
            ].map(p => (
              <Button
                key={p.key}
                variant={rankingPeriodo === p.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRankingPeriodo(p.key)}
                className={rankingPeriodo === p.key
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'border-slate-600 text-slate-300 hover:bg-slate-700'}
              >
                {p.label}
              </Button>
            ))}
          </div>

          <div className="max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-indigo-500/20">
                  <TableHead className="text-indigo-300 w-12">#</TableHead>
                  <TableHead className="text-indigo-300">Policial</TableHead>
                  <TableHead className="text-indigo-300">Post/Grad</TableHead>
                  <TableHead className="text-indigo-300 cursor-pointer" onClick={() => setRankingOrdem('qtd')}>
                    <span className="flex items-center gap-1">Atestados <ArrowUpDown className="h-3 w-3" /></span>
                  </TableHead>
                  <TableHead className="text-indigo-300 cursor-pointer" onClick={() => setRankingOrdem('dias')}>
                    <span className="flex items-center gap-1">Total Dias <ArrowUpDown className="h-3 w-3" /></span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankingData.map((item, i) => (
                  <TableRow key={i} className="border-slate-700 hover:bg-slate-700/50">
                    <TableCell className={`font-bold ${i === 0 ? 'text-amber-400' : i < 3 ? 'text-orange-400' : 'text-slate-400'}`}>
                      {i + 1}º
                    </TableCell>
                    <TableCell className="text-white font-medium">{item.nome}</TableCell>
                    <TableCell className="text-slate-300">{item.postGrad}</TableCell>
                    <TableCell className="text-slate-300 font-semibold">{item.qtd}</TableCell>
                    <TableCell className="text-slate-300 font-semibold">{item.dias} dias</TableCell>
                  </TableRow>
                ))}
                {rankingData.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-slate-400 py-8">Sem dados para o período</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Filtros e Tabela de atestados */}
      <Card className="bg-slate-800/60 border-indigo-500/20">
        <CardContent className="p-4 flex flex-wrap gap-3">
          <Select value={filtro} onValueChange={setFiltro}>
            <SelectTrigger className="w-[140px] bg-slate-700 border-slate-600 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="DIA">Hoje</SelectItem>
              <SelectItem value="SEMANA">Semana</SelectItem>
              <SelectItem value="MES">Mês</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterUnidade} onValueChange={setFilterUnidade}>
            <SelectTrigger className="w-[160px] bg-slate-700 border-slate-600 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>{unidades.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={handleCSV} variant="outline" size="sm" className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/20"><Download className="h-4 w-4 mr-1" /> Excel</Button>
          <Button onClick={handlePDF} variant="outline" size="sm" className="border-red-500 text-red-400 hover:bg-red-500/20"><FileText className="h-4 w-4 mr-1" /> PDF</Button>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/60 border-indigo-500/20">
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-indigo-500/20">
                  <TableHead className="text-indigo-300">Policial</TableHead>
                  <TableHead className="text-indigo-300">Post/Grad</TableHead>
                  <TableHead className="text-indigo-300">CID</TableHead>
                  <TableHead className="text-indigo-300">Descrição</TableHead>
                  <TableHead className="text-indigo-300">Dias</TableHead>
                  <TableHead className="text-indigo-300">Início</TableHead>
                  <TableHead className="text-indigo-300">Fim</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAtestados.map((a, i) => (
                  <TableRow key={i} className="border-slate-700 hover:bg-slate-700/50">
                    <TableCell className="text-white font-medium">{a.policialNome || 'Desconhecido'}</TableCell>
                    <TableCell className="text-slate-300">{a.policialPostGrad || '-'}</TableCell>
                    <TableCell className="text-slate-300">{a.cid || '-'}</TableCell>
                    <TableCell className="text-slate-300 max-w-[200px] truncate">{a.cidDescricao || '-'}</TableCell>
                    <TableCell className="text-slate-300">{a.dias || '-'}</TableCell>
                    <TableCell className="text-slate-300">{formatDate(a.dataInicio)}</TableCell>
                    <TableCell className="text-slate-300">{formatDate(a.dataFim)}</TableCell>
                  </TableRow>
                ))}
                {filteredAtestados.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-slate-400 py-8">Nenhum atestado encontrado</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AtestadosSection;
