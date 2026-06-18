import { useState } from 'react';
import { useUser } from '../lib/user';
import { useToast } from '../lib/toast';
import type { Role } from '../lib/types';

type Mode = 'login' | 'register';

export function AuthScreen() {
  const { login, register } = useUser();
  const toast = useToast();
  const [mode, setMode] = useState<Mode>('login');
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!loginValue.trim() || !password) { toast.show('Заполните логин и пароль', 'error'); return; }
    setBusy(true);
    try {
      if (mode === 'login') {
        await login({ login: loginValue.trim(), password });
        toast.show('С возвращением!', 'success');
      } else {
        await register({ login: loginValue.trim(), password, displayName: displayName.trim(), role });
        toast.show('Аккаунт создан', 'success');
      }
    } catch (e: any) {
      toast.show(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 animate-fade-in">
      <div className="card relative w-full max-w-[400px] p-7 sm:p-8 overflow-hidden ring-1 ring-white/10 animate-scale-in">
        <div className="pointer-events-none absolute -top-px left-1/2 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-brand-400/70 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-brand-500/[0.08] to-transparent" />

        {/* Logo */}
        <div className="relative text-center mb-7">
          <div className="relative w-14 h-14 mx-auto mb-4">
            <div className="absolute inset-0 rounded-[16px] bg-brand-500/40 blur-xl animate-glow-pulse" />
            <div className="relative w-14 h-14 rounded-[16px] bg-gradient-to-br from-brand-400 to-brand-600 grid place-items-center shadow-glow">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
          </div>
          <h1 className="text-[22px] font-bold tracking-tight text-gradient">
            {mode === 'login' ? 'Вход в IdeaForge' : 'Регистрация'}
          </h1>
          <p className="text-sm text-[#6E6E73] dark:text-[#8E8EA0] mt-1.5">
            {mode === 'login' ? 'Войдите по логину и паролю' : 'Создайте аккаунт за пару секунд'}
          </p>
        </div>

        <div className="relative space-y-4">
          {mode === 'register' && (
            <div>
              <label className="field">Отображаемое имя</label>
              <input className="input" placeholder="как вас называть" value={displayName}
                onChange={(e) => setDisplayName(e.target.value.slice(0, 32))}
                onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
            </div>
          )}

          <div>
            <label className="field">Логин</label>
            <input className="input lowercase placeholder:normal-case" placeholder="логин" value={loginValue} autoFocus
              autoComplete="username"
              onChange={(e) => setLoginValue(e.target.value.replace(/[^a-zA-Z0-9_.-]/g, '').toLowerCase())}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
          </div>

          <div>
            <label className="field">Пароль</label>
            <div className="relative">
              <input className="input pr-11" type={showPass ? 'text' : 'password'} placeholder="минимум 6 символов"
                value={password} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
              <button type="button" onClick={() => setShowPass((s) => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 grid place-items-center rounded-[8px] text-[#AEAEB2] hover:text-brand-500 hover:bg-brand-500/10 transition-colors"
                aria-label={showPass ? 'Скрыть пароль' : 'Показать пароль'}>
                {showPass
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="field">Роль</label>
              <div className="grid grid-cols-2 gap-2">
                {(['student', 'teacher'] as Role[]).map((r) => (
                  <button key={r} onClick={() => setRole(r)}
                    className={`rounded-[12px] border px-3 py-2.5 text-sm font-medium transition-all duration-150 active:scale-95 ${role === r ? 'border-brand-500 bg-brand-500/10 text-brand-500 dark:text-brand-300' : 'border-black/[0.08] dark:border-white/[0.1] text-[#3A3A3C] dark:text-[#C8C8D4] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'}`}>
                    {r === 'student' ? 'Студент' : 'Преподаватель'}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button onClick={submit} disabled={busy} className="btn-gradient relative w-full h-11 text-[15px] font-medium mt-1">
            {busy ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
          </button>
        </div>

        <div className="relative mt-6 text-center text-sm text-[#6E6E73] dark:text-[#8E8EA0]">
          {mode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
          <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="font-semibold text-brand-500 dark:text-brand-300 hover:underline">
            {mode === 'login' ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </div>
      </div>
    </div>
  );
}
