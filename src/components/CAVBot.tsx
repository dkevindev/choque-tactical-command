import { useState, useEffect, useRef } from 'react';
import type { BotResponse, Viatura } from '@/bot/types';
import { responder } from '@/bot/index';
import { consultarOSPorNumero } from '@/bot/oficinaHandler';
import ViaturaModal from '@/bot/ViaturaModal';
import FormEntradaOficina from '@/bot/FormEntradaOficina';
import FormSaidaOficina from '@/bot/FormSaidaOficina';
import { Mic, MicOff, Send } from 'lucide-react';
import { buscarViaturasLeves, buscarViaturasPesadas, type ViaturaBasica } from '@/lib/viaturaUtils';
import { db } from '@/firebase';
import { collection, getDocs, query, where, doc, getDoc, updateDoc, addDoc } from 'firebase/firestore';

import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const CAVBot = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Olá! Sou o CAVBOT, seu assistente virtual da CAVALARIA. Como posso ajudá-lo hoje?',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [selectedViatura, setSelectedViatura] = useState<Viatura | null>(null);
  const [showEntradaForm, setShowEntradaForm] = useState(false);
  const [showSaidaForm, setShowSaidaForm] = useState(false);
  const [showQuickButtons, setShowQuickButtons] = useState(true);
  const [inputText, setInputText] = useState('');

  // Fluxo de autenticação passo a passo
  const [flow, setFlow] = useState<{
    active: boolean;
    type?: 'os' | 'vtr' | 'entrada' | 'saida' | 'avarias';
    stage?:
      | 'ask_matricula'
      | 'ask_senha'
      | 'ask_target'
      | 'avarias_ui'
      | 'avarias_ask_tipo'
      | 'avarias_ask_desc'
      | 'avarias_ask_gravidade'
      | 'service_start_motorista'
      | 'service_start_km'
      | 'service_start_area'
      | 'service_end_km';
    matricula?: string;
    senha?: string;
  }>({ active: false });

  // UI de seleção de VTR
  const [vtrStep, setVtrStep] = useState<'none' | 'root' | 'pesada' | 'leve-categoria' | 'leve-operacional' | 'leve-adm'>('none');
  const [listaViaturas, setListaViaturas] = useState<ViaturaBasica[]>([]);
  const [loadingVtrs, setLoadingVtrs] = useState(false);

  // Contexto de Avarias no bot
  type AnguloAvaria = 'frontal' | 'traseira' | 'esquerdo' | 'direito' | 'mecanico' | 'interno';
  type Policial = { id: string; NOME: string; Matrícula: string | number; nomeGuerra1?: string; acessos?: { gestaoLogistica?: boolean; cavbot?: boolean; reservaArmamento?: boolean; guardaQuartel?: boolean }; primeiroAcesso?: boolean; senhaDefault?: boolean };
  const [policialLogado, setPolicialLogado] = useState<Policial | null>(null);
  const [avariasViatura, setAvariasViatura] = useState<ViaturaBasica | null>(null);
  const [avariasAngulo, setAvariasAngulo] = useState<AnguloAvaria>('frontal');
  const [avariasLista, setAvariasLista] = useState<any[]>([]);
  const [avariaDraft, setAvariaDraft] = useState<{ tipo?: string; descricao?: string; gravidade?: 'LEVE' | 'MODERADA' | 'GRAVE' }>({});
  const [servicoDraft, setServicoDraft] = useState<{ motorista?: string; kmInicial?: number; area?: string }>({});
  const [servicoAberto, setServicoAberto] = useState<any | null>(null);
  // Imagens e marcação de avarias na UI do bot
  const [avariasImagens, setAvariasImagens] = useState<{
    frontal?: string;
    traseira?: string;
    esquerdo?: string;
    direito?: string;
  } | null>(null);
  const [marcandoAvaria, setMarcandoAvaria] = useState(false);
  const [posicaoTemporaria, setPosicaoTemporaria] = useState<{ x: number; y: number } | null>(null);
  const [showAvariaModal, setShowAvariaModal] = useState(false);
  const [modalTipo, setModalTipo] = useState('');
  const [modalDesc, setModalDesc] = useState('');
  const [modalGravidade, setModalGravidade] = useState<'LEVE' | 'MODERADA' | 'GRAVE'>('LEVE');
  const [avariaSelecionada, setAvariaSelecionada] = useState<any | null>(null);
  const [showAvariaDetalhe, setShowAvariaDetalhe] = useState(false);
  
  // Encerramento de serviço via menu
  type ServicoItem = { id: string; viaturaId: string; cadastro?: string | null; placa?: string; motorista?: string; motoristaId?: string; kmInicial?: number; area?: string };
  const [showEncerrarModal, setShowEncerrarModal] = useState(false);
  const [encerrarStep, setEncerrarStep] = useState<'list' | 'senha' | 'km'>('list');
  const [servicosAbertos, setServicosAbertos] = useState<ServicoItem[]>([]);
  const [servicoSelecionado, setServicoSelecionado] = useState<ServicoItem | null>(null);
  const [senhaMotorista, setSenhaMotorista] = useState('');
  const [kmFinalInput, setKmFinalInput] = useState('');
  const [encerrarMsg, setEncerrarMsg] = useState<string>('');
  const [policialEncerrar, setPolicialEncerrar] = useState<{ id: string; NOME: string; nomeGuerra1?: string } | null>(null);

  // Troca de senha no primeiro acesso
  const [showTrocarSenha, setShowTrocarSenha] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmNovaSenha, setConfirmNovaSenha] = useState('');
  const [trocarSenhaMsg, setTrocarSenhaMsg] = useState('');

  // Checklist de Verificação da Viatura
  interface ChecklistViatura {
    oleoMotor: 'abaixo' | 'nivel' | 'acima';
    aguaRadiador: 'abaixo' | 'nivel' | 'acima';
    step: 'possui' | 'nao_possui';
    macaco: 'possui' | 'nao_possui';
    chaveRoda: 'possui' | 'nao_possui';
    triangulo: 'possui' | 'nao_possui';
    smartphone: {
      estado: 'avariado' | 'bom' | 'otimo';
      conexao: 'com_conexao' | 'sem_conexao';
    };
    radioFixo: 'com_sinal' | 'sem_sinal';
    cartaoAbastecimento: 'possui' | 'nao_possui';
    dataVerificacao: string;
    verificadoPor: string;
    verificadoPorId: string;
    problemas?: string[];
  }
  
  const [checklistDraft, setChecklistDraft] = useState<Partial<ChecklistViatura>>({});
  const [checklistStep, setChecklistStep] = useState<number>(0); // 0-9 steps
  const [showChecklist, setShowChecklist] = useState(false);

  const allowedOperacionais = ['05', '06', '08', '11', '12', '13'];
  const isOperacionalCadastro = (cad?: string): boolean => {
    const c = String(cad || '');
    const digits = (c.match(/\d+/g) || []).join('');
    return allowedOperacionais.some(n => digits.includes(n));
  };

  const startVtrSelection = () => {
    setVtrStep('root');
  };

  // Verifica se existe serviço em aberto para a viatura
  const carregarServicoAberto = async (viaturaId: string) => {
    try {
      const qServ = query(
        collection(db, 'servicosDiarios'),
        where('viaturaId', '==', viaturaId),
        where('status', '==', 'aberto')
      );
      const snap = await getDocs(qServ);
      if (!snap.empty) {
        const d = snap.docs[0];
        const data: any = d.data();
        setServicoAberto({ id: d.id, ...data });
        pushBot(`Há um serviço em aberto: motorista ${data.motorista || '-'}, KM inicial ${data.kmInicial ?? '-'}, área ${data.area ?? '-'}.`);
      } else {
        setServicoAberto(null);
        // mensagem informativa apenas quando já houver seleção
      }
    } catch (e) {
      console.error('Erro ao verificar serviço aberto:', e);
      pushBot('Não foi possível verificar serviços em aberto no momento.');
    }
  };

  // Verificar credenciais do policial
  const verificarPolicial = async (mat: string, pass: string): Promise<Policial | null> => {
    try {
      let snap = await getDocs(query(collection(db, 'policiais'), where('Matrícula', '==', parseInt(mat))));
      if (snap.empty) {
        snap = await getDocs(query(collection(db, 'policiais'), where('Matrícula', '==', mat)));
      }
      if (snap.empty) return null;
      const d = snap.docs[0];
      const data: any = d.data();
      const primeiroAcesso = data.primeiroAcesso !== false || !data.senha;
      const senhaDefault = data.senha ? String(data.senha) === String(data.Matrícula) : true;
      const senhaOk = primeiroAcesso ? pass === String(mat) : String(data.senha) === String(pass);
      if (!senhaOk) return null;
      return {
        id: d.id,
        NOME: data.NOME,
        Matrícula: data.Matrícula,
        nomeGuerra1: data['NOME DE GUERRA1'] || data['NOME DE GUERRA'] || data.NOME,
        acessos: data.acessos || {},
        primeiroAcesso,
        senhaDefault,
      };
    } catch (e) {
      console.error('Erro ao verificar policial:', e);
      return null;
    }
  };

  // Salvar avaria no documento da viatura (coleção 'frota')
  const salvarAvaria = async (dados: {
    tipo: string;
    descricao?: string;
    gravidade: 'LEVE' | 'MODERADA' | 'GRAVE';
    posicao?: { x: number; y: number } | null;
  }) => {
    if (!avariasViatura || !policialLogado || !dados.tipo) {
      pushBot('Dados insuficientes para salvar a avaria.');
      return;
    }
    try {
      const ref = doc(db, 'frota', avariasViatura.id);
      const snap = await getDoc(ref);
      const data = snap.exists() ? (snap.data() as any) : {};
      const lista = Array.isArray(data.avarias) ? data.avarias : [];

      // Para ângulos com imagem, exigir marcação por clique
      const angulosComImagem = ['frontal', 'traseira', 'esquerdo', 'direito'] as const;
      const posicaoFinal = dados.posicao || posicaoTemporaria;
      
      if (angulosComImagem.includes(avariasAngulo as any) && !posicaoFinal) {
        pushBot('Clique na imagem para marcar a posição da avaria antes de salvar.');
        return;
      }

      const nova = {
        id: Date.now().toString(),
        x: posicaoFinal ? posicaoFinal.x * 100 : 0,
        y: posicaoFinal ? posicaoFinal.y * 100 : 0,
        tipo: dados.tipo,
        descricao: dados.descricao || '',
        data: new Date().toISOString(),
        gravidade: dados.gravidade,
        status: 'PENDENTE',
        responsavel: policialLogado.nomeGuerra1 || policialLogado.NOME,
        angulo: avariasAngulo,
        reportadoPorPolicial: true,
      };
      await updateDoc(ref, { avarias: [...lista, nova] });
      setAvariasLista([...lista, nova]);
      pushBot(`✅ Avaria registrada (${nova.tipo} - ${nova.gravidade}) no ângulo ${avariasAngulo}.`);
      setPosicaoTemporaria(null);
    } catch (e) {
      console.error('Erro ao salvar avaria:', e);
      pushBot('Erro ao salvar avaria.');
    }
  };

  // Iniciar serviço diário
  const iniciarServico = async (payload?: { motorista?: string; kmInicial: number; area: string }) => {
    const kmInicialVal = payload?.kmInicial ?? servicoDraft.kmInicial;
    const areaVal = payload?.area ?? servicoDraft.area;
    // SEMPRE usar nomeGuerra1, nunca o nome completo
    const motoristaVal = policialLogado?.nomeGuerra1 || policialLogado?.NOME || 'Sem identificação';
    if (!avariasViatura || !policialLogado || !kmInicialVal || !areaVal) {
      pushBot('Preencha KM inicial e área para iniciar o serviço.');
      return;
    }
    try {
      const docRef = await addDoc(collection(db, 'servicosDiarios'), {
        viaturaId: avariasViatura.id,
        cadastro: avariasViatura.CADASTRO || null,
        placa: avariasViatura.PLACA,
        motorista: motoristaVal, // Agora sempre salva nomeGuerra1
        motoristaId: policialLogado.id,
        kmInicial: kmInicialVal,
        area: areaVal,
        localAtuacao: areaVal,
        status: 'aberto',
        iniciadoEm: new Date().toISOString(),
        policialId: policialLogado.id,
        policialNome: policialLogado.NOME,
        policialNomeGuerra1: policialLogado.nomeGuerra1 || null,
      });
      setServicoAberto({ id: docRef.id, motorista: motoristaVal, kmInicial: kmInicialVal, area: areaVal, status: 'aberto', viaturaId: avariasViatura.id });
      pushBot('✅ Serviço iniciado! Agora vamos fazer o checklist de verificação da viatura.');
      setServicoDraft({});
      // Iniciar checklist
      setChecklistDraft({});
      setChecklistStep(0);
      setShowChecklist(true);
    } catch (e) {
      console.error('Erro ao iniciar serviço:', e);
      pushBot('Erro ao iniciar serviço.');
    }
  };

  // Salvar checklist completo no Firebase
  const salvarChecklist = async () => {
    if (!avariasViatura || !policialLogado) {
      pushBot('Erro: dados insuficientes para salvar o checklist.');
      return;
    }
    
    try {
      const problemas: string[] = [];
      if (checklistDraft.oleoMotor && checklistDraft.oleoMotor !== 'nivel') problemas.push('oleoMotor');
      if (checklistDraft.aguaRadiador && checklistDraft.aguaRadiador !== 'nivel') problemas.push('aguaRadiador');
      if (checklistDraft.step === 'nao_possui') problemas.push('step');
      if (checklistDraft.macaco === 'nao_possui') problemas.push('macaco');
      if (checklistDraft.chaveRoda === 'nao_possui') problemas.push('chaveRoda');
      if (checklistDraft.triangulo === 'nao_possui') problemas.push('triangulo');
      if (checklistDraft.smartphone?.estado === 'avariado' || checklistDraft.smartphone?.conexao === 'sem_conexao') problemas.push('smartphone');
      if (checklistDraft.radioFixo === 'sem_sinal') problemas.push('radioFixo');
      if (checklistDraft.cartaoAbastecimento === 'nao_possui') problemas.push('cartaoAbastecimento');
      
      const checklistCompleto: ChecklistViatura = {
        oleoMotor: checklistDraft.oleoMotor || 'nivel',
        aguaRadiador: checklistDraft.aguaRadiador || 'nivel',
        step: checklistDraft.step || 'possui',
        macaco: checklistDraft.macaco || 'possui',
        chaveRoda: checklistDraft.chaveRoda || 'possui',
        triangulo: checklistDraft.triangulo || 'possui',
        smartphone: checklistDraft.smartphone || { estado: 'bom', conexao: 'com_conexao' },
        radioFixo: checklistDraft.radioFixo || 'com_sinal',
        cartaoAbastecimento: checklistDraft.cartaoAbastecimento || 'possui',
        dataVerificacao: new Date().toISOString(),
        verificadoPor: policialLogado.nomeGuerra1 || policialLogado.NOME,
        verificadoPorId: policialLogado.id,
        problemas
      };
      
      const viaturaRef = doc(db, 'frota', avariasViatura.id);
      const viaturaSnap = await getDoc(viaturaRef);
      const viaturaData = viaturaSnap.exists() ? (viaturaSnap.data() as any) : {};
      const historicoChecklists = Array.isArray(viaturaData.historicoChecklists) ? viaturaData.historicoChecklists : [];
      
      await updateDoc(viaturaRef, {
        ultimoChecklist: checklistCompleto,
        historicoChecklists: [...historicoChecklists, checklistCompleto]
      });
      
      pushBot('✅ Checklist de verificação concluído e salvo com sucesso!');
      if (problemas.length > 0) {
        pushBot(`⚠️ Foram identificados ${problemas.length} item(ns) com problema. Verifique no painel de gestão.`);
      }
      setShowChecklist(false);
      setChecklistDraft({});
      setChecklistStep(0);
    } catch (e) {
      console.error('Erro ao salvar checklist:', e);
      pushBot('Erro ao salvar o checklist.');
    }
  };

  // Encerrar serviço diário
  const encerrarServico = async (kmFinal: number) => {
    if (!servicoAberto) {
      pushBot('Não há serviço aberto.');
      return;
    }
    try {
      const ref = doc(db, 'servicosDiarios', servicoAberto.id);
      await updateDoc(ref, {
        kmFinal,
        status: 'encerrado',
        encerradoEm: new Date().toISOString(),
        encerradoPorId: policialLogado?.id || null,
        encerradoPorNome: policialLogado?.NOME || null,
      });
      // Atualizar KM da VTR na coleção 'frota'
      const vtrId = avariasViatura?.id || (servicoAberto as any)?.viaturaId;
      if (vtrId) {
        await updateDoc(doc(db, 'frota', vtrId), { KM: kmFinal });
      }
      setServicoAberto(null);
      pushBot('✅ Serviço encerrado com sucesso.');
    } catch (e) {
      console.error('Erro ao encerrar serviço:', e);
      pushBot('Erro ao encerrar serviço.');
    }
  };

  const loadPesadas = async () => {
    setLoadingVtrs(true);
    try {
      const arr = await buscarViaturasPesadas();
      setListaViaturas(arr);
      setVtrStep('pesada');
    } finally {
      setLoadingVtrs(false);
    }
  };

  const goLeveCategoria = () => {
    setVtrStep('leve-categoria');
  };

  const loadLevesOperacional = async () => {
    setLoadingVtrs(true);
    try {
      const leves = await buscarViaturasLeves();
      const ops = leves.filter(v => isOperacionalCadastro(v.CADASTRO));
      setListaViaturas(ops);
      setVtrStep('leve-operacional');
    } finally {
      setLoadingVtrs(false);
    }
  };

  const loadLevesAdministrativa = async () => {
    setLoadingVtrs(true);
    try {
      const leves = await buscarViaturasLeves();
      const outros = leves.filter(v => !isOperacionalCadastro(v.CADASTRO));
      setListaViaturas(outros);
      setVtrStep('leve-adm');
    } finally {
      setLoadingVtrs(false);
    }
  };

  const handleVtrSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (vtrStep === 'root') {
      if (value === 'pesada') return loadPesadas();
      if (value === 'leve') return goLeveCategoria();
      return;
    }
    if (vtrStep === 'leve-categoria') {
      if (value === 'operacional') return loadLevesOperacional();
      if (value === 'adm') return loadLevesAdministrativa();
      if (value === 'back') return setVtrStep('root');
      return;
    }
    if (vtrStep === 'pesada' || vtrStep === 'leve-operacional' || vtrStep === 'leve-adm') {
      if (value === 'back') return setVtrStep(vtrStep === 'pesada' ? 'root' : 'leve-categoria');
      const v = listaViaturas.find(v => v.id === value);
      if (v) return handleSelectViatura(v);
    }
  };

  const handleSelectViatura = async (v: ViaturaBasica) => {
    if (flow.active && flow.type === 'avarias') {
      setAvariasViatura(v);
      await carregarServicoAberto(v.id);
      try {
        const ref = doc(db, 'frota', v.id);
        const snap = await getDoc(ref);
        const data = snap.exists() ? (snap.data() as any) : {};
        setAvariasLista(Array.isArray(data.avarias) ? data.avarias : []);
        setAvariasImagens({
          frontal: data.imagemFrontal || undefined,
          traseira: data.imagemTraseira || undefined,
          esquerdo: data.imagemEsquerdo || data.imagemLadoEsquerdo || undefined,
          direito: data.imagemDireito || data.imagemLadoDireito || undefined,
        });
      } catch (e) {
        console.error('Erro ao carregar avarias da viatura:', e);
        setAvariasLista([]);
      }
      setFlow(prev => ({ ...prev, stage: 'avarias_ui' }));
      pushBot(`Viatura selecionada: ${v.CADASTRO || v.PLACA}. Selecione um ângulo ou inicie/encerre serviço abaixo.`);
      return;
    }

    const label = v.CADASTRO || v.PLACA;
    const consulta = `dados da ${label}`;
    const botResponse: BotResponse = await responder(consulta);
    if (botResponse.type === 'show_viatura_modal') {
      setSelectedViatura(botResponse.viatura);
    } else if (botResponse.type === 'text') {
      pushBot(botResponse.text);
    }
    setFlow({ active: false });
    setVtrStep('none');
    setListaViaturas([]);
  };

  const pushBot = (text: string) => {
    const botMessage: Message = {
      id: (Date.now() + Math.random()).toString(),
      text,
      sender: 'bot',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, botMessage]);
  };

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imagemRef = useRef<HTMLImageElement>(null);

  const getImagemAngulo = () => {
    if (!avariasImagens) return undefined;
    switch (avariasAngulo) {
      case 'frontal': return avariasImagens.frontal;
      case 'traseira': return avariasImagens.traseira;
      case 'esquerdo': return avariasImagens.esquerdo;
      case 'direito': return avariasImagens.direito;
      default: return undefined;
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setPosicaoTemporaria({ x, y });
    setMarcandoAvaria(true);
    setModalTipo('');
    setModalDesc('');
    setModalGravidade('LEVE');
    setShowAvariaModal(true);
  };

  // Scroll automático ao receber mensagens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Atualiza inputText sempre que o transcript mudar (mas só se for diferente do valor atual)
  useEffect(() => {
    if (transcript && transcript !== inputText) {
      setInputText(transcript);
    }
  }, [transcript]);

  const handleSendMessage = async (textParam?: string) => {
    const textToSend = textParam ?? inputText;
    if (!textToSend.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: textToSend,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    resetTranscript();

    // Fluxo de autenticação ativo
    if (flow.active) {
      // 1) Credenciais
      if (flow.stage === 'ask_matricula') {
        setFlow(prev => ({ ...prev, stage: 'ask_senha', matricula: textToSend }));
        pushBot('Informe sua senha:');
        return;
      }

      if (flow.stage === 'ask_senha') {
        const type = flow.type;
        const pol = await verificarPolicial(flow.matricula || '', textToSend);
        if (!pol) {
          pushBot('❌ Matrícula ou senha incorreta. Tente novamente.');
          setFlow({ active: true, type, stage: 'ask_matricula' });
          return;
        }
        setPolicialLogado(pol);
        pushBot(`✅ Logado como ${pol.NOME}.`);
        // Primeira vez com senha igual à matrícula: exigir troca de senha
        if ((pol as any).senhaDefault || textToSend === String(flow.matricula || '')) {
          setShowTrocarSenha(true);
        }

        // Restrição: Consultar Viatura apenas para quem tem acesso à Gestão e Logística
        if (type === 'vtr' && !(pol.acessos?.gestaoLogistica)) {
          pushBot('🔒 Acesso negado: apenas usuários com permissão "GESTÃO E LOGÍSTICA" podem consultar viaturas.');
          setFlow({ active: false });
          setShowQuickButtons(true);
          return;
        }

        if (type === 'os') {
          setFlow(prev => ({ ...prev, stage: 'ask_target' }));
          pushBot('Digite o número da OS:');
        } else {
          setFlow(prev => ({ ...prev, stage: 'ask_target' }));
          startVtrSelection();
          pushBot('Selecione a VTR abaixo: escolha a frota.');
        }
        return;
      }

      // 2) Entrada do alvo (OS ou VTR)
      if (flow.stage === 'ask_target') {
        if (flow.type === 'os') {
          const numero = (textToSend.match(/\d+/) || [])[0];
          if (!numero) {
            pushBot('Por favor, informe um número de OS válido.');
            return;
          }
          const resultado = await consultarOSPorNumero(numero);
          pushBot(resultado);
          setFlow({ active: false });
          return;
        }

        if (flow.type === 'vtr') {
          const consulta = `dados da ${textToSend}`;
          const botResponse: BotResponse = await responder(consulta);
          if (botResponse.type === 'show_viatura_modal') {
            setSelectedViatura(botResponse.viatura);
          } else if (botResponse.type === 'text') {
            pushBot(botResponse.text);
          }
          setFlow({ active: false });
          return;
        }

        if (flow.type === 'avarias') {
          // Usuário deve selecionar via botões
          pushBot('Use os botões acima para selecionar a viatura.');
          return;
        }
      }

      // 3) Fluxo de AVARIAS - coletar dados
      if (flow.type === 'avarias') {
        if (flow.stage === 'avarias_ask_tipo') {
          setAvariaDraft(prev => ({ ...prev, tipo: textToSend }));
          setFlow(prev => ({ ...prev, stage: 'avarias_ask_desc' }));
          pushBot('Descreva a avaria (ou digite "-" para pular):');
          return;
        }
        if (flow.stage === 'avarias_ask_desc') {
          const desc = textToSend.trim() === '-' ? '' : textToSend;
          setAvariaDraft(prev => ({ ...prev, descricao: desc }));
          setFlow(prev => ({ ...prev, stage: 'avarias_ask_gravidade' }));
          pushBot('Informe a gravidade: LEVE, MODERADA ou GRAVE.');
          return;
        }
        if (flow.stage === 'avarias_ask_gravidade') {
          const g = textToSend.toUpperCase();
          const allowed = ['LEVE','MODERADA','GRAVE'] as const;
          if (!allowed.includes(g as any)) {
            pushBot('Valor inválido. Digite: LEVE, MODERADA ou GRAVE.');
            return;
          }
          
          // Passar dados completos para salvarAvaria
          await salvarAvaria({
            tipo: avariaDraft.tipo || '',
            descricao: avariaDraft.descricao || '',
            gravidade: g as any,
            posicao: posicaoTemporaria
          });
          
          setAvariaDraft({});
          setFlow(prev => ({ ...prev, stage: 'avarias_ui' }));
          return;
        }

        // Serviço - iniciar
        if (flow.stage === 'service_start_motorista') {
          setServicoDraft(prev => ({ ...prev, motorista: textToSend }));
          setFlow(prev => ({ ...prev, stage: 'service_start_km' }));
          pushBot('Informe o KM inicial:');
          return;
        }
        if (flow.stage === 'service_start_km') {
          const km = parseInt(textToSend.replace(/\D/g, ''));
          if (isNaN(km)) { pushBot('KM inválido. Digite apenas números.'); return; }
          setServicoDraft(prev => ({ ...prev, kmInicial: km }));
          setFlow(prev => ({ ...prev, stage: 'service_start_area' }));
          pushBot('Informe a área de serviço:');
          return;
        }
        if (flow.stage === 'service_start_area') {
          setServicoDraft(prev => ({ ...prev, area: textToSend }));
          await iniciarServico({ motorista: servicoDraft.motorista ?? (policialLogado?.nomeGuerra1 || policialLogado?.NOME), kmInicial: (servicoDraft.kmInicial as number), area: textToSend });
          setFlow(prev => ({ ...prev, stage: 'avarias_ui' }));
          return;
        }

        // Serviço - encerrar (REMOVIDO - encerramento só via botão principal)
        // if (flow.stage === 'service_end_km') {
        //   const kmf = parseInt(textToSend.replace(/\D/g, ''));
        //   if (isNaN(kmf)) { pushBot('KM inválido. Digite apenas números.'); return; }
        //   await encerrarServico(kmf);
        //   setFlow(prev => ({ ...prev, stage: 'avarias_ui' }));
        //   return;
        // }
      }
    }

    // Iniciar fluxos ao reconhecer comandos diretos
    const lower = textToSend.toLowerCase().trim();
    if (lower.includes('consultar os') || lower.includes('ordem de serviço')) {
      setShowQuickButtons(false);
      setFlow({ active: true, type: 'os', stage: 'ask_matricula' });
      pushBot('Informe sua matrícula:');
      return;
    }
    if (lower.includes('consultar vtr') || lower.includes('consultar viatura') || lower.startsWith('consultar dados')) {
      setShowQuickButtons(false);
      setFlow({ active: true, type: 'vtr', stage: 'ask_matricula' });
      pushBot('Informe sua matrícula (Portal do Policial):');
      return;
    }

    // Comportamento padrão do bot
    const botResponse: BotResponse = await responder(textToSend);

    if (botResponse.type === 'text') {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse.text,
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    } else if (botResponse.type === 'show_viatura_modal') {
      setSelectedViatura(botResponse.viatura);
    } else if (botResponse.type === 'form_entrada_oficina') {
      setShowEntradaForm(true);
    } else if (botResponse.type === 'form_saida_oficina') {
      setShowSaidaForm(true);
    }
  };

  const toggleRecording = () => {
    if (!browserSupportsSpeechRecognition) {
      alert('Reconhecimento de voz não suportado neste navegador.');
      return;
    }
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      // continuous: false para pausar automaticamente após falar
      SpeechRecognition.startListening({ continuous: false, language: 'pt-BR' });
    }
  };

  const handleFormSuccess = (message: string) => {
    const botMessage: Message = {
      id: Date.now().toString(),
      text: message,
      sender: 'bot',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, botMessage]);
  };

  const handleQuickAction = (action: string) => {
    setShowQuickButtons(false);
    const lower = action.toLowerCase();
    if (lower.includes('consultar os')) {
      setFlow({ active: true, type: 'os', stage: 'ask_matricula' });
      pushBot('Informe sua matrícula:');
      return;
    }
    if (lower.includes('consultar dados') || lower.includes('consultar viatura')) {
      setFlow({ active: true, type: 'vtr', stage: 'ask_matricula' });
      pushBot('Informe sua matrícula (Portal do Policial):');
      return;
    }
    if (lower.includes('avarias') || lower.includes('iniciar serviço')) {
      setFlow({ active: true, type: 'avarias', stage: 'ask_matricula' });
      pushBot('🔐 Acesso ao sistema de serviço e avarias. Informe sua matrícula:');
      return;
    }
    handleSendMessage(action);
  };

  const voltarAoMenuPrincipal = () => {
    setShowQuickButtons(true);
    const botMessage: Message = {
      id: Date.now().toString(),
      text: '🏠 Voltando ao menu principal. Como posso ajudá-lo?',
      sender: 'bot',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, botMessage]);
  };

  return (
    <>
      <div className="chat-container">
        <header className="chat-header">
          <h1>CAVBOT - Assistente da Cavalaria</h1>
          {!showQuickButtons && (
            <button
              onClick={voltarAoMenuPrincipal}
              className="menu-button"
              title="Voltar ao menu principal"
            >
              🏠 Menu
            </button>
          )}
        </header>

        <main className="chat-messages">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`message ${msg.sender === 'user' ? 'user-message' : 'bot-message'}`}
            >
              <p style={{ whiteSpace: 'pre-line' }}>{msg.text}</p>
              <span className="timestamp">{msg.timestamp.toLocaleTimeString('pt-BR')}</span>
            </div>
          ))}
          <div ref={messagesEndRef} />
          
          {/* Botões de ação rápida */}
          {showQuickButtons && (
            <div className="quick-actions">
              <div className="quick-actions-header">
                <span>🔧 Como posso ajudar?</span>
              </div>
              <div className="quick-buttons">
                <button 
                  className="quick-button"
                  onClick={() => handleQuickAction('consultar dados da CAV - 01')}
                >
                  📋 Consultar Viatura
                </button>
                <button 
                  className="quick-button"
                  onClick={() => handleQuickAction('registrar entrada')}
                >
                  🏭 Entrada Oficina
                </button>
                <button 
                  className="quick-button"
                  onClick={() => handleQuickAction('registrar saída')}
                >
                  🚗 Saída Oficina
                </button>
                <button 
                  className="quick-button"
                  onClick={() => handleQuickAction('viaturas na oficina')}
                >
                  📊 Status Oficina
                </button>
                <button 
                  className="quick-button"
                  onClick={() => handleQuickAction('buscar serviço bateria')}
                >
                  🔍 Buscar Serviços
                </button>
                <button 
                  className="quick-button"
                  onClick={() => handleQuickAction('consultar OS')}
                >
                  📄 Consultar OS
                </button>
                <button 
                  className="quick-button"
                  onClick={() => handleQuickAction('Avarias')}
                >
                  🚗 Iniciar Serviço
                </button>
                <button
                  className="quick-button"
                  onClick={async () => {
                    setShowEncerrarModal(true);
                    setEncerrarStep('list');
                    try {
                      const q = query(collection(db, 'servicosDiarios'), where('status','==','aberto'));
                      const snap = await getDocs(q);
                      const items: ServicoItem[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
                      
                      // Buscar Nome de Guerra 1 dos policiais
                      const uniqueMotoristaIds = Array.from(new Set(items.map(r => r.motoristaId).filter(Boolean)));
                      const nomeGuerraMap: Record<string, string> = {};
                      
                      await Promise.all(uniqueMotoristaIds.map(async (mid) => {
                        try {
                          const polRef = doc(db, 'policiais', mid!);
                          const polSnap = await getDoc(polRef);
                          if (polSnap.exists()) {
                            const polData: any = polSnap.data();
                            nomeGuerraMap[mid!] = polData.nomeGuerra1 || polData.NOME || 'Sem identificação';
                          }
                        } catch (e) {
                          console.error('Erro ao buscar policial:', e);
                        }
                      }));
                      
                      // Atualizar motorista com nome de guerra
                      const itemsAtualizados = items.map(r => ({
                        ...r,
                        motorista: r.motoristaId && nomeGuerraMap[r.motoristaId] ? nomeGuerraMap[r.motoristaId] : r.motorista
                      }));
                      
                      setServicosAbertos(itemsAtualizados);
                    } catch (e) {
                      pushBot('Erro ao carregar serviços abertos.');
                    }
                  }}
                >
                  ⏹️ Encerrar Serviço
                </button>
              </div>
            </div>
          )}

          {(flow.active && (flow.type === 'vtr' || flow.type === 'avarias') && flow.stage === 'ask_target') && (
            <div className="quick-actions">
              <div className="quick-actions-header">
                <span>Selecione a VTR</span>
              </div>


              {vtrStep === 'root' && (
                <div className="quick-buttons">
                  <button className="quick-button" onClick={loadPesadas}>🚚 Frota Pesada</button>
                  <button className="quick-button" onClick={goLeveCategoria}>🚗 Frota Leve</button>
                </div>
              )}

              {vtrStep === 'leve-categoria' && (
                <div className="quick-buttons">
                  <button className="quick-button" onClick={loadLevesOperacional}>🛡️ Operacional</button>
                  <button className="quick-button" onClick={loadLevesAdministrativa}>🏢 Administrativa</button>
                  <button className="quick-button" onClick={() => setVtrStep('root')}>⬅️ Voltar</button>
                </div>
              )}

              {(vtrStep === 'pesada' || vtrStep === 'leve-operacional' || vtrStep === 'leve-adm') && (
                <div>
                  <div className="quick-buttons" style={{ gridTemplateColumns: 'repeat(1, 1fr)' }}>
                    <button className="quick-button" onClick={() => setVtrStep(vtrStep === 'pesada' ? 'root' : 'leve-categoria')}>⬅️ Voltar</button>
                  </div>
                  {loadingVtrs ? (
                    <div className="quick-actions-header">Carregando...</div>
                  ) : (
                    <div className="quick-buttons" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                      {listaViaturas.map(v => (
                        <button key={v.id} className="quick-button" onClick={() => handleSelectViatura(v)}>
                          {v.CADASTRO || v.PLACA}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {flow.active && flow.type === 'avarias' && flow.stage === 'avarias_ui' && (
            <div className="quick-actions">
              <div className="quick-actions-header">
                <span>
                  Avarias - {avariasViatura?.CADASTRO || avariasViatura?.PLACA}
                  {servicoAberto ? ' • Serviço ABERTO' : ' • Sem serviço aberto'}
                </span>
              </div>

              {/* Ângulos de inspeção */}
              <div className="quick-buttons" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {([
                  { k: 'frontal', label: 'Frente' },
                  { k: 'traseira', label: 'Trás' },
                  { k: 'esquerdo', label: 'Esquerdo' },
                  { k: 'direito', label: 'Direito' },
                  { k: 'mecanico', label: 'Mecânica' },
                  { k: 'interno', label: 'Interno' },
                ] as any[]).map(a => (
                  <button
                    key={a.k}
                    className="quick-button"
                    onClick={() => { setAvariasAngulo(a.k); setPosicaoTemporaria(null); setMarcandoAvaria(false); }}
                    style={avariasAngulo === a.k ? { borderColor: '#60a5fa', background: '#4b5563' } : undefined}
                  >
                    {a.label}
                  </button>
                ))}
              </div>

              {/* Imagem do ângulo com marcações */}
              {(['frontal','traseira','esquerdo','direito'] as const).includes(avariasAngulo as any) && getImagemAngulo() && (
                <div style={{ position: 'relative', width: '100%', marginTop: '0.75rem', border: '1px solid #374151', borderRadius: 8, overflow: 'hidden', background: '#0b1020' }}>
                  <img
                    ref={imagemRef}
                    src={getImagemAngulo()}
                    alt={`Imagem ${avariasAngulo} da viatura`}
                    onClick={handleImageClick}
                    style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair', opacity: 1 }}
                    loading="lazy"
                  />
                  {avariasLista.filter((a: any) => a.angulo === avariasAngulo).map((a: any) => (
                    <span
                      key={a.id}
                      title={`${a.tipo} • ${a.gravidade}${a.descricao ? ' • ' + a.descricao : ''}`}
                      onClick={() => { setAvariaSelecionada(a); setShowAvariaDetalhe(true); }}
                      style={{
                        position: 'absolute',
                        left: `${((a.x ?? 0) > 1 ? (a.x ?? 0) : (a.x ?? 0) * 100)}%`,
                        top: `${((a.y ?? 0) > 1 ? (a.y ?? 0) : (a.y ?? 0) * 100)}%`,
                        width: 14,
                        height: 14,
                        background: '#ef4444',
                        borderRadius: '50%',
                        border: '2px solid #fff',
                        transform: 'translate(-50%, -50%)',
                        boxShadow: '0 0 0 2px rgba(239,68,68,0.35)',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                  {/* Marcação temporária */}
                  {posicaoTemporaria && (
                    <span
                      style={{
                        position: 'absolute',
                        left: `${posicaoTemporaria.x * 100}%`,
                        top: `${posicaoTemporaria.y * 100}%`,
                        width: 14,
                        height: 14,
                        background: '#f59e0b',
                        borderRadius: '50%',
                        border: '2px solid #fff',
                        transform: 'translate(-50%, -50%)',
                        boxShadow: '0 0 0 2px rgba(245,158,11,0.35)',
                      }}
                    />
                  )}
                </div>
              )}

              {(['frontal','traseira','esquerdo','direito'] as const).includes(avariasAngulo as any) && !getImagemAngulo() && (
                <div className="quick-actions-header" style={{ marginTop: '0.75rem' }}>
                  Imagem do ângulo "{avariasAngulo}" não configurada para esta viatura.
                </div>
              )}

              {/* Ações de serviço */}
              <div className="quick-buttons" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginTop: '0.75rem' }}>
                {!servicoAberto ? (
                  <button
                    className="quick-button"
                    onClick={() => { setServicoDraft(prev => ({ ...prev, motorista: policialLogado?.NOME || 'Motorista' })); setFlow(prev => ({ ...prev, stage: 'service_start_km' })); pushBot('Informe o KM inicial:'); }}
                  >
                    ▶️ Iniciar Serviço
                  </button>
                ) : (
                  <div className="quick-actions-header" style={{ textAlign: 'center', padding: '0.75rem 1rem' }}>
                    Serviço em andamento
                  </div>
                )}
                <button
                  className="quick-button"
                  onClick={() => { setFlow(prev => ({ ...prev, stage: 'ask_target' })); startVtrSelection(); pushBot('Trocar VTR: escolha a frota.'); }}
                >
                  🚘 Trocar VTR
                </button>
              </div>

              {/* Registrar nova avaria */}
              <div className="quick-buttons" style={{ gridTemplateColumns: 'repeat(1, 1fr)', marginTop: '0.75rem' }}>
                <button
                  className="quick-button"
                  onClick={() => {
                    const isAnguloComImagem = (['frontal','traseira','esquerdo','direito'] as const).includes(avariasAngulo as any) && !!getImagemAngulo();
                    if (isAnguloComImagem) {
                      pushBot('Clique na imagem para marcar a posição e abrir o formulário da avaria.');
                    } else {
                      setPosicaoTemporaria(null);
                      setModalTipo('');
                      setModalDesc('');
                      setModalGravidade('LEVE');
                      setShowAvariaModal(true);
                    }
                  }}
                >
                  ➕ Registrar Avaria no ângulo {avariasAngulo}
                </button>
              </div>

              {/* Lista de avarias do ângulo */}
              <div style={{ marginTop: '0.75rem' }}>
                <div className="quick-actions-header" style={{ marginBottom: '0.5rem' }}>
                  Avarias neste ângulo
                </div>
                <div className="quick-buttons" style={{ gridTemplateColumns: 'repeat(1, 1fr)' }}>
                  {avariasLista.filter((a: any) => a.angulo === avariasAngulo).length === 0 ? (
                    <div className="quick-actions-header">Nenhuma avaria registrada.</div>
                  ) : (
                    avariasLista.filter((a: any) => a.angulo === avariasAngulo).map((a: any) => (
                      <div key={a.id} className="quick-button" style={{ justifyContent: 'space-between' }}>
                        <div>
                          <strong>{a.tipo}</strong> — {a.gravidade}
                          {a.descricao ? ` • ${a.descricao}` : ''}
                        </div>
                        <small style={{ color: '#9ca3af' }}>{new Date(a.data).toLocaleDateString('pt-BR')}</small>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </main>

        <footer className="chat-input-area">
          {!showQuickButtons && (
            <button
              onClick={voltarAoMenuPrincipal}
              className="menu-button-footer"
              title="Menu principal"
            >
              🏠
            </button>
          )}
          
          <button
            type="button"
            className={`mic-button ${listening ? 'recording' : ''}`}
            onClick={toggleRecording}
            title={listening ? 'Parar gravação' : 'Gravar mensagem de voz'}
          >
            {listening ? <MicOff size={24} /> : <Mic size={24} />}
          </button>

          <input
            type="text"
            placeholder="Digite sua mensagem..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            // Linha 'disabled={listening}' removida daqui
            autoComplete="off"
          />

          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || listening}
            className="send-button"
            aria-label="Enviar mensagem"
          >
            <Send size={24} />
          </button>
        </footer>
      </div>

      {selectedViatura && (
        <ViaturaModal
          viatura={selectedViatura}
          onClose={() => setSelectedViatura(null)}
        />
      )}

      {showEntradaForm && (
        <FormEntradaOficina
          onClose={() => setShowEntradaForm(false)}
          onSuccess={handleFormSuccess}
        />
      )}

      {showSaidaForm && (
        <FormSaidaOficina
          onClose={() => setShowSaidaForm(false)}
          onSuccess={handleFormSuccess}
        />
      )}

      {showChecklist && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: 12, padding: '1rem', width: 'min(600px, 94vw)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="quick-actions-header" style={{ marginBottom: '0.75rem' }}>Checklist de Verificação - {checklistStep + 1}/9</div>
            
            {checklistStep === 0 && (
              <div>
                <p style={{ color: '#e5e7eb', marginBottom: 12 }}>Óleo do Motor:</p>
                <div className="quick-buttons">
                  <button className="quick-button" onClick={() => { setChecklistDraft({ ...checklistDraft, oleoMotor: 'abaixo' }); setChecklistStep(1); }}>Abaixo do Nível</button>
                  <button className="quick-button" onClick={() => { setChecklistDraft({ ...checklistDraft, oleoMotor: 'nivel' }); setChecklistStep(1); }}>No Nível</button>
                  <button className="quick-button" onClick={() => { setChecklistDraft({ ...checklistDraft, oleoMotor: 'acima' }); setChecklistStep(1); }}>Acima do Nível</button>
                </div>
              </div>
            )}
            
            {checklistStep === 1 && (
              <div>
                <p style={{ color: '#e5e7eb', marginBottom: 12 }}>Água do Radiador:</p>
                <div className="quick-buttons">
                  <button className="quick-button" onClick={() => { setChecklistDraft({ ...checklistDraft, aguaRadiador: 'abaixo' }); setChecklistStep(2); }}>Abaixo do Nível</button>
                  <button className="quick-button" onClick={() => { setChecklistDraft({ ...checklistDraft, aguaRadiador: 'nivel' }); setChecklistStep(2); }}>No Nível</button>
                  <button className="quick-button" onClick={() => { setChecklistDraft({ ...checklistDraft, aguaRadiador: 'acima' }); setChecklistStep(2); }}>Acima do Nível</button>
                </div>
              </div>
            )}
            
            {checklistStep === 2 && (
              <div>
                <p style={{ color: '#e5e7eb', marginBottom: 12 }}>Step:</p>
                <div className="quick-buttons">
                  <button className="quick-button" onClick={() => { setChecklistDraft({ ...checklistDraft, step: 'possui' }); setChecklistStep(3); }}>Possui</button>
                  <button className="quick-button" onClick={() => { setChecklistDraft({ ...checklistDraft, step: 'nao_possui' }); setChecklistStep(3); }}>Não Possui</button>
                </div>
              </div>
            )}
            
            {checklistStep === 3 && (
              <div>
                <p style={{ color: '#e5e7eb', marginBottom: 12 }}>Macaco:</p>
                <div className="quick-buttons">
                  <button className="quick-button" onClick={() => { setChecklistDraft({ ...checklistDraft, macaco: 'possui' }); setChecklistStep(4); }}>Possui</button>
                  <button className="quick-button" onClick={() => { setChecklistDraft({ ...checklistDraft, macaco: 'nao_possui' }); setChecklistStep(4); }}>Não Possui</button>
                </div>
              </div>
            )}
            
            {checklistStep === 4 && (
              <div>
                <p style={{ color: '#e5e7eb', marginBottom: 12 }}>Chave de Roda:</p>
                <div className="quick-buttons">
                  <button className="quick-button" onClick={() => { setChecklistDraft({ ...checklistDraft, chaveRoda: 'possui' }); setChecklistStep(5); }}>Possui</button>
                  <button className="quick-button" onClick={() => { setChecklistDraft({ ...checklistDraft, chaveRoda: 'nao_possui' }); setChecklistStep(5); }}>Não Possui</button>
                </div>
              </div>
            )}
            
            {checklistStep === 5 && (
              <div>
                <p style={{ color: '#e5e7eb', marginBottom: 12 }}>Triângulo:</p>
                <div className="quick-buttons">
                  <button className="quick-button" onClick={() => { setChecklistDraft({ ...checklistDraft, triangulo: 'possui' }); setChecklistStep(6); }}>Possui</button>
                  <button className="quick-button" onClick={() => { setChecklistDraft({ ...checklistDraft, triangulo: 'nao_possui' }); setChecklistStep(6); }}>Não Possui</button>
                </div>
              </div>
            )}
            
            {checklistStep === 6 && (
              <div>
                <p style={{ color: '#e5e7eb', marginBottom: 12 }}>Smartphone - Estado:</p>
                <div className="quick-buttons">
                  <button className="quick-button" onClick={() => { setChecklistDraft({ ...checklistDraft, smartphone: { ...(checklistDraft.smartphone || { conexao: 'com_conexao' }), estado: 'avariado' } }); setChecklistStep(7); }}>Avariado</button>
                  <button className="quick-button" onClick={() => { setChecklistDraft({ ...checklistDraft, smartphone: { ...(checklistDraft.smartphone || { conexao: 'com_conexao' }), estado: 'bom' } }); setChecklistStep(7); }}>Bom</button>
                  <button className="quick-button" onClick={() => { setChecklistDraft({ ...checklistDraft, smartphone: { ...(checklistDraft.smartphone || { conexao: 'com_conexao' }), estado: 'otimo' } }); setChecklistStep(7); }}>Ótimo</button>
                </div>
              </div>
            )}
            
            {checklistStep === 7 && (
              <div>
                <p style={{ color: '#e5e7eb', marginBottom: 12 }}>Smartphone - Conexão:</p>
                <div className="quick-buttons">
                  <button className="quick-button" onClick={() => { setChecklistDraft({ ...checklistDraft, smartphone: { ...(checklistDraft.smartphone || { estado: 'bom' }), conexao: 'com_conexao' } }); setChecklistStep(8); }}>Com Conexão</button>
                  <button className="quick-button" onClick={() => { setChecklistDraft({ ...checklistDraft, smartphone: { ...(checklistDraft.smartphone || { estado: 'bom' }), conexao: 'sem_conexao' } }); setChecklistStep(8); }}>Sem Conexão</button>
                </div>
              </div>
            )}
            
            {checklistStep === 8 && (
              <div>
                <p style={{ color: '#e5e7eb', marginBottom: 12 }}>Rádio Fixo:</p>
                <div className="quick-buttons">
                  <button className="quick-button" onClick={() => { setChecklistDraft({ ...checklistDraft, radioFixo: 'com_sinal' }); setChecklistStep(9); }}>Com Sinal</button>
                  <button className="quick-button" onClick={() => { setChecklistDraft({ ...checklistDraft, radioFixo: 'sem_sinal' }); setChecklistStep(9); }}>Sem Sinal</button>
                </div>
              </div>
            )}
            
            {checklistStep === 9 && (
              <div>
                <p style={{ color: '#e5e7eb', marginBottom: 12 }}>Cartão de Abastecimento:</p>
                <div className="quick-buttons">
                  <button className="quick-button" onClick={() => { setChecklistDraft({ ...checklistDraft, cartaoAbastecimento: 'possui' }); salvarChecklist(); }}>Possui</button>
                  <button className="quick-button" onClick={() => { setChecklistDraft({ ...checklistDraft, cartaoAbastecimento: 'nao_possui' }); salvarChecklist(); }}>Não Possui</button>
                </div>
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
              <button className="quick-button" onClick={() => { if (checklistStep > 0) setChecklistStep(checklistStep - 1); }}>Voltar</button>
              <button className="quick-button" onClick={() => { setShowChecklist(false); setChecklistDraft({}); setChecklistStep(0); }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {showAvariaDetalhe && avariaSelecionada && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: 12, padding: '1rem', width: 'min(520px, 92vw)' }}>
            <div className="quick-actions-header" style={{ marginBottom: '0.75rem' }}>Detalhes da avaria</div>
            <div style={{ color: '#e5e7eb', display: 'grid', gap: 8 }}>
              <div><strong>Tipo:</strong> {avariaSelecionada.tipo}</div>
              <div><strong>Gravidade:</strong> {avariaSelecionada.gravidade}</div>
              {avariaSelecionada.descricao && (<div><strong>Descrição:</strong> {avariaSelecionada.descricao}</div>)}
              <div><strong>Ângulo:</strong> {avariaSelecionada.angulo}</div>
              <div><strong>Responsável:</strong> {avariaSelecionada.responsavel}</div>
              <div><strong>Data:</strong> {new Date(avariaSelecionada.data).toLocaleString('pt-BR')}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button className="quick-button" onClick={() => { setShowAvariaDetalhe(false); setAvariaSelecionada(null); }}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {showEncerrarModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: 12, padding: '1rem', width: 'min(600px, 94vw)' }}>
            <div className="quick-actions-header" style={{ marginBottom: '0.75rem' }}>Encerrar Serviço</div>

            {encerrarStep === 'list' && (
              <div className="quick-buttons" style={{ gridTemplateColumns: 'repeat(1, 1fr)' }}>
                {servicosAbertos.length === 0 ? (
                  <div className="quick-actions-header">Não há serviços abertos.</div>
                ) : (
                  servicosAbertos.map(s => (
                    <button key={s.id} className="quick-button" onClick={() => { setServicoSelecionado(s); setEncerrarStep('senha'); setEncerrarMsg(''); }}>
                      {s.cadastro || s.placa} • Motorista: {s.motorista || '-'} • KM inicial: {s.kmInicial ?? '-'}
                    </button>
                  ))
                )}
              </div>
            )}

            {encerrarStep === 'senha' && servicoSelecionado && (
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ color: '#9ca3af' }}>Informe a senha do motorista ({servicoSelecionado.motorista || 'motorista'})</div>
                <input type="password" value={senhaMotorista} onChange={e => setSenhaMotorista(e.target.value)} placeholder="Senha" style={{ width: '100%', background: '#1f2937', color: '#f9fafb', border: '1px solid #374151', borderRadius: 8, padding: '0.5rem 0.75rem' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <button className="quick-button" onClick={() => { setEncerrarStep('list'); setServicoSelecionado(null); setSenhaMotorista(''); }}>{'⬅️ Voltar'}</button>
                  <button className="quick-button" onClick={async () => {
                    try {
                      if (!servicoSelecionado?.motoristaId) { setEncerrarMsg('Motorista não identificado.'); return; }
                      const polRef = doc(db, 'policiais', servicoSelecionado.motoristaId);
                      const polSnap = await getDoc(polRef);
                      if (!polSnap.exists()) { setEncerrarMsg('Motorista não encontrado.'); return; }
                      const data: any = polSnap.data();
                      const primeiroAcesso = data.primeiroAcesso !== false || !data.senha;
                      const senhaOk = primeiroAcesso ? senhaMotorista === String(data.Matrícula) : data.senha === senhaMotorista;
                      if (!senhaOk) { setEncerrarMsg('Senha incorreta.'); return; }
                      setPolicialEncerrar({ id: polSnap.id, NOME: data.NOME, nomeGuerra1: data['NOME DE GUERRA1'] || data['NOME DE GUERRA'] || data.NOME });
                      setEncerrarStep('km');
                      setEncerrarMsg('');
                    } catch (e) {
                      setEncerrarMsg('Erro ao validar senha.');
                    }
                  }}>Validar</button>
                </div>
                {encerrarMsg && <div style={{ color: '#fca5a5' }}>{encerrarMsg}</div>}
              </div>
            )}

            {encerrarStep === 'km' && servicoSelecionado && (
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ color: '#9ca3af' }}>Informe o KM final da VTR ({servicoSelecionado.cadastro || servicoSelecionado.placa})</div>
                <input inputMode="numeric" value={kmFinalInput} onChange={e => setKmFinalInput(e.target.value)} placeholder="KM final" style={{ width: '100%', background: '#1f2937', color: '#f9fafb', border: '1px solid #374151', borderRadius: 8, padding: '0.5rem 0.75rem' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <button className="quick-button" onClick={() => { setEncerrarStep('senha'); }}>{'⬅️ Voltar'}</button>
                  <button className="quick-button" onClick={async () => {
                    const kmf = parseInt(kmFinalInput.replace(/\D/g,'') || '');
                    if (isNaN(kmf)) { setEncerrarMsg('KM inválido.'); return; }
                    try {
                      // Atualizar serviço
                      await updateDoc(doc(db, 'servicosDiarios', servicoSelecionado.id), {
                        kmFinal: kmf,
                        status: 'encerrado',
                        encerradoEm: new Date().toISOString(),
                        encerradoPorId: policialEncerrar?.id || null,
                        encerradoPorNome: policialEncerrar?.NOME || null,
                        encerradoPorNomeGuerra1: policialEncerrar?.nomeGuerra1 || null,
                      });
                      // Atualizar KM da frota
                      if (servicoSelecionado.viaturaId) {
                        await updateDoc(doc(db, 'frota', servicoSelecionado.viaturaId), { KM: kmf });
                      }
                      setEncerrarMsg('✅ Serviço encerrado com sucesso.');
                      setTimeout(() => {
                        setShowEncerrarModal(false);
                        setEncerrarStep('list');
                        setServicoSelecionado(null);
                        setServicosAbertos([]);
                        setSenhaMotorista('');
                        setKmFinalInput('');
                        setEncerrarMsg('');
                      }, 1000);
                    } catch (e) {
                      setEncerrarMsg('Erro ao encerrar serviço.');
                    }
                  }}>Encerrar</button>
                </div>
                {encerrarMsg && <div style={{ color: encerrarMsg.startsWith('✅') ? '#86efac' : '#fca5a5' }}>{encerrarMsg}</div>}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button className="quick-button" onClick={() => setShowEncerrarModal(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {showAvariaModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: 12, padding: '1rem', width: 'min(520px, 92vw)' }}>
            <div className="quick-actions-header" style={{ marginBottom: '0.75rem' }}>Registrar avaria ({avariasAngulo})</div>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>Tipo</label>
                <input value={modalTipo} onChange={e => setModalTipo(e.target.value)} placeholder="Ex: Amassado, Risco" style={{ width: '100%', background: '#1f2937', color: '#f9fafb', border: '1px solid #374151', borderRadius: 8, padding: '0.5rem 0.75rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>Descrição (opcional)</label>
                <textarea value={modalDesc} onChange={e => setModalDesc(e.target.value)} rows={3} placeholder="Detalhes da avaria" style={{ width: '100%', background: '#1f2937', color: '#f9fafb', border: '1px solid #374151', borderRadius: 8, padding: '0.5rem 0.75rem', resize: 'vertical' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>Gravidade</label>
                <select value={modalGravidade} onChange={e => setModalGravidade(e.target.value as any)} style={{ width: '100%', background: '#1f2937', color: '#f9fafb', border: '1px solid #374151', borderRadius: 8, padding: '0.5rem 0.75rem' }}>
                  <option value="LEVE">LEVE</option>
                  <option value="MODERADA">MODERADA</option>
                  <option value="GRAVE">GRAVE</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="quick-button" onClick={() => { setShowAvariaModal(false); setPosicaoTemporaria(null); }}>
                  Cancelar
                </button>
                <button className="quick-button" onClick={async () => {
                  if (!modalTipo.trim()) { pushBot('Informe o tipo da avaria.'); return; }
                  
                  // Passar dados diretamente, não usar setAvariaDraft
                  await salvarAvaria({
                    tipo: modalTipo.trim(),
                    descricao: modalDesc.trim(),
                    gravidade: modalGravidade,
                    posicao: posicaoTemporaria
                  });
                  
                  // Limpar campos
                  setModalTipo('');
                  setModalDesc('');
                  setModalGravidade('LEVE');
                  setShowAvariaModal(false);
                }}>
                  Registrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTrocarSenha && policialLogado && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
          <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: 12, padding: '1rem', width: 'min(520px, 92vw)' }}>
            <div className="quick-actions-header" style={{ marginBottom: '0.75rem' }}>Definir nova senha</div>
            <div style={{ color: '#9ca3af', marginBottom: 8 }}>Por segurança, defina uma nova senha diferente da sua matrícula.</div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>Nova senha</label>
                <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="Nova senha" style={{ width: '100%', background: '#1f2937', color: '#f9fafb', border: '1px solid #374151', borderRadius: 8, padding: '0.5rem 0.75rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>Confirmar senha</label>
                <input type="password" value={confirmNovaSenha} onChange={e => setConfirmNovaSenha(e.target.value)} placeholder="Confirmar senha" style={{ width: '100%', background: '#1f2937', color: '#f9fafb', border: '1px solid #374151', borderRadius: 8, padding: '0.5rem 0.75rem' }} />
              </div>
              {trocarSenhaMsg && <div style={{ color: trocarSenhaMsg.startsWith('✅') ? '#86efac' : '#fca5a5' }}>{trocarSenhaMsg}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="quick-button" onClick={() => { setShowTrocarSenha(false); setNovaSenha(''); setConfirmNovaSenha(''); setTrocarSenhaMsg(''); }}>Cancelar</button>
                <button className="quick-button" onClick={async () => {
                  const matStr = String(policialLogado?.Matrícula || '');
                  if (novaSenha.length < 6) { setTrocarSenhaMsg('A senha deve ter pelo menos 6 caracteres.'); return; }
                  if (novaSenha !== confirmNovaSenha) { setTrocarSenhaMsg('As senhas não conferem.'); return; }
                  if (novaSenha === matStr) { setTrocarSenhaMsg('A nova senha não pode ser igual à matrícula.'); return; }
                  try {
                    await updateDoc(doc(db, 'policiais', policialLogado!.id), { senha: novaSenha, primeiroAcesso: false });
                    setTrocarSenhaMsg('✅ Senha atualizada com sucesso.');
                    pushBot('🔒 Senha atualizada com sucesso.');
                    setTimeout(() => { setShowTrocarSenha(false); setNovaSenha(''); setConfirmNovaSenha(''); setTrocarSenhaMsg(''); }, 800);
                  } catch (e) {
                    setTrocarSenhaMsg('Erro ao atualizar a senha.');
                  }
                }}>Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .chat-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          height: 100dvh; /* Dynamic viewport height for mobile */
          max-height: 100vh;
          max-height: 100dvh;
          width: 100%;
          max-width: 100vw;
          background: #1f2937;
          color: #f9fafb;
          font-family: 'Roboto', sans-serif;
          overflow: hidden;
          position: relative;
        }

        @media (min-width: 640px) {
          .chat-container {
            max-width: 600px;
            margin: 0 auto;
            border-radius: 10px;
            box-shadow: 0 0 15px rgba(0,0,0,0.5);
          }
        }

        .chat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: #111827;
          font-weight: 700;
          font-size: 1.1rem;
          text-align: center;
          border-bottom: 1px solid #374151;
          flex-shrink: 0;
        }

        .chat-header h1 {
          flex: 1;
          margin: 0;
        }

        .menu-button {
          background: #374151;
          border: 1px solid #4b5563;
          color: #d1d5db;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .menu-button:hover {
          background: #4b5563;
          color: #f3f4f6;
        }

        .menu-button-footer {
          background: #374151;
          border: 1px solid #4b5563;
          color: #d1d5db;
          padding: 0.5rem;
          border-radius: 50%;
          font-size: 1.2rem;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 44px;
          min-height: 44px;
        }

        .menu-button-footer:hover {
          background: #4b5563;
          color: #f3f4f6;
        }

        .chat-messages {
          flex: 1;
          padding: 1rem;
          overflow-y: auto;
          overflow-x: hidden;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          scrollbar-width: thin;
          scrollbar-color: #4b5563 transparent;
          min-height: 0; /* Important for flex child to shrink */
        }
        
        .chat-messages::-webkit-scrollbar {
          width: 6px;
        }
        
        .chat-messages::-webkit-scrollbar-thumb {
          background-color: #4b5563;
          border-radius: 3px;
        }

        .message {
          max-width: 85%;
          padding: 0.75rem 1rem;
          border-radius: 16px;
          position: relative;
          word-wrap: break-word;
          word-break: break-word;
          font-size: 0.95rem;
          line-height: 1.4;
          animation: fade-in 0.3s ease-out;
        }
        .user-message {
          align-self: flex-end;
          background: #3b82f6;
          color: white;
          border-bottom-right-radius: 4px;
        }
        
        .bot-message {
          align-self: flex-start;
          background: #374151;
          border: 1px solid #4b5563;
          color: #d1d5db;
          border-bottom-left-radius: 4px;
        }

        .timestamp {
          font-size: 0.7rem;
          color: #9ca3af;
          margin-top: 4px;
          display: block;
          user-select: none;
        }

        .chat-input-area {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: #111827;
          border-top: 1px solid #374151;
          flex-shrink: 0;
        }

        input[type="text"] {
          flex: 1;
          padding: 0.6rem 1rem;
          font-size: 1rem;
          border-radius: 9999px;
          border: none;
          outline: none;
          background: #374151;
          color: #f9fafb;
          transition: background-color 0.3s;
        }
        input[type="text"]:focus {
          background: #4b5563;
        }

        button {
          border: none;
          background: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.25rem;
          color: #60a5fa;
          transition: color 0.3s;
          border-radius: 50%;
        }
        button:hover:not(:disabled) {
          color: #2563eb;
        }
        button:disabled {
          color: #9ca3af;
          cursor: not-allowed;
        }

        .mic-button.recording {
          color: #dc2626;
          animation: pulse 1s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .send-button {
          background: #3b82f6;
          padding: 0.5rem;
          border-radius: 50%;
          color: white;
          box-shadow: 0 2px 8px rgb(59 130 246 / 0.5);
        }
        .send-button:hover:not(:disabled) {
          background: #2563eb;
          box-shadow: 0 4px 12px rgb(37 99 235 / 0.75);
        }

        @media (max-width: 600px) {
          .chat-container {
            max-width: 100vw;
            border-radius: 0;
          }

          .message {
            max-width: 90%;
            font-size: 1.1rem;
          }
        }

        .quick-actions {
          margin: 1rem 0;
          padding: 1rem;
          background: #111827;
          border-radius: 12px;
          border: 1px solid #374151;
          animation: fade-in 0.5s ease-out;
        }

        .quick-actions-header {
          text-align: center;
          color: #f3f4f6;
          font-weight: 600;
          margin-bottom: 1rem;
          font-size: 1rem;
        }

        .quick-buttons {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }

        .quick-button {
          background: #374151;
          border: 1px solid #4b5563;
          color: #d1d5db;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 500;
          text-align: left;
          transition: all 0.3s ease;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .quick-button:hover {
          background: #4b5563;
          border-color: #60a5fa;
          color: #f3f4f6;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }

        @media (max-width: 640px) {
          .chat-container {
            height: 100vh;
            height: 100dvh;
            border-radius: 0;
            box-shadow: none;
          }

          .chat-header {
            padding: 0.75rem 1rem;
            font-size: 1rem;
          }

          .chat-header h1 {
            font-size: 1rem;
          }

          .menu-button {
            padding: 0.4rem 0.8rem;
            font-size: 0.8rem;
          }

          .quick-buttons {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }
          
          .quick-button {
            font-size: 0.95rem;
            padding: 1rem;
            text-align: center;
          }

          .message {
            max-width: 90%;
            font-size: 0.95rem;
            padding: 0.6rem 0.8rem;
          }

          .chat-input-area {
            padding: 0.6rem 0.8rem;
          }

          input[type="text"] {
            font-size: 1rem;
            padding: 0.7rem 1rem;
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
};

export default CAVBot;