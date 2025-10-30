import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  const [open, setOpen] = useState(false);
  const [policiais, setPoliciais] = useState<PolicialData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
    const { posto, matricula, nomeGuerra } = policial;
    
    if (matricula) {
      return `${posto} ${matricula} ${nomeGuerra}`.trim();
    } else {
      return `${posto} ${nomeGuerra}`.trim();
    }
  };

  const filteredPoliciais = (policiais || []).filter((p) => {
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          <span className="flex items-center gap-2 truncate">
            <Search className="h-4 w-4 shrink-0 opacity-50" />
            {selectedPolicial
              ? formatarPolicialParaExibicao(selectedPolicial)
              : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Digite nome, matrícula ou numeral..."
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandEmpty>
            {loading ? 'Carregando...' : 'Nenhum policial encontrado.'}
          </CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-auto">
            {filteredPoliciais.length > 0 ? (
              filteredPoliciais.map((policial) => (
                <CommandItem
                  key={policial.id}
                  value={policial.id}
                  onSelect={(currentValue) => {
                    const selected = policiais.find((p) => p.id === currentValue);
                    onSelect(selected || null);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === policial.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {formatarPolicialParaExibicao(policial)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {policial.nome}
                    </span>
                  </div>
                </CommandItem>
              ))
            ) : null}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default PolicialSearchCombobox;
