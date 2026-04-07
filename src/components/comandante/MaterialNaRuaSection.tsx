import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Download, FileText } from 'lucide-react';
import { exportarCSV, exportarPDF } from './exportUtils';

interface Props { livros: any[]; cautelas: any[]; materiais: any[]; }

const MaterialNaRuaSection: React.FC<Props> = ({ livros, cautelas, materiais }) => {
  const livroAtivo = useMemo(() => livros.find(l => l.status === 'aberto' || !l.dataFechamento), [livros]);

  const materiaisNaRua = useMemo(() => {
    if (!livroAtivo) return [];
    const cautelasAtivas = cautelas.filter(c => c.livroId === livroAtivo.id && (c.status === 'ativa' || !c.dataDevolucao));
    const items: any[] = [];
    cautelasAtivas.forEach(c => {
      (c.materiais || []).forEach((m: any) => {
        const mat = materiais.find(mt => mt.id === m.materialId);
        items.push({
          policial: c.policialNome || c.policial || 'N/I',
          material: mat?.nome || m.nome || 'N/I',
          serie: mat?.numeroSerie || m.numeroSerie || '-',
          horaSaida: c.dataCriacao || c.horaSaida || '-',
        });
      });
    });
    return items;
  }, [livroAtivo, cautelas, materiais]);

  const handleCSV = () => {
    const h = ['Policial', 'Material', 'Nº Série', 'Hora Saída'];
    const r = materiaisNaRua.map(m => [m.policial, m.material, m.serie, m.horaSaida]);
    exportarCSV(h, r, 'material_na_rua_rpmont');
  };
  const handlePDF = () => {
    const h = ['Policial', 'Material', 'Nº Série', 'Hora Saída'];
    const r = materiaisNaRua.map(m => [m.policial, m.material, m.serie, m.horaSaida]);
    exportarPDF('Material na Rua', h, r, 'material_na_rua_rpmont');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-violet-600 to-purple-800 border-0 text-white">
          <CardContent className="p-6 text-center">
            <Shield className="h-8 w-8 mx-auto mb-2 opacity-80" />
            <p className="text-4xl font-bold">{materiaisNaRua.length}</p>
            <p className="text-white/70 text-sm mt-1">Materiais na Rua</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/60 border-indigo-500/20">
          <CardContent className="p-6 text-center">
            <p className="text-slate-300 text-sm">Livro Ativo</p>
            <p className="text-white font-bold text-lg mt-1">{livroAtivo ? `#${livroAtivo.numero || livroAtivo.id?.slice(0, 8)}` : 'Nenhum livro aberto'}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-800/60 border-indigo-500/20">
        <CardContent className="p-4 flex gap-3">
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
                  <TableHead className="text-indigo-300">Material</TableHead>
                  <TableHead className="text-indigo-300">Nº Série</TableHead>
                  <TableHead className="text-indigo-300">Hora Saída</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materiaisNaRua.map((m, i) => (
                  <TableRow key={i} className="border-slate-700 hover:bg-slate-700/50">
                    <TableCell className="text-white font-medium">{m.policial}</TableCell>
                    <TableCell className="text-slate-300">{m.material}</TableCell>
                    <TableCell className="text-slate-300">{m.serie}</TableCell>
                    <TableCell className="text-slate-300">{m.horaSaida}</TableCell>
                  </TableRow>
                ))}
                {materiaisNaRua.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-slate-400 py-8">Nenhum material na rua no momento</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MaterialNaRuaSection;
