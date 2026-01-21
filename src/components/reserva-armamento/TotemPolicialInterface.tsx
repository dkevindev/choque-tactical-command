import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Package, CheckCircle, Loader2, KeyRound
} from "lucide-react";
import { 
  collection, query, where, getDocs
} from 'firebase/firestore';
import { db } from '@/firebase';
import logo from '@/assets/cavalaria-triade.png';

interface MaterialAguardando {
  materialId: string;
  nome: string;
  categoria: string;
  quantidade: number;
  numeroSerie?: string;
  carregadores?: number;
  modelo?: string;
  fabricante?: string;
}

interface CautelaAguardando {
  id: string;
  policialId: string;
  policialNome: string;
  policialNomeGuerra?: string;
  policialMatricula: string;
  policialNumeral?: number;
  postoGrad?: string;
  materiais: MaterialAguardando[];
  dataCautela: Date;
  horaCautela: string;
  armeiroId?: string;
  livroId?: string;
}

const TotemPolicialInterface = () => {
  const [cautelaAtual, setCautelaAtual] = useState<CautelaAguardando | null>(null);
  const [verificando, setVerificando] = useState(true);
  const [mensagemSucesso, setMensagemSucesso] = useState("");

  // Verificar automaticamente a cada 4 segundos se há cautela aguardando
  useEffect(() => {
    const verificarCautelaPendente = async () => {
      try {
        const snapshot = await getDocs(
          query(
            collection(db, 'cautelas_provisorias'),
            where('status', '==', 'aguardando_confirmacao')
          )
        );
        
        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          const data = docSnap.data();
          
          setCautelaAtual({
            id: docSnap.id,
            policialId: data.policialId,
            policialNome: data.policialNome,
            policialNomeGuerra: data.policialNomeGuerra,
            policialMatricula: data.policialMatricula,
            policialNumeral: data.policialNumeral,
            postoGrad: data.postoGrad,
            materiais: data.materiais || [],
            dataCautela: data.dataCautela?.toDate?.() || new Date(),
            horaCautela: data.horaCautela,
            armeiroId: data.armeiroId,
            livroId: data.livroId
          });
          setMensagemSucesso(""); // Limpar mensagem de sucesso se houver nova cautela
        } else {
          // Verificar se a cautela que estava sendo exibida foi confirmada
          if (cautelaAtual) {
            setMensagemSucesso("RECEBIMENTO CONFIRMADO!");
            setCautelaAtual(null);
            
            // Limpar mensagem de sucesso após 3 segundos
            setTimeout(() => {
              setMensagemSucesso("");
            }, 3000);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar cautelas:', error);
      } finally {
        setVerificando(false);
      }
    };

    // Verificar imediatamente
    verificarCautelaPendente();

    // Verificar a cada 4 segundos
    const interval = setInterval(verificarCautelaPendente, 4000);

    return () => clearInterval(interval);
  }, [cautelaAtual]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-2">
      <div className="w-full max-w-lg">
        {/* Header - Reduzido 30% */}
        <div className="text-center mb-4">
          <div className="flex flex-col items-center justify-center gap-2 mb-2">
            <img src={logo} alt="Logo Cavalaria" className="h-16 w-auto" />
            <div>
              <h1 className="text-lg font-bold text-foreground">CAVALARIA PMCE - P4</h1>
              <h2 className="text-base font-semibold text-white">RESERVA DE ARMAMENTO</h2>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Tela de Visualização - Totem</p>
        </div>

        {/* Mensagem de Sucesso */}
        {mensagemSucesso && (
          <Card className="mb-4 border-green-500 bg-green-500/20 animate-pulse">
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-14 w-14 text-green-500 mx-auto mb-2" />
              <p className="text-xl font-bold text-green-400">{mensagemSucesso}</p>
            </CardContent>
          </Card>
        )}

        {/* Estado: Aguardando Material */}
        {!cautelaAtual && !mensagemSucesso && (
          <Card className="border-border">
            <CardContent className="p-6 text-center">
              <div className="mb-4">
                <Loader2 className="h-12 w-12 text-primary mx-auto animate-spin" />
              </div>
              <p className="text-lg font-semibold text-foreground mb-1">
                Aguardando material...
              </p>
              <p className="text-sm text-muted-foreground">
                Quando o armeiro registrar uma cautela,<br />
                ela aparecerá aqui automaticamente.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Verificando a cada 4 segundos
              </p>
            </CardContent>
          </Card>
        )}

        {/* Estado: Material Pendente - Apenas Visualização */}
        {cautelaAtual && !mensagemSucesso && (
          <>
            {/* Identificação do Policial - Reduzido 30% */}
            <Card className="mb-3 border-primary bg-primary/10">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-primary-foreground">
                      {cautelaAtual.policialNumeral || '?'}
                    </span>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">
                      <span className="text-primary">{cautelaAtual.postoGrad}</span>
                      <span className="ml-2">{cautelaAtual.policialNomeGuerra || cautelaAtual.policialNome}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Matrícula: {cautelaAtual.policialMatricula}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Materiais para Receber - Reduzido 30% */}
            <Card className="mb-3 border-border">
              <CardHeader className="py-2 px-3">
                <CardTitle className="flex items-center gap-2 text-foreground text-base">
                  <Package className="h-4 w-4 text-primary" />
                  MATERIAIS PARA RECEBER
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="space-y-2">
                  {cautelaAtual.materiais.map((material, idx) => (
                    <div
                      key={`${cautelaAtual.id}-${idx}`}
                      className="p-2 bg-muted rounded-lg border border-border"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {material.nome}
                            {material.modelo && ` ${material.modelo}`}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {material.numeroSerie && (
                              <Badge variant="outline" className="border-primary text-primary text-xs">
                                Série: {material.numeroSerie}
                              </Badge>
                            )}
                            <Badge variant="outline" className="border-muted-foreground text-muted-foreground text-xs">
                              Qtd: {material.quantidade}
                            </Badge>
                            {material.carregadores && material.carregadores > 0 && (
                              <Badge variant="default" className="bg-blue-600 text-white text-xs">
                                📦 {material.carregadores} carregador(es)
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Instrução para digitar senha no terminal do armeiro */}
            <Card className="border-amber-500/50 bg-amber-500/10">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <KeyRound className="h-5 w-5 text-amber-500 animate-pulse" />
                  <span className="text-base font-bold text-amber-500 animate-pulse">
                    DIGITE SUA SENHA
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  no terminal do armeiro para confirmar recebimento
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {/* Footer */}
        <div className="text-center mt-4">
          <p className="text-xs text-muted-foreground">
            Cavalaria PMCE - P4 - Reserva de Armamento - Totem de Visualização
          </p>
        </div>
      </div>
    </div>
  );
};

export default TotemPolicialInterface;
