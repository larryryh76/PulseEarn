import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, Loader2, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'
import { mapAuthError } from '../../utils/errors'
import { PSEMineWordmark } from '../../components/psemine/PSEMineWordmark'
import './psemine.css'

export default function PSEmineAuth() {
  const location = useLocation()
  const navigate = useNavigate()
  const isSignup = location.pathname.endsWith('signup')
  const { login, signup, signInWithGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!email || !password || (isSignup && !username)) return toast.error('Complete the required fields.')
    setSubmitting(true)
    try {
      if (isSignup) await signup(email, password, username, undefined, 'psemine')
      else await login(email, password)
      navigate('/mine/app', { replace: true })
    } catch (error) { toast.error(mapAuthError(error)) } finally { setSubmitting(false) }
  }

  const google = async () => {
    setSubmitting(true)
    try { await signInWithGoogle(); navigate('/mine/app') } catch (error) { toast.error(mapAuthError(error)) } finally { setSubmitting(false) }
  }

  return <main className="psemine-auth-page"><div className="psemine-auth-card"><Link to="/mine" className="psemine-auth-brand"><PSEMineWordmark /></Link><div className="psemine-auth-heading"><span className="psemine-eyebrow">PSEmine campaign access</span><h1>{isSignup ? 'Start with a clear path.' : 'Welcome back.'}</h1><p>{isSignup ? 'Create your account, then complete wallet onboarding before campaign participation.' : 'Sign in to continue to your campaign workspace.'}</p></div><button className="psemine-auth-google" onClick={google} disabled={submitting}>Continue with Google</button><div className="psemine-auth-divider">or use email</div><form onSubmit={submit} className="psemine-auth-form">{isSignup && <label>Display name<input value={username} onChange={e => setUsername(e.target.value)} autoComplete="name" /></label>}<label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></label><label>Password<div className="psemine-password"><input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete={isSignup ? 'new-password' : 'current-password'} /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff /> : <Eye />}</button></div></label><button className="psemine-button psemine-button-primary" disabled={submitting}>{submitting ? <Loader2 className="psemine-spin" /> : <ArrowRight />} {isSignup ? 'Create PSEmine account' : 'Sign in'}</button></form><div className="psemine-auth-footer"><ShieldCheck /> Secure Firebase authentication · <Link to={isSignup ? '/mine/login' : '/mine/signup'}>{isSignup ? 'Already have an account?' : 'Create an account'}</Link></div></div></main>
}
