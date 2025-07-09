import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Send, Mic, MicOff, Bot, User, Home } from 'lucide-react';
import cpchoqueLogo from '@/assets/cpchoque-logo.png';

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
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    // Simulate bot response
    setTimeout(() => {
      const botResponse = generateBotResponse(inputText);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
      scrollToBottom();
    }, 1000);

    scrollToBottom();
  };

  const generateBotResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes('nada consta') || input.includes('documento')) {
      return 'Para gerar um documento "nada consta", preciso da matrícula do policial. Por favor, informe a matrícula para prosseguir com a geração do documento.';
    }
    
    if (input.includes('arma') || input.includes('série') || input.includes('armamento')) {
      return 'Para localizar uma arma pelo número de série, preciso do número completo. Por favor, informe o número de série da arma que deseja localizar.';
    }
    
    if (input.includes('viatura') || input.includes('veículo')) {
      return 'Posso ajudá-lo com informações sobre a frota. Atualmente temos 89 viaturas ativas. Precisa de informações específicas sobre alguma viatura?';
    }
    
    if (input.includes('policial') || input.includes('efetivo')) {
      return 'Temos 1.247 policiais no efetivo ativo. Posso buscar informações específicas de algum policial se você informar a matrícula.';
    }
    
    if (input.includes('relatório') || input.includes('dashboard')) {
      return 'Posso gerar relatórios sobre patrimônio, armamentos, frota ou efetivo. Qual tipo de relatório você precisa?';
    }
    
    return 'Entendi sua solicitação. Posso ajudá-lo com:\n\n• Gerar documentos "nada consta"\n• Localizar armamentos por número de série\n• Informações sobre viaturas e frota\n• Dados do efetivo policial\n• Relatórios gerenciais\n\nComo posso ser mais específico em sua consulta?';
  };

  const handleVoiceRecording = () => {
    setIsRecording(!isRecording);
    // Aqui seria implementada a funcionalidade de gravação de voz
    if (!isRecording) {
      // Simular transcrição após alguns segundos
      setTimeout(() => {
        setIsRecording(false);
        setInputText('Transcrição da mensagem de voz...');
      }, 3000);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-background font-military">
      <div className="absolute inset-0 bg-gradient-to-br from-tactical-dark via-background to-tactical-medium opacity-90"></div>
      
      <div className="relative z-10 flex flex-col h-screen">
        {/* Header */}
        <div className="p-4 border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-tactical-medium rounded-full p-2 border border-tactical-light">
                <img 
                  src={cpchoqueLogo} 
                  alt="CAVALARIA Logo" 
                  className="w-full h-full object-contain filter brightness-200"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground tracking-wide">
                  CAVBOT
                </h1>
                <p className="text-sm text-muted-foreground">
                  Assistente Virtual CAVALARIA
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-primary/20 text-primary">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse mr-2"></div>
                ONLINE
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="text-muted-foreground hover:text-foreground"
              >
                <Home className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.sender === 'bot' && (
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
                
                <div className={`max-w-md ${message.sender === 'user' ? 'order-2' : ''}`}>
                  <div
                    className={`p-3 rounded-lg ${
                      message.sender === 'user'
                        ? 'bg-primary text-primary-foreground ml-auto'
                        : 'bg-card border border-border'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 px-1">
                    {formatTime(message.timestamp)}
                  </p>
                </div>

                {message.sender === 'user' && (
                  <div className="w-8 h-8 bg-tactical-medium rounded-full flex items-center justify-center flex-shrink-0 order-3">
                    <User className="h-4 w-4 text-tactical-text" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border bg-card/50 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2">
              <div className="flex-1 flex gap-2">
                <Input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="bg-input border-border text-foreground"
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleVoiceRecording}
                  className={`${
                    isRecording 
                      ? 'bg-destructive text-destructive-foreground animate-pulse' 
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              </div>
              <Button 
                onClick={handleSendMessage}
                disabled={!inputText.trim()}
                className="bg-primary hover:bg-tactical-light text-primary-foreground"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            {isRecording && (
              <div className="mt-2 text-center">
                <Badge variant="destructive" className="animate-pulse">
                  🎤 Gravando... Toque novamente para parar
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CAVBot;