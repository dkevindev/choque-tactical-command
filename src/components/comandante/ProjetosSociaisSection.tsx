import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GraduationCap, Clock, Users, Download, FileText } from 'lucide-react';
import { exportarCSV, exportarPDF } from './exportUtils';
import { format } from 'date-fns';

interface Props { aulas: any[]; projetos: any[]; policiais: any[]; }

const ProjetosSociaisSection: React.FC<Props> = ({ aulas, projetos, policiais }) => {
  const mesAtual = format(new Date(), 'yyyy-MM');

  const aulasMes = useMemo(() => aulas.filter(a => a.data?.startsWith(mesAtual)), [aulas, mesAtual]);

  const horasPorInstrutor = useMemo(() => {
    const map: Record<string, { nome: string; horas: number; aulas: number }> = {};
    aulasMes.forEach(a => {
      const id = a.instrutorId || a.instrutor;
      if (!id) return;
      if (!map[id]) {
        const pol = policiais.find(p => p.id === id);
        map[id] = { nome: pol?.NOME || pol?.['NOME DE GUERRA1'] || a.instrutorNome || id, horas: 0, aulas: 0 };
      }
      map[id].horas += (a.duracaoHoras || a.duracao || 2);
      map[id].aulas++;
    });
    return Object.entries(map).sort((a, b) => b[1].horas - a[1].horas);
  }, [aulasMes, policiais]);

  const totalAlunos = useMemo(() => {
    let total = 0;
    aulasMes.forEach(a => { total += (a.frequencia?.length || a.alunosPresentes || 0); });
    return total;
  }, [aulasMes]);

  const aulasHoje = useMemo(() => {
    const hoje = format(new Date(), 'yyyy-MM-dd');
    return aulas.filter(a => a.data === hoje);
  }, [aulas]);

  const handleCSV = () => {
    const h = ['Instrutor', 'Horas', 'Aulas'];
    const r = horasPorInstrutor.map(([, v]) => [v.nome, String(v.horas), String(v.aulas)]);
    exportarCSV(h, r, 'projetos_sociais_rpmont');
  };
  const handlePDF = () => {
    const h = ['Instrutor', 'Horas', 'Aulas'];
    const r = horasPorInstrutor.map(([, v]) => [v.nome, String(v.horas), String(v.aulas)]);
    exportarPDF('Projetos Sociais - Instrutores', h, r, 'projetos_sociais_rpmont');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-teal-600 to-teal-800 border-0 text-white">
          <CardContent className="p-6 text-center">
            <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-80" />
            <p className="text-4xl font-bold">{aulasMes.length}</p>
            <p className="text-white/70 text-sm mt-1">Aulas no Mês</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-600 to-green-800 border-0 text-white">
          <CardContent className="p-6 text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-80" />
            <p className="text-4xl font-bold">{horasPorInstrutor.reduce((s, [, v]) => s + v.horas, 0)}</p>
            <p className="text-white/70 text-sm mt-1">Horas Totais</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-600 to-blue-800 border-0 text-white">
          <CardContent className="p-6 text-center">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-80" />
            <p className="text-4xl font-bold">{totalAlunos}</p>
            <p className="text-white/70 text-sm mt-1">Frequência de Alunos</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-600 to-purple-800 border-0 text-white">
          <CardContent className="p-6 text-center">
            <p className="text-4xl font-bold">{aulasHoje.length}</p>
            <p className="text-white/70 text-sm mt-1">Aulas Hoje</p>
          </CardContent>
        </Card>
      </div>

      {/* Aulas Hoje */}
      {aulasHoje.length > 0 && (
        <Card className="bg-slate-800/60 border-indigo-500/20">
          <CardContent className="p-4">
            <h3 className="text-white font-semibold mb-3">Aulas de Hoje</h3>
            <div className="flex flex-wrap gap-2">
              {aulasHoje.map((a, i) => {
                const pol = policiais.find(p => p.id === (a.instrutorId || a.instrutor));
                return (
                  <Badge key={i} className="text-sm py-2 px-3 bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    {pol?.NOME || a.instrutorNome || 'N/I'} • {a.turno || '-'} • {a.frequencia?.length || a.alunosPresentes || 0} alunos
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Horas por Instrutor */}
      <Card className="bg-slate-800/60 border-indigo-500/20">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-white font-semibold">Horas por Instrutor - {format(new Date(), 'MM/yyyy')}</h3>
            <div className="flex gap-2">
              <Button onClick={handleCSV} variant="outline" size="sm" className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/20"><Download className="h-4 w-4 mr-1" /> Excel</Button>
              <Button onClick={handlePDF} variant="outline" size="sm" className="border-red-500 text-red-400 hover:bg-red-500/20"><FileText className="h-4 w-4 mr-1" /> PDF</Button>
            </div>
          </div>
          <div className="max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-indigo-500/20">
                  <TableHead className="text-indigo-300">Instrutor</TableHead>
                  <TableHead className="text-indigo-300">Horas</TableHead>
                  <TableHead className="text-indigo-300">Aulas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {horasPorInstrutor.map(([id, v]) => (
                  <TableRow key={id} className="border-slate-700 hover:bg-slate-700/50">
                    <TableCell className="text-white font-medium">{v.nome}</TableCell>
                    <TableCell className="text-slate-300">{v.horas}h</TableCell>
                    <TableCell className="text-slate-300">{v.aulas}</TableCell>
                  </TableRow>
                ))}
                {horasPorInstrutor.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center text-slate-400 py-8">Sem aulas registradas neste mês</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjetosSociaisSection;
