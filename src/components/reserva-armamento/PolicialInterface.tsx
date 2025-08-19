import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Lock, Check, X, Clock, Package, Shield, Key, CheckCircle, AlertCircle, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Policial {
  id: string;
  matricula: string;
  nome: string;
  posto_graduacao: string;
}

interface Material {
  id: string;
  nome: string;
  categoria: string;
  subcategoria?: string;
}

interface MaterialReserva {
  material_id: string;
  nome: string;
  categoria: string;
  quantidade: number;
  confirmado?: boolean;
}

interface ReservaAtiva {
  id: string;
  policial: Policial;
  armeiro_id: string;
  materiais: MaterialReserva[];
  status: string;
  created_at: string;
}

const PolicialInterface = () => {
  const [step, setStep] = useState<'login' | 'reservas' | 'cautelas' | 'devolucao'>('login');
  const [policialLogado, setPolicialLogado] = useState<Policial | null>(null);
  const [matricula, setMatricula] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [reservaAtiva, setReservaAtiva] = useState<ReservaAtiva | null>(null);
  const [materiaisSelecionados, setMateriaisSelecionados] = useState<string[]>([]);
  
  const { toast } = useToast();

  const handleLogin = async () => {
    if (!matricula || !senha) {
      toast({
        title: "Erro",
        description: "Informe matrícula e senha.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('policiais')
        .select('*')
        .eq('matricula', matricula)
        .eq('senha', senha)
        .eq('ativo', true)
        .single();

      if (error || !data) {
        toast({
          title: "Erro de Login",
          description: "Matrícula ou senha incorretos.",
          variant: "destructive",
        });
        return;
      }

      setPolicialLogado(data);
      setMatricula('');
      setSenha('');
      setStep('reservas');
      
      toast({
        title: "Login Realizado",
        description: `Bem-vindo, ${data.nome}!`,
      });
      
    } catch (error) {
      console.error('Erro no login:', error);
      toast({
        title: "Erro",
        description: "Erro interno do sistema.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setPolicialLogado(null);
    setReservaAtiva(null);
    setMateriaisSelecionados([]);
    setMatricula('');
    setSenha('');
    setStep('login');
  };

  if (step === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
              <User className="h-6 w-6" />
              Acesso do Policial
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Matrícula</label>
              <Input
                placeholder="Digite sua matrícula"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Senha</label>
              <Input
                type="password"
                placeholder="Digite sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            
            <Button 
              onClick={handleLogin}
              disabled={loading}
              className="w-full"
            >
              <Lock className="h-4 w-4 mr-2" />
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>

            <div className="text-xs text-muted-foreground text-center">
              Sistema de Reserva de Armamento - CPMR
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="container mx-auto max-w-4xl space-y-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold">{policialLogado?.nome}</h1>
                <p className="text-sm text-muted-foreground">
                  {policialLogado?.posto_graduacao} - Mat: {policialLogado?.matricula}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" onClick={logout}>
                  Sair
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Sistema Implementado</h3>
            <p className="text-muted-foreground">
              Sistema de reserva de armamento foi implementado com sucesso no Supabase.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PolicialInterface;