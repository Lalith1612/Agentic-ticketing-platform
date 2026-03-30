import { Link } from 'react-router-dom';
import { Film, Mail, Phone, MapPin, Instagram, Twitter, Youtube, Heart } from 'lucide-react';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-card border-t border-border mt-20">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#F84464] flex items-center justify-center">
                <Film className="w-5 h-5 text-white" />
              </div>
              <span className="font-['Outfit'] font-black text-xl tracking-tight">
                Show<span className="text-[#F84464]">Spot</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Book movie tickets, events & experiences — powered by AI for a seamless booking journey.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <a href="#" aria-label="Instagram"
                className="w-8 h-8 rounded-lg bg-muted hover:bg-[#F84464]/10 hover:text-[#F84464] flex items-center justify-center transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" aria-label="Twitter / X"
                className="w-8 h-8 rounded-lg bg-muted hover:bg-[#F84464]/10 hover:text-[#F84464] flex items-center justify-center transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" aria-label="YouTube"
                className="w-8 h-8 rounded-lg bg-muted hover:bg-[#F84464]/10 hover:text-[#F84464] flex items-center justify-center transition-colors">
                <Youtube className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Explore */}
          <div>
            <p className="font-['Outfit'] font-bold text-sm tracking-wider uppercase mb-4">Explore</p>
            <ul className="space-y-2.5">
              {[
                { label: 'Movies',        to: '/movies' },
                { label: 'Events',        to: '/events' },
                { label: 'My Bookings',   to: '/profile' },
                { label: 'Sign In',       to: '/auth' },
              ].map(link => (
                <li key={link.label}>
                  <Link to={link.to}
                    className="text-sm text-muted-foreground hover:text-[#F84464] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="font-['Outfit'] font-bold text-sm tracking-wider uppercase mb-4">Company</p>
            <ul className="space-y-2.5">
              {['About Us', 'Careers', 'Press', 'Terms of Service', 'Privacy Policy'].map(item => (
                <li key={item}>
                  <a href="#"
                    className="text-sm text-muted-foreground hover:text-[#F84464] transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="font-['Outfit'] font-bold text-sm tracking-wider uppercase mb-4">Contact</p>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#F84464] mt-0.5 shrink-0" />
                <span className="text-sm text-muted-foreground">
                  Banjara Hills, Hyderabad,<br />Telangana 500034, India
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#F84464] shrink-0" />
                <a href="mailto:support@showspot.in"
                  className="text-sm text-muted-foreground hover:text-[#F84464] transition-colors">
                  support@showspot.in
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#F84464] shrink-0" />
                <a href="tel:+918008001234"
                  className="text-sm text-muted-foreground hover:text-[#F84464] transition-colors">
                  +91 800 800 1234
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © {year} ShowSpot Technologies Pvt. Ltd. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            Made with <Heart className="w-3 h-3 text-[#F84464] fill-[#F84464]" /> in Hyderabad
          </p>
        </div>
      </div>
    </footer>
  );
}
