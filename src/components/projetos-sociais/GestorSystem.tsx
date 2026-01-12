import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, FolderOpen, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GestorDashboard from './gestor/GestorDashboard';

export default function GestorSystem() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [temAcesso, setTemAcesso] = useState(false);
  const [projetosVinculados, setProjetosVinculados] = useState<any[]>([]);
  const [projetoSelecionado, setProjetoSelecionado] = useState<any | null>(null);

  useEffect(() => {
    verificarAcesso();
  }, []);

  const verificarAcesso = async () => {
    try {
      const policialId = localStorage.getItem('usuarioId');
      
      if (!policialId) {
        console.log('Nenhum policialId encontrado no localStorage');
        navigate('/');
        return;
      }

      console.log('Verificando acesso para policialId:', policialId);

      // Verificar se está vinculado como gestor
      const q = query(
        collection(db, 'projetos_gestores'),
        where('policialId', '==', policialId)
      );
      const snapshot = await getDocs(q);

      console.log('Vínculos de gestor encontrados:', snapshot.size);

      if (snapshot.empty) {
        console.log('Usuário não está vinculado como gestor');
        setTemAcesso(false);
        setLoading(false);
        return;
      }

      // Buscar projetos vinculados
      const projetos = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = doc.data();
          console.log('Processando vínculo:', data);
          const projetoSnapshot = await getDocs(
            query(collection(db, 'projetos_sociais'), where('__name__', '==', data.projetoId))
          );
          
          if (projetoSnapshot.empty) {
            console.log('Projeto não encontrado:', data.projetoId);
            return null;
          }

          const projetoData = projetoSnapshot.docs[0]?.data();
          console.log('Dados do projeto:', projetoData);
          
          return {
            id: data.projetoId,
            nome: projetoData?.nome || '',
            descricao: projetoData?.descricao || '',
            ativo: projetoData?.ativo || false
          };
        })
      );

      const projetosValidos = projetos.filter(p => p !== null);
      const projetosAtivos = projetosValidos.filter(p => p.ativo);
      
      console.log('Projetos válidos:', projetosValidos.length);
      console.log('Projetos ativos:', projetosAtivos.length);
      
      if (projetosAtivos.length > 0) {
        setProjetosVinculados(projetosAtivos);
        setTemAcesso(true);
        
        // Se tiver apenas 1 projeto, seleciona automaticamente
        if (projetosAtivos.length === 1) {
          setProjetoSelecionado(projetosAtivos[0]);
        }
      } else {
        setTemAcesso(false);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Erro ao verificar acesso:', error);
      setLoading(false);
    }
  };

  const handleSelecionarProjeto = (projeto: any) => {
    setProjetoSelecionado(projeto);
  };

  const handleVoltarSelecao = () => {
    setProjetoSelecionado(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Verificando acesso...</p>
      </div>
    );
  }

  if (!temAcesso) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="flex mb-4 justify-center">
              <AlertCircle className="h-12 w-12 text-teal-500" />
            </div>
            <h2 className="text-xl font-bold text-center mb-2">Acesso Negado</h2>
            <p className="text-center text-muted-foreground">
              Você não está vinculado como gestor de nenhum projeto ativo.
            </p>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Entre em contato com o administrador para solicitar acesso.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se tem múltiplos projetos e nenhum selecionado, mostra tela de seleção
  if (projetosVinculados.length > 1 && !projetoSelecionado) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <header className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-foreground">
              Selecione o Projeto
            </h1>
            <p className="text-muted-foreground mt-2">
              Você é gestor de {projetosVinculados.length} projetos. Selecione qual deseja acessar.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projetosVinculados.map((projeto) => (
              <Card 
                key={projeto.id} 
                className="cursor-pointer hover:border-primary transition-colors group"
                onClick={() => handleSelecionarProjeto(projeto)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <FolderOpen className="h-6 w-6 text-primary" />
                    {projeto.nome}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    {projeto.descricao || 'Sem descrição'}
                  </p>
                  <Button className="w-full group-hover:bg-primary">
                    Acessar Projeto
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <GestorDashboard 
      projetos={projetosVinculados} 
      projetoInicial={projetoSelecionado || projetosVinculados[0]}
      policialLogado={localStorage.getItem('usuarioId') || ''} 
      onVoltarSelecao={projetosVinculados.length > 1 ? handleVoltarSelecao : undefined}
    />
  );
}
