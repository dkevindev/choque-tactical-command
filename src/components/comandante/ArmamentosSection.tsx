import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Crosshair, Shield, Download, FileText } from 'lucide-react';
import { exportarCSV, exportarPDF } from './exportUtils';

interface Props { materiais: any[]; cautelas: any[]; }

const ArmamentosSection: React.FC<Props> = ({ materiais, cautelas }) => {
  const armasCurtas = useMemo(() => materiais.filter(m => m.tipoArma?.toLowerCase().includes('curta') || m.categoria?.toLowerCase().includes('pistola')), [materiais]);
  const armasLongas = useMemo(() => materiais.filter(m => m.tipoArma?.toLowerCase().includes('longa') || m.categoria?.toLowerCase().includes('fuzil') || m.categoria?.toLowerCase().includes('espingarda')), [materiais]);
  const coletes = useMemo(() => materiais.filter(m => m.categoria?.toLowerCase().includes('colete')), [materiais]);

  const cautelados = useMemo(() => {
    const ids = new Set<string>();
    cautelas.filter(c => c.status === 'ativa' || !c.dataDevolucao).forEach(c => {
      (c.materiais || []).forEach((m: any) => { if (m.materialId) ids.add(m.materialId); });
    });
    return ids;
  }, [cautelas]);

  const naReserva = materiais.filter(m => !cautelados.has(m.id)).length;
  const naCautela = cautelados.size;

  const porModelo = useMemo(() => {
    const map: Record<string, number> = {};
    materiais.forEach(m => { const k = m.modelo || m.nome || 'N/I'; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [materiais]);

  const handleCSV = () => {
    const h = ['Nome', 'Nº Série', 'Calibre', 'Fabricante', 'Modelo', 'Tipo', 'Status'];
    const r = materiais.map(m => [m.nome || '', m.numeroSerie || '', m.calibre || '', m.fabricante || '', m.modelo || '', m.tipoArma || m.categoria || '', cautelados.has(m.id) ? 'Cautelado' : 'Na Reserva']);
    exportarCSV(h, r, 'armamentos_rpmont');
  };
  const handlePDF = () => {
    const h = ['Nome', 'Nº Série', 'Calibre', 'Fabricante', 'Modelo', 'Tipo', 'Status'];
    const r = materiais.map(m => [m.nome || '', m.numeroSerie || '', m.calibre || '', m.fabricante || '', m.modelo || '', m.tipoArma || m.categoria || '', cautelados.has(m.id) ? 'Cautelado' : 'Na Reserva']);
    exportarPDF('Armamentos', h, r, 'armamentos_rpmont');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-indigo-600 to-indigo-800 border-0 text-white">
          <CardContent className="p-6 text-center">
            <Crosshair className="h-8 w-8 mx-auto mb-2 opacity-80" />
            <p className="text-4xl font-bold">{materiais.length}</p>
            <p className="text-white/70 text-sm mt-1">Total Materiais</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-600 to-orange-800 border-0 text-white">
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold">{armasCurtas.length}</p>
            <p className="text-white/70 text-sm mt-1">Armas Curtas</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-600 to-red-800 border-0 text-white">
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold">{armasLongas.length}</p>
            <p className="text-white/70 text-sm mt-1">Armas Longas</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-600 to-blue-800 border-0 text-white">
          <CardContent className="p-6 text-center">
            <Shield className="h-6 w-6 mx-auto mb-1 opacity-80" />
            <p className="text-3xl font-bold">{coletes.length}</p>
            <p className="text-white/70 text-sm mt-1">Coletes</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-600 to-teal-800 border-0 text-white">
          <CardContent className="p-5 text-center">
            <p className="text-2xl font-bold">{naReserva}</p>
            <p className="text-white/70 text-xs">Na Reserva</p>
            <div className="border-t border-white/20 my-2" />
            <p className="text-2xl font-bold">{naCautela}</p>
            <p className="text-white/70 text-xs">Cautelados</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-800/60 border-indigo-500/20">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-white font-semibold">Por Modelo</h3>
            <div className="flex gap-2">
              <Button onClick={handleCSV} variant="outline" size="sm" className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/20"><Download className="h-4 w-4 mr-1" /> Excel</Button>
              <Button onClick={handlePDF} variant="outline" size="sm" className="border-red-500 text-red-400 hover:bg-red-500/20"><FileText className="h-4 w-4 mr-1" /> PDF</Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {porModelo.map(([k, v], i) => (
              <Badge key={k} className="text-sm py-1 px-3 bg-indigo-500/20 text-indigo-300">{k}: {v}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/60 border-indigo-500/20">
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-indigo-500/20">
                  <TableHead className="text-indigo-300">Nome</TableHead>
                  <TableHead className="text-indigo-300">Nº Série</TableHead>
                  <TableHead className="text-indigo-300">Calibre</TableHead>
                  <TableHead className="text-indigo-300">Modelo</TableHead>
                  <TableHead className="text-indigo-300">Tipo</TableHead>
                  <TableHead className="text-indigo-300">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materiais.map(m => (
                  <TableRow key={m.id} className="border-slate-700 hover:bg-slate-700/50">
                    <TableCell className="text-white font-medium">{m.nome}</TableCell>
                    <TableCell className="text-slate-300">{m.numeroSerie || '-'}</TableCell>
                    <TableCell className="text-slate-300">{m.calibre || '-'}</TableCell>
                    <TableCell className="text-slate-300">{m.modelo || '-'}</TableCell>
                    <TableCell className="text-slate-300">{m.tipoArma || m.categoria || '-'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${cautelados.has(m.id) ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {cautelados.has(m.id) ? 'Cautelado' : 'Na Reserva'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ArmamentosSection;
