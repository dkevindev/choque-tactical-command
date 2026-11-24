import { useMemo, useState } from 'react';
import { AlertTriangle, FileDown, FileSpreadsheet, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  CATEGORIAS, LOCAIS, SEXOS, SITUACOES_CARGA, formatarNascimento, idade, pendencias,
  type Categoria, type Local, type SituacaoCarga, type Sexo, type Solipede,
} from '@/lib/cavalhada';
import { exportarCavalhadaExcel, exportarCavalhadaPDF } from '@/lib/exportCavalhada';
import FormSolipedeDialog from './FormSolipedeDialog';

interface Props {
  animais: Solipede[];
  onAbrir: (id: string) => void;
  onAlterado: () => Promise<void>;
}

const TODOS = 'todos';

const corSituacao: Record<SituacaoCarga, string> = {
  CARGA_TOMBO: 'bg-green-600/15 text-green-700 border-green-600/40',
  CARGA_BCG: 'bg-green-600/15 text-green-700 border-green-600/40',
  PENDENTE: 'bg-amber-500/15 text-amber-700 border-amber-500/40',
  DESCARGA: 'bg-red-600/15 text-red-700 border-red-600/40',
};

const Filtro = <T extends string>({ valor, onChange, rotulo, opcoes }: {
  valor: string; onChange: (v: string) => void; rotulo: string; opcoes: Record<T, string>;
}) => (
  <Select value={valor} onValueChange={onChange}>
    <SelectTrigger className="w-full md:w-48" aria-label={rotulo}><SelectValue placeholder={rotulo} /></SelectTrigger>
    <SelectContent>
      <SelectItem value={TODOS}>{rotulo}: todos</SelectItem>
      {(Object.keys(opcoes) as T[]).map((k) => <SelectItem key={k} value={k}>{opcoes[k]}</SelectItem>)}
    </SelectContent>
  </Select>
);

const ListaSolipedes = ({ animais, onAbrir, onAlterado }: Props) => {
  const [busca, setBusca] = useState('');
  const [local, setLocal] = useState<string>(TODOS);
  const [categoria, setCategoria] = useState<string>(TODOS);
  const [situacao, setSituacao] = useState<string>(TODOS);
  const [sexo, setSexo] = useState<string>(TODOS);
  const [novoAberto, setNovoAberto] = useState(false);

  const filtrados = useMemo(() => {
    const b = busca.trim().toUpperCase();
    return animais.filter((s) =>
      (!b || s.nome.toUpperCase().includes(b) || s.registro.replace(' ', '').includes(b.replace(' ', '')) || s.pelagem.includes(b))
      && (local === TODOS || s.local === (local as Local))
      && (categoria === TODOS || s.categoria === (categoria as Categoria))
      && (situacao === TODOS || s.situacaoCarga === (situacao as SituacaoCarga))
      && (sexo === TODOS || s.sexo === (sexo as Sexo)));
  }, [animais, busca, local, categoria, situacao, sexo]);

  const exportar = async (tipo: 'pdf' | 'xlsx') => {
    if (!filtrados.length) { toast.error('Nenhum animal na lista para exportar.'); return; }
    try {
      if (tipo === 'pdf') exportarCavalhadaPDF(filtrados);
      else await exportarCavalhadaExcel(filtrados);
    } catch (e) {
      console.error(e);
      toast.error('Não foi possível gerar o arquivo.');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar por nome, registro (ex.: EG 065) ou pelagem" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
            <Button onClick={() => setNovoAberto(true)}><Plus className="h-4 w-4 mr-2" />Novo animal</Button>
          </div>
          <div className="flex flex-col md:flex-row flex-wrap gap-3">
            <Filtro rotulo="Local" valor={local} onChange={setLocal} opcoes={LOCAIS} />
            <Filtro rotulo="Categoria" valor={categoria} onChange={setCategoria} opcoes={CATEGORIAS} />
            <Filtro rotulo="Situação" valor={situacao} onChange={setSituacao} opcoes={SITUACOES_CARGA} />
            <Filtro rotulo="Sexo" valor={sexo} onChange={setSexo} opcoes={SEXOS} />
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <p className="text-sm text-muted-foreground">{filtrados.length} de {animais.length} animais</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => exportar('pdf')}><FileDown className="h-4 w-4 mr-2" />PDF</Button>
              <Button variant="outline" size="sm" onClick={() => exportar('xlsx')}><FileSpreadsheet className="h-4 w-4 mr-2" />Excel</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Registro</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">Raça</TableHead>
                <TableHead className="hidden md:table-cell">Nasc. (idade)</TableHead>
                <TableHead className="hidden lg:table-cell">Pelagem</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="hidden md:table-cell">Local</TableHead>
                <TableHead>Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((s) => {
                const p = pendencias(s);
                return (
                  <TableRow key={s.id} className="cursor-pointer" onClick={() => onAbrir(s.id)}>
                    <TableCell className="font-mono text-xs whitespace-nowrap">{s.registro}</TableCell>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-1">
                        {s.nome}
                        {p.length > 0 && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" aria-label={p.join(', ')} />}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{s.raca}</TableCell>
                    <TableCell className="hidden md:table-cell tabular-nums whitespace-nowrap">{formatarNascimento(s)} ({idade(s)})</TableCell>
                    <TableCell className="hidden lg:table-cell">{s.pelagem}</TableCell>
                    <TableCell className="text-sm">{CATEGORIAS[s.categoria]}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{LOCAIS[s.local]}</TableCell>
                    <TableCell><Badge variant="outline" className={`whitespace-nowrap ${corSituacao[s.situacaoCarga]}`}>{SITUACOES_CARGA[s.situacaoCarga]}</Badge></TableCell>
                  </TableRow>
                );
              })}
              {filtrados.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-10">Nenhum animal encontrado com esses filtros.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <FormSolipedeDialog aberto={novoAberto} onFechar={() => setNovoAberto(false)} onSalvo={onAlterado} />
    </div>
  );
};

export default ListaSolipedes;
