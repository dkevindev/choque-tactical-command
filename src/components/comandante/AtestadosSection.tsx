import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileHeart, Download, FileText, Trophy, Calendar } from 'lucide-react';
import { exportarCSV, exportarPDF } from './exportUtils';
import { format, subDays, subWeeks, subMonths, isAfter, parseISO } from 'date-fns';

interface Props { policiais: any[]; atestados: any[]; }

const AtestadosSection: React.FC<Props> = ({ policiais, atestados }) => {
  const [filtro, setFiltro] = useState('TODOS');
  const [filterUnidade, setFilterUnidade] = useState('TODAS');

  const unidades = useMemo(() => ['TODAS', ...new Set(policiais.map(p => p.Unidade || p.UNIDADE).filter(Boolean))], [policiais]);

  const now = new Date();
  const filteredAtestados = useMemo(() => {
    let list = atestados;
    if (filtro === 'DIA') list = list.filter(a => { try { return isAfter(parseISO(a.dataInicio), subDays(now, 1)); } catch { return false; } });
    if (filtro === 'SEMANA') list = list.filter(a => { try { return isAfter(parseISO(a.dataInicio), subWeeks(now, 1)); } catch { return false; } });
    if (filtro === 'MES') list = list.filter(a => { try { return isAfter(parseISO(a.dataInicio), subMonths(now, 1)); } catch { return false; } });
    if (filterUnidade !== 'TODAS') {
      const polIds = new Set(policiais.filter(p => (p.Unidade || p.UNIDADE) === filterUnidade).map(p => p.id));
      list = list.filter(a => polIds.has(a.policialId));
    }
    return list;
  }, [atestados, filtro, filterUnidade, policiais]);

  const ranking = useMemo(() => {
    const counts: Record<string, { nome: string; postGrad: string; count: number }> = {};
    filteredAtestados.forEach(a => {
      const pol = policiais.find(p => p.id === a.policialId);
      if (!pol) return;
      if (!counts[a.policialId]) counts[a.policialId] = { nome: pol.NOME, postGrad: pol['Post/Grad'], count: 0 };
      counts[a.policialId].count++;
    });
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 15);
  }, [filteredAtestados, policiais]);

  const atestadosAtivos = useMemo(() => atestados.filter(a => { try { return isAfter(parseISO(a.dataFim), now); } catch { return false; } }), [atestados]);

  const handleCSV = () => {
    const h = ['Policial', 'Post/Grad', 'CID', 'Descrição CID', 'Dias', 'Início', 'Fim'];
    const r = filteredAtestados.map(a => {
      const pol = policiais.find(p => p.id === a.policialId);
      return [pol?.NOME || '', pol?.['Post/Grad'] || '', a.cid || '', a.cidDescricao || '', String(a.dias || ''), a.dataInicio || '', a.dataFim || ''];
    });
    exportarCSV(h, r, 'atestados_rpmont');
  };
  const handlePDF = () => {
    const h = ['Policial', 'Post/Grad', 'CID', 'Descrição', 'Dias', 'Início', 'Fim'];
    const r = filteredAtestados.map(a => {
      const pol = policiais.find(p => p.id === a.policialId);
      return [pol?.NOME || '', pol?.['Post/Grad'] || '', a.cid || '', a.cidDescricao || '', String(a.dias || ''), a.dataInicio || '', a.dataFim || ''];
    });
    exportarPDF('Atestados Médicos', h, r, 'atestados_rpmont');
  };

  return (
    <div className="space-y-6">
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
            <p className="text-4xl font-bold">{ranking[0]?.count || 0}</p>
            <p className="text-white/70 text-sm mt-1">Maior nº de atestados</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
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

      {/* Ranking */}
      {ranking.length > 0 && (
        <Card className="bg-slate-800/60 border-indigo-500/20">
          <CardContent className="p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><Trophy className="h-5 w-5 text-amber-400" /> Ranking de Atestados</h3>
            <div className="flex flex-wrap gap-2">
              {ranking.map((r, i) => (
                <Badge key={i} className={`text-sm py-1 px-3 ${i === 0 ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50' : i < 3 ? 'bg-orange-500/20 text-orange-300' : 'bg-slate-700 text-slate-300'}`}>
                  {i + 1}º {r.nome} ({r.count})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela */}
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
                {filteredAtestados.map((a, i) => {
                  const pol = policiais.find(p => p.id === a.policialId);
                  return (
                    <TableRow key={i} className="border-slate-700 hover:bg-slate-700/50">
                      <TableCell className="text-white font-medium">{pol?.NOME || 'Desconhecido'}</TableCell>
                      <TableCell className="text-slate-300">{pol?.['Post/Grad'] || '-'}</TableCell>
                      <TableCell className="text-slate-300">{a.cid || '-'}</TableCell>
                      <TableCell className="text-slate-300 max-w-[200px] truncate">{a.cidDescricao || '-'}</TableCell>
                      <TableCell className="text-slate-300">{a.dias || '-'}</TableCell>
                      <TableCell className="text-slate-300">{a.dataInicio || '-'}</TableCell>
                      <TableCell className="text-slate-300">{a.dataFim || '-'}</TableCell>
                    </TableRow>
                  );
                })}
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
