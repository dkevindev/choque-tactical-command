import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PackageMinus, Search, Eye, Trash2 } from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import MateriaisTransferidosCarga from './MateriaisTransferidosCarga';
import BaixaMaterialCargaModal from './BaixaMaterialCargaModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface BaixaMaterial {
  id: string;
  materialId: string;
  nome: string;
  numeroSerie: string;
  categoria: string;
  fabricante: string;
  modelo: string;
  vencimento: string;
  sexo: string;
  tamanhoColete: string;
  motivoBaixa: string;
  destino: string;
  observacoes: string;
  policialCauteladoNome: string;
  policialCauteladoMatricula: string;
  dataBaixa: Date;
}

const SaiuDaCarga = () => {
  const [baixas, setBaixas] = useState<BaixaMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [motivoFiltro, setMotivoFiltro] = useState('todos');
  const [detalhes, setDetalhes] = useState<BaixaMaterial | null>(null);

  useEffect(() => {
    carregarBaixas();
  }, []);

  const carregarBaixas = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'baixas_materiais'), orderBy('dataBaixa', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dataBaixa: doc.data().dataBaixa?.toDate() || new Date()
      })) as BaixaMaterial[];
      setBaixas(data);
    } catch (error) {
      console.error('Erro ao carregar baixas:', error);
    } finally {
      setLoading(false);
    }
  };

  const baixasFiltradas = baixas.filter(b => {
    const matchTexto = 
      b.nome?.toLowerCase().includes(filtro.toLowerCase()) ||
      b.numeroSerie?.toLowerCase().includes(filtro.toLowerCase()) ||
      b.policialCauteladoNome?.toLowerCase().includes(filtro.toLowerCase());
    const matchMotivo = motivoFiltro === 'todos' || b.motivoBaixa === motivoFiltro;
    return matchTexto && matchMotivo;
  });

  const getMotivoBadge = (motivo: string) => {
    switch (motivo) {
      case 'Vencimento': return <Badge variant="destructive">Vencimento</Badge>;
      case 'Inservível': return <Badge variant="destructive">Inservível</Badge>;
      case 'Avaria': return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">Avaria</Badge>;
      case 'Extravio': return <Badge className="bg-red-700 hover:bg-red-800 text-white">Extravio</Badge>;
      default: return <Badge variant="secondary">{motivo}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="baixas" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transferidos">Transferidos</TabsTrigger>
          <TabsTrigger value="baixas">Baixa de Materiais</TabsTrigger>
        </TabsList>

        <TabsContent value="transferidos">
          <MateriaisTransferidosCarga />
        </TabsContent>

        <TabsContent value="baixas">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Baixa de Materiais</h3>
                <p className="text-sm text-muted-foreground">
                  Histórico de materiais removidos da carga
                </p>
              </div>
              <Button onClick={() => setShowModal(true)} className="gap-2">
                <PackageMinus className="h-4 w-4" />
                Dar Baixa em Materiais
              </Button>
            </div>

            {/* Filtros */}
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome, N/S ou policial..."
                      value={filtro}
                      onChange={(e) => setFiltro(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={motivoFiltro} onValueChange={setMotivoFiltro}>
                    <SelectTrigger>
                      <SelectValue placeholder="Motivo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os Motivos</SelectItem>
                      <SelectItem value="Vencimento">Vencimento</SelectItem>
                      <SelectItem value="Inservível">Inservível</SelectItem>
                      <SelectItem value="Avaria">Avaria</SelectItem>
                      <SelectItem value="Extravio">Extravio</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center">
                    <Badge variant="outline">
                      {baixasFiltradas.length} de {baixas.length} registros
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabela */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Material</TableHead>
                        <TableHead>N/S</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Destino</TableHead>
                        <TableHead>Cautelado Antes</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            Carregando...
                          </TableCell>
                        </TableRow>
                      ) : baixasFiltradas.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            Nenhum material com baixa registrada
                          </TableCell>
                        </TableRow>
                      ) : (
                        baixasFiltradas.map(b => (
                          <TableRow key={b.id}>
                            <TableCell className="text-sm">
                              {format(b.dataBaixa, 'dd/MM/yyyy', { locale: ptBR })}
                            </TableCell>
                            <TableCell className="font-medium">{b.nome}</TableCell>
                            <TableCell className="font-mono text-sm">{b.numeroSerie || '-'}</TableCell>
                            <TableCell>{b.categoria}</TableCell>
                            <TableCell>{getMotivoBadge(b.motivoBaixa)}</TableCell>
                            <TableCell className="text-sm">{b.destino || '-'}</TableCell>
                            <TableCell className="text-sm">{b.policialCauteladoNome || '-'}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => setDetalhes(b)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Modal de baixa */}
          <BaixaMaterialCargaModal
            open={showModal}
            onClose={() => setShowModal(false)}
            onSuccess={carregarBaixas}
          />

          {/* Modal de detalhes */}
          {detalhes && (
            <Dialog open={!!detalhes} onOpenChange={() => setDetalhes(null)}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Detalhes da Baixa</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Material</p>
                      <p className="font-medium">{detalhes.nome}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Nº Série</p>
                      <p className="font-mono">{detalhes.numeroSerie || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Categoria</p>
                      <p>{detalhes.categoria}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Fabricante</p>
                      <p>{detalhes.fabricante || '-'} {detalhes.modelo || ''}</p>
                    </div>
                    {detalhes.vencimento && (
                      <div>
                        <p className="text-xs text-muted-foreground">Vencimento</p>
                        <p>{new Date(detalhes.vencimento).toLocaleDateString('pt-BR')}</p>
                      </div>
                    )}
                    {detalhes.tamanhoColete && (
                      <div>
                        <p className="text-xs text-muted-foreground">Tamanho</p>
                        <p>{detalhes.tamanhoColete} - {detalhes.sexo}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Motivo</p>
                      {getMotivoBadge(detalhes.motivoBaixa)}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Destino</p>
                      <p>{detalhes.destino || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Data da Baixa</p>
                      <p>{format(detalhes.dataBaixa, 'dd/MM/yyyy', { locale: ptBR })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Cautelado Antes</p>
                      <p>{detalhes.policialCauteladoNome || 'Nenhum'}</p>
                    </div>
                  </div>
                  {detalhes.observacoes && (
                    <div>
                      <p className="text-xs text-muted-foreground">Observações</p>
                      <p className="text-sm">{detalhes.observacoes}</p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SaiuDaCarga;
