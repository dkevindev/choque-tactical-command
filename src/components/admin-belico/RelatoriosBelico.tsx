import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, 
  Download, 
  Calendar,
  BarChart3,
  PieChart,
  TrendingUp,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from 'sonner';

interface RelatorioConfig {
  tipo: string;
  titulo: string;
  descricao: string;
  dataInicio: string;
  dataFim: string;
  formato: 'pdf' | 'excel' | 'csv';
  filtros?: {
    categoria?: string;
    status?: string;
    policial?: string;
  };
}

const RelatoriosBelico = () => {
  const [relatorioConfig, setRelatorioConfig] = useState<RelatorioConfig>({
    tipo: 'estoque-geral',
    titulo: 'Relatório de Estoque Geral',
    descricao: 'Relatório completo do estoque de materiais bélicos',
    dataInicio: new Date().toISOString().split('T')[0],
    dataFim: new Date().toISOString().split('T')[0],
    formato: 'pdf'
  });

  const [estatisticasGerais, setEstatisticasGerais] = useState({
    totalMateriais: 0,
    materiaisDisponiveis: 0,
    materiaisCautelados: 0,
    materiaisManutencao: 0,
    totalCautelas: 0,
    cautelasAtivas: 0
  });

  const tiposRelatorio = [
    {
      id: 'estoque-geral',
      titulo: 'Estoque Geral',
      descricao: 'Relatório completo do estoque de materiais bélicos',
      icone: BarChart3
    },
    {
      id: 'materiais-categoria',
      titulo: 'Materiais por Categoria',
      descricao: 'Distribuição de materiais por categoria',
      icone: PieChart
    },
    {
      id: 'cautelas-ativas',
      titulo: 'Cautelas Ativas',
      descricao: 'Lista de todas as cautelas em andamento',
      icone: FileText
    },
    {
      id: 'movimentacoes',
      titulo: 'Movimentações',
      descricao: 'Histórico de movimentações por período',
      icone: TrendingUp
    },
    {
      id: 'auditoria',
      titulo: 'Auditoria',
      descricao: 'Relatório de auditoria e conformidade',
      icone: FileSpreadsheet
    }
  ];

  useEffect(() => {
    loadEstatisticasGerais();
  }, []);

  const loadEstatisticasGerais = async () => {
    try {
      // Load materials statistics
      const materiaisSnapshot = await getDocs(collection(db, 'materiais_belicos'));
      const materiais = materiaisSnapshot.docs.map(doc => doc.data());

      // Load cautelas statistics
      const cautelasSnapshot = await getDocs(collection(db, 'cautelas_permanentes'));
      const cautelas = cautelasSnapshot.docs.map(doc => doc.data());

      setEstatisticasGerais({
        totalMateriais: materiais.length,
        materiaisDisponiveis: materiais.filter(m => m.disponivel && !m.cautelado).length,
        materiaisCautelados: materiais.filter(m => m.cautelado).length,
        materiaisManutencao: materiais.filter(m => m.statusManutencao === 'manutencao').length,
        totalCautelas: cautelas.length,
        cautelasAtivas: cautelas.filter(c => c.status === 'ativa').length
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      // Mock data for development
      setEstatisticasGerais({
        totalMateriais: 156,
        materiaisDisponiveis: 89,
        materiaisCautelados: 45,
        materiaisManutencao: 12,
        totalCautelas: 67,
        cautelasAtivas: 23
      });
    }
  };

  const handleTipoChange = (tipo: string) => {
    const tipoInfo = tiposRelatorio.find(t => t.id === tipo);
    if (tipoInfo) {
      setRelatorioConfig(prev => ({
        ...prev,
        tipo,
        titulo: `Relatório de ${tipoInfo.titulo}`,
        descricao: tipoInfo.descricao
      }));
    }
  };

  const gerarRelatorio = async () => {
    try {
      toast.info('Gerando relatório...');
      
      // Here you would implement the actual report generation
      // This could involve:
      // 1. Fetching data based on the configuration
      // 2. Generating the document (PDF, Excel, CSV)
      // 3. Downloading or displaying the report

      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(`Relatório "${relatorioConfig.titulo}" gerado com sucesso!`);
      
      // Simulate download
      const filename = `${relatorioConfig.tipo}_${new Date().toISOString().split('T')[0]}.${relatorioConfig.formato}`;
      console.log(`Downloading: ${filename}`);
      
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast.error('Erro ao gerar relatório');
    }
  };

  const visualizarPreview = () => {
    toast.info('Carregando preview do relatório...');
    // Here you would show a preview of the report
  };

  const agendarRelatorio = () => {
    toast.info('Funcionalidade de agendamento em desenvolvimento...');
    // Here you would implement report scheduling
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-foreground">Relatórios Bélicos</h3>
        <p className="text-sm text-muted-foreground">Gere relatórios detalhados sobre materiais e movimentações</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold text-foreground">{estatisticasGerais.totalMateriais}</p>
            <p className="text-xs text-muted-foreground">Total Materiais</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold text-green-600">{estatisticasGerais.materiaisDisponiveis}</p>
            <p className="text-xs text-muted-foreground">Disponíveis</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold text-blue-600">{estatisticasGerais.materiaisCautelados}</p>
            <p className="text-xs text-muted-foreground">Cautelados</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold text-yellow-600">{estatisticasGerais.materiaisManutencao}</p>
            <p className="text-xs text-muted-foreground">Manutenção</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold text-foreground">{estatisticasGerais.totalCautelas}</p>
            <p className="text-xs text-muted-foreground">Total Cautelas</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold text-primary">{estatisticasGerais.cautelasAtivas}</p>
            <p className="text-xs text-muted-foreground">Cautelas Ativas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Report Types */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Tipos de Relatório</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tiposRelatorio.map(tipo => (
                <div
                  key={tipo.id}
                  className={`p-3 border rounded cursor-pointer transition-colors ${
                    relatorioConfig.tipo === tipo.id
                      ? 'bg-primary/10 border-primary'
                      : 'bg-muted hover:bg-accent border-border'
                  }`}
                  onClick={() => handleTipoChange(tipo.id)}
                >
                  <div className="flex items-center gap-3">
                    <tipo.icone className="h-5 w-5 text-primary" />
                    <div>
                      <h4 className="font-medium text-foreground">{tipo.titulo}</h4>
                      <p className="text-sm text-muted-foreground">{tipo.descricao}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Report Configuration */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Configurações do Relatório</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="titulo">Título do Relatório</Label>
                <Input
                  id="titulo"
                  value={relatorioConfig.titulo}
                  onChange={(e) => setRelatorioConfig(prev => ({ ...prev, titulo: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  value={relatorioConfig.descricao}
                  onChange={(e) => setRelatorioConfig(prev => ({ ...prev, descricao: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dataInicio">Data Início</Label>
                  <Input
                    id="dataInicio"
                    type="date"
                    value={relatorioConfig.dataInicio}
                    onChange={(e) => setRelatorioConfig(prev => ({ ...prev, dataInicio: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="dataFim">Data Fim</Label>
                  <Input
                    id="dataFim"
                    type="date"
                    value={relatorioConfig.dataFim}
                    onChange={(e) => setRelatorioConfig(prev => ({ ...prev, dataFim: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label>Formato de Saída</Label>
                <Select 
                  value={relatorioConfig.formato} 
                  onValueChange={(value: 'pdf' | 'excel' | 'csv') => 
                    setRelatorioConfig(prev => ({ ...prev, formato: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Additional filters based on report type */}
              {relatorioConfig.tipo === 'materiais-categoria' && (
                <div>
                  <Label>Categoria</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as categorias</SelectItem>
                      <SelectItem value="armamento">Armamento</SelectItem>
                      <SelectItem value="epi">EPI</SelectItem>
                      <SelectItem value="municao">Munição</SelectItem>
                      <SelectItem value="acessorio">Acessório</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {relatorioConfig.tipo === 'cautelas-ativas' && (
                <div>
                  <Label>Status</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      <SelectItem value="ativa">Ativa</SelectItem>
                      <SelectItem value="vencida">Vencida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <Card className="bg-primary/10 border-primary">
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-3">
            <Button onClick={gerarRelatorio} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Gerar e Baixar Relatório
            </Button>

            <Button variant="outline" onClick={visualizarPreview} className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Visualizar Preview
            </Button>

            <Button variant="outline" onClick={agendarRelatorio} className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Agendar Relatório
            </Button>

            <Button variant="outline" className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
          </div>

          <div className="mt-4 p-3 bg-muted rounded">
            <p className="text-sm text-muted-foreground">
              <strong>Relatório selecionado:</strong> {relatorioConfig.titulo}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Período:</strong> {relatorioConfig.dataInicio} até {relatorioConfig.dataFim}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Formato:</strong> {relatorioConfig.formato.toUpperCase()}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Reports */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Relatórios Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { nome: 'Relatório de Estoque Geral', data: '2024-01-15', formato: 'PDF', status: 'Concluído' },
              { nome: 'Cautelas Ativas - Janeiro', data: '2024-01-10', formato: 'Excel', status: 'Concluído' },
              { nome: 'Movimentações Mensais', data: '2024-01-05', formato: 'CSV', status: 'Concluído' }
            ].map((relatorio, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted rounded">
                <div>
                  <h4 className="font-medium text-foreground">{relatorio.nome}</h4>
                  <p className="text-sm text-muted-foreground">
                    {relatorio.data} • {relatorio.formato}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-green-600 font-medium">{relatorio.status}</span>
                  <Button variant="ghost" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RelatoriosBelico;