import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Search, Filter, Shield, AlertTriangle } from 'lucide-react';
import { saveAs } from 'file-saver';
import { format, parseISO, isBefore, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Colete {
  id: string;
  numeroSerie: string;
  vencimento: string;
  dataFabricacao: string;
  fabricante: string;
  sexo: string;
  tamanhoColete: string;
  cautelado: boolean;
  policialAssociadoNome: string;
  local: string;
}

const ColetesTab = () => {
  const [coletes, setColetes] = useState<Colete[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    numeroSerie: '',
    fabricante: 'todos',
    sexo: 'todos',
    tamanho: 'todos',
    status: 'todos',
    local: 'todos'
  });

  useEffect(() => {
    buscarColetes();
  }, []);

  const buscarColetes = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'materiais_belicos'),
        where('categoria', '==', 'Colete Balístico')
      );
      const snapshot = await getDocs(q);
      const dados = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((d: any) => !d.transferido && !d.baixado) as Colete[];
      setColetes(dados);
    } catch (error) {
      console.error('Erro ao buscar coletes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColete = (vencimento: string) => {
    if (!vencimento) return 'indefinido';
    try {
      const dataVenc = parseISO(vencimento);
      const hoje = new Date();
      const seisM = addMonths(hoje, 6);
      
      if (isBefore(dataVenc, hoje)) return 'vencido';
      if (isBefore(dataVenc, seisM)) return 'proximo';
      return 'ok';
    } catch {
      return 'indefinido';
    }
  };

  const fabricantes = useMemo(() => {
    const unique = [...new Set(coletes.map(c => c.fabricante).filter(Boolean))];
    return unique.sort();
  }, [coletes]);

  const tamanhos = useMemo(() => {
    const unique = [...new Set(coletes.map(c => c.tamanhoColete).filter(Boolean))];
    return unique.sort();
  }, [coletes]);

  const locais = useMemo(() => {
    const unique = [...new Set(coletes.map(c => c.local).filter(Boolean))];
    return unique.sort();
  }, [coletes]);

  const coletesFiltrados = useMemo(() => {
    return coletes.filter(c => {
      if (filtros.numeroSerie && !c.numeroSerie?.toLowerCase().includes(filtros.numeroSerie.toLowerCase())) {
        return false;
      }
      if (filtros.fabricante !== 'todos' && c.fabricante !== filtros.fabricante) {
        return false;
      }
      if (filtros.sexo !== 'todos' && c.sexo !== filtros.sexo) {
        return false;
      }
      if (filtros.tamanho !== 'todos' && c.tamanhoColete !== filtros.tamanho) {
        return false;
      }
      if (filtros.local !== 'todos' && c.local !== filtros.local) {
        return false;
      }
      if (filtros.status !== 'todos') {
        const status = getStatusColete(c.vencimento);
        if (filtros.status === 'cautelado' && !c.cautelado) return false;
        if (filtros.status === 'carga' && c.cautelado) return false;
        if (filtros.status === 'vencido' && status !== 'vencido') return false;
        if (filtros.status === 'proximo' && status !== 'proximo') return false;
      }
      return true;
    }).sort((a, b) => {
      // Ordenar por vencimento do mais antigo para o mais novo
      if (!a.vencimento && !b.vencimento) return 0;
      if (!a.vencimento) return 1;
      if (!b.vencimento) return -1;
      return a.vencimento.localeCompare(b.vencimento);
    });
  }, [coletes, filtros]);

  const formatarData = (data: string) => {
    if (!data) return '-';
    try {
      return format(parseISO(data), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return data;
    }
  };

  const exportarExcel = () => {
    const BOM = '\uFEFF';
    const headers = ['Número de Série', 'Vencimento', 'Data Fabricação', 'Fabricante', 'Tamanho', 'Sexo', 'Cautelado Para', 'Local', 'Status'];
    
    const rows = coletesFiltrados.map(c => {
      const status = getStatusColete(c.vencimento);
      const statusText = status === 'vencido' ? 'Vencido' : status === 'proximo' ? 'Próximo a Vencer' : 'OK';
      return [
        c.numeroSerie || '',
        formatarData(c.vencimento),
        formatarData(c.dataFabricacao),
        c.fabricante || '',
        c.tamanhoColete || '',
        c.sexo || '',
        c.cautelado ? (c.policialAssociadoNome || 'Cautelado') : 'Carga',
        c.local || '',
        statusText
      ];
    });

    const csvContent = BOM + [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `coletes_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  const limparFiltros = () => {
    setFiltros({
      numeroSerie: '',
      fabricante: 'todos',
      sexo: 'todos',
      tamanho: 'todos',
      status: 'todos',
      local: 'todos'
    });
  };

  const renderBadgeStatus = (colete: Colete) => {
    const status = getStatusColete(colete.vencimento);
    
    if (status === 'vencido') {
      return <Badge variant="destructive">Vencido</Badge>;
    }
    if (status === 'proximo') {
      return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Próximo a Vencer</Badge>;
    }
    if (colete.cautelado) {
      return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Cautelado</Badge>;
    }
    return <Badge variant="secondary">Carga</Badge>;
  };

  const estatisticas = useMemo(() => {
    const total = coletes.length;
    const cautelados = coletes.filter(c => c.cautelado).length;
    const vencidos = coletes.filter(c => getStatusColete(c.vencimento) === 'vencido').length;
    const proximosVencer = coletes.filter(c => getStatusColete(c.vencimento) === 'proximo').length;
    return { total, cautelados, vencidos, proximosVencer };
  }, [coletes]);

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{estatisticas.total}</p>
                <p className="text-sm text-muted-foreground">Total de Coletes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500" />
              <div>
                <p className="text-2xl font-bold">{estatisticas.cautelados}</p>
                <p className="text-sm text-muted-foreground">Cautelados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{estatisticas.proximosVencer}</p>
                <p className="text-sm text-muted-foreground">Próximos a Vencer</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-destructive" />
              <div>
                <p className="text-2xl font-bold">{estatisticas.vencidos}</p>
                <p className="text-sm text-muted-foreground">Vencidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nº de Série..."
                value={filtros.numeroSerie}
                onChange={(e) => setFiltros(f => ({ ...f, numeroSerie: e.target.value }))}
                className="pl-9"
              />
            </div>
            
            <Select value={filtros.fabricante} onValueChange={(v) => setFiltros(f => ({ ...f, fabricante: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Fabricante" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Fabricantes</SelectItem>
                {fabricantes.map(f => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtros.sexo} onValueChange={(v) => setFiltros(f => ({ ...f, sexo: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Sexo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Masculino">Masculino</SelectItem>
                <SelectItem value="Feminino">Feminino</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtros.tamanho} onValueChange={(v) => setFiltros(f => ({ ...f, tamanho: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Tamanho" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Tamanhos</SelectItem>
                {tamanhos.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtros.status} onValueChange={(v) => setFiltros(f => ({ ...f, status: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Status</SelectItem>
                <SelectItem value="cautelado">Cautelado</SelectItem>
                <SelectItem value="carga">Carga</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
                <SelectItem value="proximo">Próximo a Vencer</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtros.local} onValueChange={(v) => setFiltros(f => ({ ...f, local: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Local" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Locais</SelectItem>
                {locais.map(l => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-between items-center mt-4">
            <Button variant="outline" size="sm" onClick={limparFiltros}>
              Limpar Filtros
            </Button>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {coletesFiltrados.length} de {coletes.length} coletes
              </span>
              <Button onClick={exportarExcel} size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Exportar Excel
              </Button>
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
                  <TableHead>Número de Série</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Data Fabricação</TableHead>
                  <TableHead>Fabricante</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead>Sexo</TableHead>
                  <TableHead>Cautelado Para</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Carregando coletes...
                    </TableCell>
                  </TableRow>
                ) : coletesFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Nenhum colete encontrado com os filtros selecionados
                    </TableCell>
                  </TableRow>
                ) : (
                  coletesFiltrados.map((colete) => (
                    <TableRow key={colete.id}>
                      <TableCell className="font-mono">{colete.numeroSerie || '-'}</TableCell>
                      <TableCell>{formatarData(colete.vencimento)}</TableCell>
                      <TableCell>{formatarData(colete.dataFabricacao)}</TableCell>
                      <TableCell>{colete.fabricante || '-'}</TableCell>
                      <TableCell>{colete.tamanhoColete || '-'}</TableCell>
                      <TableCell>{colete.sexo || '-'}</TableCell>
                      <TableCell>
                        {colete.cautelado ? (colete.policialAssociadoNome || 'Cautelado') : '-'}
                      </TableCell>
                      <TableCell>{colete.local || '-'}</TableCell>
                      <TableCell>{renderBadgeStatus(colete)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ColetesTab;
