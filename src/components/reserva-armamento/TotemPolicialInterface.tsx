import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Package, CheckCircle, Loader2, KeyRound
} from "lucide-react";
import { 
  collection, query, where, doc, onSnapshot
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
  confirmarSenhaLength?: number;
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
  
  // Ref para rastrear a cautela anterior e detectar confirmação
  const cautelaAnteriorRef = useRef<string | null>(null);

  // Definir idioma do documento para pt-BR
  useEffect(() => {
    document.documentElement.lang = 'pt-BR';
  }, []);

  // Calcular tamanhos dinâmicos baseados na quantidade de materiais
  const quantidadeMateriais = cautelaAtual?.materiais?.length || 0;
  
  // Ajustes dinâmicos para evitar scroll - fontes maiores para legibilidade
  const tamanhoFonteMaterial = quantidadeMateriais > 6 ? 'text-sm' : quantidadeMateriais > 4 ? 'text-base' : 'text-lg';
  const tamanhoFonteBadge = quantidadeMateriais > 6 ? 'text-xs' : 'text-sm';
  const espacamentoMaterial = quantidadeMateriais > 6 ? 'space-y-1' : 'space-y-2';
  const paddingMaterial = quantidadeMateriais > 6 ? 'p-2' : 'p-3';
  const tamanhoLogo = quantidadeMateriais > 5 ? 'h-12' : 'h-16';
  const tamanhoTitulo = quantidadeMateriais > 5 ? 'text-base' : 'text-lg';

  // 🔥 REALTIME: Escutar cautelas aguardando confirmação em tempo real
  useEffect(() => {
    console.log('[Totem] Iniciando listener realtime para cautelas aguardando...');
    
    // Listener para cautelas novas aguardando confirmação
    const unsubscribeNova = onSnapshot(
      query(
        collection(db, 'cautelas_provisorias'),
        where('status', '==', 'aguardando_confirmacao')
      ),
      (snapshot) => {
        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          const data = docSnap.data();
          
          console.log('[Totem] Cautela recebida em tempo real:', docSnap.id);
          
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
          
          // Atualizar sessão de digitação se existir
          if (data.sessaoDigitacao) {
            setSessaoDigitacao(data.sessaoDigitacao as SessaoDigitacao);
          }
          
          cautelaAnteriorRef.current = docSnap.id;
          setMensagemSucesso("");
        } else {
          // Não há cautela aguardando - verificar se havia uma antes (foi confirmada)
          if (cautelaAnteriorRef.current) {
            console.log('[Totem] Cautela confirmada! Exibindo mensagem de sucesso.');
            setMensagemSucesso("RECEBIMENTO CONFIRMADO!");
            cautelaAnteriorRef.current = null;
            
            setTimeout(() => {
              setMensagemSucesso("");
            }, 3000);
          }
          setCautelaAtual(null);
          setSessaoDigitacao(null);
        }
      },
      (error) => {
        console.error('[Totem] Erro no listener realtime:', error);
      }
    );

    // Listener para complemento de cautelas (adicionar materiais a cautela existente)
    const unsubscribeComplemento = onSnapshot(
      query(
        collection(db, 'cautelas_provisorias'),
        where('statusComplemento', '==', 'aguardando_confirmacao')
      ),
      (snapshot) => {
        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          const data = docSnap.data();
          
          console.log('[Totem] Complemento de cautela detectado:', docSnap.id);
          
          // Usar materiais do complemento para exibição
          const materiaisComplemento = data.materiaisComplemento || [];
          
          setCautelaAtual({
            id: docSnap.id,
            policialId: data.policialId,
            policialNome: data.policialNome,
            policialNomeGuerra: data.policialNomeGuerra,
            policialMatricula: data.policialMatricula,
            policialNumeral: data.policialNumeral,
            postoGrad: data.postoGrad,
            materiais: materiaisComplemento, // Mostrar apenas materiais a adicionar
            dataCautela: data.dataCautela?.toDate?.() || new Date(),
            horaCautela: data.horaCautela,
            armeiroId: data.armeiroId,
            livroId: data.livroId
          });
          
          // Atualizar sessão de digitação se existir
          if (data.sessaoDigitacao) {
            setSessaoDigitacao(data.sessaoDigitacao as SessaoDigitacao);
          }
          
          cautelaAnteriorRef.current = docSnap.id;
          setMensagemSucesso("");
        }
        // Não limpar cautelaAtual aqui - deixar o listener principal gerenciar
      },
      (error) => {
        console.error('[Totem] Erro no listener de complemento:', error);
      }
    );

    return () => {
      console.log('[Totem] Desconectando listeners realtime');
      unsubscribeNova();
      unsubscribeComplemento();
    };
  }, []);

  // Nota: A sessão de digitação agora é atualizada no listener principal acima

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
                <div className={`${quantidadeMateriais > 4 ? 'grid grid-cols-2 gap-2' : espacamentoMaterial}`}>
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
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {material.numeroSerie && (
                              <Badge variant="outline" className={`border-muted-foreground text-foreground ${tamanhoFonteBadge} px-1.5 py-0.5`}>
                                Série: {material.numeroSerie}
                              </Badge>
                            )}
                            <Badge variant="secondary" className={`font-bold ${tamanhoFonteBadge} px-2 py-0.5`}>
                              Qtd: {material.quantidade}
                            </Badge>
                            {material.carregadores && material.carregadores > 0 && (
                              <Badge variant="default" className={`${tamanhoFonteBadge} px-1.5 py-0.5`}>
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
                      DIGITE A SENHA:
                    </p>
                    
                    {/* Asteriscos animados */}
                    <div className="mb-3 min-h-[24px] flex items-center justify-center">
                      {renderAsteriscos(sessaoDigitacao?.senhaLength || 0)}
                    </div>
                    
                    {/* Erro de senha - espelhado em tempo real */}
                    {sessaoDigitacao?.erro && (
                      <p className="text-base text-destructive animate-pulse mb-2 font-bold">
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
                    
                    {/* Campo: Nova Senha */}
                    <div className="mb-3">
                      <p className="text-xs text-muted-foreground mb-1">Nova Senha:</p>
                      <div className="min-h-[24px] flex items-center justify-center">
                        {sessaoDigitacao.senhaLength > 0 ? (
                          <div className="flex justify-center gap-2">
                            {Array.from({ length: sessaoDigitacao.senhaLength }).map((_, i) => (
                              <div key={i} className="w-4 h-4 bg-amber-500 rounded-full" />
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm animate-pulse">
                            Aguardando...
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Campo: Confirmar Senha */}
                    <div className="mb-2">
                      <p className="text-xs text-muted-foreground mb-1">Confirmar Senha:</p>
                      <div className="min-h-[24px] flex items-center justify-center">
                        {(sessaoDigitacao.confirmarSenhaLength || 0) > 0 ? (
                          <div className="flex justify-center gap-2">
                            {Array.from({ length: sessaoDigitacao.confirmarSenhaLength || 0 }).map((_, i) => (
                              <div key={i} className="w-4 h-4 bg-amber-500 rounded-full" />
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm animate-pulse">
                            Aguardando...
                          </span>
                        )}
                      </div>
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