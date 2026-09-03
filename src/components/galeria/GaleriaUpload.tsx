import { useRef, useState } from 'react';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { addDoc, collection } from 'firebase/firestore';
import { db, storage } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

const VIDEO_EXT = ['mp4', 'mov', 'm4v', '3gp', 'avi', 'mkv', 'webm', 'hevc', 'mpg', 'mpeg', 'wmv'];
const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'bmp', 'avif'];

const ext = (nome: string) => (nome.split('.').pop() || '').toLowerCase();

const detectarTipo = (file: File): 'image' | 'video' | null => {
  if (file.type.startsWith('video')) return 'video';
  if (file.type.startsWith('image')) return 'image';
  const e = ext(file.name);
  if (VIDEO_EXT.includes(e)) return 'video';
  if (IMAGE_EXT.includes(e)) return 'image';
  return null;
};

const contentTypePadrao = (file: File, tipo: 'image' | 'video') => {
  if (file.type) return file.type;
  const e = ext(file.name);
  if (tipo === 'video') return e === 'mov' ? 'video/quicktime' : `video/${e || 'mp4'}`;
  return `image/${e === 'jpg' ? 'jpeg' : e || 'jpeg'}`;
};

interface Progresso {
  nome: string;
  pct: number;
  erro?: string;
}

const GaleriaUpload = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [progressos, setProgressos] = useState<Progresso[]>([]);

  const marcarErro = (idx: number, msg: string) =>
    setProgressos(prev => prev.map((p, i) => (i === idx ? { ...p, erro: msg } : p)));

  const enviarArquivo = (file: File, tipo: 'image' | 'video', idx: number) =>
    new Promise<void>((resolve) => {
      const path = `galeria-privada/${Date.now()}-${idx}-${file.name.replace(/[^\w.\-]/g, '_')}`;
      const contentType = contentTypePadrao(file, tipo);

      let task;
      try {
        task = uploadBytesResumable(storageRef(storage, path), file, { contentType });
      } catch (e: any) {
        console.error('galeria upload init:', e);
        marcarErro(idx, e?.message || 'falha ao iniciar');
        toast.error(`${file.name}: ${e?.code || e?.message || 'falha ao iniciar envio'}`);
        resolve();
        return;
      }

      task.on(
        'state_changed',
        (snap) => {
          const pct = snap.totalBytes ? Math.round((snap.bytesTransferred / snap.totalBytes) * 100) : 0;
          setProgressos(prev => prev.map((p, i) => (i === idx ? { ...p, pct } : p)));
        },
        (err: any) => {
          console.error('galeria upload erro:', err?.code, err);
          marcarErro(idx, err?.code || err?.message || 'erro');
          toast.error(`${file.name}: ${err?.code || 'erro no envio'}`);
          resolve();
        },
        async () => {
          try {
            const url = await getDownloadURL(task!.snapshot.ref);
            await addDoc(collection(db, 'galeria_privada'), {
              nome: file.name,
              tipo,
              url,
              storagePath: path,
              contentType,
              tamanho: file.size,
              criadoEm: new Date(),
            });
            setProgressos(prev => prev.map((p, i) => (i === idx ? { ...p, pct: 100 } : p)));
          } catch (e: any) {
            console.error('galeria salvar doc:', e);
            marcarErro(idx, e?.code || 'erro ao registrar');
            toast.error(`${file.name}: erro ao registrar`);
          }
          resolve();
        }
      );
    });

  const onSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (inputRef.current) inputRef.current.value = '';
    if (!files.length) return;

    const validos: { file: File; tipo: 'image' | 'video' }[] = [];
    for (const f of files) {
      const tipo = detectarTipo(f);
      if (!tipo) {
        toast.error(`${f.name}: formato não suportado`);
        continue;
      }
      if (f.size > MAX_BYTES) {
        toast.error(`${f.name}: acima de 2 GB`);
        continue;
      }
      validos.push({ file: f, tipo });
    }

    if (!validos.length) return;

    setEnviando(true);
    setProgressos(validos.map(v => ({ nome: v.file.name, pct: 0 })));
    for (let i = 0; i < validos.length; i++) {
      await enviarArquivo(validos[i].file, validos[i].tipo, i);
    }
    setEnviando(false);

    const falhas = validos.length;
    toast.success('Envio finalizado');
    void falhas;
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*,.mov,.mp4,.m4v,.3gp,.mkv,.avi,.heic"
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
                <span className={p.erro ? 'text-red-400' : ''}>{p.erro ? p.erro : `${p.pct}%`}</span>
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
