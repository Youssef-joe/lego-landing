'use client';

import { useChat } from 'ai/react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import ReactMarkdown from 'react-markdown';

export default function ChatClient() {
  const router = useRouter();
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  });
  
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildSuccess, setBuildSuccess] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isBuilding, buildSuccess]);

  const handleBuild = async () => {
    if (messages.length === 0) return;
    
    setIsBuilding(true);
    setBuildSuccess(false);
    
    try {
      const response = await fetch('/api/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      });
      
      const data = await response.json();
      if (response.ok) {
        setBuildSuccess(true);
        router.refresh();
      } else {
        alert('Build Failed: ' + data.error);
      }
    } catch (err) {
      alert('Build Error: ' + err);
    } finally {
      setIsBuilding(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-brico-paper-2 border-r-4 border-brico-ink relative">
      <div className="flex-1 overflow-y-auto p-6 space-y-6 relative z-10">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-brico-ink text-center px-4">
            <div className="border-4 border-brico-ink bg-brico-yellow p-6 shadow-brutal mb-8 rotate-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-16 h-16 text-brico-ink">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.492-3.053 5.253 5.253-.397 1.164-3.053 2.492-4.295-5.856zm-4.083-4.083l-3.053-2.492L5.856 4.3 11.42 10.12zm0 0L4.8 6.45A2.652 2.652 0 018.55 2.7l3.612 3.612" />
              </svg>
            </div>
            <h3 className="text-4xl font-serif font-black text-brico-ink mb-4 uppercase">Architect Terminal</h3>
            <p className="text-base font-mono font-bold text-brico-ink-soft max-w-sm leading-relaxed border-t-2 border-b-2 border-brico-ink py-2">
              INPUT SPECIFICATIONS. SYSTEM WILL COMPILE AND DEPLOY STANDALONE MODULES.
            </p>
          </div>
        ) : (
          messages.map(m => (
            <div key={m.id} className={`flex flex-col gap-4 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              
              {/* Normal text content */}
              {m.content && (
                <div className={`max-w-[85%] border-4 border-brico-ink px-5 py-4 ${
                  m.role === 'user' 
                    ? 'bg-brico-ink text-brico-paper shadow-brutal' 
                    : 'bg-white text-brico-ink shadow-brutal-sm'
                }`}>
                  <div className={`text-[12px] font-mono font-black mb-3 uppercase tracking-[0.1em] border-b-2 ${m.role === 'user' ? 'border-brico-paper text-brico-paper' : 'border-brico-ink text-brico-ink'} pb-1`}>
                    {m.role === 'user' ? 'USER_DIRECTIVE' : 'SYSTEM_RESPONSE'}
                  </div>
                  <div className="font-sans font-bold text-[16px] leading-relaxed">
                    <ReactMarkdown
                      components={{
                        p: ({node, ...props}) => <p className="mb-4 last:mb-0" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 last:mb-0 space-y-2" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal font-black pl-5 mb-4 last:mb-0 space-y-2" {...props} />,
                        li: ({node, ...props}) => <li className="" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-black border-b-2 border-brico-ink" {...props} />,
                        pre: ({node, ...props}) => <pre className="bg-brico-paper p-4 border-4 border-brico-ink font-mono text-sm overflow-x-auto my-4 shadow-brutal-sm whitespace-pre-wrap break-words" {...props} />,
                        code: ({node, className, ...props}) => {
                          const isInline = !className?.includes('language-');
                          return isInline ? (
                            <code className="bg-brico-yellow text-brico-ink px-1 border-2 border-brico-ink font-mono text-sm break-words" {...props} />
                          ) : (
                            <code className="font-mono text-sm break-words" {...props} />
                          );
                        },
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {/* Build State UI */}
        {(isBuilding || buildSuccess) && (
          <div className="flex flex-col gap-4 items-start mt-6">
            <div className="w-full max-w-[85%] border-4 border-brico-ink bg-brico-yellow text-brico-ink shadow-brutal p-5">
              <div className="flex items-center gap-3 border-b-4 border-brico-ink pb-3 mb-3">
                {isBuilding ? (
                  <div className="h-5 w-5 border-4 border-brico-ink border-t-transparent rounded-full animate-spin" />
                ) : (
                  <div className="h-5 w-5 bg-brico-ink text-brico-yellow flex items-center justify-center font-bold text-xs font-mono">✓</div>
                )}
                <h4 className="font-mono font-black uppercase text-lg tracking-wider">
                  {isBuilding ? 'BACKGROUND WORKER: DEPLOYING...' : 'BACKGROUND WORKER: COMPLETE'}
                </h4>
              </div>
              
              {buildSuccess && (
                <div className="mt-3 bg-brico-ink text-brico-paper font-mono font-bold text-sm p-2 uppercase text-center border-2 border-brico-ink">
                  System synchronized successfully.
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-5 bg-brico-yellow border-t-4 border-brico-ink relative z-20 flex flex-col gap-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
          <input
            className="w-full bg-white border-4 border-brico-ink text-brico-ink rounded-none px-4 py-4 focus:outline-none focus:bg-brico-paper transition-all placeholder:text-brico-ink-soft font-mono font-bold text-[16px] shadow-brutal-sm focus:shadow-none focus:translate-x-[2px] focus:translate-y-[2px]"
            value={input}
            onChange={handleInputChange}
            placeholder="EXECUTE DIRECTIVE..."
            disabled={isLoading || isBuilding}
          />
          <div className="flex gap-4 w-full">
            <button 
              type="submit" 
              disabled={isLoading || isBuilding || !input.trim()}
              className="flex-1 bg-brico-blue hover:bg-brico-ink border-4 border-brico-ink text-white rounded-none px-8 py-4 flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-brutal hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] font-mono font-black uppercase tracking-widest text-lg"
            >
              {isLoading ? (
                <div className="h-6 w-6 border-4 border-brico-ink border-t-white rounded-full animate-spin" />
              ) : (
                "Run"
              )}
            </button>
            <button 
              type="button"
              onClick={handleBuild}
              disabled={isLoading || isBuilding || messages.length === 0}
              className="flex-1 bg-brico-orange hover:bg-brico-ink border-4 border-brico-ink text-white rounded-none px-8 py-4 flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-brutal hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] font-mono font-black uppercase tracking-widest text-lg"
            >
              {isBuilding ? 'Deploying...' : 'Deploy Module'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
