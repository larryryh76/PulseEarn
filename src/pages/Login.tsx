import React from 'react';
import MainLayout from '../layouts/MainLayout';
import Button from '../components/ui/Button';
import { Link } from 'react-router-dom';

const Login: React.FC = () => {
  return (
    <MainLayout>
      <div className="min-h-[80vh] flex items-center justify-center px-6">
        <div className="max-w-md w-full glass p-10 rounded-[2rem] border-white/10 text-center">
          <h1 className="text-4xl font-bold mb-6">Welcome Back</h1>
          <p className="text-white/60 mb-10">Sign in to manage your PulseEarn dashboard.</p>

          <div className="space-y-4 mb-8">
            <input
              type="email"
              placeholder="Email Address"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <Button className="w-full mb-6">Login</Button>

          <p className="text-white/40 text-sm">
            Don't have an account? <Link to="/signup" className="text-primary hover:underline">Sign up</Link>
          </p>

          <div className="mt-8 pt-8 border-t border-white/5">
            <Link to="/" className="text-white/40 hover:text-white transition-colors text-sm underline">Back to Home</Link>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Login;
