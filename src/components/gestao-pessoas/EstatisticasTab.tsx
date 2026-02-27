import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Users, UserCheck, UserX, CalendarDays, Download, Heart, AlertTriangle, Eye, EyeOff, Percent
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { format } from 'date-fns';
import GerarResumoEfetivoForm from './GerarResumoEfetivoForm';
import { sortByHierarquia } from '@/lib/policialUtils';

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

const EstatisticasTab: React.FC<EstatisticasTabProps> = ({ policiais }) => {
  const [situacoes, setSituacoes] = useState<ConfigSituacao[]>([]);
  const [atestadosMap, setAtestadosMap] = useState<Map<string, AtestadoMapa>>(new Map());
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

        // Criar mapa policialId -> atestado vigente mais recente
        const hoje = format(new Date(), 'yyyy-MM-dd');
        const mapa = new Map<string, AtestadoMapa>();
        atestadosSnap.docs.forEach(d => {
          const data = d.data();
          if (!data.policialId || !data.dataInicio || !data.dataFim) return;
          // Pegar o mais recente por policial (vigente ou não, para exibir info)
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

  const stats = useMemo(() => {
    const total = policiaisFiltrados.length;
    const indisponiveis = policiaisFiltrados.filter(p => p.SITUAÇÃO && situacoesIndisponiveis.includes(p.SITUAÇÃO));
    const ferias = policiaisFiltrados.filter(p => p.SITUAÇÃO?.toUpperCase().includes('FÉRIAS') || p.SITUAÇÃO?.toUpperCase().includes('FERIAS'));
    const lts = policiaisFiltrados.filter(p =>
      p.SITUAÇÃO?.toUpperCase().includes('LICENÇA TRATAMENTO') || 
      p.SITUAÇÃO?.toUpperCase().includes('LICENCA TRATAMENTO') ||
      p.SITUAÇÃO?.toUpperCase() === 'LTS'
    );
    const outrosAfastamentos = indisponiveis.filter(p => {
      const sit = p.SITUAÇÃO?.toUpperCase() || '';
      const isFerias = sit.includes('FÉRIAS') || sit.includes('FERIAS');
      const isLTS = sit.includes('LICENÇA TRATAMENTO') || sit.includes('LICENCA TRATAMENTO') || sit === 'LTS';
      return !isFerias && !isLTS;
    });
    const disponiveis = total - indisponiveis.length;
    const postGradMap: Record<string, number> = {};
    policiaisFiltrados.forEach(p => {
      const pg = p['Post/Grad'] || 'N/I';
      postGradMap[pg] = (postGradMap[pg] || 0) + 1;
    });
    const postGradResumo = Object.entries(postGradMap).sort((a, b) => b[1] - a[1]);
    return { total, disponiveis, indisponiveis, ferias, lts, outrosAfastamentos, postGradResumo };
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
              <TableCell>{p.inicioSituacao || '-'}</TableCell>
              <TableCell>{p.fimSituacao || '-'}</TableCell>
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
                          <TableCell>{p.inicioSituacao || '-'}</TableCell>
                          <TableCell>{p.fimSituacao || '-'}</TableCell>
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

            {/* Estatísticas adicionais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Card>
                <CardHeader><CardTitle className="text-base">Resumo por Posto/Graduação</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Posto/Graduação</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.postGradResumo.map(([pg, qtd]) => (
                        <TableRow key={pg}>
                          <TableCell>{pg}</TableCell>
                          <TableCell className="text-right font-medium">{qtd}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

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
