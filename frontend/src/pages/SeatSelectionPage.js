import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Film, MapPin, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBooking } from '@/contexts/BookingContext';
import { useAuth } from '@/contexts/AuthContext';
import SeatGrid from '@/components/SeatGrid';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function SeatSelectionPage() {
  const { showId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { setSelectedShow, setSelectedSeats, setTotalPrice, setSelectedMovie } = useBooking();
  const [showData, setShowData] = useState(null);
  const [seatLayout, setSeatLayout] = useState(null);
  const [selected, setSelected] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/shows/${showId}`),
      api.get(`/shows/${showId}/seats`)
    ]).then(([showRes, seatsRes]) => {
      setShowData(showRes.data);
      setSeatLayout(seatsRes.data.layout);
      setPrices(seatsRes.data.prices);
    }).catch(() => {
      toast.error('Failed to load show details');
      navigate('/movies');
    }).finally(() => setLoading(false));
  }, [showId, navigate]);

  const getPrice = (seatId) => {
    const row = seatId[0];
    if ('ABC'.includes(row)) return prices.platinum || 500;
    if ('DEFG'.includes(row)) return prices.gold || 300;
    return prices.silver || 150;
  };

  const toggleSeat = (seatId) => {
    setSelected(prev => {
      if (prev.includes(seatId)) return prev.filter(s => s !== seatId);
      if (prev.length >= 10) { toast.error('Maximum 10 seats per booking'); return prev; }
      return [...prev, seatId];
    });
  };

  const total = selected.reduce((sum, s) => sum + getPrice(s), 0);

  const handleProceed = () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to book tickets');
      navigate('/auth');
      return;
    }
    if (selected.length === 0) {
      toast.error('Please select at least one seat');
      return;
    }
    setSelectedShow(showData);
    setSelectedMovie(showData?.movie);
    setSelectedSeats(selected);
    setTotalPrice(total);
    navigate('/payment', {
      state: { show: showData, seats: selected, total, showId }
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const movie = showData?.movie;
  const theatre = showData?.theatre;

  return (
    <div data-testid="seat-selection-page" className="max-w-7xl mx-auto px-4 md:px-8 py-6 animate-fade-in">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4" data-testid="back-btn">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>

      {/* Show Info */}
      <div className="bg-card border border-border rounded-xl p-4 md:p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {movie?.poster && (
            <img src={movie.poster} alt={movie.title} className="w-16 h-24 rounded-lg object-cover" />
          )}
          <div className="flex-1">
            <h1 className="font-['Outfit'] font-bold text-xl sm:text-2xl" data-testid="show-movie-title">
              {movie?.title}
            </h1>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{theatre?.name}, {theatre?.city}</span>
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{showData?.date}</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{showData?.time}</span>
              <span className="flex items-center gap-1"><Film className="w-3.5 h-3.5" />Screen {showData?.screen}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Seat Grid */}
      <SeatGrid layout={seatLayout} selectedSeats={selected} onToggleSeat={toggleSeat} />

      {/* Summary */}
      {selected.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card/95 glass border-t border-border z-40 animate-slide-up" data-testid="seat-summary">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{selected.length} Ticket(s)</p>
              <p className="text-xs text-muted-foreground mt-0.5">{selected.sort().join(', ')}</p>
            </div>
            <div className="flex items-center gap-4">
              <p className="font-['Outfit'] font-bold text-xl">Rs. {total}</p>
              <Button
                data-testid="proceed-payment-btn"
                onClick={handleProceed}
                className="bg-[#F84464] hover:bg-[#E03C5A] text-white font-bold px-8"
              >
                Proceed
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
