import { Mic, Settings2, Sparkles, Volume2 } from 'lucide-react';

export interface AudioSettings {
  audio_enabled: boolean;
  provider: string;
  provider_model: string;
  provider_voice: string;
  language_code: string;
  character_key: string;
  tone: string;
  speaking_rate: number;
  character_prompt: string;
}

interface AudioMatchSettingsProps {
  settings: AudioSettings;
  onChange: (settings: AudioSettings) => void;
}

const PRESETS = {
  default: { label: 'Default Broadcast', character: 'veteran', tone: 'normal', rate: 1.00 },
  boundary: { label: 'Boundary Action', character: 'play_by_play', tone: 'energetic', rate: 1.07 },
  wicket: { label: 'Wicket/Dramatic', character: 'play_by_play', tone: 'dramatic', rate: 1.10 },
  analyst: { label: 'Tactical Analyst', character: 'analyst', tone: 'calm', rate: 0.95 },
};

export function AudioMatchSettings({ settings, onChange }: AudioMatchSettingsProps) {
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    onChange({
      ...settings,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
               type === 'number' || type === 'range' ? parseFloat(value) : value
    });
  };

  const applyPreset = (presetKey: keyof typeof PRESETS) => {
    const preset = PRESETS[presetKey];
    onChange({
      ...settings,
      character_key: preset.character,
      tone: preset.tone,
      speaking_rate: preset.rate
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm animate-fadeIn max-w-4xl">
      
      {/* Header & Main Toggle */}
      <div className="bg-gray-50 p-5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Mic className="text-[#e60023]" size={20} />
            AI Audio Commentary
          </h2>
          <p className="text-xs text-gray-500 font-medium mt-1">Configure AI voice and persona. Will be saved on match launch.</p>
        </div>
        
        {/* Master Toggle */}
        <label className="flex items-center cursor-pointer bg-white border border-gray-200 px-4 py-2 rounded-xl shadow-sm hover:bg-gray-50 transition-colors">
          <div className="relative">
            <input 
              type="checkbox" 
              name="audio_enabled"
              className="sr-only" 
              checked={settings.audio_enabled}
              onChange={handleChange}
            />
            <div className={`block w-10 h-6 rounded-full transition-colors ${settings.audio_enabled ? 'bg-[#e60023]' : 'bg-gray-300'}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.audio_enabled ? 'transform translate-x-4' : ''}`}></div>
          </div>
          <div className="ml-3 font-bold text-sm text-gray-700">
            {settings.audio_enabled ? 'Audio Enabled' : 'Audio Disabled'}
          </div>
        </label>
      </div>

      {/* Settings Form - Grayed out if disabled */}
      <div className={`p-6 transition-opacity duration-300 ${!settings.audio_enabled ? 'opacity-50 pointer-events-none grayscale-[0.5]' : ''}`}>
        
        {/* Quick Presets */}
        <div className="mb-8">
          <label className="block text-xs font-black text-gray-500 uppercase mb-3 flex items-center gap-1">
            <Sparkles size={14} /> Quick Presets
          </label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(PRESETS).map(([key, preset]) => (
              <button
                key={key}
                type="button"
                onClick={() => applyPreset(key as keyof typeof PRESETS)}
                className="px-4 py-2 bg-gray-100 hover:bg-[#e60023] hover:text-white text-gray-700 text-xs font-bold rounded-lg transition-colors border border-gray-200 hover:border-[#e60023]"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Persona / Character */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase mb-2">Commentator Persona</label>
            <select name="character_key" value={settings.character_key} onChange={handleChange} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-800 focus:outline-none focus:border-[#e60023]">
              <option value="veteran">Veteran (Classic Broadcast)</option>
              <option value="play_by_play">Play-by-Play (Action)</option>
              <option value="analyst">Analyst (Tactical)</option>
              <option value="stadium">Stadium Announcer</option>
            </select>
          </div>

          {/* Tone */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase mb-2">Delivery Tone</label>
            <select name="tone" value={settings.tone} onChange={handleChange} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-800 focus:outline-none focus:border-[#e60023]">
              <option value="normal">Normal</option>
              <option value="calm">Calm & Analytical</option>
              <option value="energetic">Energetic</option>
              <option value="dramatic">Dramatic (High Tension)</option>
            </select>
          </div>

        
          {/* Voice Model */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase mb-2">Voice Model</label>
            <select name="provider_voice" value={settings.provider_voice} onChange={handleChange} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-800 focus:outline-none focus:border-[#e60023]">
              <option value="Fenrir">Fenrir (Deep, Male)</option>
              <option value="Kore">Kore (Clear, Female)</option>
            </select>
          </div>

          {/* Language */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase mb-2">Language Dialect</label>
            <select name="language_code" value={settings.language_code} onChange={handleChange} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-800 focus:outline-none focus:border-[#e60023]">
              <option value="en-GB">English (UK) - Recommended</option>
              <option value="en-AU">English (Australia)</option>
              <option value="en-IN">English (India)</option>
              <option value="en-US">English (US)</option>
            </select>
          </div>
        </div>

        {/* Speaking Rate Slider */}
        <div className="mt-8 bg-gray-50 p-4 rounded-xl border border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-black text-gray-500 uppercase flex items-center gap-1">
              <Volume2 size={14} /> Speaking Speed
            </label>
              <span className="text-[#e60023] font-black">{Number(settings.speaking_rate || 1).toFixed(2)}x</span>
            </div>
          <input 
            type="range" 
            name="speaking_rate" 
            min="0.70" 
            max="1.20" 
            step="0.05" 
            value={settings.speaking_rate} 
            onChange={handleChange}
            className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-[#e60023]"
          />
          <div className="flex justify-between text-[10px] text-gray-400 font-bold mt-1 uppercase">
            <span>Slow (0.7x)</span>
            <span>Normal (1.0x)</span>
            <span>Fast (1.2x)</span>
          </div>
        </div>

        {/* Advanced: Custom Prompt */}
        <div className="mt-6">
          <label className="block text-xs font-black text-gray-500 uppercase mb-2 flex items-center gap-1">
            <Settings2 size={14} /> Advanced: Custom Instructions (Optional)
          </label>
          <textarea 
            name="character_prompt"
            value={settings.character_prompt || ''}
            onChange={handleChange}
            placeholder="e.g., Use heavy cricket jargon and always mention the bowler's pace..."
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:border-[#e60023] focus:ring-1 focus:ring-[#e60023] min-h-[80px] resize-none"
          ></textarea>
        </div>
      </div>
    </div>
  );
}