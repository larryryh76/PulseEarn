import React, { useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import Button from '../components/ui/Button';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast, { Toaster } from 'react-hot-toast';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      return toast.error('Please fill in all fields');
    }

    try {
      setIsSubmitting(true);
      await login(email, password);
      toast.success('Logged in successfully!');

      // We don't have userData yet here, so let App.tsx handle the role-based redirect
      // by simply navigating to dashboard (it will auto-redirect admins to pulse-core)
      navigate('/dashboard');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to login');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <Toaster position="top-right" />
      <div className="min-h-[80vh] flex items-center justify-center px-6">
        <div className="max-w-md w-full glass p-10 rounded-[2rem] border-white/10 text-center">
          <h1 className="text-4xl font-bold mb-6">Welcome Back</h1>
          <p className="text-white/60 mb-10">Sign in to manage your PulseEarn dashboard.</p>

          <form onSubmit={handleSubmit} className="space-y-4 mb-8 text-left">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2 ml-1">Email</label>
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2 ml-1">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                required
              />
            </div>
            <Button type="submit" className="w-full mt-4 py-4" disabled={isSubmitting}>
              {isSubmitting ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <p className="text-white/40 text-sm">
            Don't have an account? <Link to="/signup" className="text-primary hover:underline">Sign up</Link>
          </p>

          <div className="mt-8 pt-8 border-t border-white/5 flex flex-col gap-4">
            <Link to="/" className="text-white/40 hover:text-white transition-colors text-sm underline">Back to Home</Link>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Login;
