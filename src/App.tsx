import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import AluguelCarrinhos from "./pages/AluguelCarrinhos";
import LoginGestao from "./components/LoginGestao";
import GestãoPessoas from "./components/GestãoPessoas";
import CAVBot from "./components/CAVBot";
import SistemaUsuarioHome from "./components/sistema-usuario/SistemaUsuarioHome";
import IniciarServicoWizard from "./components/sistema-usuario/IniciarServicoWizard";
import EntradaOficinaWizard from "./components/sistema-usuario/EntradaOficinaWizard";
import SaidaOficinaWizard from "./components/sistema-usuario/SaidaOficinaWizard";
import EncerrarServicoWizard from "./components/sistema-usuario/EncerrarServicoWizard";
import AdminDashboard from "./components/AdminDashboard";
import UserDashboard from "./components/UserDashboard";
import ReservaArmamentoSystem from "./components/reserva-armamento/ReservaArmamentoSystem";
import TotemPolicialInterface from "./components/reserva-armamento/TotemPolicialInterface";
import LivroGuardaPage from "./components/guarda-quartel/LivroGuardaPage";
import HistoricoLivrosGuardaPage from "./components/guarda-quartel/HistoricoLivrosGuardaPage";
import GuardaQuartelHome from "./components/guarda-quartel/GuardaQuartelHome";
import ProjetosSociaisSystem from "./components/projetos-sociais/ProjetosSociaisSystem";
import InstrutorSystem from "./components/projetos-sociais/InstrutorSystem";
import GestorSystem from "./components/projetos-sociais/GestorSystem";
import TotemViaturas from "./components/frota/TotemViaturas";
import ComandanteDashboard from "./components/comandante/ComandanteDashboard";
import GaleriaPrivada from "./pages/GaleriaPrivada";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/alugueis" element={<AluguelCarrinhos />} />
          <Route path="/login-gestao" element={<LoginGestao />} />
          <Route path="/login-policial" element={<LoginGestao />} />
          <Route path="/cavbot" element={<SistemaUsuarioHome />} />
          <Route path="/cavbot-legacy" element={<CAVBot />} />
          <Route path="/sistema" element={<SistemaUsuarioHome />} />
          <Route path="/sistema/iniciar-servico" element={<IniciarServicoWizard />} />
          <Route path="/sistema/entrada-oficina" element={<EntradaOficinaWizard />} />
          <Route path="/sistema/saida-oficina" element={<SaidaOficinaWizard />} />
          <Route path="/sistema/encerrar-servico" element={<EncerrarServicoWizard />} />
          <Route path="/gestao-pessoas" element={<GestãoPessoas />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/user-dashboard" element={<UserDashboard />} />
          <Route path="/reserva-armamento/totem" element={<TotemPolicialInterface />} />
          <Route path="/reserva-armamento/*" element={<ReservaArmamentoSystem />} />
          <Route path="/guarda-quartel" element={<GuardaQuartelHome />} />
          <Route path="/guarda-quartel/novo" element={<LivroGuardaPage />} />
          <Route path="/guarda-quartel/historico" element={<HistoricoLivrosGuardaPage />} />
          <Route path="/projetos-sociais/instrutor" element={<InstrutorSystem />} />
          <Route path="/projetos-sociais/gestor" element={<GestorSystem />} />
          <Route path="/projetos-sociais/*" element={<ProjetosSociaisSystem />} />
          <Route path="/totem-viaturas" element={<TotemViaturas />} />
          <Route path="/gestao-comandantes" element={<ComandanteDashboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
