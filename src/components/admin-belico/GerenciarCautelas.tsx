import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  UserCheck, 
  FileText, 
  Download,
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  Plus,
  Target
} from 'lucide-react';
import { collection, getDocs, query, where, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from 'sonner';
import NovaCautelaForm from './NovaCautelaForm';

interface Cautela {
  id: string;
  numeroCautela?: string;
  numeroSequencial?: number;
  policialId: string;
  policialNome: string;
  policialPatente?: string;
  policialMatricula: string;
  numeral?: number;
  materiais: Array<{
    materialId: string;
    nome: string;
    categoria: string;
    numeroSerie?: string;
    quantidade: number;
    datadeVencimento?: string;
    tamanhoColete?: string;
    sexo?: string;
    fabricante?: string;
    modelo?: string;
    calibre?: string;
    subcategoria?: string;
    quantidadeCarregadores?: number;
    quantidadeMunicoes?: number;
    calibreMunicao?: string;
  }>;
  dataInicio: Date;
  dataFim?: Date;
  status: 'ativa' | 'finalizada' | 'vencida';
  tipoDocumento: 'permanente' | 'temporaria';
  assinatura: {
    matricula: string;
    timestamp: Date;
  };
  observacoes?: string;
  documentoGerado?: boolean;
  sexo?: string;
  tamanhoColete?: string;
  fabricante?: string;
}

const GerenciarCautelas = () => {
  const [cautelas, setCautelas] = useState<Cautela[]>([]);
  const [filtro, setFiltro] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [tipoFiltro, setTipoFiltro] = useState('todos');
  const [cautelaDetalhes, setCautelaDetalhes] = useState<Cautela | null>(null);
  const [showNovaForm, setShowNovaForm] = useState(false);

  useEffect(() => {
    loadCautelas();
  }, []);

  const loadCautelas = async () => {
    try {
      const q = query(collection(db, 'cautelas_permanentes'), orderBy('dataInicio', 'desc'));
      const querySnapshot = await getDocs(q);
      const cautelasData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dataInicio: doc.data().dataInicio?.toDate() || new Date(),
        dataFim: doc.data().dataFim?.toDate(),
        assinatura: {
          ...doc.data().assinatura,
          timestamp: doc.data().assinatura?.timestamp?.toDate() || new Date()
        }
      } as Cautela));
      setCautelas(cautelasData);
    } catch (error) {
      console.error('Erro ao carregar cautelas:', error);
      // Mock data for development
      setCautelas([
        {
          id: '1',
          policialId: '1',
          policialNome: 'João Silva Santos',
          policialMatricula: '123456',
          materiais: [
            { materialId: '1', nome: 'Pistola .40', categoria: 'Armamento', numeroSerie: 'BR001', quantidade: 1 },
            { materialId: '2', nome: 'Colete Balístico', categoria: 'EPI', quantidade: 1 }
          ],
          dataInicio: new Date('2024-01-15'),
          status: 'ativa',
          tipoDocumento: 'permanente',
          assinatura: {
            matricula: '123456',
            timestamp: new Date('2024-01-15')
          },
          documentoGerado: true
        },
        {
          id: '2',
          policialId: '2',
          policialNome: 'Maria Oliveira Costa',
          policialMatricula: '123457',
          materiais: [
            { materialId: '3', nome: 'Espingarda 12', categoria: 'Armamento', numeroSerie: 'ES001', quantidade: 1 }
          ],
          dataInicio: new Date('2024-02-01'),
          dataFim: new Date('2024-02-15'),
          status: 'finalizada',
          tipoDocumento: 'temporaria',
          assinatura: {
            matricula: '123457',
            timestamp: new Date('2024-02-01')
          },
          documentoGerado: true
        }
      ]);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativa':
        return <Badge variant="default">Ativa</Badge>;
      case 'finalizada':
        return <Badge variant="secondary">Finalizada</Badge>;
      case 'vencida':
        return <Badge variant="destructive">Vencida</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'permanente':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Permanente</Badge>;
      case 'temporaria':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Temporária</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  const finalizarCautela = async (cautelaId: string) => {
    if (!confirm('Tem certeza que deseja finalizar esta cautela?')) return;

    try {
      await updateDoc(doc(db, 'cautelas_permanentes', cautelaId), {
        status: 'finalizada',
        dataFim: new Date()
      });
      toast.success('Cautela finalizada com sucesso');
      loadCautelas();
    } catch (error) {
      console.error('Erro ao finalizar cautela:', error);
      toast.error('Erro ao finalizar cautela');
    }
  };

  const gerarDocumento = async (cautela: Cautela) => {
    try {
      console.log('Gerando documento para cautela:', cautela.numeroCautela);
      console.log('Dados da cautela completa:', cautela);
      
      const response = await fetch('https://gerarcauteladocx-owvlmrnsjq-uc.a.run.app', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          numeroCautela: cautela.numeroCautela || 'S/N',
          policial: {
            nome: cautela.policialNome,
            matricula: cautela.policialMatricula,
            grad: cautela.policialPatente || '',
            numeral: cautela.numeral || ''
          },
          materiais: cautela.materiais.map(material => ({
            nome: material.nome || '',
            categoria: material.categoria || '',
            subcategoria: material.subcategoria || '',
            fabricante: material.fabricante || '',
            modelo: material.modelo || '',
            calibre: material.calibre || '',
            calibreMunicao: material.calibreMunicao || '',
            sexo: material.sexo || '',
            tamanhoColete: material.tamanhoColete || '',
            numeroSerie: material.numeroSerie || '',
            quantidade: material.quantidade || 1,
            quantidadeCarregadores: material.quantidadeCarregadores || 0,
            quantidadeMunicoes: material.quantidadeMunicoes || 0
          }))
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na resposta:', errorText);
        throw new Error(`Erro ao gerar o documento: ${errorText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      const nomeArquivo = `Cautela-${cautela.policialNome.replace(/\s+/g, '_')}-${Date.now()}.docx`;
      link.href = url;
      link.setAttribute('download', nomeArquivo);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);

      toast.success('Documento gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar documento:', error);
      toast.error('Erro ao gerar documento. Verifique os dados e tente novamente.');
    }
  };


  const cautelasFiltradas = cautelas.filter(cautela => {
    const matchNome = cautela.policialNome?.toLowerCase().includes(filtro.toLowerCase()) || false;
    const matchMatricula = cautela.policialMatricula?.includes(filtro) || false;
    const matchStatus = statusFiltro === 'todos' || statusFiltro === '' || cautela.status === statusFiltro;
    const matchTipo = tipoFiltro === 'todos' || tipoFiltro === '' || cautela.tipoDocumento === tipoFiltro;
    
    return (matchNome || matchMatricula) && matchStatus && matchTipo;
  });

  const estatisticas = {
    total: cautelas.length,
    ativas: cautelas.filter(c => c.status === 'ativa').length,
    finalizadas: cautelas.filter(c => c.status === 'finalizada').length,
    vencidas: cautelas.filter(c => c.status === 'vencida').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Cautelas Permanentes</h3>
          <p className="text-sm text-muted-foreground">
            Gerenciar cautelas permanentes de materiais bélicos aos policiais
          </p>
        </div>
        <Button onClick={() => setShowNovaForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nova Cautela Permanente
        </Button>
      </div>

      {/* Form para Nova Cautela */}
      {showNovaForm && (
        <NovaCautelaForm 
          onClose={() => setShowNovaForm(false)}
          onSuccess={() => {
            setShowNovaForm(false);
            loadCautelas();
          }}
        />
      )}

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <FileText className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{estatisticas.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{estatisticas.ativas}</p>
            <p className="text-xs text-muted-foreground">Ativas</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{estatisticas.finalizadas}</p>
            <p className="text-xs text-muted-foreground">Finalizadas</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{estatisticas.vencidas}</p>
            <p className="text-xs text-muted-foreground">Vencidas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou matrícula..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="ativa">Ativa</SelectItem>
                <SelectItem value="finalizada">Finalizada</SelectItem>
                <SelectItem value="vencida">Vencida</SelectItem>
              </SelectContent>
            </Select>

            <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="permanente">Permanente</SelectItem>
                <SelectItem value="temporaria">Temporária</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Badge variant="outline">
                Exibindo: {cautelasFiltradas.length} de {cautelas.length}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cautelas Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Cautelas Registradas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Cautela</TableHead>
                  <TableHead>Policial</TableHead>
                  <TableHead>Materiais</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Início</TableHead>
                  <TableHead>Data Fim</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cautelasFiltradas.map(cautela => (
                  <TableRow key={cautela.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {cautela.numeroCautela || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{cautela.policialNome}</p>
                        <p className="text-sm text-muted-foreground">Mat: {cautela.policialMatricula}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {cautela.materiais.slice(0, 2).map((material, index) => (
                          <p key={index} className="text-sm text-foreground">
                            {material.nome} 
                            {material.numeroSerie && ` (${material.numeroSerie})`}
                          </p>
                        ))}
                        {cautela.materiais.length > 2 && (
                          <p className="text-xs text-muted-foreground">
                            +{cautela.materiais.length - 2} mais...
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getTipoBadge(cautela.tipoDocumento)}</TableCell>
                    <TableCell>{getStatusBadge(cautela.status)}</TableCell>
                    <TableCell className="text-sm">
                      {cautela.dataInicio.toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {cautela.dataFim ? cautela.dataFim.toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setCautelaDetalhes(cautela)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => gerarDocumento(cautela)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>

                        {cautela.status === 'ativa' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => finalizarCautela(cautela.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Details Modal */}
      {cautelaDetalhes && (
        <Card className="bg-primary/10 border-primary">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Detalhes da Cautela
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Dados do Policial</h4>
                  <p><strong>Nome:</strong> {cautelaDetalhes.policialNome}</p>
                  <p><strong>Matrícula:</strong> {cautelaDetalhes.policialMatricula}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Dados da Cautela</h4>
                  <p><strong>Número:</strong> {cautelaDetalhes.numeroCautela || '-'}</p>
                  <p><strong>Tipo:</strong> {cautelaDetalhes.tipoDocumento}</p>
                  <p><strong>Status:</strong> {cautelaDetalhes.status}</p>
                  <p><strong>Data Início:</strong> {cautelaDetalhes.dataInicio.toLocaleString()}</p>
                  {cautelaDetalhes.dataFim && (
                    <p><strong>Data Fim:</strong> {cautelaDetalhes.dataFim.toLocaleString()}</p>
                  )}
                </div>
              </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">Materiais Cautelados</h4>
                  <div className="space-y-2">
                    {cautelaDetalhes.materiais.map((material, index) => (
                      <div key={index}>
                        {/* Item principal */}
                        <div className="p-3 bg-muted rounded border">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-foreground">{material.nome}</p>
                              <p className="text-sm text-muted-foreground">{material.categoria}</p>
                              {material.numeroSerie && (
                                <p className="text-xs text-muted-foreground">Série: {material.numeroSerie}</p>
                              )}
                              {material.fabricante && (
                                <p className="text-xs text-muted-foreground">Fabricante: {material.fabricante}</p>
                              )}
                              {material.modelo && (
                                <p className="text-xs text-muted-foreground">Modelo: {material.modelo}</p>
                              )}
                              {material.calibre && (
                                <p className="text-xs text-muted-foreground">Calibre: {material.calibre}</p>
                              )}
                              {material.datadeVencimento && (
                                <p className="text-xs text-muted-foreground">Data de Vencimento: {material.datadeVencimento}</p>
                              )}
                            </div>
                            <Badge variant="outline">Qtd: {material.quantidade ? material.quantidade : 1}</Badge>
                          </div>
                        </div>
                        
                        {/* Se for armamento e tiver carregadores/munições, exibir como itens separados */}
                        {material.categoria === 'Armamento' && (
                          <>
                            {material.quantidadeCarregadores && material.quantidadeCarregadores > 0 && (
                              <div className="p-3 bg-muted/70 rounded border mt-2 ml-4">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium text-foreground">
                                      Carregadores {material.calibre || material.calibreMunicao || ''} {material.modelo ? `- ${material.modelo}` : ''}
                                    </p>
                                    <p className="text-sm text-muted-foreground">Acessório</p>
                                    {material.fabricante && (
                                      <p className="text-xs text-muted-foreground">Fabricante: {material.fabricante}</p>
                                    )}
                                  </div>
                                  <Badge variant="outline">Qtd: {material.quantidadeCarregadores}</Badge>
                                </div>
                              </div>
                            )}
                            
                            {material.quantidadeMunicoes && material.quantidadeMunicoes > 0 && (
                              <div className="p-3 bg-muted/70 rounded border mt-2 ml-4">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium text-foreground">
                                      Munição {material.calibreMunicao || material.calibre || ''}
                                    </p>
                                    <p className="text-sm text-muted-foreground">Munição - Letal</p>
                                    {(material.calibreMunicao || material.calibre) && (
                                      <p className="text-xs text-muted-foreground">Calibre: {material.calibreMunicao || material.calibre}</p>
                                    )}
                                  </div>
                                  <Badge variant="outline">Qtd: {material.quantidadeMunicoes}</Badge>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">Assinatura Eletrônica</h4>
                <p><strong>Matrícula:</strong> {cautelaDetalhes.assinatura.matricula}</p>
                <p><strong>Data/Hora:</strong> {cautelaDetalhes.assinatura.timestamp.toLocaleString()}</p>
              </div>

              {cautelaDetalhes.observacoes && (
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Observações</h4>
                  <p className="text-muted-foreground">{cautelaDetalhes.observacoes}</p>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={() => gerarDocumento(cautelaDetalhes)} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Gerar Documento
                </Button>
                <Button variant="outline" onClick={() => setCautelaDetalhes(null)}>
                  Fechar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GerenciarCautelas;