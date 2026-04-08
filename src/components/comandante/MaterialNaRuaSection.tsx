import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, Download, FileText } from 'lucide-react';
import { exportarCSV, exportarPDF } from './exportUtils';

const getCategoriaEmoji = (categoria: string): string => {
  const cat = (categoria || '').toLowerCase();
  if (cat.includes('curta') || cat.includes('pistola')) return '🔫';
  if (cat.includes('longa') || cat.includes('fuzil') || cat.includes('espingarda')) return '🎯';
  if (cat.includes('munição') || cat.includes('municao')) return '💥';
  if (cat.includes('colete')) return '🦺';
  if (cat.includes('epi') || cat.includes('proteção')) return '🛡️';
  return '⚙️';
};

interface Props { cautelasProvisoria: any[]; }

const MaterialNaRuaSection: React.FC<Props> = ({ cautelasProvisoria }) => {
  // Agrupar cautelas pendentes por policial
  const cautelasAgrupadas = useMemo(() => {
    const pendentes = cautelasProvisoria.filter(c => c.status === 'pendente');
    const mapa = new Map<string, { policialNome: string; policialNomeGuerra: string; postoGrad: string; matricula: string; materiais: any[]; dataCautela: any }>();

    pendentes.forEach(c => {
      const pid = c.policialId;
      if (!pid) return;
      const existing = mapa.get(pid);
      if (existing) {
        existing.materiais = [...existing.materiais, ...(c.materiais || [])];
      } else {
        mapa.set(pid, {
          policialNome: c.policialNome || 'N/I',
          policialNomeGuerra: c.policialNomeGuerra || '',
          postoGrad: c.postoGrad || '',
          matricula: c.policialMatricula || '',
          materiais: [...(c.materiais || [])],
          dataCautela: c.dataCautela,
        });
      }
    });
    return Array.from(mapa.values());
  }, [cautelasProvisoria]);

  const totalMateriais = useMemo(() => cautelasAgrupadas.reduce((s, c) => s + c.materiais.length, 0), [cautelasAgrupadas]);

  const totaisPorCategoria = useMemo(() => {
    const t: Record<string, number> = {};
    cautelasAgrupadas.forEach(c => {
      c.materiais.forEach((m: any) => {
        const cat = (m.categoria || '').toLowerCase();
        t[cat] = (t[cat] || 0) + (m.quantidade || 1);
      });
    });
    return t;
  }, [cautelasAgrupadas]);

  const handleCSV = () => {
    const h = ['Policial', 'Matrícula', 'Material', 'Categoria', 'Nº Série', 'Qtd'];
    const rows: string[][] = [];
    cautelasAgrupadas.forEach(c => {
      const nome = c.postoGrad ? `${c.postoGrad} ${c.policialNomeGuerra || c.policialNome}` : (c.policialNomeGuerra || c.policialNome);
      c.materiais.forEach((m: any) => {
        rows.push([nome, c.matricula, m.nome || '', m.categoria || '', m.numeroSerie || '-', String(m.quantidade || 1)]);
      });
    });
    exportarCSV(h, rows, 'material_na_rua_rpmont');
  };
  const handlePDF = () => {
    const h = ['Policial', 'Matrícula', 'Material', 'Categoria', 'Nº Série', 'Qtd'];
    const rows: string[][] = [];
    cautelasAgrupadas.forEach(c => {
      const nome = c.postoGrad ? `${c.postoGrad} ${c.policialNomeGuerra || c.policialNome}` : (c.policialNomeGuerra || c.policialNome);
      c.materiais.forEach((m: any) => {
        rows.push([nome, c.matricula, m.nome || '', m.categoria || '', m.numeroSerie || '-', String(m.quantidade || 1)]);
      });
    });
    exportarPDF('Material na Rua', h, rows, 'material_na_rua_rpmont');
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-violet-600 to-purple-800 border-0 text-white">
          <CardContent className="p-6 text-center">
            <p className="text-lg">👮</p>
            <p className="text-4xl font-bold">{cautelasAgrupadas.length}</p>
            <p className="text-white/70 text-sm mt-1">Policiais</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-600 to-red-800 border-0 text-white">
          <CardContent className="p-6 text-center">
            <p className="text-lg">🔫</p>
            <p className="text-4xl font-bold">{(totaisPorCategoria['arma curta'] || 0) + (totaisPorCategoria['arma longa'] || 0) + (totaisPorCategoria['armamento'] || 0)}</p>
            <p className="text-white/70 text-sm mt-1">Armas</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-600 to-orange-800 border-0 text-white">
          <CardContent className="p-6 text-center">
            <p className="text-lg">💥</p>
            <p className="text-4xl font-bold">{totaisPorCategoria['munição'] || totaisPorCategoria['municao'] || 0}</p>
            <p className="text-white/70 text-sm mt-1">Munições</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-600 to-green-800 border-0 text-white">
          <CardContent className="p-6 text-center">
            <p className="text-lg">🛡️</p>
            <p className="text-4xl font-bold">{(totaisPorCategoria['epi'] || 0) + (totaisPorCategoria['colete'] || 0)}</p>
            <p className="text-white/70 text-sm mt-1">EPIs/Coletes</p>
          </CardContent>
        </Card>
      </div>

      {/* Export */}
      <Card className="bg-slate-800/60 border-indigo-500/20">
        <CardContent className="p-4 flex gap-3">
          <Button onClick={handleCSV} variant="outline" size="sm" className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/20"><Download className="h-4 w-4 mr-1" /> Excel</Button>
          <Button onClick={handlePDF} variant="outline" size="sm" className="border-red-500 text-red-400 hover:bg-red-500/20"><FileText className="h-4 w-4 mr-1" /> PDF</Button>
        </CardContent>
      </Card>

      {/* Tabela por policial */}
      {cautelasAgrupadas.length === 0 ? (
        <Card className="bg-slate-800/60 border-indigo-500/20">
          <CardContent className="p-8 text-center">
            <div className="text-5xl mb-3">✅</div>
            <p className="text-slate-300 text-lg font-medium">Nenhum material na rua!</p>
            <p className="text-slate-500 text-sm">Todos os materiais foram devolvidos</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {cautelasAgrupadas.map((c, idx) => {
            const nomeDisplay = c.postoGrad ? `${c.postoGrad} ${c.policialNomeGuerra || c.policialNome}` : (c.policialNomeGuerra || c.policialNome);
            return (
              <Card key={idx} className="bg-slate-800/60 border-indigo-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">👮‍♂️</span>
                    <div>
                      <p className="text-white font-semibold">{nomeDisplay}</p>
                      <p className="text-slate-400 text-xs">Mat: {c.matricula}</p>
                    </div>
                    <Badge className="ml-auto bg-violet-500/20 text-violet-300">{c.materiais.length} itens</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {c.materiais.map((m: any, i: number) => (
                      <Badge key={i} variant="outline" className="text-sm py-1 px-2 border-slate-600 text-slate-300">
                        {getCategoriaEmoji(m.categoria)} {m.quantidade > 1 ? `${m.quantidade}x ` : ''}{m.nome}{m.numeroSerie ? ` (${m.numeroSerie})` : ''}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MaterialNaRuaSection;
