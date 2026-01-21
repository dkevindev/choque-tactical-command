import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Package, CheckCircle, Loader2, KeyRound
} from "lucide-react";
import { 
  collection, query, where, getDocs, doc, onSnapshot
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

interface SessaoDigitacao {
  etapa: 'senha' | 'primeiro_acesso' | 'resetar_senha' | 'confirmado';
  senhaLength: number;
  erro?: string | null;
  timestamp: number;
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
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [sessaoDigitacao, setSessaoDigitacao] = useState<SessaoDigitacao | null>(null);

  // Calcular tamanhos dinâmicos baseados na quantidade de materiais
  const quantidadeMateriais = cautelaAtual?.materiais?.length || 0;
  
  // Ajustes dinâmicos para evitar scroll
  const tamanhoFonteMaterial = quantidadeMateriais > 6 ? 'text-xs' : quantidadeMateriais > 4 ? 'text-sm' : 'text-sm';
  const espacamentoMaterial = quantidadeMateriais > 6 ? 'space-y-1' : 'space-y-2';
  const paddingMaterial = quantidadeMateriais > 6 ? 'p-1.5' : 'p-2';
  const tamanhoLogo = quantidadeMateriais > 5 ? 'h-12' : 'h-16';
  const tamanhoTitulo = quantidadeMateriais > 5 ? 'text-base' : 'text-lg';

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
            setSessaoDigitacao(null);
            
            // Limpar mensagem de sucesso após 3 segundos
            setTimeout(() => {
              setMensagemSucesso("");
            }, 3000);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar cautelas:', error);
      }
    };

    // Verificar imediatamente
    verificarCautelaPendente();

    // Verificar a cada 4 segundos
    const interval = setInterval(verificarCautelaPendente, 4000);

    return () => clearInterval(interval);
  }, [cautelaAtual]);

  // Escutar em tempo real as mudanças na sessão de digitação
  useEffect(() => {
    if (!cautelaAtual?.id) {
      setSessaoDigitacao(null);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'cautelas_provisorias', cautelaAtual.id),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.sessaoDigitacao) {
            setSessaoDigitacao(data.sessaoDigitacao as SessaoDigitacao);
          }
        }
      },
      (error) => {
        console.error('Erro ao escutar sessão de digitação:', error);
      }
    );

    return () => unsubscribe();
  }, [cautelaAtual?.id]);

  // Renderizar asteriscos para visualização da senha
  const renderAsteriscos = (length: number) => {
    if (length === 0) {
      return (
        <span className="text-muted-foreground text-sm animate-pulse">
          Aguardando digitação...
        </span>
      );
    }

    return (
      <div className="flex justify-center gap-2">
        {Array.from({ length }).map((_, i) => (
          <div 
            key={i}
            className="w-4 h-4 bg-white rounded-full animate-pulse"
            style={{ animationDelay: `${i * 50}ms` }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-lg">
        {/* Header - Reduzido dinamicamente */}
        <div className="text-center mb-3">
          <div className="flex flex-col items-center justify-center gap-1 mb-1">
            <img src={logo} alt="Logo Cavalaria" className={`${tamanhoLogo} w-auto`} />
            <div>
              <h1 className={`${tamanhoTitulo} font-bold text-foreground`}>CAVALARIA PMCE - P4</h1>
              <h2 className="text-sm font-semibold text-white">RESERVA DE ARMAMENTO</h2>
            </div>
          </div>
        </div>

        {/* Mensagem de Sucesso */}
        {mensagemSucesso && (
          <Card className="mb-3 border-green-500 bg-green-500/20 animate-pulse">
            <CardContent className="p-3 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-green-400">{mensagemSucesso}</p>
            </CardContent>
          </Card>
        )}

        {/* Estado: Aguardando Material */}
        {!cautelaAtual && !mensagemSucesso && (
          <Card className="border-border">
            <CardContent className="p-5 text-center">
              <div className="mb-3">
                <Loader2 className="h-10 w-10 text-primary mx-auto animate-spin" />
              </div>
              <p className="text-base font-semibold text-foreground mb-1">
                Aguardando material...
              </p>
              <p className="text-sm text-muted-foreground">
                Quando o armeiro registrar uma cautela,<br />
                ela aparecerá aqui automaticamente.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Estado: Material Pendente - Apenas Visualização */}
        {cautelaAtual && !mensagemSucesso && (
          <>
            {/* Identificação do Policial - Compacto */}
            <Card className="mb-2 border-primary bg-primary/10">
              <CardContent className="p-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary-foreground">
                      {cautelaAtual.policialNumeral || '?'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-bold text-foreground truncate">
                      <span className="text-primary">{cautelaAtual.postoGrad}</span>
                      <span className="ml-1">{cautelaAtual.policialNomeGuerra || cautelaAtual.policialNome}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Matrícula: {cautelaAtual.policialMatricula}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Materiais para Receber - Compacto e Dinâmico */}
            <Card className="mb-2 border-border">
              <CardHeader className="py-1.5 px-2.5">
                <CardTitle className="flex items-center gap-1.5 text-foreground text-sm">
                  <Package className="h-3.5 w-3.5 text-primary" />
                  MATERIAIS PARA RECEBER
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2.5 pb-2.5">
                <div className={espacamentoMaterial}>
                  {cautelaAtual.materiais.map((material, idx) => (
                    <div
                      key={`${cautelaAtual.id}-${idx}`}
                      className={`${paddingMaterial} bg-muted rounded border border-border`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0 flex-1">
                          <p className={`${tamanhoFonteMaterial} font-semibold text-foreground truncate`}>
                            {material.nome}
                            {material.modelo && ` ${material.modelo}`}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {material.numeroSerie && (
                              <Badge variant="outline" className="border-white/70 text-white text-[10px] px-1 py-0">
                                Série: {material.numeroSerie}
                              </Badge>
                            )}
                            <Badge variant="outline" className="border-muted-foreground text-muted-foreground text-[10px] px-1 py-0">
                              Qtd: {material.quantidade}
                            </Badge>
                            {material.carregadores && material.carregadores > 0 && (
                              <Badge variant="default" className="bg-blue-600 text-white text-[10px] px-1 py-0">
                                📦 {material.carregadores}
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

            {/* Área de Digitação Espelhada */}
            <Card className="mb-2 border-primary/50 bg-card">
              <CardContent className="p-3 text-center">
                
                {/* Etapa: Digitando Senha */}
                {(!sessaoDigitacao || sessaoDigitacao.etapa === 'senha') && (
                  <>
                    <p className="text-sm text-muted-foreground mb-3 flex items-center justify-center gap-2">
                      <KeyRound className="h-4 w-4 text-primary" />
                      DIGITANDO SENHA:
                    </p>
                    
                    {/* Asteriscos animados */}
                    <div className="mb-3 min-h-[24px] flex items-center justify-center">
                      {renderAsteriscos(sessaoDigitacao?.senhaLength || 0)}
                    </div>
                    
                    {/* Erro de senha */}
                    {sessaoDigitacao?.erro && (
                      <p className="text-sm text-destructive animate-pulse mb-2 font-medium">
                        ❌ {sessaoDigitacao.erro}
                      </p>
                    )}
                    
                    <p className="text-xs text-muted-foreground">
                      Pressione ENTER para confirmar
                    </p>
                  </>
                )}
                
                {/* Etapa: Primeiro Acesso */}
                {sessaoDigitacao?.etapa === 'primeiro_acesso' && (
                  <>
                    <p className="text-sm text-amber-500 font-medium mb-2 flex items-center justify-center gap-2">
                      <KeyRound className="h-4 w-4" />
                      🔑 PRIMEIRO ACESSO
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Definindo nova senha pessoal...
                    </p>
                    
                    {/* Asteriscos para nova senha */}
                    <div className="mb-2 min-h-[24px] flex items-center justify-center">
                      {sessaoDigitacao.senhaLength > 0 ? (
                        <div className="flex justify-center gap-2">
                          {Array.from({ length: sessaoDigitacao.senhaLength }).map((_, i) => (
                            <div key={i} className="w-4 h-4 bg-amber-500 rounded-full" />
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm animate-pulse">
                          Aguardando nova senha...
                        </span>
                      )}
                    </div>
                  </>
                )}
                
                {/* Etapa: Resetando Senha */}
                {sessaoDigitacao?.etapa === 'resetar_senha' && (
                  <>
                    <p className="text-sm text-amber-500 font-medium mb-2 flex items-center justify-center gap-2">
                      <KeyRound className="h-4 w-4" />
                      🔑 RESETANDO SENHA
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Aguardando autorização do armeiro...
                    </p>
                  </>
                )}
                
                {/* Etapa: Confirmado */}
                {sessaoDigitacao?.etapa === 'confirmado' && (
                  <>
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-green-500 font-bold">
                      ✅ CONFIRMADO!
                    </p>
                  </>
                )}
                
              </CardContent>
            </Card>
          </>
        )}

        {/* Footer - Compacto */}
        <div className="text-center mt-3">
          <p className="text-[10px] text-muted-foreground">
            Cavalaria PMCE - P4 - Reserva de Armamento
          </p>
        </div>
      </div>
    </div>
  );
};

export default TotemPolicialInterface;