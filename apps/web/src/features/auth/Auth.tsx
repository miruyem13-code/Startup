import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { ArrowUpRight, Bike, ArrowLeft, LockKeyhole } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Logo } from '../../../../../packages/ui';
import { loginSchema, registerSchema } from '../../../../../packages/shared/schemas';
import { api, setCsrf, type SessionData } from '../../lib/api';
import { useSession } from '../../lib/hooks';
export default function AuthPage({ mode }: { mode: 'login' | 'register' | 'forgot' }) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const { data: session } = useSession();
  const [search] = useSearchParams();
  const resetToken = search.get('token');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [devToken, setDevToken] = useState('');
  const reset = mode === 'forgot' && !!resetToken;
  const schema =
    mode === 'register'
      ? registerSchema
      : mode === 'forgot'
        ? z.object({ email: z.email(), password: z.string().optional() })
        : loginSchema;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ name?: string; email: string; password: string }>({
    resolver: zodResolver(schema) as never,
  });
  async function submit(values: { name?: string; email: string; password: string }) {
    setPending(true);
    setError('');
    try {
      if (mode === 'forgot') {
        if (reset) {
          await api('/auth/reset', { token: resetToken, password: values.password });
          setMessage('Password updated. You can now sign in.');
        } else {
          const result = await api<{ message: string; devToken?: string }>('/auth/forgot', {
            email: values.email,
          });
          setMessage(result.message);
          setDevToken(result.devToken || '');
        }
      } else {
        const result = await api<SessionData>(`/auth/${mode}`, values);
        setCsrf(result.csrf);
        client.setQueryData(['session'], result);
        await client.invalidateQueries();
        const to = search.get('next');
        navigate(
          to?.startsWith('/') && !to.startsWith('//')
            ? to
            : result.user?.role === 'ADMIN'
              ? '/admin'
              : result.user?.role === 'BUSINESS_ADMIN'
                ? '/business/dashboard'
                : '/dashboard',
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  async function demo() {
    setPending(true);
    setError('');
    try {
      const result = await api<SessionData>('/auth/demo', {});
      setCsrf(result.csrf);
      client.setQueryData(['session'], result);
      await client.invalidateQueries();
      navigate('/dashboard');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="auth-page">
      <div className="auth-story">
        <Link to="/">
          <Logo />
        </Link>
        <div>
          <span className="eyebrow">A LITTLE MOVEMENT. A LOT OF POSSIBILITY.</span>
          <h1>
            Good things
            <br />
            are just around
            <br />
            <em>the corner.</em>
          </h1>
          <p>
            Two wheels, an open city, and a little curiosity.
            <br />
            Your next adventure starts here.
          </p>
          <Bike size={150} strokeWidth={0.8} />
        </div>
        <span>TASHKENT PILOT · SIMULATED OPERATIONS</span>
      </div>
      <div className="auth-form-wrap">
        <Link to="/" className="back-link">
          <ArrowLeft size={16} /> Back to the city
        </Link>
        <div className="auth-form">
          <span className="auth-icon">
            <LockKeyhole size={24} />
          </span>
          <h1>
            {mode === 'login'
              ? 'Welcome back.'
              : mode === 'register'
                ? 'A new chapter starts here.'
                : reset
                  ? 'Choose a new password.'
                  : 'Let’s get you back on the road.'}
          </h1>
          <p>
            {mode === 'login'
              ? 'Your city is waiting. Sign in to pick up where you left off.'
              : mode === 'register'
                ? 'Make a little room for adventure. Create your VELOCITY account.'
                : 'Reset links use a local demo adapter. Email delivery is not connected.'}
          </p>
          <form onSubmit={handleSubmit(submit)}>
            {mode === 'register' && (
              <label>
                Your name
                <input autoComplete="name" {...register('name')} placeholder="Aziz Karimov" />
                {errors.name && <small className="field-error">{errors.name.message}</small>}
              </label>
            )}
            <label>
              Email address
              <input
                type="email"
                autoComplete="email"
                {...register('email')}
                placeholder="you@example.com"
              />
              {errors.email && <small className="field-error">{errors.email.message}</small>}
            </label>
            {(mode !== 'forgot' || reset) && (
              <label>
                Password
                <input
                  type="password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  {...register('password')}
                  placeholder={mode === 'login' ? 'Your password' : 'At least 12 characters'}
                  minLength={mode === 'login' ? 8 : 12}
                  required
                />
                {errors.password && (
                  <small className="field-error">{errors.password.message}</small>
                )}
              </label>
            )}
            {mode === 'login' && (
              <Link to="/forgot-password" className="forgot-link">
                Forgot password?
              </Link>
            )}
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            {message && (
              <div className="form-success" role="status">
                {message}
              </div>
            )}
            {devToken && (
              <Link className="text-link" to={`/forgot-password?token=${devToken}`}>
                Open local reset link →
              </Link>
            )}
            <Button type="submit" busy={pending} className="full-width">
              {mode === 'login'
                ? 'Sign in'
                : mode === 'register'
                  ? 'Create account'
                  : reset
                    ? 'Update password'
                    : 'Request reset'}
              <ArrowUpRight size={17} />
            </Button>
          </form>
          {mode === 'login' && session?.demo && (
            <>
              <div className="form-divider">
                <span>or take a look around</span>
              </div>
              <Button tone="secondary" className="full-width" onClick={demo} busy={pending}>
                <Bike size={18} />
                Explore with a demo account
              </Button>
              <p className="demo-auth-note">
                Rider access only. Operations and business accounts require their own credentials.
              </p>
            </>
          )}
          {mode !== 'forgot' && (
            <p className="auth-switch">
              {mode === 'login' ? 'New to the city?' : 'Already part of the journey?'}{' '}
              <Link to={mode === 'login' ? '/register' : '/login'}>
                {mode === 'login' ? 'Create an account' : 'Sign in'}
              </Link>
            </p>
          )}
          <p className="auth-legal">
            By continuing, you agree to our <Link to="/terms">Terms</Link> and{' '}
            <Link to="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
