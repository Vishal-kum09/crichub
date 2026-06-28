import { Bot, Sparkles } from 'lucide-react'; 

export function AIChatTab() {
  // 🔥 Replace this with your colleague's actual deployed FRONTEND link on GCP
  const HER_CHATBOT_URL = "https://cricket-scorer-ui-106171733624.europe-west2.run.app/"; 

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-fadeIn">
      
      {/* Native-Looking Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-xl border border-blue-200 shadow-sm">
            <Bot className="text-blue-600" size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
              Cricket AI Agent 
              <span className="px-2 py-0.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-[10px] font-black uppercase rounded-full tracking-wider flex items-center gap-1">
                <Sparkles size={10} /> Beta
              </span>
            </h2>
            <p className="text-xs text-gray-500 font-semibold">Agentic Assistant for stats, predictions, and queries</p>
          </div>
        </div>
      </div>

      {/* The "Magic" Iframe */}
      <div className="flex-grow w-full bg-[#f4f5f7] relative">
        {/* Optional loading state placeholder could go here */}
        <iframe
          src={HER_CHATBOT_URL}
          title="AI Chatbot Integration"
          className="w-full h-full border-0 absolute inset-0"
          // Adding microphone/clipboard permissions just in case her bot uses voice features!
          allow="microphone; clipboard-read; clipboard-write;" 
        />
      </div>
    </div>
  );
}