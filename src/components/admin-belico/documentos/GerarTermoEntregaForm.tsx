import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileDown, Plus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { collection, getDocs, getDoc, query, updateDoc, doc, runTransaction } from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from 'sonner';
import { usePolicialResolver } from '@/hooks/usePolicialResolver';

interface ItemAdicional {
  descricao: string;
  tamanho?: string;
}

interface Transferencia {
  id: string;
  policialId?: string;
  policialNome: string;
  policialPatente: string;
  policialMatricula: string;
  dataTransferencia: Date;
  localDestino: string;
  publicacao: string;
  numeroCautelaOriginal: string;
  materiaisDevolvidos: Array<{
    materialId: string;
    nome: string;
    categoria: string;
    fabricante?: string;
    modelo?: string;
    calibre?: string;
    numeroSerie?: string;
    quantidade: number;
    quantidadeCarregadores?: number;
    quantidadeMunicoes?: number;
    tamanhoColete?: string;
    sexo?: string;
    vencimento?: string;
  }>;
}

// Contador por ano: guarda o maior número já usado para sugerir o próximo
const contadorRef = () => doc(db, 'contadores', `termoEntrega-${new Date().getFullYear()}`);

const sugerirProximoNumero = async () => {
  const snap = await getDoc(contadorRef());
  return String((snap.data()?.ultimo ?? 0) + 1).padStart(3, '0');
};

const registrarNumeroUsado = (numero: string) => {
  const n = parseInt(numero, 10);
  if (Number.isNaN(n)) return;
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(contadorRef());
    if (n > (snap.data()?.ultimo ?? 0)) tx.set(contadorRef(), { ultimo: n });
  });
};

interface Props {
  transferenciaIdInicial?: string;
  onGerado?: () => void;
}

