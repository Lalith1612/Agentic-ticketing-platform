import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Sun, Moon, User, LogOut, Film, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import ChatBot from '@/components/ChatBot';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Navbar() {
  const { isDark, toggle } = useTheme();
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // ✅ Chatbot state
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      <header
        data-testid="navbar"
        className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border transition-colors duration-300"
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          
          {/* LEFT SECTION */}
          <div className="flex items-center gap-8">
            <Link to="/" data-testid="logo-link" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#F84464] flex items-center justify-center">
                <Film className="w-5 h-5 text-white" />
              </div>
              <span className="font-['Outfit'] font-black text-xl tracking-tight">
                Show<span className="text-[#F84464]">Spot</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <Link
                to="/movies"
                data-testid="nav-movies"
                className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Movies
              </Link>
              <Link
                to="/events"
                data-testid="nav-events"
                className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Events
              </Link>
            </nav>
          </div>

          {/* RIGHT SECTION */}
          <div className="flex items-center gap-3">

            {/* ✅ Chatbot Toggle Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setChatOpen(prev => !prev)}
              className="rounded-full"
              title="Toggle AI Assistant"
            >
              <MessageCircle
                className={`h-5 w-5 transition-colors ${
                  chatOpen ? 'text-indigo-500' : ''
                }`}
              />
            </Button>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              data-testid="theme-toggle"
              className="rounded-full"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            {/* Auth Section */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid="user-menu-btn" className="rounded-full">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="font-semibold">
                    {user?.name}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => navigate('/profile')}
                    data-testid="nav-profile"
                  >
                    <User className="mr-2 h-4 w-4" /> Profile
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => {
                      logout();
                      navigate('/');
                    }}
                    data-testid="logout-btn"
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                onClick={() => navigate('/auth')}
                data-testid="login-btn"
                className="bg-[#F84464] hover:bg-[#E03C5A] text-white rounded-lg font-bold text-sm px-5"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* ✅ ChatBot Component */}
      <ChatBot externalOpen={chatOpen} setExternalOpen={setChatOpen} />
    </>
  );
}