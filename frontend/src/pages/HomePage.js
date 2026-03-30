import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, MapPin, Calendar, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MovieCard from '@/components/MovieCard';
import api from '@/lib/api';

export default function HomePage() {
  const [movies, setMovies] = useState([]);
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/movies').then(r => setMovies(r.data)).catch(() => {});
    api.get('/events').then(r => setEvents(r.data)).catch(() => {});
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/movies?search=${encodeURIComponent(search.trim())}`);
  };

  return (
    <div data-testid="home-page">

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative h-[460px] sm:h-[520px] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center scale-105"
          style={{ backgroundImage: `url(https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&h=900&fit=crop)` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/65 to-background/10" />

        <div className="relative h-full max-w-7xl mx-auto px-4 md:px-8 flex flex-col justify-end pb-14">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 bg-[#F84464]/10 border border-[#F84464]/20 text-[#F84464] text-xs font-bold px-3 py-1 rounded-full">
              <Zap className="w-3 h-3" /> AI-Powered Booking
            </span>
          </div>
          <h1
            data-testid="hero-title"
            className="font-['Outfit'] font-black text-4xl sm:text-5xl lg:text-6xl tracking-tight mb-4 leading-tight"
          >
            Your Gateway to<br />
            <span className="text-[#F84464]">Entertainment</span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-lg mb-7">
            Book movie tickets, live events & more — powered by AI for an effortless experience.
          </p>
          <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                data-testid="hero-search"
                placeholder="Search movies, events..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 h-12 bg-card/80 backdrop-blur-md border-border rounded-xl"
              />
            </div>
            <Button
              type="submit"
              data-testid="hero-search-btn"
              className="bg-[#F84464] hover:bg-[#E03C5A] text-white h-12 px-6 font-bold rounded-xl"
            >
              Search
            </Button>
          </form>
        </div>
      </section>

      {/* ── Now Showing ────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-['Outfit'] font-bold text-2xl sm:text-3xl tracking-tight">Now Showing</h2>
            <p className="text-sm text-muted-foreground mt-1">Book your favourite movies</p>
          </div>
          <Button
            variant="ghost"
            onClick={() => navigate('/movies')}
            data-testid="see-all-movies"
            className="text-[#F84464] hover:text-[#E03C5A] font-bold"
          >
            See All <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-5 stagger-children">
          {movies.slice(0, 5).map((m, i) => (
            <MovieCard key={m.id} movie={m} index={i} />
          ))}
        </div>
      </section>

      {/* ── Trending Now ───────────────────────────────────────────────────── */}
      {movies.length > 5 && (
        <section className="max-w-7xl mx-auto px-4 md:px-8 pb-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-['Outfit'] font-bold text-2xl sm:text-3xl tracking-tight">Trending Now</h2>
              <p className="text-sm text-muted-foreground mt-1">Popular picks this week</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-5 stagger-children">
            {movies.slice(5).map((m, i) => (
              <MovieCard key={m.id} movie={m} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* ── Upcoming Events ────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 pb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-['Outfit'] font-bold text-2xl sm:text-3xl tracking-tight">Upcoming Events</h2>
            <p className="text-sm text-muted-foreground mt-1">Concerts, comedy & more</p>
          </div>
          <Button
            variant="ghost"
            onClick={() => navigate('/events')}
            data-testid="see-all-events"
            className="text-[#F84464] hover:text-[#E03C5A] font-bold"
          >
            See All <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 stagger-children">
          {events.map((ev, i) => (
            <div
              key={ev.id}
              data-testid={`event-card-${ev.id}`}
              className="group flex flex-col overflow-hidden rounded-2xl bg-card border border-border shadow-sm hover:-translate-y-1 hover:shadow-xl transition-all duration-300 cursor-pointer animate-fade-in-up"
              style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}
            >
              <div className="aspect-[16/9] overflow-hidden shrink-0">
                <img
                  src={ev.poster}
                  alt={ev.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <div className="flex flex-col flex-1 p-4">
                <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-[#F84464] mb-1">
                  {ev.type}
                </span>
                <h3 className="font-['Outfit'] font-bold text-sm leading-tight line-clamp-2 mb-2">
                  {ev.title}
                </h3>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-auto text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{ev.date}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{ev.city}</span>
                </div>
                <p className="text-xs font-bold text-[#F84464] mt-2">Rs. {ev.price_range}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
