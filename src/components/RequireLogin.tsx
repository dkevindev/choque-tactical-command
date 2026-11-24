import { Navigate, useLocation } from "react-router-dom";

/** Bloqueia acesso direto por URL a páginas internas sem login (sessão em localStorage 'policialLogado'). */
const RequireLogin = ({ children, perfis }: { children: JSX.Element; perfis?: string[] }) => {
  const location = useLocation();
  let user: any = null;
  try { user = JSON.parse(localStorage.getItem("policialLogado") || "null"); } catch { user = null; }
  if (!user?.id) return <Navigate to="/login-gestao" replace state={{ from: location.pathname }} />;
  if (perfis && !perfis.includes(user.perfil)) return <Navigate to="/user-dashboard" replace />;
  return children;
};
export default RequireLogin;
