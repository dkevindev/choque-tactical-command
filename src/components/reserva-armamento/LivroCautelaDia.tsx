import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookOpen, Clock, CheckCircle, Plus, ArrowRightLeft } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

interface MovimentacaoDia {
  id: string;
  cautelaId?: string;
  policialId?: string;
  policialNome: string;
  policialNomeGuerra?: string;
  policialMatricula?: string;
  policialNumeral?: number;
  postoGrad?: string;
  materiais: Array<{
    materialId?: string;
    nome: string;
    quantidade: number;
    numeroSerie?: string;
    categoria?: string;
  }>;
  dataCautela: Date;
  horaCautela: string;
  dataBaixa?: Date;
  horaBaixa?: string;
  recebidoPorNome?: string;
  status: 'pendente' | 'entregue';
  sequencial: number;
}

interface LivroCautelaDiaProps {
  movimentacoes: MovimentacaoDia[];
  dataAbertura: Date;
  armeiroNome: string;
  onComplementarCautela?: (cautelaId: string, policialId: string, policialNome: string, materiais: any[]) => void;
  onTransferirMaterial?: (cautelaId: string, policialId: string, policialNome: string, materiais: any[]) => void;
}

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

const formatarDevolucao = (data: Date, hora: string, armeiroNome?: string) => {
  const dataFormatada = data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  return (
    <div className="text-xs text-muted-foreground leading-relaxed">
      <span className="font-medium text-green-600 dark:text-green-400">Devolvido</span>
      <br />
      ao armeiro <span className="font-medium text-foreground">{armeiroNome || 'N/A'}</span>
      <br />
      às <span className="font-medium text-foreground">{hora}</span> do dia{' '}
      <span className="font-medium text-foreground">{dataFormatada}</span>
    </div>
  );
};

const LivroCautelaDia = ({ movimentacoes, dataAbertura, armeiroNome, onComplementarCautela, onTransferirMaterial }: LivroCautelaDiaProps) => {
  if (movimentacoes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-5 w-5" />
            Livro de Cautela do Dia
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            {dataAbertura.toLocaleDateString('pt-BR')} - Armeiro: {armeiroNome}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma movimentação registrada ainda
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalPendentes = movimentacoes.filter(m => m.status === 'pendente').length;
  const totalEntregues = movimentacoes.filter(m => m.status === 'entregue').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="h-5 w-5" />
          Livro de Cautela do Dia
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          {dataAbertura.toLocaleDateString('pt-BR')} - Armeiro: {armeiroNome}
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead className="w-[50px] text-center">Nº</TableHead>
                  <TableHead className="min-w-[150px]">Policial</TableHead>
                  <TableHead className="min-w-[200px]">Materiais</TableHead>
                  <TableHead className="w-[100px] text-center">Status</TableHead>
                  <TableHead className="min-w-[180px] text-center">Assinatura Saída</TableHead>
                  <TableHead className="min-w-[180px] text-center">Devolução</TableHead>
                  {(onComplementarCautela || onTransferirMaterial) && <TableHead className="w-[100px] text-center">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimentacoes.map((mov) => (
                  <TableRow 
                    key={mov.id} 
                    className="bg-card hover:bg-accent/30"
                  >
                    <TableCell className="text-center font-mono font-bold">
                      {String(mov.sequencial).padStart(3, '0')}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {mov.postoGrad && !mov.policialNomeGuerra?.toUpperCase().startsWith(mov.postoGrad?.toUpperCase()) 
                          ? `${mov.postoGrad} ` 
                          : ''}
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
                        formatarDevolucao(mov.dataBaixa, mov.horaBaixa, mov.recebidoPorNome)
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    {(onComplementarCautela || onTransferirMaterial) && (
                      <TableCell className="text-center">
                        {mov.status === 'pendente' && mov.cautelaId && mov.policialId ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {onComplementarCautela && (
                                <DropdownMenuItem
                                  onClick={() => onComplementarCautela(
                                    mov.cautelaId!,
                                    mov.policialId!,
                                    `${mov.postoGrad || ''} ${mov.policialNomeGuerra || mov.policialNome}`.trim(),
                                    mov.materiais
                                  )}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Complementar
                                </DropdownMenuItem>
                              )}
                              {onTransferirMaterial && (
                                <DropdownMenuItem
                                  onClick={() => onTransferirMaterial(
                                    mov.cautelaId!,
                                    mov.policialId!,
                                    `${mov.postoGrad || ''} ${mov.policialNomeGuerra || mov.policialNome}`.trim(),
                                    mov.materiais
                                  )}
                                >
                                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                                  Transferir
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        
        {/* Resumo */}
        <div className="mt-4 flex gap-4 justify-end text-sm">
          <Badge variant="outline" className="bg-yellow-100 border-yellow-500 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
            <Clock className="h-3 w-3 mr-1" />
            Pendentes: {totalPendentes}
          </Badge>
          <Badge variant="outline" className="bg-green-100 border-green-500 text-green-700 dark:bg-green-900 dark:text-green-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            Entregues: {totalEntregues}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default LivroCautelaDia;
