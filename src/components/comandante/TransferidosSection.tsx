import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserMinus, Download, FileText } from 'lucide-react';
import { exportarCSV, exportarPDF } from './exportUtils';

interface Props { transferidos: any[]; }

const TransferidosSection: React.FC<Props> = ({ transferidos }) => {
  const handleCSV = () => {
    const h = ['Nome', 'Post/Grad', 'Destino', 'Data', 'Publicação'];
    const r = transferidos.map(p => [p.NOME || '', p['Post/Grad'] || '', p.destino || '', p.dataTransferencia || '', p.publicacao || '']);
    exportarCSV(h, r, 'transferidos_rpmont');
  };
  const handlePDF = () => {
    const h = ['Nome', 'Post/Grad', 'Destino', 'Data', 'Publicação'];
    const r = transferidos.map(p => [p.NOME || '', p['Post/Grad'] || '', p.destino || '', p.dataTransferencia || '', p.publicacao || '']);
    exportarPDF('Policiais Transferidos', h, r, 'transferidos_rpmont');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-rose-600 to-red-800 border-0 text-white">
          <CardContent className="p-6 text-center">
            <UserMinus className="h-8 w-8 mx-auto mb-2 opacity-80" />
            <p className="text-4xl font-bold">{transferidos.length}</p>
            <p className="text-white/70 text-sm mt-1">Total Transferidos</p>
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
                  <TableHead className="text-indigo-300">Nome</TableHead>
                  <TableHead className="text-indigo-300">Post/Grad</TableHead>
                  <TableHead className="text-indigo-300">Destino</TableHead>
                  <TableHead className="text-indigo-300">Data</TableHead>
                  <TableHead className="text-indigo-300">Publicação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transferidos.map(p => (
                  <TableRow key={p.id} className="border-slate-700 hover:bg-slate-700/50">
                    <TableCell className="text-white font-medium">{p.NOME}</TableCell>
                    <TableCell className="text-slate-300">{p['Post/Grad']}</TableCell>
                    <TableCell className="text-slate-300">{p.destino || '-'}</TableCell>
                    <TableCell className="text-slate-300">{p.dataTransferencia || '-'}</TableCell>
                    <TableCell className="text-slate-300">{p.publicacao || '-'}</TableCell>
                  </TableRow>
                ))}
                {transferidos.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-slate-400 py-8">Nenhum policial transferido</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransferidosSection;
