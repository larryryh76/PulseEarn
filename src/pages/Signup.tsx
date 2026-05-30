import React, { useState, useMemo } from 'react';
import MainLayout from '../layouts/MainLayout';
import Button from '../components/ui/Button';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { ShieldCheck, User, Mail, Lock, UserPlus, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils';

const Signup: React.FC = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    referralCode: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();

  const passwordStrength = useMemo(() => {
    const pass = formData.password;
    if (!pass) return 0;
    let strength = 0;
    if (pass.length >= 8) strength += 25;
    if (/[A-Z]/.test(pass)) strength += 25;
    if (/[0-9]/.test(pass)) strength += 25;
    if (/[^A-Za-z0-9]/.test(pass)) strength += 25;
    return strength;
  }, [formData.password]);

  const handleAuthError = (error: any) => {
    const code = error.code || '';
    if (code === 'auth/email-already-in-use') return 'This email is already in use. Please log in instead.';
    if (code === 'auth/weak-password') return 'Password is too weak. Please use at least 6 characters.';
    if (code === 'auth/invalid-email') return 'Please enter a valid email address.';
    if (code === 'auth/network-request-failed') return 'Network error. Please check your internet connection.';
    return 'An error occurred during signup. Please try again.';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username || !formData.email || !formData.password) {
      return toast.error('Please fill in all required fields.');
    }
    if (formData.password !== formData.confirmPassword) {
      return toast.error('Passwords do not match.');
    }
    if (passwordStrength < 50) {
      return toast.error('Please use a stronger password.');
    }

    try {
      setIsSubmitting(true);
      await signup(formData.email, formData.password, formData.username, formData.referralCode);
      toast.success('Registration successful! Please verify your email.');
      navigate('/dashboard'); // Will be intercepted by verification check if needed
    } catch (error: any) {
      console.error(error);
      toast.error(handleAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen flex items-center justify-center px-6 py-20 relative overflow-hidden">
        {/* Background depth */}
        <div className="absolute inset-0 -z-10">
           <div className="absolute top-1/4 left-1/4 w-[35rem] h-[30rem] bg-primary/10 rounded-full blur-[160px]" />
           <div className="absolute bottom-1/4 right-1/4 w-[35rem] h-[30rem] bg-accent/5 rounded-full blur-[160px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <div className="glass-card p-8 md:p-12 rounded-[2.5rem] border-white/[0.08] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent" />

            <div className="flex flex-col items-center text-center mb-10">
               <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 shadow-xl">
                  <UserPlus className="text-primary" size={32} />
               </div>
               <h1 className="text-3xl font-bold mb-2 tracking-tight text-white">Create Account</h1>
               <p className="text-white/40 text-sm font-medium">Join PulseEarn and start earning rewards</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Username</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    name="username"
                    placeholder="Choose a username"
                    value={formData.username}
                    onChange={handleChange}
                    className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-primary/50 focus:bg-white/[0.04] transition-all font-medium"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Email</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    name="email"
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-primary/50 focus:bg-white/[0.04] transition-all font-medium"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Password</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl pl-12 pr-12 py-4 text-sm text-white focus:outline-none focus:border-primary/50 focus:bg-white/[0.04] transition-all font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Strength Meter */}
                {formData.password && (
                  <div className="px-1 pt-1.5 space-y-1.5">
                    <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-white/20">
                       <span>Security Strength</span>
                       <span className={cn(
                          passwordStrength <= 25 ? "text-danger" :
                          passwordStrength <= 50 ? "text-orange-500" :
                          passwordStrength <= 75 ? "text-primary" : "text-success"
                       )}>
                          {passwordStrength <= 25 ? 'Weak' :
                           passwordStrength <= 50 ? 'Fair' :
                           passwordStrength <= 75 ? 'Good' : 'Strong'}
                       </span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden flex gap-0.5">
                       <div className={cn("h-full transition-all duration-500", passwordStrength >= 25 ? "bg-danger" : "bg-transparent")} style={{ width: '25%' }} />
                       <div className={cn("h-full transition-all duration-500", passwordStrength >= 50 ? "bg-orange-500" : "bg-transparent")} style={{ width: '25%' }} />
                       <div className={cn("h-full transition-all duration-500", passwordStrength >= 75 ? "bg-primary" : "bg-transparent")} style={{ width: '25%' }} />
                       <div className={cn("h-full transition-all duration-500", passwordStrength >= 100 ? "bg-success" : "bg-transparent")} style={{ width: '25%' }} />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Confirm Password</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="Repeat your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-primary/50 focus:bg-white/[0.04] transition-all font-medium"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between items-center px-1">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-white/30">Referral Code</label>
                   <span className="text-[8px] font-bold text-white/10 uppercase tracking-widest">Optional</span>
                </div>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors">
                    <ShieldCheck size={18} />
                  </div>
                  <input
                    type="text"
                    name="referralCode"
                    placeholder="PULSE-XXXX"
                    value={formData.referralCode}
                    onChange={handleChange}
                    className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-primary/50 focus:bg-white/[0.04] transition-all font-mono"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full py-4 rounded-xl shadow-lg text-xs uppercase tracking-widest font-bold mt-4" disabled={isSubmitting} glow>
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                     <Loader2 className="animate-spin" size={16} />
                     Creating Account...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                     Create Account
                     <ArrowRight size={16} />
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-8 pt-8 border-t border-white/[0.05] space-y-6">
              <div className="flex flex-col gap-4 items-center">
                <p className="text-white/40 text-xs font-medium text-center">
                  By signing up, you agree to our <span className="text-white/60 underline cursor-pointer">Terms</span> and <span className="text-white/60 underline cursor-pointer">Privacy Policy</span>
                </p>
                <p className="text-white/40 text-xs font-medium">
                  Already have an account? <Link to="/login" className="text-primary hover:text-accent transition-colors font-bold ml-1">Log in</Link>
                </p>
                <Link to="/" className="text-white/20 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest">Back to Home</Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default Signup;
