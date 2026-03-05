import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { Key, CheckCircle, Info, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    const savedKey = localStorage.getItem('clickup_api_key');
    if (savedKey) setApiKey(savedKey);
  }, []);

  const handleSave = () => {
    localStorage.setItem('clickup_api_key', apiKey);
    toast.success('ClickUp API Key saved locally');
  };

  return (
    <Layout>
      <div className="p-8 md:p-12 max-w-2xl">
        <header className="mb-12">
          <p className="text-[10px] font-mono text-[#D4AF37] uppercase tracking-widest mb-2">Configuration</p>
          <h1 className="font-serif text-4xl text-white">Settings</h1>
        </header>

        <section className="bg-[#121212] border border-white/5 p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-[#7B68EE]/10 rounded-full">
              <Key className="text-[#7B68EE]" size={24} />
            </div>
            <div>
              <h2 className="font-serif text-xl text-white">ClickUp Integration</h2>
              <p className="text-white/40 text-sm">Sync your architectural projects with ClickUp tasks.</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-mono text-white/40 uppercase">API Key</label>
            <div className="flex gap-2">
              <input 
                type="password" 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="pk_xxxxxxxxxxxx"
                className="flex-1 bg-black border border-white/10 p-3 text-white text-sm focus:border-[#D4AF37] outline-none"
              />
              <button 
                onClick={handleSave}
                className="bg-[#D4AF37] text-black px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-[#C5A059]"
              >
                Save
              </button>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-white/5">
            <div className="flex items-start gap-2 text-white/40 text-xs leading-relaxed">
              <Info size={14} className="mt-0.5 shrink-0" />
              <div>
                <p className="mb-2">To find your API key: Go to ClickUp Settings {'>'} Apps {'>'} API Token.</p>
                <a href="https://app.clickup.com" target="_blank" className="text-[#D4AF37] flex items-center gap-1 hover:underline">
                  Open ClickUp <ExternalLink size={10} />
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}