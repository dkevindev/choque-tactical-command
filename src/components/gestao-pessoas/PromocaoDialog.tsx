import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Search, ChevronLeft, CheckCircle, RefreshCw } from 'lucide-react';
import { collection, addDoc, doc, getDocs, query, where, getDoc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { useToast } from "@/hooks/use-toast";
import HistoricoPromocoesTable from './HistoricoPromocoesTable';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Policial {
  id: string;
  NOME: string;
  'Post/Grad': string;
  SITUAÇÃO?: string;
  Matrícula?: string;
  NUMERAL?: number;
  numeral?: string;
  'ULTIMA PROMOÇÃO'?: number;
  'NOME DE GUERRA'?: string;
  'NOME DE GUERRA1'?: string;
  [key: string]: any;
}

interface PromocaoDialogProps {
  policiais: Policial[];
  onClose: () => void;
  onUpdate: () => void;
}

interface TipoPromocao {
  de: string;
  para: string;
  label: string;
}

const TIPOS_PROMOCAO: TipoPromocao[] = [
  { de: 'SD', para: 'CB', label: 'SD → CB' },
  { de: 'CB', para: '3º SGT', label: 'CB → 3º SGT' },
  { de: '3º SGT', para: '2º SGT', label: '3º SGT → 2º SGT' },
  { de: '2º SGT', para: '1º SGT', label: '2º SGT → 1º SGT' },
  { de: '1º SGT', para: 'SUBTEN', label: '1º SGT → SUBTEN' },
  { de: 'SUBTEN', para: '2º TEN', label: 'SUBTEN → 2º TEN' },
  { de: '2º TEN', para: '1º TEN', label: '2º TEN → 1º TEN' },
  { de: '1º TEN', para: 'CAP', label: '1º TEN → CAP' },
  { de: 'CAP', para: 'MAJ', label: 'CAP → MAJ' },
  { de: 'MAJ', para: 'TENCEL', label: 'MAJ → TENCEL' },
];

// Função para gerar novo ID do documento policial
const gerarNovoIdPolicial = (postoNovo: string, nomeGuerra: string, numeral: number | string): string => {
  // Limpar nome de guerra (pegar só o nome, sem posto)
  const nomeBase = nomeGuerra?.trim() || 'DESCONHECIDO';
  const numeralStr = String(numeral || '0');
  // Substituir espaços por underscore e remover caracteres especiais
  const nomeFormatado = nomeBase.replace(/\s+/g, '_').replace(/[^A-Za-z0-9_]/g, '');
  return `${postoNovo}_${nomeFormatado}_${numeralStr}`;
};

// Função para atualizar NOME DE GUERRA1 com novo posto
const atualizarNomeGuerraCompleto = (nomeGuerra1: string, postoAntigo: string, postoNovo: string): string => {
  if (!nomeGuerra1) return '';
  
  // Tratar variações de formato ("SD KEVIN", "1º SGT ALMEIDA", etc.)
  // Primeiro, tenta substituir exatamente o posto antigo no início
  const regex = new RegExp(`^${postoAntigo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'i');
  
  if (regex.test(nomeGuerra1)) {
    return nomeGuerra1.replace(regex, `${postoNovo} `);
  }
  
  // Se não encontrou, retorna com o novo posto + nome original limpo
  const partes = nomeGuerra1.trim().split(/\s+/);
  const nomeBase = partes.slice(1).join(' ') || partes[0];
  return `${postoNovo} ${nomeBase}`;
};

// Função para atualizar referências em outras coleções
const atualizarReferenciasPolicial = async (idAntigo: string, idNovo: string) => {
  const colecoesParaAtualizar = [
    { colecao: 'cautelas_permanentes', campo: 'policialId' },
    { colecao: 'projetos_instrutores', campo: 'policialId' },
    { colecao: 'projetos_gestores', campo: 'policialId' },
    { colecao: 'projetos_aulas', campo: 'instrutorId' },
  ];
  
  for (const { colecao, campo } of colecoesParaAtualizar) {
    try {
      const q = query(collection(db, colecao), where(campo, '==', idAntigo));
      const snapshot = await getDocs(q);
      
      for (const docSnap of snapshot.docs) {
        await updateDoc(doc(db, colecao, docSnap.id), {
          [campo]: idNovo
        });
      }
    } catch (error) {
      console.warn(`Aviso ao atualizar referências em ${colecao}:`, error);
    }
  }
  
  // Atualizar array de instrutores em projetos_aulas
  try {
    const aulasSnapshot = await getDocs(collection(db, 'projetos_aulas'));
    for (const aulaDoc of aulasSnapshot.docs) {
      const data = aulaDoc.data();
      if (data.instrutores && Array.isArray(data.instrutores) && data.instrutores.includes(idAntigo)) {
        const novosInstrutores = data.instrutores.map((id: string) => id === idAntigo ? idNovo : id);
        await updateDoc(doc(db, 'projetos_aulas', aulaDoc.id), {
          instrutores: novosInstrutores
        });
      }
    }
  } catch (error) {
    console.warn('Aviso ao atualizar instrutores em projetos_aulas:', error);
  }
};

const PromocaoDialog: React.FC<PromocaoDialogProps> = ({ policiais, onClose, onUpdate }) => {
  const [etapa, setEtapa] = useState<'selecao' | 'policiais' | 'confirmacao' | 'historico'>(
    'selecao'
  );
  const [tipoPromocao, setTipoPromocao] = useState<TipoPromocao | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPoliciais, setSelectedPoliciais] = useState<string[]>([]);
  const [dataPromocao, setDataPromocao] = useState('');
  const [publicacao, setPublicacao] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewingHistorico, setViewingHistorico] = useState<Policial | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const { toast } = useToast();

  // Função para sincronizar retroativamente as datas de promoção
  const handleSincronizarDatasPromocao = async () => {
    setSyncLoading(true);
    try {
      const historicoSnap = await getDocs(collection(db, 'historico_promocoes'));
      
      // Agrupar por policialId, pegando a data mais recente
      const mapaPromocoes: Record<string, string> = {};
      historicoSnap.docs.forEach(d => {
        const data = d.data();
        const pid = data.policialId;
        const dataPromo = data.dataPromocao;
        if (!pid || !dataPromo) return;
        
        if (!mapaPromocoes[pid] || new Date(dataPromo) > new Date(mapaPromocoes[pid])) {
          mapaPromocoes[pid] = dataPromo;
        }
      });

      let atualizados = 0;
      for (const [policialId, dataPromo] of Object.entries(mapaPromocoes)) {
        try {
          const policialRef = doc(db, 'policiais', policialId);
          const policialSnap = await getDoc(policialRef);
          if (policialSnap.exists()) {
            await updateDoc(policialRef, { dataUltimaPromocao: dataPromo });
            atualizados++;
          }
        } catch (err) {
          console.warn(`Erro ao atualizar policial ${policialId}:`, err);
        }
      }

      toast({
        title: "Sincronização concluída",
        description: `${atualizados} policial(is) atualizado(s) com a data da última promoção.`
      });
      onUpdate();
    } catch (error: any) {
      console.error('Erro ao sincronizar:', error);
      toast({
        title: "Erro",
        description: `Erro ao sincronizar datas: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setSyncLoading(false);
    }
  };

  // Filtrar policiais elegíveis para promoção
  const policiaisElegiveis = tipoPromocao
    ? policiais.filter(p => p['Post/Grad'] === tipoPromocao.de)
    : [];

  const filteredPoliciais = policiaisElegiveis.filter(policial => {
    const term = searchTerm.toLowerCase();
    return (
      policial.NOME?.toLowerCase().includes(term) ||
      policial.Matrícula?.toString().includes(term) ||
      policial.NUMERAL?.toString().includes(term) ||
      policial.numeral?.toString().includes(term)
    );
  });

  const handleSelectAll = () => {
    if (selectedPoliciais.length === filteredPoliciais.length) {
      setSelectedPoliciais([]);
    } else {
      setSelectedPoliciais(filteredPoliciais.map(p => p.id));
    }
  };

  const handleTogglePolicial = (id: string) => {
    setSelectedPoliciais(prev =>
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const handleConfirmar = async () => {
    if (!tipoPromocao || selectedPoliciais.length === 0 || !dataPromocao || !publicacao) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const dataPromocaoDate = new Date(dataPromocao);

      for (const policialId of selectedPoliciais) {
        // 1. Buscar dados atuais do policial
        const policialRef = doc(db, 'policiais', policialId);
        const policialSnap = await getDoc(policialRef);
        
        if (!policialSnap.exists()) {
          console.error(`Policial ${policialId} não encontrado`);
          continue;
        }
        
        const dadosAtuais = policialSnap.data();
        
        // 2. Preparar dados atualizados
        const nomeGuerra = dadosAtuais['NOME DE GUERRA'] || dadosAtuais['NOME'] || '';
        const nomeGuerra1Atual = dadosAtuais['NOME DE GUERRA1'] || '';
        const numeral = dadosAtuais.NUMERAL || dadosAtuais.numeral || '';
        
        // Atualizar NOME DE GUERRA1 com novo posto
        const novoNomeGuerra1 = atualizarNomeGuerraCompleto(
          nomeGuerra1Atual, 
          tipoPromocao.de, 
          tipoPromocao.para
        );
        
        // Gerar novo ID do documento
        const novoId = gerarNovoIdPolicial(tipoPromocao.para, nomeGuerra, numeral);
        
        // Converter data para formato Excel (dias desde 1900-01-01)
        const excelEpoch = new Date(1900, 0, 1);
        const daysSinceEpoch = Math.floor(
          (dataPromocaoDate.getTime() - excelEpoch.getTime()) / (24 * 60 * 60 * 1000)
        ) + 2;
        
        // 3. Criar registro no histórico de promoções
        await addDoc(collection(db, 'historico_promocoes'), {
          policialId: novoId, // Usar novo ID para referência futura
          policialIdAntigo: policialId,
          graduacaoAnterior: tipoPromocao.de,
          graduacaoNova: tipoPromocao.para,
          dataPromocao: dataPromocaoDate.toISOString(),
          publicacao,
          criadoEm: new Date().toISOString()
        });
        
        // 4. Criar novo documento com ID atualizado
        const novoDocRef = doc(db, 'policiais', novoId);
        const novosDados = {
          ...dadosAtuais,
          'Post/Grad': tipoPromocao.para,
          'NOME DE GUERRA1': novoNomeGuerra1,
          'ULTIMA PROMOÇÃO': daysSinceEpoch,
          dataUltimaPromocao: dataPromocaoDate.toISOString(),
          idAnterior: policialId // Manter referência ao ID antigo
        };
        
        await setDoc(novoDocRef, novosDados);
        
        // 5. Deletar documento antigo
        await deleteDoc(policialRef);
        
        // 6. Atualizar referências em outras coleções
        await atualizarReferenciasPolicial(policialId, novoId);
      }

      toast({
        title: "Sucesso!",
        description: `${selectedPoliciais.length} promoç${selectedPoliciais.length > 1 ? 'ões' : 'ão'} registrada${selectedPoliciais.length > 1 ? 's' : ''} com sucesso`
      });

      onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Erro ao processar promoções:', error);
      toast({
        title: "Erro",
        description: `Erro ao processar promoções: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getPoliciaisSelecionados = () => {
    return policiais.filter(p => selectedPoliciais.includes(p.id));
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {etapa === 'selecao' && 'Gerenciar Promoções'}
              {etapa === 'policiais' && `Selecionar Policiais para Promoção: ${tipoPromocao?.label}`}
              {etapa === 'confirmacao' && 'Confirmar Promoções'}
            </DialogTitle>
          </DialogHeader>

          {/* Etapa 1: Seleção do Tipo de Promoção */}
          {etapa === 'selecao' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Selecione o tipo de promoção que deseja processar:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {TIPOS_PROMOCAO.map((tipo) => {
                  const count = policiais.filter(p => p['Post/Grad'] === tipo.de).length;
                  return (
                    <Button
                      key={tipo.label}
                      variant="outline"
                      className="h-auto py-4 flex items-center justify-between"
                      onClick={() => {
                        setTipoPromocao(tipo);
                        setEtapa('policiais');
                      }}
                      disabled={count === 0}
                    >
                      <span className="font-medium">{tipo.label}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{count} elegíveis</Badge>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </Button>
                  );
                })}
              </div>

              {/* Botão Sincronizar Datas */}
              <div className="border-t pt-4 mt-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full" disabled={syncLoading}>
                      <RefreshCw className={`h-4 w-4 mr-2 ${syncLoading ? 'animate-spin' : ''}`} />
                      {syncLoading ? 'Sincronizando...' : 'Sincronizar Datas de Promoção'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Sincronizar Datas de Promoção</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação irá consultar o histórico de promoções e atualizar o campo "dataUltimaPromocao" de cada policial com a data da promoção mais recente. Deseja continuar?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleSincronizarDatasPromocao}>
                        Sincronizar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <p className="text-xs text-muted-foreground mt-1 text-center">
                  Atualiza retroativamente as datas de promoção baseado no histórico
                </p>
              </div>
            </div>
          )}

          {/* Etapa 2: Seleção de Policiais */}
          {etapa === 'policiais' && tipoPromocao && (
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEtapa('selecao');
                  setTipoPromocao(null);
                  setSelectedPoliciais([]);
                }}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Policiais Elegíveis ({filteredPoliciais.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Filtros e Data/Publicação */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="search">Buscar</Label>
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="search"
                          placeholder="Nome, matrícula ou numeral..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="dataPromocao">Data da Promoção *</Label>
                      <Input
                        id="dataPromocao"
                        type="date"
                        value={dataPromocao}
                        onChange={(e) => setDataPromocao(e.target.value)}
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="publicacao">Publicação (Portaria/Boletim) *</Label>
                      <Input
                        id="publicacao"
                        placeholder="Ex: Portaria nº 123/2024"
                        value={publicacao}
                        onChange={(e) => setPublicacao(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Checkbox Selecionar Todos */}
                  <div className="flex items-center space-x-2 border-b pb-2">
                    <Checkbox
                      id="select-all"
                      checked={
                        filteredPoliciais.length > 0 &&
                        selectedPoliciais.length === filteredPoliciais.length
                      }
                      onCheckedChange={handleSelectAll}
                    />
                    <Label htmlFor="select-all" className="cursor-pointer font-medium">
                      Selecionar Todos
                    </Label>
                  </div>

                  {/* Tabela de Policiais */}
                  <div className="border rounded-lg max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Matrícula</TableHead>
                          <TableHead>Numeral</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>Post/Grad</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPoliciais.map((policial) => (
                          <TableRow key={policial.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedPoliciais.includes(policial.id)}
                                onCheckedChange={() => handleTogglePolicial(policial.id)}
                              />
                            </TableCell>
                            <TableCell>{policial.Matrícula || 'N/A'}</TableCell>
                            <TableCell>{policial.NUMERAL || policial.numeral || 'N/A'}</TableCell>
                            <TableCell>{policial.NOME}</TableCell>
                            <TableCell>
                              <Badge>{policial['Post/Grad']}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {filteredPoliciais.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum policial encontrado
                    </div>
                  )}
                </CardContent>
              </Card>

              <DialogFooter>
                <Button variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => setEtapa('confirmacao')}
                  disabled={selectedPoliciais.length === 0 || !dataPromocao || !publicacao}
                >
                  Continuar ({selectedPoliciais.length} selecionado
                  {selectedPoliciais.length !== 1 ? 's' : ''})
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Etapa 3: Confirmação */}
          {etapa === 'confirmacao' && tipoPromocao && (
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEtapa('policiais')}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Confirmar Promoções
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                    <div>
                      <span className="text-sm font-semibold">Tipo de Promoção:</span>
                      <p className="text-lg">{tipoPromocao.label}</p>
                    </div>
                    <div>
                      <span className="text-sm font-semibold">Quantidade:</span>
                      <p className="text-lg">{selectedPoliciais.length} policia
                        {selectedPoliciais.length !== 1 ? 'is' : 'l'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-semibold">Data da Promoção:</span>
                      <p className="text-lg">
                        {new Date(dataPromocao).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-semibold">Publicação:</span>
                      <p className="text-lg">{publicacao}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Policiais a serem promovidos:</h4>
                    <div className="border rounded-lg max-h-64 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Matrícula</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>De</TableHead>
                            <TableHead></TableHead>
                            <TableHead>Para</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getPoliciaisSelecionados().map((policial) => (
                            <TableRow key={policial.id}>
                              <TableCell>{policial.Matrícula || 'N/A'}</TableCell>
                              <TableCell>{policial.NOME}</TableCell>
                              <TableCell>
                                <Badge variant="secondary">{tipoPromocao.de}</Badge>
                              </TableCell>
                              <TableCell>
                                <ArrowRight className="h-4 w-4" />
                              </TableCell>
                              <TableCell>
                                <Badge>{tipoPromocao.para}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <DialogFooter>
                <Button variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button onClick={handleConfirmar} disabled={loading}>
                  {loading ? "Processando..." : "Confirmar Promoções"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Histórico */}
      {viewingHistorico && (
        <Dialog open={!!viewingHistorico} onOpenChange={() => setViewingHistorico(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                Histórico de Promoções - {viewingHistorico.NOME}
              </DialogTitle>
            </DialogHeader>
            <HistoricoPromocoesTable policialId={viewingHistorico.id} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default PromocaoDialog;
