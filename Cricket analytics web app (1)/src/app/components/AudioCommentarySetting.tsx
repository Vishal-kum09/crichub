import { useState } from 'react';
import { Mic, Settings2, Sparkles, Volume2, Play, Loader2 } from 'lucide-react';
import { toast } from '../../lib/toast';
import { api } from '../../lib/api';

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
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [audioElement] = useState(new Audio());
  
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

  // Voice Preview Handler based on the integration document
  const handlePreview = async () => {
    setIsPreviewing(true);
    try {
      // Main app backend proxy call with authentication
      const { data } = await api.post('/api/scorer/audio/voice-preview', {
        provider: settings.provider || "gemini",
        model: settings.provider_model || "gemini-2.5-flash-tts",
        voice: settings.provider_voice || "Fenrir",
        language: settings.language_code || "en-GB",
        character_key: settings.character_key || "veteran",
        tone: settings.tone || "normal",
        speaking_rate: settings.speaking_rate || 1.0,
        character_prompt: settings.character_prompt || null
      });

      // Play the base64 audio[cite: 1]
      audioElement.src = `data:${data.content_type};base64,${data.audio}`;
      await audioElement.play();
      
      toast.success(data.cached ? "Played cached sample" : "New voice sample generated!");
    } catch (err: any) {
      toast.error(err.message || 'Preview failed. Check configuration.');
    } finally {
      setIsPreviewing(false);
    }
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
  
  {/* Left Column (Persona & Voice Model) */}
  <div className="space-y-6">
    {/* Persona */}
    <div>
      <label className="block text-xs font-black text-gray-500 uppercase mb-2">Commentator Persona</label>
      <select name="character_key" value={settings.character_key} onChange={handleChange} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-800 focus:outline-none focus:border-[#e60023]">
        <option value="veteran">Veteran (Classic Broadcast)</option>
        <option value="play_by_play">Play-by-Play (Action)</option>
        <option value="analyst">Analyst (Tactical)</option>
        <option value="stadium">Stadium Announcer</option>
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
  </div>

  {/* Right Column (Tone & Language) */}
  <div className="space-y-6">
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

    {/* Language */}
    <div>
      <label className="block text-xs font-black text-gray-500 uppercase mb-2">Language Dialect</label>
      <select name="language_code" value={settings.language_code} onChange={handleChange} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-800 focus:outline-none focus:border-[#e60023]">
        <option value="en-GB">English (UK) - Default</option>
        <option value="en-AU">English (Australia)</option>
        <option value="en-IN">English (India)</option>
        <option value="en-US">English (US)</option>
      </select>
    </div>
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

        {/* 🚀 Voice Preview Section */}
        <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs font-semibold text-gray-500">
            <span className="block font-black text-gray-800 uppercase mb-1">Preview Sample Line:</span>
            "The bowler has the ball in hand, the batter is focused, and the field is waiting."
          </div>
          <button
            type="button"
            onClick={handlePreview}
            disabled={isPreviewing}
            className="shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 bg-black hover:bg-gray-800 text-white text-xs font-black rounded-xl transition-all disabled:opacity-50"
          >
            {isPreviewing ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
            {isPreviewing ? 'Generating Preview...' : 'Preview Voice'}
          </button>
        </div>

        
      </div>
    </div>
  );
}
