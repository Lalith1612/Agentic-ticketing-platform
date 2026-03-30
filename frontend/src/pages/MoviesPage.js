import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import MovieCard from '@/components/MovieCard';
import api from '@/lib/api';

const GENRES    = ['All','Sci-Fi','Action','Drama','Romance','Horror','Comedy','Thriller','Fantasy','Adventure','Mythology'];
const LANGUAGES = ['All','English','Hindi','Telugu','Kannada'];

export default function MoviesPage() {
  const [movies, setMovies]     = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [genre, setGenre]       = useState('All');
  const [language, setLanguage] = useState('All');
  const [search, setSearch]     = useState('');
  const [searchParams]          = useSearchParams();

  useEffect(() => {
    const q = searchParams.get('search') || '';
    setSearch(q);
    api.get('/movies').then(r => { setMovies(r.data); setFiltered(r.data); }).catch(() => {});
  }, [searchParams]);

  useEffect(() => {
    let result = movies;
    if (genre    !== 'All') result = result.filter(m => m.genre?.includes(genre));
    if (language !== 'All') result = result.filter(m => m.language === language);
    if (search)             result = result.filter(m => m.title.toLowerCase().includes(search.toLowerCase()));
    setFiltered(result);
  }, [movies, genre, language, search]);

  return (
    <div data-testid="movies-page" className="max-w-7xl mx-auto px-4 md:px-8 py-8">

      {/* Page header */}
      <div className="mb-8">
        <h1 className="font-['Outfit'] font-black text-3xl sm:text-4xl tracking-tight">Movies</h1>
        <p className="text-muted-foreground text-sm mt-1">{filtered.length} movies available</p>
      </div>

      {/* Filters */}
      <div className="space-y-5 mb-10 p-5 bg-card border border-border rounded-2xl">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="movies-search"
            placeholder="Search movies..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>

        {/* Genre */}
        <div>
          <p className="text-xs font-bold tracking-[0.1em] uppercase text-muted-foreground mb-2.5 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3 h-3" /> Genre
          </p>
          <div className="flex flex-wrap gap-2">
            {GENRES.map(g => (
              <Badge
                key={g}
                data-testid={`genre-${g}`}
                variant={genre === g ? 'default' : 'outline'}
                className={`cursor-pointer transition-all rounded-xl ${
                  genre === g
                    ? 'bg-[#F84464] hover:bg-[#E03C5A] text-white border-transparent'
                    : 'hover:border-[#F84464] hover:text-[#F84464]'
                }`}
                onClick={() => setGenre(g)}
              >
                {g}
              </Badge>
            ))}
          </div>
        </div>

        {/* Language */}
        <div>
          <p className="text-xs font-bold tracking-[0.1em] uppercase text-muted-foreground mb-2.5">Language</p>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map(l => (
              <Badge
                key={l}
                data-testid={`lang-${l}`}
                variant={language === l ? 'default' : 'outline'}
                className={`cursor-pointer transition-all rounded-xl ${
                  language === l
                    ? 'bg-[#F84464] hover:bg-[#E03C5A] text-white border-transparent'
                    : 'hover:border-[#F84464] hover:text-[#F84464]'
                }`}
                onClick={() => setLanguage(l)}
              >
                {l}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Movie grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-5 stagger-children">
          {filtered.map((m, i) => <MovieCard key={m.id} movie={m} index={i} />)}
        </div>
      ) : (
        <div className="text-center py-20 bg-card border border-border rounded-2xl">
          <SlidersHorizontal className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-semibold text-muted-foreground">No movies match your filters</p>
          <p className="text-xs text-muted-foreground mt-1">Try clearing a filter or searching differently</p>
        </div>
      )}
    </div>
  );
}
