import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Eye, FileText } from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from 'sonner';

interface Material {
  materialId: string;
  nome: string;
  categoria: string;
  numeroSerie?: string;
  fabricante?: string;
  modelo?: string;
  calibre?: string;
  quantidade: number;
  [key: string]: any;
}

interface Transferencia {
  id: string;
  policialNome: string;
  policialPatente: string;
  policialMatricula: string;
  numeral: number;
  dataTransferencia: Date;
  localDestino: string;
  publicacao: string;
  numeroCautelaOriginal: string;
  materiaisLevados: Material[];
  materiaisDevolvidos: Material[];
  documentosGerados?: {
    baixaCautela?: { gerado: boolean };
    transferenciaCautela?: { gerado: boolean };
    termoEntrega?: { gerado: boolean };
  };
  status: string;
}

const MateriaisTransferidos = () => {
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [filtroLocal, setFiltroLocal] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [detalhes, setDetalhes] = useState<Transferencia | null>(null);

  useEffect(() => {
    loadTransferencias();
  }, []);

  const loadTransferencias = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'transferencias_policiais'), orderBy('dataTransferencia', 'desc'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        dataTransferencia: doc.data().dataTransferencia?.toDate() || new Date(),
      })) as Transferencia[];
      setTransferencias(data);
    } catch (error) {
      console.error('Erro ao carregar transferências:', error);
      toast.error('Erro ao carregar transferências');
    } finally {
      setLoading(false);
    }
  };

  const locaisUnicos = [...new Set(transferencias.map(t => t.localDestino).filter(Boolean))];

  const transferenciasFiltradas = transferencias.filter((t) => {
    const matchTexto =
      t.policialNome?.toLowerCase().includes(filtro.toLowerCase()) ||
      t.policialMatricula?.toLowerCase().includes(filtro.toLowerCase()) ||
      t.publicacao?.toLowerCase().includes(filtro.toLowerCase());
    const matchLocal = filtroLocal === 'todos' || t.localDestino === filtroLocal;
    const matchStatus = filtroStatus === 'todos' || t.status === filtroStatus;
    return matchTexto && matchLocal && matchStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Pendente</Badge>;
      case 'concluida':
        return <Badge className="bg-green-600 hover:bg-green-700 text-white">Concluída</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Transferências de Policiais</h3>
        <p className="text-sm text-muted-foreground">
          Histórico de policiais transferidos e seus materiais
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por policial, matrícula ou publicação..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filtroLocal} onValueChange={setFiltroLocal}>
              <SelectTrigger>
                <SelectValue placeholder="Local de destino" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Destinos</SelectItem>
                {locaisUnicos.map((local) => (
                  <SelectItem key={local} value={local}>{local}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Policiais Transferidos</span>
            <Badge variant="outline">{transferenciasFiltradas.length} registros</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Policial</TableHead>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Publicação</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Materiais</TableHead>
                  <TableHead>Status</TableHead>
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
                ) : transferenciasFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Nenhuma transferência encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  transferenciasFiltradas.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">
                        {t.policialPatente} {t.policialNome}
                      </TableCell>
                      <TableCell className="text-sm">{t.policialMatricula}</TableCell>
                      <TableCell className="text-sm">{t.localDestino}</TableCell>
                      <TableCell className="text-sm">{t.publicacao}</TableCell>
                      <TableCell className="text-sm">
                        {t.dataTransferencia.toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-xs">
                            {t.materiaisLevados?.length || 0} levados
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {t.materiaisDevolvidos?.length || 0} devolvidos
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(t.status)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setDetalhes(t)}>
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

      {/* Modal de Detalhes */}
      {detalhes && (
        <Dialog open={!!detalhes} onOpenChange={() => setDetalhes(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes da Transferência</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Policial</h4>
                <p>{detalhes.policialPatente} {detalhes.policialNome}</p>
                <p className="text-sm text-muted-foreground">Matrícula: {detalhes.policialMatricula}</p>
                <p className="text-sm text-muted-foreground">Cautela Original: {detalhes.numeroCautelaOriginal}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium">Destino</p>
                  <p className="text-sm text-muted-foreground">{detalhes.localDestino}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Publicação</p>
                  <p className="text-sm text-muted-foreground">{detalhes.publicacao}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Data</p>
                  <p className="text-sm text-muted-foreground">{detalhes.dataTransferencia.toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Status</p>
                  {getStatusBadge(detalhes.status)}
                </div>
              </div>

              {detalhes.materiaisLevados?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Materiais Levados</h4>
                  <div className="space-y-2">
                    {detalhes.materiaisLevados.map((m, i) => (
                      <div key={i} className="p-2 border rounded">
                        <p className="font-medium">{m.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.numeroSerie && `N/S: ${m.numeroSerie}`}
                          {m.fabricante && ` — ${m.fabricante} ${m.modelo || ''}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detalhes.materiaisDevolvidos?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Materiais Devolvidos ao Batalhão</h4>
                  <div className="space-y-2">
                    {detalhes.materiaisDevolvidos.map((m, i) => (
                      <div key={i} className="p-2 border rounded">
                        <p className="font-medium">{m.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.numeroSerie && `N/S: ${m.numeroSerie}`}
                          {m.fabricante && ` — ${m.fabricante} ${m.modelo || ''}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detalhes.documentosGerados && (
                <div>
                  <h4 className="font-semibold mb-2">Documentos</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={detalhes.documentosGerados.baixaCautela?.gerado ? 'default' : 'outline'}>
                      <FileText className="h-3 w-3 mr-1" />
                      Baixa Cautela {detalhes.documentosGerados.baixaCautela?.gerado ? '✓' : '—'}
                    </Badge>
                    <Badge variant={detalhes.documentosGerados.transferenciaCautela?.gerado ? 'default' : 'outline'}>
                      <FileText className="h-3 w-3 mr-1" />
                      Transferência {detalhes.documentosGerados.transferenciaCautela?.gerado ? '✓' : '—'}
                    </Badge>
                    <Badge variant={detalhes.documentosGerados.termoEntrega?.gerado ? 'default' : 'outline'}>
                      <FileText className="h-3 w-3 mr-1" />
                      Termo Entrega {detalhes.documentosGerados.termoEntrega?.gerado ? '✓' : '—'}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default MateriaisTransferidos;
