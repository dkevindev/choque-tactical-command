import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileDown, Plus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { collection, getDocs, query, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from 'sonner';

interface ItemAdicional {
  descricao: string;
  tamanho?: string;
}

interface Transferencia {
  id: string;
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

const GerarTermoEntregaForm = () => {
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [transferenciaId, setTransferenciaId] = useState('');
  const [numeroTermo, setNumeroTermo] = useState('');
  const [itensAdicionais, setItensAdicionais] = useState<ItemAdicional[]>([]);
  const [showModalItem, setShowModalItem] = useState(false);
  const [itemCustomizado, setItemCustomizado] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTransferencias();
  }, []);

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
    let descricao = '- ';
    switch (item) {
      case 'botas':
        descricao += tamanho ? `01 (um) par de botas tamanho ${tamanho}` : '01 (um) par de botas';
        break;
      case 'esporas':
        descricao += '01 (um) par de esporas';
        break;
      case 'capacete-antitumulto':
        descricao += '01 (um) capacete antitumulto';
        break;
      case 'capacete-pomont':
        descricao += '01 (um) capacete de POMont';
        break;
      case 'calca':
        descricao += tamanho
          ? `01 (uma) calça camuflado digital tamanho ${tamanho}`
          : '01 (uma) calça camuflado digital';
        break;
      case 'gandola':
        descricao += tamanho
          ? `01 (uma) gandola camuflado digital tamanho ${tamanho}`
          : '01 (uma) gandola camuflado digital';
        break;
      case 'exosqueleto':
        descricao += '01 (um) exosqueleto';
        break;
      case 'joelheira':
        descricao += '01 (um) par de joelheira';
        break;
      case 'cotoveleira':
        descricao += '01 (um) par de cotoveleira';
        break;
      case 'kit-manutencao':
        descricao += 'caixa com kit manutenção';
        break;
    }
    descricao += '\n\n';
    setItensAdicionais([...itensAdicionais, { descricao }]);
  };

  const removerItem = (index: number) => {
    setItensAdicionais(itensAdicionais.filter((_, i) => i !== index));
  };

  const adicionarItemCustomizado = () => {
    if (itemCustomizado.trim()) {
      setItensAdicionais([...itensAdicionais, { descricao: `- ${itemCustomizado}\n\n` }]);
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
      // Formatar materiais
      const materiais = transferencia.materiaisDevolvidos.map((m, index) => {
        let descricaoCompleta = `- `;

        if (m.categoria === 'Armamento') {
          descricaoCompleta += `${m.nome || 'Pistola'}, Marca: ${m.fabricante || 'N/D'}, Modelo: ${
            m.modelo || 'N/D'
          }, Calibre: ${m.calibre || 'N/D'}, Nº Série: ${m.numeroSerie || 'N/D'}`;
          if (m.quantidadeCarregadores) {
            descricaoCompleta += `, com ${m.quantidadeCarregadores} carregador(es)`;
          }
          if (m.quantidadeMunicoes) {
            descricaoCompleta += ` e ${m.quantidadeMunicoes} munição(ões)`;
          }
        } else if (m.categoria === 'Colete Balístico') {
          descricaoCompleta += `Colete Balístico, Marca: ${m.fabricante || 'N/D'}, Nº Série: ${
            m.numeroSerie || 'N/D'
          }, Tamanho: ${m.tamanhoColete || 'N/D'}, Gênero: ${m.sexo || 'N/D'}, Vencimento: ${
            m.vencimento || 'N/D'
          }`;
        } else {
          descricaoCompleta += `${m.nome}, Marca: ${m.fabricante || 'N/D'}, Nº Série: ${
            m.numeroSerie || 'N/D'
          }`;
        }

        return { descricaoCompleta: descricaoCompleta + '\n\n' };
      });

      const response = await fetch('https://gerartermoentregadocx-owvlmrnsjq-uc.a.run.app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policial: {
            grad: transferencia.policialPatente,
            nome: transferencia.policialNome,
            matricula: transferencia.policialMatricula
          },
          numeroTermo,
          dataAtual: new Date().toLocaleDateString('pt-BR'),
          transferidoPara: transferencia.localDestino,
          publicacao: transferencia.publicacao,
          materiais,
          itensAdicionais
        })
      });

      if (!response.ok) throw new Error('Erro ao gerar documento');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Termo-Entrega-${transferencia.policialNome.replace(/\s+/g, '_')}.docx`;
      link.click();

      // Atualizar registro
      await updateDoc(doc(db, 'transferencias_policiais', transferenciaId), {
        'documentosGerados.termoEntrega': {
          gerado: true,
          numeroTermo,
          dataGeracao: new Date(),
          itensAdicionais
        }
      });

      toast.success('Documento gerado com sucesso!');
      setNumeroTermo('');
      setTransferenciaId('');
      setItensAdicionais([]);
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
            Documento para registro de entrega de materiais por policial transferido
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
                    {t.policialPatente} {t.policialNome} - {t.localDestino} (
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
                  <strong>Policial:</strong> {selectedTransferencia.policialPatente}{' '}
                  {selectedTransferencia.policialNome}
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
                <Label htmlFor="numeroTermo">Número do Termo</Label>
                <Input
                  id="numeroTermo"
                  placeholder="Ex: 001/2024-CPCHOQUE"
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
                {loading ? 'Gerando...' : 'Gerar Documento'}
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
