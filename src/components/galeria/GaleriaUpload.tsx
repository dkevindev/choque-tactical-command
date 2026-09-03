import { useRef, useState } from 'react';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { addDoc, collection } from 'firebase/firestore';
import { db, storage } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const MAX_BYTES = 200 * 1024 * 1024;

interface Progresso {
  nome: string;
  pct: number;
  erro?: boolean;
}

const GaleriaUpload = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [progressos, setProgressos] = useState<Progresso[]>([]);

  const enviarArquivo = (file: File, idx: number) =>
    new Promise<void>((resolve) => {
      const path = `galeria-privada/${Date.now()}-${file.name.replace(/[^\w.\-]/g, '_')}`;
      const task = uploadBytesResumable(storageRef(storage, path), file, { contentType: file.type });
      task.on(
        'state_changed',
        (snap) => {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          setProgressos(prev => prev.map((p, i) => (i === idx ? { ...p, pct } : p)));
        },
        (err) => {
          console.error('upload:', err);
          setProgressos(prev => prev.map((p, i) => (i === idx ? { ...p, erro: true } : p)));
          resolve();
        },
        async () => {
          try {
            const url = await getDownloadURL(task.snapshot.ref);
            await addDoc(collection(db, 'galeria_privada'), {
              nome: file.name,
              tipo: file.type.startsWith('video') ? 'video' : 'image',
              url,
              storagePath: path,
              tamanho: file.size,
              criadoEm: new Date(),
            });
            setProgressos(prev => prev.map((p, i) => (i === idx ? { ...p, pct: 100 } : p)));
          } catch (e) {
            console.error(e);
            setProgressos(prev => prev.map((p, i) => (i === idx ? { ...p, erro: true } : p)));
          }
          resolve();
        }
      );
    });

  const onSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const validos = files.filter(f => {
      if (!f.type.startsWith('image') && !f.type.startsWith('video')) {
        toast.error(`${f.name}: apenas imagens e vídeos`);
        return false;
      }
      if (f.size > MAX_BYTES) {
        toast.error(`${f.name}: acima de 200 MB`);
        return false;
      }
      return true;
    });

    if (inputRef.current) inputRef.current.value = '';
    if (!validos.length) return;

    setEnviando(true);
    setProgressos(validos.map(f => ({ nome: f.name, pct: 0 })));
    for (let i = 0; i < validos.length; i++) {
      await enviarArquivo(validos[i], i);
    }
    setEnviando(false);
    toast.success('Envio concluído');
    setTimeout(() => setProgressos([]), 2500);
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={onSelect}
      />
      <Button
        onClick={() => inputRef.current?.click()}
        disabled={enviando}
        className="bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        {enviando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
        {enviando ? 'Enviando...' : 'Enviar fotos / vídeos'}
      </Button>

      {progressos.length > 0 && (
        <div className="space-y-2">
          {progressos.map((p, i) => (
            <div key={i} className="text-xs text-zinc-300">
              <div className="flex justify-between gap-2">
                <span className="truncate">{p.nome}</span>
                <span>{p.erro ? 'erro' : `${p.pct}%`}</span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded mt-1 overflow-hidden">
                <div
                  className={`h-full ${p.erro ? 'bg-red-500' : 'bg-emerald-500'}`}
                  style={{ width: `${p.erro ? 100 : p.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GaleriaUpload;
