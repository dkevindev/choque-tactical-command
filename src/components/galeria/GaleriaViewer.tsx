import { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react';

export interface ItemGaleria {
  id: string;
  nome: string;
  tipo: 'image' | 'video';
  url: string;
  storagePath: string;
  thumbUrl?: string;
  thumbPath?: string;
  tamanho?: number;
  criadoEm?: any;
}

interface Props {
  itens: ItemGaleria[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}

const GaleriaViewer = ({ itens, index, onIndex, onClose }: Props) => {
  const item = itens[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && index < itens.length - 1) onIndex(index + 1);
      if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, itens.length, onIndex, onClose]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      <div className="flex items-center justify-between p-3 text-zinc-200">
        <span className="text-sm truncate max-w-[60%]">{item.nome}</span>
        <div className="flex items-center gap-2">
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-lg hover:bg-white/10"
            aria-label="Abrir original"
          >
            <Download className="h-5 w-5" />
          </a>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center relative px-2 pb-4">
        {index > 0 && (
          <button
            onClick={() => onIndex(index - 1)}
            className="absolute left-2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {item.tipo === 'video' ? (
          <video
            key={item.id}
            src={item.url}
            poster={item.thumbUrl}
            controls
            autoPlay
            playsInline
            preload="auto"
            className="max-h-full max-w-full rounded-lg"
          />
        ) : (
          <img key={item.id} src={item.url} alt={item.nome} className="max-h-full max-w-full object-contain rounded-lg" />
        )}

        {index < itens.length - 1 && (
          <button
            onClick={() => onIndex(index + 1)}
            className="absolute right-2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white"
            aria-label="Próximo"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      <div className="text-center text-xs text-zinc-400 pb-3">
        {index + 1} / {itens.length}
      </div>
    </div>
  );
};

export default GaleriaViewer;
