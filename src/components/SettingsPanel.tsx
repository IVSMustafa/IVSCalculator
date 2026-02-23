import React, { useState } from 'react';
import { AppSettings, Program, GradeFee } from '../types';
import { Building2, Phone, Mail, Globe, Image as ImageIcon, BookOpen, Plus, Trash2, Lock, Unlock, ShieldAlert } from 'lucide-react';

interface Props {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
}

export default function SettingsPanel({ settings, setSettings }: Props) {
  const handleChange = (field: keyof AppSettings, value: any) => {
    setSettings({ ...settings, [field]: value });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleChange('logoBase64', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addProgram = () => {
    const newProgram: Program = {
      id: `prog-${Date.now()}`,
      name: 'New Program',
      pricingType: 'class',
      grades: []
    };
    handleChange('programs', [...(settings.programs || []), newProgram]);
  };

  const removeProgram = (programId: string) => {
    handleChange('programs', settings.programs.filter(p => p.id !== programId));
  };

  const updateProgram = (programId: string, field: keyof Program, value: any) => {
    handleChange('programs', settings.programs.map(p =>
      p.id === programId ? { ...p, [field]: value } : p
    ));
  };

  const addGrade = (programId: string) => {
    handleChange('programs', settings.programs.map(p => {
      if (p.id === programId) {
        return {
          ...p,
          grades: [...p.grades, { id: `grade-${Date.now()}`, name: 'New Entry', fee: 0, discountedFee: 0 }]
        };
      }
      return p;
    }));
  };

  const removeGrade = (programId: string, gradeId: string) => {
    handleChange('programs', settings.programs.map(p => {
      if (p.id === programId) {
        return { ...p, grades: p.grades.filter(g => g.id !== gradeId) };
      }
      return p;
    }));
  };

  const updateGrade = (programId: string, gradeId: string, field: keyof GradeFee, value: string | number) => {
    handleChange('programs', settings.programs.map(p => {
      if (p.id === programId) {
        return {
          ...p,
          grades: p.grades.map(g => g.id === gradeId ? { ...g, [field]: value } : g)
        };
      }
      return p;
    }));
  };

  const [isAuthorized, setIsAuthorized] = useState(() => sessionStorage.getItem('settings_authorized') === 'true');
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');

  const handleAuthorize = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = import.meta.env.VITE_SETTINGS_PASSWORD || 'admin123';

    if (passwordInput === correctPassword) {
      setIsAuthorized(true);
      sessionStorage.setItem('settings_authorized', 'true');
      setError('');
    } else {
      setError('Incorrect password. Please try again.');
      setPasswordInput('');
    }
  };

  const handleLock = () => {
    setIsAuthorized(false);
    sessionStorage.removeItem('settings_authorized');
    setPasswordInput('');
  };

  if (!isAuthorized) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-2xl shadow-xl border border-slate-200">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Settings Locked</h2>
          <p className="text-slate-500 text-sm">Please enter the administrative password to modify school settings.</p>

          <form onSubmit={handleAuthorize} className="w-full space-y-4 pt-4">
            <div className="relative">
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter password"
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${error ? 'border-red-300 bg-red-50' : 'border-slate-300'}`}
                autoFocus
              />
              {error && (
                <div className="flex items-center gap-1.5 text-red-600 text-xs mt-2 px-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {error}
                </div>
              )}
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4" />
              Access Settings
            </button>
          </form>
        </div>
      </div>
    );
  }

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSyncToCode = async () => {
    setIsSyncing(true);
    setSyncStatus('idle');
    try {
      const response = await fetch('/api/sync-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (!response.ok) throw new Error('Failed to sync to source code');

      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 text-sm font-medium">
          <Unlock className="w-4 h-4" />
          Live Source Editor Mode
        </div>
        <button
          onClick={handleLock}
          className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-red-600 transition-colors bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm"
        >
          <Lock className="w-4 h-4" />
          Lock Settings
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
        <h2 className="text-xl font-semibold flex items-center gap-2 text-slate-800">
          <Building2 className="w-6 h-6 text-blue-600" />
          School Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">School Name</label>
            <input
              type="text"
              value={settings.schoolName}
              onChange={(e) => handleChange('schoolName', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subtitle 1</label>
            <input
              type="text"
              value={settings.subtitle1}
              onChange={(e) => handleChange('subtitle1', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subtitle 2</label>
            <input
              type="text"
              value={settings.subtitle2}
              onChange={(e) => handleChange('subtitle2', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Subtitle 3</label>
            <input
              type="text"
              value={settings.subtitle3}
              onChange={(e) => handleChange('subtitle3', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold flex items-center gap-2 text-slate-800">
            <BookOpen className="w-6 h-6 text-blue-600" />
            Programs & Fees
          </h2>
          <button
            onClick={addProgram}
            className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Program
          </button>
        </div>

        <div className="space-y-6">
          {(settings.programs || []).map((program) => (
            <div key={program.id} className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-wrap md:flex-nowrap justify-between items-center gap-4">
                <input
                  type="text"
                  value={program.name}
                  onChange={(e) => updateProgram(program.id, 'name', e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-800 min-w-[200px]"
                  placeholder="Program Name (e.g., Quran Program)"
                />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500 whitespace-nowrap">Pricing Model:</span>
                  <select
                    value={program.pricingType || 'class'}
                    onChange={(e) => updateProgram(program.id, 'pricingType', e.target.value)}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                  >
                    <option value="class">By Class / Grade</option>
                    <option value="subject">By Subject</option>
                    <option value="days">By Days</option>
                  </select>
                  <button
                    onClick={() => removeProgram(program.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-2"
                    title="Remove Program"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {program.grades.length > 0 && (
                  <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 px-1">
                    <div className="col-span-12">Level / Grade List</div>
                  </div>
                )}

                {program.grades.map((grade) => (
                  <div key={grade.id} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <input
                        type="text"
                        value={grade.name}
                        onChange={(e) => updateGrade(program.id, grade.id, 'name', e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Grade Name"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        min="0"
                        value={grade.fee}
                        onChange={(e) => updateGrade(program.id, grade.id, 'fee', Number(e.target.value))}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Fee"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        min="0"
                        value={grade.discountedFee}
                        onChange={(e) => updateGrade(program.id, grade.id, 'discountedFee', Number(e.target.value))}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Discounted"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button
                        onClick={() => removeGrade(program.id, grade.id)}
                        className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => addGrade(program.id)}
                  className="mt-2 flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Grade
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
        <h2 className="text-xl font-semibold flex items-center gap-2 text-slate-800">
          <Phone className="w-6 h-6 text-blue-600" />
          Contact Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input
              type="text"
              value={settings.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="text"
              value={settings.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
            <input
              type="text"
              value={settings.website}
              onChange={(e) => handleChange('website', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      <div className="bg-blue-900 rounded-2xl p-8 text-white shadow-xl space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <BookOpen className="w-32 h-32" />
        </div>

        <div className="relative z-10 flex items-start gap-4">
          <div className={`p-3 rounded-xl ${syncStatus === 'success' ? 'bg-green-500' : syncStatus === 'error' ? 'bg-red-500' : 'bg-blue-600'}`}>
            {syncStatus === 'success' ? <Plus className="w-6 h-6 rotate-45" /> : syncStatus === 'error' ? <ShieldAlert className="w-6 h-6" /> : <BookOpen className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-xl font-bold">Save Permanently to Source Code</h3>
            <p className="text-blue-100 mt-1">
              {syncStatus === 'success'
                ? 'Changes have been saved to src/types.ts successfully!'
                : syncStatus === 'error'
                  ? 'Failed to save changes. Please check if the dev server is running.'
                  : 'This will overwrite the default settings in your source code with these current values.'}
            </p>
          </div>
        </div>

        <button
          onClick={handleSyncToCode}
          disabled={isSyncing}
          className={`relative z-10 w-full font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-3 ${syncStatus === 'success'
              ? 'bg-green-500 hover:bg-green-600'
              : syncStatus === 'error'
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-white text-blue-900 hover:bg-blue-50'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isSyncing ? (
            <div className="w-6 h-6 border-4 border-blue-900/20 border-t-blue-900 rounded-full animate-spin"></div>
          ) : syncStatus === 'success' ? (
            'Saved Successfully! ✓'
          ) : syncStatus === 'error' ? (
            'Try Again'
          ) : (
            <>
              <Plus className="w-5 h-5" />
              Embed Changes into Source Code
            </>
          )}
        </button>
      </div>
    </div>
  );
}
