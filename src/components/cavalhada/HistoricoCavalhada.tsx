import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { historicoGeral, type EventoHistorico } from '@/lib/cavalhada';
import LinhaDoTempo from './LinhaDoTempo';

interface Props {
  versao: number;
  onAbrir: (id: string) => void;
}

const POR_PAGINA = 50;

const HistoricoCavalhada = ({ versao, onAbrir }: Props) => {
  const [eventos, setEventos] = useState<EventoHistorico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [tipo, setTipo] = useState('SEM_IMPORTACAO');
  const [limite, setLimite] = useState(POR_PAGINA);

  useEffect(() => {
    setCarregando(true);
    historicoGeral()
      .then(setEventos)
      .catch((e) => console.error(e))
      .finally(() => setCarregando(false));
  }, [versao]);

  const filtrados = useMemo(() => eventos.filter((e) =>
    tipo === 'TODOS' ? true : tipo === 'SEM_IMPORTACAO' ? e.tipo !== 'IMPORTACAO' : e.tipo === tipo), [eventos, tipo]);

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{filtrados.length} registro(s)</p>
          <Select value={tipo} onValueChange={(v) => { setTipo(v); setLimite(POR_PAGINA); }}>
            <SelectTrigger className="w-60" aria-label="Tipo de registro"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="SEM_IMPORTACAO">Movimentações e correções</SelectItem>
              <SelectItem value="MOVIMENTACAO">Só movimentações</SelectItem>
              <SelectItem value="CADASTRO">Só cadastros novos</SelectItem>
              <SelectItem value="EDICAO">Só correções de dados</SelectItem>
              <SelectItem value="IMPORTACAO">Só importação</SelectItem>
              <SelectItem value="TODOS">Tudo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {carregando ? (
          <p className="text-sm text-muted-foreground flex items-center"><Loader2 className="h-4 w-4 animate-spin mr-2" />Carregando...</p>
        ) : (
          <>
            <LinhaDoTempo eventos={filtrados.slice(0, limite)} mostrarAnimal onAbrir={onAbrir} />
            {filtrados.length > limite && (
              <button className="text-sm text-primary hover:underline" onClick={() => setLimite((l) => l + POR_PAGINA)}>
                Mostrar mais
              </button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default HistoricoCavalhada;
