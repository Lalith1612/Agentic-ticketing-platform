import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Film, MapPin, Calendar, Clock, Armchair, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBooking } from '@/contexts/BookingContext';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useState } from 'react';

export default function PaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = location.state;
  const { selectedShow: ctxShow, selectedSeats: ctxSeats, totalPrice: ctxTotal, setCurrentBooking } = useBooking();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);

  const showData = navState?.show || ctxShow;
  const seats    = navState?.seats || ctxSeats || [];
  const total    = navState?.total || ctxTotal || 0;
  const showId   = navState?.showId || showData?.id;

  if (!showData || !seats.length) {
    return (
      <div data-testid="payment-page" className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground mb-4">No booking in progress</p>
        <Button onClick={() => navigate('/movies')} className="bg-[#F84464] hover:bg-[#E03C5A] text-white font-bold">
          Browse Movies
        </Button>
      </div>
    );
  }

  const movie   = showData?.movie;
  const theatre = showData?.theatre;

  const getCategoryForSeat = (seatId) => {
    const row = seatId[0];
    if ('ABC'.includes(row))  return { label: 'Platinum', color: 'text-yellow-400' };
    if ('DEFG'.includes(row)) return { label: 'Gold',     color: 'text-amber-500' };
    return                           { label: 'Silver',   color: 'text-slate-400' };
  };

  const handleConfirmBooking = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in first');
      navigate('/auth');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/bookings', { show_id: showId, seats });
      setCurrentBooking(res.data);
      toast.success('Booking confirmed! 🎉');
      navigate(`/ticket/${res.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // group seats by category for nicer display
  const seatsByCategory = seats.reduce((acc, s) => {
    const cat = getCategoryForSeat(s).label;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  return (
    <div data-testid="payment-page" className="max-w-2xl mx-auto px-4 md:px-8 py-8 animate-fade-in">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6" data-testid="payment-back-btn">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>

      <h1 className="font-['Outfit'] font-black text-3xl tracking-tight mb-2">Order Summary</h1>
      <p className="text-muted-foreground mb-8 text-sm">Review your booking details before confirming</p>

      {/* Booking Card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">

        {/* Movie Header */}
        <div className="bg-gradient-to-r from-[#F84464]/20 to-transparent p-6 border-b border-border">
          <div className="flex gap-4">
            {movie?.poster && (
              <img src={movie.poster} alt={movie.title} className="w-20 h-28 rounded-xl object-cover shadow-md" />
            )}
            <div className="flex-1">
              <h2 className="font-['Outfit'] font-bold text-xl" data-testid="payment-movie-title">{movie?.title}</h2>
              <div className="space-y-1.5 mt-3">
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 text-[#F84464]" />
                  <span>{theatre?.name}, {theatre?.city}</span>
                </p>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5 text-[#F84464]" />
                  <span>{showData.date}</span>
                </p>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 text-[#F84464]" />
                  <span>{showData.time}</span>
                </p>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Film className="w-3.5 h-3.5 text-[#F84464]" />
                  <span>Screen {showData.screen}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Seats */}
        <div className="p-6 border-b border-border">
          <p className="text-xs font-bold tracking-[0.1em] uppercase text-muted-foreground mb-3 flex items-center gap-2">
            <Armchair className="w-3.5 h-3.5" /> Selected Seats ({seats.length})
          </p>
          <div className="space-y-2">
            {Object.entries(seatsByCategory).map(([cat, catSeats]) => (
              <div key={cat} className="flex items-center gap-3">
                <span className={`text-xs font-bold w-16 ${getCategoryForSeat(catSeats[0]).color}`}>{cat}</span>
                <div className="flex flex-wrap gap-1.5">
                  {catSeats.sort().map(s => (
                    <span key={s} className="bg-[#F84464]/10 text-[#F84464] px-2.5 py-1 rounded-lg text-xs font-bold">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="p-6 space-y-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" />Subtotal ({seats.length} tickets)</span>
            <span>Rs. {total}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Convenience Fee</span>
            <span className="text-green-500 font-semibold">Free</span>
          </div>
          <div className="border-t border-dashed border-border pt-3 flex items-center justify-between">
            <span className="font-bold text-base">Total Payable</span>
            <span className="font-['Outfit'] font-black text-2xl" data-testid="payment-total">Rs. {total}</span>
          </div>
        </div>
      </div>

      {/* Confirm Button */}
      <div className="mt-8 space-y-3">
        <Button
          onClick={handleConfirmBooking}
          disabled={loading}
          data-testid="confirm-booking-btn"
          className="w-full h-14 bg-[#F84464] hover:bg-[#E03C5A] text-white font-bold text-base rounded-xl shadow-lg shadow-[#F84464]/20 transition-all hover:scale-[1.01]"
        >
          {loading ? (
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Confirming your booking…</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5" />
              <span>Confirm Booking</span>
            </div>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          By confirming, you agree to ShowSpot's booking terms. No payment required for now.
        </p>
      </div>
    </div>
  );
}
