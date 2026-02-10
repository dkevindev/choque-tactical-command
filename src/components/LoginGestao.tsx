import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Lock, IdCard, Loader2 } from 'lucide-react';
import logoRegimento from '@/assets/logo-regimento.jpg';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from 'sonner';

const LoginGestao = () => {
  const [matricula, setMatricula] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!matricula || !password) {
      toast.error('Preencha matrícula e senha');
      return;
    }

    setLoading(true);
    try {
      // Buscar policial pela matrícula
      const q = query(collection(db, 'policiais'), where('Matrícula', '==', matricula));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        toast.error('Matrícula não encontrada');
        setLoading(false);
        return;
      }

      const policialDoc = snapshot.docs[0];
      const policialData = policialDoc.data();

      // Verificar senha (campo 'senha' no Firestore)
      if (policialData.senha && policialData.senha !== password) {
        toast.error('Senha incorreta');
        setLoading(false);
        return;
      }

      // Salvar dados do policial logado no localStorage
      const dadosLogado = {
        id: policialDoc.id,
        NOME: policialData.NOME,
        matricula: policialData['Matrícula'],
        postGrad: policialData['Post/Grad'],
        numeral: policialData.NUMERAL,
        perfil: policialData.perfil || 'usuario'
      };
      localStorage.setItem('policialLogado', JSON.stringify(dadosLogado));

      toast.success(`Bem-vindo, ${policialData['Post/Grad'] || ''} ${policialData.NOME || ''}!`);

      // Redirecionar baseado no perfil
      if (policialData.perfil === 'admin' || policialData.perfil === 'gestor') {
        navigate('/admin-dashboard');
      } else {
        navigate('/user-dashboard');
      }
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      toast.error('Erro ao acessar o sistema. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-military">
      <div className="absolute inset-0 bg-gradient-to-br from-tactical-dark via-background to-tactical-medium opacity-90"></div>
      
      <Card className="w-full max-w-md bg-card border-border shadow-tactical relative z-10">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-tactical-medium rounded-full p-2 border-2 border-tactical-light">
              <img 
                src={logoRegimento} 
                alt="1º Regimento Logo" 
                className="w-full h-full object-contain rounded-full"
              />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-foreground tracking-wide">
            RPMONT
          </CardTitle>
          <p className="text-muted-foreground text-sm font-medium">
            GESTÃO E LOGÍSTICA
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="matricula" className="text-foreground font-semibold flex items-center gap-2">
                <IdCard className="h-4 w-4" />
                MATRÍCULA
              </Label>
              <Input
                id="matricula"
                type="text"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                placeholder="Digite sua matrícula"
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                required
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground font-semibold flex items-center gap-2">
                <Lock className="h-4 w-4" />
                SENHA
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                required
                disabled={loading}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-tactical-light text-primary-foreground font-bold py-3 shadow-tactical-glow transition-all duration-200"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  VERIFICANDO...
                </>
              ) : (
                'ACESSAR SISTEMA'
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-foreground"
            >
              ← Voltar ao menu principal
            </Button>
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Sistema restrito • RPMONT PM-CE
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginGestao;