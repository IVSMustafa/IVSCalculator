/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import FeeCalculator from './components/FeeCalculator';
import SettingsPanel from './components/SettingsPanel';
import { AppSettings, DEFAULT_SETTINGS } from './types';
import { Settings, Calculator, Coins } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'calculator' | 'settings'>('calculator');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await fetch('https://open.er-api.com/v6/latest/SAR');
        const data = await response.json();
        if (data && data.rates) {
          setSettings(prev => {
            // Only update if we don't have a rate yet for the selected currency or it's a fresh session
            // To respect user overrides, we merge carefully
            return {
              ...prev,
              exchangeRates: {
                ...data.rates,
                ...prev.exchangeRates // Keep user's manual changes if they exist in this session
              }
            };
          });
        }
      } catch (error) {
        console.error('Failed to fetch exchange rates:', error);
      }
    };
    fetchRates();
  }, []); // Only fetch on mount to avoid overwriting mid-session manual changes

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'ADD_NEW') {
      const code = prompt('Enter 3-letter Currency Code (e.g., AUD):')?.toUpperCase();
      const label = prompt('Enter Currency Label (e.g., Australian Dollar):');
      if (code && label) {
        setSettings(prev => ({
          ...prev,
          availableCurrencies: [...(prev.availableCurrencies || []), { code, label }],
          exchangeRates: { ...prev.exchangeRates, [code]: prev.exchangeRates[code] || 1 },
          selectedCurrency: code
        }));
      }
    } else {
      setSettings({ ...settings, selectedCurrency: val });
    }
  };

  const handleRateChange = (val: string) => {
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setSettings(prev => ({
        ...prev,
        exchangeRates: {
          ...prev.exchangeRates,
          [prev.selectedCurrency]: num
        }
      }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex justify-between items-center">
            <div className="flex space-x-8">
              <button
                onClick={() => setActiveTab('calculator')}
                className={`py-4 flex items-center gap-2 border-b-2 font-medium transition-colors ${activeTab === 'calculator' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                <Calculator className="w-5 h-5" />
                Calculator
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-4 flex items-center gap-2 border-b-2 font-medium transition-colors ${activeTab === 'settings' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                <Settings className="w-5 h-5" />
                Settings
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Exchange Rate Input */}
              {settings.selectedCurrency !== 'SAR' && (
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">1 SAR =</span>
                  <input
                    type="number"
                    value={settings.exchangeRates[settings.selectedCurrency] || ''}
                    onChange={(e) => handleRateChange(e.target.value)}
                    className="w-20 bg-transparent text-sm font-bold text-blue-600 outline-none focus:ring-0"
                    step="0.0001"
                  />
                  <span className="text-xs font-bold text-slate-500">{settings.selectedCurrency}</span>
                </div>
              )}

              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
                <Coins className="w-4 h-4 text-amber-500" />
                <select
                  value={settings.selectedCurrency}
                  onChange={handleCurrencyChange}
                  className="bg-transparent text-sm font-semibold text-slate-700 outline-none cursor-pointer"
                >
                  {(settings.availableCurrencies || []).map(curr => (
                    <option key={curr.code} value={curr.code}>{curr.code} - {curr.label}</option>
                  ))}
                  <option value="ADD_NEW" className="text-blue-600 font-bold border-t border-slate-200">+ Add another currency...</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-8">
        {activeTab === 'calculator' ? (
          <FeeCalculator settings={settings} />
        ) : (
          <SettingsPanel settings={settings} setSettings={setSettings} />
        )}
      </div>
    </div>
  );
}
