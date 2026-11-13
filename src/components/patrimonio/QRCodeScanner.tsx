import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ChevronRight, ArrowLeft, Camera, X, QrCode, Package, MapPin, DollarSign, Hash, Loader2, Info } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { buscarMelhorMatch, extrairDadosQRCode, normalizarTexto, type ItemPatrimonio } from '@/lib/patrimonioUtils';

interface ItemEncontrado {
  id: string;
  nome: string;
  descricao: string;
  secaoNome: string;
  categoria: string;
  valor: number;
  numeroTombo: string;
}

interface QRCodeScannerProps {
  open: boolean;
  onClose: () => void;
  onItemFound?: (item: ItemEncontrado) => void;
}

export default function QRCodeScanner({ open, onClose, onItemFound }: QRCodeScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [searching, setSearching] = useState(false);
  const [resultado, setResultado] = useState<ItemEncontrado | null>(null);
  const [matchInfo, setMatchInfo] = useState<{ score: number; matchTipo: string } | null>(null);
  const [naoEncontrado, setNaoEncontrado] = useState<string | null>(null);
  const [dadosExtraidos, setDadosExtraidos] = useState<{ nome: string; valor: number | null } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [lista, setLista] = useState<ItemEncontrado[] | null>(null);
  const [filtroLista, setFiltroLista] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const buscarItem = async (descricao: string) => {
    setSearching(true);
    setResultado(null);
    setMatchInfo(null);
    setNaoEncontrado(null);
    setDadosExtraidos(null);
    setErro(null);

    try {
      // Extrair dados do QR Code para exibir mesmo se não encontrar
      const dadosQR = extrairDadosQRCode(descricao);
      setDadosExtraidos({ nome: dadosQR.nome, valor: dadosQR.valor });

      // Buscar todos os itens
      const itensSnapshot = await getDocs(collection(db, 'patrimonio_itens'));
      const itens = (itensSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[]).filter(i => {
        const st = String(i.status || '').toLowerCase();
        return !i.baixado && !i.transferido && st !== 'baixado' && st !== 'transferido';
      }) as ItemPatrimonio[];

      // Usar busca inteligente com múltiplos critérios
      const match = buscarMelhorMatch(descricao, itens);

      if (match) {
        const ref = match.item;
        const norm = (t: string) => normalizarTexto(t || '');
        const iguais = itens.filter(i =>
          match.matchTipo === 'descrição_exata'
            ? norm(i.descricao) === norm(ref.descricao)
            : norm(i.descricao) === norm(ref.descricao) && norm(i.nome) === norm(ref.nome)
        ) as ItemEncontrado[];
        if (iguais.length > 1) {
          iguais.sort((a, b) => (a.secaoNome || '').localeCompare(b.secaoNome || '') ||
            String(a.numeroTombo || '').localeCompare(String(b.numeroTombo || ''), 'pt-BR', { numeric: true }));
          setLista(iguais);
          setFiltroLista('');
          setMatchInfo({ score: match.score, matchTipo: match.matchTipo });
          return;
        }
        setResultado(match.item as ItemEncontrado);
        setMatchInfo({ score: match.score, matchTipo: match.matchTipo });
        onItemFound?.(match.item as ItemEncontrado);
      } else {
        setNaoEncontrado(descricao);
      }
    } catch (error) {
      console.error('Erro ao buscar item:', error);
      setErro('Erro ao buscar item no sistema');
    } finally {
      setSearching(false);
    }
  };

  const iniciarScanner = async () => {
    if (!containerRef.current) return;

    try {
      setErro(null);
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: { width: 150, height: 150 }, // Área menor força aproximação máxima
          aspectRatio: 1,
          videoConstraints: {
            facingMode: 'environment',
            advanced: [
              { zoom: 2.5 } as any, // Zoom 2.5x para QR codes pequenos
              { focusMode: 'continuous' } as any // Foco contínuo automático
            ]
          }
        },
        async (decodedText) => {
          // QR Code lido com sucesso
          await pararScanner();
          await buscarItem(decodedText);
        },
        () => {
          // Erro de leitura (normal enquanto procura)
        }
      );

      setScanning(true);
    } catch (error: any) {
      console.error('Erro ao iniciar scanner:', error);
      if (error.toString().includes('NotAllowedError')) {
        setErro('Acesso à câmera negado. Por favor, permita o acesso à câmera nas configurações do navegador.');
      } else if (error.toString().includes('NotFoundError')) {
        setErro('Nenhuma câmera encontrada no dispositivo.');
      } else {
        setErro('Erro ao iniciar a câmera. Tente novamente.');
      }
    }
  };

  const pararScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (error) {
        console.log('Scanner já parado');
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleClose = async () => {
    await pararScanner();
    setResultado(null);
    setMatchInfo(null);
    setNaoEncontrado(null);
    setDadosExtraidos(null);
    setErro(null);
    onClose();
  };

  const novaLeitura = async () => {
    setLista(null);
    setResultado(null);
    setMatchInfo(null);
    setNaoEncontrado(null);
    setDadosExtraidos(null);
    setErro(null);
    await iniciarScanner();
  };

  useEffect(() => {
    if (open && !scanning && !resultado && !naoEncontrado) {
      // Pequeno delay para garantir que o DOM está pronto
      const timer = setTimeout(() => {
        iniciarScanner();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      pararScanner();
    };
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Escanear Patrimônio
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Scanner container */}
          {!resultado && !lista && !naoEncontrado && !searching && (
            <div className="relative">
              <div
                id="qr-reader"
                ref={containerRef}
                className="w-full rounded-lg overflow-hidden bg-muted"
                style={{ minHeight: '300px' }}
              />
              {!scanning && !erro && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <div className="text-center">
                    <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Iniciando câmera...</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Loading */}
          {searching && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Buscando item no sistema...</p>
            </div>
          )}

          {/* Erro */}
          {erro && (
            <Card className="border-destructive">
              <CardContent className="pt-4 text-center">
                <X className="h-12 w-12 text-destructive mx-auto mb-2" />
                <p className="text-sm text-destructive">{erro}</p>
                <Button onClick={novaLeitura} className="mt-4">
                  Tentar Novamente
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Lista de itens com o mesmo QR */}
          {lista && !resultado && (() => {
            const f = filtroLista.trim().toLowerCase();
            const vis = lista.filter(i => !f || String(i.numeroTombo || '').toLowerCase().includes(f) || (i.secaoNome || '').toLowerCase().includes(f));
            const porSecao: Record<string, number> = {};
            lista.forEach(i => { const k = i.secaoNome || 'Sem seção'; porSecao[k] = (porSecao[k] || 0) + 1; });
            return (
              <div className="space-y-3 !text-slate-900">
                <div className="rounded-lg border border-emerald-500 !bg-emerald-50 p-3">
                  <p className="font-bold !text-emerald-800">{lista.length} itens encontrados</p>
                  <p className="text-sm font-medium !text-slate-900">{lista[0].nome}</p>
                  <p className="text-xs mt-1 !text-slate-700">
                    {Object.entries(porSecao).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                  </p>
                </div>
                <Input placeholder="Buscar por tombo ou seção" value={filtroLista} onChange={e => setFiltroLista(e.target.value)} />
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {vis.map(i => (
                    <button key={i.id} type="button" onClick={() => setResultado(i)}
                      className="w-full flex items-center justify-between gap-2 rounded-lg border border-slate-300 !bg-white p-3 text-left active:!bg-slate-100">
                      <div className="min-w-0">
                        <p className="font-mono font-bold text-base !text-slate-900">Tombo {i.numeroTombo || '-'}</p>
                        <p className="flex items-center gap-1 text-sm !text-slate-700"><MapPin className="h-4 w-4 shrink-0 !text-emerald-700" />{i.secaoNome || 'Sem seção'}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 !text-slate-500" />
                    </button>
                  ))}
                  {vis.length === 0 && <p className="text-sm text-center !text-slate-600 py-4">Nenhum item com esse filtro.</p>}
                </div>
                <Button onClick={novaLeitura} variant="outline" className="w-full !bg-white !text-slate-900">
                  <Camera className="h-4 w-4 mr-2" />Escanear Outro
                </Button>
              </div>
            );
          })()}

          {/* Item encontrado */}
          {resultado && (
            <Card className="border-green-500 !bg-white !text-slate-900">
              <CardContent className="pt-4 space-y-3 !text-slate-900">
                {lista && (
                  <Button variant="ghost" size="sm" onClick={() => setResultado(null)} className="!text-slate-900 -ml-2">
                    <ArrowLeft className="h-4 w-4 mr-1" />Voltar à lista
                  </Button>
                )}
                <div className="flex items-center gap-2 !text-green-700 font-semibold mb-2">
                  <Package className="h-5 w-5" />
                  Item Encontrado!
                </div>
                
                {/* Indicador de confiança do match */}
                {matchInfo && matchInfo.matchTipo !== 'descrição_exata' && (
                  <div className="flex items-center gap-2 text-xs !text-slate-600 !bg-slate-100 p-2 rounded">
                    <Info className="h-3 w-3" />
                    <span>
                      Match por {matchInfo.matchTipo.replace('_', ' ')} 
                      ({Math.round(matchInfo.score * 100)}% confiança)
                    </span>
                  </div>
                )}
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <Hash className="h-4 w-4 mt-0.5 !text-slate-600" />
                    <div>
                      <p className="text-xs !text-slate-600">Nº Tombo</p>
                      <p className="font-mono font-medium">{resultado.numeroTombo}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Package className="h-4 w-4 mt-0.5 !text-slate-600" />
                    <div>
                      <p className="text-xs !text-slate-600">Nome</p>
                      <p className="font-medium">{resultado.nome}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 !text-slate-600" />
                    <div>
                      <p className="text-xs !text-slate-600">Seção</p>
                      <p className="font-medium">{resultado.secaoNome}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <DollarSign className="h-4 w-4 mt-0.5 !text-slate-600" />
                    <div>
                      <p className="text-xs !text-slate-600">Valor</p>
                      <p className="font-medium">{formatCurrency(resultado.valor)}</p>
                    </div>
                  </div>

                  {resultado.categoria && (
                    <div>
                      <p className="text-xs !text-slate-600">Categoria</p>
                      <p className="font-medium">{resultado.categoria}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs !text-slate-600">Descrição (QR Code)</p>
                    <p className="text-sm">{resultado.descricao}</p>
                  </div>
                </div>

                <Button onClick={novaLeitura} variant="outline" className="w-full mt-4 !bg-white !text-slate-900">
                  <Camera className="h-4 w-4 mr-2" />
                  Escanear Outro
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Item não encontrado */}
          {naoEncontrado && (
            <Card className="border-yellow-500 !bg-white !text-slate-900">
              <CardContent className="pt-4 text-center !text-slate-900">
                <Package className="h-12 w-12 text-yellow-600 mx-auto mb-2" />
                <p className="font-semibold !text-yellow-700 mb-2">
                  Item não cadastrado
                </p>
                
                {/* Mostrar dados extraídos do QR */}
                {dadosExtraidos && (
                  <div className="text-left !bg-slate-100 p-3 rounded-lg mb-3 text-sm">
                    <p className="text-xs !text-slate-600 mb-1">Dados extraídos do QR:</p>
                    <p><strong>Nome:</strong> {dadosExtraidos.nome || '-'}</p>
                    {dadosExtraidos.valor !== null && (
                      <p><strong>Valor:</strong> {formatCurrency(dadosExtraidos.valor)}</p>
                    )}
                  </div>
                )}
                
                <p className="text-sm !text-slate-600 mb-2">
                  Descrição lida:
                </p>
                <p className="text-xs !bg-slate-100 !text-slate-900 p-2 rounded font-mono break-all">
                  "{naoEncontrado}"
                </p>
                <Button onClick={novaLeitura} className="mt-4">
                  <Camera className="h-4 w-4 mr-2" />
                  Escanear Novamente
                </Button>
              </CardContent>
            </Card>
          )}

          {scanning && !erro && (
            <div className="text-center space-y-1">
              <p className="text-sm text-muted-foreground">
                Aponte a câmera para o QR Code do tombo
              </p>
              <p className="text-xs text-amber-600 font-medium">
                ⚠️ Aproxime BEM a câmera! QR Codes pequenos precisam estar bem perto
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
