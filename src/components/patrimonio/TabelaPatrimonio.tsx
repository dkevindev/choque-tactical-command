import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, Package, X, Loader2 } from 'lucide-react';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from '@/hooks/use-toast';
import { ItemPatrimonio, CategoriaPatrimonio, Secao } from './PatrimonioPage';
import CadastroItem from './CadastroItem';

interface TabelaPatrimonioProps {
  itens: ItemPatrimonio[];
  secoes: Secao[];
  categorias: CategoriaPatrimonio[];
  onUpdate: () => void;
  loading: boolean;
}

export default function TabelaPatrimonio({ itens, secoes, categorias, onUpdate, loading }: TabelaPatrimonioProps) {
  const [search, setSearch] = useState('');
  const [filtroSecao, setFiltroSecao] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [showCadastro, setShowCadastro] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemPatrimonio | null>(null);

  const itensFiltrados = itens.filter(item => {
    const searchLower = search.toLowerCase();
    const matchSearch = 
      item.nome.toLowerCase().includes(searchLower) ||
      item.descricao.toLowerCase().includes(searchLower) ||
      item.numeroTombo.toLowerCase().includes(searchLower) ||
      item.secaoNome.toLowerCase().includes(searchLower);

    const matchSecao = !filtroSecao || item.secaoId === filtroSecao;
    const matchCategoria = !filtroCategoria || item.categoriaId === filtroCategoria;

    return matchSearch && matchSecao && matchCategoria;
  });

  const handleDelete = async (item: ItemPatrimonio) => {
    if (!confirm(`Deseja realmente excluir o item "${item.nome}"?`)) return;

    try {
      await deleteDoc(doc(db, 'patrimonio_itens', item.id));
      toast({ title: 'Sucesso', description: 'Item excluído com sucesso!' });
      onUpdate();
    } catch (error) {
      console.error('Erro ao excluir item:', error);
      toast({ title: 'Erro', description: 'Erro ao excluir item', variant: 'destructive' });
    }
  };

  const handleEdit = (item: ItemPatrimonio) => {
    setEditingItem(item);
    setShowCadastro(true);
  };

  const handleCloseForm = () => {
    setShowCadastro(false);
    setEditingItem(null);
  };

  const clearFilters = () => {
    setSearch('');
    setFiltroSecao('');
    setFiltroCategoria('');
  };

  const hasFilters = search || filtroSecao || filtroCategoria;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const totalValor = itensFiltrados.reduce((acc, item) => acc + (item.valor || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Todos os Itens</h2>
        <Button onClick={() => setShowCadastro(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Item
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, descrição, tombo ou seção..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filtroSecao} onValueChange={setFiltroSecao}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as seções" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas as seções</SelectItem>
                {secoes.map((secao) => (
                  <SelectItem key={secao.id} value={secao.id}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded ${secao.cor}`} />
                      {secao.nome}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas as categorias</SelectItem>
                {categorias.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded ${cat.cor}`} />
                      {cat.nome}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasFilters && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                {itensFiltrados.length} de {itens.length} itens | Valor total: {formatCurrency(totalValor)}
              </span>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabela */}
      {itensFiltrados.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              {itens.length === 0 
                ? 'Nenhum item cadastrado' 
                : 'Nenhum item encontrado com os filtros aplicados'
              }
            </p>
            {itens.length === 0 && (
              <Button onClick={() => setShowCadastro(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Primeiro Item
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Nº Tombo</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden md:table-cell">Descrição</TableHead>
                  <TableHead>Seção</TableHead>
                  <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itensFiltrados.map((item) => {
                  const secao = secoes.find(s => s.id === item.secaoId);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.numeroTombo}</TableCell>
                      <TableCell className="font-medium">{item.nome}</TableCell>
                      <TableCell className="hidden md:table-cell max-w-[200px] truncate text-sm text-muted-foreground">
                        {item.descricao}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {secao && <div className={`w-2 h-2 rounded ${secao.cor}`} />}
                          <span className="text-sm">{item.secaoNome}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">{item.categoria}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.valor)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDelete(item)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {showCadastro && (
        <CadastroItem
          item={editingItem}
          categorias={categorias}
          secoes={secoes}
          onClose={handleCloseForm}
          onSave={() => {
            handleCloseForm();
            onUpdate();
          }}
        />
      )}
    </div>
  );
}
