import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  Upload,
  X,
  Plus,
  Camera,
  MapPin,
  Calendar,
  User
} from 'lucide-react';

interface Avaria {
  id: string;
  x: number;
  y: number;
  tipo: string;
  descricao: string;
  data: string;
  gravidade: 'LEVE' | 'MODERADA' | 'GRAVE';
  status: 'PENDENTE' | 'EM_REPARO' | 'RESOLVIDA';
  responsavel: string;
}

interface ViaturaAvarias {
  placaViatura: string;
  modeloViatura: string;
  imagemUrl?: string;
  avarias: Avaria[];
}

const AvariasPage = () => {
  const [viaturaAtual, setViaturaAtual] = useState<string>('');
  const [avariasData, setAvariasData] = useState<ViaturaAvarias[]>([]);
  const [imagemCarregada, setImagemCarregada] = useState<string | null>(null);
  const [marcandoAvaria, setMarcandoAvaria] = useState(false);
  const [novaAvaria, setNovaAvaria] = useState({
    tipo: '',
    descricao: '',
    gravidade: 'LEVE' as const,
    responsavel: ''
  });
  const [modalAberto, setModalAberto] = useState(false);
  const [posicaoTemporaria, setPosicaoTemporaria] = useState<{x: number, y: number} | null>(null);
  const imagemRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock data para demonstração
  const viaturasMock = [
    { placa: 'OII6398', modelo: 'TOYOTA HILUX SRV' },
    { placa: 'ABC1234', modelo: 'MITSUBISHI L200' },
    { placa: 'XYZ9876', modelo: 'FORD RANGER' }
  ];

  useEffect(() => {
    // Inicializar dados mock
    const dadosMock: ViaturaAvarias[] = viaturasMock.map(v => ({
      placaViatura: v.placa,
      modeloViatura: v.modelo,
      avarias: []
    }));
    setAvariasData(dadosMock);
  }, []);

  const handleImagemUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagemCarregada(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImagemClick = (event: React.MouseEvent<HTMLImageElement>) => {
    if (!marcandoAvaria || !imagemRef.current) return;

    const rect = imagemRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    setPosicaoTemporaria({ x, y });
    setModalAberto(true);
  };

  const salvarAvaria = () => {
    if (!posicaoTemporaria || !viaturaAtual || !novaAvaria.tipo) return;

    const avaria: Avaria = {
      id: Date.now().toString(),
      x: posicaoTemporaria.x,
      y: posicaoTemporaria.y,
      tipo: novaAvaria.tipo,
      descricao: novaAvaria.descricao,
      data: new Date().toISOString().split('T')[0],
      gravidade: novaAvaria.gravidade,
      status: 'PENDENTE',
      responsavel: novaAvaria.responsavel || 'Sistema'
    };

    setAvariasData(prev => 
      prev.map(v => 
        v.placaViatura === viaturaAtual
          ? { ...v, avarias: [...v.avarias, avaria] }
          : v
      )
    );

    // Reset
    setNovaAvaria({
      tipo: '',
      descricao: '',
      gravidade: 'LEVE',
      responsavel: ''
    });
    setPosicaoTemporaria(null);
    setModalAberto(false);
    setMarcandoAvaria(false);
  };

  const removerAvaria = (idAvaria: string) => {
    setAvariasData(prev =>
      prev.map(v =>
        v.placaViatura === viaturaAtual
          ? { ...v, avarias: v.avarias.filter(a => a.id !== idAvaria) }
          : v
      )
    );
  };

  const getViaturaAtualData = () => {
    return avariasData.find(v => v.placaViatura === viaturaAtual);
  };

  const getCorAvaria = (gravidade: string) => {
    switch (gravidade) {
      case 'LEVE': return 'bg-yellow-500';
      case 'MODERADA': return 'bg-orange-500';
      case 'GRAVE': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getCorStatus = (status: string) => {
    switch (status) {
      case 'PENDENTE': return 'destructive';
      case 'EM_REPARO': return 'secondary';
      case 'RESOLVIDA': return 'default';
      default: return 'outline';
    }
  };

  const viaturaData = getViaturaAtualData();

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border shadow-tactical">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            REGISTRO DE AVARIAS
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Seletor de Viatura */}
          <div className="mb-6">
            <label className="text-sm font-medium text-foreground mb-2 block">
              Selecionar Viatura
            </label>
            <Select value={viaturaAtual} onValueChange={setViaturaAtual}>
              <SelectTrigger className="w-full md:w-80">
                <SelectValue placeholder="Escolha uma viatura..." />
              </SelectTrigger>
              <SelectContent>
                {viaturasMock.map((viatura) => (
                  <SelectItem key={viatura.placa} value={viatura.placa}>
                    {viatura.placa} - {viatura.modelo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {viaturaAtual && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Área da Imagem */}
              <div className="lg:col-span-2">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Carregar Foto
                    </Button>
                    
                    <Button
                      variant={marcandoAvaria ? "destructive" : "default"}
                      onClick={() => setMarcandoAvaria(!marcandoAvaria)}
                      disabled={!imagemCarregada}
                      className="flex items-center gap-2"
                    >
                      {marcandoAvaria ? (
                        <>
                          <X className="h-4 w-4" />
                          Cancelar
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Marcar Avaria
                        </>
                      )}
                    </Button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImagemUpload}
                    className="hidden"
                  />

                  <div className="relative border-2 border-dashed border-border rounded-lg min-h-[400px] flex items-center justify-center bg-muted/20">
                    {imagemCarregada ? (
                      <div className="relative w-full h-full">
                        <img
                          ref={imagemRef}
                          src={imagemCarregada}
                          alt="Viatura"
                          className={`w-full h-full object-contain rounded-lg ${
                            marcandoAvaria ? 'cursor-crosshair' : 'cursor-default'
                          }`}
                          onClick={handleImagemClick}
                        />
                        
                        {/* Marcadores de Avarias */}
                        {viaturaData?.avarias.map((avaria) => (
                          <div
                            key={avaria.id}
                            className={`absolute w-4 h-4 rounded-full border-2 border-white shadow-lg cursor-pointer ${getCorAvaria(avaria.gravidade)}`}
                            style={{
                              left: `${avaria.x}%`,
                              top: `${avaria.y}%`,
                              transform: 'translate(-50%, -50%)'
                            }}
                            title={`${avaria.tipo} - ${avaria.gravidade}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              // Aqui poderia abrir detalhes da avaria
                            }}
                          >
                            <div className="w-full h-full rounded-full animate-pulse" />
                          </div>
                        ))}

                        {/* Marcador temporário */}
                        {posicaoTemporaria && (
                          <div
                            className="absolute w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg animate-bounce"
                            style={{
                              left: `${posicaoTemporaria.x}%`,
                              top: `${posicaoTemporaria.y}%`,
                              transform: 'translate(-50%, -50%)'
                            }}
                          />
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Clique em "Carregar Foto" para adicionar a imagem da viatura</p>
                        <p className="text-sm mt-2">Formatos suportados: JPG, PNG, GIF</p>
                      </div>
                    )}
                  </div>

                  {marcandoAvaria && imagemCarregada && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 text-blue-800">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          Modo de marcação ativo - Clique na imagem para marcar uma avaria
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Lista de Avarias */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Avarias Registradas ({viaturaData?.avarias.length || 0})
                </h3>

                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {viaturaData?.avarias.map((avaria) => (
                    <Card key={avaria.id} className="p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${getCorAvaria(avaria.gravidade)}`} />
                            <span className="font-medium text-sm">{avaria.tipo}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removerAvaria(avaria.id)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <div className="flex flex-wrap gap-1">
                          <Badge variant={getCorStatus(avaria.status)} className="text-xs">
                            {avaria.status.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {avaria.gravidade}
                          </Badge>
                        </div>
                        
                        {avaria.descricao && (
                          <p className="text-xs text-muted-foreground">{avaria.descricao}</p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(avaria.data).toLocaleDateString('pt-BR')}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {avaria.responsavel}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}

                  {(!viaturaData?.avarias.length) && (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma avaria registrada</p>
                      <p className="text-sm">Carregue uma foto e clique em "Marcar Avaria"</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal para Nova Avaria */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Nova Avaria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Tipo de Avaria</label>
              <Select
                value={novaAvaria.tipo}
                onValueChange={(value) => setNovaAvaria(prev => ({ ...prev, tipo: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Risco na Pintura">Risco na Pintura</SelectItem>
                  <SelectItem value="Amassado">Amassado</SelectItem>
                  <SelectItem value="Quebrado">Quebrado</SelectItem>
                  <SelectItem value="Desgaste">Desgaste</SelectItem>
                  <SelectItem value="Oxidação">Oxidação</SelectItem>
                  <SelectItem value="Falta de Peça">Falta de Peça</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Gravidade</label>
              <Select
                value={novaAvaria.gravidade}
                onValueChange={(value: any) => setNovaAvaria(prev => ({ ...prev, gravidade: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LEVE">Leve</SelectItem>
                  <SelectItem value="MODERADA">Moderada</SelectItem>
                  <SelectItem value="GRAVE">Grave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Descrição (Opcional)</label>
              <Textarea
                value={novaAvaria.descricao}
                onChange={(e) => setNovaAvaria(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descreva a avaria em detalhes..."
              />
            </div>

            <div>
              <label className="text-sm font-medium">Responsável pelo Registro</label>
              <Input
                value={novaAvaria.responsavel}
                onChange={(e) => setNovaAvaria(prev => ({ ...prev, responsavel: e.target.value }))}
                placeholder="Nome do responsável..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalAberto(false)}>
                Cancelar
              </Button>
              <Button onClick={salvarAvaria} disabled={!novaAvaria.tipo}>
                Salvar Avaria
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AvariasPage;