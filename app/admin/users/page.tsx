'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Eye,
  Loader2,
  CheckCircle,
  AlertCircle,
  KeyRound,
  UserX,
  UserCheck,
} from 'lucide-react';

interface AdminUser {
  id: number;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  deletedAt: string | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New user form
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'viewer'>('viewer');

  // Reset password
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [resetPassword, setResetPassword] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch {
      console.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Fehler beim Erstellen');
      }

      setMessage({ type: 'success', text: `Benutzer ${email} erstellt` });
      setEmail('');
      setName('');
      setPassword('');
      setRole('viewer');
      setShowForm(false);
      await fetchUsers();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unbekannter Fehler',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (userId: number) => {
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/users/${userId}/deactivate`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Fehler');
      }

      setMessage({
        type: 'success',
        text: data.active ? 'Benutzer reaktiviert' : 'Benutzer deaktiviert',
      });
      await fetchUsers();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unbekannter Fehler',
      });
    }
  };

  const handleResetPassword = async (userId: number) => {
    if (!resetPassword || resetPassword.length < 8) {
      setMessage({ type: 'error', text: 'Passwort muss mindestens 8 Zeichen haben' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Fehler');
      }

      setMessage({ type: 'success', text: 'Passwort zurückgesetzt' });
      setResetUserId(null);
      setResetPassword('');
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unbekannter Fehler',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-[var(--font-heading)] text-2xl text-cream font-semibold">
            Benutzer
          </h1>
          <p className="text-muted text-sm mt-1">
            Admin-Zugänge verwalten
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-gold hover:bg-gold-light text-[var(--aigg-black)] font-semibold text-sm px-4 py-2.5 rounded-lg transition-all duration-300"
        >
          <UserPlus className="w-4 h-4" />
          Neuer Benutzer
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-4 flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-emerald-900/20 border border-emerald-800/30 text-emerald-300'
              : 'bg-red-900/20 border border-red-800/30 text-red-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl p-6 mb-6">
          <h3 className="text-cream text-sm font-medium mb-4">Neuen Benutzer erstellen</h3>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
                  placeholder="benutzer@example.com"
                />
              </div>

              <div>
                <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
                  placeholder="Vor- und Nachname"
                />
              </div>

              <div>
                <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                  Passwort *
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
                  placeholder="Mindestens 8 Zeichen"
                />
              </div>

              <div>
                <label className="text-muted text-[10px] tracking-wider uppercase mb-1 block">
                  Rolle *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'admin' | 'viewer')}
                  className="w-full bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
                >
                  <option value="viewer">Betrachter (nur lesen)</option>
                  <option value="admin">Administrator (voller Zugriff)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 bg-gold hover:bg-gold-light disabled:bg-gold/40 disabled:cursor-not-allowed text-[var(--aigg-black)] font-semibold text-sm px-5 py-2.5 rounded-lg transition-all duration-300"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Erstelle...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Erstellen
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-muted text-sm hover:text-cream transition-colors px-3 py-2"
              >
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-gold mx-auto mb-3" />
            <p className="text-muted text-sm">Lade Benutzer...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Users className="w-8 h-8 text-muted/30 mx-auto mb-3" />
            <p className="text-muted text-sm">Keine Benutzer angelegt</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {users.map((user) => {
              const isDeactivated = !!user.deletedAt;

              return (
                <div
                  key={user.id}
                  className={`px-5 py-4 ${isDeactivated ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    {/* User Info */}
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          user.role === 'admin'
                            ? 'bg-gold/10 border border-gold/20'
                            : 'bg-white/[0.04] border border-white/[0.08]'
                        }`}
                      >
                        {user.role === 'admin' ? (
                          <Shield className="w-4 h-4 text-gold" />
                        ) : (
                          <Eye className="w-4 h-4 text-muted" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-cream text-sm font-medium">
                            {user.name || user.email}
                          </h4>

                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[9px] font-medium border ${
                              user.role === 'admin'
                                ? 'bg-gold/10 text-gold border-gold/20'
                                : 'bg-blue-400/10 text-blue-400 border-blue-400/20'
                            }`}
                          >
                            {user.role === 'admin' ? 'Admin' : 'Betrachter'}
                          </span>

                          {isDeactivated && (
                            <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-medium bg-red-400/10 text-red-400 border border-red-400/20">
                              Deaktiviert
                            </span>
                          )}
                        </div>

                        <p className="text-muted text-[11px] mt-0.5">{user.email}</p>
                        <p className="text-muted/50 text-[10px] mt-0.5">
                          Erstellt:{' '}
                          {new Date(user.createdAt).toLocaleDateString('de-AT', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {/* Reset Password */}
                      {resetUserId === user.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="password"
                            value={resetPassword}
                            onChange={(e) => setResetPassword(e.target.value)}
                            placeholder="Neues Passwort"
                            minLength={8}
                            className="bg-[#080808] border border-white/[0.08] rounded-lg px-3 py-1.5 text-cream text-xs w-40 focus:border-gold/40 focus:outline-none"
                          />
                          <button
                            onClick={() => handleResetPassword(user.id)}
                            disabled={submitting}
                            className="text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors px-2 py-1"
                          >
                            {submitting ? 'Speichere...' : 'Speichern'}
                          </button>
                          <button
                            onClick={() => {
                              setResetUserId(null);
                              setResetPassword('');
                            }}
                            className="text-[10px] text-muted hover:text-cream transition-colors px-2 py-1"
                          >
                            Abbrechen
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setResetUserId(user.id)}
                          className="flex items-center gap-1.5 text-[10px] text-muted hover:text-cream border border-white/[0.08] rounded px-2.5 py-1.5 transition-colors"
                        >
                          <KeyRound className="w-3 h-3" />
                          Passwort
                        </button>
                      )}

                      {/* Toggle Active */}
                      <button
                        onClick={() => handleToggleActive(user.id)}
                        className={`flex items-center gap-1.5 text-[10px] border rounded px-2.5 py-1.5 transition-colors ${
                          isDeactivated
                            ? 'text-emerald-400 border-emerald-400/20 hover:bg-emerald-400/10'
                            : 'text-red-400 border-red-400/20 hover:bg-red-400/10'
                        }`}
                      >
                        {isDeactivated ? (
                          <>
                            <UserCheck className="w-3 h-3" />
                            Aktivieren
                          </>
                        ) : (
                          <>
                            <UserX className="w-3 h-3" />
                            Deaktivieren
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
