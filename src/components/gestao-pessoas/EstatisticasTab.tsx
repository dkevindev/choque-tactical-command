import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users, UserCheck, UserX, CalendarDays, Download, Heart, AlertTriangle, Eye, EyeOff, Percent, Trophy, Briefcase, Shield
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { format, parseISO, subMonths } from 'date-fns';

const formatDateBR = (d: string | undefined) => {
  if (!d) return '-';
  try { return format(parseISO(d), 'dd/MM/yy'); } catch { return d; }
};
import GerarResumoEfetivoForm from './GerarResumoEfetivoForm';
import { sortByHierarquia, isLTS } from '@/lib/policialUtils';

interface Policial {
  id: string;
  NOME: string;
  'NOME DE GUERRA1'?: string;
  'Post/Grad': string;
  SITUAÇÃO: string;
  'FUNÇÃO': string;
  Unidade?: string;
  UNIDADE?: string;
  Matrícula?: string;
  NUMERAL?: string;
  numeral?: string;
  inicioSituacao?: string;
  fimSituacao?: string;
}

interface ConfigSituacao {
  id: string;
  nome: string;
  indisponivel: boolean;
}

interface AtestadoMapa {
  cid: string;
  cidDescricao: string;
  dataInicio: string;
  dataFim: string;
  dias: number;
}

interface EstatisticasTabProps {
  policiais: Policial[];
}

type UnidadeKey = 'regimento' | '1esqd' | '2esqd' | '3pel';

const UNIDADES: { key: UnidadeKey; label: string; filter: (p: Policial) => boolean }[] = [
  { key: 'regimento', label: 'Regimento', filter: () => true },
  { key: '1esqd', label: '1º ESQD', filter: (p) => { const u = (p.UNIDADE || p.Unidade || '').toUpperCase(); return u.includes('1') && u.includes('ESQD') && !u.includes('3'); } },
  { key: '2esqd', label: '2º ESQD', filter: (p) => { const u = (p.UNIDADE || p.Unidade || '').toUpperCase(); return u.includes('2') && u.includes('ESQD') && !u.includes('3') && !u.includes('PEL'); } },
  { key: '3pel', label: '3º PEL/2º ESQD', filter: (p) => { const u = (p.UNIDADE || p.Unidade || '').toUpperCase(); return u.includes('3') && (u.includes('PEL') || u.includes('3')); } },
];

const FUNCAO_COLORS = [
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-green-100 text-green-800 border-green-200',
  'bg-purple-100 text-purple-800 border-purple-200',
  'bg-orange-100 text-orange-800 border-orange-200',
  'bg-pink-100 text-pink-800 border-pink-200',
  'bg-teal-100 text-teal-800 border-teal-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200',
  'bg-yellow-100 text-yellow-800 border-yellow-200',
  'bg-red-100 text-red-800 border-red-200',
  'bg-cyan-100 text-cyan-800 border-cyan-200',
];

