import { useEffect, useMemo, useState } from 'react';
import { db } from '@/firebase';
import { collection, getDocs, doc, getDoc, query, where, orderBy, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, Search, FileSpreadsheet } from 'lucide-react';

interface ServicoDiario {
  id: string;
  viaturaId: string;
  cadastro?: string | null;
  placa?: string | null;
  motorista?: string | null; // Nome de Guerra 1 preferencialmente
  motoristaId?: string | null;
  area?: string | null;
  kmInicial?: number | null;
  kmFinal?: number | null;
  status?: 'aberto' | 'encerrado';
  iniciadoEm?: string; // ISO
  encerradoEm?: string; // ISO
}

interface AvariaResumo {
  responsavel?: string;
  data?: string; // ISO
}

export default function ServicosPage() {
  const [servicos, setServicos] = useState<ServicoDiario[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [filtroData, setFiltroData] = useState<string>(''); // yyyy-mm-dd
  const [filtroPolicial, setFiltroPolicial] = useState<string>('');
  const [filtroViatura, setFiltroViatura] = useState<string>('');
  const [avariasPorVtr, setAvariasPorVtr] = useState<Record<string, AvariaResumo[]>>({});
  
  // Estados para encerramento administrativo
  const [showEncerrarAdmin, setShowEncerrarAdmin] = useState(false);
  const [servicoParaEncerrar, setServicoParaEncerrar] = useState<ServicoDiario | null>(null);
  const [kmFinalAdmin, setKmFinalAdmin] = useState('');
  const [manterKmAtual, setManterKmAtual] = useState(false);
  const [kmAtualVtr, setKmAtualVtr] = useState<number | null>(null);
  const [msgEncerrarAdmin, setMsgEncerrarAdmin] = useState('');

  // Paginação
  const [pagina, setPagina] = useState(1);
  const porPagina = 50;

  useEffect(() => {
    const fetchServicos = async () => {
      setLoading(true);
      try {
        const col = collection(db, 'servicosDiarios');
        // Ordenar por data para melhor leitura
        const q = query(col, orderBy('iniciadoEm', 'desc'));
        const snap = await getDocs(q);
        const rows: ServicoDiario[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        
        // Buscar Nome de Guerra 1 dos policiais para serviços antigos que salvaram nome completo
        const uniqueMotoristaIds = Array.from(new Set(rows.map(r => r.motoristaId).filter(Boolean)));
        const nomeGuerraMap: Record<string, string> = {};
        
        await Promise.all(uniqueMotoristaIds.map(async (mid) => {
          try {
            const polRef = doc(db, 'policiais', mid);
            const polSnap = await getDoc(polRef);
            if (polSnap.exists()) {
              const polData: any = polSnap.data();
              nomeGuerraMap[mid] = polData.nomeGuerra1 || polData.NOME || 'Sem identificação';
            }
          } catch (e) {
            console.error('Erro ao buscar policial:', e);
          }
        }));
        
        // Atualizar motorista com nome de guerra
        const rowsAtualizados = rows.map(r => ({
          ...r,
          motorista: r.motoristaId && nomeGuerraMap[r.motoristaId] ? nomeGuerraMap[r.motoristaId] : r.motorista
        }));
        
        setServicos(rowsAtualizados);

        // Buscar avarias das viaturas listadas (para a coluna "Teve avaria")
        const uniqueVtrs = Array.from(new Set(rows.map(r => r.viaturaId).filter(Boolean)));
        const map: Record<string, AvariaResumo[]> = {};
        await Promise.all(uniqueVtrs.map(async (vid) => {
          const vRef = doc(db, 'frota', vid);
          const vSnap = await getDoc(vRef);
          if (vSnap.exists()) {
            const data: any = vSnap.data();
            map[vid] = Array.isArray(data.avarias) ? data.avarias.map((a: any) => ({ responsavel: a.responsavel, data: a.data })) : [];
          } else {
            map[vid] = [];
          }
        }));
        setAvariasPorVtr(map);
      } catch (e) {
        console.error('Erro ao carregar serviços:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchServicos();
  }, []);

  const mesmaData = (iso1?: string, iso2?: string) => {
    if (!iso1 || !iso2) return false;
    const d1 = new Date(iso1);
    const d2 = new Date(iso2);
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
  };

  const rowsFiltrados = useMemo(() => {
    return servicos.filter(r => {
      const byDia = filtroData ? (mesmaData(r.iniciadoEm, `${filtroData}T00:00:00`)) : true;
      const byPol = filtroPolicial ? (String(r.motorista || '').toLowerCase().includes(filtroPolicial.toLowerCase())) : true;
      const labelVtr = `${r.cadastro || ''} ${r.placa || ''}`.trim();
      const byVtr = filtroViatura ? labelVtr.toLowerCase().includes(filtroViatura.toLowerCase()) : true;
      return byDia && byPol && byVtr;
    });
  }, [servicos, filtroData, filtroPolicial, filtroViatura]);

  // Reset página quando filtros mudam
  useEffect(() => { setPagina(1); }, [filtroData, filtroPolicial, filtroViatura]);

  const totalPaginas = Math.max(1, Math.ceil(rowsFiltrados.length / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const rowsPagina = useMemo(() => {
    const ini = (paginaAtual - 1) * porPagina;
    return rowsFiltrados.slice(ini, ini + porPagina);
  }, [rowsFiltrados, paginaAtual]);

  const getTeveAvaria = (row: ServicoDiario): boolean => {
    const avs = avariasPorVtr[row.viaturaId] || [];
    // Se houver avaria na mesma data com o mesmo responsável (Nome de Guerra 1 gravado em motorista)
    return avs.some(a => (
      (!!row.motorista && !!a.responsavel && String(a.responsavel).toLowerCase() === String(row.motorista).toLowerCase()) &&
      (mesmaData(a.data, row.iniciadoEm) || mesmaData(a.data, row.encerradoEm))
    ));
  };

  // Abre modal e busca KM atual da viatura
  const abrirEncerrarAdmin = async (r: ServicoDiario) => {
    setServicoParaEncerrar(r);
    setKmFinalAdmin('');
    setManterKmAtual(false);
    setKmAtualVtr(null);
    setMsgEncerrarAdmin('');
    setShowEncerrarAdmin(true);
    if (r.viaturaId) {
      try {
        const vSnap = await getDoc(doc(db, 'frota', r.viaturaId));
        if (vSnap.exists()) {
          const km = Number((vSnap.data() as any).KM);
          if (!isNaN(km)) setKmAtualVtr(km);
        }
      } catch (e) { console.error(e); }
    }
  };

  // Função para encerrar serviço administrativamente (sem senha)
  const encerrarServicoAdministrativo = async () => {
    if (!servicoParaEncerrar) return;
    let kmf: number;
    if (manterKmAtual) {
      if (kmAtualVtr === null) { setMsgEncerrarAdmin('KM atual da viatura indisponível.'); return; }
      kmf = kmAtualVtr;
    } else {
      kmf = parseInt(kmFinalAdmin.replace(/\D/g, '') || '');
      if (isNaN(kmf)) { setMsgEncerrarAdmin('KM inválido.'); return; }
    }
    try {
      await updateDoc(doc(db, 'servicosDiarios', servicoParaEncerrar.id), {
        kmFinal: kmf,
        status: 'encerrado',
        encerradoEm: new Date().toISOString(),
        encerradoPorId: 'ADMIN',
        encerradoPorNome: 'Encerramento Administrativo',
        kmMantidoDaViatura: manterKmAtual,
      });

      // Atualizar KM da viatura apenas se não for manter (senão já é o valor atual)
      if (!manterKmAtual && servicoParaEncerrar.viaturaId) {
        await updateDoc(doc(db, 'frota', servicoParaEncerrar.viaturaId), { KM: kmf });
      }

      setMsgEncerrarAdmin('✅ Serviço encerrado com sucesso.');
      setTimeout(() => {
        setShowEncerrarAdmin(false);
        setServicoParaEncerrar(null);
        setKmFinalAdmin('');
        setManterKmAtual(false);
        setKmAtualVtr(null);
        setMsgEncerrarAdmin('');
        window.location.reload();
      }, 1000);
    } catch (e) {
      console.error('Erro ao encerrar serviço:', e);
      setMsgEncerrarAdmin('Erro ao encerrar serviço.');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border shadow-tactical">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Serviços Diários
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input type="date" value={filtroData} onChange={e => setFiltroData(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input placeholder="Filtrar por policial (Nome de Guerra)" value={filtroPolicial} onChange={e => setFiltroPolicial(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Input placeholder="Filtrar por viatura (Cadastro/Placa)" value={filtroViatura} onChange={e => setFiltroViatura(e.target.value)} />
            </div>
          </div>

          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data Início</TableHead>
                  <TableHead>Data Fim</TableHead>
                  <TableHead>Motorista</TableHead>
                  <TableHead>Viatura</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>KM Inicial</TableHead>
                  <TableHead>KM Final</TableHead>
                  <TableHead>KM Rodados</TableHead>
                  <TableHead>Avaria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rowsPagina.map(r => {
                  const kmRodados = (r.kmFinal && r.kmInicial) ? r.kmFinal - r.kmInicial : null;
                  return (
                    <TableRow key={r.id}>
                      <TableCell>{r.iniciadoEm ? new Date(r.iniciadoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</TableCell>
                      <TableCell>{r.encerradoEm ? new Date(r.encerradoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</TableCell>
                      <TableCell>{r.motorista || '-'}</TableCell>
                      <TableCell>{r.cadastro || r.placa || '-'}</TableCell>
                      <TableCell>{r.area || '-'}</TableCell>
                      <TableCell>{r.kmInicial ?? '-'}</TableCell>
                      <TableCell>{r.kmFinal ?? '-'}</TableCell>
                      <TableCell>{kmRodados !== null ? `${kmRodados} km` : '-'}</TableCell>
                      <TableCell>
                        {getTeveAvaria(r) ? (
                          <Badge variant="destructive">Sim</Badge>
                        ) : (
                          <Badge variant="secondary">Não</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.status === 'aberto' ? 'secondary' : 'default'}>
                          {r.status?.toUpperCase() || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {r.status === 'aberto' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => abrirEncerrarAdmin(r)}
                          >
                            Encerrar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableCaption>{loading ? 'Carregando...' : `${rowsFiltrados.length} registro(s) • página ${paginaAtual} de ${totalPaginas}`}</TableCaption>
            </Table>
          </div>

          {/* Paginação */}
          <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
            <div className="text-sm text-muted-foreground">
              Mostrando {rowsPagina.length ? ((paginaAtual - 1) * porPagina) + 1 : 0}
              {' - '}
              {Math.min(paginaAtual * porPagina, rowsFiltrados.length)} de {rowsFiltrados.length}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPagina(1)} disabled={paginaAtual === 1}>« Primeira</Button>
              <Button variant="outline" size="sm" onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={paginaAtual === 1}>‹ Anterior</Button>
              <span className="text-sm px-2">Pág. {paginaAtual} / {totalPaginas}</span>
              <Button variant="outline" size="sm" onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={paginaAtual === totalPaginas}>Próxima ›</Button>
              <Button variant="outline" size="sm" onClick={() => setPagina(totalPaginas)} disabled={paginaAtual === totalPaginas}>Última »</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de encerramento administrativo */}
      {showEncerrarAdmin && servicoParaEncerrar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, padding: '1.5rem', width: 'min(500px, 90vw)' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600, color: 'hsl(var(--foreground))' }}>Encerrar Serviço (Administrativo)</h3>
            <div style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '1rem' }}>
              <strong>Viatura:</strong> {servicoParaEncerrar.cadastro || servicoParaEncerrar.placa}<br/>
              <strong>Motorista:</strong> {servicoParaEncerrar.motorista || '-'}<br/>
              <strong>KM Inicial:</strong> {servicoParaEncerrar.kmInicial ?? '-'}
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.9rem', color: 'hsl(var(--foreground))', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={manterKmAtual}
                  onChange={e => setManterKmAtual(e.target.checked)}
                  style={{ width: 18, height: 18 }}
                />
                <span>
                  Manter KM atual da viatura
                  {kmAtualVtr !== null && <strong style={{ marginLeft: 6 }}>({kmAtualVtr.toLocaleString('pt-BR')} km)</strong>}
                </span>
              </label>
              {!manterKmAtual && (
                <>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'hsl(var(--foreground))' }}>KM Final</label>
                  <Input
                    type="number"
                    value={kmFinalAdmin}
                    onChange={e => setKmFinalAdmin(e.target.value)}
                    placeholder="Informe o KM final"
                  />
                </>
              )}
              {manterKmAtual && (
                <div style={{ padding: '0.75rem', background: 'hsl(var(--muted))', borderRadius: 8, fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>
                  O serviço será encerrado usando o KM atual da viatura sem alterá-lo. Use quando o KM final real não for conhecido.
                </div>
              )}
            </div>
            {msgEncerrarAdmin && (
              <div style={{ color: msgEncerrarAdmin.startsWith('✅') ? '#86efac' : '#fca5a5', marginBottom: '1rem' }}>
                {msgEncerrarAdmin}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => { setShowEncerrarAdmin(false); setServicoParaEncerrar(null); setKmFinalAdmin(''); setManterKmAtual(false); setKmAtualVtr(null); setMsgEncerrarAdmin(''); }}>
                Cancelar
              </Button>
              <Button onClick={encerrarServicoAdministrativo}>
                Confirmar Encerramento
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
