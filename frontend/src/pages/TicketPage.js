import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, Film, MapPin, Calendar, Clock, Armchair, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import api from '@/lib/api';

export default function TicketPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const ticketRef = useRef(null);

  useEffect(() => {
    api.get(`/bookings/${bookingId}`)
      .then(r => setBooking(r.data))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [bookingId, navigate]);

  const downloadTicket = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const element = ticketRef.current;
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#0F172A',
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pdfWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`ShowSpot-Ticket-${booking.ticket_id}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!booking) return null;

  return (
    <div data-testid="ticket-page" className="max-w-2xl mx-auto px-4 md:px-8 py-8 animate-fade-in">
      <div className="text-center mb-8">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="font-['Outfit'] font-black text-3xl tracking-tight">Booking Confirmed!</h1>
        <p className="text-muted-foreground mt-2">Your ticket has been generated</p>
      </div>

      {/* Ticket Card */}
      <div
        ref={ticketRef}
        data-testid="ticket-card"
        className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl"
      >
        {/* Header */}
        <div className="bg-[#F84464] px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Film className="w-5 h-5" />
              <span className="font-['Outfit'] font-black text-lg">ShowSpot</span>
            </div>
            <span className="text-xs font-bold opacity-80">{booking.ticket_id}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <h2 className="font-['Outfit'] font-black text-2xl mb-4">{booking.movie_title}</h2>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-xs font-bold tracking-[0.1em] uppercase text-muted-foreground">Theatre</p>
              <p className="text-sm font-semibold mt-1">{booking.theatre_name}</p>
              <p className="text-xs text-muted-foreground">{booking.theatre_city}</p>
            </div>
            <div>
              <p className="text-xs font-bold tracking-[0.1em] uppercase text-muted-foreground">Screen</p>
              <p className="text-sm font-semibold mt-1">Screen {booking.screen}</p>
            </div>
            <div>
              <p className="text-xs font-bold tracking-[0.1em] uppercase text-muted-foreground">Date</p>
              <p className="text-sm font-semibold mt-1">{booking.show_date}</p>
            </div>
            <div>
              <p className="text-xs font-bold tracking-[0.1em] uppercase text-muted-foreground">Time</p>
              <p className="text-sm font-semibold mt-1">{booking.show_time}</p>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-xs font-bold tracking-[0.1em] uppercase text-muted-foreground mb-2">Seats</p>
            <div className="flex flex-wrap gap-2">
              {booking.seats?.map(s => (
                <span key={s} className="bg-[#F84464]/10 text-[#F84464] px-3 py-1 rounded-lg text-sm font-bold">{s}</span>
              ))}
            </div>
          </div>

          <div className="border-t border-dashed border-border pt-4 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold tracking-[0.1em] uppercase text-muted-foreground">Total Amount</p>
              <p className="font-['Outfit'] font-black text-2xl mt-1">Rs. {booking.total_price}</p>
              <p className="text-xs text-muted-foreground mt-1">Booking ID: {booking.id}</p>
            </div>
            <div className="bg-white p-2 rounded-lg">
              <QRCodeSVG value={`showspot://ticket/${booking.id}`} size={80} />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        <Button
          onClick={downloadTicket}
          data-testid="download-ticket-btn"
          className="flex-1 bg-[#F84464] hover:bg-[#E03C5A] text-white font-bold h-12"
        >
          <Download className="w-5 h-5 mr-2" /> Download PDF
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate('/')}
          data-testid="back-home-btn"
          className="flex-1 h-12 font-bold"
        >
          Back to Home
        </Button>
      </div>
    </div>
  );
}
