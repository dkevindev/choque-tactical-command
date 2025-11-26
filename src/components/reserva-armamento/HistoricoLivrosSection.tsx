import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { History, BookOpen, ChevronDown, ChevronUp, Calendar, User, FileText } from "lucide-react";
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore';
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

const HistoricoLivrosSection = () => {
  const [livros, setLivros] = useState<LivroDiario[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLivro, setExpandedLivro] = useState<string | null>(null);

  useEffect(() => {
    const carregarHistorico = async () => {
      try {
        const querySnapshot = await getDocs(
          query(
            collection(db, 'livros_reserva_armamento'),
            orderBy('dataAbertura', 'desc'),
            limit(50)
          )
        );

        const livrosData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            dataAbertura: data.dataAbertura?.toDate?.() || new Date(),
            dataFechamento: data.dataFechamento?.toDate?.() || null,
            alteracoes: (data.alteracoes || []).map((a: any) => ({
              ...a,
              dataHora: a.dataHora?.toDate?.() || new Date()
            }))
          } as LivroDiario;
        });

        setLivros(livrosData);
      } catch (error) {
        console.error('Erro ao carregar histórico:', error);
      } finally {
        setLoading(false);
      }
    };

    carregarHistorico();
  }, []);

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
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Carregando histórico...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Histórico de Livros
        </CardTitle>
      </CardHeader>
      <CardContent>
        {livros.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum livro registrado</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {livros.map((livro) => (
              <Collapsible
                key={livro.id}
                open={expandedLivro === livro.id}
                onOpenChange={() => setExpandedLivro(
                  expandedLivro === livro.id ? null : livro.id
                )}
              >
                <div className="border rounded-lg">
                  <CollapsibleTrigger asChild>
                    <div className="p-3 cursor-pointer hover:bg-accent transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <BookOpen className={`h-5 w-5 ${
                            livro.status === 'aberto' ? 'text-green-600' : 'text-muted-foreground'
                          }`} />
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {formatarData(livro.dataAbertura)}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {livro.armeiroNome}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={livro.status === 'aberto' ? 'default' : 'secondary'}>
                            {livro.status === 'aberto' ? 'Aberto' : 'Fechado'}
                          </Badge>
                          {expandedLivro === livro.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="p-3 pt-0 border-t bg-muted/50 space-y-3">
                      {/* Detalhes do Livro */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Abertura:</span>
                          <p className="font-medium">
                            {formatarData(livro.dataAbertura)} às {formatarHora(livro.dataAbertura)}
                          </p>
                        </div>
                        {livro.dataFechamento && (
                          <div>
                            <span className="text-muted-foreground">Fechamento:</span>
                            <p className="font-medium">
                              {formatarData(livro.dataFechamento)} às {formatarHora(livro.dataFechamento)}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Estatísticas */}
                      <div className="flex gap-4">
                        <div className="px-3 py-2 bg-blue-50 dark:bg-blue-950/20 rounded text-center flex-1">
                          <div className="text-lg font-bold text-blue-600">{livro.totalCautelas || 0}</div>
                          <div className="text-xs text-muted-foreground">Cautelas</div>
                        </div>
                        <div className="px-3 py-2 bg-green-50 dark:bg-green-950/20 rounded text-center flex-1">
                          <div className="text-lg font-bold text-green-600">{livro.totalBaixas || 0}</div>
                          <div className="text-xs text-muted-foreground">Baixas</div>
                        </div>
                      </div>

                      {/* Alterações */}
                      {livro.alteracoes && livro.alteracoes.length > 0 && (
                        <div>
                          <p className="text-sm font-medium flex items-center gap-1 mb-2">
                            <FileText className="h-4 w-4" />
                            Alterações Registradas:
                          </p>
                          <div className="space-y-1">
                            {livro.alteracoes.map((alteracao, index) => (
                              <div 
                                key={index}
                                className="text-sm p-2 bg-background rounded border"
                              >
                                <p>{alteracao.descricao}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatarHora(alteracao.dataHora)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HistoricoLivrosSection;
