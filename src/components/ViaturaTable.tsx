import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, AlertTriangle } from 'lucide-react';

interface Viatura {
  id: string;
  modelo: string;
  placa: string;
  km: number;
  trocaOleo: number;
  saldo: number;
}

const ViaturaTable = () => {
  const [viaturas, setViaturas] = useState<Viatura[]>([
    { id: '1', modelo: 'HILUX', placa: 'PYX8020', km: 82000, trocaOleo: 85000, saldo: 2000 },
    { id: '2', modelo: 'AMAROK', placa: 'ABC1234', km: 45000, trocaOleo: 50000, saldo: 500 },
    { id: '3', modelo: 'RANGER', placa: 'XYZ9876', km: 78000, trocaOleo: 80000, saldo: 3000 },
    { id: '4', modelo: 'L200', placa: 'DEF5678', km: 91000, trocaOleo: 95000, saldo: 800 }
  ]);

  const [selectedViatura, setSelectedViatura] = useState<Viatura | null>(null);
  const [newKm, setNewKm] = useState('');

  const getStatusBadge = (viatura: Viatura) => {
    const kmRestante = viatura.trocaOleo - viatura.km;
    
    if (kmRestante <= 1000 || viatura.saldo < 1000) {
      return <Badge variant="destructive">CRÍTICO</Badge>;
    } else if (kmRestante <= 3000 || viatura.saldo < 2000) {
      return <Badge variant="secondary">ATENÇÃO</Badge>;
    }
    return <Badge variant="default">OK</Badge>;
  };

  const handleUpdateKm = () => {
    if (!selectedViatura || !newKm) return;

    const updatedKm = parseInt(newKm);
    setViaturas(prev =>
      prev.map(v =>
        v.id === selectedViatura.id
          ? { ...v, km: updatedKm }
          : v
      )
    );
    setSelectedViatura(null);
    setNewKm('');
  };

  const needsMaintenance = (viatura: Viatura) => {
    const kmRestante = viatura.trocaOleo - viatura.km;
    return kmRestante <= 3000;
  };

  const lowBalance = (viatura: Viatura) => {
    return viatura.saldo < 2000;
  };

  return (
    <div className="space-y-4">
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
            <TableRow key={viatura.id} className={
              needsMaintenance(viatura) || lowBalance(viatura) 
                ? 'bg-destructive/10 border-destructive/20' 
                : ''
            }>
              <TableCell className="font-medium">{viatura.modelo}</TableCell>
              <TableCell>{viatura.placa}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {viatura.km.toLocaleString()} km
                  {needsMaintenance(viatura) && (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                </div>
              </TableCell>
              <TableCell>{viatura.trocaOleo.toLocaleString()} km</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  R$ {viatura.saldo.toLocaleString()}
                  {lowBalance(viatura) && (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                </div>
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
                        setNewKm(viatura.km.toString());
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Atualizar KM
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Atualizar Quilometragem</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Viatura: {selectedViatura?.modelo} - {selectedViatura?.placa}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          KM Atual: {selectedViatura?.km.toLocaleString()} km
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Nova Quilometragem:</label>
                        <Input
                          type="number"
                          value={newKm}
                          onChange={(e) => setNewKm(e.target.value)}
                          placeholder="Digite a nova quilometragem"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setSelectedViatura(null)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleUpdateKm}>
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

export default ViaturaTable;