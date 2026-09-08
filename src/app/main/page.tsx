'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthPage() {
  // Стейт для входу
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (error) {
      console.log(error.message);
    } else {
      router.push('/research');
      router.refresh();
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const { error } = await supabase.auth.signUp({
      email: regEmail,
      password: regPassword,
    })
    if (error) {
      console.log(error.message);
    } else {
      router.push('/research');
      router.refresh();
    }
  };

  return (
    <div style={{ padding: '40px 20px', backgroundColor: '#ffffff', color: '#000000', fontFamily: 'sans-serif', minHeight: '100vh', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', gap: '24px', width: '100%', maxWidth: '1000px', margin: '0 auto', alignItems: 'stretch' }}>

        {/* Ліва панель: Вхід (Sign In) */}
        <div style={{ flex: 1, border: '2px solid black', padding: '20px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem', marginBottom: '16px', marginTop: 0 }}>Sign In</h3>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>Email address</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  style={{ width: '100%', border: '1px solid black', padding: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ width: '100%', border: '1px solid black', padding: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>

              <button
                type="submit"
                style={{ marginTop: 'auto', cursor: 'pointer', border: '2px solid black', backgroundColor: '#e5e7eb', padding: '6px 16px', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '16px', width: '100%' }}
              >
                Log In
              </button>
            </form>
          </div>

          <div style={{ marginTop: 'auto', borderTop: '2px solid black', paddingTop: '16px', height: '120px', boxSizing: 'border-box', fontSize: '0.85rem', lineHeight: '1.4' }}>
            <p style={{ fontWeight: 'bold', margin: '0 0 6px 0' }}>Existing User?</p>
            <p style={{ margin: 0, color: '#4b5563' }}>Enter your registered email and password to access your dashboard and research tasks.</p>
          </div>
        </div>

        {/* Права панель: Реєстрація (Sign Up) */}
        <div style={{ flex: 1, border: '2px solid black', padding: '20px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem', marginBottom: '16px', marginTop: 0 }}>Create Account</h3>

            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>Email address</label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  style={{ width: '100%', border: '1px solid black', padding: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>Password</label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ width: '100%', border: '1px solid black', padding: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>

              <button
                type="submit"
                style={{ marginTop: 'auto', cursor: 'pointer', border: '2px solid black', backgroundColor: '#e5e7eb', padding: '6px 16px', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '16px', width: '100%' }}
              >
                Register
              </button>
            </form>
          </div>

          <div style={{ marginTop: 'auto', borderTop: '2px solid black', paddingTop: '16px', height: '120px', boxSizing: 'border-box', fontSize: '0.85rem', lineHeight: '1.4' }}>
            <p style={{ fontWeight: 'bold', margin: '0 0 6px 0' }}>New Here?</p>
            <p style={{ margin: 0, color: '#4b5563' }}>Create an account to save your AI search results, export reports, and track execution logs.</p>
          </div>
        </div>

      </div>
    </div>
  );
}