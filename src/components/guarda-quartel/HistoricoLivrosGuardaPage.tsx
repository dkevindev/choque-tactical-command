import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Plus, FileText, Download, Eye, BookOpen } from 'lucide-react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from 'sonner';

interface LivroGuardaHistorico {
  id: string;
  data: string;
  dataCriacao: any;
  status: 'em_andamento' | 'finalizado';
  oficialResponsavel: string;
}

const HistoricoLivrosGuardaPage = () => {
  const navigate = useNavigate();
  const [livros, setLivros] = useState<LivroGuardaHistorico[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<string>('todos');

  useEffect(() => {
    carregarLivros();
  }, []);

  const carregarLivros = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'livros_guarda'),
        orderBy('data', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const livrosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LivroGuardaHistorico[];
      
      setLivros(livrosData);
    } catch (error) {
      console.error('Erro ao carregar livros:', error);
      toast.error('Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = async () => {
    setLoading(true);
    try {
      let q = query(collection(db, 'livros_guarda'), orderBy('data', 'desc'));
      
      // Aplicar filtros conforme necessário
      const snapshot = await getDocs(q);
      let livrosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LivroGuardaHistorico[];
      
      // Filtrar por data
      if (dataInicial) {
        livrosData = livrosData.filter(l => l.data >= dataInicial);
      }
      if (dataFinal) {
        livrosData = livrosData.filter(l => l.data <= dataFinal);
      }
      
      // Filtrar por status
      if (statusFiltro !== 'todos') {
        livrosData = livrosData.filter(l => l.status === statusFiltro);
      }
      
      setLivros(livrosData);
    } catch (error) {
      console.error('Erro ao aplicar filtros:', error);
      toast.error('Erro ao filtrar livros');
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (data: string) => {
    if (!data) return '-';
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  const formatarDataHora = (timestamp: any) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('pt-BR');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/admin-dashboard')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <BookOpen className="h-6 w-6" />
                  Histórico de Livros da Guarda
                </h1>
                <p className="text-sm text-muted-foreground">
                  Consulte e gerencie livros anteriores
                </p>
              </div>
            </div>
            <Button onClick={() => navigate('/guarda-quartel')}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Livro
            </Button>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="container mx-auto px-4 py-8">
        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="dataInicial">Data Inicial</Label>
                <Input
                  id="dataInicial"
                  type="date"
                  value={dataInicial}
                  onChange={(e) => setDataInicial(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="dataFinal">Data Final</Label>
                <Input
                  id="dataFinal"
                  type="date"
                  value={dataFinal}
                  onChange={(e) => setDataFinal(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="finalizado">Finalizados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={aplicarFiltros} className="w-full">
                  Filtrar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardContent className="p-6">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando livros...
              </div>
            ) : livros.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum livro encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data de Criação</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {livros.map((livro) => (
                      <TableRow key={livro.id}>
                        <TableCell className="font-medium">
                          {formatarData(livro.data)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={livro.status === 'finalizado' ? 'default' : 'secondary'}
                          >
                            {livro.status === 'finalizado' ? 'Finalizado' : 'Em Andamento'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatarDataHora(livro.dataCriacao)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toast.info('Visualização será implementada em breve')}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                            </Button>
                            {livro.status === 'finalizado' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toast.info('Download será implementado em breve')}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                DOCX
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default HistoricoLivrosGuardaPage;
