import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarDays, Download, FileText } from 'lucide-react';
import { exportarCSV, exportarPDF } from './exportUtils';

interface Props { policiais: any[]; }

const FeriasSection: React.FC<Props> = ({ policiais }) => {
  const [filterUnidade, setFilterUnidade] = useState('TODAS');

  const emFerias = useMemo(() => policiais.filter(p => p.SITUAÇÃO?.toUpperCase().includes('FÉRIAS') || p.SITUAÇÃO?.toUpperCase().includes('FERIAS')), [policiais]);
  
  const filtered = useMemo(() => {
    if (filterUnidade === 'TODAS') return emFerias;
    return emFerias.filter(p => (p.Unidade || p.UNIDADE) === filterUnidade);
  }, [emFerias, filterUnidade]);

  const unidades = useMemo(() => ['TODAS', ...new Set(policiais.map(p => p.Unidade || p.UNIDADE).filter(Boolean))], [policiais]);

  const porUnidade = (u: string) => emFerias.filter(p => (p.Unidade || p.UNIDADE) === u).length;

  const handleCSV = () => {
    const h = ['Nome', 'Post/Grad', 'Unidade', 'Início', 'Fim'];
    const r = filtered.map(p => [p.NOME, p['Post/Grad'], p.Unidade || p.UNIDADE || '', p.inicioSituacao || '-', p.fimSituacao || '-']);
    exportarCSV(h, r, 'ferias_rpmont');
  };
  const handlePDF = () => {
    const h = ['Nome', 'Post/Grad', 'Unidade', 'Início', 'Fim'];
    const r = filtered.map(p => [p.NOME, p['Post/Grad'], p.Unidade || p.UNIDADE || '', p.inicioSituacao || '-', p.fimSituacao || '-']);
    exportarPDF('Férias', h, r, 'ferias_rpmont');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 border-0 text-white">
          <CardContent className="p-6 text-center">
            <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-80" />
            <p className="text-4xl font-bold">{emFerias.length}</p>
            <p className="text-white/70 text-sm mt-1">Total em Férias</p>
          </CardContent>
        </Card>
        {['1º ESQD', '2º ESQD', '3º PEL'].map((u, i) => (
          <Card key={u} className={`bg-gradient-to-br ${['from-yellow-600 to-amber-700', 'from-orange-600 to-red-700', 'from-rose-600 to-pink-700'][i]} border-0 text-white`}>
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold">{porUnidade(u)}</p>
              <p className="text-white/70 text-sm mt-1">{u}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-slate-800/60 border-indigo-500/20">
        <CardContent className="p-4 flex flex-wrap gap-3">
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
                  <TableHead className="text-indigo-300">Nome</TableHead>
                  <TableHead className="text-indigo-300">Post/Grad</TableHead>
                  <TableHead className="text-indigo-300">Unidade</TableHead>
                  <TableHead className="text-indigo-300">Início</TableHead>
                  <TableHead className="text-indigo-300">Fim</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id} className="border-slate-700 hover:bg-slate-700/50">
                    <TableCell className="text-white font-medium">{p.NOME}</TableCell>
                    <TableCell className="text-slate-300">{p['Post/Grad']}</TableCell>
                    <TableCell className="text-slate-300">{p.Unidade || p.UNIDADE || '-'}</TableCell>
                    <TableCell className="text-slate-300">{p.inicioSituacao || '-'}</TableCell>
                    <TableCell className="text-slate-300">{p.fimSituacao || '-'}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-slate-400 py-8">Nenhum policial em férias</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeriasSection;
