import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AlertTriangle, Bell, CheckCircle, Package, FileText, 
  User, Clock, ChevronDown, ChevronUp 
} from "lucide-react";
import { collection, query, where, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { useToast } from "@/hooks/use-toast";

interface AlertaGestao {
  id: string;
  tipo: 'falta_municao' | 'observacao_livro' | 'material_pendente';
  dataHora: Date;
  policialId?: string;
  policialNome?: string;
  policialNomeGuerra?: string;
  armeiroId?: string;
  armeiroNome?: string;
  materialNome?: string;
  quantidadeCautelada?: number;
  quantidadeDevolvida?: number;
  quantidadeFaltante?: number;
  motivoFalta?: string;
  observacao?: string;
  livroId?: string;
  lido: boolean;
  cienciaData?: Date;
  cienciaPor?: string;
}

const AlertasGestaoSection = () => {
  const [alertas, setAlertas] = useState<AlertaGestao[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Listener em tempo real para alertas
    const unsubscribe = onSnapshot(
      query(
        collection(db, 'alertas_gestao'),
        where('lido', '==', false)
      ),
      (snapshot) => {
        const alertasData = (snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          dataHora: doc.data().dataHora?.toDate?.() || new Date()
        })) as AlertaGestao[]).filter(alerta => alerta.tipo !== 'material_pendente');
        
        // Ordenar em memória para evitar necessidade de índice composto
        alertasData.sort((a, b) => b.dataHora.getTime() - a.dataHora.getTime());
        
        setAlertas(alertasData);
        setLoading(false);
      },
      (error) => {
        console.error('Erro ao carregar alertas:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const darCiencia = async (alerta: AlertaGestao) => {
    try {
      const userStorage = localStorage.getItem('user');
      let cienciaPor = 'Usuário';
      if (userStorage) {
        const userData = JSON.parse(userStorage);
        cienciaPor = userData.nome || userData.NOME || 'Usuário';
      }

      await updateDoc(doc(db, 'alertas_gestao', alerta.id), {
        lido: true,
        cienciaData: new Date(),
        cienciaPor
      });

      toast({
        title: "Ciência Registrada",
        description: "Alerta marcado como lido.",
      });
    } catch (error) {
      console.error('Erro ao dar ciência:', error);
      toast({
        title: "Erro",
        description: "Erro ao registrar ciência.",
        variant: "destructive",
      });
    }
  };

  const formatarData = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getIconePorTipo = (tipo: string) => {
    switch (tipo) {
      case 'falta_municao':
        return <Package className="h-5 w-5 text-destructive" />;
      case 'observacao_livro':
        return <FileText className="h-5 w-5 text-yellow-500" />;
      case 'material_pendente':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      default:
        return <Bell className="h-5 w-5 text-primary" />;
    }
  };

  const getTituloPorTipo = (tipo: string) => {
    switch (tipo) {
      case 'falta_municao':
        return 'Falta de Munição';
      case 'observacao_livro':
        return 'Observação do Livro';
      case 'material_pendente':
        return 'Material Pendente';
      default:
        return 'Alerta';
    }
  };

  const getCorPorTipo = (tipo: string) => {
    switch (tipo) {
      case 'falta_municao':
        return 'border-destructive bg-destructive/10';
      case 'observacao_livro':
        return 'border-yellow-500 bg-yellow-950/20';
      case 'material_pendente':
        return 'border-orange-500 bg-orange-950/20';
      default:
        return 'border-primary bg-primary/10';
    }
  };

  if (loading) {
    return null;
  }

  if (alertas.length === 0) {
    return null;
  }

  return (
    <Card className="border-destructive">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-destructive">
            <Bell className="h-5 w-5" />
            Alertas do Sistema
            <Badge variant="destructive" className="ml-2">
              {alertas.length}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-3">
            {alertas.map((alerta) => (
              <div
                key={alerta.id}
                className={`border rounded-lg overflow-hidden ${getCorPorTipo(alerta.tipo)}`}
              >
                <div 
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandido(expandido === alerta.id ? null : alerta.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getIconePorTipo(alerta.tipo)}
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {getTituloPorTipo(alerta.tipo)}
                          {expandido === alerta.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          {formatarData(alerta.dataHora)}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        darCiencia(alerta);
                      }}
                      className="shrink-0"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Dar Ciência
                    </Button>
                  </div>
                </div>

                {expandido === alerta.id && (
                  <div className="px-4 pb-4 pt-0 border-t border-border/50">
                    <div className="mt-3 space-y-2 text-sm">
                      {alerta.tipo === 'falta_municao' && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-muted-foreground">Policial:</span>
                              <p className="font-medium">
                                {alerta.policialNomeGuerra || alerta.policialNome}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Armeiro:</span>
                              <p className="font-medium">{alerta.armeiroNome}</p>
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Material:</span>
                            <p className="font-medium">{alerta.materialNome}</p>
                          </div>
                          <div className="grid grid-cols-3 gap-4 p-3 bg-background/50 rounded">
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Cautelado</p>
                              <p className="text-lg font-bold">{alerta.quantidadeCautelada}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Devolvido</p>
                              <p className="text-lg font-bold text-green-500">
                                {alerta.quantidadeDevolvida}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Faltante</p>
                              <p className="text-lg font-bold text-destructive">
                                {alerta.quantidadeFaltante}
                              </p>
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Motivo informado:</span>
                            <p className="font-medium p-2 bg-background/50 rounded mt-1">
                              {alerta.motivoFalta}
                            </p>
                          </div>
                        </>
                      )}

                      {alerta.tipo === 'observacao_livro' && (
                        <div>
                          <span className="text-muted-foreground">Observação:</span>
                          <p className="font-medium p-2 bg-background/50 rounded mt-1">
                            {alerta.observacao}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default AlertasGestaoSection;
