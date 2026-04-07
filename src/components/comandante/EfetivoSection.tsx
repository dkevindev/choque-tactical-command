import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Search, Download, FileText } from 'lucide-react';
import { exportarCSV, exportarPDF } from './exportUtils';

interface Props { policiais: any[]; }

const EfetivoSection: React.FC<Props> = ({ policiais }) => {
  const [search, setSearch] = useState('');
  const [filterUnidade, setFilterUnidade] = useState('TODAS');
  const [filterPostGrad, setFilterPostGrad] = useState('TODOS');
  const [filterSituacao, setFilterSituacao] = useState('TODAS');

  const unidades = useMemo(() => ['TODAS', ...new Set(policiais.map(p => p.Unidade || p.UNIDADE || 'Sem Unidade').filter(Boolean))], [policiais]);
  const postos = useMemo(() => ['TODOS', ...new Set(policiais.map(p => p['Post/Grad']).filter(Boolean))], [policiais]);
  const situacoes = useMemo(() => ['TODAS', ...new Set(policiais.map(p => p.SITUAÇÃO).filter(Boolean))], [policiais]);

  const filtered = useMemo(() => {
    return policiais.filter(p => {
      const matchSearch = !search || p.NOME?.toLowerCase().includes(search.toLowerCase()) || String(p.Matrícula).includes(search);
      const matchUnidade = filterUnidade === 'TODAS' || (p.Unidade || p.UNIDADE) === filterUnidade;
      const matchPG = filterPostGrad === 'TODOS' || p['Post/Grad'] === filterPostGrad;
      const matchSit = filterSituacao === 'TODAS' || p.SITUAÇÃO === filterSituacao;
      return matchSearch && matchUnidade && matchPG && matchSit;
    });
  }, [policiais, search, filterUnidade, filterPostGrad, filterSituacao]);

  const porUnidade = (u: string) => policiais.filter(p => (p.Unidade || p.UNIDADE) === u).length;

  const handleExportCSV = () => {
    const headers = ['Nome', 'Post/Grad', 'Matrícula', 'Unidade', 'Situação', 'Função'];
    const rows = filtered.map(p => [p.NOME, p['Post/Grad'], String(p.Matrícula || ''), p.Unidade || p.UNIDADE || '', p.SITUAÇÃO || '', p.FUNÇÃO || '']);
    exportarCSV(headers, rows, 'efetivo_rpmont');
  };

  const handleExportPDF = () => {
    const headers = ['Nome', 'Post/Grad', 'Matrícula', 'Unidade', 'Situação', 'Função'];
    const rows = filtered.map(p => [p.NOME, p['Post/Grad'], String(p.Matrícula || ''), p.Unidade || p.UNIDADE || '', p.SITUAÇÃO || '', p.FUNÇÃO || '']);
    exportarPDF('Efetivo', headers, rows, 'efetivo_rpmont');
  };

  return (
    <div className="space-y-6">
      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-indigo-600 to-indigo-800 border-0 text-white">
          <CardContent className="p-6 text-center">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-80" />
            <p className="text-4xl font-bold">{policiais.length}</p>
            <p className="text-indigo-200 text-sm mt-1">Total Regimento</p>
          </CardContent>
        </Card>
        {['1º ESQD', '2º ESQD', '3º PEL'].map((u, i) => (
          <Card key={u} className={`bg-gradient-to-br ${['from-violet-600 to-violet-800', 'from-blue-600 to-blue-800', 'from-cyan-600 to-cyan-800'][i]} border-0 text-white`}>
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-80" />
              <p className="text-4xl font-bold">{porUnidade(u)}</p>
              <p className="text-white/70 text-sm mt-1">{u}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros e Export */}
      <Card className="bg-slate-800/60 border-indigo-500/20">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input placeholder="Buscar nome ou matrícula..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400" />
            </div>
            <Select value={filterUnidade} onValueChange={setFilterUnidade}>
              <SelectTrigger className="w-[160px] bg-slate-700 border-slate-600 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>{unidades.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filterPostGrad} onValueChange={setFilterPostGrad}>
              <SelectTrigger className="w-[160px] bg-slate-700 border-slate-600 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>{postos.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filterSituacao} onValueChange={setFilterSituacao}>
              <SelectTrigger className="w-[160px] bg-slate-700 border-slate-600 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>{situacoes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={handleExportCSV} variant="outline" size="sm" className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/20">
              <Download className="h-4 w-4 mr-1" /> Excel
            </Button>
            <Button onClick={handleExportPDF} variant="outline" size="sm" className="border-red-500 text-red-400 hover:bg-red-500/20">
              <FileText className="h-4 w-4 mr-1" /> PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card className="bg-slate-800/60 border-indigo-500/20">
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-indigo-500/20">
                  <TableHead className="text-indigo-300">Nome</TableHead>
                  <TableHead className="text-indigo-300">Post/Grad</TableHead>
                  <TableHead className="text-indigo-300">Matrícula</TableHead>
                  <TableHead className="text-indigo-300">Unidade</TableHead>
                  <TableHead className="text-indigo-300">Situação</TableHead>
                  <TableHead className="text-indigo-300">Função</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id} className="border-slate-700 hover:bg-slate-700/50">
                    <TableCell className="text-white font-medium">{p.NOME}</TableCell>
                    <TableCell className="text-slate-300">{p['Post/Grad']}</TableCell>
                    <TableCell className="text-slate-300">{p.Matrícula}</TableCell>
                    <TableCell className="text-slate-300">{p.Unidade || p.UNIDADE || '-'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${p.SITUAÇÃO === 'EM ATIVIDADE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {p.SITUAÇÃO}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-300">{p.FUNÇÃO || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="p-3 border-t border-slate-700 text-slate-400 text-sm text-right">
            {filtered.length} policial(is) encontrado(s)
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EfetivoSection;
