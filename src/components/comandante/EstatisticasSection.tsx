import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserCheck, UserX, Users, Download, FileText } from 'lucide-react';
import { exportarCSV, exportarPDF } from './exportUtils';

interface Props { policiais: any[]; atestados: any[]; }

const SITUACOES_INDISPONIVEIS = ['FÉRIAS', 'LTS', 'LICENÇA MATERNIDADE', 'LICENÇA PATERNIDADE', 'AFASTADO', 'CEDIDO', 'À DISPOSIÇÃO'];

const EstatisticasSection: React.FC<Props> = ({ policiais }) => {
  const disponiveis = useMemo(() => policiais.filter(p => !SITUACOES_INDISPONIVEIS.some(s => p.SITUAÇÃO?.toUpperCase().includes(s))), [policiais]);
  const indisponiveis = useMemo(() => policiais.filter(p => SITUACOES_INDISPONIVEIS.some(s => p.SITUAÇÃO?.toUpperCase().includes(s))), [policiais]);

  const porPostGrad = useMemo(() => {
    const map: Record<string, number> = {};
    policiais.forEach(p => { const k = p['Post/Grad'] || 'N/I'; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [policiais]);

  const porFuncao = useMemo(() => {
    const map: Record<string, number> = {};
    policiais.forEach(p => { const k = p.FUNÇÃO || 'Sem Função'; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [policiais]);

  const porSituacao = useMemo(() => {
    const map: Record<string, number> = {};
    policiais.forEach(p => { const k = p.SITUAÇÃO || 'N/I'; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [policiais]);

  const handleCSV = () => {
    const h = ['Categoria', 'Valor', 'Quantidade'];
    const r = [
      ['Resumo', 'Total', String(policiais.length)],
      ['Resumo', 'Disponíveis', String(disponiveis.length)],
      ['Resumo', 'Indisponíveis', String(indisponiveis.length)],
      ...porPostGrad.map(([k, v]) => ['Posto/Graduação', k, String(v)]),
      ...porFuncao.map(([k, v]) => ['Função', k, String(v)]),
      ...porSituacao.map(([k, v]) => ['Situação', k, String(v)]),
    ];
    exportarCSV(h, r, 'estatisticas_rpmont');
  };
  const handlePDF = () => {
    const h = ['Categoria', 'Valor', 'Quantidade'];
    const r = [
      ['Resumo', 'Total', String(policiais.length)],
      ['Resumo', 'Disponíveis', String(disponiveis.length)],
      ['Resumo', 'Indisponíveis', String(indisponiveis.length)],
      ...porPostGrad.map(([k, v]) => ['Posto/Graduação', k, String(v)]),
      ...porFuncao.map(([k, v]) => ['Função', k, String(v)]),
    ];
    exportarPDF('Estatísticas Gerais', h, r, 'estatisticas_rpmont');
  };

  const colors = ['bg-indigo-500/30 text-indigo-300', 'bg-violet-500/30 text-violet-300', 'bg-blue-500/30 text-blue-300', 'bg-cyan-500/30 text-cyan-300', 'bg-teal-500/30 text-teal-300', 'bg-emerald-500/30 text-emerald-300', 'bg-amber-500/30 text-amber-300', 'bg-rose-500/30 text-rose-300'];

  return (
    <div className="space-y-6">
      {/* Cards resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-indigo-600 to-indigo-800 border-0 text-white">
          <CardContent className="p-6 text-center">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-80" />
            <p className="text-4xl font-bold">{policiais.length}</p>
            <p className="text-white/70 text-sm mt-1">Total</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-600 to-emerald-800 border-0 text-white">
          <CardContent className="p-6 text-center">
            <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-80" />
            <p className="text-4xl font-bold">{disponiveis.length}</p>
            <p className="text-white/70 text-sm mt-1">Disponíveis</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-600 to-red-800 border-0 text-white">
          <CardContent className="p-6 text-center">
            <UserX className="h-8 w-8 mx-auto mb-2 opacity-80" />
            <p className="text-4xl font-bold">{indisponiveis.length}</p>
            <p className="text-white/70 text-sm mt-1">Indisponíveis</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Button onClick={handleCSV} variant="outline" size="sm" className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/20"><Download className="h-4 w-4 mr-1" /> Excel</Button>
        <Button onClick={handlePDF} variant="outline" size="sm" className="border-red-500 text-red-400 hover:bg-red-500/20"><FileText className="h-4 w-4 mr-1" /> PDF</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Situação */}
        <Card className="bg-slate-800/60 border-indigo-500/20">
          <CardContent className="p-4">
            <h3 className="text-white font-semibold mb-3">Por Situação</h3>
            <div className="flex flex-wrap gap-2">
              {porSituacao.map(([k, v], i) => (
                <Badge key={k} className={`text-sm py-1 px-3 ${colors[i % colors.length]}`}>{k}: {v}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Posto/Grad */}
        <Card className="bg-slate-800/60 border-indigo-500/20">
          <CardContent className="p-4">
            <h3 className="text-white font-semibold mb-3">Por Posto/Graduação</h3>
            <div className="flex flex-wrap gap-2">
              {porPostGrad.map(([k, v], i) => (
                <Badge key={k} className={`text-sm py-1 px-3 ${colors[i % colors.length]}`}>{k}: {v}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Função */}
        <Card className="bg-slate-800/60 border-indigo-500/20">
          <CardContent className="p-4">
            <h3 className="text-white font-semibold mb-3">Por Função</h3>
            <div className="flex flex-wrap gap-2">
              {porFuncao.map(([k, v], i) => (
                <Badge key={k} className={`text-sm py-1 px-3 ${colors[i % colors.length]}`}>{k}: {v}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EstatisticasSection;
