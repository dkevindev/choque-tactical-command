import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileSpreadsheet, Loader2, PackagePlus } from 'lucide-react';
import {
  addDoc, collection, getDocs, query, serverTimestamp, where, type Timestamp,
} from 'firebase/firestore';
import ExcelJS from 'exceljs';
import { db } from '@/firebase';
import { toast } from '@/hooks/use-toast';
import { autorAtual } from '@/lib/cavalhada';

const COL_ENTRADAS = 'patrimonio_entradas';

// Mesmo nome que aparece na planilha de inclusões.
const SUBTIPOS = { DOACAO: 'DOAÇÃO', TRANSFERENCIA_INTERNA: 'TRANSFERENCIA INTERNA' } as const;
type Subtipo = keyof typeof SUBTIPOS;
const ESTADOS = ['NOVO', 'BOM', 'REGULAR', 'RUIM', 'INSERVÍVEL'];
const TIPO = 'INCLUSÃO';

interface Entrada {
  id: string;
  numeroTombo: string;
  unidadeAdministrativa: string;
  descricao: string;            // "Especificação" na planilha
  estadoConservacao: string;
  valor?: string;               // valor de aquisição / avaliação da comissão
  tipoEntrada: Subtipo;         // subtipo
  documentos?: string;          // documentos produzidos / diligências realizadas
  observacoes?: string;
  status: 'AGUARDANDO';
  autor?: string;
  createdAt?: Timestamp;
}

const vazio = {
  numeroTombo: '', unidadeAdministrativa: 'RPMONT', descricao: '', estadoConservacao: '',
  valor: '', tipoEntrada: '' as Subtipo | '', documentos: '', observacoes: '',
};

const tomboJaExiste = async (tombo: string) => {
  const [itens, entradas] = await Promise.all([
    getDocs(query(collection(db, 'patrimonio_itens'), where('numeroTombo', '==', tombo))),
    getDocs(query(collection(db, COL_ENTRADAS), where('numeroTombo', '==', tombo))),
  ]);
  return !itens.empty || !entradas.empty;
};

const CABECALHO = [
  'TOMBO', 'UNIDADE ADMINISTRATIVA', 'ESPECIFICAÇÃO', 'ESTADO DE CONSERVAÇÃO',
  'VALOR DE AQUISIÇÃO/AVALIAÇÃO DA COMISSÃO', 'TIPO', 'SUBTIPO',
  'DOCUMENTOS PRODUZIDOS/ DILIGÊNCIAS REALIZADAS', 'OBSERVAÇÕES', 'RECAP',
];

