import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, Clock, Globe, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';

export default function MovieDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie]               = useState(null);
  const [shows, setShows]               = useState([]);
  const [cities, setCities]             = useState([]);
  const [selectedCity, setSelectedCity] = useState('all');
  const [dates, setDates]               = useState([]);
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    api.get(`/movies/${id}`).then(r => setMovie(r.data)).catch(() => navigate('/movies'));
    api.get(`/shows?movie_id=${id}`).then(r => {
      setShows(r.data);

      // Sort dates strictly ascending so Today is always first
      const uniqueDates = [...new Set(r.data.map(s => s.date))]
        .sort((a, b) => a.localeCompare(b));
      setDates(uniqueDates);
      if (uniqueDates.length) setSelectedDate(uniqueDates[0]);

      const uniqueCities = [...new Set(r.data.map(s => s.theatre_city).filter(Boolean))].sort();
      setCities(uniqueCities);
    }).catch(() => {});
  }, [id, navigate]);

  if (!movie) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const filteredShows = shows.filter(s => {
    if (selectedDate && s.date !== selectedDate) return false;
    if (selectedCity !== 'all' && s.theatre_city?.toLowerCase() !== selectedCity.toLowerCase()) return false;
    return true;
  });

  const groupedByTheatre = filteredShows.reduce((acc, s) => {
    const key = s.theatre_name || s.theatre_id;
    if (!acc[key]) acc[key] = {
      theatre_name: s.theatre_name,
      theatre_city: s.theatre_city,
      theatre_location: s.theatre_location,
      shows: []
    };
    acc[key].shows.push(s);
    return acc;
  }, {});

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.floor((d - today) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <div data-testid="movie-detail-page" className="animate-fade-in">
      {/* Banner */}
      <div className="relative h-[280px] sm:h-[360px] overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${movie.banner})` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-32 relative z-10">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">

          {/* Poster */}
          <div className="w-40 sm:w-52 shrink-0">
            <img src={movie.poster} alt={movie.title}
              className="w-full rounded-2xl shadow-2xl border border-border" />
          </div>

          {/* Info */}
          <div className="flex-1 pt-4 md:pt-20">
            <h1 data-testid="movie-title"
              className="font-['Outfit'] font-black text-3xl sm:text-4xl lg:text-5xl tracking-tight">
              {movie.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <div className="flex items-center gap-1 bg-green-600/20 text-green-400 px-2.5 py-0.5 rounded-lg">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span className="text-sm font-bold">{movie.rating}/10</span>
              </div>
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />{movie.duration}
              </span>
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Globe className="w-3.5 h-3.5" />{movie.language}
              </span>
              <Badge variant="outline" className="font-bold">{movie.certificate}</Badge>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {movie.genre?.map(g => (
                <Badge key={g} className="bg-[#F84464]/10 text-[#F84464] border-[#F84464]/20">{g}</Badge>
              ))}
            </div>
            <p className="text-muted-foreground mt-4 text-sm leading-relaxed max-w-2xl">
              {movie.description}
            </p>
            <div className="mt-4">
              <p className="text-xs font-bold tracking-[0.1em] uppercase text-muted-foreground mb-1">Cast</p>
              <p className="text-sm">{movie.cast?.join(', ')}</p>
            </div>
          </div>
        </div>

        {/* Shows Section */}
        <div className="mt-12 pb-16">
          <h2 className="font-['Outfit'] font-bold text-2xl mb-6">Select Show</h2>

          {/* Date tabs — ascending: Today first, then Tomorrow, then future */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-5" style={{ scrollbarWidth: 'none' }}>
            {dates.map(d => (
              <button
                key={d}
                data-testid={`date-tab-${d}`}
                onClick={() => setSelectedDate(d)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all shrink-0 ${
                  selectedDate === d
                    ? 'bg-[#F84464] text-white shadow-lg shadow-[#F84464]/20'
                    : 'bg-muted hover:bg-muted/80 text-foreground'
                }`}
              >
                {formatDate(d)}
              </button>
            ))}
          </div>

          {/* City filter */}
          <div className="mb-6">
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger data-testid="city-select" className="w-52">
                <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Theatre list */}
          {Object.keys(groupedByTheatre).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(groupedByTheatre).map(([name, data]) => (
                <div key={name}
                  className="bg-card border border-border rounded-2xl p-5 hover:border-[#F84464]/30 transition-colors">
                  <div className="mb-3">
                    <h3 className="font-['Outfit'] font-bold text-base">{data.theatre_name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{data.theatre_location}, {data.theatre_city}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {data.shows
                      .sort((a, b) => a.time.localeCompare(b.time))
                      .map(show => (
                        <Button
                          key={show.id}
                          data-testid={`show-btn-${show.id}`}
                          variant="outline"
                          onClick={() => navigate(`/book/${show.id}`)}
                          className="font-semibold text-sm border-green-500/40 text-green-500 hover:bg-green-500/10 hover:border-green-500 rounded-xl"
                        >
                          {show.time}
                        </Button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-card border border-border rounded-2xl">
              <p className="text-muted-foreground">No shows available for the selected filters</p>
              <p className="text-xs text-muted-foreground mt-2">Try a different date or city</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