const EstatisticasTab: React.FC<EstatisticasTabProps> = ({ policiais }) => {
  const [situacoes, setSituacoes] = useState<ConfigSituacao[]>([]);
  const [atestadosMap, setAtestadosMap] = useState<Map<string, AtestadoMapa>>(new Map());
  const [allAtestados, setAllAtestados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [abaUnidade, setAbaUnidade] = useState<UnidadeKey>('regimento');
  const [showFerias, setShowFerias] = useState(false);
  const [showLTS, setShowLTS] = useState(false);
  const [showOutros, setShowOutros] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [situacoesSnap, atestadosSnap] = await Promise.all([
          getDocs(collection(db, 'config_situacoes')),
          getDocs(collection(db, 'atestados_medicos')),
        ]);
        setSituacoes(situacoesSnap.docs.map(d => ({ id: d.id, nome: d.data().nome, indisponivel: d.data().indisponivel ?? true })));

        const allAtestadosData = atestadosSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllAtestados(allAtestadosData);

        // Criar mapa policialId -> atestado vigente mais recente
        const mapa = new Map<string, AtestadoMapa>();
        allAtestadosData.forEach((data: any) => {
          if (!data.policialId || !data.dataInicio || !data.dataFim) return;
          const existing = mapa.get(data.policialId);
          if (!existing || data.dataFim > existing.dataFim) {
            mapa.set(data.policialId, {
              cid: data.cid || '',
              cidDescricao: data.cidDescricao || '',
              dataInicio: data.dataInicio,
              dataFim: data.dataFim,
              dias: data.dias || 0,
            });
          }
        });
        setAtestadosMap(mapa);
      } catch (e) {
        console.error('Erro ao carregar dados:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const situacoesIndisponiveis = useMemo(() => situacoes.filter(s => s.indisponivel).map(s => s.nome), [situacoes]);

  const policiaisFiltrados = useMemo(() => {
    const unidade = UNIDADES.find(u => u.key === abaUnidade);
    if (!unidade) return policiais;
    return policiais.filter(unidade.filter);
  }, [policiais, abaUnidade]);

  // Top Assiduidade - últimos 12 meses
  const rankingAssiduidade = useMemo(() => {
    const limite = format(subMonths(new Date(), 12), 'yyyy-MM-dd');
    const contagem: Record<string, number> = {};
    
    allAtestados.forEach((a: any) => {
      if (!a.policialId || !a.dataInicio) return;
      if (a.dataInicio >= limite) {
        contagem[a.policialId] = (contagem[a.policialId] || 0) + 1;
      }
    });

    return policiaisFiltrados
      .map(p => ({
        id: p.id,
        nome: (p['NOME DE GUERRA1'] || p.NOME || '-').toUpperCase(),
        atestados: contagem[p.id] || 0,
      }))
      .sort((a, b) => a.atestados - b.atestados);
  }, [policiaisFiltrados, allAtestados]);

  const stats = useMemo(() => {
    const total = policiaisFiltrados.length;
    const indisponiveis = policiaisFiltrados.filter(p => p.SITUAÇÃO && situacoesIndisponiveis.includes(p.SITUAÇÃO));
    const ferias = policiaisFiltrados.filter(p => p.SITUAÇÃO?.toUpperCase().includes('FÉRIAS') || p.SITUAÇÃO?.toUpperCase().includes('FERIAS'));
    const lts = policiaisFiltrados.filter(p => isLTS(p.SITUAÇÃO));
    const outrosAfastamentos = indisponiveis.filter(p => {
      const sit = p.SITUAÇÃO?.toUpperCase() || '';
      const isFerias = sit.includes('FÉRIAS') || sit.includes('FERIAS');
      const ehLTS = isLTS(p.SITUAÇÃO);
      return !isFerias && !ehLTS;
    });
    const disponiveis = total - indisponiveis.length;
    const postGradMap: Record<string, number> = {};
    policiaisFiltrados.forEach(p => {
      const pg = p['Post/Grad'] || 'N/I';
      postGradMap[pg] = (postGradMap[pg] || 0) + 1;
    });
    const postGradResumo = Object.entries(postGradMap).sort((a, b) => b[1] - a[1]);

    // Resumo por Função
    const funcaoMap: Record<string, number> = {};
    policiaisFiltrados.forEach(p => {
      const funcao = p['FUNÇÃO'] || 'N/I';
      funcaoMap[funcao] = (funcaoMap[funcao] || 0) + 1;
    });
    const funcaoResumo = Object.entries(funcaoMap).sort((a, b) => b[1] - a[1]);

    return { total, disponiveis, indisponiveis, ferias, lts, outrosAfastamentos, postGradResumo, funcaoResumo };
  }, [policiaisFiltrados, situacoesIndisponiveis]);

  const getNomeGuerra = (p: Policial) => p['NOME DE GUERRA1'] || p.NOME || '-';
  const getNumeral = (p: Policial) => p.NUMERAL || p.numeral || '-';
  const getMatricula = (p: Policial) => p.Matrícula || '-';

  const exportarRelatorioCompleto = () => {
    const BOM = '\uFEFF';
    const hoje = new Date();
    let csv = BOM;
    csv += 'RELATÓRIO DE ESTATÍSTICAS DO EFETIVO\n';
    csv += `Data;${format(hoje, 'dd/MM/yyyy HH:mm')}\n`;
    csv += `Unidade;${UNIDADES.find(u => u.key === abaUnidade)?.label}\n\n`;
    csv += `Total Efetivo;${stats.total}\n`;
    csv += `Disponíveis;${stats.disponiveis}\n`;
    csv += `Indisponíveis;${stats.indisponiveis.length}\n`;
    csv += `Férias;${stats.ferias.length}\n`;
    csv += `LTS;${stats.lts.length}\n`;
    csv += `Outros Afastamentos;${stats.outrosAfastamentos.length}\n\n`;
    csv += 'INDISPONÍVEIS\n';
    csv += 'Nome de Guerra;Numeral;Matrícula;Situação;CID;Descrição CID;Data Início;Data Final\n';
    stats.indisponiveis.forEach(p => {
      const atestado = atestadosMap.get(p.id);
      csv += `${getNomeGuerra(p)};${getNumeral(p)};${getMatricula(p)};${p.SITUAÇÃO};${atestado?.cid || '-'};${atestado?.cidDescricao || '-'};${p.inicioSituacao || '-'};${p.fimSituacao || '-'}\n`;
    });
    csv += '\nRESUMO POR POSTO/GRADUAÇÃO\n';
    csv += 'Posto/Graduação;Quantidade\n';
    stats.postGradResumo.forEach(([pg, qtd]) => { csv += `${pg};${qtd}\n`; });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `estatisticas-${abaUnidade}-${format(hoje, 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Lista genérica de policiais
  const renderPolicialList = (list: Policial[], options?: { showSituacao?: boolean; showCid?: boolean }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome de Guerra</TableHead>
          <TableHead>Numeral</TableHead>
          <TableHead>Matrícula</TableHead>
          {options?.showSituacao && <TableHead>Situação</TableHead>}
          {options?.showCid && <TableHead>CID</TableHead>}
          {options?.showCid && <TableHead>Descrição CID</TableHead>}
          <TableHead>Data Início</TableHead>
          <TableHead>Data Final</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.sort(sortByHierarquia).map(p => {
          const atestado = atestadosMap.get(p.id);
          return (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{getNomeGuerra(p)}</TableCell>
              <TableCell>{getNumeral(p)}</TableCell>
              <TableCell>{getMatricula(p)}</TableCell>
              {options?.showSituacao && <TableCell><Badge variant="outline">{p.SITUAÇÃO}</Badge></TableCell>}
              {options?.showCid && <TableCell className="font-mono text-xs">{atestado?.cid || '-'}</TableCell>}
              {options?.showCid && <TableCell className="text-xs">{atestado?.cidDescricao || '-'}</TableCell>}
              <TableCell>{formatDateBR(p.inicioSituacao)}</TableCell>
              <TableCell>{formatDateBR(p.fimSituacao)}</TableCell>
            </TableRow>
          );
        })}
        {list.length === 0 && (
          <TableRow>
            <TableCell colSpan={options?.showSituacao && options?.showCid ? 8 : options?.showSituacao || options?.showCid ? 7 : 5} className="text-center text-muted-foreground">
              Nenhum policial
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="ml-3">Carregando estatísticas...</p>
      </div>
    );
  }

  const percentDisponivel = stats.total > 0 ? ((stats.disponiveis / stats.total) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      <Tabs value={abaUnidade} onValueChange={(v) => { setAbaUnidade(v as UnidadeKey); setShowFerias(false); setShowLTS(false); setShowOutros(false); }}>
        <TabsList className="flex flex-wrap gap-1 h-auto">
          {UNIDADES.map(u => (
            <TabsTrigger key={u.key} value={u.key}>{u.label}</TabsTrigger>
          ))}
        </TabsList>

        {UNIDADES.map(u => (
          <TabsContent key={u.key} value={u.key} className="space-y-6">
            {/* 6 Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-medium">Total Efetivo</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-medium">Disponível</CardTitle>
                  <UserCheck className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold text-green-600">{stats.disponiveis}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-medium">Indisponível</CardTitle>
                  <UserX className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold text-red-600">{stats.indisponiveis.length}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-medium flex items-center gap-1">
                    Férias
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowFerias(!showFerias)}>
                      {showFerias ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </CardTitle>
                  <CalendarDays className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold text-orange-500">{stats.ferias.length}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-medium flex items-center gap-1">
                    LTS
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowLTS(!showLTS)}>
                      {showLTS ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </CardTitle>
                  <Heart className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold text-red-500">{stats.lts.length}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-medium flex items-center gap-1">
                    Outros
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowOutros(!showOutros)}>
                      {showOutros ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </CardTitle>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold text-amber-500">{stats.outrosAfastamentos.length}</div></CardContent>
              </Card>
            </div>

            {/* Listas expansíveis */}
            {showFerias && (
              <Card>
                <CardHeader><CardTitle className="text-base">Policiais de Férias</CardTitle></CardHeader>
                <CardContent>{renderPolicialList(stats.ferias)}</CardContent>
              </Card>
            )}
            {showLTS && (
              <Card>
                <CardHeader><CardTitle className="text-base">Policiais em LTS</CardTitle></CardHeader>
                <CardContent>{renderPolicialList(stats.lts, { showCid: true })}</CardContent>
              </Card>
            )}
            {showOutros && (
              <Card>
                <CardHeader><CardTitle className="text-base">Outros Afastamentos</CardTitle></CardHeader>
                <CardContent>{renderPolicialList(stats.outrosAfastamentos, { showSituacao: true })}</CardContent>
              </Card>
            )}

            {/* Tabela de Indisponibilidades */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Indisponibilidades</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome de Guerra</TableHead>
                      <TableHead>Numeral</TableHead>
                      <TableHead>Matrícula</TableHead>
                      <TableHead>Situação</TableHead>
                      <TableHead>CID</TableHead>
                      <TableHead>Descrição CID</TableHead>
                      <TableHead>Data Início</TableHead>
                      <TableHead>Data Final</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.indisponiveis.sort(sortByHierarquia).map(p => {
                      const atestado = atestadosMap.get(p.id);
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{getNomeGuerra(p)}</TableCell>
                          <TableCell>{getNumeral(p)}</TableCell>
                          <TableCell>{getMatricula(p)}</TableCell>
                          <TableCell><Badge variant="outline">{p.SITUAÇÃO}</Badge></TableCell>
                          <TableCell className="font-mono text-xs">{atestado?.cid || '-'}</TableCell>
                          <TableCell className="text-xs">{atestado?.cidDescricao || '-'}</TableCell>
                          <TableCell>{formatDateBR(p.inicioSituacao)}</TableCell>
                          <TableCell>{formatDateBR(p.fimSituacao)}</TableCell>
                        </TableRow>
                      );
                    })}
                    {stats.indisponiveis.length === 0 && (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Nenhum policial indisponível</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Grid 3 colunas: Disponibilidade + Top Assiduidade + Resumo Função */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Disponibilidade */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base">Disponibilidade</CardTitle>
                  <Percent className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{percentDisponivel}%</div>
                  <p className="text-sm text-muted-foreground mt-1">{stats.disponiveis} de {stats.total} policiais disponíveis</p>
                  <div className="w-full bg-muted rounded-full h-3 mt-3">
                    <div className="bg-green-600 h-3 rounded-full transition-all" style={{ width: `${percentDisponivel}%` }} />
                  </div>
                </CardContent>
              </Card>

              {/* Top Assiduidade */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    Top Assiduidade
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">12 meses</Badge>
                </CardHeader>
                <CardContent className="p-0 px-6 pb-4">
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-1">
                      {rankingAssiduidade.map((item, idx) => (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between py-1.5 px-2 rounded text-sm ${
                            idx < 3 ? 'bg-yellow-50 border border-yellow-200' : 
                            idx % 2 === 0 ? 'bg-muted/50' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`font-bold w-7 text-right shrink-0 ${
                              idx === 0 ? 'text-yellow-600' : idx === 1 ? 'text-gray-500' : idx === 2 ? 'text-amber-700' : 'text-muted-foreground'
                            }`}>
                              {idx + 1}º
                            </span>
                            <span className="truncate font-medium">{item.nome}</span>
                          </div>
                          <Badge variant={item.atestados === 0 ? 'default' : 'outline'} className="shrink-0 ml-2">
                            {item.atestados}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Resumo por Posto/Graduação - visual melhorado */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    Posto/Graduação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {stats.postGradResumo.map(([pg, qtd]) => (
                      <div key={pg} className="flex items-center justify-between p-2 rounded-lg bg-muted/60 border">
                        <span className="text-sm font-medium truncate">{pg}</span>
                        <Badge variant="secondary" className="font-bold ml-1">{qtd}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Resumo por Função */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  Resumo por Função
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {stats.funcaoResumo.map(([funcao, qtd], idx) => (
                    <div
                      key={funcao}
                      className={`flex items-center justify-between p-3 rounded-lg border ${FUNCAO_COLORS[idx % FUNCAO_COLORS.length]}`}
                    >
                      <span className="text-sm font-medium truncate">{funcao}</span>
                      <span className="text-lg font-bold ml-2 shrink-0">{qtd}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-3">
              <Button onClick={exportarRelatorioCompleto} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar Relatório
              </Button>
            </div>

            <GerarResumoEfetivoForm />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default EstatisticasTab;
