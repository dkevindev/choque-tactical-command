import { useRef, useState } from 'react';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { addDoc, collection } from 'firebase/firestore';
import { db, storage } from '@/firebase';
import { Image as ImageIcon, Video, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

const VIDEO_EXT = ['mp4', 'mov', 'm4v', '3gp', 'avi', 'mkv', 'webm', 'hevc', 'mpg', 'mpeg', 'wmv'];
const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'bmp', 'avif'];

const ext = (nome: string) => (nome.split('.').pop() || '').toLowerCase();

type Tipo = 'image' | 'video';

const detectarTipo = (file: File, sugerido: Tipo): Tipo | null => {
  if (file.type.startsWith('video')) return 'video';
  if (file.type.startsWith('image')) return 'image';
  const e = ext(file.name);
  if (VIDEO_EXT.includes(e)) return 'video';
  if (IMAGE_EXT.includes(e)) return 'image';
  // iOS às vezes entrega sem type e sem extensão reconhecível — confia no botão usado
  return sugerido;
};

const contentTypePadrao = (file: File, tipo: Tipo) => {
  if (file.type) return file.type;
  const e = ext(file.name);
  if (tipo === 'video') {
    if (e === 'mov' || e === 'hevc' || !e) return 'video/quicktime';
    if (e === 'm4v') return 'video/mp4';
    return `video/${e}`;
  }
  if (e === 'jpg' || !e) return 'image/jpeg';
  return `image/${e}`;
};

interface Progresso {
  nome: string;
  pct: number;
  erro?: string;
}

interface BotaoSelecaoProps {
  accept: string;
  label: string;
  icone: React.ReactNode;
  disabled: boolean;
  onFiles: (files: File[]) => void;
  onAbrir?: () => void;
  className?: string;
}

const BotaoSelecao = ({ accept, label, icone, disabled, onFiles, onAbrir, className }: BotaoSelecaoProps) => {
  const ultimoLote = useRef<{ assinatura: string; em: number }>({ assinatura: '', em: 0 });

  const tratar = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const files = Array.from(input.files || []);
    const assinatura = files.map(f => `${f.name}|${f.size}|${f.lastModified}`).join(';');
    const agora = Date.now();
    if (assinatura && assinatura === ultimoLote.current.assinatura && agora - ultimoLote.current.em < 2000) {
      return; // mesmo lote disparado por 'input' e 'change'
    }
    ultimoLote.current = { assinatura, em: agora };
    onFiles(files);
    // limpa depois de ler
    setTimeout(() => {
      try { input.value = ''; } catch { /* ignore */ }
    }, 0);
  };

  return (
    <label
      onClick={() => !disabled && onAbrir?.()}
      className={`relative inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md text-sm font-medium text-white select-none ${
        disabled ? 'opacity-60 pointer-events-none' : 'cursor-pointer'
      } ${className || ''}`}
    >
      {icone}
      {label}
      <input
        type="file"
        multiple
        accept={accept}
        disabled={disabled}
        onChange={tratar}
        onInput={tratar}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        style={{ fontSize: 0 }}
      />
    </label>
  );
};

const GaleriaUpload = () => {
  const [enviando, setEnviando] = useState(false);
  const [aguardandoPicker, setAguardandoPicker] = useState(false);
  const [progressos, setProgressos] = useState<Progresso[]>([]);
  const timeoutPicker = useRef<ReturnType<typeof setTimeout> | null>(null);

  const marcarErro = (idx: number, msg: string) =>
    setProgressos(prev => prev.map((p, i) => (i === idx ? { ...p, erro: msg } : p)));

  const enviarArquivo = (file: File, tipo: Tipo, idx: number) =>
    new Promise<void>((resolve) => {
      const nomeBase = file.name || `video-${Date.now()}.mov`;
      const path = `galeria-privada/${Date.now()}-${idx}-${nomeBase.replace(/[^\w.\-]/g, '_')}`;
      const contentType = contentTypePadrao(file, tipo);

      let task;
      try {
        task = uploadBytesResumable(storageRef(storage, path), file, { contentType });
      } catch (e: any) {
        console.error('galeria upload init:', e);
        marcarErro(idx, e?.message || 'falha ao iniciar');
        toast.error(`${nomeBase}: ${e?.code || e?.message || 'falha ao iniciar envio'}`);
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
          toast.error(`${nomeBase}: ${err?.code || 'erro no envio'}`);
          resolve();
        },
        async () => {
          try {
            const url = await getDownloadURL(task!.snapshot.ref);
            await addDoc(collection(db, 'galeria_privada'), {
              nome: nomeBase,
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
            toast.error(`${nomeBase}: erro ao registrar`);
          }
          resolve();
        }
      );
    });

  const pararEspera = () => {
    if (timeoutPicker.current) clearTimeout(timeoutPicker.current);
    timeoutPicker.current = null;
    setAguardandoPicker(false);
  };

  const iniciarEspera = () => {
    setAguardandoPicker(true);
    if (timeoutPicker.current) clearTimeout(timeoutPicker.current);
    timeoutPicker.current = setTimeout(() => setAguardandoPicker(false), 15000);
  };

  const processar = async (files: File[], sugerido: Tipo) => {
    pararEspera();

    if (!files.length) {
      toast.error(
        sugerido === 'video'
          ? 'O iPhone não entregou o vídeo. Tente enviar um vídeo por vez ou selecione pelo app Arquivos.'
          : 'Nenhum arquivo recebido. Tente novamente.'
      );
      return;
    }

    const validos: { file: File; tipo: Tipo }[] = [];
    for (const f of files) {
      const nome = f.name || '(sem nome)';
      if (f.size === 0) {
        toast.error(`${nome}: arquivo veio vazio (falha na exportação do iPhone). Tente novamente ou um por vez.`);
        continue;
      }
      const tipo = detectarTipo(f, sugerido);
      if (!tipo) {
        toast.error(`${nome}: formato não suportado`);
        continue;
      }
      if (f.size > MAX_BYTES) {
        toast.error(`${nome}: acima de 2 GB`);
        continue;
      }
      validos.push({ file: f, tipo });
    }

    if (!validos.length) return;

    setEnviando(true);
    setProgressos(validos.map(v => ({ nome: v.file.name || 'vídeo', pct: 0 })));
    for (let i = 0; i < validos.length; i++) {
      await enviarArquivo(validos[i].file, validos[i].tipo, i);
    }
    setEnviando(false);
    toast.success('Envio finalizado');
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <BotaoSelecao
          accept="image/*"
          label={enviando ? 'Enviando...' : 'Enviar fotos'}
          icone={enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
          disabled={enviando}
          onFiles={(files) => processar(files, 'image')}
          className="bg-emerald-600 hover:bg-emerald-700"
        />
        <BotaoSelecao
          accept="video/*"
          label={enviando ? 'Enviando...' : 'Enviar vídeos'}
          icone={enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
          disabled={enviando}
          onAbrir={iniciarEspera}
          onFiles={(files) => processar(files, 'video')}
          className="bg-sky-600 hover:bg-sky-700"
        />
      </div>

      {aguardandoPicker && !enviando && (
        <div className="flex items-center gap-2 text-xs text-sky-300">
          <Loader2 className="h-3 w-3 animate-spin" />
          Aguardando o iPhone preparar o vídeo...
        </div>
      )}

      <p className="text-[11px] text-zinc-500 leading-snug">
        No iPhone, se o vídeo não for enviado: Ajustes &gt; Fotos &gt; "Transferir para Mac ou PC" &gt; <b>Manter Originais</b>.
        Vídeos longos funcionam melhor enviados um por vez.
      </p>

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
