import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, CalendarDays, UserMinus, FileHeart, BarChart3, Shield, Crosshair, GraduationCap } from 'lucide-react';
import EfetivoSection from './EfetivoSection';
import FeriasSection from './FeriasSection';
import TransferidosSection from './TransferidosSection';
import AtestadosSection from './AtestadosSection';
import EstatisticasSection from './EstatisticasSection';
import ArmamentosSection from './ArmamentosSection';
import MaterialNaRuaSection from './MaterialNaRuaSection';
import ProjetosSociaisSection from './ProjetosSociaisSection';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';

const ComandanteDashboard = () => {
  const navigate = useNavigate();
  const [policiais, setPoliciais] = useState<any[]>([]);
  const [transferidos, setTransferidos] = useState<any[]>([]);
  const [atestados, setAtestados] = useState<any[]>([]);
  const [materiais, setMateriais] = useState<any[]>([]);
  const [cautelas, setCautelas] = useState<any[]>([]);
  const [livros, setLivros] = useState<any[]>([]);
  const [aulas, setAulas] = useState<any[]>([]);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregar = async () => {
      try {
        const [polSnap, transSnap, atestSnap, matSnap, cautSnap, livroSnap, aulasSnap, projSnap] = await Promise.all([
          getDocs(collection(db, 'policiais')),
          getDocs(collection(db, 'policiais_transferidos')),
          getDocs(collection(db, 'atestados')),
          getDocs(collection(db, 'materiais_belicos')),
          getDocs(collection(db, 'cautelas')),
          getDocs(collection(db, 'livros_cautela')),
          getDocs(collection(db, 'aulas')),
          getDocs(collection(db, 'projetos')),
        ]);
        setPoliciais(polSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setTransferidos(transSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setAtestados(atestSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setMateriais(matSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setCautelas(cautSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLivros(livroSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setAulas(aulasSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setProjetos(projSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error('Erro ao carregar dados:', e);
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Carregando dados...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-800 to-violet-800 border-b border-indigo-600 px-6 py-4">
        <div className="flex items-center justify-between max-w-[1600px] mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-white hover:bg-white/10">
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-wide">GESTÃO - COMANDANTES</h1>
              <p className="text-indigo-200 text-sm">Painel de Inteligência Operacional • RPMONT</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1600px] mx-auto p-6">
        <Tabs defaultValue="efetivo" className="space-y-6">
          <TabsList className="bg-slate-800/80 border border-indigo-500/30 p-1 flex flex-wrap gap-1 h-auto">
            <TabsTrigger value="efetivo" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-300 gap-2">
              <Users className="h-4 w-4" /> Efetivo
            </TabsTrigger>
            <TabsTrigger value="ferias" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-300 gap-2">
              <CalendarDays className="h-4 w-4" /> Férias
            </TabsTrigger>
            <TabsTrigger value="transferidos" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-300 gap-2">
              <UserMinus className="h-4 w-4" /> Transferidos
            </TabsTrigger>
            <TabsTrigger value="atestados" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-300 gap-2">
              <FileHeart className="h-4 w-4" /> Atestados
            </TabsTrigger>
            <TabsTrigger value="estatisticas" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-300 gap-2">
              <BarChart3 className="h-4 w-4" /> Estatísticas
            </TabsTrigger>
            <TabsTrigger value="armamentos" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-300 gap-2">
              <Crosshair className="h-4 w-4" /> Armamentos
            </TabsTrigger>
            <TabsTrigger value="material-rua" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-300 gap-2">
              <Shield className="h-4 w-4" /> Material na Rua
            </TabsTrigger>
            <TabsTrigger value="projetos" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-300 gap-2">
              <GraduationCap className="h-4 w-4" /> Projetos Sociais
            </TabsTrigger>
          </TabsList>

          <TabsContent value="efetivo"><EfetivoSection policiais={policiais} /></TabsContent>
          <TabsContent value="ferias"><FeriasSection policiais={policiais} /></TabsContent>
          <TabsContent value="transferidos"><TransferidosSection transferidos={transferidos} /></TabsContent>
          <TabsContent value="atestados"><AtestadosSection policiais={policiais} atestados={atestados} /></TabsContent>
          <TabsContent value="estatisticas"><EstatisticasSection policiais={policiais} atestados={atestados} /></TabsContent>
          <TabsContent value="armamentos"><ArmamentosSection materiais={materiais} cautelas={cautelas} /></TabsContent>
          <TabsContent value="material-rua"><MaterialNaRuaSection livros={livros} cautelas={cautelas} materiais={materiais} /></TabsContent>
          <TabsContent value="projetos"><ProjetosSociaisSection aulas={aulas} projetos={projetos} policiais={policiais} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ComandanteDashboard;
