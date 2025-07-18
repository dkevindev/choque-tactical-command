import { useState, useEffect, useRef } from 'react';
import type { BotResponse, Viatura } from '@/bot/types';
import { responder } from '@/bot/index';
import ViaturaModal from '@/bot/ViaturaModal';
import FormEntradaOficina from '@/bot/FormEntradaOficina';
import FormSaidaOficina from '@/bot/FormSaidaOficina';
import { Mic, MicOff, Send } from 'lucide-react';

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

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  const messagesEndRef = useRef<HTMLDivElement>(null);

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