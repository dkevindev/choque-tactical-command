import { Navigate } from "react-router-dom";

/**
 * Bloqueia acesso direto por URL a sistemas internos.
 * Usa a mesma sessão e as mesmas permissões do login da página inicial (localStorage 'user' + acessos).
 */
const lerJSON = (k: string) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } };

export const temAcesso = (acessoKey: string) => {
  const user = lerJSON("user");
  if (user?.id) {
    if (acessoKey === "acessoPolicial") return true;
    return !!user.acessos?.[acessoKey];
  }
  // Sessão do login antigo (LoginGestao)
  const antigo = lerJSON("policialLogado");
  if (antigo?.id) {
    if (acessoKey === "acessoPolicial") return true;
    return ["gestaoLogistica", "gestaoPessoas"].includes(acessoKey) && ["admin", "gestor"].includes(antigo.perfil);
  }
  return false;
};

const RequireLogin = ({ children, acessoKey }: { children: JSX.Element; acessoKey: string }) =>
  temAcesso(acessoKey) ? children : <Navigate to="/" replace />;

export default RequireLogin;
