import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/firebase';
import { buscarPolicialPorId, formatarNomePolicial } from '@/lib/policialUtils';

interface VisualizarAulasTabProps {
  projeto: any;
}

const VisualizarAulasTab = ({ projeto }: VisualizarAulasTabProps) => {
  const [aulas, setAulas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState<string | null>(null);

  useEffect(() => {
    carregarAulas();
  }, [projeto]);

  const carregarAulas = async () => {
    try {
      // Buscar todas as aulas sem orderBy para evitar índice composto
      const q = query(
        collection(db, 'projetos_aulas'),
        where('projetoId', '==', projeto.id)
      );
      
      const snapshot = await getDocs(q);
      const aulasData = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const aulaData = docSnap.data();
          
          // Buscar nomes dos instrutores usando função utilitária
          const instrutoresNomes = await Promise.all(
            (aulaData.instrutores || []).map(async (instrutorId: string) => {
              const policial = await buscarPolicialPorId(instrutorId);
              return formatarNomePolicial(policial);
            })
          );

          return {
            id: docSnap.id,
            ...aulaData,
            instrutoresNomes
          } as any;
        })
      );

      // Ordenar em memória
      aulasData.sort((a: any, b: any) => {
        const dataA = a.data?.toDate ? a.data.toDate() : new Date(a.data);
        const dataB = b.data?.toDate ? b.data.toDate() : new Date(b.data);
        return dataB.getTime() - dataA.getTime();
      });

      setAulas(aulasData);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar aulas:', error);
      setLoading(false);
    }
  };

  const formatarData = (data: any) => {
    try {
      const dataObj = data?.toDate ? data.toDate() : new Date(data);
      return format(dataObj, "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  const gerarListaFrequencia = async (aula: any) => {
    try {
      setGerando(aula.id);
      
      // Buscar dados completos dos instrutores usando função utilitária
      const instrutoresDetalhados = await Promise.all(
        (aula.instrutores || []).map(async (instrutorId: string) => {
          const policial = await buscarPolicialPorId(instrutorId);

          if (policial) {
            return {
              postGrad: policial['Post/Grad'] || policial.postGrad || '',
              nomeGuerra: policial['NOME DE GUERRA'] || policial.nomeGuerra || ''
            };
          }
          return { postGrad: '', nomeGuerra: 'Desconhecido' };
        })
      );

      // Buscar alunos presentes
      const alunosDetalhados = await Promise.all(
        (aula.alunosPresentes || []).map(async (alunoId: string) => {
          const alunoDoc = await getDoc(doc(db, 'projetos_alunos', alunoId));
          if (alunoDoc.exists()) {
            const alunoData = alunoDoc.data();
            return {
              nomeCompleto: alunoData.nomeCompleto || '',
              turno: alunoData.turno || ''
            };
          }
          return { nomeCompleto: 'Aluno não encontrado', turno: '' };
        })
      );

      // Buscar conteúdo da aula se houver
      let conteudo = '';
      if (aula.conteudoId) {
        const conteudoDoc = await getDoc(doc(db, 'projetos_conteudos', aula.conteudoId));
        if (conteudoDoc.exists()) {
          conteudo = conteudoDoc.data().descricao || '';
        }
      }

      const dataFormatada = formatarData(aula.data);
      const turnoTexto = aula.turnoNome || `Turno ${aula.turno}`;

      // Chamar cloud function
      const functions = getFunctions(app);
      const gerarDocx = httpsCallable(functions, 'gerarListaFrequenciaDocx');
      
      const resultado = await gerarDocx({
        instrutores: instrutoresDetalhados,
        alunos: alunosDetalhados,
        dataAula: dataFormatada,
        turno: turnoTexto,
        conteudo: conteudo
      });

      toast.success('Lista de frequência gerada com sucesso!');
      
      // Download será feito pela cloud function
      
    } catch (error) {
      console.error('Erro ao gerar lista:', error);
      toast.error('Erro ao gerar lista de frequência');
    } finally {
      setGerando(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Carregando aulas...
      </div>
    );
  }

  if (aulas.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma aula registrada ainda
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {aulas.map((aula) => (
        <Card key={aula.id} className="hover:border-primary transition-all">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-base">
                  {formatarData(aula.data)}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Turno {aula.turno}
                </p>
              </div>
              <Badge variant={aula.status === 'encerrada' ? 'default' : 'destructive'}>
                {aula.status === 'encerrada' ? 'Encerrada' : 'Em Andamento'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-1">Instrutores:</p>
              <div className="flex flex-wrap gap-1">
                {aula.instrutoresNomes.map((nome: string, idx: number) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {nome}
                  </Badge>
                ))}
              </div>
              {!aula.instrutoresCompleto && (
                <Badge variant="destructive" className="text-xs mt-1">
                  Instrutores incompletos
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {aula.alunosPresentes?.length || 0} presentes
                </span>
              </div>
            </div>

            {aula.status === 'encerrada' && (
              <>
                <p className="text-xs text-muted-foreground border-t pt-2">
                  ✓ 3 horas creditadas por instrutor
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => gerarListaFrequencia(aula)}
                  disabled={gerando === aula.id}
                >
                  {gerando === aula.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Gerar Lista de Frequência
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default VisualizarAulasTab;
