import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Film, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthPage() {
  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regCity, setRegCity] = useState('Mumbai');

  useEffect(() => {
    if (isAuthenticated) navigate('/');
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;
    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword) return;
    if (regPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register(regName, regEmail, regPassword, regCity);
      toast.success('Account created!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="auth-page" className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#F84464] flex items-center justify-center mx-auto mb-4">
            <Film className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-['Outfit'] font-black text-3xl tracking-tight">
            Welcome to <span className="text-[#F84464]">ShowSpot</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">Sign in to book tickets</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" data-testid="login-tab">Sign In</TabsTrigger>
              <TabsTrigger value="register" data-testid="register-tab">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" name="email" type="email" required data-testid="login-email" placeholder="you@example.com" className="mt-1" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative mt-1">
                    <Input id="login-password" name="password" type={showPw ? 'text' : 'password'} required data-testid="login-password" placeholder="Enter password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={loading} data-testid="login-submit" className="w-full bg-[#F84464] hover:bg-[#E03C5A] text-white font-bold h-11">
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Sign In'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <Label htmlFor="reg-name">Full Name</Label>
                  <Input id="reg-name" name="name" required data-testid="register-name" placeholder="John Doe" className="mt-1" value={regName} onChange={e => setRegName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="reg-email">Email</Label>
                  <Input id="reg-email" name="email" type="email" required data-testid="register-email" placeholder="you@example.com" className="mt-1" value={regEmail} onChange={e => setRegEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="reg-password">Password</Label>
                  <Input id="reg-password" name="password" type="password" required data-testid="register-password" placeholder="Min 6 characters" className="mt-1" value={regPassword} onChange={e => setRegPassword(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="reg-city">City</Label>
                  <Input id="reg-city" name="city" data-testid="register-city" placeholder="Mumbai" className="mt-1" value={regCity} onChange={e => setRegCity(e.target.value)} />
                </div>
                <Button type="submit" disabled={loading} data-testid="register-submit" className="w-full bg-[#F84464] hover:bg-[#E03C5A] text-white font-bold h-11">
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