const GerarTermoEntregaForm = ({ transferenciaIdInicial = '', onGerado }: Props) => {
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [transferenciaId, setTransferenciaId] = useState(transferenciaIdInicial);
  const [numeroTermo, setNumeroTermo] = useState('');
  const [itensAdicionais, setItensAdicionais] = useState<ItemAdicional[]>([]);
  const [showModalItem, setShowModalItem] = useState(false);
  const [itemCustomizado, setItemCustomizado] = useState('');
  const [loading, setLoading] = useState(false);
  const { policiaisMap, resolverNome } = usePolicialResolver();

  useEffect(() => {
    loadTransferencias();
  }, []);

  useEffect(() => {
    if (!transferenciaId) return;
    sugerirProximoNumero()
      .then(setNumeroTermo)
      .catch((e) => console.error('Erro ao sugerir número:', e));
  }, [transferenciaId]);

  const loadTransferencias = async () => {
    try {
      const q = query(collection(db, 'transferencias_policiais'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        dataTransferencia: doc.data().dataTransferencia?.toDate() || new Date()
      })) as Transferencia[];
      setTransferencias(data);
    } catch (error) {
      console.error('Erro ao carregar transferências:', error);
      toast.error('Erro ao carregar transferências');
    }
  };

  const adicionarItemPredefinido = (item: string, tamanho?: string) => {
    let descricao = '';
    switch (item) {
      case 'botas':
        descricao = tamanho ? `01 (um) par de botas tamanho ${tamanho}` : '01 (um) par de botas';
        break;
      case 'esporas':
        descricao = '01 (um) par de esporas';
        break;
      case 'capacete-antitumulto':
        descricao = '01 (um) capacete antitumulto';
        break;
      case 'capacete-pomont':
        descricao = '01 (um) capacete de POMont';
        break;
      case 'calca':
        descricao = tamanho
          ? `01 (uma) calça camuflado digital tamanho ${tamanho}`
          : '01 (uma) calça camuflado digital';
        break;
      case 'gandola':
        descricao = tamanho
          ? `01 (uma) gandola camuflado digital tamanho ${tamanho}`
          : '01 (uma) gandola camuflado digital';
        break;
      case 'exosqueleto':
        descricao = '01 (um) exosqueleto';
        break;
      case 'joelheira':
        descricao = '01 (um) par de joelheira';
        break;
      case 'cotoveleira':
        descricao = '01 (um) par de cotoveleira';
        break;
      case 'kit-manutencao':
        descricao = 'caixa com kit manutenção';
        break;
    }
    setItensAdicionais([...itensAdicionais, { descricao }]);
  };

  const removerItem = (index: number) => {
    setItensAdicionais(itensAdicionais.filter((_, i) => i !== index));
  };

  const adicionarItemCustomizado = () => {
    if (itemCustomizado.trim()) {
      setItensAdicionais([...itensAdicionais, { descricao: itemCustomizado }]);
      setItemCustomizado('');
      setShowModalItem(false);
    }
  };

  const handleGerar = async () => {
    if (!transferenciaId || !numeroTermo) {
      toast.error('Preencha todos os campos');
      return;
    }

    const transferencia = transferencias.find((t) => t.id === transferenciaId);
    if (!transferencia) return;

    if (transferencia.materiaisDevolvidos.length === 0 && itensAdicionais.length === 0) {
      toast.error('Adicione pelo menos um material ou item');
      return;
    }

    setLoading(true);

    try {
      // Formatar materiais em formato tabular para o template DOCX
      const materiais: Array<{ qtd: string; nome: string; modelo: string; serie: string }> = [];
      
      // Rastrear se já adicionamos munições/carregadores de um armamento
      // para evitar duplicação com itens separados
      const processedCarregadores = new Set<string>();
      const processedMunicoes = new Set<string>();

      transferencia.materiaisDevolvidos.forEach((m) => {
        if (m.categoria === 'Armamento') {
          // 1. Arma principal - nome + calibre
          materiais.push({
            qtd: '01',
            nome: `${m.nome || 'Pistola'} ${m.calibre || ''}`.trim(),
            modelo: m.fabricante || m.modelo || '-',
            serie: m.numeroSerie || '-'
          });

          // 2. Carregadores (se houver) - marcar como processado
          if (m.quantidadeCarregadores && m.quantidadeCarregadores > 0) {
            materiais.push({
              qtd: String(m.quantidadeCarregadores).padStart(2, '0'),
              nome: `Carregadores ${m.calibre || ''}`.trim(),
              modelo: m.fabricante || '-',
              serie: '-'
            });
            // Marcar este calibre como já processado
            if (m.calibre) processedCarregadores.add(m.calibre.toLowerCase());
          }

          // 3. Munições (se houver) - marcar como processado
          if (m.quantidadeMunicoes && m.quantidadeMunicoes > 0) {
            materiais.push({
              qtd: String(m.quantidadeMunicoes).padStart(2, '0'),
              nome: `Munições ${m.calibre || ''}`.trim(),
              modelo: '-',
              serie: '-'
            });
            // Marcar este calibre como já processado
            if (m.calibre) processedMunicoes.add(m.calibre.toLowerCase());
          }
        } else if (m.categoria === 'Acessório' && m.nome?.toLowerCase().includes('carregador')) {
          // Carregador separado - só adicionar se não foi processado no armamento
          const calibreLower = m.calibre?.toLowerCase() || '';
          if (!processedCarregadores.has(calibreLower)) {
            materiais.push({
              qtd: String(m.quantidade).padStart(2, '0'),
              nome: `Carregadores ${m.calibre || ''}`.trim(),
              modelo: m.fabricante || '-',
              serie: '-'
            });
          }
        } else if (m.categoria === 'Munição') {
          // Munição separada - só adicionar se não foi processada no armamento
          const calibreLower = m.calibre?.toLowerCase() || '';
          if (!processedMunicoes.has(calibreLower)) {
            materiais.push({
              qtd: String(m.quantidade).padStart(2, '0'),
              nome: `Munições ${m.calibre || ''}`.trim(),
              modelo: '-',
              serie: '-'
            });
          }
        } else if (m.categoria === 'Colete Balístico') {
          // Colete - nome + tamanho + sexo
          const sexoAbrev = m.sexo === 'Masculino' ? 'Masc' : m.sexo === 'Feminino' ? 'Fem' : '';
          materiais.push({
            qtd: '01',
            nome: `${m.nome || 'Colete balístico'} Tamanho ${m.tamanhoColete || '-'} ${sexoAbrev}`.trim(),
            modelo: m.fabricante || '-',
            serie: m.numeroSerie || '-'
          });
        } else {
          // Outros materiais genéricos
          materiais.push({
            qtd: String(m.quantidade || 1).padStart(2, '0'),
            nome: m.nome || '-',
            modelo: m.fabricante || m.modelo || '-',
            serie: m.numeroSerie || '-'
          });
        }
      });

      // Converter itensAdicionais para array de strings (a Cloud Function espera strings)
      const itensAdicionaisStrings = itensAdicionais.map(item => item.descricao);

      // Resolver dados atuais do policial
      const dadosAtuais = policiaisMap.get(transferencia.policialId || '');
      const gradAtual = dadosAtuais?.postGrad || transferencia.policialPatente;
      const nomeAtual = dadosAtuais?.nome || transferencia.policialNome;

      const response = await fetch('https://gerartermoentregadocx-owvlmrnsjq-uc.a.run.app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policial: {
            grad: gradAtual,
            nome: nomeAtual,
            matricula: transferencia.policialMatricula
          },
          numeroTermo,
          dataAtual: new Date().toLocaleDateString('pt-BR'),
          transferidoPara: transferencia.localDestino,
          publicacao: transferencia.publicacao,
          materiais,
          itensAdicionais: itensAdicionaisStrings,
          // Um só arquivo: Termo na 1ª página, Nada Consta (mesmo número) em seguida
          incluirNadaConsta: true,
          numeroNadaConsta: numeroTermo
        })
      });

      if (!response.ok) throw new Error('Erro ao gerar documento');

      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(await response.blob());
      link.download = `Termo-Entrega-e-Nada-Consta-${transferencia.policialNome.replace(/\s+/g, '_')}.docx`;
      link.click();

      const dataGeracao = new Date();
      await updateDoc(doc(db, 'transferencias_policiais', transferenciaId), {
        'documentosGerados.termoEntrega': { gerado: true, numeroTermo, dataGeracao, itensAdicionais },
        'documentosGerados.nadaConsta': { gerado: true, numeroNadaConsta: numeroTermo, dataGeracao }
      });
      await registrarNumeroUsado(numeroTermo);

      toast.success('Termo de Entrega e Nada Consta gerados!');
      setItensAdicionais([]);
      if (onGerado) return onGerado();
      setTransferenciaId('');
      loadTransferencias();
    } catch (error) {
      console.error('Erro ao gerar documento:', error);
      toast.error('Erro ao gerar documento');
    } finally {
      setLoading(false);
    }
  };

  const selectedTransferencia = transferencias.find((t) => t.id === transferenciaId);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Gerar Termo de Entrega
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Documento para registro de entrega de materiais por policial transferido. O Nada Consta é gerado junto, com o mesmo número.
          </p>

          <div>
            <Label>Selecionar Policial Transferido</Label>
            <Select value={transferenciaId} onValueChange={setTransferenciaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {transferencias.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                    {resolverNome(t.policialId, t.policialPatente, t.policialNome)} - {t.localDestino} (
                    {t.dataTransferencia.toLocaleDateString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTransferencia && (
            <>
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm">
                  <strong>Policial:</strong> {resolverNome(selectedTransferencia.policialId, selectedTransferencia.policialPatente, selectedTransferencia.policialNome)}
                </p>
                <p className="text-sm">
                  <strong>Matrícula:</strong> {selectedTransferencia.policialMatricula}
                </p>
                <p className="text-sm">
                  <strong>Transferido para:</strong> {selectedTransferencia.localDestino}
                </p>
                <p className="text-sm">
                  <strong>Publicação:</strong> {selectedTransferencia.publicacao}
                </p>
              </div>

              <div>
                <Label htmlFor="numeroTermo">Número do Termo e do Nada Consta (sugerido automaticamente)</Label>
                <Input
                  id="numeroTermo"
                  placeholder="Ex: 015"
                  value={numeroTermo}
                  onChange={(e) => setNumeroTermo(e.target.value)}
                />
              </div>

              {/* Materiais Devolvidos */}
              {selectedTransferencia.materiaisDevolvidos.length > 0 && (
                <div>
                  <Label className="mb-2">Materiais Devolvidos da Cautela</Label>
                  <div className="space-y-2">
                    {selectedTransferencia.materiaisDevolvidos.map((m, i) => (
                      <div key={i} className="p-2 border rounded text-sm">
                        <Badge variant="outline" className="mb-1">
                          {m.categoria}
                        </Badge>
                        <p>
                          {m.nome} - {m.fabricante} {m.modelo} - N/S: {m.numeroSerie}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Itens Adicionais */}
              <div>
                <Label className="mb-2">Itens Adicionais</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const tamanho = prompt('Tamanho das botas:');
                      if (tamanho) adicionarItemPredefinido('botas', tamanho);
                    }}
                  >
                    + Botas
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => adicionarItemPredefinido('esporas')}>
                    + Esporas
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => adicionarItemPredefinido('capacete-antitumulto')}
                  >
                    + Cap. Antitumulto
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => adicionarItemPredefinido('capacete-pomont')}
                  >
                    + Cap. POMont
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const tamanho = prompt('Tamanho da calça:');
                      if (tamanho) adicionarItemPredefinido('calca', tamanho);
                    }}
                  >
                    + Calça Camuflado
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const tamanho = prompt('Tamanho da gandola:');
                      if (tamanho) adicionarItemPredefinido('gandola', tamanho);
                    }}
                  >
                    + Gandola Camuflado
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => adicionarItemPredefinido('exosqueleto')}
                  >
                    + Exosqueleto
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => adicionarItemPredefinido('joelheira')}
                  >
                    + Joelheira
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => adicionarItemPredefinido('cotoveleira')}
                  >
                    + Cotoveleira
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => adicionarItemPredefinido('kit-manutencao')}
                  >
                    + Kit Manutenção
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowModalItem(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Outros
                  </Button>
                </div>

                {itensAdicionais.length > 0 && (
                  <div className="space-y-2">
                    {itensAdicionais.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{item.descricao}</span>
                        <Button variant="ghost" size="icon" onClick={() => removerItem(i)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button onClick={handleGerar} disabled={loading} className="w-full">
                {loading ? 'Gerando...' : 'Gerar Termo + Nada Consta'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal Item Customizado */}
      <Dialog open={showModalItem} onOpenChange={setShowModalItem}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Item Customizado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="itemCustomizado">Descrição do Item</Label>
              <Input
                id="itemCustomizado"
                placeholder="Ex: 01 (um) cassetete retrátil"
                value={itemCustomizado}
                onChange={(e) => setItemCustomizado(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModalItem(false)}>
              Cancelar
            </Button>
            <Button onClick={adicionarItemCustomizado}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GerarTermoEntregaForm;
