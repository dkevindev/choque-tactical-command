import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, BookOpen, Calendar, User, FileDown, Loader2 } from "lucide-react";
import { collection, query, orderBy, getDocs, limit, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from "sonner";
import ModalDetalhesLivro from './ModalDetalhesLivro';

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
  const [livroSelecionado, setLivroSelecionado] = useState<LivroDiario | null>(null);
  const [exportando, setExportando] = useState<string | null>(null);

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

  const exportarLivro = async (livro: LivroDiario, e: React.MouseEvent) => {
    e.stopPropagation();
    setExportando(livro.id);
    
    try {
      // Buscar movimentações do livro
      const querySnapshot = await getDocs(
        query(
          collection(db, 'cautelas_provisorias'),
          where('livroId', '==', livro.id)
        )
      );

      const movimentacoes = querySnapshot.docs.map(doc => {
        const data = doc.data();
        let status: 'pendente' | 'entregue' = 'pendente';
        if (data.status === 'entregue' || data.status === 'baixado') {
          status = 'entregue';
        }
        
        return {
          policialNome: data.policialNome || '',
          policialNomeGuerra: data.policialNomeGuerra,
          policialMatricula: data.policialMatricula,
          postoGrad: data.postoGrad,
          materiais: data.materiais || [],
          dataCautela: data.dataCautela?.toDate?.()?.toISOString() || new Date().toISOString(),
          horaCautela: data.horaCautela || '',
          dataBaixa: data.dataBaixa?.toDate?.()?.toISOString() || null,
          horaBaixa: data.horaBaixa || null,
          status,
          sequencial: data.sequencial || 0
        };
      });

      // Ordenar por sequencial
      movimentacoes.sort((a, b) => a.sequencial - b.sequencial);

      // Preparar dados para o endpoint
      const dados = {
        armeiroNome: livro.armeiroNome,
        dataAbertura: livro.dataAbertura.toISOString(),
        dataFechamento: livro.dataFechamento?.toISOString() || null,
        movimentacoes,
        alteracoes: livro.alteracoes.map(a => ({
          descricao: a.descricao,
          dataHora: a.dataHora.toISOString()
        })),
        armeiroResponsavel: livro.armeiroNome
      };

      // Chamar Firebase Function
      const response = await fetch('https://gerarlivroreservaarmamentodocx-owvlmrnsjq-uc.a.run.app', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dados)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Erro ao gerar documento');
      }

      // Download do arquivo
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Livro-Reserva-${formatarData(livro.dataAbertura).replace(/\//g, '-')}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Documento exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar livro:', error);
      toast.error('Erro ao exportar documento');
    } finally {
      setExportando(null);
    }
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
    <>
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
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {livros.map((livro) => (
                <div
                  key={livro.id}
                  onClick={() => setLivroSelecionado(livro)}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <BookOpen className={`h-5 w-5 ${
                        livro.status === 'aberto' ? 'text-green-500' : 'text-muted-foreground'
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
                    <div className="flex items-center gap-3">
                      <div className="text-right text-sm">
                        <div className="text-muted-foreground">
                          {livro.totalCautelas || 0} cautelas
                        </div>
                        <div className="text-muted-foreground">
                          {livro.totalBaixas || 0} baixas
                        </div>
                      </div>
                      <Badge variant={livro.status === 'aberto' ? 'default' : 'secondary'}>
                        {livro.status === 'aberto' ? 'Aberto' : 'Fechado'}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => exportarLivro(livro, e)}
                        disabled={exportando === livro.id}
                        className="ml-2"
                      >
                        {exportando === livro.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {livroSelecionado && (
        <ModalDetalhesLivro
          livro={livroSelecionado}
          open={!!livroSelecionado}
          onClose={() => setLivroSelecionado(null)}
        />
      )}
    </>
  );
};

export default HistoricoLivrosSection;
