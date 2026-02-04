import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Package, Clock, CheckCircle } from "lucide-react";
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import ModalRecebimentoPendente from './ModalRecebimentoPendente';

interface MaterialPendente {
  materialId: string;
  nome: string;
  categoria: string;
  quantidade: number;
  numeroSerie?: string;
}

interface CautelaPendente {
  id: string;
  livroId: string;
  policialId: string;
  policialNome: string;
  policialNomeGuerra?: string;
  policialMatricula: string;
  postoGrad?: string;
  materiais: MaterialPendente[];
  dataCautela: Date;
  horaCautela: string;
  sequencial: number;
}

interface LivroInfo {
  armeiroNome: string;
  dataAbertura: Date;
  dataFechamento?: Date;
}

interface PendenciasAnterioresSectionProps {
  livroAtualId: string;
  onRecebimentoRealizado: () => void;
  armeiroLogadoId?: string;
}

const PendenciasAnterioresSection = ({ livroAtualId, onRecebimentoRealizado, armeiroLogadoId }: PendenciasAnterioresSectionProps) => {
  const [pendencias, setPendencias] = useState<(CautelaPendente & { livroInfo?: LivroInfo })[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalRecebimento, setModalRecebimento] = useState(false);
  const [cautelaSelecionada, setCautelaSelecionada] = useState<CautelaPendente | null>(null);

  useEffect(() => {
    carregarPendencias();
  }, [livroAtualId]);

  const carregarPendencias = async () => {
    try {
      setLoading(true);
      
      // Buscar todas as cautelas pendentes de livros fechados
      const cautelasSnapshot = await getDocs(
        query(collection(db, 'cautelas_provisorias'), where('status', '==', 'pendente'))
      );

      const pendenciasTemp: (CautelaPendente & { livroInfo?: LivroInfo })[] = [];

      for (const docSnap of cautelasSnapshot.docs) {
        const data = docSnap.data();
        
        // Ignorar cautelas do livro atual
        if (data.livroId === livroAtualId) continue;

        // Verificar se o livro está fechado
        if (data.livroId) {
          const livroDoc = await getDoc(doc(db, 'livros_reserva_armamento', data.livroId));
          if (livroDoc.exists()) {
            const livroData = livroDoc.data();
            if (livroData.status === 'fechado') {
              pendenciasTemp.push({
                id: docSnap.id,
                livroId: data.livroId,
                policialId: data.policialId,
                policialNome: data.policialNome,
                policialNomeGuerra: data.policialNomeGuerra,
                policialMatricula: data.policialMatricula,
                postoGrad: data.postoGrad,
                materiais: data.materiais || [],
                dataCautela: data.dataCautela?.toDate?.() || new Date(),
                horaCautela: data.horaCautela || '',
                sequencial: data.sequencial || 0,
                livroInfo: {
                  armeiroNome: livroData.armeiroNome,
                  dataAbertura: livroData.dataAbertura?.toDate?.() || new Date(),
                  dataFechamento: livroData.dataFechamento?.toDate?.()
                }
              });
            }
          }
        }
      }

      setPendencias(pendenciasTemp);
    } catch (error) {
      console.error('Erro ao carregar pendências:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReceber = (cautela: CautelaPendente) => {
    setCautelaSelecionada(cautela);
    setModalRecebimento(true);
  };

  const handleRecebimentoConcluido = () => {
    setModalRecebimento(false);
    setCautelaSelecionada(null);
    carregarPendencias();
    onRecebimentoRealizado();
  };

  if (loading) {
    return null;
  }

  if (pendencias.length === 0) {
    return null;
  }

  const formatarData = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <>
      <Card className="border-yellow-500 bg-yellow-950/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-yellow-500">
            <AlertTriangle className="h-5 w-5" />
            Material Pendente de Devolução (Turno Anterior)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead className="w-[50px] text-center">Nº</TableHead>
                  <TableHead>Policial</TableHead>
                  <TableHead>Materiais</TableHead>
                  <TableHead className="text-center">Saída</TableHead>
                  <TableHead className="text-center">Turno</TableHead>
                  <TableHead className="w-[120px] text-center">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendencias.map((pendencia) => (
                  <TableRow key={pendencia.id} className="bg-card hover:bg-accent/30">
                    <TableCell className="text-center font-mono font-bold">
                      {String(pendencia.sequencial).padStart(3, '0')}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {pendencia.postoGrad && `${pendencia.postoGrad} `}
                        {pendencia.policialNomeGuerra || pendencia.policialNome}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Mat: {pendencia.policialMatricula}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {pendencia.materiais.map((mat, idx) => (
                          <div key={idx} className="text-sm flex items-center gap-1">
                            <Package className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">{mat.nome}</span>
                            <span className="text-muted-foreground">
                              (Qtd: {mat.quantidade})
                            </span>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="text-sm">
                        <div className="font-medium">{pendencia.horaCautela}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatarData(pendencia.dataCautela)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {pendencia.livroInfo && (
                        <div className="text-xs text-muted-foreground">
                          <div>Armeiro: {pendencia.livroInfo.armeiroNome}</div>
                          <div>{formatarData(pendencia.livroInfo.dataAbertura)}</div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        onClick={() => handleReceber(pendencia)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Receber
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ModalRecebimentoPendente
        open={modalRecebimento}
        onClose={() => {
          setModalRecebimento(false);
          setCautelaSelecionada(null);
        }}
        cautela={cautelaSelecionada}
        onRecebimentoConcluido={handleRecebimentoConcluido}
        armeiroLogadoId={armeiroLogadoId}
      />
    </>
  );
};

export default PendenciasAnterioresSection;
