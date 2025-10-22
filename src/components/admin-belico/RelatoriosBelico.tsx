import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Filter } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from 'sonner';

interface Material {
  id: string;
  nome: string;
  categoria: string;
  numeroSerie?: string;
  modelo?: string;
  fabricante?: string;
  local: string;
  disponivel: boolean;
  cautelado?: boolean;
  cauteladoPara?: string;
  policialAssociadoNome?: string;
  // Campos específicos para coletes
  sexo?: string;
  vencimento?: string;
  tamanhoColete?: string;
  termoEntrega?: string;
  // Campos específicos para armas
  tipoArma?: string;
  calibre?: string;
  numeroSIARM?: string;
  quantidadeCarregadores?: number;
  quantidadeMunicoes?: number;
  [key: string]: any;
}

interface Filtros {
  numeroSerie: string;
  categoria: string;
  tipoArma: string;
  modelo: string;
  local: string;
  status: string;
}

const RelatoriosBelico = () => {
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [materiaisFiltrados, setMateriaisFiltrados] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState<Filtros>({
    numeroSerie: '',
    categoria: 'todas',
    tipoArma: 'todas',
    modelo: '',
    local: 'todas',
    status: 'todas'
  });

  useEffect(() => {
    loadMateriais();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [filtros, materiais]);

  const loadMateriais = async () => {
    try {
      setLoading(true);
      const materiaisSnapshot = await getDocs(collection(db, 'materiais_belicos'));
      const materiaisData = materiaisSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Material));

      setMateriais(materiaisData);
    } catch (error) {
      console.error('Erro ao carregar materiais:', error);
      toast.error('Erro ao carregar materiais');
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    let resultado = [...materiais];

    // Filtro por número de série
    if (filtros.numeroSerie) {
      resultado = resultado.filter(m => 
        m.numeroSerie?.toLowerCase().includes(filtros.numeroSerie.toLowerCase())
      );
    }

    // Filtro por categoria
    if (filtros.categoria !== 'todas') {
      resultado = resultado.filter(m => m.categoria === filtros.categoria);
    }

    // Filtro por tipo de arma
    if (filtros.tipoArma !== 'todas') {
      resultado = resultado.filter(m => m.tipoArma === filtros.tipoArma);
    }

    // Filtro por modelo
    if (filtros.modelo) {
      resultado = resultado.filter(m => 
        m.modelo?.toLowerCase().includes(filtros.modelo.toLowerCase())
      );
    }

    // Filtro por local
    if (filtros.local !== 'todas') {
      resultado = resultado.filter(m => m.local === filtros.local);
    }

    // Filtro por status
    if (filtros.status !== 'todas') {
      if (filtros.status === 'cautelada') {
        resultado = resultado.filter(m => m.cautelado === true);
      } else if (filtros.status === 'reserva') {
        resultado = resultado.filter(m => !m.cautelado && m.disponivel);
      }
    }

    setMateriaisFiltrados(resultado);
  };

  const limparFiltros = () => {
    setFiltros({
      numeroSerie: '',
      categoria: 'todas',
      tipoArma: 'todas',
      modelo: '',
      local: 'todas',
      status: 'todas'
    });
  };

  const getStatusBadge = (material: Material) => {
    if (material.cautelado) {
      return <Badge variant="default">Cautelada</Badge>;
    }
    if (material.disponivel) {
      return <Badge variant="outline">Reserva de Armamento</Badge>;
    }
    return <Badge variant="secondary">Indisponível</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-foreground">Consulta de Materiais Bélicos</h3>
        <p className="text-sm text-muted-foreground">Pesquise e filtre materiais por diversos critérios</p>
      </div>

      {/* Filtros */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Pesquisa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Filtro Número de Série */}
            <div>
              <Label htmlFor="numeroSerie">Número de Série</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="numeroSerie"
                  placeholder="Buscar..."
                  className="pl-8"
                  value={filtros.numeroSerie}
                  onChange={(e) => setFiltros(prev => ({ ...prev, numeroSerie: e.target.value }))}
                />
              </div>
            </div>

            {/* Filtro Categoria */}
            <div>
              <Label>Categoria</Label>
              <Select value={filtros.categoria} onValueChange={(value) => setFiltros(prev => ({ ...prev, categoria: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="Colete Balístico">Colete Balístico</SelectItem>
                  <SelectItem value="Armamento">Armamento</SelectItem>
                  <SelectItem value="Munição">Munição</SelectItem>
                  <SelectItem value="EPI">EPI</SelectItem>
                  <SelectItem value="Acessório">Acessório</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Tipo de Arma */}
            <div>
              <Label>Tipo de Arma</Label>
              <Select value={filtros.tipoArma} onValueChange={(value) => setFiltros(prev => ({ ...prev, tipoArma: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="Arma Curta">Arma Curta</SelectItem>
                  <SelectItem value="Arma Longa">Arma Longa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Modelo */}
            <div>
              <Label htmlFor="modelo">Modelo</Label>
              <Input
                id="modelo"
                placeholder="Buscar modelo..."
                value={filtros.modelo}
                onChange={(e) => setFiltros(prev => ({ ...prev, modelo: e.target.value }))}
              />
            </div>

            {/* Filtro Local */}
            <div>
              <Label>Local</Label>
              <Select value={filtros.local} onValueChange={(value) => setFiltros(prev => ({ ...prev, local: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="Fortaleza">Fortaleza</SelectItem>
                  <SelectItem value="Crato">Crato</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Status */}
            <div>
              <Label>Status</Label>
              <Select value={filtros.status} onValueChange={(value) => setFiltros(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="cautelada">Cautelada</SelectItem>
                  <SelectItem value="reserva">Reserva de Armamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Badge variant="outline" className="text-sm">
              {materiaisFiltrados.length} resultado(s) encontrado(s)
            </Badge>
            {(filtros.numeroSerie || filtros.categoria !== 'todas' || filtros.tipoArma !== 'todas' || 
              filtros.modelo || filtros.local !== 'todas' || filtros.status !== 'todas') && (
              <button
                onClick={limparFiltros}
                className="text-sm text-primary hover:underline"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Resultados */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Resultados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando materiais...</div>
          ) : materiaisFiltrados.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum material encontrado</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Número de Série</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Fabricante</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="min-w-[300px]">Informações Adicionais</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materiaisFiltrados.map((material) => (
                    <TableRow key={material.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{material.nome}</div>
                          <Badge variant="secondary" className="mt-1">{material.categoria}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>{material.numeroSerie || '-'}</TableCell>
                      <TableCell>{material.modelo || '-'}</TableCell>
                      <TableCell>{material.fabricante || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{material.local}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(material)}</TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          {/* Detalhes específicos por categoria */}
                          {material.categoria === 'Colete Balístico' && (
                            <div className="flex flex-wrap gap-2 text-xs">
                              {material.sexo && (
                                <Badge variant="outline" className="font-normal">
                                  Sexo: {material.sexo}
                                </Badge>
                              )}
                              {material.tamanhoColete && (
                                <Badge variant="outline" className="font-normal">
                                  Tamanho: {material.tamanhoColete}
                                </Badge>
                              )}
                              {material.vencimento && (
                                <Badge variant="outline" className="font-normal">
                                  Venc: {new Date(material.vencimento).toLocaleDateString('pt-BR')}
                                </Badge>
                              )}
                              {material.termoEntrega && (
                                <Badge variant="outline" className="font-normal">
                                  Termo: {material.termoEntrega}
                                </Badge>
                              )}
                            </div>
                          )}
                          {material.categoria === 'Armamento' && (
                            <div className="flex flex-wrap gap-2 text-xs">
                              {material.tipoArma && (
                                <Badge variant="outline" className="font-normal">
                                  {material.tipoArma}
                                </Badge>
                              )}
                              {material.calibre && (
                                <Badge variant="outline" className="font-normal">
                                  Cal: {material.calibre}
                                </Badge>
                              )}
                              {material.numeroSIARM && (
                                <Badge variant="outline" className="font-normal">
                                  SIARM: {material.numeroSIARM}
                                </Badge>
                              )}
                              {material.quantidadeCarregadores && (
                                <Badge variant="outline" className="font-normal">
                                  {material.quantidadeCarregadores} Carr.
                                </Badge>
                              )}
                              {material.quantidadeMunicoes && (
                                <Badge variant="outline" className="font-normal">
                                  {material.quantidadeMunicoes} Mun.
                                </Badge>
                              )}
                            </div>
                          )}
                          {/* Status de cautela */}
                          {material.cautelado && material.policialAssociadoNome && (
                            <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700">
                              Cautelada: {material.policialAssociadoNome}
                            </Badge>
                          )}
                          {!material.cautelado && material.disponivel && (
                            <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700">
                              Reserva de Armamento
                            </Badge>
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
    </div>
  );
};

export default RelatoriosBelico;