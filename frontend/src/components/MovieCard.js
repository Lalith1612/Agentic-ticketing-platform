import { useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';

export default function MovieCard({ movie, index }) {
  const navigate = useNavigate();

  return (
    <div
      data-testid={`movie-card-${movie.id}`}
      onClick={() => navigate(`/movies/${movie.id}`)}
      className="group flex flex-col overflow-hidden rounded-2xl bg-card border border-border shadow-sm hover:-translate-y-1 hover:shadow-xl transition-all duration-300 cursor-pointer animate-fade-in-up"
      style={{ animationDelay: `${(index || 0) * 60}ms`, animationFillMode: 'both' }}
    >
      {/* Poster — fixed aspect ratio, no overflow into text */}
      <div className="aspect-[2/3] overflow-hidden shrink-0">
        <img
          src={movie.poster}
          alt={movie.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      </div>

      {/* Info — sits below poster, never overlaps */}
      <div className="flex flex-col flex-1 p-3 gap-1 bg-card">
        <h3 className="font-['Outfit'] font-bold text-sm leading-tight line-clamp-2">{movie.title}</h3>
        <p className="text-[11px] text-muted-foreground leading-tight">
          {movie.genre?.slice(0, 2).join(' / ')} · {movie.language}
        </p>
        <div className="flex items-center gap-1 mt-auto pt-1">
          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 shrink-0" />
          <span className="text-[11px] font-bold text-yellow-400">{movie.rating}</span>
        </div>
      </div>
    </div>
  );
}
