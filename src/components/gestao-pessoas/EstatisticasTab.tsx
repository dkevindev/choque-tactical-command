import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Users, UserCheck, UserX, CalendarDays, Activity, TrendingUp, Download, BarChart3,
  Briefcase, AlertTriangle, Heart, FileText
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, LineChart, Line
} from 'recharts';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Policial {
  id: string;
  NOME: string;
  'Post/Grad': string;
  SITUAÇÃO: string;
  'FUNÇÃO': string;
  Unidade: string;
  inicioFerias?: string;
  fimFerias?: string;
  inicioSituacao?: string;
  fimSituacao?: string;
  funcaoOrigem?: string;
}

interface Atestado {
  id: string;
  policialId?: string;
  policial?: string;
  dataInicio?: string;
  dias?: number;
  cid?: string;
}

interface Transferido {
  id: string;
  nome?: string;
  postGrad?: string;
  dataTransferencia?: string;
  destino?: string;
}

interface EstatisticasTabProps {
  policiais: Policial[];
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#e11d48', '#a855f7', '#22c55e', '#eab308'
];

const EstatisticasTab: React.FC<EstatisticasTabProps> = ({ policiais }) => {
  const [atestados, setAtestados] = useState<Atestado[]>([]);
  const [transferidos, setTransferidos] = useState<Transferido[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [subTab, setSubTab] = useState('graficos');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [atSnap, trSnap] = await Promise.all([
          getDocs(collection(db, 'atestados_medicos')),
          getDocs(collection(db, 'policiais_transferidos'))
        ]);
        setAtestados(atSnap.docs.map(d => ({ id: d.id, ...d.data() } as Atestado)));
        setTransferidos(trSnap.docs.map(d => ({ id: d.id, ...d.data() } as Transferido)));
      } catch (e) {
        console.error('Erro ao buscar dados de estatísticas:', e);
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  const hoje = new Date();

  // ---- CARDS DE RESUMO ----
  const efetivoTotal = policiais.length;

  const aptos = policiais.filter(p =>
    p.SITUAÇÃO === 'MONTADO - POLICIAMENTO OSTENSIVO' || p.SITUAÇÃO === 'VIATURA' || !p.SITUAÇÃO
  ).length;

  const deFerias = policiais.filter(p =>
    p.SITUAÇÃO?.toLowerCase().includes('férias') || p.SITUAÇÃO?.toLowerCase().includes('ferias')
  ).length;

  const emLTS = policiais.filter(p =>
    p.SITUAÇÃO?.toLowerCase().includes('licença tratamento') ||
    p.SITUAÇÃO?.toLowerCase().includes('licenca tratamento') ||
    p['FUNÇÃO'] === 'LTS'
  ).length;

  const emSituacaoEspecial = policiais.filter(p =>
    p.SITUAÇÃO && p.SITUAÇÃO !== 'MONTADO - POLICIAMENTO OSTENSIVO' && p.SITUAÇÃO !== 'VIATURA' &&
    !p.SITUAÇÃO.toLowerCase().includes('férias') && !p.SITUAÇÃO.toLowerCase().includes('ferias') &&
    !p.SITUAÇÃO.toLowerCase().includes('licença tratamento') && !p.SITUAÇÃO.toLowerCase().includes('licenca tratamento')
  ).length;

  const mesAtual = startOfMonth(hoje);
  const fimMesAtual = endOfMonth(hoje);
  const atestadosMesAtual = atestados.filter(a => {
    if (!a.dataInicio) return false;
    try {
      const d = parseISO(a.dataInicio);
      return isWithinInterval(d, { start: mesAtual, end: fimMesAtual });
    } catch { return false; }
  });
  const diasLicencaMes = atestadosMesAtual.reduce((sum, a) => sum + (a.dias || 0), 0);

  // ---- GRÁFICOS ----
  // Distribuição por Situação
  const situacaoData = useMemo(() => {
    const mapa: Record<string, number> = {};
    policiais.forEach(p => {
      const s = p.SITUAÇÃO || 'Não informado';
      mapa[s] = (mapa[s] || 0) + 1;
    });
    return Object.entries(mapa).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [policiais]);

  // Distribuição por Função
  const funcaoData = useMemo(() => {
    const mapa: Record<string, number> = {};
    policiais.forEach(p => {
      const f = p['FUNÇÃO'] || 'Sem função';
      mapa[f] = (mapa[f] || 0) + 1;
    });
    return Object.entries(mapa).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [policiais]);

  // Top 10 funções
  const top10Funcoes = funcaoData.slice(0, 10);

  // Efetivo por Post/Grad
  const postGradData = useMemo(() => {
    const mapa: Record<string, number> = {};
    policiais.forEach(p => {
      const pg = p['Post/Grad'] || 'N/I';
      mapa[pg] = (mapa[pg] || 0) + 1;
    });
    return Object.entries(mapa).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [policiais]);

  // Policiais por Unidade
  const unidadeData = useMemo(() => {
    const mapa: Record<string, number> = {};
    policiais.forEach(p => {
      const u = p.Unidade || 'N/I';
      mapa[u] = (mapa[u] || 0) + 1;
    });
    return Object.entries(mapa).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [policiais]);

  // Atestados por mês (últimos 12 meses)
  const atestadosPorMes = useMemo(() => {
    const meses: { mes: string; quantidade: number; dias: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const mesRef = subMonths(hoje, i);
      const inicio = startOfMonth(mesRef);
      const fim = endOfMonth(mesRef);
      const mesLabel = format(mesRef, 'MMM/yy', { locale: ptBR });
      const doMes = atestados.filter(a => {
        if (!a.dataInicio) return false;
        try { return isWithinInterval(parseISO(a.dataInicio), { start: inicio, end: fim }); }
        catch { return false; }
      });
      meses.push({ mes: mesLabel, quantidade: doMes.length, dias: doMes.reduce((s, a) => s + (a.dias || 0), 0) });
    }
    return meses;
  }, [atestados]);

  // Evolução mensal de afastamentos
  const evolucaoAfastamentos = useMemo(() => {
    const meses: { mes: string; ferias: number; licenca: number; atestados: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const mesRef = subMonths(hoje, i);
      const mesLabel = format(mesRef, 'MMM/yy', { locale: ptBR });
      const inicio = startOfMonth(mesRef);
      const fim = endOfMonth(mesRef);

      // Para férias e licença, contamos quem está com situação ativa no período
      // (simplificado: contamos atestados pelo mês de início)
      const atMes = atestados.filter(a => {
        if (!a.dataInicio) return false;
        try { return isWithinInterval(parseISO(a.dataInicio), { start: inicio, end: fim }); }
        catch { return false; }
      }).length;

      meses.push({ mes: mesLabel, ferias: 0, licenca: 0, atestados: atMes });
    }
    // O mês atual podemos preencher férias e licença com dados atuais
    if (meses.length > 0) {
      meses[meses.length - 1].ferias = deFerias;
      meses[meses.length - 1].licenca = emLTS;
    }
    return meses;
  }, [atestados, deFerias, emLTS]);

  // ---- POLICIAIS AFASTADOS HOJE ----
  const afastadosHoje = useMemo(() => {
    return policiais.filter(p =>
      p.SITUAÇÃO && p.SITUAÇÃO !== 'MONTADO - POLICIAMENTO OSTENSIVO' && p.SITUAÇÃO !== 'VIATURA'
    );
  }, [policiais]);

  // ---- EXPORTAÇÃO ----
  const exportarRelatorioCompleto = () => {
    const BOM = '\uFEFF';
    let csv = BOM;

    // Resumo geral
    csv += 'RELATÓRIO COMPLETO DO EFETIVO\n';
    csv += `Data de Geração;${format(hoje, 'dd/MM/yyyy HH:mm')}\n\n`;
    csv += 'RESUMO GERAL\n';
    csv += `Efetivo Total;${efetivoTotal}\n`;
    csv += `Aptos para Serviço;${aptos}\n`;
    csv += `De Férias;${deFerias}\n`;
    csv += `Em LTS;${emLTS}\n`;
    csv += `Em Situação Especial;${emSituacaoEspecial}\n`;
    csv += `Transferidos (histórico);${transferidos.length}\n`;
    csv += `Atestados no Mês;${atestadosMesAtual.length}\n`;
    csv += `Dias de Licença no Mês;${diasLicencaMes}\n\n`;

    // Por situação
    csv += 'RESUMO POR SITUAÇÃO\n';
    csv += 'Situação;Quantidade;Percentual\n';
    situacaoData.forEach(s => {
      csv += `${s.name};${s.value};${((s.value / efetivoTotal) * 100).toFixed(1)}%\n`;
    });
    csv += '\n';

    // Por função
    csv += 'RESUMO POR FUNÇÃO\n';
    csv += 'Função;Quantidade\n';
    funcaoData.forEach(f => {
      csv += `${f.name};${f.value}\n`;
    });
    csv += '\n';

    // Por Post/Grad
    csv += 'RESUMO POR POSTO/GRADUAÇÃO\n';
    csv += 'Post/Grad;Quantidade\n';
    postGradData.forEach(pg => {
      csv += `${pg.name};${pg.value}\n`;
    });
    csv += '\n';

    // Policiais afastados
    csv += 'POLICIAIS AFASTADOS HOJE\n';
    csv += 'Post/Grad;Nome;Situação;Função\n';
    afastadosHoje.forEach(p => {
      csv += `${p['Post/Grad']};${p.NOME};${p.SITUAÇÃO};${p['FUNÇÃO'] || ''}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-efetivo-${format(hoje, 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportarEfetivoCompleto = () => {
    const BOM = '\uFEFF';
    let csv = BOM;
    csv += 'Post/Grad;Nome;Situação;Função;Unidade\n';
    policiais.forEach(p => {
      csv += `${p['Post/Grad']};${p.NOME};${p.SITUAÇÃO || ''};${p['FUNÇÃO'] || ''};${p.Unidade || ''}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `efetivo-completo-${format(hoje, 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="ml-3">Carregando estatísticas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Efetivo Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{efetivoTotal}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aptos p/ Serviço</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{aptos}</div>
            <p className="text-xs text-muted-foreground">{((aptos / efetivoTotal) * 100).toFixed(0)}% do efetivo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">De Férias</CardTitle>
            <CalendarDays className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{deFerias}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em LTS</CardTitle>
            <Heart className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{emLTS}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sit. Especial</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{emSituacaoEspecial}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transferidos</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transferidos.length}</div>
            <p className="text-xs text-muted-foreground">Total histórico</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atestados (mês)</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{atestadosMesAtual.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dias Licença (mês)</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">{diasLicencaMes}</div>
          </CardContent>
        </Card>
      </div>

      {/* Exportação */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={exportarRelatorioCompleto} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar Relatório Completo
        </Button>
        <Button onClick={exportarEfetivoCompleto} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar Efetivo Completo
        </Button>
      </div>

      {/* Sub-abas */}
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="graficos">Gráficos</TabsTrigger>
          <TabsTrigger value="situacao">Por Situação</TabsTrigger>
          <TabsTrigger value="funcao">Por Função</TabsTrigger>
          <TabsTrigger value="postgrad">Por Post/Grad</TabsTrigger>
          <TabsTrigger value="afastados">Afastados Hoje</TabsTrigger>
        </TabsList>

        <TabsContent value="graficos" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pizza - Situação */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribuição por Situação</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={situacaoData} cx="50%" cy="50%" outerRadius={100} dataKey="value"
                      label={({ name, percent }) => `${name.substring(0, 15)}${name.length > 15 ? '...' : ''} ${(percent * 100).toFixed(0)}%`}>
                      {situacaoData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Pizza - Função */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribuição por Função</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={top10Funcoes} cx="50%" cy="50%" outerRadius={100} dataKey="value"
                      label={({ name, percent }) => `${name.substring(0, 12)}${name.length > 12 ? '...' : ''} ${(percent * 100).toFixed(0)}%`}>
                      {top10Funcoes.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Barras - Post/Grad */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Efetivo por Posto/Graduação</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={postGradData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Barras - Atestados por mês */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Atestados por Mês (12 meses)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={atestadosPorMes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" fontSize={11} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="quantidade" name="Qtd" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="dias" name="Dias" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Barras - Unidade */}
            {unidadeData.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Policiais por Unidade</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={unidadeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Barras Horizontais - Top 10 Funções */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top 10 Funções</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={top10Funcoes} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} fontSize={10} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Linha - Evolução de afastamentos */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Evolução Mensal de Afastamentos</CardTitle>
                <CardDescription>Férias e LTS mostrados apenas no mês atual</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={evolucaoAfastamentos}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" fontSize={11} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="atestados" name="Atestados" stroke="#ef4444" strokeWidth={2} />
                    <Line type="monotone" dataKey="ferias" name="Férias" stroke="#f59e0b" strokeWidth={2} />
                    <Line type="monotone" dataKey="licenca" name="Licença" stroke="#8b5cf6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="situacao">
          <Card>
            <CardHeader>
              <CardTitle>Resumo por Situação</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Situação</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Percentual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {situacaoData.map(s => (
                    <TableRow key={s.name}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-right">{s.value}</TableCell>
                      <TableCell className="text-right">{((s.value / efetivoTotal) * 100).toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funcao">
          <Card>
            <CardHeader>
              <CardTitle>Resumo por Função</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Função</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Percentual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {funcaoData.map(f => (
                    <TableRow key={f.name}>
                      <TableCell className="font-medium">{f.name}</TableCell>
                      <TableCell className="text-right">{f.value}</TableCell>
                      <TableCell className="text-right">{((f.value / efetivoTotal) * 100).toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="postgrad">
          <Card>
            <CardHeader>
              <CardTitle>Resumo por Posto/Graduação</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Post/Grad</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Percentual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {postGradData.map(pg => (
                    <TableRow key={pg.name}>
                      <TableCell className="font-medium">{pg.name}</TableCell>
                      <TableCell className="text-right">{pg.value}</TableCell>
                      <TableCell className="text-right">{((pg.value / efetivoTotal) * 100).toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="afastados">
          <Card>
            <CardHeader>
              <CardTitle>Policiais Afastados Hoje ({afastadosHoje.length})</CardTitle>
              <CardDescription>Policiais fora de serviço atualmente (férias, licença, situação especial)</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Post/Grad</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Função Original</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {afastadosHoje.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nenhum policial afastado
                      </TableCell>
                    </TableRow>
                  ) : (
                    afastadosHoje.map(p => (
                      <TableRow key={p.id}>
                        <TableCell><Badge variant="secondary">{p['Post/Grad']}</Badge></TableCell>
                        <TableCell className="font-medium">{p.NOME}</TableCell>
                        <TableCell><Badge variant="outline">{p.SITUAÇÃO}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{p.funcaoOrigem || p['FUNÇÃO'] || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EstatisticasTab;
