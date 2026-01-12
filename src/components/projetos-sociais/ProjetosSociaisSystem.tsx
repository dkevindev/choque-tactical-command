import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Shield } from 'lucide-react';
import GestorDashboard from './gestor/GestorDashboard';
import InstrutorDashboard from './instrutor/InstrutorDashboard';

const ProjetosSociaisSystem = () => {
  const [userType, setUserType] = useState<'gestor' | 'instrutor' | null>(null);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [policialLogado, setPolicialLogado] = useState<any>(null);

  useEffect(() => {
    verificarPermissoes();
  }, []);

  const verificarPermissoes = async () => {
    try {
      // Pegar policial do localStorage
      const policialData = localStorage.getItem('policialLogado');
      if (!policialData) {
        setLoading(false);
        return;
      }

      const policial = JSON.parse(policialData);
      setPolicialLogado(policial);

      // Verificar se tem acesso ao sistema
      if (!policial.acessos?.projetosSociais) {
        setLoading(false);
        return;
      }

      // Verificar se é gestor
      const gestorQuery = query(
        collection(db, 'projetos_gestores'),
        where('policialId', '==', policial.id),
        where('ativo', '==', true)
      );
      const gestorSnapshot = await getDocs(gestorQuery);

      if (!gestorSnapshot.empty) {
        // É gestor - buscar projetos gerenciados
        const projetosIds = gestorSnapshot.docs.map(doc => doc.data().projetoId);
        const projetosData = await buscarProjetos(projetosIds);
        setProjetos(projetosData);
        setUserType('gestor');
        setLoading(false);
        return;
      }

      // Verificar se é instrutor
      const instrutorQuery = query(
        collection(db, 'projetos_instrutores'),
        where('policialId', '==', policial.id),
        where('ativo', '==', true)
      );
      const instrutorSnapshot = await getDocs(instrutorQuery);

      if (!instrutorSnapshot.empty) {
        // É instrutor - buscar projetos associados
        const projetosIds = instrutorSnapshot.docs.map(doc => doc.data().projetoId);
        const projetosData = await buscarProjetos(projetosIds);
        setProjetos(projetosData);
        setUserType('instrutor');
        setLoading(false);
        return;
      }

      setLoading(false);
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      setLoading(false);
    }
  };

  const buscarProjetos = async (projetosIds: string[]) => {
    try {
      const projetosPromises = projetosIds.map(async (id) => {
        const projetosSnapshot = await getDocs(
          query(collection(db, 'projetos_sociais'), where('__name__', '==', id))
        );
        if (!projetosSnapshot.empty) {
          return {
            id: projetosSnapshot.docs[0].id,
            ...projetosSnapshot.docs[0].data()
          };
        }
        return null;
      });

      const projetos = await Promise.all(projetosPromises);
      return projetos.filter((p): p is any => p !== null && (p as any).ativo);
    } catch (error) {
      console.error('Erro ao buscar projetos:', error);
      return [];
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!userType || projetos.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Shield className="h-16 w-16 text-muted-foreground mx-auto" />
              <div>
                <h2 className="text-xl font-bold text-foreground">Acesso Negado</h2>
                <p className="text-muted-foreground mt-2">
                  Você não possui permissão para acessar o sistema de Projetos Sociais ou não está vinculado a nenhum projeto.
                </p>
                <p className="text-sm text-muted-foreground mt-4">
                  Entre em contato com o administrador para solicitar acesso.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return userType === 'gestor' ? (
    <GestorDashboard projetos={projetos} projetoInicial={projetos[0]} policialLogado={policialLogado} />
  ) : (
    <InstrutorDashboard projetos={projetos} policialLogado={policialLogado} />
  );
};

export default ProjetosSociaisSystem;
