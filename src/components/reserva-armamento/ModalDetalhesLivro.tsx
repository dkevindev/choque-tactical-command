import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookOpen, Clock, CheckCircle, User, Calendar, FileText, AlertCircle } from "lucide-react";
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';

interface Alteracao {
  descricao: string;
  dataHora: Date;
}

interface LivroDiario {
  id: string;
  armeiroId: string;
  armeiroNome: string;
  dataAbertura: Date;
  dataFechamento?: Date;
  status: 'aberto' | 'fechado';
  alteracoes: Alteracao[];
  totalCautelas: number;
  totalBaixas: number;
}

interface MovimentacaoLivro {
  id: string;
  policialNome: string;
  policialNomeGuerra?: string;
  policialMatricula?: string;
  policialNumeral?: number;
  postoGrad?: string;
  materiais: Array<{
    nome: string;
    quantidade: number;
    numeroSerie?: string;
  }>;
  dataCautela: Date;
  horaCautela: string;
  dataBaixa?: Date;
  horaBaixa?: string;
  status: 'pendente' | 'entregue';
  sequencial: number;
}

interface ModalDetalhesLivroProps {
  livro: LivroDiario;
  open: boolean;
  onClose: () => void;
}

const formatarData = (date: Date) => {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const formatarHora = (date: Date) => {
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

const formatarAssinatura = (data: Date, hora: string) => {
  const dataFormatada = data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  return (
    <div className="text-xs text-muted-foreground leading-relaxed">
      <span className="font-medium text-foreground">Assinado digitalmente</span>
      <br />
      com senha pessoal e intransferível
      <br />
      às <span className="font-medium text-foreground">{hora}</span> do dia{' '}
      <span className="font-medium text-foreground">{dataFormatada}</span>
    </div>
  );
};

const ModalDetalhesLivro = ({ livro, open, onClose }: ModalDetalhesLivroProps) => {
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoLivro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !livro.id) return;

    const carregarMovimentacoes = async () => {
      setLoading(true);
      try {
        // Buscar cautelas do livro (sem ordenação por sequencial para evitar erro de índice)
        const querySnapshot = await getDocs(
          query(
            collection(db, 'cautelas_provisorias'),
            where('livroId', '==', livro.id)
          )
        );

        const movs = querySnapshot.docs.map(doc => {
          const data = doc.data();
          // Mapear status: 'ativo' -> 'pendente', 'baixado' -> 'entregue'
          let status: 'pendente' | 'entregue' = 'pendente';
          if (data.status === 'entregue' || data.status === 'baixado') {
            status = 'entregue';
          } else if (data.status === 'pendente' || data.status === 'ativo') {
            status = 'pendente';
          }
          
          return {
            id: doc.id,
            policialNome: data.policialNome || '',
            policialNomeGuerra: data.policialNomeGuerra,
            policialMatricula: data.policialMatricula,
            policialNumeral: data.policialNumeral,
            postoGrad: data.postoGrad,
            materiais: data.materiais || [],
            dataCautela: data.dataCautela?.toDate?.() || new Date(),
            horaCautela: data.horaCautela || '',
            dataBaixa: data.dataBaixa?.toDate?.() || null,
            horaBaixa: data.horaBaixa || null,
            status,
            sequencial: data.sequencial || 0
          } as MovimentacaoLivro;
        });
        
        // Ordenar por sequencial ou dataCautela localmente
        movs.sort((a, b) => {
          if (a.sequencial && b.sequencial) {
            return a.sequencial - b.sequencial;
          }
          return a.dataCautela.getTime() - b.dataCautela.getTime();
        });
        
        // Atribuir sequencial se não existir
        movs.forEach((mov, idx) => {
          if (!mov.sequencial) {
            mov.sequencial = idx + 1;
          }
        });

        setMovimentacoes(movs);
      } catch (error) {
        console.error('Erro ao carregar movimentações:', error);
      } finally {
        setLoading(false);
      }
    };

    carregarMovimentacoes();
  }, [open, livro.id]);

  const totalPendentes = movimentacoes.filter(m => m.status === 'pendente').length;
  const totalEntregues = movimentacoes.filter(m => m.status === 'entregue').length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="h-6 w-6" />
            Detalhes do Livro - {formatarData(livro.dataAbertura)}
          </DialogTitle>
          <DialogDescription className="sr-only">Movimentações e detalhes do livro diário</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Informações do Livro */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Armeiro</p>
                <p className="font-semibold">{livro.armeiroNome}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Abertura</p>
                <p className="font-semibold">{formatarData(livro.dataAbertura)} às {formatarHora(livro.dataAbertura)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {livro.dataFechamento ? (
                <>
                  <Calendar className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Fechamento</p>
                    <p className="font-semibold">{formatarData(livro.dataFechamento)} às {formatarHora(livro.dataFechamento)}</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant="default" className="bg-green-600">Livro Aberto</Badge>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Tabela de Movimentações */}
          <div className="border rounded-lg overflow-hidden">
            <div className="p-3 bg-muted border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Movimentações do Serviço
              </h3>
            </div>
            
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">
                Carregando movimentações...
              </div>
            ) : movimentacoes.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Nenhuma movimentação registrada neste livro
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead className="w-[50px] text-center">Nº</TableHead>
                      <TableHead className="min-w-[150px]">Policial</TableHead>
                      <TableHead className="min-w-[200px]">Materiais</TableHead>
                      <TableHead className="w-[100px] text-center">Status</TableHead>
                      <TableHead className="min-w-[180px] text-center">Assinatura Saída</TableHead>
                      <TableHead className="min-w-[180px] text-center">Assinatura Entrada</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimentacoes.map((mov) => (
                      <TableRow key={mov.id} className="bg-card hover:bg-accent/30">
                        <TableCell className="text-center font-mono font-bold">
                          {String(mov.sequencial).padStart(3, '0')}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {mov.postoGrad && `${mov.postoGrad} `}
                            {mov.policialNomeGuerra || mov.policialNome}
                          </div>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <div>Mat: {mov.policialMatricula}</div>
                            {mov.policialNumeral && (
                              <div>Numeral: {mov.policialNumeral}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {mov.materiais.map((mat, idx) => (
                              <div key={idx} className="text-sm">
                                <span className="font-medium">{mat.nome}</span>
                                <span className="text-muted-foreground">
                                  {' '}(Qtd: {mat.quantidade})
                                  {mat.numeroSerie && ` - Série: ${mat.numeroSerie}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {mov.status === 'pendente' ? (
                            <Badge variant="outline" className="bg-yellow-100 border-yellow-500 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                              <Clock className="h-3 w-3 mr-1" />
                              Pendente
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-100 border-green-500 text-green-700 dark:bg-green-900 dark:text-green-300">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Entregue
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {mov.dataCautela && mov.horaCautela && (
                            formatarAssinatura(mov.dataCautela, mov.horaCautela)
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {mov.dataBaixa && mov.horaBaixa ? (
                            formatarAssinatura(mov.dataBaixa, mov.horaBaixa)
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Resumo */}
          {movimentacoes.length > 0 && (
            <div className="flex gap-4 justify-end">
              <Badge variant="outline" className="bg-yellow-100 border-yellow-500 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                <Clock className="h-3 w-3 mr-1" />
                Pendentes: {totalPendentes}
              </Badge>
              <Badge variant="outline" className="bg-green-100 border-green-500 text-green-700 dark:bg-green-900 dark:text-green-300">
                <CheckCircle className="h-3 w-3 mr-1" />
                Entregues: {totalEntregues}
              </Badge>
            </div>
          )}

          {/* Alterações Registradas */}
          {livro.alteracoes && livro.alteracoes.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="p-3 bg-muted border-b">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Alterações Registradas ao Fechar o Livro
                </h3>
              </div>
              <div className="p-4 space-y-2">
                {livro.alteracoes.map((alteracao, index) => (
                  <div 
                    key={index}
                    className="p-3 bg-card rounded border"
                  >
                    <p className="text-sm">{alteracao.descricao}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatarData(alteracao.dataHora)} às {formatarHora(alteracao.dataHora)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModalDetalhesLivro;
