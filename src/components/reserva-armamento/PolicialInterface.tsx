import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Clock, 
  Target, 
  User, 
  AlertCircle,
  Shield,
  Key
} from 'lucide-react';
import { collection, query, where, onSnapshot, updateDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from 'sonner';

interface ReservaAtiva {
  id: string;
  policialId: string;
  armeiro: string;
  materiais: Array<{
    materialId: string;
    nome: string;
    categoria: string;
    quantidade: number;
    confirmado: boolean;
  }>;
  status: 'ativo' | 'finalizado';
  createdAt: Date;
}

interface AssinaturaForm {
  matricula: string;
  senha: string;
}

const PolicialInterface = () => {
  const [reservaAtiva, setReservaAtiva] = useState<ReservaAtiva | null>(null);
  const [materiaisRecebidos, setMateriaisRecebidos] = useState<string[]>([]);
  const [assinaturaForm, setAssinaturaForm] = useState<AssinaturaForm>({ matricula: '', senha: '' });
  const [showAssinatura, setShowAssinatura] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Mock policial ID - replace with actual authentication
  const policialId = localStorage.getItem('policialId') || '1';

  useEffect(() => {
    // Listen for active reservations for this policial
    const q = query(
      collection(db, 'reservas_ativas'), 
      where('policialId', '==', policialId),
      where('status', '==', 'ativo')
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      if (!querySnapshot.empty) {
        const reserva = {
          id: querySnapshot.docs[0].id,
          ...querySnapshot.docs[0].data()
        } as ReservaAtiva;
        setReservaAtiva(reserva);
        
        // Auto-check already confirmed materials
        const confirmados = reserva.materiais
          .filter(m => m.confirmado)
          .map(m => m.materialId);
        setMateriaisRecebidos(confirmados);
      } else {
        setReservaAtiva(null);
        setMateriaisRecebidos([]);
        setShowAssinatura(false);
      }
    }, (error) => {
      console.error('Erro ao escutar reservas:', error);
      // Mock data for development
      setReservaAtiva({
        id: 'mock-1',
        policialId: '1',
        armeiro: 'Sgt. Armeiro',
        materiais: [
          { materialId: '1', nome: 'Pistola .40', categoria: 'Armamento', quantidade: 1, confirmado: false },
          { materialId: '2', nome: 'Colete Balístico', categoria: 'EPI', quantidade: 1, confirmado: false },
          { materialId: '3', nome: 'Munição .40', categoria: 'Munição', quantidade: 2, confirmado: false }
        ],
        status: 'ativo',
        createdAt: new Date()
      });
    });

    return unsubscribe;
  }, [policialId]);

  const confirmarMaterial = (materialId: string) => {
    if (materiaisRecebidos.includes(materialId)) {
      setMateriaisRecebidos(prev => prev.filter(id => id !== materialId));
      toast.info('Material desmarcado');
    } else {
      setMateriaisRecebidos(prev => [...prev, materialId]);
      toast.success('Material confirmado');
    }
  };

  const finalizarRecebimento = () => {
    if (materiaisRecebidos.length === 0) {
      toast.error('Confirme pelo menos um material');
      return;
    }
    setShowAssinatura(true);
  };

  const validarAssinatura = async () => {
    if (!assinaturaForm.matricula || !assinaturaForm.senha) {
      toast.error('Preencha matrícula e senha');
      return;
    }

    setIsLoading(true);

    try {
      // Here you would validate credentials against your auth system
      // For now, mock validation
      if (assinaturaForm.matricula.length < 6) {
        toast.error('Matrícula inválida');
        setIsLoading(false);
        return;
      }

      if (!reservaAtiva) {
        toast.error('Nenhuma reserva ativa encontrada');
        setIsLoading(false);
        return;
      }

      // Update confirmed materials in Firebase
      const materiaisAtualizados = reservaAtiva.materiais.map(material => ({
        ...material,
        confirmado: materiaisRecebidos.includes(material.materialId)
      }));

      await updateDoc(doc(db, 'reservas_ativas', reservaAtiva.id), {
        materiais: materiaisAtualizados
      });

      // Create movement record
      await addDoc(collection(db, 'movimentacoes_belicas'), {
        policialId,
        armeiro: reservaAtiva.armeiro,
        materiais: materiaisAtualizados.filter(m => m.confirmado),
        tipo: 'cautela',
        assinatura: {
          matricula: assinaturaForm.matricula,
          timestamp: new Date()
        },
        createdAt: new Date()
      });

      // Check if all materials are confirmed to close reservation
      const todosConfirmados = materiaisAtualizados.every(m => m.confirmado);
      if (todosConfirmados) {
        await updateDoc(doc(db, 'reservas_ativas', reservaAtiva.id), {
          status: 'finalizado'
        });
      }

      toast.success('Recebimento confirmado com sucesso');
      setShowAssinatura(false);
      setAssinaturaForm({ matricula: '', senha: '' });

    } catch (error) {
      console.error('Erro ao confirmar recebimento:', error);
      toast.error('Erro ao confirmar recebimento');
    } finally {
      setIsLoading(false);
    }
  };

  if (!reservaAtiva) {
    return (
      <div className="space-y-6">
        <Card className="bg-card border-border shadow-tactical">
          <CardContent className="p-12 text-center">
            <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">
              NENHUMA RESERVA ATIVA
            </h3>
            <p className="text-muted-foreground">
              Aguardando armeiro enviar materiais para confirmação
            </p>
            <div className="mt-6 flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <span className="text-sm text-muted-foreground">
                Sistema em tempo real - Atualizações automáticas
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <Card className="bg-primary/10 border-primary shadow-tactical">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            MATERIAIS ENVIADOS PELO ARMEIRO
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-foreground">
                <strong>Armeiro:</strong> {reservaAtiva.armeiro}
              </p>
              <p className="text-sm text-muted-foreground">
                Enviado em: {reservaAtiva.createdAt.toLocaleString()}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-foreground font-medium">TEMPO REAL</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Materials List */}
      <Card className="bg-card border-border shadow-tactical">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Target className="h-5 w-5" />
            CONFIRMAR RECEBIMENTO DOS MATERIAIS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Clique nos materiais que você está recebendo para confirmá-los:
            </p>
            
            <div className="space-y-3">
              {reservaAtiva.materiais.map((material, index) => {
                const isConfirmado = materiaisRecebidos.includes(material.materialId);
                
                return (
                  <div
                    key={index}
                    className={`p-4 border rounded cursor-pointer transition-all ${
                      isConfirmado
                        ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                        : 'bg-muted border-border hover:bg-accent'
                    }`}
                    onClick={() => confirmarMaterial(material.materialId)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-foreground flex items-center gap-2">
                          {material.nome}
                          {isConfirmado && <CheckCircle className="h-4 w-4 text-green-600" />}
                        </h4>
                        <div className="flex items-center gap-4 mt-1">
                          <Badge variant="outline">{material.categoria}</Badge>
                          <span className="text-sm text-muted-foreground">
                            Quantidade: {material.quantidade}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {material.confirmado ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            CONFIRMADO
                          </Badge>
                        ) : isConfirmado ? (
                          <Badge variant="default" className="bg-blue-600">
                            <Clock className="h-3 w-3 mr-1" />
                            PENDENTE
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Clock className="h-3 w-3 mr-1" />
                            NÃO CONFIRMADO
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={finalizarRecebimento}
                disabled={materiaisRecebidos.length === 0}
                className="flex items-center gap-2"
              >
                <Shield className="h-4 w-4" />
                Finalizar Recebimento ({materiaisRecebidos.length})
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setMateriaisRecebidos([])}
                disabled={materiaisRecebidos.length === 0}
              >
                Limpar Seleção
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Electronic Signature Modal */}
      {showAssinatura && (
        <Card className="bg-primary/10 border-primary shadow-tactical">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Key className="h-5 w-5" />
              ASSINATURA ELETRÔNICA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-foreground">
                Para confirmar o recebimento dos materiais, insira suas credenciais:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Matrícula</label>
                  <Input
                    type="text"
                    placeholder="Digite sua matrícula"
                    value={assinaturaForm.matricula}
                    onChange={(e) => setAssinaturaForm(prev => ({ ...prev, matricula: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-foreground">Senha</label>
                  <Input
                    type="password"
                    placeholder="Digite sua senha"
                    value={assinaturaForm.senha}
                    onChange={(e) => setAssinaturaForm(prev => ({ ...prev, senha: e.target.value }))}
                  />
                </div>
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded dark:bg-yellow-900/20 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Atenção:</strong> Ao confirmar, você assume a responsabilidade pelos materiais selecionados.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={validarAssinatura}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Confirmando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Confirmar Assinatura
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => setShowAssinatura(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Real-time Status */}
      <Card className="bg-muted border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Sistema sincronizado em tempo real com o armeiro
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PolicialInterface;