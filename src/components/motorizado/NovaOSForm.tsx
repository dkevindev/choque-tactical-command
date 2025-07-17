import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, serverTimestamp, Timestamp, FieldValue, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

interface Viatura {
  id: string;
  CADASTRO: string;
  MODELO: string;
  [key: string]: any;
}

interface Oficina {
  id: string;
  nome: string;
  nomeFantasia: string;
}

interface Policial {
  id: string;
  AGÊNCIA?: number;
  BANCO?: string;
  Bairro?: string;
  CONTA?: string;
  CPF?: string;
  'DATA ATUAL'?: number;
  'E-MAIL'?: string;
  Endereço?: string;
  FUNÇÃO?: string;
  IDADE?: number;
  Matrícula?: string;
  'MÊS ANIVERSARIO'?: number;
  NASCIMENTO?: number;
  NOME: string;
  'NOME DE GUERRA'?: string;
  'NOME DE GUERRA1'?: string;
  ORD?: number;
  'PREVISAO FÉRIAS - AQUISITIVO 2024'?: string;
  'Post/Grad': string; // CORREÇÃO: Mudado de PATENTE para 'Post/Grad'
  'SITUAÇÃO': string;
  'ULTIMA PROMOÇÃO'?: number;
  UNIDADE?: string;
  __EMPTY?: number;
  'e-mail institucional'?: string;
  telefone?: number;
  [key: string]: any;
}

// INTERFACE ATUALIZADA: OrdemServico - Definindo a estrutura para salvar no Firestore e enviar para a Cloud Function
interface OrdemServico {
  cadastroViatura: string;
  modeloViatura: string;
  dataOS: string; // Formato YYYY-MM-DD
  defeitoRelatado: string;
  oficinaResponsavel: string;
  numeroOficina: string;
  numeroOS: string;
  observacao: string;
  valorOS: string;
  placaViatura?: string; // Adicionado, pode ser opcional se não tiver campo no form
  assinatura?: { // Assinatura agora é um objeto aninhado
    policial: {
      NOME: string;
      'Post/Grad': string; // CORREÇÃO: Mudado de PATENTE para 'Post/Grad'
      CPF?: string;
      Matrícula?: string;
      'NOME DE GUERRA1'?: string;
      AGÊNCIA?: number;
      BANCO?: string;
      CONTA?: string;
    };
    funcao: string;
  };
  dataCriacao?: Timestamp | FieldValue; // Permite FieldValue antes de ser salvo e Timestamp depois
}

interface NovaOSFormProps {
  onBack: () => void;
  prefilledData?: {
    cadastro?: string;
    servico?: string;
  };
}

interface ViaturaPendente {
  id: string;
  cadastro: string;
  servicoRealizar: string;
  dataEntrada: string;
  oficinaId: string;
}

