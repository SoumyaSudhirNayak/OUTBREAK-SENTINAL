import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Activity, ArrowLeft, ArrowRight, Stethoscope, Truck, ShieldCheck } from 'lucide-react';

const ADMIN_EMAIL = 'admin@outbreak-sentinel.com';

// URLs for the other dashboards (update ports when those apps are running)
const DOCTOR_DASH_URL = 'http://localhost:5175';
const VAN_DASH_URL = 'http://localhost:5176';

// ── Styles ──────────────────────────────────────────────────────────────────
const glass = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(20px)',
    borderRadius: 24,
    padding: '36px 32px',
    boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
};

const inputStyle = (focused) => ({
    width: '100%', padding: '12px 16px', borderRadius: 12, outline: 'none',
    background: 'rgba(255,255,255,0.06)',
    border: `1px solid ${focused ? 'rgba(37,99,235,0.7)' : 'rgba(255,255,255,0.12)'}`,
    boxShadow: focused ? '0 0 0 3px rgba(37,99,235,0.15)' : 'none',
    color: '#fff', fontSize: 14, boxSizing: 'border-box',
    transition: 'all 0.2s',
});

const primaryBtn = (disabled) => ({
    width: '100%', padding: '13px', borderRadius: 12, border: 'none',
    background: disabled ? 'rgba(37,99,235,0.35)' : 'linear-gradient(135deg, #2563EB, #4f46e5)',
    color: '#fff', fontSize: 15, fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    boxShadow: disabled ? 'none' : '0 0 20px rgba(37,99,235,0.4)',
    transition: 'all 0.2s',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
});

const label = { display: 'block', fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: 8 };

