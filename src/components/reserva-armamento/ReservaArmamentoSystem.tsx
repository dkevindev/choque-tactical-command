import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Shield, User, Target } from 'lucide-react';
import ArmeiroInterface from './ArmeiroInterface';
import PolicialInterface from './PolicialInterface';

// Mock user detection - replace with real authentication
const getUserType = () => {
  // This would come from authentication context
  const userRole = localStorage.getItem('userRole') || 'policial';
  return userRole; // 'admin', 'armeiro', 'policial'
};

const ReservaArmamentoSystem = () => {
  const [userType, setUserType] = useState<string>('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const type = getUserType();
    setUserType(type);
    
    // Auto-redirect based on user type
    if (location.pathname === '/reserva-armamento' || location.pathname === '/reserva-armamento/') {
      if (type === 'armeiro' || type === 'admin') {
        navigate('/reserva-armamento/armeiro');
      } else {
        navigate('/reserva-armamento/policial');
      }
    }
  }, [location.pathname, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-tactical">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="text-foreground hover:bg-accent"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary rounded">
                  <Target className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">
                    SISTEMA DE RESERVA DE ARMAMENTO
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Comando de Policiamento de Choque
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={userType === 'armeiro' || userType === 'admin' ? 'default' : 'secondary'}>
                {userType.toUpperCase()}
              </Badge>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <span className="text-xs font-semibold text-foreground">SISTEMA ATIVO</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        <Routes>
          <Route path="/" element={<RoleSelection userType={userType} />} />
          <Route path="/armeiro" element={<ArmeiroInterface />} />
          <Route path="/policial" element={<PolicialInterface />} />
        </Routes>
      </main>
    </div>
  );
};

// Role selection component for manual override or testing
const RoleSelection = ({ userType }: { userType: string }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border shadow-tactical">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5" />
            SELEÇÃO DE PERFIL
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">
            Perfil detectado: <strong>{userType.toUpperCase()}</strong>
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-muted border-border cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => navigate('/reserva-armamento/armeiro')}>
              <CardContent className="p-6 text-center">
                <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-bold text-foreground mb-2">ARMEIRO</h3>
                <p className="text-sm text-muted-foreground">
                  Interface para controle de materiais e cautelas
                </p>
              </CardContent>
            </Card>

            <Card className="bg-muted border-border cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => navigate('/reserva-armamento/policial')}>
              <CardContent className="p-6 text-center">
                <User className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-bold text-foreground mb-2">POLICIAL</h3>
                <p className="text-sm text-muted-foreground">
                  Interface para confirmação de recebimento
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReservaArmamentoSystem;