import { useEffect, useState } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
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
import { Edit } from 'lucide-react';

interface Viatura {
  id: string;
  MODELO: string;
  PLACA: string;
  KM: number;
  KMOLEO: number;
}

const ViaturaTableFull = () => {
  const [viaturas, setViaturas] = useState<Viatura[]>([]);
  const [selectedViatura, setSelectedViatura] = useState<Viatura | null>(null);
  const [newKm, setNewKm] = useState('');
  const [newKmOleo, setNewKmOleo] = useState('');
  const [isEditingAll, setIsEditingAll] = useState(false);
  const [editValues, setEditValues] = useState<{
    [id: string]: { KM: number; KMOLEO: number };
  }>({});

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
        const initialEditValues: { [id: string]: { KM: number; KMOLEO: number } } = {};
        viaturasFirebase.forEach((v) => {
          initialEditValues[v.id] = {
            KM: v.KM,
            KMOLEO: v.KMOLEO,
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

    if (kmRestante <= 1000) {
      return <Badge variant="destructive">CRÍTICO</Badge>;
    } else if (kmRestante <= 3000) {
      return <Badge variant="secondary">ATENÇÃO</Badge>;
    }
    return <Badge variant="default">OK</Badge>;
  };

  const handleUpdateSingle = async () => {
    if (!selectedViatura || !newKm || !newKmOleo) return;

    const updatedKm = parseInt(newKm);
    const updatedKmOleo = parseInt(newKmOleo);

    setViaturas((prev) =>
      prev.map((v) =>
        v.id === selectedViatura.id
          ? { ...v, KM: updatedKm, KMOLEO: updatedKmOleo }
          : v
      )
    );

    try {
      const viaturaRef = doc(db, 'frota', selectedViatura.id);
      await updateDoc(viaturaRef, {
        KM: updatedKm,
        KMOLEO: updatedKmOleo,
      });
    } catch (error) {
      console.error('Erro ao atualizar dados no Firestore:', error);
    }

    setSelectedViatura(null);
    setNewKm('');
    setNewKmOleo('');
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
              edited.KMOLEO !== v.KMOLEO)
          ) {
            const viaturaRef = doc(db, 'frota', v.id);
            await updateDoc(viaturaRef, {
              KM: edited.KM,
              KMOLEO: edited.KMOLEO,
            });
          }
        })
      );

      setViaturas((prev) =>
        prev.map((v) => ({
          ...v,
          KM: editValues[v.id]?.KM ?? v.KM,
          KMOLEO: editValues[v.id]?.KMOLEO ?? v.KMOLEO,
        }))
      );

      setIsEditingAll(false);
    } catch (error) {
      console.error('Erro ao salvar edição em massa:', error);
    }
  };

  const handleEditValueChange = (
    id: string,
    field: 'KM' | 'KMOLEO',
    value: string
  ) => {
    const parsedValue = parseInt(value);
    if (isNaN(parsedValue)) return;

    setEditValues((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: parsedValue },
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-2">
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
            <TableHead>STATUS</TableHead>
            <TableHead>AÇÕES</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {viaturas.map((viatura) => (
            <TableRow key={viatura.id}>
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
                  `${viatura.KM.toLocaleString()} km`
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
