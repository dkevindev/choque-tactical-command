import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GraduationCap, Clock, Users, Download, FileText } from 'lucide-react';
import { exportarCSV, exportarPDF } from './exportUtils';
import { format } from 'date-fns';

interface Props { aulas: any[]; projetos: any[]; policiais: any[]; instrutores: any[]; }

const ProjetosSociaisSection: React.FC<Props> = ({ aulas, projetos, policiais, instrutores }) => {
  const hoje = new Date();
  const hojeStr = format(hoje, 'yyyy-MM-dd');
  const mesAtualStr = format(hoje, 'yyyy-MM');

  // Aulas encerradas do mês
  const aulasMes = useMemo(() => {
    return aulas.filter(a => {
      const dataStr = a.dataStr || '';
      return dataStr.startsWith(mesAtualStr) && a.status === 'encerrada';
    });
  }, [aulas, mesAtualStr]);

  // Aulas de hoje (qualquer status)
  const aulasHoje = useMemo(() => {
    return aulas.filter(a => {
      const dataStr = a.dataStr || '';
      return dataStr === hojeStr;
    });
  }, [aulas, hojeStr]);

  // Horas por instrutor no mês
  const horasPorInstrutor = useMemo(() => {
    const map: Record<string, { nome: string; horas: number; aulas: number }> = {};
    
    aulasMes.forEach(a => {
      const ids: string[] = a.instrutores || [];
      ids.forEach(instId => {
        if (!map[instId]) {
          // Buscar nome do instrutor
          const pol = policiais.find(p => p.id === instId);
          const inst = instrutores.find(i => i.policialId === instId);
          const nome = pol?.['NOME DE GUERRA1'] || pol?.NOME || inst?.nome || instId;
          map[instId] = { nome, horas: 0, aulas: 0 };
        }
        map[instId].horas += 3; // cada aula = 3h
        map[instId].aulas++;
      });
    });
    
    return Object.entries(map).sort((a, b) => b[1].horas - a[1].horas);
  }, [aulasMes, policiais, instrutores]);

  // Total de frequência (alunos presentes)
  const totalFrequencia = useMemo(() => {
    let total = 0;
    aulasMes.forEach(a => {
      total += (a.frequencia?.length || a.alunosPresentes || 0);
    });
    return total;
  }, [aulasMes]);

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
      {/* Cards resumo */}
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
            <p className="text-4xl font-bold">{totalFrequencia}</p>
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

      {/* Aulas de Hoje - dia a dia */}
      <Card className="bg-slate-800/60 border-indigo-500/20">
        <CardContent className="p-4">
          <h3 className="text-white font-semibold mb-3">📅 Aulas de Hoje ({format(hoje, 'dd/MM/yyyy')})</h3>
          {aulasHoje.length === 0 ? (
            <p className="text-slate-400 text-sm">Nenhuma aula registrada para hoje</p>
          ) : (
            <div className="space-y-2">
              {aulasHoje.map((a, i) => {
                const instrutoresAula = (a.instrutores || []).map((instId: string) => {
                  const pol = policiais.find(p => p.id === instId);
                  return pol?.['NOME DE GUERRA1'] || pol?.NOME || instId;
                });
                const qtdAlunos = a.frequencia?.length || a.alunosPresentes || 0;
                const turno = a.turno || a.periodo || '-';
                const statusLabel = a.status === 'encerrada' ? '✅' : a.status === 'em_andamento' ? '🔵' : '⏳';

                return (
                  <div key={i} className="flex flex-wrap items-center gap-2 p-3 bg-slate-700/40 rounded-lg border border-slate-600/30">
                    <span className="text-lg">{statusLabel}</span>
                    <div className="flex-1 min-w-[200px]">
                      <p className="text-white text-sm font-medium">
                        {instrutoresAula.join(', ') || 'Instrutor N/I'}
                      </p>
                      <p className="text-slate-400 text-xs">
                        {a.projetoNome || projetos.find(p => p.id === a.projetoId)?.nome || ''} • Turno: {turno}
                      </p>
                    </div>
                    <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {qtdAlunos} alunos
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Horas por Instrutor */}
      <Card className="bg-slate-800/60 border-indigo-500/20">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-white font-semibold">Horas por Instrutor - {format(hoje, 'MM/yyyy')}</h3>
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
