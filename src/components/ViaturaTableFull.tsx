import { useEffect, useState } from 'react';
import { collection, getDocs, updateDoc, doc, addDoc, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Edit, AlertTriangle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Viatura {
  id: string;
  MODELO: string;
  PLACA: string;
  KM: number;
  KMOLEO: number;
  SALDO: number;
  cadastro?: string;
  tipo?: 'leve' | 'pesada';
}

interface OrdemServico {
  id: string;
  placa: string;
  valorTotal: number;
  dataOS: string;
}

const ViaturaTableFull = () => {
  const [viaturas, setViaturas] = useState<Viatura[]>([]);
  const [selectedViatura, setSelectedViatura] = useState<Viatura | null>(null);
  const [newKm, setNewKm] = useState('');
  const [newKmOleo, setNewKmOleo] = useState('');
  const [newSaldo, setNewSaldo] = useState('');
  const [isEditingAll, setIsEditingAll] = useState(false);
  const [editValues, setEditValues] = useState<{
    [id: string]: { KM: number; KMOLEO: number; SALDO: number };
  }>({});
  const [isUpdatingSaldos, setIsUpdatingSaldos] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchViaturas = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'frota'));
        const viaturasFirebase: Viatura[] = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Viatura[];

        setViaturas(viaturasFirebase);

        // Inicializa os valores de edição para edição em massa
        const initialEditValues: { [id: string]: { KM: number; KMOLEO: number; SALDO: number } } = {};
        viaturasFirebase.forEach((v) => {
          initialEditValues[v.id] = {
            KM: v.KM,
            KMOLEO: v.KMOLEO,
            SALDO: v.SALDO,
          };
        });
        setEditValues(initialEditValues);
      } catch (error) {
        console.error('Erro ao buscar viaturas:', error);
      }
    };

    fetchViaturas();
  }, []);

  const getStatusBadge = (viatura: Viatura) => {
    const kmRestante = (viatura.KMOLEO ?? 0) - (viatura.KM ?? 0);

    if (kmRestante <= 1000 || (viatura.SALDO ?? 0) < 1000) {
      return <Badge variant="destructive">CRÍTICO</Badge>;
    } else if (kmRestante <= 3000 || (viatura.SALDO ?? 0) < 2000) {
      return <Badge variant="secondary">ATENÇÃO</Badge>;
    }
    return <Badge variant="default">OK</Badge>;
  };

  const handleUpdateSingle = async () => {
    if (!selectedViatura || !newKm || !newKmOleo || !newSaldo) return;

    const updatedKm = parseInt(newKm);
    const updatedKmOleo = parseInt(newKmOleo);
    const updatedSaldo = parseFloat(newSaldo);

    setViaturas((prev) =>
      prev.map((v) =>
        v.id === selectedViatura.id
          ? { ...v, KM: updatedKm, KMOLEO: updatedKmOleo, SALDO: updatedSaldo }
          : v
      )
    );

    try {
      const viaturaRef = doc(db, 'frota', selectedViatura.id);
      await updateDoc(viaturaRef, {
        KM: updatedKm,
        KMOLEO: updatedKmOleo,
        SALDO: updatedSaldo,
      });
    } catch (error) {
      console.error('Erro ao atualizar dados no Firestore:', error);
    }

    setSelectedViatura(null);
    setNewKm('');
    setNewKmOleo('');
    setNewSaldo('');
  };

  // Edição em massa
  const handleSaveAll = async () => {
    try {
      await Promise.all(
        viaturas.map(async (v) => {
          const edited = editValues[v.id];
          if (
            edited &&
            (edited.KM !== v.KM ||
              edited.KMOLEO !== v.KMOLEO ||
              edited.SALDO !== v.SALDO)
          ) {
            const viaturaRef = doc(db, 'frota', v.id);
            await updateDoc(viaturaRef, {
              KM: edited.KM,
              KMOLEO: edited.KMOLEO,
              SALDO: edited.SALDO,
            });
          }
        })
      );

      setViaturas((prev) =>
        prev.map((v) => ({
          ...v,
          KM: editValues[v.id]?.KM ?? v.KM,
          KMOLEO: editValues[v.id]?.KMOLEO ?? v.KMOLEO,
          SALDO: editValues[v.id]?.SALDO ?? v.SALDO,
        }))
      );

      setIsEditingAll(false);
    } catch (error) {
      console.error('Erro ao salvar edição em massa:', error);
    }
  };

  const handleEditValueChange = (
    id: string,
    field: 'KM' | 'KMOLEO' | 'SALDO',
    value: string
  ) => {
    let parsedValue: number;
    if (field === 'SALDO') {
      parsedValue = parseFloat(value);
    } else {
      parsedValue = parseInt(value);
    }
    if (isNaN(parsedValue)) parsedValue = 0;

    setEditValues((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: parsedValue },
    }));
  };

  // Função para atualizar saldo de todas as viaturas
  const handleAtualizarSaldos = async () => {
    setIsUpdatingSaldos(true);
    
    try {
      const agora = new Date();
      const mesAtual = agora.getMonth() + 1;
      const anoAtual = agora.getFullYear();

      // Buscar todas as OS do mês atual
      const osSnapshot = await getDocs(collection(db, 'ordens'));
      const ordensMesAtual: OrdemServico[] = osSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as OrdemServico))
        .filter(os => {
          const dataOS = new Date(os.dataOS);
          return dataOS.getMonth() + 1 === mesAtual && dataOS.getFullYear() === anoAtual;
        });

      // Separar viaturas por tipo
      const viaturasPesadas = viaturas.filter(v => v.tipo === 'pesada');
      const viaturasLeves = viaturas.filter(v => v.tipo === 'leve' || !v.tipo);

      // Calcular saldo usado da frota pesada (soma de todas as OS das viaturas pesadas no mês)
      const placasPesadas = viaturasPesadas.map(v => v.PLACA);
      const saldoUsadoFrotaPesada = ordensMesAtual
        .filter(os => placasPesadas.includes(os.placa))
        .reduce((total, os) => total + (os.valorTotal || 0), 0);

      // Buscar cota da frota pesada
      const gestaoSaldosSnapshot = await getDocs(collection(db, 'gestaoSaldos'));
      const cotaFrotaPesada = gestaoSaldosSnapshot.docs.find(doc => doc.data().tipo === 'pesada')?.data()?.cota || 0;

      // Criar/atualizar registros na coleção saldoOficina
      for (const viatura of viaturas) {
        let saldoUsado = 0;
        let saldoDisponivel = 0;

        if (viatura.tipo === 'pesada') {
          // Para frota pesada, usar o saldo coletivo
          saldoUsado = saldoUsadoFrotaPesada;
          saldoDisponivel = cotaFrotaPesada - saldoUsadoFrotaPesada;
        } else {
          // Para frota leve, calcular individualmente
          saldoUsado = ordensMesAtual
            .filter(os => os.placa === viatura.PLACA)
            .reduce((total, os) => total + (os.valorTotal || 0), 0);
          
          // Buscar cota individual da viatura
          const cotaViatura = gestaoSaldosSnapshot.docs
            .find(doc => doc.data().placa === viatura.PLACA)?.data()?.cota || viatura.SALDO || 0;
          
          saldoDisponivel = cotaViatura - saldoUsado;
        }

        // Salvar na coleção saldoOficina
        await addDoc(collection(db, 'saldoOficina'), {
          placa: viatura.PLACA,
          cadastro: viatura.cadastro || '',
          modelo: viatura.MODELO,
          tipo: viatura.tipo || 'leve',
          saldoUsado: saldoUsado,
          saldoDisponivel: saldoDisponivel,
          mesReferencia: `${mesAtual.toString().padStart(2, '0')}/${anoAtual}`,
          dataAtualizacao: new Date().toISOString(),
        });
      }

      toast({
        title: "Saldos atualizados",
        description: `Saldos de ${viaturas.length} viaturas atualizados para ${mesAtual.toString().padStart(2, '0')}/${anoAtual}`,
      });

    } catch (error) {
      console.error('Erro ao atualizar saldos:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar os saldos. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingSaldos(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2 mb-2">
        <Button 
          onClick={handleAtualizarSaldos}
          disabled={isUpdatingSaldos}
          variant="secondary"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isUpdatingSaldos ? 'animate-spin' : ''}`} />
          {isUpdatingSaldos ? 'Atualizando...' : 'Atualizar Saldos'}
        </Button>
        <Button onClick={() => (isEditingAll ? handleSaveAll() : setIsEditingAll(true))}>
          {isEditingAll ? 'Salvar Todos' : 'Configurar Saldo'}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>MODELO</TableHead>
            <TableHead>PLACA</TableHead>
            <TableHead>KM ATUAL</TableHead>
            <TableHead>TROCA ÓLEO</TableHead>
            <TableHead>SALDO</TableHead>
            <TableHead>STATUS</TableHead>
            <TableHead>AÇÕES</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {viaturas.map((viatura) => (
            <TableRow
              key={viatura.id}
              className={
                ((viatura.KMOLEO ?? 0) - (viatura.KM ?? 0) <= 3000 ||
                  (viatura.SALDO ?? 0) < 2000) &&
                'bg-destructive/10 border-destructive/20'
              }
            >
              <TableCell className="font-medium">{viatura.MODELO}</TableCell>
              <TableCell>{viatura.PLACA}</TableCell>

              <TableCell>
                {isEditingAll ? (
                  <Input
                    type="number"
                    value={editValues[viatura.id]?.KM ?? ''}
                    onChange={(e) =>
                      handleEditValueChange(viatura.id, 'KM', e.target.value)
                    }
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    {viatura.KM.toLocaleString()} km
                    {(viatura.KMOLEO - viatura.KM <= 3000) && (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                )}
              </TableCell>

              <TableCell>
                {isEditingAll ? (
                  <Input
                    type="number"
                    value={editValues[viatura.id]?.KMOLEO ?? ''}
                    onChange={(e) =>
                      handleEditValueChange(viatura.id, 'KMOLEO', e.target.value)
                    }
                  />
                ) : (
                  `${viatura.KMOLEO.toLocaleString()} km`
                )}
              </TableCell>

              <TableCell>
                {isEditingAll ? (
                  <Input
                    type="number"
                    value={editValues[viatura.id]?.SALDO ?? ''}
                    onChange={(e) =>
                      handleEditValueChange(viatura.id, 'SALDO', e.target.value)
                    }
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    R$ {viatura.SALDO.toLocaleString()}
                    {viatura.SALDO < 2000 && (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                )}
              </TableCell>

              <TableCell>{getStatusBadge(viatura)}</TableCell>

              <TableCell>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedViatura(viatura);
                        setNewKm(viatura.KM.toString());
                        setNewKmOleo(viatura.KMOLEO.toString());
                        setNewSaldo(viatura.SALDO.toString());
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Atualizar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Atualizar Quilometragem</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground mb-2">
                        Viatura: {selectedViatura?.MODELO} - {selectedViatura?.PLACA}
                      </p>
                      <div>
                        <label className="text-sm font-medium">Nova Quilometragem:</label>
                        <Input
                          type="number"
                          value={newKm}
                          onChange={(e) => setNewKm(e.target.value)}
                          placeholder="Digite a nova quilometragem"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Próxima troca de óleo (KM):</label>
                        <Input
                          type="number"
                          value={newKmOleo}
                          onChange={(e) => setNewKmOleo(e.target.value)}
                          placeholder="Ex: 120000"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Saldo disponível (R$):</label>
                        <Input
                          type="number"
                          value={newSaldo}
                          onChange={(e) => setNewSaldo(e.target.value)}
                          placeholder="Ex: 2500"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setSelectedViatura(null)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={() => {
                            handleUpdateSingle();
                          }}
                        >
                          Atualizar
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ViaturaTableFull;
