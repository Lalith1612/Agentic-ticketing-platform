import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { User, MapPin, Clock, Film, Ticket, LogOut, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';

export default function ProfilePage() {
  const { user, logout, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  useEffect(() => {
    if (!isAuthenticated && !loading) { navigate('/auth'); return; }
    if (isAuthenticated) {
      api.get('/bookings')
        .then(r => setBookings(r.data))
        .catch(() => {})
        .finally(() => setLoadingBookings(false));
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!isAuthenticated) return null;

  return (
    <div data-testid="profile-page" className="max-w-4xl mx-auto px-4 md:px-8 py-8 animate-fade-in">
      {/* Profile Header */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#F84464] flex items-center justify-center text-white">
            <User className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h1 className="font-['Outfit'] font-bold text-2xl">{user?.name}</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            {user?.city && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{user.city}</p>}
          </div>
          <Button
            variant="outline"
            onClick={() => { logout(); navigate('/'); }}
            data-testid="profile-logout-btn"
          >
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </div>

      {/* Booking History */}
      <h2 className="font-['Outfit'] font-bold text-xl mb-4 flex items-center gap-2">
        <Ticket className="w-5 h-5 text-[#F84464]" /> Booking History
      </h2>

      {loadingBookings ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <Film className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground">No bookings yet</p>
          <Button onClick={() => navigate('/movies')} className="mt-4 bg-[#F84464] hover:bg-[#E03C5A] text-white font-bold">
            Browse Movies
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map(b => (
            <div
              key={b.id}
              data-testid={`booking-card-${b.id}`}
              onClick={() => navigate(`/ticket/${b.id}`)}
              className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-[#F84464]/40 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4">
                {b.movie_poster && (
                  <img src={b.movie_poster} alt="" className="w-14 h-20 rounded-lg object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <h3 className="font-['Outfit'] font-bold text-base truncate">{b.movie_title}</h3>
                    <Badge className={b.status === 'confirmed' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}>
                      {b.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{b.theatre_name}, {b.theatre_city}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{b.show_date}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{b.show_time}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-muted-foreground">Seats: {b.seats?.join(', ')}</p>
                    <p className="font-['Outfit'] font-bold text-sm">Rs. {b.total_price}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
