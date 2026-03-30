import { useState, useEffect } from 'react';
import { MapPin, Calendar, Clock } from 'lucide-react';
import api from '@/lib/api';

export default function EventsPage() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    api.get('/events').then(r => setEvents(r.data)).catch(() => {});
  }, []);

  return (
    <div data-testid="events-page" className="max-w-7xl mx-auto px-4 md:px-8 py-8 animate-fade-in">
      <h1 className="font-['Outfit'] font-black text-3xl sm:text-4xl tracking-tight mb-2">Events</h1>
      <p className="text-muted-foreground mb-8">Concerts, comedy shows, festivals & more</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
        {events.map((ev, i) => (
          <div
            key={ev.id}
            data-testid={`event-card-${ev.id}`}
            className="group overflow-hidden rounded-xl bg-card border border-border shadow-sm hover:-translate-y-1 hover:shadow-xl transition-all duration-300 animate-fade-in-up"
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}
          >
            <div className="aspect-[16/10] overflow-hidden">
              <img src={ev.poster} alt={ev.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
            </div>
            <div className="p-5">
              <span className="text-xs font-bold tracking-[0.1em] uppercase text-[#F84464]">{ev.type}</span>
              <h3 className="font-['Outfit'] font-bold text-lg mt-1">{ev.title}</h3>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{ev.description}</p>
              <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{ev.date}</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{ev.time}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{ev.venue}, {ev.city}</span>
              </div>
              <p className="mt-3 text-sm font-bold text-[#F84464]">Rs. {ev.price_range}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
