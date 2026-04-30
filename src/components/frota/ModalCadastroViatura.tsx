import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Car, Plus, Loader2 } from 'lucide-react';

interface ModalCadastroViaturaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const ModalCadastroViatura = ({ open, onOpenChange, onSuccess }: ModalCadastroViaturaProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    CADASTRO: '',
    PLACA: '',
    MODELO: '',
    CHASSI: '',
    RENAVAM: '',
    PREFIXO: '',
    KM: '',
    KMOLEO: '',
    SITUACAO: 'OPERANTE',
    UTILIZACAO: '',
    tipo: '' as 'leve' | 'pesada' | '',
    GOODCARD: '',
    RADIO: '',
    ORD: '',
    OBS: '',
    operacional: false,
  });

  // Sugestão automática (não trava): se o CADASTRO contiver números operacionais conhecidos, marca.
  const legacyOperacionais = ['05', '06', '08', '11', '12', '13'];
  const sugereOperacional = (cadastro: string): boolean => {
    const digits = (String(cadastro).match(/\d+/g) || []).join('');
    return legacyOperacionais.some(n => digits.includes(n));
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      // Sugestão automática apenas quando o usuário digita o CADASTRO e ainda não alterou o switch manualmente
      if (field === 'CADASTRO') {
        next.operacional = sugereOperacional(value);
      }
      return next;
    });
  };

  const resetForm = () => {
    setFormData({
      CADASTRO: '',
      PLACA: '',
      MODELO: '',
      CHASSI: '',
      RENAVAM: '',
      PREFIXO: '',
      KM: '',
      KMOLEO: '',
      SITUACAO: 'OPERANTE',
      UTILIZACAO: '',
      tipo: '',
      GOODCARD: '',
      RADIO: '',
      ORD: '',
      OBS: '',
      operacional: false,
    });
  };

  const handleSubmit = async () => {
    // Validações
    if (!formData.CADASTRO.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "O campo CADASTRO é obrigatório.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.PLACA.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "O campo PLACA é obrigatório.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.MODELO.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "O campo MODELO é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.KM || isNaN(Number(formData.KM))) {
      toast({
        title: "Campo obrigatório",
        description: "O campo KM Atual é obrigatório e deve ser um número.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.KMOLEO || isNaN(Number(formData.KMOLEO))) {
      toast({
        title: "Campo obrigatório",
        description: "O campo KM Próximo Óleo é obrigatório e deve ser um número.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const viaturaData = {
        CADASTRO: formData.CADASTRO.trim(),
        PLACA: formData.PLACA.trim().toUpperCase(),
        MODELO: formData.MODELO.trim(),
        CHASSI: formData.CHASSI.trim() || null,
        RENAVAM: formData.RENAVAM ? Number(formData.RENAVAM) : null,
        PREFIXO: formData.PREFIXO ? Number(formData.PREFIXO) : null,
        KM: Number(formData.KM),
        KMOLEO: Number(formData.KMOLEO),
        SITUACAO: formData.SITUACAO,
        UTILIZACAO: formData.UTILIZACAO.trim() || null,
        tipo: formData.tipo || null,
        GOODCARD: formData.GOODCARD.trim() || null,
        RADIO: formData.RADIO ? Number(formData.RADIO) : null,
        ORD: formData.ORD ? Number(formData.ORD) : null,
        OBS: formData.OBS.trim() || null,
        operacional: !!formData.operacional,
        SALDO: 0,
        avarias: [],
      };

      await addDoc(collection(db, 'frota'), viaturaData);

      toast({
        title: "Viatura cadastrada",
        description: `A viatura ${formData.CADASTRO} foi cadastrada com sucesso.`,
      });

      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao cadastrar viatura:', error);
      toast({
        title: "Erro",
        description: "Erro ao cadastrar viatura. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Cadastrar Nova Viatura
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {/* Campos obrigatórios */}
          <div className="space-y-2">
            <Label htmlFor="cadastro">Cadastro *</Label>
            <Input
              id="cadastro"
              placeholder="Ex: CAV - 11"
              value={formData.CADASTRO}
              onChange={(e) => handleInputChange('CADASTRO', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="placa">Placa *</Label>
            <Input
              id="placa"
              placeholder="Ex: ABC-1234"
              value={formData.PLACA}
              onChange={(e) => handleInputChange('PLACA', e.target.value.toUpperCase())}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="modelo">Modelo *</Label>
            <Input
              id="modelo"
              placeholder="Ex: Ford Ranger"
              value={formData.MODELO}
              onChange={(e) => handleInputChange('MODELO', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="situacao">Situação *</Label>
            <Select value={formData.SITUACAO} onValueChange={(v) => handleInputChange('SITUACAO', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPERANTE">OPERANTE</SelectItem>
                <SelectItem value="INOPERANTE">INOPERANTE</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="km">KM Atual *</Label>
            <Input
              id="km"
              type="number"
              placeholder="Ex: 50000"
              value={formData.KM}
              onChange={(e) => handleInputChange('KM', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="kmoleo">KM Próximo Óleo *</Label>
            <Input
              id="kmoleo"
              type="number"
              placeholder="Ex: 55000"
              value={formData.KMOLEO}
              onChange={(e) => handleInputChange('KMOLEO', e.target.value)}
            />
          </div>

          {/* Campos opcionais */}
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de Frota</Label>
            <Select value={formData.tipo} onValueChange={(v) => handleInputChange('tipo', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="leve">Frota Leve</SelectItem>
                <SelectItem value="pesada">Frota Pesada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="chassi">Chassi</Label>
            <Input
              id="chassi"
              placeholder="Ex: 9BWZZZ377VT..."
              value={formData.CHASSI}
              onChange={(e) => handleInputChange('CHASSI', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="renavam">Renavam</Label>
            <Input
              id="renavam"
              type="number"
              placeholder="Ex: 12345678901"
              value={formData.RENAVAM}
              onChange={(e) => handleInputChange('RENAVAM', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prefixo">Prefixo</Label>
            <Input
              id="prefixo"
              type="number"
              placeholder="Ex: 1234"
              value={formData.PREFIXO}
              onChange={(e) => handleInputChange('PREFIXO', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="utilizacao">Utilização</Label>
            <Input
              id="utilizacao"
              placeholder="Ex: Operacional"
              value={formData.UTILIZACAO}
              onChange={(e) => handleInputChange('UTILIZACAO', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goodcard">GoodCard</Label>
            <Input
              id="goodcard"
              placeholder="Número do cartão"
              value={formData.GOODCARD}
              onChange={(e) => handleInputChange('GOODCARD', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="radio">Rádio</Label>
            <Input
              id="radio"
              type="number"
              placeholder="Ex: 123"
              value={formData.RADIO}
              onChange={(e) => handleInputChange('RADIO', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ord">ORD</Label>
            <Input
              id="ord"
              type="number"
              placeholder="Ex: 1"
              value={formData.ORD}
              onChange={(e) => handleInputChange('ORD', e.target.value)}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="obs">Observações</Label>
            <Textarea
              id="obs"
              placeholder="Observações adicionais..."
              value={formData.OBS}
              onChange={(e) => handleInputChange('OBS', e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cadastrando...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Viatura
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ModalCadastroViatura;
