import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Loader2, Package, Save, X, QrCode, CheckCircle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { extrairDadosQRCode } from '@/lib/patrimonioUtils';
import { toast } from 'sonner';

interface Secao {
  id: string;
  nome: string;
  cor: string;
}

interface CadastroPatrimonioCavbotProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CadastroPatrimonioCavbot({ open, onClose, onSuccess }: CadastroPatrimonioCavbotProps) {
  const [secoes, setSecoes] = useState<Secao[]>([]);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    valor: '',
    numeroTombo: '',
    secaoId: '',
    observacoes: ''
  });
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      carregarSecoes();
    }
    return () => {
      pararScanner();
    };
  }, [open]);

  const carregarSecoes = async () => {
    try {
      const snap = await getDocs(collection(db, 'patrimonio_secoes'));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Secao[];
      setSecoes(data);
    } catch (e) {
      console.error('Erro ao carregar seções:', e);
    }
  };

  const iniciarScanner = async () => {
    if (!containerRef.current) return;
    
    try {
      setScanSuccess(false);
      const scanner = new Html5Qrcode('qr-scanner-cadastro');
      scannerRef.current = scanner;
      
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: { width: 200, height: 200 },
          aspectRatio: 1,
        },
        async (decodedText) => {
          // QR Code lido com sucesso
          await pararScanner();
          processarQRCode(decodedText);
        },
        () => {
          // Erro de leitura (normal enquanto procura)
        }
      );
      
      setScanning(true);
    } catch (error: any) {
      console.error('Erro ao iniciar scanner:', error);
      toast.error('Erro ao acessar a câmera');
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

  const processarQRCode = (texto: string) => {
    const dados = extrairDadosQRCode(texto);
    
    setFormData(prev => ({
      ...prev,
      nome: dados.nome || prev.nome,
      descricao: dados.descricao,
      valor: dados.valor !== null ? dados.valor.toFixed(2).replace('.', ',') : prev.valor
    }));
    
    setScanSuccess(true);
    toast.success('QR Code lido com sucesso!');
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (!formData.numeroTombo.trim()) {
      toast.error('Número do tombo é obrigatório');
      return;
    }
    if (!formData.secaoId) {
      toast.error('Selecione uma seção');
      return;
    }

    setSaving(true);
    try {
      const secaoSelecionada = secoes.find(s => s.id === formData.secaoId);
      
      // Converter valor para número
      let valorNumerico = 0;
      if (formData.valor) {
        valorNumerico = parseFloat(formData.valor.replace(/\./g, '').replace(',', '.'));
        if (isNaN(valorNumerico)) valorNumerico = 0;
      }

      await addDoc(collection(db, 'patrimonio_itens'), {
        nome: formData.nome.trim(),
        descricao: formData.descricao.trim(),
        valor: valorNumerico,
        numeroTombo: formData.numeroTombo.trim(),
        secaoId: formData.secaoId,
        secaoNome: secaoSelecionada?.nome || '',
        categoriaId: '',
        categoria: '',
        observacoes: formData.observacoes.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      toast.success('Item cadastrado com sucesso!');
      
      // Limpar formulário
      setFormData({
        nome: '',
        descricao: '',
        valor: '',
        numeroTombo: '',
        secaoId: '',
        observacoes: ''
      });
      setScanSuccess(false);
      
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar item');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    pararScanner();
    setFormData({
      nome: '',
      descricao: '',
      valor: '',
      numeroTombo: '',
      secaoId: '',
      observacoes: ''
    });
    setScanSuccess(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Cadastrar Patrimônio
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Scanner de QR Code */}
          {!scanSuccess && (
            <Card className="border-dashed">
              <CardContent className="pt-4">
                {!scanning ? (
                  <Button 
                    onClick={iniciarScanner} 
                    variant="outline" 
                    className="w-full h-24 flex flex-col gap-2"
                  >
                    <QrCode className="h-8 w-8" />
                    <span>Escanear QR Code do Item</span>
                    <span className="text-xs text-muted-foreground">Preenche automaticamente nome e valor</span>
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div
                      id="qr-scanner-cadastro"
                      ref={containerRef}
                      className="w-full rounded-lg overflow-hidden bg-muted"
                      style={{ minHeight: '200px' }}
                    />
                    <p className="text-center text-xs text-muted-foreground">
                      Aproxime bastante a câmera do QR Code
                    </p>
                    <Button 
                      onClick={pararScanner} 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancelar Scan
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Sucesso do scan */}
          {scanSuccess && (
            <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
              <CardContent className="pt-4 flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <div className="flex-1">
                  <p className="font-medium text-green-700 dark:text-green-400">QR Code lido!</p>
                  <p className="text-xs text-muted-foreground">Campos preenchidos automaticamente</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setScanSuccess(false);
                    iniciarScanner();
                  }}
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Formulário */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome do item"
                className="text-base"
              />
            </div>

            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                placeholder="0,00"
                className="text-base"
              />
            </div>

            <div className="space-y-2">
              <Label>Nº Tombo *</Label>
              <Input
                value={formData.numeroTombo}
                onChange={(e) => setFormData({ ...formData, numeroTombo: e.target.value })}
                placeholder="Número do tombo"
                className="text-base"
              />
            </div>

            <div className="space-y-2">
              <Label>Seção *</Label>
              <Select 
                value={formData.secaoId || "__none__"} 
                onValueChange={(v) => setFormData({ ...formData, secaoId: v === "__none__" ? "" : v })}
              >
                <SelectTrigger className="text-base">
                  <SelectValue placeholder="Selecione a seção..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Selecione...</SelectItem>
                  {secoes.map((secao) => (
                    <SelectItem key={secao.id} value={secao.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: secao.cor }}
                        />
                        {secao.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descrição (QR Code)</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição completa do item"
                rows={2}
                className="text-base resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Observações adicionais"
                rows={2}
                className="text-base resize-none"
              />
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={handleClose} 
              className="flex-1"
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              className="flex-1"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
