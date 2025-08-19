import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Power, PowerOff, User, Clock, Package, BookOpen, Target, Plus, Minus, CheckCircle, AlertCircle, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Policial {
  id: string;
  matricula: string;
  nome: string;
  posto_graduacao: string;
  ativo: boolean;
}

interface Material {
  id: string;
  nome: string;
  categoria: string;
  subcategoria?: string;
  quantidade_estoque: number;
  disponivel: boolean;
  numero_serie?: string;
  calibre?: string;
  fabricante?: string;
}

interface MaterialSelecionado {
  material: Material;
  quantidade: number;
}

interface SessaoAtendimento {
  id: string;
  policial: Policial;
  materiais: MaterialSelecionado[];
  status: 'iniciado' | 'enviado' | 'finalizado';
  created_at: string;
}

interface ReservaAtiva {
  id: string;
  policial: Policial;
  materiais: MaterialSelecionado[];
  status: string;
  created_at: string;
}

interface CautelaAtiva {
  id: string;
  policial: Policial;
  material: Material;
  quantidade: number;
  data_cautela: string;
}

const ArmeiroInterface = () => {
  const [livroDiarioAberto, setLivroDiarioAberto] = useState(false);
  const [armeiro] = useState("ARMEIRO001");
  const [loading, setLoading] = useState(false);
  
  const [policialSelecionado, setPolicialSelecionado] = useState<Policial | null>(null);
  const [materiaisDisponiveis, setMateriaisDisponiveis] = useState<Material[]>([]);
  const [materiaisSelecionados, setMateriaisSelecionados] = useState<MaterialSelecionado[]>([]);
  const [searchPolicial, setSearchPolicial] = useState("");
  const [searchMaterial, setSearchMaterial] = useState("");
  const [policiais, setPoliciais] = useState<Policial[]>([]);
  
  const [sessoesAtendimento, setSessoesAtendimento] = useState<SessaoAtendimento[]>([]);
  const [reservasAtivas, setReservasAtivas] = useState<ReservaAtiva[]>([]);
  const [cautelasAtivas, setCautelasAtivas] = useState<CautelaAtiva[]>([]);
  
  const { toast } = useToast();

  const verificarStatusLivro = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('livro_diario')
        .select('*')
        .eq('status', 'aberto')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      setLivroDiarioAberto(data && data.length > 0);
    } catch (error) {
      console.error('Erro ao verificar status do livro:', error);
    }
  }, []);

  const carregarDados = useCallback(async () => {
    await Promise.all([
      carregarPoliciais(),
      carregarMateriaisDisponiveis(),
      carregarReservasAtivas(),
      carregarCautelasAtivas()
    ]);
  }, []);

  const carregarPoliciais = async () => {
    try {
      const { data, error } = await supabase
        .from('policiais')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setPoliciais(data || []);
    } catch (error) {
      console.error('Erro ao carregar policiais:', error);
    }
  };

  const carregarMateriaisDisponiveis = async () => {
    try {
      const { data, error } = await supabase
        .from('materiais_belicos')
        .select('*')
        .eq('disponivel', true)
        .gt('quantidade_estoque', 0)
        .order('categoria', { ascending: true });

      if (error) throw error;
      setMateriaisDisponiveis(data || []);
    } catch (error) {
      console.error('Erro ao carregar materiais:', error);
    }
  };

  const carregarReservasAtivas = async () => {
    try {
      const { data, error } = await supabase
        .from('reservas_ativas')
        .select(`
          *,
          policial:policiais(*)
        `)
        .eq('status', 'pendente')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const reservas = data?.map(reserva => ({
        id: reserva.id,
        policial: reserva.policial,
        materiais: JSON.parse(String(reserva.materiais || '[]')),
        status: reserva.status,
        created_at: reserva.created_at
      })) || [];
      
      setReservasAtivas(reservas);
    } catch (error) {
      console.error('Erro ao carregar reservas:', error);
    }
  };

  const carregarCautelasAtivas = async () => {
    try {
      const { data, error } = await supabase
        .from('cautelas_ativas')
        .select(`
          *,
          policial:policiais(*),
          material:materiais_belicos(*)
        `)
        .order('data_cautela', { ascending: false });

      if (error) throw error;
      
      const cautelas = data?.map(cautela => ({
        id: cautela.id,
        policial: cautela.policial,
        material: cautela.material,
        quantidade: cautela.quantidade,
        data_cautela: cautela.data_cautela
      })) || [];
      
      setCautelasAtivas(cautelas);
    } catch (error) {
      console.error('Erro ao carregar cautelas:', error);
    }
  };

  const abrirLivroDiario = async () => {
    try {
      setLoading(true);
      
      await supabase
        .from('livro_diario')
        .update({ 
          status: 'fechado', 
          data_fechamento: new Date().toISOString() 
        })
        .eq('status', 'aberto');

      const { error } = await supabase
        .from('livro_diario')
        .insert({
          armeiro_id: armeiro,
          status: 'aberto',
          data_abertura: new Date().toISOString()
        });

      if (error) throw error;

      setLivroDiarioAberto(true);
      toast({
        title: "Livro Diário Aberto",
        description: "O livro diário foi aberto com sucesso.",
      });

      await carregarDados();
    } catch (error) {
      console.error('Erro ao abrir livro:', error);
      toast({
        title: "Erro",
        description: "Erro ao abrir o livro diário.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fecharLivroDiario = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('livro_diario')
        .update({ 
          status: 'fechado', 
          data_fechamento: new Date().toISOString() 
        })
        .eq('status', 'aberto');

      if (error) throw error;

      setLivroDiarioAberto(false);
      setPolicialSelecionado(null);
      setMateriaisSelecionados([]);
      
      toast({
        title: "Livro Diário Fechado",
        description: "O livro diário foi fechado com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao fechar livro:', error);
      toast({
        title: "Erro",
        description: "Erro ao fechar o livro diário.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const policiaisFiltrados = policiais.filter(p =>
    p.nome.toLowerCase().includes(searchPolicial.toLowerCase()) ||
    p.matricula.includes(searchPolicial)
  );

  const materiaisFiltrados = materiaisDisponiveis.filter(m =>
    m.nome.toLowerCase().includes(searchMaterial.toLowerCase()) ||
    m.categoria.toLowerCase().includes(searchMaterial.toLowerCase())
  );

  useEffect(() => {
    verificarStatusLivro();
    carregarDados();

    const channel = supabase
      .channel('reservas-updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'reservas_ativas' 
      }, () => {
        carregarReservasAtivas();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [verificarStatusLivro, carregarDados]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {livroDiarioAberto ? (
              <Power className="h-5 w-5 text-green-500" />
            ) : (
              <PowerOff className="h-5 w-5 text-red-500" />
            )}
            Controle do Livro Diário
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge variant={livroDiarioAberto ? "default" : "secondary"}>
              {livroDiarioAberto ? "ABERTO" : "FECHADO"}
            </Badge>
            
            {!livroDiarioAberto ? (
              <Button 
                onClick={abrirLivroDiario}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                Abrir Livro Diário
              </Button>
            ) : (
              <Button 
                onClick={fecharLivroDiario}
                disabled={loading}
                variant="destructive"
              >
                Fechar Livro Diário
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {livroDiarioAberto && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Reservas Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {reservasAtivas.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Policiais Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {policiais.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                Materiais Cautelados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {cautelasAtivas.reduce((total, cautela) => total + cautela.quantidade, 0)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ArmeiroInterface;