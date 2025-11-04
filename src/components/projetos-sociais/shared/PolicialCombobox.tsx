import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PolicialComboboxProps {
  onSelect: (policial: any) => void;
  value?: string;
  disabled?: boolean;
}

const PolicialCombobox = ({ onSelect, value, disabled }: PolicialComboboxProps) => {
  const [policiais, setPoliciais] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    carregarPoliciais();
  }, []);

  const carregarPoliciais = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'policiais'));
      const policiaisData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPoliciais(policiaisData);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar policiais:', error);
      setLoading(false);
    }
  };

  const getPolicialDisplay = (policial: any) => {
    if (!policial) return '';
    const parts = [
      policial.postGrad,
      policial.numeral,
      policial.nome || policial.nomeGuerra
    ].filter(Boolean);
    return parts.join(' ');
  };

  const filteredPoliciais = policiais.filter(policial => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const display = getPolicialDisplay(policial).toLowerCase();
    const matricula = (policial.matricula || '').toLowerCase();
    return display.includes(searchLower) || matricula.includes(searchLower);
  });

  const handleSelectChange = (policialId: string) => {
    const policial = policiais.find(p => p.id === policialId);
    if (policial) {
      onSelect(policial);
    }
  };

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Carregando..." />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <div className="space-y-2">
      <Input
        placeholder="Buscar por nome, numeral ou matrícula..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        disabled={disabled}
      />
      <Select value={value} onValueChange={handleSelectChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione um policial" />
        </SelectTrigger>
        <SelectContent>
          {filteredPoliciais.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Nenhum policial encontrado
            </div>
          ) : (
            filteredPoliciais.map((policial) => (
              <SelectItem key={policial.id} value={policial.id}>
                <div className="flex flex-col">
                  <span>{getPolicialDisplay(policial)}</span>
                  {policial.matricula && (
                    <span className="text-xs text-muted-foreground">
                      Mat: {policial.matricula}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

export default PolicialCombobox;
