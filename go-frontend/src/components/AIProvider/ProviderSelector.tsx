'use client';

import { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7210';

interface PersonalKey {
  id: string;
  label: string;
  model?: string;
  endpoint?: string;
  addedAt: string;
  isActive: boolean;
}

interface ProviderAvailability {
  systemKey: boolean;
  userKey: boolean;
  userKeyCount: number;
}

interface UserPreference {
  provider: string;
  keySource: 'system' | 'user';
  model?: string;
  availability: Record<string, ProviderAvailability>;
  personalKeysCount: number;
  personalKeyDetails: Record<string, PersonalKey[]>;
}

export default function ProviderSelector() {
  const [providers, setProviders] = useState<string[]>([]);
  const [userPreference, setUserPreference] = useState<UserPreference | null>(null);
  const [selected, setSelected] = useState('');
  const [keySource, setKeySource] = useState<'system' | 'user'>('system');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [showAddKeyForm, setShowAddKeyForm] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [keyLabel, setKeyLabel] = useState('');
  const [addingKey, setAddingKey] = useState(false);
  
  const [deletingKeyId, setDeletingKeyId] = useState<string | null>(null);
  const [settingActiveKeyId, setSettingActiveKeyId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [providersRes, prefRes] = await Promise.all([
        fetch(`${API_BASE}/api/ai-providers`),
        fetch(`${API_BASE}/api/ai-providers/user-preference`)
      ]);

      if (!providersRes.ok || !prefRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [providersData, prefData] = await Promise.all([
        providersRes.json(),
        prefRes.json()
      ]);

      if (providersData.success && providersData.providers?.supported) {
        setProviders(providersData.providers.supported);
      }

      if (prefData.success && prefData.preference) {
        setUserPreference(prefData.preference);
        setSelected(prefData.preference.provider);
        setKeySource(prefData.preference.keySource);
      }
    } catch (err) {
      setError('Failed to load data: ' + String(err));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleProviderAndSourceChange = async (newProvider: string, newKeySource: 'system' | 'user') => {
    try {
      setError('');
      setSuccess('');
      
      const res = await fetch(`${API_BASE}/api/ai-providers/preference`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          provider: newProvider,
          keySource: newKeySource
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update');
      }

      setSelected(newProvider);
      setKeySource(newKeySource);
      
      const activeKey = userPreference?.personalKeyDetails[newProvider]?.find(k => k.isActive);
      setSuccess(`Switched to ${newProvider.toUpperCase()} using ${
        newKeySource === 'system' 
          ? 'system API key' 
          : `your personal key "${activeKey?.label || 'Personal Key'}"`
      }`);
      
      await fetchData();
    } catch (err) {
      setError('Failed to switch provider: ' + String(err));
      console.error(err);
    }
  };

  const handleAddApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !apiKey) {
      setError('Please enter an API key');
      return;
    }

    if (!keyLabel.trim()) {
      setError('Please enter a label for this API key');
      return;
    }

    setAddingKey(true);
    try {
      setError('');
      setSuccess('');

      const res = await fetch(`${API_BASE}/api/ai-providers/add-personal-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: selected,
          apiKey: apiKey,
          label: keyLabel
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add API key');
      }

      setSuccess(`API key "${keyLabel}" added for ${selected.toUpperCase()}!`);
      setApiKey('');
      setKeyLabel('');
      setShowAddKeyForm(false);
      
      await fetchData();
    } catch (err) {
      setError('Failed to add API key: ' + String(err));
      console.error(err);
    } finally {
      setAddingKey(false);
    }
  };

  const handleSetActiveKey = async (provider: string, keyId: string) => {
    setSettingActiveKeyId(keyId);
    try {
      setError('');
      setSuccess('');

      const res = await fetch(`${API_BASE}/api/ai-providers/set-active-key`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          keyId
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to set active key');
      }

      const keyLabel = userPreference?.personalKeyDetails[provider]?.find(k => k.id === keyId)?.label;
      setSuccess(`Active key set to "${keyLabel}"`);
      
      await fetchData();
    } catch (err) {
      setError('Failed to set active key: ' + String(err));
      console.error(err);
    } finally {
      setSettingActiveKeyId(null);
    }
  };

  const handleDeletePersonalKey = async (provider: string, keyId: string) => {
    const key = userPreference?.personalKeyDetails[provider]?.find(k => k.id === keyId);
    if (!confirm(`Are you sure you want to remove "${key?.label}" for ${provider.toUpperCase()}?`)) {
      return;
    }

    setDeletingKeyId(keyId);
    try {
      setError('');
      setSuccess('');

      const res = await fetch(`${API_BASE}/api/ai-providers/personal-key/${provider}/${keyId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete API key');
      }

      setSuccess(`API key "${key?.label}" removed`);
      
      await fetchData();
    } catch (err) {
      setError('Failed to delete API key: ' + String(err));
      console.error(err);
    } finally {
      setDeletingKeyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#D7D9C4] border-t-transparent"></div>
      </div>
    );
  }

  const currentAvailability = selected ? userPreference?.availability[selected] : null;
  const currentKeys = selected ? (userPreference?.personalKeyDetails[selected] || []) : [];
  const activeKey = currentKeys.find(k => k.isActive);

  return (
    <div className="space-y-4">
      {/* Currently Active Banner */}
      {selected && (
        <div className="rounded-lg p-4 border-2 shadow-lg"
          style={{
            background: keySource === 'system' 
              ? 'linear-gradient(135deg, rgba(242,243,227,0.25) 0%, rgba(191,193,169,0.15) 45%, rgba(11,19,43,0.85) 100%)'
              : 'linear-gradient(135deg, rgba(34,197,94,0.2) 0%, rgba(22,163,74,0.1) 45%, rgba(11,19,43,0.85) 100%)',
            borderColor: keySource === 'system' ? 'rgba(191,193,169,0.45)' : 'rgba(34,197,94,0.4)'
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ 
                  background: keySource === 'system' ? '#D7D9C4' : '#22c55e',
                  color: '#0b132b' 
                }}
              >
                {keySource === 'system' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui' }}>
                  Currently Active: {selected.toUpperCase()}
                </h2>
                <p className="text-sm mt-0.5" style={{ 
                  color: keySource === 'system' ? '#D7D9C4' : '#22c55e',
                  fontFamily: 'Inter, ui-sans-serif, system-ui',
                  fontWeight: 500
                }}>
                  {keySource === 'system' ? '🏢 Using System Credits' : `👤 Using: "${activeKey?.label || 'Personal Key'}"`}
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  {keySource === 'system' 
                    ? 'Requests are billed to your account token balance'
                    : 'Requests are billed directly to your personal API account'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {(error || success) && (
        <div
          className={`p-3 rounded-lg ${
            success
              ? 'bg-green-900/30 border border-green-500'
              : 'bg-red-900/30 border border-red-500'
          }`}
        >
          <p className={`text-sm ${success ? 'text-green-400' : 'text-red-400'}`}>{error || success}</p>
        </div>
      )}

      {/* Main Layout: Provider List (Left) + Details (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Provider List */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h2 className="text-base font-semibold text-white mb-3">AI Providers</h2>
            <div className="space-y-2">
              {providers.map(provider => {
                const availability = userPreference?.availability[provider];
                const userKeyCount = availability?.userKeyCount || 0;
                const hasSystemKey = availability?.systemKey || false;
                const isSelected = selected === provider;

                return (
                  <button
                    key={provider}
                    onClick={() => {
                      const defaultKeySource = availability?.systemKey ? 'system' : 'user';
                      handleProviderAndSourceChange(provider, defaultKeySource);
                    }}
                    className={`w-full p-3 rounded-lg border-2 transition-all duration-200 ease-in-out text-left ${
                      isSelected
                        ? 'border-[#D7D9C4] bg-[#D7D9C4]/10'
                        : 'border-gray-700 bg-gray-750 hover:border-gray-600 hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold text-sm">{provider.toUpperCase()}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {hasSystemKey && (
                            <span className="text-xs px-1.5 py-0.5 bg-[#D7D9C4]/20 text-[#D7D9C4] rounded transition-opacity duration-200">
                              System
                            </span>
                          )}
                          {userKeyCount > 0 && (
                            <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded transition-opacity duration-200">
                              {userKeyCount} {userKeyCount === 1 ? 'key' : 'keys'}
                            </span>
                          )}
                        </div>
                      </div>
                      <svg 
                        className={`w-5 h-5 text-[#D7D9C4] transition-all duration-200 ease-in-out ${
                          isSelected ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
                        }`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Provider Details */}
        <div className="lg:col-span-2" key={selected || 'no-selection'}>
          {!selected ? (
            <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center transition-all duration-300 ease-in-out animate-fadeIn">
              <svg className="w-16 h-16 text-gray-600 mx-auto mb-4 transition-transform duration-300 hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-400 mb-2">Select an AI Provider</h3>
              <p className="text-gray-500 text-sm">Choose a provider from the list to view and manage API keys</p>
            </div>
          ) : (
            <div className="space-y-4 transition-all duration-300 ease-in-out animate-fadeIn">
              {/* System-Defined Section */}
              {currentAvailability?.systemKey && (
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 transition-all duration-300 ease-in-out">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-[#D7D9C4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <h3 className="text-base font-semibold text-white">System-Defined</h3>
                  </div>
                  
                  <button
                    onClick={() => handleProviderAndSourceChange(selected, 'system')}
                    className={`w-full p-4 rounded-lg border-2 transition-all duration-200 ease-in-out ${
                      keySource === 'system'
                        ? 'border-[#D7D9C4] bg-[#D7D9C4]/10'
                        : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                          keySource === 'system' ? 'border-[#D7D9C4] bg-[#D7D9C4]' : 'border-gray-500'
                        }`}>
                          <div className={`w-3 h-3 rounded-full bg-[#0b132b] transition-all duration-200 ${
                            keySource === 'system' ? 'scale-100' : 'scale-0'
                          }`}></div>
                        </div>
                        <div className="text-left">
                          <p className="text-white text-base font-medium">System API Key</p>
                          <p className="text-gray-400 text-xs mt-0.5">Use company-provided credits</p>
                        </div>
                      </div>
                      <span className="text-[#D7D9C4] text-sm font-medium">🏢 System</span>
                    </div>
                  </button>
                </div>
              )}

              {/* User-Defined Section */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 transition-all duration-300 ease-in-out">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <h3 className="text-base font-semibold text-white">User-Defined</h3>
                  </div>
                  {!showAddKeyForm && (
                    <button
                      onClick={() => setShowAddKeyForm(true)}
                      className="px-3 py-1.5 text-sm btn-milkyway rounded-lg shadow-sm transition-all duration-200 hover:opacity-90 hover:scale-105"
                      style={{ fontFamily: 'Inter, ui-sans-serif, system-ui', fontWeight: 500 }}
                    >
                      + Add Key
                    </button>
                  )}
                </div>

                {/* Add Key Form */}
                {showAddKeyForm && (
                  <form onSubmit={handleAddApiKey} className="space-y-3 mb-4 p-4 bg-gray-750 rounded-lg border border-gray-600 transition-all duration-300 ease-in-out animate-fadeIn">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">
                        Label <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 text-sm bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-[#C6C8AE] focus:outline-none"
                        placeholder="e.g., Work Account, Personal, Production"
                        value={keyLabel}
                        onChange={(e) => setKeyLabel(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">
                        API Key <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="password"
                        className="w-full px-3 py-2 text-sm bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-[#C6C8AE] focus:outline-none"
                        placeholder="Paste your API key here"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Your API key is encrypted and stored securely
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        type="submit" 
                        className="px-4 py-1.5 text-sm btn-milkyway rounded-lg shadow-sm transition hover:opacity-90 focus:ring-2 focus:ring-[#F2F3E3] disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{ fontFamily: 'Inter, ui-sans-serif, system-ui', fontWeight: 500 }}
                        disabled={addingKey || !apiKey || !keyLabel}
                      >
                        {addingKey ? 'Adding...' : 'Add API Key'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddKeyForm(false);
                          setApiKey('');
                          setKeyLabel('');
                        }}
                        className="px-4 py-1.5 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* User Keys List */}
                {currentKeys.length > 0 ? (
                  <div className="space-y-2">
                    {currentKeys.map((key) => (
                      <button
                        key={key.id}
                        onClick={() => {
                          if (!key.isActive) {
                            handleSetActiveKey(selected, key.id);
                          }
                          handleProviderAndSourceChange(selected, 'user');
                        }}
                        disabled={settingActiveKeyId === key.id}
                        className={`w-full p-4 rounded-lg border-2 transition-all duration-200 ease-in-out ${
                          keySource === 'user' && key.isActive
                            ? 'border-green-500 bg-green-500/10'
                            : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                              keySource === 'user' && key.isActive ? 'border-green-500 bg-green-500' : 'border-gray-500'
                            }`}>
                              <div className={`w-3 h-3 rounded-full bg-white transition-all duration-200 ${
                                keySource === 'user' && key.isActive ? 'scale-100' : 'scale-0'
                              }`}></div>
                            </div>
                            <div className="text-left">
                              <p className="text-white text-base font-medium">"{key.label}"</p>
                              <p className="text-gray-400 text-xs mt-0.5">Added {new Date(key.addedAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {key.isActive && (
                              <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">Active</span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePersonalKey(selected, key.id);
                              }}
                              disabled={deletingKeyId === key.id}
                              className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                              {deletingKeyId === key.id ? 'Removing...' : 'Remove'}
                            </button>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : !showAddKeyForm && (
                  <div className="text-center py-8 text-gray-500 transition-all duration-300 ease-in-out animate-fadeIn">
                    <svg className="w-12 h-12 text-gray-600 mx-auto mb-3 transition-transform duration-300 hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <p className="text-sm">No personal API keys added yet</p>
                    <p className="text-xs mt-1">Click "+ Add Key" to add your own API key</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-800">
        <div className="flex items-start gap-2">
          <svg className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-blue-400 text-sm font-medium">Managing Multiple API Keys</p>
            <ul className="text-blue-300 text-xs mt-1.5 space-y-0.5 list-disc list-inside">
              <li><strong>Add multiple keys</strong> for the same provider (e.g., Work, Personal, different projects)</li>
              <li><strong>Label each key</strong> to easily identify which account or project it's for</li>
              <li><strong>Switch between keys</strong> by clicking on any key to make it active</li>
              <li><strong>System Credits:</strong> Requests count against your account's token balance</li>
              <li><strong>Personal API Keys:</strong> Requests bill directly to that specific API account</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
