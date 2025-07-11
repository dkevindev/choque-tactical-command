import { useState, useEffect, useRef } from 'react';
import type { BotResponse, Viatura } from '@/bot/types';
import { responder } from '@/bot/responder';
import ViaturaModal from '@/bot/ViaturaModal';
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

  return (
    <>
      <div className="chat-container">
        <header className="chat-header">
          <h1>CAVBOT - Assistente da Cavalaria</h1>
        </header>

        <main className="chat-messages">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`message ${msg.sender === 'user' ? 'user-message' : 'bot-message'}`}
            >
              <p>{msg.text}</p>
              <span className="timestamp">{msg.timestamp.toLocaleTimeString('pt-BR')}</span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </main>

        <footer className="chat-input-area">
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

      <style>{`
        .chat-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          max-width: 600px;
          margin: 0 auto;
          background: #1f2937;
          color: #f9fafb;
          font-family: 'Roboto', sans-serif;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 0 15px rgba(0,0,0,0.5);
        }

        .chat-header {
          padding: 1rem;
          background: #111827;
          font-weight: 700;
          font-size: 1.25rem;
          text-align: center;
          border-bottom: 1px solid #374151;
        }

        .chat-messages {
          flex: 1;
          padding: 1rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          scrollbar-width: thin;
          scrollbar-color: #4b5563 transparent;
        }
        .chat-messages::-webkit-scrollbar {
          width: 8px;
        }
        .chat-messages::-webkit-scrollbar-thumb {
          background-color: #4b5563;
          border-radius: 4px;
        }

        .message {
          max-width: 80%;
          padding: 0.75rem 1rem;
          border-radius: 20px;
          position: relative;
          word-wrap: break-word;
          font-size: 1rem;
        }
        .user-message {
          align-self: flex-end;
          background: #3b82f6;
          color: white;
          border-bottom-right-radius: 0;
        }
        .bot-message {
          align-self: flex-start;
          background: #374151;
          border: 1px solid #4b5563;
          color: #d1d5db;
          border-bottom-left-radius: 0;
        }

        .timestamp {
          font-size: 0.7rem;
          color: #9ca3af;
          margin-top: 2px;
          user-select: none;
        }

        .chat-input-area {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: #111827;
          border-top: 1px solid #374151;
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
      `}</style>
    </>
  );
};

export default CAVBot;