const exportarExcel = async (lista: Entrada[]) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Entradas');
  const cab = ws.addRow(CABECALHO);
  cab.font = { bold: true };
  cab.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  lista.forEach((e) => {
    const r = ws.addRow([
      e.numeroTombo, e.unidadeAdministrativa, e.descricao, e.estadoConservacao, e.valor ?? '',
      TIPO, SUBTIPOS[e.tipoEntrada] ?? e.tipoEntrada, e.documentos ?? '', e.observacoes ?? '',
      '', // RECAP: preenchido na planilha
    ]);
    r.alignment = { vertical: 'middle', wrapText: true };
    r.getCell(1).font = { color: { argb: 'FFFF0000' } };
  });
  [12, 18, 60, 14, 20, 12, 18, 35, 35, 10].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: CABECALHO.length } };
  ws.eachRow((row) => row.eachCell({ includeEmpty: true }, (c) => {
    c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  }));
  const blob = new Blob([await wb.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `entradas_patrimonio_${new Date().toLocaleDateString('sv-SE')}.xlsx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
};

/** Entrada de bens. Todo bem novo entra por aqui e fica aguardando destinação a uma seção. */
export default function EntradaPatrimonio() {
  const [f, setF] = useState(vazio);
  const [salvando, setSalvando] = useState(false);
  const [aguardando, setAguardando] = useState<Entrada[]>([]);
  const [carregando, setCarregando] = useState(true);

  const set = <K extends keyof typeof vazio>(k: K, v: (typeof vazio)[K]) => setF((x) => ({ ...x, [k]: v }));

  const carregar = async () => {
    setCarregando(true);
    try {
      const snap = await getDocs(query(collection(db, COL_ENTRADAS), where('status', '==', 'AGUARDANDO')));
      setAguardando(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Entrada)
          .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)),
      );
    } catch (e) {
      console.error('Erro ao carregar entradas:', e);
      toast({ title: 'Erro ao carregar os bens aguardando', variant: 'destructive' });
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const registrar = async (e: React.FormEvent) => {
    e.preventDefault();
    const numeroTombo = f.numeroTombo.trim().toUpperCase();
    const descricao = f.descricao.trim().toUpperCase();
    if (!numeroTombo) { toast({ title: 'Informe o número do tombo', variant: 'destructive' }); return; }
    if (!descricao) { toast({ title: 'Informe a especificação do bem', variant: 'destructive' }); return; }
    if (!f.estadoConservacao) { toast({ title: 'Escolha o estado de conservação', variant: 'destructive' }); return; }
    if (!f.tipoEntrada) { toast({ title: 'Escolha o subtipo (doação ou transferência interna)', variant: 'destructive' }); return; }

    setSalvando(true);
    try {
      if (await tomboJaExiste(numeroTombo)) {
        toast({ title: `O tombo ${numeroTombo} já está cadastrado`, variant: 'destructive' });
        return;
      }
      await addDoc(collection(db, COL_ENTRADAS), {
        numeroTombo, descricao,
        unidadeAdministrativa: f.unidadeAdministrativa.trim().toUpperCase() || 'RPMONT',
        estadoConservacao: f.estadoConservacao,
        valor: f.valor.trim(),
        tipoEntrada: f.tipoEntrada,
        documentos: f.documentos.trim().toUpperCase(),
        observacoes: f.observacoes.trim().toUpperCase(),
        status: 'AGUARDANDO', autor: autorAtual(), createdAt: serverTimestamp(),
      });
      toast({ title: 'Entrada registrada', description: `Tombo ${numeroTombo} aguardando destinação.` });
      setF(vazio);
      await carregar();
    } catch (err) {
      console.error('Erro ao registrar entrada:', err);
      toast({ title: 'Erro ao registrar a entrada', variant: 'destructive' });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PackagePlus className="h-5 w-5" />Registrar entrada (inclusão)</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={registrar} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="ent-tombo">Tombo</Label>
              <Input id="ent-tombo" value={f.numeroTombo} maxLength={40} onChange={(e) => set('numeroTombo', e.target.value.toUpperCase())} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ent-ua">Unidade administrativa</Label>
              <Input id="ent-ua" value={f.unidadeAdministrativa} maxLength={60} onChange={(e) => set('unidadeAdministrativa', e.target.value.toUpperCase())} />
            </div>
            <div className="space-y-1">
              <Label>Subtipo</Label>
              <Select value={f.tipoEntrada} onValueChange={(v) => set('tipoEntrada', v as Subtipo)}>
                <SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(SUBTIPOS) as Subtipo[]).map((k) => <SelectItem key={k} value={k}>{SUBTIPOS[k]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-3">
              <Label htmlFor="ent-desc">Especificação</Label>
              <Textarea id="ent-desc" rows={2} value={f.descricao} maxLength={500}
                placeholder="Ex.: CARABINA IMBEL IA2 CAL 5,56 X 45MM + (03 carregadores) - Nº SÉRIE: JFA01090"
                onChange={(e) => set('descricao', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Estado de conservação</Label>
              <Select value={f.estadoConservacao} onValueChange={(v) => set('estadoConservacao', v)}>
                <SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger>
                <SelectContent>{ESTADOS.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="ent-valor">Valor de aquisição / avaliação da comissão</Label>
              <Input id="ent-valor" value={f.valor} maxLength={30} placeholder="Ex.: R$ 5.000,00" onChange={(e) => set('valor', e.target.value)} />
            </div>
            <div className="space-y-1 md:col-span-3">
              <Label htmlFor="ent-docs">Documentos produzidos / diligências realizadas</Label>
              <Input id="ent-docs" value={f.documentos} maxLength={200} placeholder="Ex.: TERMO DE ENTREGA DE MATERIAL" onChange={(e) => set('documentos', e.target.value)} />
            </div>
            <div className="space-y-1 md:col-span-3">
              <Label htmlFor="ent-obs">Observações</Label>
              <Input id="ent-obs" value={f.observacoes} maxLength={300} placeholder="Ex.: RECEBIDAS DO CPCHOQUE" onChange={(e) => set('observacoes', e.target.value)} />
            </div>
            <div className="md:col-span-3 flex justify-end">
              <Button type="submit" disabled={salvando}>
                {salvando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Registrar entrada
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Bens aguardando destinação ({aguardando.length})</CardTitle>
          <Button variant="outline" size="sm" disabled={aguardando.length === 0} onClick={() => exportarExcel(aguardando)}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />Excel
          </Button>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tombo</TableHead>
                <TableHead>Especificação</TableHead>
                <TableHead className="hidden md:table-cell">Estado</TableHead>
                <TableHead>Subtipo</TableHead>
                <TableHead className="hidden lg:table-cell">Documentos</TableHead>
                <TableHead className="hidden lg:table-cell">Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {carregando ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin inline" /></TableCell></TableRow>
              ) : aguardando.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum bem aguardando.</TableCell></TableRow>
              ) : aguardando.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs whitespace-nowrap text-red-600">{a.numeroTombo}</TableCell>
                  <TableCell className="text-sm">{a.descricao}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{a.estadoConservacao}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{SUBTIPOS[a.tipoEntrada] ?? a.tipoEntrada}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{a.documentos}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{a.observacoes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
