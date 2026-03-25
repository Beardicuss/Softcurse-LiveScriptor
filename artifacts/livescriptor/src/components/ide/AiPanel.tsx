import React, { useState, useRef, useEffect } from 'react';
import { Cpu, Send, Sparkles } from 'lucide-react';
import { useAiChat, type ChatMessage } from '@workspace/api-client-react';

export function AiPanel({ projectId }: { projectId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'AI ASSISTANT ONLINE. HOW CAN I OPTIMIZE YOUR CODE?' }
  ]);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  
  const chatMutation = useAiChat();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || chatMutation.isPending) return;
    
    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    
    chatMutation.mutate({ 
      data: { message: userMsg.content, projectId, history: messages } 
    }, {
      onSuccess: (res) => {
        setMessages(prev => [...prev, { role: 'assistant', content: res.message }]);
      }
    });
  };

  return (
    <div className="h-full flex flex-col font-mono text-sm bg-card/50 border-l border-primary/20">
      <div className="p-3 border-b border-primary/20 flex items-center justify-between text-accent bg-background/50">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4" />
          <span className="font-bold tracking-wider">AI ASSISTANT</span>
        </div>
        <Sparkles className="w-4 h-4 animate-pulse" />
      </div>
      
      <div className="flex-1 overflow-y-auto cyber-scrollbar p-3 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <span className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">
              {msg.role === 'user' ? 'GUEST' : 'SYSTEM AI'}
            </span>
            <div className={`p-2.5 rounded max-w-[90%] border ${
              msg.role === 'user' 
                ? 'bg-secondary/10 border-secondary/30 text-foreground' 
                : 'bg-accent/10 border-accent/30 text-accent neon-text-accent'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {chatMutation.isPending && (
          <div className="flex items-center gap-2 text-accent text-xs animate-pulse">
            <div className="w-2 h-2 bg-accent rounded-full" />
            <div className="w-2 h-2 bg-accent rounded-full delay-75" />
            <div className="w-2 h-2 bg-accent rounded-full delay-150" />
            Processing...
          </div>
        )}
        <div ref={endRef} />
      </div>
      
      <div className="p-3 border-t border-primary/20 bg-background/80">
        <div className="relative">
          <textarea 
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Type a prompt..."
            className="w-full bg-card border border-primary/30 rounded p-2 pr-10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent focus:shadow-[0_0_10px_rgba(255,0,255,0.2)] resize-none min-h-[60px] cyber-scrollbar"
          />
          <button 
            onClick={handleSend}
            disabled={chatMutation.isPending || !input.trim()}
            className="absolute right-2 bottom-2 p-1.5 text-primary hover:text-accent hover:bg-accent/10 rounded transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
