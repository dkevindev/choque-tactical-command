import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Car, User, MapPin, Gauge, Clock, ClipboardList } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';

interface Props {
  ficha: any | null;
  open: boolean;
  onClose: () => void;
}

const fmtDT = (iso?: string) => {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yy} ${hh}:${mi}`;
  } catch { return '-'; }
};

const CHECKLIST_ITEMS: { key: string; label: string; problemaSe: (v: any) => boolean; render?: (v: any) => string }[] = [
  { key: 'oleoMotor', label: 'Óleo do motor', problemaSe: v => v && v !== 'nivel' },
  { key: 'aguaRadiador', label: 'Água do radiador', problemaSe: v => v && v !== 'nivel' },
  { key: 'step', label: 'Step', problemaSe: v => v === 'nao_possui' },
  { key: 'macaco', label: 'Macaco', problemaSe: v => v === 'nao_possui' },
  { key: 'chaveRoda', label: 'Chave de roda', problemaSe: v => v === 'nao_possui' },
  { key: 'triangulo', label: 'Triângulo', problemaSe: v => v === 'nao_possui' },
  { key: 'cartaoAbastecimento', label: 'Cartão de abastecimento', problemaSe: v => v === 'nao_possui' },
  {
    key: 'smartphone', label: 'Smartphone',
    problemaSe: v => v?.estado === 'avariado' || v?.conexao === 'sem_conexao',
    render: v => v ? `Estado: ${v.estado || '-'} • Conexão: ${v.conexao || '-'}` : '-',
  },
  { key: 'radioFixo', label: 'Rádio fixo', problemaSe: v => v === 'sem_sinal' },
];

const labelValor = (v: any) => {
  if (v === undefined || v === null) return '-';
  if (typeof v === 'string') return v.replace(/_/g, ' ');
  return String(v);
};

const DetalheFichaModal = ({ ficha, open, onClose }: Props) => {
  const [checklistFallback, setChecklistFallback] = useState<any>(null);
  const [avariasFallback, setAvariasFallback] = useState<any[] | null>(null);

  useEffect(() => {
    setChecklistFallback(null);
    setAvariasFallback(null);
    if (!ficha || !open) return;
    if (ficha.checklistInicial && ficha.avariasIniciais) return;
    (async () => {
      if (!ficha.viaturaId) return;
      try {
        const snap = await getDoc(doc(db, 'frota', ficha.viaturaId));
        if (snap.exists()) {
          const data: any = snap.data();
          if (!ficha.checklistInicial) setChecklistFallback(data.ultimoChecklist || null);
          if (!ficha.avariasIniciais) setAvariasFallback(Array.isArray(data.avarias) ? data.avarias : []);
        }
      } catch (e) { console.error(e); }
    })();
  }, [ficha, open]);

  if (!ficha) return null;

  const checklist = ficha.checklistInicial || checklistFallback;
  const avarias: any[] = ficha.avariasIniciais || avariasFallback || [];
  const kmRod = typeof ficha.kmRodada === 'number'
    ? ficha.kmRodada
    : (typeof ficha.kmFinal === 'number' && typeof ficha.kmInicial === 'number')
      ? ficha.kmFinal - ficha.kmInicial : null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3 flex-wrap">
            <span className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Ficha de Serviço — {ficha.cadastro || ficha.placa || 'VTR'}
            </span>
            {ficha.status === 'encerrado'
              ? <Badge variant="secondary">Encerrado</Badge>
              : <Badge className="bg-primary">Aberto</Badge>}
          </DialogTitle>
        </DialogHeader>

        {/* Cabeçalho */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm border border-border rounded-lg p-3 bg-muted/30">
          <div className="flex items-center gap-2"><Car className="h-4 w-4 text-muted-foreground" /><strong>VTR:</strong> {ficha.cadastro || '-'} • {ficha.placa || '-'}</div>
          <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><strong>Motorista:</strong> {ficha.policialNomeGuerra1 || ficha.motorista || '-'}</div>
          <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /><strong>Área:</strong> {ficha.area || ficha.localAtuacao || '-'}</div>
          <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><strong>Início:</strong> {fmtDT(ficha.iniciadoEm)}</div>
          <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><strong>Fim:</strong> {fmtDT(ficha.encerradoEm)}</div>
          <div className="flex items-center gap-2"><Gauge className="h-4 w-4 text-muted-foreground" /><strong>KM:</strong> {ficha.kmInicial ?? '-'} → {ficha.kmFinal ?? '-'} {kmRod !== null && <span className="text-muted-foreground">({kmRod} km)</span>}</div>
          {ficha.encerradoPorNomeGuerra1 && (
            <div className="flex items-center gap-2 sm:col-span-2"><User className="h-4 w-4 text-muted-foreground" /><strong>Encerrada por:</strong> {ficha.encerradoPorNomeGuerra1}</div>
          )}
        </div>

        {/* Avarias da entrada */}
        <div className="mt-4">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Avarias registradas na entrada {avarias.length > 0 && <Badge variant="destructive">{avarias.length}</Badge>}
          </h3>
          {avarias.length === 0 ? (
            <div className="text-sm text-muted-foreground border border-border rounded-md p-3">Nenhuma avaria registrada na entrada.</div>
          ) : (
            <div className="space-y-2">
              {avarias.map((a: any, i: number) => (
                <div key={i} className="border border-border rounded-md p-3 text-sm bg-muted/20">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {a.angulo && <Badge variant="outline">{a.angulo}</Badge>}
                    {a.tipo && <span className="font-medium">{a.tipo}</span>}
                    {a.gravidade && <Badge className={a.gravidade === 'GRAVE' ? 'bg-red-600' : a.gravidade === 'MODERADA' ? 'bg-amber-600' : 'bg-emerald-600'}>{a.gravidade}</Badge>}
                  </div>
                  {a.descricao && <div className="text-muted-foreground">{a.descricao}</div>}
                  {a.foto && <img src={a.foto} alt="avaria" className="mt-2 rounded max-h-40" />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Checklist */}
        <div className="mt-4">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            Checklist da viatura (entrada)
          </h3>
          {!checklist ? (
            <div className="text-sm text-muted-foreground border border-border rounded-md p-3">Checklist não disponível para esta ficha.</div>
          ) : (
            <div className="border border-border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {CHECKLIST_ITEMS.map(item => {
                    const v = checklist[item.key];
                    const problema = item.problemaSe(v);
                    return (
                      <tr key={item.key} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 font-medium w-1/2">{item.label}</td>
                        <td className={`px-3 py-2 ${problema ? 'text-destructive font-semibold' : ''}`}>
                          {item.render ? item.render(v) : labelValor(v)}
                          {problema && <AlertTriangle className="inline-block h-4 w-4 ml-2" />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {checklist.verificadoPor && (
                <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/30">
                  Verificado por {checklist.verificadoPor} em {fmtDT(checklist.dataVerificacao)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Avaria no encerramento */}
        {ficha.status === 'encerrado' && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Avaria no encerramento
            </h3>
            <div className="border border-border rounded-md p-3 text-sm">
              <div><strong>Constatou avaria:</strong> {ficha.constatouAvaria ? 'Sim' : 'Não'}</div>
              {ficha.constatouAvaria && ficha.descricaoAvariaFim && (
                <div className="mt-1 text-muted-foreground"><strong className="text-foreground">Descrição:</strong> {ficha.descricaoAvariaFim}</div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DetalheFichaModal;
