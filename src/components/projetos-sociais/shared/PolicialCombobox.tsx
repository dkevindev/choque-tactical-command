import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PolicialComboboxProps {
  onSelect: (policial: any) => void;
  value?: string;
  disabled?: boolean;
}

const PolicialCombobox = ({ onSelect, value, disabled }: PolicialComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [policiais, setPoliciais] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedValue, setSelectedValue] = useState(value || '');

  useEffect(() => {
    carregarPoliciais();
  }, []);

  const carregarPoliciais = async () => {
    try {
      const q = query(
        collection(db, 'policiais'),
        where('acessos.projetosSociais', '==', true)
      );
      const snapshot = await getDocs(q);
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

  const getPolicialNome = (policialId: string) => {
    const policial = policiais.find(p => p.id === policialId);
    if (!policial) return 'Selecionar policial...';
    return `${policial.postGrad || ''} ${policial.numeral || ''} ${policial.nome || policial.nomeGuerra}`.trim();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled || loading}
        >
          {loading ? 'Carregando...' : getPolicialNome(selectedValue)}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Buscar policial..." />
          <CommandEmpty>Nenhum policial encontrado.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {policiais.map((policial) => (
              <CommandItem
                key={policial.id}
                value={`${policial.postGrad} ${policial.numeral} ${policial.nome} ${policial.nomeGuerra} ${policial.matricula}`.toLowerCase()}
                onSelect={() => {
                  setSelectedValue(policial.id);
                  onSelect(policial);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    selectedValue === policial.id ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <div className="flex flex-col">
                  <span className="font-medium">
                    {policial.postGrad} {policial.numeral} {policial.nome || policial.nomeGuerra}
                  </span>
                  {policial.matricula && (
                    <span className="text-xs text-muted-foreground">
                      Matrícula: {policial.matricula}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default PolicialCombobox;
