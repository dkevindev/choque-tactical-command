import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface RelatoriosGestorTabProps {
  projeto: any;
}

const RelatoriosGestorTab = ({ projeto }: RelatoriosGestorTabProps) => {
  const [instrutoresRelatorio, setInstrutoresRelatorio] = useState<any[]>([]);
  const [alunosFrequencia, setAlunosFrequencia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDados();
  }, [projeto]);

  const carregarDados = async () => {
    try {
      // Buscar todas as aulas do projeto
      const aulasQuery = query(
        collection(db, 'projetos_aulas'),
        where('projetoId', '==', projeto.id),
        where('status', '==', 'encerrada')
      );
      const aulasSnapshot = await getDocs(aulasQuery);
      const aulas = aulasSnapshot.docs.map(doc => doc.data());

      // Calcular relatório de instrutores
      const instrutoresQuery = query(
        collection(db, 'projetos_instrutores'),
        where('projetoId', '==', projeto.id),
        where('ativo', '==', true)
      );
      const instrutoresSnapshot = await getDocs(instrutoresQuery);
      
      const instrutoresData = await Promise.all(
        instrutoresSnapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          const policialSnap = await getDocs(
            query(collection(db, 'policiais'), where('__name__', '==', data.policialId))
          );

          if (!policialSnap.empty) {
            const policial = policialSnap.docs[0].data();
            
            // Contar aulas do instrutor
            const aulasInstrutor = aulas.filter(a => 
              a.instrutores?.includes(data.policialId)
            );

            const hoje = new Date();
            const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
            const aulasMes = aulasInstrutor.filter(a => {
              const dataAula = a.data?.toDate ? a.data.toDate() : new Date(a.data);
              return dataAula >= primeiroDiaMes;
            });

            // Mapear campos corretamente
            const postGrad = policial['Post/Grad'] || policial.postGrad || '';
            const numeral = policial.NUMERAL || policial.numeral || '';
            const nome = policial.NOME || policial.nome || policial['NOME DE GUERRA'] || policial.nomeGuerra || '';

            return {
              id: data.policialId,
              nome: `${postGrad} ${numeral} ${nome}`.trim(),
              aulasMes: aulasMes.length,
              horasMes: aulasMes.length * 3,
              horasTotal: aulasInstrutor.length * 3
            };
          }
          return null;
        })
      );

      setInstrutoresRelatorio(instrutoresData.filter(i => i !== null));

      // Calcular frequência dos alunos
      const alunosQuery = query(
        collection(db, 'projetos_alunos'),
        where('projetoId', '==', projeto.id),
        where('ativo', '==', true)
      );
      const alunosSnapshot = await getDocs(alunosQuery);
      
      const alunosData = alunosSnapshot.docs.map(doc => {
        const aluno = doc.data();
        const totalAulas = aulas.length;
        const aulasPresentes = aulas.filter(a => 
          a.alunosPresentes?.includes(doc.id)
        ).length;
        const percentual = totalAulas > 0 ? (aulasPresentes / totalAulas) * 100 : 0;

        return {
          id: doc.id,
          nomeCompleto: aluno.nomeCompleto,
          aulasParticipadas: aulasPresentes,
          faltas: totalAulas - aulasPresentes,
          percentualPresenca: percentual
        };
      });

      setAlunosFrequencia(alunosData.sort((a, b) => b.percentualPresenca - a.percentualPresenca));
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Carregando relatórios...
      </div>
    );
  }

  return (
    <Tabs defaultValue="instrutores" className="space-y-6">
      <TabsList>
        <TabsTrigger value="instrutores">Por Instrutor</TabsTrigger>
        <TabsTrigger value="frequencia">Frequência Alunos</TabsTrigger>
      </TabsList>

      <TabsContent value="instrutores">
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de Instrutores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{instrutoresRelatorio.length}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Horas Ministradas (Mês)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {instrutoresRelatorio.reduce((sum, i) => sum + i.horasMes, 0)}h
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Aulas Realizadas (Mês)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {instrutoresRelatorio.reduce((sum, i) => sum + i.aulasMes, 0)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Horas por Instrutor</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Instrutor</TableHead>
                    <TableHead>Aulas (Mês)</TableHead>
                    <TableHead>Horas (Mês)</TableHead>
                    <TableHead>Total Acumulado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instrutoresRelatorio.map((instrutor) => (
                    <TableRow key={instrutor.id}>
                      <TableCell className="font-medium">{instrutor.nome}</TableCell>
                      <TableCell>{instrutor.aulasMes}</TableCell>
                      <TableCell>{instrutor.horasMes}h</TableCell>
                      <TableCell className="font-bold">{instrutor.horasTotal}h</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="frequencia">
        <Card>
          <CardHeader>
            <CardTitle>Frequência dos Alunos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Presença (%)</TableHead>
                  <TableHead>Aulas Participadas</TableHead>
                  <TableHead>Faltas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alunosFrequencia.map((aluno) => (
                  <TableRow key={aluno.id}>
                    <TableCell className="font-medium">{aluno.nomeCompleto}</TableCell>
                    <TableCell>
                      <span className={`font-medium ${
                        aluno.percentualPresenca >= 80 ? 'text-green-600' :
                        aluno.percentualPresenca >= 60 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {aluno.percentualPresenca.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell>{aluno.aulasParticipadas}</TableCell>
                    <TableCell>{aluno.faltas}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default RelatoriosGestorTab;
