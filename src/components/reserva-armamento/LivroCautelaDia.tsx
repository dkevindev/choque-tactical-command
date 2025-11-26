import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookOpen, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

interface MovimentacaoDia {
  id: string;
  tipo: 'cautela' | 'baixa';
  policialNome: string;
  policialMatricula?: string;
  postoGrad?: string;
  materiais: Array<{
    nome: string;
    quantidade: number;
    numeroSerie?: string;
    categoria?: string;
  }>;
  dataCautela?: Date;
  dataBaixa?: Date;
  hora: string;
  sequencial: number;
}

interface LivroCautelaDiaProps {
  movimentacoes: MovimentacaoDia[];
  dataAbertura: Date;
  armeiroNome: string;
}

const LivroCautelaDia = ({ movimentacoes, dataAbertura, armeiroNome }: LivroCautelaDiaProps) => {
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
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[60px] text-center">Nº</TableHead>
                <TableHead className="w-[80px] text-center">Hora</TableHead>
                <TableHead className="w-[100px] text-center">Tipo</TableHead>
                <TableHead>Policial</TableHead>
                <TableHead>Materiais</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimentacoes.map((mov) => (
                <TableRow key={mov.id} className={mov.tipo === 'cautela' ? 'bg-green-50/50 dark:bg-green-950/20' : 'bg-blue-50/50 dark:bg-blue-950/20'}>
                  <TableCell className="text-center font-mono font-bold">
                    {String(mov.sequencial).padStart(3, '0')}
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm">
                    {mov.hora}
                  </TableCell>
                  <TableCell className="text-center">
                    {mov.tipo === 'cautela' ? (
                      <Badge className="bg-green-600 hover:bg-green-700 gap-1">
                        <ArrowUpCircle className="h-3 w-3" />
                        Saída
                      </Badge>
                    ) : (
                      <Badge className="bg-blue-600 hover:bg-blue-700 gap-1">
                        <ArrowDownCircle className="h-3 w-3" />
                        Entrada
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{mov.policialNome}</div>
                    <div className="text-xs text-muted-foreground">
                      {mov.postoGrad && `${mov.postoGrad} - `}
                      {mov.policialMatricula && `Mat: ${mov.policialMatricula}`}
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {/* Resumo */}
        <div className="mt-4 flex gap-4 justify-end text-sm">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-50 dark:bg-green-950/20 border-green-500">
              <ArrowUpCircle className="h-3 w-3 mr-1" />
              Saídas: {movimentacoes.filter(m => m.tipo === 'cautela').length}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/20 border-blue-500">
              <ArrowDownCircle className="h-3 w-3 mr-1" />
              Entradas: {movimentacoes.filter(m => m.tipo === 'baixa').length}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LivroCautelaDia;
