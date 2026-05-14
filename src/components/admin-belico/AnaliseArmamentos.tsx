import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Download, FileText, Loader2, Target } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Material {
  id: string;
  nome?: string;
  modelo?: string;
  calibre?: string;
  fabricante?: string;
  tipoArma?: string;
  numeroSerie?: string;
  local?: string;
  categoria?: string;
  policialAssociadoId?: string;
  baixado?: boolean;
  transferido?: boolean;
}

const UNIDADES = ['Fortaleza', 'Crato'] as const;
type Unidade = typeof UNIDADES[number];

const normalizeTipo = (t?: string): 'Curta' | 'Longa' | 'Outro' => {
  const v = (t || '').toLowerCase();
  if (v.includes('long')) return 'Longa';
  if (v.includes('curt')) return 'Curta';
  return 'Outro';
};

const AnaliseArmamentos: React.FC = () => {
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'Curta' | 'Longa'>('Longa');
  const [filtroUnidade, setFiltroUnidade] = useState<'todas' | Unidade>('todas');
  const [busca, setBusca] = useState('');
  const [incluirSerie, setIncluirSerie] = useState(false);
  const [expandido, setExpandido] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'materiais'));
        const lista: Material[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setMateriais(lista);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const armamentosAtivos = useMemo(
    () =>
      materiais.filter(
        (m) => (m.categoria || '').toLowerCase() === 'armamento' && !m.baixado && !m.transferido
      ),
    [materiais]
  );

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return armamentosAtivos.filter((m) => {
      const tipo = normalizeTipo(m.tipoArma);
      if (filtroTipo !== 'todos' && tipo !== filtroTipo) return false;
      if (filtroUnidade !== 'todas' && (m.local || '') !== filtroUnidade) return false;
      if (termo) {
        const hay = `${m.modelo || ''} ${m.nome || ''} ${m.numeroSerie || ''} ${m.calibre || ''} ${m.fabricante || ''}`.toLowerCase();
        if (!hay.includes(termo)) return false;
      }
      return true;
    });
  }, [armamentosAtivos, filtroTipo, filtroUnidade, busca]);

  const totais = useMemo(() => {
    const sede = filtrados.filter((m) => m.local === 'Fortaleza').length;
    const crato = filtrados.filter((m) => m.local === 'Crato').length;
    const cauteladas = filtrados.filter((m) => !!m.policialAssociadoId).length;
    return { total: filtrados.length, sede, crato, cauteladas, reserva: filtrados.length - cauteladas };
  }, [filtrados]);

  const porModelo = useMemo(() => {
    const map = new Map<string, { modelo: string; calibre: string; fabricante: string; tipo: string; itens: Material[] }>();
    filtrados.forEach((m) => {
      const key = (m.modelo || m.nome || 'N/I').toUpperCase();
      if (!map.has(key)) {
        map.set(key, {
          modelo: key,
          calibre: m.calibre || '-',
          fabricante: m.fabricante || '-',
          tipo: normalizeTipo(m.tipoArma),
          itens: [],
        });
      }
      map.get(key)!.itens.push(m);
    });
    return Array.from(map.values())
      .map((g) => ({
        ...g,
        sede: g.itens.filter((i) => i.local === 'Fortaleza').length,
        crato: g.itens.filter((i) => i.local === 'Crato').length,
        total: g.itens.length,
        cauteladas: g.itens.filter((i) => !!i.policialAssociadoId).length,
        reserva: g.itens.filter((i) => !i.policialAssociadoId).length,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filtrados]);

  const porCalibre = useMemo(() => {
    const map = new Map<string, { sede: number; crato: number; total: number }>();
    filtrados.forEach((m) => {
      const k = m.calibre || 'N/I';
      const cur = map.get(k) || { sede: 0, crato: 0, total: 0 };
      if (m.local === 'Fortaleza') cur.sede++;
      else if (m.local === 'Crato') cur.crato++;
      cur.total++;
      map.set(k, cur);
    });
    return Array.from(map.entries())
      .map(([calibre, v]) => ({ calibre, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [filtrados]);

  const porTipo = useMemo(() => {
    const map = new Map<string, { sede: number; crato: number; total: number }>();
    filtrados.forEach((m) => {
      const k = normalizeTipo(m.tipoArma);
      const cur = map.get(k) || { sede: 0, crato: 0, total: 0 };
      if (m.local === 'Fortaleza') cur.sede++;
      else if (m.local === 'Crato') cur.crato++;
      cur.total++;
      map.set(k, cur);
    });
    return Array.from(map.entries()).map(([tipo, v]) => ({ tipo, ...v }));
  }, [filtrados]);

  const exportarPDF = () => {
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const data = new Date().toLocaleDateString('pt-BR');
    pdf.setFontSize(14);
    pdf.text('RPMONT - Análise de Armamentos', 14, 14);
    pdf.setFontSize(9);
    const filtros = `Tipo: ${filtroTipo === 'todos' ? 'Todos' : filtroTipo}  |  Unidade: ${filtroUnidade === 'todas' ? 'Todas' : filtroUnidade}  |  Busca: ${busca || '-'}  |  Data: ${data}`;
    pdf.text(filtros, 14, 20);
    pdf.text(
      `Total: ${totais.total}   Sede: ${totais.sede}   Crato: ${totais.crato}   Cauteladas: ${totais.cauteladas}   Na Reserva: ${totais.reserva}`,
      14,
      26
    );

    autoTable(pdf, {
      startY: 32,
      head: [['Modelo', 'Calibre', 'Fabricante', 'Tipo', 'Sede', 'Crato', 'Total', 'Cauteladas', 'Reserva']],
      body: porModelo.map((g) => [g.modelo, g.calibre, g.fabricante, g.tipo, g.sede, g.crato, g.total, g.cauteladas, g.reserva]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 64, 175] },
    });

    autoTable(pdf, {
      head: [['Calibre', 'Sede', 'Crato', 'Total']],
      body: porCalibre.map((g) => [g.calibre, g.sede, g.crato, g.total]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [13, 148, 136] },
    });

    autoTable(pdf, {
      head: [['Tipo', 'Sede', 'Crato', 'Total']],
      body: porTipo.map((g) => [g.tipo, g.sede, g.crato, g.total]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [217, 119, 6] },
    });

    if (incluirSerie) {
      const body: any[] = [];
      porModelo.forEach((g) => {
        g.itens
          .slice()
          .sort((a, b) => (a.local || '').localeCompare(b.local || ''))
          .forEach((i) => body.push([g.modelo, i.numeroSerie || '-', i.local || '-', i.policialAssociadoId ? 'Cautelada' : 'Reserva']));
      });
      autoTable(pdf, {
        head: [['Modelo', 'Nº Série', 'Unidade', 'Status']],
        body,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [71, 85, 105] },
      });
    }

    const iso = new Date().toISOString().slice(0, 10);
    pdf.save(`analise_armamentos_${iso}.pdf`);
  };

  const exportarCSV = () => {
    const rows = [
      ['Modelo', 'Calibre', 'Fabricante', 'Tipo', 'Sede', 'Crato', 'Total', 'Cauteladas', 'Reserva'],
      ...porModelo.map((g) => [g.modelo, g.calibre, g.fabricante, g.tipo, g.sede, g.crato, g.total, g.cauteladas, g.reserva]),
    ];
    const csv = '\uFEFF' + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analise_armamentos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando armamentos...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground">Tipo</label>
            <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Longa">Armas Longas</SelectItem>
                <SelectItem value="Curta">Armas Curtas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Unidade</label>
            <Select value={filtroUnidade} onValueChange={(v) => setFiltroUnidade(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="Fortaleza">Sede (Fortaleza)</SelectItem>
                <SelectItem value="Crato">Crato</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground">Buscar (modelo, série, calibre, fabricante)</label>
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Ex.: ARAD, IAD, CTT, .40, 12..." />
          </div>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={incluirSerie} onChange={(e) => setIncluirSerie(e.target.checked)} />
              Incluir nº de série no PDF
            </label>
            <div className="flex gap-2">
              <Button onClick={exportarPDF} size="sm" variant="default" className="flex-1">
                <FileText className="h-4 w-4 mr-1" /> PDF
              </Button>
              <Button onClick={exportarCSV} size="sm" variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-1" /> CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards totais */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white border-0">
          <CardContent className="p-5 text-center">
            <Target className="h-6 w-6 mx-auto mb-1 opacity-80" />
            <p className="text-3xl font-bold">{totais.total}</p>
            <p className="text-xs opacity-80">Total</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-600 to-blue-800 text-white border-0">
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-bold">{totais.sede}</p>
            <p className="text-xs opacity-80">Sede (Fortaleza)</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white border-0">
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-bold">{totais.crato}</p>
            <p className="text-xs opacity-80">Crato</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-600 to-amber-800 text-white border-0">
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-bold">{totais.cauteladas}</p>
            <p className="text-xs opacity-80">Cauteladas</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-teal-600 to-teal-800 text-white border-0">
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-bold">{totais.reserva}</p>
            <p className="text-xs opacity-80">Na Reserva</p>
          </CardContent>
        </Card>
      </div>

      {/* Por Modelo */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Por Modelo</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Modelo</TableHead>
                  <TableHead>Calibre</TableHead>
                  <TableHead>Fabricante</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Sede</TableHead>
                  <TableHead className="text-center">Crato</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Cauteladas</TableHead>
                  <TableHead className="text-center">Reserva</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porModelo.map((g) => {
                  const open = !!expandido[g.modelo];
                  return (
                    <React.Fragment key={g.modelo}>
                      <TableRow className="cursor-pointer" onClick={() => setExpandido((s) => ({ ...s, [g.modelo]: !open }))}>
                        <TableCell>{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                        <TableCell className="font-semibold">{g.modelo}</TableCell>
                        <TableCell>{g.calibre}</TableCell>
                        <TableCell>{g.fabricante}</TableCell>
                        <TableCell><Badge variant="outline">{g.tipo}</Badge></TableCell>
                        <TableCell className="text-center">{g.sede}</TableCell>
                        <TableCell className="text-center">{g.crato}</TableCell>
                        <TableCell className="text-center font-bold">{g.total}</TableCell>
                        <TableCell className="text-center">{g.cauteladas}</TableCell>
                        <TableCell className="text-center">{g.reserva}</TableCell>
                      </TableRow>
                      {open && (
                        <TableRow>
                          <TableCell />
                          <TableCell colSpan={9} className="bg-muted/30">
                            <div className="grid md:grid-cols-2 gap-4 py-2">
                              {(['Fortaleza', 'Crato'] as Unidade[]).map((u) => {
                                const itens = g.itens.filter((i) => i.local === u);
                                if (!itens.length) return null;
                                return (
                                  <div key={u}>
                                    <p className="text-xs font-semibold mb-1">{u === 'Fortaleza' ? 'Sede (Fortaleza)' : 'Crato'} — {itens.length}</p>
                                    <div className="flex flex-wrap gap-1">
                                      {itens.map((i) => (
                                        <Badge key={i.id} variant={i.policialAssociadoId ? 'default' : 'secondary'} className="text-[10px]">
                                          {i.numeroSerie || 's/n'}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
                {!porModelo.length && (
                  <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-6">Nenhum armamento encontrado.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Por Calibre */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Por Calibre</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Calibre</TableHead>
                  <TableHead className="text-center">Sede</TableHead>
                  <TableHead className="text-center">Crato</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porCalibre.map((g) => (
                  <TableRow key={g.calibre}>
                    <TableCell className="font-medium">{g.calibre}</TableCell>
                    <TableCell className="text-center">{g.sede}</TableCell>
                    <TableCell className="text-center">{g.crato}</TableCell>
                    <TableCell className="text-center font-bold">{g.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Por Tipo */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Por Tipo</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Sede</TableHead>
                  <TableHead className="text-center">Crato</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porTipo.map((g) => (
                  <TableRow key={g.tipo}>
                    <TableCell className="font-medium">{g.tipo}</TableCell>
                    <TableCell className="text-center">{g.sede}</TableCell>
                    <TableCell className="text-center">{g.crato}</TableCell>
                    <TableCell className="text-center font-bold">{g.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnaliseArmamentos;
