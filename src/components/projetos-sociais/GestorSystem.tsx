import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import GestorDashboard from './gestor/GestorDashboard';

export default function GestorSystem() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [temAcesso, setTemAcesso] = useState(false);
  const [projetosVinculados, setProjetosVinculados] = useState<any[]>([]);

  useEffect(() => {
    verificarAcesso();
  }, []);

  const verificarAcesso = async () => {
    try {
      const policialId = localStorage.getItem('usuarioId');
      if (!policialId) {
        navigate('/');
        return;
      }

      // Verificar se está vinculado como gestor
      const q = query(
        collection(db, 'projetos_gestores'),
        where('policialId', '==', policialId)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setTemAcesso(false);
        setLoading(false);
        return;
      }

      // Buscar projetos vinculados
      const projetos = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = doc.data();
          const projetoDoc = await getDocs(
            query(collection(db, 'projetos_sociais'), where('__name__', '==', data.projetoId))
          );
          const projetoData = projetoDoc.docs[0]?.data();
          return {
            id: data.projetoId,
            nome: projetoData?.nome || '',
            descricao: projetoData?.descricao || '',
            ativo: projetoData?.ativo || false
          };
        })
      );

      const projetosAtivos = projetos.filter(p => p.ativo);
      
      if (projetosAtivos.length > 0) {
        setProjetosVinculados(projetosAtivos);
        setTemAcesso(true);
      } else {
        setTemAcesso(false);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Erro ao verificar acesso:', error);
      setLoading(false);
    }
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

  return <GestorDashboard projetos={projetosVinculados} policialLogado={localStorage.getItem('usuarioId') || ''} />;
}
