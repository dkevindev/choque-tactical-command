import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, History } from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HistoricoPromocao {
  id: string;
  graduacaoAnterior: string;
  graduacaoNova: string;
  dataPromocao: string;
  publicacao: string;
  criadoEm: string;
}

interface HistoricoPromocoesTableProps {
  policialId: string;
}

const HistoricoPromocoesTable: React.FC<HistoricoPromocoesTableProps> = ({ policialId }) => {
  const [historico, setHistorico] = useState<HistoricoPromocao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistorico = async () => {
      try {
        const q = query(
          collection(db, 'historico_promocoes'),
          where('policialId', '==', policialId),
          orderBy('dataPromocao', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const historicoData: HistoricoPromocao[] = [];

        querySnapshot.forEach((doc) => {
          historicoData.push({
            id: doc.id,
            ...doc.data()
          } as HistoricoPromocao);
        });

        setHistorico(historicoData);
      } catch (error) {
        console.error('Erro ao carregar histórico de promoções:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHistorico();
  }, [policialId]);

  if (loading) {
    return <div className="p-4 text-center">Carregando histórico...</div>;
  }

  if (historico.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>Nenhuma promoção registrada no histórico</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Histórico de Promoções ({historico.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Graduação Anterior</TableHead>
                <TableHead></TableHead>
                <TableHead>Nova Graduação</TableHead>
                <TableHead>Publicação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historico.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {new Date(item.dataPromocao).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.graduacaoAnterior}</Badge>
                  </TableCell>
                  <TableCell>
                    <ArrowRight className="h-4 w-4" />
                  </TableCell>
                  <TableCell>
                    <Badge>{item.graduacaoNova}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {item.publicacao}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default HistoricoPromocoesTable;
