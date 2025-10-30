import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';

export interface PolicialData {
  id: string;
  posto: string; // Post/Grad
  matricula: string;
  nomeGuerra: string;
  nome: string;
  numeral?: number;
}

interface PolicialSearchComboboxProps {
  value?: string;
  onSelect: (policial: PolicialData | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

const PolicialSearchCombobox = ({
  value,
  onSelect,
  placeholder = "Buscar policial...",
  disabled = false,
}: PolicialSearchComboboxProps) => {
  const [policiais, setPoliciais] = useState<PolicialData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadPoliciais();
  }, []);

  const loadPoliciais = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'policiais'));
      const data: PolicialData[] = [];

      querySnapshot.forEach((doc) => {
        const policialData = doc.data();
        data.push({
          id: doc.id,
          posto: policialData['Post/Grad'] || '',
          matricula: String(policialData.Matrícula || ''),
          nomeGuerra: policialData['NOME DE GUERRA'] || policialData.NOME || '',
          nome: policialData.NOME || '',
          numeral: policialData.NUMERAL,
        });
      });

      setPoliciais(data);
    } catch (error) {
      console.error('Erro ao carregar policiais:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatarPolicialParaExibicao = (policial: PolicialData): string => {
    const { posto, numeral, nomeGuerra } = policial;
    
    if (numeral) {
      return `${posto} ${numeral} ${nomeGuerra}`.trim();
    } else {
      return `${posto} ${nomeGuerra}`.trim();
    }
  };

  const filteredPoliciais = policiais.filter((p) => {
    if (!p) return false;
    const termo = (searchTerm || '').toLowerCase();
    return (
      (p.nome || '').toLowerCase().includes(termo) ||
      (p.nomeGuerra || '').toLowerCase().includes(termo) ||
      (p.matricula || '').includes(termo) ||
      (p.numeral && String(p.numeral).includes(termo)) ||
      (p.posto || '').toLowerCase().includes(termo)
    );
  });

  const selectedPolicial = policiais.find((p) => p.id === value);

  const handleSelect = (policialId: string) => {
    const selected = policiais.find((p) => p.id === policialId);
    onSelect(selected || null);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <Select
      value={value}
      onValueChange={handleSelect}
      disabled={disabled}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <SelectTrigger className="w-full">
        <div className="flex items-center gap-2 w-full">
          <Search className="h-4 w-4 shrink-0 opacity-50" />
          <SelectValue placeholder={placeholder}>
            {selectedPolicial ? formatarPolicialParaExibicao(selectedPolicial) : placeholder}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent className="w-[400px]">
        <div className="p-2 border-b">
          <Input
            placeholder="Digite nome, matrícula ou numeral..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9"
            autoFocus
          />
        </div>
        <ScrollArea className="h-[300px]">
          <SelectGroup>
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Carregando...
              </div>
            ) : filteredPoliciais.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Nenhum policial encontrado
              </div>
            ) : (
              filteredPoliciais.map((policial) => (
                <SelectItem key={policial.id} value={policial.id}>
                  <div className="flex flex-col py-1">
                    <span className="font-medium">
                      {formatarPolicialParaExibicao(policial)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {policial.nome}
                    </span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectGroup>
        </ScrollArea>
      </SelectContent>
    </Select>
  );
};

export default PolicialSearchCombobox;
