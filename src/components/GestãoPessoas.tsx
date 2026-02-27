import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CalendarDays, Users, UserCheck, UserX, TrendingUp, AlertTriangle, ArrowLeft, BarChart3 } from 'lucide-react';
import { collection, getDocs, query, orderBy, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { isLTS } from '@/lib/policialUtils';
import { format, startOfMonth, endOfMonth, isWithinInterval, addDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import GestaoFeriasTab from './gestao-pessoas/GestaoFeriasTab';
import EfetivoTab from './gestao-pessoas/EfetivoTab';
import MovimentacoesTab from './gestao-pessoas/MovimentacoesTab';
import SituacaoTab from './gestao-pessoas/SituacaoTab';
import FuncaoTab from './gestao-pessoas/FuncaoTab';
import TransferidosTab from './gestao-pessoas/TransferidosTab';
import AtestadosMedicosTab from './gestao-pessoas/AtestadosMedicosTab';
import EstatisticasTab from './gestao-pessoas/EstatisticasTab';
import logoRegimento from '@/assets/logo-regimento.jpg';

interface Policial {
  id: string;
  NOME: string;
  'Post/Grad': string;
  SITUAÇÃO: string;
  'FUNÇÃO': string;
  Unidade: string;
  'Data de Nascimento': any;
  'PREVISAO FÉRIAS - AQUISITIVO 2024': string;
  inicioFerias?: string;
  fimFerias?: string;
  funcaoOrigem?: string;
  publicacaoFerias?: string;
  'NOME DE GUERRA1'?: string;
  NUMERAL?: string;
  numeral?: string;
  Matrícula?: string;
  inicioSituacao?: string;
  fimSituacao?: string;
}

export interface RetornoLTS {
  policialId: string;
  policialNome: string;
  policialNomeGuerra: string;
  policialNumeral: string;
  policialMatricula: string;
  cid: string;
  cidDescricao: string;
  dataInicio: string;
  dataFim: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const GestãoPessoas: React.FC = () => {
  const navigate = useNavigate();
  const [policiais, setPoliciais] = useState<Policial[]>([]);
  const [loading, setLoading] = useState(true);
  const [verificando, setVerificando] = useState(false);
  const [progressValue, setProgressValue] = useState(0);
  const [progressText, setProgressText] = useState('Carregando dados...');
  const [fadeOut, setFadeOut] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [retornosLTS, setRetornosLTS] = useState<RetornoLTS[]>([]);

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      navigate('/');
      return;
    }
    try {
      const userData = JSON.parse(user);
      if (!userData.acessos?.gestaoPessoas) {
        navigate('/');
        return;
      }
    } catch (error) {
      console.error('Erro ao verificar acesso:', error);
      navigate('/');
      return;
    }
    iniciarSistema();
  }, [navigate]);

  const iniciarSistema = async () => {
    setVerificando(true);
    setProgressValue(10);
    setProgressText('Carregando efetivo...');

    try {
      // 1. Buscar policiais
      const policiaisRef = collection(db, 'policiais');
      const q = query(policiaisRef, orderBy('NOME'));
      const querySnapshot = await getDocs(q);
      const policiaisData = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Policial[];
      
      setProgressValue(40);
      setProgressText('Verificando atestados médicos...');

      // 2. Buscar atestados
      const atestadosSnap = await getDocs(collection(db, 'atestados_medicos'));
      const atestados = atestadosSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

      setProgressValue(60);
      setProgressText('Verificando situações de LTS...');

      // 3. Verificar situações LTS
      const retornos = await verificarSituacoesLTS(policiaisData, atestados);

      setProgressValue(90);
      setProgressText('Finalizando...');

      // Recarregar policiais após atualizações
      if (retornos.length > 0) {
        const snap2 = await getDocs(q);
        const updated = snap2.docs.map(d => ({ id: d.id, ...d.data() })) as Policial[];
        setPoliciais(updated);
      } else {
        setPoliciais(policiaisData);
      }

      setRetornosLTS(retornos);
      setProgressValue(100);

      // Iniciar carregar os avisos confirmados do sessionStorage
      const confirmados = JSON.parse(sessionStorage.getItem('retornosLTSConfirmados') || '[]') as string[];
      const retornosFiltrados = retornos.filter(r => !confirmados.includes(r.policialId));
      setRetornosLTS(retornosFiltrados);

      // Fade out
      setTimeout(() => {
        setFadeOut(true);
        setTimeout(() => {
          setVerificando(false);
          setLoading(false);
        }, 500);
      }, 600);

    } catch (error) {
      console.error('Erro ao iniciar sistema:', error);
      setVerificando(false);
      setLoading(false);
    }
  };

  const verificarSituacoesLTS = async (policiaisData: Policial[], atestados: any[]): Promise<RetornoLTS[]> => {
    const hoje = new Date();
    const hojeStr = format(hoje, 'yyyy-MM-dd');
    const retornos: RetornoLTS[] = [];

    // Atestados vigentes (dataInicio <= hoje <= dataFim) com dias > 3
    const atestadosVigentes = atestados.filter(a => {
      if (!a.dataInicio || !a.dataFim || !a.dias || a.dias <= 3) return false;
      return a.dataInicio <= hojeStr && a.dataFim >= hojeStr;
    });

    // Mapa: policialId -> atestado vigente mais recente
    const mapaVigentes = new Map<string, any>();
    atestadosVigentes.forEach(a => {
      const existing = mapaVigentes.get(a.policialId);
      if (!existing || a.dataFim > existing.dataFim) {
        mapaVigentes.set(a.policialId, a);
      }
    });

    // ENTRAR EM LTS: policiais com atestado vigente >3 dias que não estão em LTS
    for (const [policialId, atestado] of mapaVigentes.entries()) {
      const pol = policiaisData.find(p => p.id === policialId);
      if (!pol) continue;
      const sit = (pol.SITUAÇÃO || '').toUpperCase();
      const jaEmLTS = isLTS(sit);
      if (!jaEmLTS) {
        try {
          await updateDoc(doc(db, 'policiais', policialId), {
            SITUAÇÃO: 'LICENÇA TRATAMENTO DE SAUDE',
            inicioSituacao: atestado.dataInicio,
            fimSituacao: atestado.dataFim,
            funcaoOrigem: pol['FUNÇÃO'] || '',
          });
          await addDoc(collection(db, 'assentamentos'), {
            policialId,
            tipo: 'mudanca_situacao',
            descricao: `Entrada automática em LTS - Atestado de ${atestado.dias} dias (CID: ${atestado.cid || 'N/I'})`,
            situacaoAnterior: pol.SITUAÇÃO,
            situacaoNova: 'LICENÇA TRATAMENTO DE SAUDE',
            funcaoAnterior: pol['FUNÇÃO'] || '',
            data: new Date().toISOString(),
            automatico: true,
          });
        } catch (e) {
          console.error('Erro ao colocar em LTS:', policialId, e);
        }
      }
    }

    // SAIR DE LTS: policiais em LTS sem atestado vigente
    const policiaisEmLTS = policiaisData.filter(p => isLTS(p.SITUAÇÃO));

    for (const pol of policiaisEmLTS) {
      const temVigente = mapaVigentes.has(pol.id);
      if (!temVigente) {
        // Buscar o último atestado desse policial para info do modal
        const ultimoAtestado = atestados
          .filter(a => a.policialId === pol.id && a.dias > 3)
          .sort((a: any, b: any) => (b.dataFim || '').localeCompare(a.dataFim || ''))[0];

        try {
          await updateDoc(doc(db, 'policiais', pol.id), {
            SITUAÇÃO: 'EM ATIVIDADE',
            inicioSituacao: '',
            fimSituacao: '',
            'FUNÇÃO': pol.funcaoOrigem || pol['FUNÇÃO'] || '',
          });
          await addDoc(collection(db, 'assentamentos'), {
            policialId: pol.id,
            tipo: 'mudanca_situacao',
            descricao: `Retorno automático de LTS para EM ATIVIDADE`,
            situacaoAnterior: pol.SITUAÇÃO,
            situacaoNova: 'EM ATIVIDADE',
            funcaoAnterior: pol['FUNÇÃO'] || '',
            funcaoNova: pol.funcaoOrigem || pol['FUNÇÃO'] || '',
            data: new Date().toISOString(),
            automatico: true,
          });

          retornos.push({
            policialId: pol.id,
            policialNome: pol.NOME || '',
            policialNomeGuerra: pol['NOME DE GUERRA1'] || pol.NOME || '',
            policialNumeral: pol.NUMERAL || pol.numeral || '',
            policialMatricula: pol.Matrícula || '',
            cid: ultimoAtestado?.cid || '',
            cidDescricao: ultimoAtestado?.cidDescricao || '',
            dataInicio: ultimoAtestado?.dataInicio || '',
            dataFim: ultimoAtestado?.dataFim || '',
          });
        } catch (e) {
          console.error('Erro ao retirar de LTS:', pol.id, e);
        }
      }
    }

    return retornos;
  };

  const handleConfirmarAviso = (policialId: string) => {
    const confirmados = JSON.parse(sessionStorage.getItem('retornosLTSConfirmados') || '[]') as string[];
    confirmados.push(policialId);
    sessionStorage.setItem('retornosLTSConfirmados', JSON.stringify(confirmados));
    setRetornosLTS(prev => prev.filter(r => r.policialId !== policialId));
  };

  const handleConfirmarTodos = () => {
    const confirmados = JSON.parse(sessionStorage.getItem('retornosLTSConfirmados') || '[]') as string[];
    retornosLTS.forEach(r => confirmados.push(r.policialId));
    sessionStorage.setItem('retornosLTSConfirmados', JSON.stringify(confirmados));
    setRetornosLTS([]);
  };

  // Loading com banner do regimento
  if (verificando || loading) {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
        <div className="flex flex-col items-center gap-6 p-8 max-w-md w-full">
          <img
            src={logoRegimento}
            alt="Logo do Regimento"
            className="w-48 h-48 object-contain rounded-xl shadow-2xl animate-pulse"
          />
          <div className="w-full space-y-3">
            <Progress value={progressValue} className="h-3 w-full" />
            <p className="text-white text-center text-sm font-medium animate-pulse">
              {progressText}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Dados do Dashboard
  const currentDate = new Date();
  const currentMonth = startOfMonth(currentDate);
  const endCurrentMonth = endOfMonth(currentDate);

  // Aniversariantes do mês
  const aniversariantes = policiais.filter(policial => {
    if (!policial['Data de Nascimento']) return false;
    try {
      const dataNasc = typeof policial['Data de Nascimento'] === 'number' 
        ? new Date((policial['Data de Nascimento'] - 25569) * 86400 * 1000)
        : new Date(policial['Data de Nascimento']);
      return dataNasc.getMonth() === currentDate.getMonth();
    } catch {
      return false;
    }
  });

  const policiaisFerias = policiais.filter(p => 
    p.SITUAÇÃO?.toLowerCase().includes('férias') || 
    p.SITUAÇÃO?.toLowerCase().includes('ferias')
  );

  const policiaisLicencaMedica = policiais.filter(p => isLTS(p.SITUAÇÃO));

  const proximosFimFerias = policiais.filter(p => {
    if (!p.fimFerias) return false;
    try {
      const fimFerias = parseISO(p.fimFerias);
      const em7Dias = addDays(currentDate, 7);
      return isWithinInterval(fimFerias, { start: currentDate, end: em7Dias });
    } catch {
      return false;
    }
  });

  const situacaoData = policiais.reduce((acc, policial) => {
    const situacao = policial.SITUAÇÃO || 'Não informado';
    acc[situacao] = (acc[situacao] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(situacaoData).map(([name, value]) => ({ name, value }));

  const postGradData = policiais.reduce((acc, policial) => {
    const postGrad = policial['Post/Grad'] || 'Não informado';
    acc[postGrad] = (acc[postGrad] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const barData = Object.entries(postGradData).map(([name, value]) => ({ name, value }));

  const fetchPoliciais = async () => {
    try {
      setLoading(true);
      const policiaisRef = collection(db, 'policiais');
      const q = query(policiaisRef, orderBy('NOME'));
      const querySnapshot = await getDocs(q);
      const policiaisData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Policial[];
      setPoliciais(policiaisData);
    } catch (error) {
      console.error('Erro ao buscar policiais:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gestão de Pessoas</h1>
            <p className="text-muted-foreground">Sistema completo de gestão do efetivo policial</p>
          </div>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          Total: {policiais.length} policiais
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap gap-1 h-auto w-full">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="ferias">Férias</TabsTrigger>
          <TabsTrigger value="efetivo">Efetivo</TabsTrigger>
          <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
          <TabsTrigger value="situacao">Situação</TabsTrigger>
          <TabsTrigger value="funcao">Função</TabsTrigger>
          <TabsTrigger value="transferidos">Transferidos</TabsTrigger>
          <TabsTrigger value="atestados">Atestados</TabsTrigger>
          <TabsTrigger value="estatisticas" className="flex items-center gap-1">
            <BarChart3 className="h-4 w-4" />
            Estatísticas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Policiais</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{policiais.length}</div>
                <p className="text-xs text-muted-foreground">Efetivo total</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">De Férias</CardTitle>
                <UserX className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{policiaisFerias.length}</div>
                <p className="text-xs text-muted-foreground">Atualmente de férias</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Licença Médica</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{policiaisLicencaMedica.length}</div>
                <p className="text-xs text-muted-foreground">Em tratamento de saúde</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aniversariantes</CardTitle>
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{aniversariantes.length}</div>
                <p className="text-xs text-muted-foreground">Neste mês</p>
              </CardContent>
            </Card>
          </div>

          {/* Alertas */}
          {proximosFimFerias.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-800">
                  <AlertTriangle className="h-5 w-5" />
                  Alertas - Fim de Férias
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {proximosFimFerias.map(policial => (
                    <div key={policial.id} className="flex justify-between items-center">
                      <span className="font-medium">{policial.NOME}</span>
                      <Badge variant="destructive">
                        Férias terminam em {policial.fimFerias ? format(parseISO(policial.fimFerias), 'dd/MM/yyyy') : 'Data não informada'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Situação</CardTitle>
                <CardDescription>Situação atual dos policiais</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={80} fill="#8884d8" dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Post/Graduação</CardTitle>
                <CardDescription>Efetivo por posto/graduação</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Aniversariantes do Mês */}
          {aniversariantes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Aniversariantes do Mês - {format(currentDate, 'MMMM', { locale: ptBR })}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {aniversariantes.map(policial => {
                    const dataNasc = typeof policial['Data de Nascimento'] === 'number'
                      ? new Date((policial['Data de Nascimento'] - 25569) * 86400 * 1000)
                      : new Date(policial['Data de Nascimento']);
                    return (
                      <div key={policial.id} className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                        <CalendarDays className="h-8 w-8 text-primary" />
                        <div>
                          <p className="font-medium">{policial.NOME}</p>
                          <p className="text-sm text-muted-foreground">{policial['Post/Grad']} - {format(dataNasc, 'dd/MM')}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ferias">
          <GestaoFeriasTab policiais={policiais} onUpdate={fetchPoliciais} />
        </TabsContent>
        <TabsContent value="efetivo">
          <EfetivoTab policiais={policiais} onUpdate={fetchPoliciais} />
        </TabsContent>
        <TabsContent value="movimentacoes">
          <MovimentacoesTab policiais={policiais} onUpdate={fetchPoliciais} />
        </TabsContent>
        <TabsContent value="situacao">
          <SituacaoTab policiais={policiais} onUpdate={fetchPoliciais} />
        </TabsContent>
        <TabsContent value="funcao">
          <FuncaoTab policiais={policiais} onUpdate={fetchPoliciais} />
        </TabsContent>
        <TabsContent value="transferidos">
          <TransferidosTab policiais={policiais} onUpdate={fetchPoliciais} />
        </TabsContent>
        <TabsContent value="atestados">
          <AtestadosMedicosTab
            policiais={policiais}
            onUpdate={fetchPoliciais}
            avisoRetornos={retornosLTS}
            onConfirmarAviso={handleConfirmarAviso}
            onConfirmarTodos={handleConfirmarTodos}
          />
        </TabsContent>
        <TabsContent value="estatisticas">
          <EstatisticasTab policiais={policiais} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GestãoPessoas;
