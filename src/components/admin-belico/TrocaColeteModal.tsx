import { useEffect, useState } from 'react';
import { collection, doc, getDocs, query, where, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { registrarEvento } from '@/lib/auditoria';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/** Colete novo: qualquer colete livre na reserva e dentro da validade (tamanho/sexo livres). */
export const coleteCompativel = (antigo: any, c: any, hoje = new Date()) =>
  c.id !== antigo.id &&
  c.disponivel === true && !c.cautelado && !c.baixado && !c.transferido &&
  !!c.vencimento && new Date(c.vencimento) > hoje;

/** Item da cautela permanente para o colete novo (mesmo formato do CadastroMateriais). */
const itemCautela = (c: any) => {
  const item: any = { materialId: c.id, nome: c.nome || 'Colete Balístico', categoria: 'Colete Balístico', quantidade: 1 };
  for (const k of ['numeroSerie', 'tamanhoColete', 'sexo', 'fabricante', 'modelo']) if (c[k]) item[k] = c[k];
  return item;
};

interface Props {
  colete: any | null;
  onClose: () => void;
  onSuccess: () => void;
}

const TrocaColeteModal = ({ colete, onClose, onSuccess }: Props) => {
  const [opcoes, setOpcoes] = useState<any[]>([]);
  const [cautela, setCautela] = useState<{ id: string; data: any } | null>(null);
  const [novoId, setNovoId] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [baixarColog, setBaixarColog] = useState(false);

  useEffect(() => {
    if (!colete) return;
    setNovoId('');
    setBaixarColog(!!colete.vencimento && new Date(colete.vencimento) <= new Date());
    setCarregando(true);
    Promise.all([
      getDocs(query(collection(db, 'materiais_belicos'), where('categoria', '==', 'Colete Balístico'))),
      getDocs(query(collection(db, 'cautelas_permanentes'), where('status', '==', 'ativa'))),
    ])
      .then(([mats, cauts]) => {
        const lista = mats.docs.map(d => ({ id: d.id, ...d.data() }))
          .filter(c => coleteCompativel(colete, c))
          .sort((a: any, b: any) => {
            const pa = (a.tamanhoColete === colete.tamanhoColete ? 0 : 2) + (a.sexo === colete.sexo ? 0 : 1);
            const pb = (b.tamanhoColete === colete.tamanhoColete ? 0 : 2) + (b.sexo === colete.sexo ? 0 : 1);
            return pa - pb || String(b.vencimento).localeCompare(String(a.vencimento));
          });
        setOpcoes(lista);
        if (lista[0]) setNovoId(lista[0].id);
        const c = cauts.docs.find(d => (d.data().materiais || []).some((m: any) => m.materialId === colete.id));
        setCautela(c ? { id: c.id, data: c.data() } : null);
      })
      .catch(e => { console.error(e); toast.error('Erro ao carregar coletes'); })
      .finally(() => setCarregando(false));
  }, [colete]);

  const confirmar = async () => {
    const novo = opcoes.find(o => o.id === novoId);
    if (!colete || !novo || !cautela) return;
    setSalvando(true);
    try {
      const policialId = cautela.data.policialId || '';
      const policialNome = cautela.data.policialNome || colete.policialAssociadoNome || '';
      const agora = Timestamp.now();
      const batch = writeBatch(db);

      // Antigo volta ao estoque como vencido (indisponível para nova entrega).
      batch.update(doc(db, 'materiais_belicos', colete.id), {
        cautelado: false, disponivel: false, policialAssociadoId: '', policialAssociadoNome: '',
        devolvidoVencido: true, dataDevolucao: agora, substituidoPor: novo.id,
        ...(baixarColog ? { baixado: true, dataBaixa: agora, motivoBaixa: 'Vencimento', destinoBaixa: 'COLOG' } : {}),
      });
      if (baixarColog) {
        batch.set(doc(collection(db, 'baixas_materiais')), {
          materialId: colete.id, nome: colete.nome || 'Colete Balístico', numeroSerie: colete.numeroSerie || '',
          categoria: 'Colete Balístico', fabricante: colete.fabricante || '', modelo: colete.modelo || '',
          vencimento: colete.vencimento || '', sexo: colete.sexo || '', tamanhoColete: colete.tamanhoColete || '',
          motivoBaixa: 'Vencimento', destino: 'COLOG',
          observacoes: `Baixa na troca de colete; substituído por ${novo.numeroSerie || novo.id}`,
          policialCauteladoNome: policialNome, policialCauteladoMatricula: cautela.data.policialMatricula || '',
          policialCauteladoId: policialId, dataBaixa: agora, criadoPor: '',
        });
      }
      batch.update(doc(db, 'materiais_belicos', novo.id), {
        cautelado: true, disponivel: false, policialAssociadoId: policialId, policialAssociadoNome: policialNome,
        substituiu: colete.id,
      });
      batch.update(doc(db, 'cautelas_permanentes', cautela.id), {
        materiais: (cautela.data.materiais || []).map((m: any) => (m.materialId === colete.id ? itemCautela(novo) : m)),
      });
      const hist = collection(db, 'historico_material');
      batch.set(doc(hist), {
        materialId: colete.id, materialNome: 'Colete Balístico', numeroSerie: colete.numeroSerie || '',
        policialNome, policialId, tipo: 'devolvido', data: new Date(),
        observacoes: `Troca de colete: devolvido vencido ao estoque, substituído por ${novo.numeroSerie || novo.id}`,
      });
      if (baixarColog) batch.set(doc(hist), {
        materialId: colete.id, materialNome: 'Colete Balístico', numeroSerie: colete.numeroSerie || '',
        policialNome, policialId, tipo: 'baixa', data: new Date(),
        observacoes: 'Baixa: Vencimento - Destino: COLOG (troca de colete)',
      });
      batch.set(doc(hist), {
        materialId: novo.id, materialNome: 'Colete Balístico', numeroSerie: novo.numeroSerie || '',
        policialNome, policialId, tipo: 'cautelado', data: new Date(),
        observacoes: `Troca de colete: entregue em substituição ao ${colete.numeroSerie || colete.id}`,
      });
      await batch.commit();

      registrarEvento({
        tipo: 'colete_troca', origem: 'TrocaColeteModal', policialId, policialNome,
        materialId: novo.id, numeroSerie: novo.numeroSerie,
        descricao: `Troca de colete: ${colete.numeroSerie || colete.id} (vencido, ao estoque) por ${novo.numeroSerie || novo.id}`,
      });
      if (baixarColog) registrarEvento({
        tipo: 'material_baixa', origem: 'TrocaColeteModal', policialId, policialNome,
        materialId: colete.id, numeroSerie: colete.numeroSerie,
        descricao: 'Baixa: Vencimento - Destino: COLOG (troca de colete)',
      });
      toast.success('Colete trocado com sucesso');
      onSuccess();
      onClose();
    } catch (e) {
      console.error('Erro na troca de colete:', e);
      toast.error('Erro ao trocar colete. Nada foi alterado.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={!!colete} onOpenChange={o => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Trocar colete</DialogTitle></DialogHeader>
        {colete && (
          <div className="space-y-3 text-sm">
            <p><b>Policial:</b> {cautela?.data.policialNome || colete.policialAssociadoNome || '-'}</p>
            <p><b>Colete atual:</b> {colete.numeroSerie} | Tam {colete.tamanhoColete} | {colete.sexo} | Venc {colete.vencimento}</p>
            {carregando ? <p>Carregando...</p> : !cautela ? (
              <p className="text-destructive">Cautela permanente ativa com este colete não encontrada.</p>
            ) : opcoes.length === 0 ? (
              <p className="text-destructive">Sem colete disponível na reserva dentro da validade.</p>
            ) : (
              <label className="block">
                <b>Colete novo:</b>
                <select className="mt-1 w-full border rounded p-2 bg-background" value={novoId} onChange={e => setNovoId(e.target.value)}>
                  {opcoes.map(o => (
                    <option key={o.id} value={o.id}>{o.numeroSerie || o.id} | {o.fabricante || ''} | Venc {o.vencimento}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="flex items-start gap-2 rounded border p-2 cursor-pointer">
              <input type="checkbox" className="mt-1" checked={baixarColog} onChange={e => setBaixarColog(e.target.checked)} />
              <span><b>Colete vencido: dar baixa e enviar para Saiu da Carga</b><br />
                <span className="text-muted-foreground">Destino COLOG, motivo Vencimento.</span></span>
            </label>
            <p className="text-muted-foreground">{baixarColog
              ? 'O colete atual sai da carga (baixa para COLOG). Todo o histórico dele fica guardado.'
              : 'O colete atual volta ao estoque como vencido. A troca fica no histórico dos dois coletes.'}</p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={confirmar} disabled={salvando || !novoId || !cautela}>{salvando ? 'Salvando...' : 'Confirmar entrega'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TrocaColeteModal;
