-- Criar tabela para controle do livro diário
CREATE TABLE public.livro_diario (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  armeiro_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('aberto', 'fechado')),
  data_abertura TIMESTAMP WITH TIME ZONE,
  data_fechamento TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de policiais
CREATE TABLE public.policiais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  matricula TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  posto_graduacao TEXT NOT NULL,
  senha TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de materiais bélicos
CREATE TABLE public.materiais_belicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  subcategoria TEXT,
  numero_serie TEXT,
  calibre TEXT,
  fabricante TEXT,
  quantidade_estoque INTEGER NOT NULL DEFAULT 0,
  disponivel BOOLEAN NOT NULL DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de sessões de atendimento
CREATE TABLE public.sessoes_atendimento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  armeiro_id TEXT NOT NULL,
  policial_id UUID REFERENCES public.policiais(id) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('iniciado', 'enviado', 'finalizado')),
  materiais JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de reservas ativas (materiais enviados aguardando confirmação)
CREATE TABLE public.reservas_ativas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sessao_id UUID REFERENCES public.sessoes_atendimento(id) NOT NULL,
  policial_id UUID REFERENCES public.policiais(id) NOT NULL,
  armeiro_id TEXT NOT NULL,
  materiais JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL CHECK (status IN ('pendente', 'confirmado', 'finalizado')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de cautelas ativas (materiais confirmados e em uso)
CREATE TABLE public.cautelas_ativas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policial_id UUID REFERENCES public.policiais(id) NOT NULL,
  material_id UUID REFERENCES public.materiais_belicos(id) NOT NULL,
  quantidade INTEGER NOT NULL,
  data_cautela TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de devoluções pendentes
CREATE TABLE public.devolucoes_pendentes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policial_id UUID REFERENCES public.policiais(id) NOT NULL,
  materiais JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL CHECK (status IN ('solicitado', 'confirmado_armeiro')),
  data_solicitacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_confirmacao TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de movimentações bélicas (histórico completo)
CREATE TABLE public.movimentacoes_belicas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policial_id UUID REFERENCES public.policiais(id) NOT NULL,
  material_id UUID REFERENCES public.materiais_belicos(id) NOT NULL,
  tipo_movimentacao TEXT NOT NULL CHECK (tipo_movimentacao IN ('cautela', 'devolucao')),
  quantidade INTEGER NOT NULL,
  armeiro_responsavel TEXT NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.livro_diario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiais_belicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessoes_atendimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas_ativas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cautelas_ativas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devolucoes_pendentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_belicas ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS (acesso público por enquanto, ajustaremos depois com autenticação)
CREATE POLICY "Enable all operations for all users" ON public.livro_diario FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON public.policiais FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON public.materiais_belicos FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON public.sessoes_atendimento FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON public.reservas_ativas FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON public.cautelas_ativas FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON public.devolucoes_pendentes FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON public.movimentacoes_belicas FOR ALL USING (true);

-- Criar função para atualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar triggers para atualização automática de timestamps
CREATE TRIGGER update_livro_diario_updated_at
BEFORE UPDATE ON public.livro_diario
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_policiais_updated_at
BEFORE UPDATE ON public.policiais
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_materiais_belicos_updated_at
BEFORE UPDATE ON public.materiais_belicos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sessoes_atendimento_updated_at
BEFORE UPDATE ON public.sessoes_atendimento
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reservas_ativas_updated_at
BEFORE UPDATE ON public.reservas_ativas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir dados iniciais
INSERT INTO public.policiais (matricula, nome, posto_graduacao, senha) VALUES
('123456', 'DAVYDSON KEVIN BEZERRA DE OLIVEIRA', 'Soldado', '123456'),
('789012', 'MARIA SILVA SANTOS', 'Cabo', 'senha123'),
('345678', 'JOÃO PEREIRA COSTA', 'Sargento', 'abc123');

INSERT INTO public.materiais_belicos (nome, categoria, subcategoria, quantidade_estoque) VALUES
('Pistola Taurus PT 100', 'Arma de Fogo', 'Pistola', 5),
('Colete Balístico Nível IIIA', 'EPI', 'Proteção', 10),
('Munição .40 S&W', 'Munição', 'Pistola', 1000),
('Algema de Aço', 'EPI', 'Contenção', 15),
('Bastão Tonfa', 'EPI', 'Defesa', 8);