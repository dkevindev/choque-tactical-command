import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Policial {
  id: string;
  NOME: string;
  'NOME DE GUERRA1'?: string;
  'Post/Grad': string;
  CPF?: string;
  Matrícula?: string;
  [key: string]: any;
}

interface AssinaturaData {
  policial: Policial;
  funcao: string;
}

interface ModalAssinaturaLivroGuardaProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (assinatura: AssinaturaData) => void;
}

const ModalAssinaturaLivroGuarda = ({ isOpen, onClose, onConfirm }: ModalAssinaturaLivroGuardaProps) => {
  const [policiaisOficiais, setPoliciaisOficiais] = useState<Policial[]>([]);
  const [assinaturaSelecionada, setAssinaturaSelecionada] = useState<{
    policial: Policial | null;
    funcao: string | null;
  }>({
    policial: null,
    funcao: null,
  });

  const funcoesAssinatura = [
    'Comandante do RPMON',
    'Subcomandante do RPMONT',
    'Respondendo pelo Comando do RPMONT',
    'Oficial de Operações',
    'Chefe do P1',
    'Chefe do P3',
    'Chefe do P4',
    'Chefe do P6',
    'Comandante do 1ºEsq/RPMONT',
    'Comandante do 2ºEsq/RPMONT',
    'Comandante do 3ªPel/2ªEsq/RPMONT',
  ];

  useEffect(() => {
    if (isOpen) {
      carregarPoliciaisOficiais();
    }
  }, [isOpen]);

  const carregarPoliciaisOficiais = async () => {
    try {
      const policiaisSnapshot = await getDocs(collection(db, 'policiais'));
      const oficiais = policiaisSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Policial))
        .filter(p => {
          const posto = p['Post/Grad']?.toLowerCase() || '';
          return posto.includes('tenente') || posto.includes('capitão') || 
                 posto.includes('major') || posto.includes('coronel');
        });
      
      setPoliciaisOficiais(oficiais);
    } catch (error) {
      console.error('Erro ao carregar policiais oficiais:', error);
      toast.error('Erro ao carregar lista de oficiais');
    }
  };

  const handleSelectSignatory = (policial: Policial) => {
    setAssinaturaSelecionada(prev => ({ ...prev, policial }));
  };

  const handleSelectFuncao = (funcao: string) => {
    setAssinaturaSelecionada(prev => ({ ...prev, funcao }));
  };

  const handleConfirmSignature = () => {
    if (!assinaturaSelecionada.policial || !assinaturaSelecionada.funcao) {
      toast.error('Selecione o oficial e a função');
      return;
    }

    onConfirm({
      policial: assinaturaSelecionada.policial,
      funcao: assinaturaSelecionada.funcao
    });

    setAssinaturaSelecionada({ policial: null, funcao: null });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-auto">
      <div className="bg-card rounded-lg p-6 w-full max-w-4xl shadow-lg max-h-[80vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4 text-center text-foreground">Selecionar Assinatura</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-lg font-semibold mb-3 text-foreground">Selecione o Oficial:</h4>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {policiaisOficiais.length === 0 ? (
                <p className="text-muted-foreground">Nenhum oficial encontrado.</p>
              ) : (
                policiaisOficiais.map(policial => (
                  <Button
                    key={policial.id}
                    variant={assinaturaSelecionada.policial?.id === policial.id ? 'default' : 'outline'}
                    onClick={() => handleSelectSignatory(policial)}
                    className="w-full justify-start text-left"
                  >
                    {policial['NOME DE GUERRA1']} - {policial['Post/Grad']}
                  </Button>
                ))
              )}
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-3 text-foreground">Selecione a Função:</h4>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {funcoesAssinatura.map(funcao => (
                <Button
                  key={funcao}
                  variant={assinaturaSelecionada.funcao === funcao ? 'default' : 'outline'}
                  onClick={() => handleSelectFuncao(funcao)}
                  className="w-full justify-start text-left"
                >
                  {funcao}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {assinaturaSelecionada.policial && assinaturaSelecionada.funcao && (
          <div className="mt-6 p-4 border border-border rounded bg-muted text-center">
            <p className="text-lg font-medium text-foreground">Assinatura selecionada:</p>
            <p className="text-xl font-bold text-primary">
              {assinaturaSelecionada.policial['Post/Grad']} {assinaturaSelecionada.policial.NOME}
            </p>
            <p className="text-md text-muted-foreground">
              {assinaturaSelecionada.funcao}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Todos os dados do oficial (CPF, matrícula, etc.) estão disponíveis para o documento.
            </p>
          </div>
        )}

        <div className="flex justify-end space-x-2 mt-6">
          <Button
            variant="secondary"
            onClick={() => {
              onClose();
              setAssinaturaSelecionada({ policial: null, funcao: null });
            }}
          >
            Cancelar
          </Button>
          <Button onClick={handleConfirmSignature}>
            Confirmar Assinatura
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ModalAssinaturaLivroGuarda;