// ── Role Card ────────────────────────────────────────────────────────────────
function RoleCard({ icon: Icon, title, desc, color, selected, onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                width: '100%', padding: '20px 18px', borderRadius: 16, border: 'none',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                background: selected ? `${color}18` : 'rgba(255,255,255,0.04)',
                borderWidth: 1.5, borderStyle: 'solid',
                borderColor: selected ? color : 'rgba(255,255,255,0.08)',
                boxShadow: selected ? `0 0 20px ${color}22` : 'none',
                display: 'flex', alignItems: 'center', gap: 14,
                transform: selected ? 'scale(1.02)' : 'scale(1)',
            }}
        >
            <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: selected ? `${color}22` : 'rgba(255,255,255,0.06)',
                border: `1px solid ${selected ? color + '44' : 'rgba(255,255,255,0.1)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
            }}>
                <Icon size={20} style={{ color: selected ? color : 'rgba(255,255,255,0.4)' }} />
            </div>
            <div>
                <div style={{ color: selected ? '#fff' : 'rgba(255,255,255,0.75)', fontWeight: 600, fontSize: 15, marginBottom: 3 }}>
                    {title}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>{desc}</div>
            </div>
            {selected && (
                <div style={{
                    marginLeft: 'auto', width: 20, height: 20, borderRadius: '50%',
                    background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            )}
        </button>
    );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function Login({ onAdminLogin }) {
    // step: 'email' | 'admin-password' | 'role-select' | 'role-auth'
    const [step, setStep] = useState('email');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState(null); // 'doctor' | 'van'
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [focused, setFocused] = useState('');

    const isAdmin = email.toLowerCase().trim() === ADMIN_EMAIL;

    // ── Step 1: Email submitted ──────────────────────────────────────────────
    const handleEmailNext = (e) => {
        e.preventDefault();
        setError('');
        if (!email.trim()) return;
        if (isAdmin) {
            setStep('admin-password');
        } else {
            setStep('role-select');
        }
    };

    // ── Step 2a: Admin password → sign in ───────────────────────────────────
    const handleAdminLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { error: err } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password });
            if (err) throw err;
            onAdminLogin();
        } catch (err) {
            setError(err.message || 'Login failed. Check your password.');
        } finally {
            setLoading(false);
        }
    };

    // ── Step 3: Role-based login/signup ─────────────────────────────────────
    const handleRoleAuth = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const metadata = { role };
        try {
            if (isSignUp) {
                const { data, error: err } = await supabase.auth.signUp({
                    email: email.trim(),
                    password,
                    options: { data: metadata },
                });
                if (err) throw err;
                // If email confirmation is disabled: session is set immediately → App re-renders
                // If confirmation required: show a message
                if (!data?.session) {
                    setError('✅ Account created! Check your email to confirm, then sign in.');
                    setIsSignUp(false);
                    setPassword('');
                    return;
                }
                // session exists → onAuthStateChange fires → App renders correct dashboard
            } else {
                const { error: err } = await supabase.auth.signInWithPassword({
                    email: email.trim(),
                    password,
                });
                if (err) throw err;
                // onAuthStateChange fires in App.jsx → resolveRole → renders doctor/van dashboard
            }
        } catch (err) {
            setError(err.message || 'Authentication failed.');
        } finally {
            setLoading(false);
        }
    };


    const goBack = () => {
        setError('');
        setPassword('');
        if (step === 'role-auth') setStep('role-select');
        else { setStep('email'); setRole(null); }
    };

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #060b1a 0%, #0d1530 40%, #0a1628 70%, #0b1a3e 100%)',
            fontFamily: '"Inter", sans-serif',
        }}>
            {/* Background orbs */}
            <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                <div style={{
                    position: 'absolute', width: 700, height: 700, top: -250, left: -200,
                    background: 'radial-gradient(circle, rgba(37,99,235,0.13) 0%, transparent 70%)', filter: 'blur(70px)'
                }} />
                <div style={{
                    position: 'absolute', width: 500, height: 500, bottom: -120, right: -100,
                    background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)', filter: 'blur(70px)'
                }} />
            </div>

            <div style={{ width: '100%', maxWidth: 440, padding: '0 24px', position: 'relative', zIndex: 10 }}>

                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 36 }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 64, height: 64, borderRadius: 20, marginBottom: 18,
                        background: 'linear-gradient(135deg, #2563EB, #4f46e5)',
                        boxShadow: '0 0 30px rgba(37,99,235,0.55), 0 0 70px rgba(37,99,235,0.18)',
                    }}>
                        <Activity size={28} color="#fff" />
                    </div>
                    <h1 style={{
                        color: '#fff', fontSize: 26, fontWeight: 700, marginBottom: 6,
                        background: 'linear-gradient(135deg, #ffffff, rgba(255,255,255,0.65))',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>Outbreak Sentinel</h1>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
                        {step === 'email' && 'Enter your email to continue'}
                        {step === 'admin-password' && 'Welcome back, Administrator'}
                        {step === 'role-select' && 'Select your role to continue'}
                        {step === 'role-auth' && (isSignUp ? 'Create your account' : 'Sign in to your account')}
                    </p>
                </div>

                {/* Card */}
                <div style={glass}>

                    {/* Back button — all steps except first */}
                    {step !== 'email' && (
                        <button onClick={goBack} style={{
                            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24,
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'rgba(255,255,255,0.4)', fontSize: 13, padding: 0,
                            transition: 'color 0.2s',
                        }}
                            onMouseEnter={e => e.target.style.color = '#fff'}
                            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.4)'}
                        >
                            <ArrowLeft size={14} /> Back
                        </button>
                    )}

                    {/* ── STEP 1: Email ── */}
                    {step === 'email' && (
                        <form onSubmit={handleEmailNext}>
                            <label style={label}>Email address</label>
                            <input
                                id="auth-email"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                autoFocus
                                placeholder="your@email.com"
                                style={inputStyle(focused === 'email')}
                                onFocus={() => setFocused('email')}
                                onBlur={() => setFocused('')}
                            />
                            <button type="submit" style={{ ...primaryBtn(!email.trim()), marginTop: 24 }}>
                                Continue <ArrowRight size={15} />
                            </button>
                        </form>
                    )}

                    {/* ── STEP 2a: Admin password ── */}
                    {step === 'admin-password' && (
                        <form onSubmit={handleAdminLogin}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24,
                                padding: '10px 14px', borderRadius: 10,
                                background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.25)'
                            }}>
                                <ShieldCheck size={15} style={{ color: '#60a5fa', flexShrink: 0 }} />
                                <span style={{ fontSize: 13, color: '#93c5fd' }}>Admin account detected</span>
                            </div>
                            <label style={label}>Password</label>
                            <input
                                id="admin-password"
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                autoFocus
                                placeholder="••••••••"
                                style={inputStyle(focused === 'pw')}
                                onFocus={() => setFocused('pw')}
                                onBlur={() => setFocused('')}
                            />
                            {error && <ErrorBox msg={error} />}
                            <button type="submit" disabled={loading} style={{ ...primaryBtn(loading), marginTop: 24 }}>
                                {loading ? 'Signing in…' : 'Sign In to Dashboard'}
                            </button>
                            <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
                                🔒 Restricted — Administrator only
                            </p>
                        </form>
                    )}

                    {/* ── STEP 2b: Role selection ── */}
                    {step === 'role-select' && (
                        <div>
                            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>
                                Signing in as <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{email}</strong>. Select your role:
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                                <RoleCard
                                    icon={Stethoscope}
                                    title="Doctor"
                                    desc="Submit outbreak reports & manage resources"
                                    color="#3b82f6"
                                    selected={role === 'doctor'}
                                    onClick={() => setRole('doctor')}
                                />
                                <RoleCard
                                    icon={Truck}
                                    title="Mobile Clinic"
                                    desc="Navigate to outbreaks & manage treatment"
                                    color="#10b981"
                                    selected={role === 'van'}
                                    onClick={() => setRole('van')}
                                />
                            </div>
                            <button
                                onClick={() => { if (role) setStep('role-auth'); }}
                                disabled={!role}
                                style={primaryBtn(!role)}
                            >
                                Continue <ArrowRight size={15} />
                            </button>
                        </div>
                    )}

                    {/* ── STEP 3: Role auth (login/signup) ── */}
                    {step === 'role-auth' && (
                        <form onSubmit={handleRoleAuth}>
                            {/* Role badge */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24,
                                padding: '10px 14px', borderRadius: 10,
                                background: role === 'doctor' ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)',
                                border: `1px solid ${role === 'doctor' ? 'rgba(59,130,246,0.25)' : 'rgba(16,185,129,0.25)'}`,
                            }}>
                                {role === 'doctor'
                                    ? <Stethoscope size={15} style={{ color: '#60a5fa' }} />
                                    : <Truck size={15} style={{ color: '#34d399' }} />}
                                <span style={{ fontSize: 13, color: role === 'doctor' ? '#93c5fd' : '#6ee7b7' }}>
                                    {role === 'doctor' ? 'Doctor Dashboard' : 'Mobile Clinic Dashboard'}
                                </span>
                            </div>

                            <label style={label}>Password</label>
                            <input
                                id="role-password"
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                autoFocus
                                placeholder="••••••••"
                                style={inputStyle(focused === 'rpw')}
                                onFocus={() => setFocused('rpw')}
                                onBlur={() => setFocused('')}
                            />

                            {error && <ErrorBox msg={error} />}

                            <button type="submit" disabled={loading}
                                style={{
                                    ...primaryBtn(loading), marginTop: 24,
                                    background: loading ? undefined :
                                        role === 'doctor'
                                            ? 'linear-gradient(135deg, #2563EB, #4f46e5)'
                                            : 'linear-gradient(135deg, #059669, #0d9488)',
                                    boxShadow: loading ? 'none' :
                                        role === 'doctor'
                                            ? '0 0 20px rgba(37,99,235,0.4)'
                                            : '0 0 20px rgba(16,185,129,0.35)',
                                }}>
                                {loading ? (isSignUp ? 'Creating account…' : 'Signing in…')
                                    : (isSignUp ? 'Create Account' : 'Sign In')}
                            </button>

                            {/* Toggle login ↔ signup */}
                            <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
                                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                                <button type="button"
                                    onClick={() => { setIsSignUp(s => !s); setError(''); }}
                                    style={{
                                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                                        color: role === 'doctor' ? '#60a5fa' : '#34d399',
                                        fontSize: 13, fontWeight: 600
                                    }}>
                                    {isSignUp ? 'Sign In' : 'Sign Up'}
                                </button>
                            </p>
                        </form>
                    )}

                </div>

                {/* Footer */}
                <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'rgba(255,255,255,0.18)' }}>
                    Outbreak Sentinel · Rural Health Logistics System
                </p>
            </div>
        </div>
    );
}

function ErrorBox({ msg }) {
    const isSuccess = msg.startsWith('✅');
    return (
        <div style={{
            marginTop: 16, padding: '11px 14px', borderRadius: 10,
            background: isSuccess ? 'rgba(34,197,94,0.1)' : 'rgba(220,38,38,0.1)',
            border: `1px solid ${isSuccess ? 'rgba(34,197,94,0.25)' : 'rgba(220,38,38,0.25)'}`,
            color: isSuccess ? '#86efac' : '#fca5a5',
            fontSize: 13,
        }}>
            {msg}
        </div>
    );
}

