import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, X, QrCode, Package, MapPin, DollarSign, Hash, Loader2 } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';

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
  const [naoEncontrado, setNaoEncontrado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const buscarItem = async (descricao: string) => {
    setSearching(true);
    setResultado(null);
    setNaoEncontrado(null);
    setErro(null);

    try {
      // Buscar por descrição exata
      const itensSnapshot = await getDocs(collection(db, 'patrimonio_itens'));
      const itens = itensSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ItemEncontrado[];

      // Buscar correspondência exata ou parcial
      const descLower = descricao.toLowerCase().trim();
      const itemEncontrado = itens.find(item => 
        item.descricao.toLowerCase().trim() === descLower ||
        item.descricao.toLowerCase().includes(descLower)
      );

      if (itemEncontrado) {
        setResultado(itemEncontrado);
        onItemFound?.(itemEncontrado);
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
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
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
    setNaoEncontrado(null);
    setErro(null);
    onClose();
  };

  const novaLeitura = async () => {
    setResultado(null);
    setNaoEncontrado(null);
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
          {!resultado && !naoEncontrado && !searching && (
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

          {/* Item encontrado */}
          {resultado && (
            <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold mb-2">
                  <Package className="h-5 w-5" />
                  Item Encontrado!
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <Hash className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Nº Tombo</p>
                      <p className="font-mono font-medium">{resultado.numeroTombo}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Package className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Nome</p>
                      <p className="font-medium">{resultado.nome}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Seção</p>
                      <p className="font-medium">{resultado.secaoNome}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <DollarSign className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Valor</p>
                      <p className="font-medium">{formatCurrency(resultado.valor)}</p>
                    </div>
                  </div>

                  {resultado.categoria && (
                    <div>
                      <p className="text-xs text-muted-foreground">Categoria</p>
                      <p className="font-medium">{resultado.categoria}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-muted-foreground">Descrição (QR Code)</p>
                    <p className="text-sm">{resultado.descricao}</p>
                  </div>
                </div>

                <Button onClick={novaLeitura} variant="outline" className="w-full mt-4">
                  <Camera className="h-4 w-4 mr-2" />
                  Escanear Outro
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Item não encontrado */}
          {naoEncontrado && (
            <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
              <CardContent className="pt-4 text-center">
                <Package className="h-12 w-12 text-yellow-600 mx-auto mb-2" />
                <p className="font-semibold text-yellow-700 dark:text-yellow-400 mb-2">
                  Item não cadastrado
                </p>
                <p className="text-sm text-muted-foreground mb-2">
                  Nenhum item encontrado com a descrição:
                </p>
                <p className="text-xs bg-muted p-2 rounded font-mono break-all">
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
            <p className="text-center text-sm text-muted-foreground">
              Aponte a câmera para o QR Code do tombo
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
