import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, Wrench, LogOut, ClipboardCheck, ArrowRight, QrCode, Package } from 'lucide-react';
import { toast } from 'sonner';
import QRCodeScanner from '@/components/patrimonio/QRCodeScanner';
import ModalAuthPatrimonio from '@/components/patrimonio/ModalAuthPatrimonio';
import CadastroPatrimonioCavbot from '@/components/patrimonio/CadastroPatrimonioCavbot';

const cards = [
  {
    title: 'Iniciar Serviço',
    desc: 'Login, avarias da viatura e checklist',
    icon: Car,
    gradient: 'from-sky-500 to-cyan-400',
    to: '/sistema/iniciar-servico',
  },
  {
    title: 'Encerrar Serviço',
    desc: 'Finalizar serviço em andamento',
    icon: ClipboardCheck,
    gradient: 'from-emerald-500 to-teal-400',
    to: '/sistema/encerrar-servico',
  },
  {
    title: 'Entrada em Oficina',
    desc: 'Registrar viatura deixada na oficina',
    icon: Wrench,
    gradient: 'from-amber-500 to-orange-400',
    to: '/sistema/entrada-oficina',
  },
  {
    title: 'Saída de Oficina',
    desc: 'Registrar retirada da viatura',
    icon: LogOut,
    gradient: 'from-fuchsia-500 to-rose-400',
    to: '/sistema/saida-oficina',
  },
];

const SistemaUsuarioHome = () => {
  const navigate = useNavigate();
  const [showScan, setShowScan] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showCadastro, setShowCadastro] = useState(false);
  const extras = [
    { key: 'scan', title: 'Escanear Patrimônio', desc: 'Ler QR do item com a câmera', icon: QrCode, gradient: 'from-indigo-500 to-sky-400', onClick: () => setShowScan(true) },
    { key: 'cad', title: 'Cadastrar Patrimônio', desc: 'Incluir item com foto pela câmera', icon: Package, gradient: 'from-lime-500 to-emerald-400', onClick: () => setShowAuth(true) },
  ];
  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-900 via-sky-900 to-cyan-700 text-white">
      <header className="px-5 pt-8 pb-6">
        <div className="text-xs uppercase tracking-widest opacity-70">DKCODE • RPMONT</div>
        <h1 className="text-3xl font-extrabold mt-1">Sistema dos Usuários</h1>
        <p className="text-sm text-white/70 mt-1">Selecione um serviço para começar</p>
      </header>

      <main className="px-4 pb-10 space-y-3">
        {cards.map(c => {
          const Icon = c.icon;
          return (
            <button key={c.to} onClick={() => navigate(c.to)}
              className={`w-full text-left bg-gradient-to-r ${c.gradient} rounded-2xl shadow-xl p-5 flex items-center gap-4 active:scale-[0.98] transition-transform`}>
              <div className="p-3 rounded-xl bg-white/25">
                <Icon className="h-7 w-7" />
              </div>
              <div className="flex-1">
                <div className="text-lg font-bold">{c.title}</div>
                <div className="text-sm text-white/85">{c.desc}</div>
              </div>
              <ArrowRight className="h-6 w-6 opacity-80" />
            </button>
          );
        })}
        {extras.map(c => {
          const Icon = c.icon;
          return (
            <button key={c.key} onClick={c.onClick}
              className={`w-full text-left bg-gradient-to-r ${c.gradient} rounded-2xl shadow-xl p-5 flex items-center gap-4 active:scale-[0.98] transition-transform`}>
              <div className="p-3 rounded-xl bg-white/25"><Icon className="h-7 w-7" /></div>
              <div className="flex-1">
                <div className="text-lg font-bold">{c.title}</div>
                <div className="text-sm text-white/85">{c.desc}</div>
              </div>
              <ArrowRight className="h-6 w-6 opacity-80" />
            </button>
          );
        })}
      </main>

      <QRCodeScanner open={showScan} onClose={() => setShowScan(false)}
        onItemFound={(item: any) => toast.success(`${item.nome} • Tombo ${item.numeroTombo} • ${item.secaoNome}`)} />
      <ModalAuthPatrimonio open={showAuth} onClose={() => setShowAuth(false)}
        onSuccess={() => { setShowAuth(false); setShowCadastro(true); }} />
      <CadastroPatrimonioCavbot open={showCadastro} onClose={() => setShowCadastro(false)}
        onSuccess={() => toast.success('Item de patrimônio cadastrado com sucesso!')} />

      <footer className="text-center text-xs text-white/50 pb-6">
        v1 • mobile-first
      </footer>
    </div>
  );
};

export default SistemaUsuarioHome;