const NovaOSForm = ({ onBack, prefilledData }: NovaOSFormProps) => {
  const [formData, setFormData] = useState({
    cadastro: '',
    modelo: '',
    dataOS: '',
    defeito: '',
    oficina: '',
    numeroOficina: '',
    numeroOS: '',
    observacao: '',
    valorOS: '',
  });

  const [sugestoes, setSugestoes] = useState<Viatura[]>([]);
  const [showSugestoes, setShowSugestoes] = useState(false);

  const [oficinas, setOficinas] = useState<Oficina[]>([]);

  const [buscaOficina, setBuscaOficina] = useState('');
  const [sugestoesOficina, setSugestoesOficina] = useState<Oficina[]>([]);
  const [oficinaSelecionada, setOficinaSelecionada] = useState<string>('');

  const [modalCadastrarAberto, setModalCadastrarAberto] = useState(false);
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false);
  const [novaOficina, setNovaOficina] = useState({ nome: '', nomeFantasia: '' });

  const [modalAssinarAberto, setModalAssinarAberto] = useState(false);
  const [policiaisOficiais, setPoliciaisOficiais] = useState<Policial[]>([]);
  const [assinaturaSelecionada, setAssinaturaSelecionada] = useState<{ policial: Policial | null; funcao: string | null }>({
    policial: null,
    funcao: null,
  });

  const [viaturasPendentes, setViaturasPendentes] = useState<ViaturaPendente[]>([]);
  const [viaturasSelecionadas, setViaturasSelecionadas] = useState<string[]>([]);

  const funcoesAssinatura = [
    'Comandante do RPMON',
    'Subcomandante do RPMONT',
    'Respondendo pelo Comando do RPMONT',
    'Chefe do P1',
    'Chefe do P3',
    'Chefe do P4',
    'Chefe do P6',
    'Comandante do 1ºEsq/RPMONT',
    'Comandante do 2ºEsq/RPMONT',
    'Comandante do 3ªPel/2ªEsq/RPMONT',
  ];

  useEffect(() => {
    const fetchOficinas = async () => {
      const snapshot = await getDocs(collection(db, 'oficinas'));
      const lista = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Oficina)
      }));
      setOficinas(lista);
    };
    fetchOficinas();

    // Buscar viaturas com OS pendente
    const fetchViaturasPendentes = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'oficina'));
        const pendentes = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as any))
          .filter(item => item.status === 'os-pendente')
          .map(item => ({
            id: item.id,
            cadastro: item.cadastro,
            servicoRealizar: item.servicoRealizar || item.observacaoServico || '',
            dataEntrada: item.dataEntrada,
            oficinaId: item.oficinaId
          }));
        setViaturasPendentes(pendentes);
      } catch (error) {
        console.error('Erro ao buscar viaturas pendentes:', error);
      }
    };
    fetchViaturasPendentes();

    // Preencher dados se fornecidos
    if (prefilledData?.cadastro) {
      setFormData(prev => ({
        ...prev,
        cadastro: prefilledData.cadastro,
        defeito: prefilledData.servico || ''
      }));
    }
  }, [prefilledData]);

  useEffect(() => {
    const fetchPoliciaisOficiais = async () => {
      const snapshot = await getDocs(collection(db, 'policiais'));
      let oficiais = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Policial))
        .filter(policial => {
          const situacaoNormalizada = policial['SITUAÇÃO']
            ? String(policial['SITUAÇÃO']).replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '').trim().toUpperCase()
            : '';
          return situacaoNormalizada === 'OFICIAL';
        });

      oficiais.sort((a, b) => {
        // CORREÇÃO: Mudado de a.PATENTE para a['Post/Grad']
        const patenteA = a['Post/Grad'] ? String(a['Post/Grad']).toUpperCase() : '';
        const patenteB = b['Post/Grad'] ? String(b['Post/Grad']).toUpperCase() : '';

        if (patenteA === 'TENCEL' && patenteB !== 'TENCEL') return -1;
        if (patenteA !== 'TENCEL' && patenteB === 'TENCEL') return 1;

        if (patenteA === 'CAP' && patenteB !== 'CAP') return -1;
        if (patenteA !== 'CAP' && patenteB === 'CAP') return 1;

        const nomeA = a.NOME ? String(a.NOME).toUpperCase() : '';
        const nomeB = b.NOME ? String(b.NOME).toUpperCase() : '';
        return nomeA.localeCompare(nomeB);
      });

      setPoliciaisOficiais(oficiais);
    };
    fetchPoliciaisOficiais();
  }, []);

  useEffect(() => {
    const buscarViaturas = async () => {
      if (formData.cadastro.trim().length < 2) {
        setSugestoes([]);
        return;
      }
      const snapshot = await getDocs(collection(db, 'frota'));
      const resultados = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((viatura: any) =>
          typeof viatura.CADASTRO === 'string' &&
          viatura.CADASTRO.toLowerCase().includes(formData.cadastro.toLowerCase())
        );
      setSugestoes(resultados as Viatura[]);
      setShowSugestoes(true);
    };
    buscarViaturas();
  }, [formData.cadastro]);

  useEffect(() => {
    if (buscaOficina.trim().length < 1) {
      setSugestoesOficina([]);
      return;
    }
    const filtro = buscaOficina.toLowerCase();
    const filtradas = oficinas.filter(o =>
      o.nome.toLowerCase().includes(filtro) ||
      o.nomeFantasia.toLowerCase().includes(filtro)
    );
    setSugestoesOficina(filtradas);
  }, [buscaOficina, oficinas]);

  const handleSelectCadastro = (viatura: Viatura) => {
    setFormData(prev => ({
      ...prev,
      cadastro: viatura.CADASTRO,
      modelo: viatura.MODELO,
      // Se houver campo de placa na Viatura, adicione aqui:
      // placaViatura: viatura.PLACA || '', // Exemplo
    }));
    setSugestoes([]);
    setShowSugestoes(false);
  };

  const handleSelectOficina = (nomeOficial: string) => {
    setOficinaSelecionada(nomeOficial);
    setFormData(prev => ({ ...prev, oficina: nomeOficial }));
    setBuscaOficina('');
    setSugestoesOficina([]);
  };

  const formatarParaReal = (valor: string) => {
    const numeros = valor.replace(/\D/g, '');
    const numeroFloat = parseFloat(numeros) / 100;
    if (isNaN(numeroFloat)) return '';
    return numeroFloat.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (name === 'valorOS') {
      const valorFormatado = formatarParaReal(value);
      setFormData(prev => ({ ...prev, [name]: valorFormatado }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleChangeBuscaOficina = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBuscaOficina(e.target.value);
  };

  const salvarNovaOficina = async () => {
    if (!novaOficina.nome.trim()) {
      alert('O nome da oficina é obrigatório');
      return;
    }
    try {
      await addDoc(collection(db, 'oficinas'), novaOficina);
      alert('Oficina cadastrada com sucesso!');
      setNovaOficina({ nome: '', nomeFantasia: '' });
      setModalCadastrarAberto(false);
      const snapshot = await getDocs(collection(db, 'oficinas'));
      const lista = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Oficina),
      }));
      setOficinas(lista);
    } catch (error) {
      alert('Erro ao cadastrar oficina');
      console.error(error);
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
      alert('Por favor, selecione um policial e uma função para a assinatura.');
      return;
    }
    console.log('Assinatura confirmada. Dados completos para o documento:', assinaturaSelecionada);
    setModalAssinarAberto(false);
    alert('Assinatura selecionada com sucesso e pronta para uso no documento!');
  };

  // INÍCIO DA FUNÇÃO handleSubmit ATUALIZADA
  const handleSubmit = async () => {
  // Validação inicial para garantir que numeroOS não está vazio
  if (!formData.numeroOS.trim()) {
    alert('Por favor, informe o número da Ordem de Serviço (OS).');
    return;
  }

  try {
    const numeroOS = formData.numeroOS; // Armazena o numeroOS para uso claro

    // --- 1. VERIFICAÇÃO DE DUPLICIDADE NO FIRESTORE (FRONT-END) ---
    // Usando uma consulta eficiente para buscar apenas a OS com o número desejado
    const osRef = collection(db, 'ordensDeServico'); // **VERIFIQUE:** Se sua coleção é 'ordens_servico' ou 'ordensDeServico'
    const q = query(osRef, where('numeroOS', '==', numeroOS));
    const querySnapshot = await getDocs(q);

    let osDataParaEnvio: OrdemServico; // Declara a variável aqui para ter escopo em toda a função
    let osJaExistiaNoBD = false; // Flag para controlar se a OS já existia

    if (!querySnapshot.empty) {
      // Se encontrou documentos, a OS já existe
      const osDoc = querySnapshot.docs[0];
      osDataParaEnvio = osDoc.data() as OrdemServico;
      osJaExistiaNoBD = true;
      alert(`Atenção: A Ordem de Serviço número ${numeroOS} já existe no banco de dados! O documento será gerado com os dados existentes.`);
      console.log('OS existente encontrada:', osDataParaEnvio);
    } else {
      // Se a OS NÃO existe, cria um novo objeto com os dados do formulário
      osDataParaEnvio = {
        cadastroViatura: formData.cadastro,
        modeloViatura: formData.modelo,
        dataOS: formData.dataOS,
        defeitoRelatado: formData.defeito,
        oficinaResponsavel: formData.oficina,
        numeroOficina: formData.numeroOficina,
        numeroOS: formData.numeroOS,
        observacao: formData.observacao,
        valorOS: formData.valorOS,
        placaViatura: 'N/D', // Ajuste conforme seu formulário ou lógica de placa
        // dataCriacao será adicionado no momento do addDoc
      };

      // Adiciona a assinatura se estiver selecionada
      if (assinaturaSelecionada.policial && assinaturaSelecionada.funcao) {
        osDataParaEnvio.assinatura = {
          policial: {
            NOME: assinaturaSelecionada.policial.NOME,
            'Post/Grad': assinaturaSelecionada.policial['Post/Grad'] || '',
            CPF: assinaturaSelecionada.policial.CPF,
            Matrícula: assinaturaSelecionada.policial.Matrícula,
            'NOME DE GUERRA1': assinaturaSelecionada.policial['NOME DE GUERRA1'],
            AGÊNCIA: assinaturaSelecionada.policial.AGÊNCIA,
            BANCO: assinaturaSelecionada.policial.BANCO,
            CONTA: assinaturaSelecionada.policial.CONTA,
          },
          funcao: assinaturaSelecionada.funcao,
        };
      }

      // Salva a nova OS no Firestore apenas se ela não existia
      const dadosParaSalvarNoFirestore = {
        ...osDataParaEnvio,
        dataCriacao: serverTimestamp(), // Adiciona o timestamp de criação
      };
      const docRef = await addDoc(collection(db, 'ordensDeServico'), dadosParaSalvarNoFirestore);
      console.log('Nova Ordem de Serviço salva com ID:', docRef.id);
      alert('Ordem de Serviço cadastrada com sucesso no Firebase!');

      // Atualizar status das viaturas selecionadas para "completo"
      if (viaturasSelecionadas.length > 0) {
        for (const viatura of viaturasSelecionadas) {
          const viaturaPendente = viaturasPendentes.find(v => v.cadastro === viatura);
          if (viaturaPendente) {
            const oficinaDocRef = doc(db, 'oficina', viaturaPendente.id);
            await updateDoc(oficinaDocRef, {
              status: 'completo',
              numeroOS: formData.numeroOS,
              dataOS: formData.dataOS
            });
          }
        }
        alert(`Status atualizado para ${viaturasSelecionadas.length} viatura(s) selecionada(s)!`);
      }
    }

    // --- 2. ENVIA OS DADOS PARA A CLOUD FUNCTION PARA GERAR O DOCX ---
    // A Cloud Function receberá os dados (novos ou existentes) e gerará o documento
    const functionsUrl = `https://gerarordemservicodocx-owvlmrnsjq-uc.a.run.app`; // **ATENÇÃO: Sua URL REAL da Cloud Function**

    const response = await fetch(functionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(osDataParaEnvio), // Envia os dados (do BD ou do formulário)
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Ordem_Servico_${osDataParaEnvio.numeroOS || 'gerada'}.docx`; // Usa o numeroOS da OS (nova ou existente)
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      alert('Documento DOCX gerado e download iniciado!');
    } else {
      const errorText = await response.text();
      alert(`Erro ao gerar o documento DOCX. Detalhes: ${errorText}`);
      console.error('Erro na geração do DOCX pela Cloud Function:', errorText);
    }

  } catch (error) {
    console.error('Erro geral no processo:', error);
    alert('Ocorreu um erro ao processar a Ordem de Serviço ou gerar o documento. Verifique o console.');
  }
};
  // FIM DA FUNÇÃO handleSubmit ATUALIZADA

  return (
    <div className="space-y-6 relative p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-foreground">Nova Ordem de Serviço</h2>
        <Button variant="secondary" onClick={onBack}>Voltar</Button>
      </div>

      <Card className="bg-muted">
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
          <div className="relative">
            <Input
              name="cadastro"
              placeholder="CADASTRO"
              value={formData.cadastro}
              onChange={handleChange}
              autoComplete="off"
            />
            {showSugestoes && sugestoes.length > 0 && (
              <ul className="absolute z-10 bg-black border border-border mt-1 rounded w-full max-h-48 overflow-y-auto shadow">
                {sugestoes.map(item => (
                  <li
                    key={item.id}
                    className="px-3 py-2 hover:bg-accent cursor-pointer"
                    onClick={() => handleSelectCadastro(item)}
                  >
                    {item.CADASTRO} — {item.MODELO}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Input
            name="modelo"
            placeholder="MODELO"
            value={formData.modelo}
            onChange={handleChange}
            disabled
          />

          <Input
            name="dataOS"
            type="date"
            placeholder="DATA DA OS"
            value={formData.dataOS}
            onChange={handleChange}
          />

          <div className="relative md:col-span-2">
            <Input
              name="buscarOficina"
              placeholder="Buscar Oficina"
              value={buscaOficina}
              onChange={handleChangeBuscaOficina}
              autoComplete="off"
            />

            {sugestoesOficina.length > 0 && (
              <ul className="absolute z-10 bg-[#141414] text-white border border-gray-700 mt-1 rounded w-full max-h-48 overflow-y-auto shadow">
                {sugestoesOficina.map((oficina) => (
                  <li
                    key={oficina.id}
                    className="px-3 py-2 cursor-pointer hover:bg-gray-800"
                    onClick={() => handleSelectOficina(oficina.nome)}
                  >
                    {oficina.nome} {oficina.nomeFantasia ? `— ${oficina.nomeFantasia}` : ''}
                  </li>
                ))}
              </ul>
            )}

            {oficinaSelecionada && (
              <p className="mt-1 text-sm text-gray-300">
                Oficina selecionada: <span className="font-semibold">{oficinaSelecionada}</span>
              </p>
            )}
          </div>

          <Input
            name="numeroOficina"
            placeholder="Nº (OF.)"
            value={formData.numeroOficina}
            onChange={handleChange}
          />

          <Input
            name="numeroOS"
            placeholder="Nº (O.S)"
            value={formData.numeroOS}
            onChange={handleChange}
          />

          <Input
            name="valorOS"
            placeholder="VALOR DA OS (R$)"
            value={formData.valorOS}
            onChange={handleChange}
          />

          <Textarea
            name="defeito"
            placeholder="DEFEITO RELATADO"
            value={formData.defeito}
            onChange={handleChange}
            className="md:col-span-2"
          />

          <Textarea
            name="observacao"
            placeholder="OBSERVAÇÃO"
            value={formData.observacao}
            onChange={handleChange}
            className="md:col-span-2"
          />

          <div className="flex space-x-3 mt-1 md:col-span-2">
            <Button size="sm" onClick={() => setModalCadastrarAberto(true)}>Cadastrar Oficina</Button>
            <Button size="sm" variant="secondary" onClick={() => setModalVisualizarAberto(true)}>Visualizar Oficinas</Button>
          </div>
        </CardContent>
      </Card>

      {/* Seção de Viaturas Pendentes */}
      {viaturasPendentes.length > 0 && (
        <Card className="bg-muted">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Viaturas com OS Pendente</h3>
            <div className="space-y-2">
              {viaturasPendentes.map((viatura) => (
                <div key={viatura.id} className="flex items-center space-x-3 p-3 bg-background rounded border">
                  <Checkbox
                    id={viatura.cadastro}
                    checked={viaturasSelecionadas.includes(viatura.cadastro)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setViaturasSelecionadas(prev => [...prev, viatura.cadastro]);
                      } else {
                        setViaturasSelecionadas(prev => prev.filter(v => v !== viatura.cadastro));
                      }
                    }}
                  />
                  <label htmlFor={viatura.cadastro} className="flex-1 cursor-pointer">
                    <div className="font-medium">{viatura.cadastro}</div>
                    <div className="text-sm text-muted-foreground">{viatura.servicoRealizar}</div>
                    <div className="text-xs text-muted-foreground">Data entrada: {new Date(viatura.dataEntrada).toLocaleDateString()}</div>
                  </label>
                </div>
              ))}
            </div>
            {viaturasSelecionadas.length > 0 && (
              <div className="mt-4 p-3 bg-primary/10 rounded border">
                <p className="text-sm font-medium">
                  {viaturasSelecionadas.length} viatura(s) selecionada(s). O status será atualizado para "completo" após gerar a OS.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center">
        <Button onClick={handleSubmit}>Gerar OS e Documento</Button> {/* Botão atualizado */}
        <Button onClick={() => setModalAssinarAberto(true)} variant="outline">Assinar Documento</Button>
      </div>

      {modalCadastrarAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-black rounded p-6 w-full max-w-md shadow-lg">
            <h3 className="text-lg font-bold mb-4">Cadastrar Nova Oficina</h3>

            <Input
              placeholder="Nome da Oficina"
              value={novaOficina.nome}
              onChange={e => setNovaOficina(prev => ({ ...prev, nome: e.target.value }))}
              className="mb-2"
            />

            <Input
              placeholder="Nome Fantasia (opcional)"
              value={novaOficina.nomeFantasia}
              onChange={e => setNovaOficina(prev => ({ ...prev, nomeFantasia: e.target.value }))}
              className="mb-4"
            />

            <div className="flex justify-end space-x-2">
              <Button variant="secondary" onClick={() => setModalCadastrarAberto(false)}>Cancelar</Button>
              <Button onClick={salvarNovaOficina}>Salvar</Button>
            </div>
          </div>
        </div>
      )}

      {modalVisualizarAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-auto">
          <div className="bg-black rounded p-6 max-w-3xl w-full shadow-lg max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Oficinas Cadastradas</h3>

            <table className="w-full border-collapse border border-gray-300 text-left">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-300 px-3 py-2 text-black">Nome</th>
                  <th className="border border-gray-300 px-3 py-2 text-black">Nome Fantasia</th>
                </tr>
              </thead>
              <tbody>
                {oficinas.length === 0 && (
                  <tr>
                    <td colSpan={2} className="p-4 text-center text-gray-500">Nenhuma oficina cadastrada</td>
                  </tr>
                )}
                {oficinas.map(oficina => (
                  <tr key={oficina.id} className="even:bg-gray-700 text-white">
                    <td className="border border-gray-300 px-3 py-2">{oficina.nome}</td>
                    <td className="border border-gray-300 px-3 py-2">{oficina.nomeFantasia || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end mt-4">
              <Button variant="secondary" onClick={() => setModalVisualizarAberto(false)}>Fechar</Button>
            </div>
          </div>
        </div>
      )}

      {modalAssinarAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-auto">
          <div className="bg-black rounded p-6 w-full max-w-4xl shadow-lg max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-center">Selecionar Assinatura</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-semibold mb-3">Selecione o Oficial:</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                  {policiaisOficiais.length === 0 ? (
                    <p className="text-gray-400">Nenhum oficial encontrado.</p>
                  ) : (
                    policiaisOficiais.map(policial => (
                      <Button
                        key={policial.id}
                        variant={assinaturaSelecionada.policial?.id === policial.id ? 'default' : 'outline'}
                        onClick={() => handleSelectSignatory(policial)}
                        className="w-full justify-start text-left"
                      >
                        {policial['NOME DE GUERRA1']} - {policial['Post/Grad']} {/* CORREÇÃO */}
                      </Button>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold mb-3">Selecione a Função:</h4>
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
              <div className="mt-6 p-4 border border-gray-700 rounded bg-gray-900 text-center">
                <p className="text-lg font-medium">Assinatura selecionada:</p>
                <p className="text-xl font-bold text-green-400">
                  {assinaturaSelecionada.policial['Post/Grad']} {assinaturaSelecionada.policial.NOME} {/* CORREÇÃO */}
                </p>
                <p className="text-md text-gray-300">
                  {assinaturaSelecionada.funcao}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Todos os dados do oficial (CPF, matrícula, etc.) estão disponíveis para o documento.
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="secondary" onClick={() => {
                setModalAssinarAberto(false);
                setAssinaturaSelecionada({ policial: null, funcao: null });
              }}>Cancelar</Button>
              <Button onClick={handleConfirmSignature}>Confirmar Assinatura</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NovaOSForm;