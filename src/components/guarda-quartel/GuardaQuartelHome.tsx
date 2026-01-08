import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  History, 
  Plus, 
  ArrowLeft, 
  FileText,
  Clock,
  Edit
} from 'lucide-react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';

interface RascunhoLivro {
  id: string;
  data_relatorio: string;
  criadoEm?: any;
  status: string;
  oficialResponsavel?: {
    nome?: string;
    nomeGuerra?: string;
  };
}

const GuardaQuartelHome = () => {
  const navigate = useNavigate();
  const [rascunhos, setRascunhos] = useState<RascunhoLivro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarRascunhos = async () => {
      try {
        const querySnapshot = await getDocs(
          query(
            collection(db, 'livros_guarda'),
            where('status', '==', 'rascunho'),
            orderBy('criadoEm', 'desc')
          )
        );
        
        const lista = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as RascunhoLivro[];
        
        setRascunhos(lista);
      } catch (error) {
        console.error('Erro ao carregar rascunhos:', error);
      } finally {
        setLoading(false);
      }
    };

    carregarRascunhos();
  }, []);

  const formatarData = (dataString: string) => {
    if (!dataString) return '-';
    const [ano, mes, dia] = dataString.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/admin-dashboard')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Guarda do Quartel</h1>
              <p className="text-sm text-muted-foreground">Sistema de Livro da Guarda</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Cards de Ação Principal */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary"
            onClick={() => navigate('/guarda-quartel/novo')}
          >
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Plus className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-lg">Novo Livro da Guarda</CardTitle>
              <CardDescription>
                Iniciar um novo registro de guarda do quartel
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button className="w-full">
                <BookOpen className="h-4 w-4 mr-2" />
                Criar Novo Livro
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary"
            onClick={() => navigate('/guarda-quartel/historico')}
          >
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
                <History className="h-8 w-8 text-blue-500" />
              </div>
              <CardTitle className="text-lg">Histórico de Livros</CardTitle>
              <CardDescription>
                Consultar livros anteriores finalizados e rascunhos
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button variant="outline" className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                Ver Histórico
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Rascunhos em Andamento */}
        {!loading && rascunhos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-amber-500" />
                Rascunhos em Andamento
              </CardTitle>
              <CardDescription>
                Livros iniciados que ainda não foram finalizados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rascunhos.map((rascunho) => (
                  <div 
                    key={rascunho.id}
                    className="flex items-center justify-between p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center">
                        <Edit className="h-5 w-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          Livro de {formatarData(rascunho.data_relatorio)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {rascunho.oficialResponsavel?.nomeGuerra || rascunho.oficialResponsavel?.nome || 'Responsável não definido'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">
                        Rascunho
                      </Badge>
                      <Button 
                        size="sm"
                        onClick={() => navigate(`/guarda-quartel/novo?livroId=${rascunho.id}`)}
                      >
                        Continuar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {loading && (
          <div className="text-center py-8 text-muted-foreground">
            Carregando...
          </div>
        )}
      </main>
    </div>
  );
};

export default GuardaQuartelHome;
