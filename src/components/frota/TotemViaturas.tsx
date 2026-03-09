import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ViaturaTotem {
  id: string;
  ORD: number;
  CADASTRO: string;
  PLACA: string;
  KM: number;
  KMOLEO: number;
  PNEU?: string;
  BATERIA?: string;
  SITUACAO: string;
  GOODCARD: string;
  UTILIZACAO?: string;
  tipo?: 'leve' | 'pesada';
}

// Ordem fixa das viaturas operacionais
const ORDEM_OPERACIONAL = [
  'CAV - 05', 'CAV - 06', 'CAV - 08', 'CAV - 11', 'CAV - 12', 'CAV - 13',
];

const normalize = (v: string) => String(v || '').replace(/[\s\-]/g, '').toLowerCase();

const getOrdemPrioridade = (v: ViaturaTotem): number => {
  const cadNorm = normalize(v.CADASTRO);
  
  // 1. Operacionais na ordem fixa
  const idxOp = ORDEM_OPERACIONAL.findIndex(op => normalize(op) === cadNorm);
  if (idxOp !== -1) return idxOp;

  // 2. Frota pesada
  if (v.tipo === 'pesada') return 100 + (v.ORD || 99);

  // 3. Administrativa / resto
  return 200 + (v.ORD || 99);
};

const formatNumber = (n: number | undefined | null): string => {
  if (n === undefined || n === null) return '-';
  return n.toLocaleString('pt-BR');
};

const TotemViaturas = () => {
  const [viaturas, setViaturas] = useState<ViaturaTotem[]>([]);
  const [dataAtual, setDataAtual] = useState('');

  useEffect(() => {
    const now = new Date();
    setDataAtual(now.toLocaleDateString('pt-BR'));

    const fetchViaturas = async () => {
      try {
        const snap = await getDocs(collection(db, 'frota'));
        const lista: ViaturaTotem[] = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as ViaturaTotem[];

        lista.sort((a, b) => getOrdemPrioridade(a) - getOrdemPrioridade(b));
        setViaturas(lista);
      } catch (err) {
        console.error('Erro ao buscar viaturas:', err);
      }
    };

    fetchViaturas();

    // Auto-refresh a cada 2 minutos
    const interval = setInterval(fetchViaturas, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-white text-black p-6 flex flex-col">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-3xl font-bold tracking-wide">CONTROLE DE VIATURAS</h1>
        <p className="text-lg font-medium text-left mt-2">DATA: {dataAtual}</p>
      </div>

      {/* Tabela */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse border border-black text-sm">
          <thead>
            <tr className="bg-black text-white">
              <th className="border border-black px-3 py-2 text-center font-bold">ORD</th>
              <th className="border border-black px-3 py-2 text-center font-bold">VEÍCULO</th>
              <th className="border border-black px-3 py-2 text-center font-bold">PLACA</th>
              <th className="border border-black px-3 py-2 text-center font-bold">KM ATUAL</th>
              <th className="border border-black px-3 py-2 text-center font-bold">PRÓX TROCA</th>
              <th className="border border-black px-3 py-2 text-center font-bold">PNEU</th>
              <th className="border border-black px-3 py-2 text-center font-bold">BATERIA</th>
              <th className="border border-black px-3 py-2 text-center font-bold">SITUAÇÃO</th>
              <th className="border border-black px-3 py-2 text-center font-bold">CARTÃO</th>
            </tr>
          </thead>
          <tbody>
            {viaturas.map((v, idx) => (
              <tr
                key={v.id}
                className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-100'}
              >
                <td className="border border-black px-3 py-2 text-center font-medium">
                  {String(idx + 1).padStart(2, '0')}
                </td>
                <td className="border border-black px-3 py-2 text-center font-medium">
                  {v.CADASTRO || '-'}
                </td>
                <td className="border border-black px-3 py-2 text-center font-medium">
                  {v.PLACA || '-'}
                </td>
                <td className="border border-black px-3 py-2 text-center font-medium">
                  {formatNumber(v.KM)}
                </td>
                <td className="border border-black px-3 py-2 text-center font-medium">
                  {formatNumber(v.KMOLEO)}
                </td>
                <td className="border border-black px-3 py-2 text-center font-medium">
                  {v.PNEU || '-'}
                </td>
                <td className="border border-black px-3 py-2 text-center font-medium">
                  {v.BATERIA || '-'}
                </td>
                <td className="border border-black px-3 py-2 text-center font-medium">
                  {v.SITUACAO || '-'}
                </td>
                <td className="border border-black px-3 py-2 text-center font-medium">
                  {v.GOODCARD || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TotemViaturas;
