import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X, Send, Bot, Sparkles, Star, MapPin, Calendar, Clock,
  Armchair, CheckCircle2, Ticket, ChevronRight, Mic, MicOff,
  RefreshCw, ArrowRight, MousePointer2, Hand
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';

// ── Session ───────────────────────────────────────────────────────────────────
const SESSION_KEY = 'showspot_session_id';
function getOrCreateSession() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `ss-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

// ── Suggestions ───────────────────────────────────────────────────────────────
const SUGGESTIONS = [
  { icon: '🎬', label: "What's showing?",      text: 'Show me all movies' },
  { icon: '✨', label: 'Recommend something',  text: 'Recommend me a good movie to watch' },
  { icon: '🏟️', label: 'Shows in Hyderabad',  text: 'Find shows in Hyderabad today' },
  { icon: '🎟️', label: 'My bookings',         text: 'Show my recent bookings' },
];

// ── Agent badge metadata ──────────────────────────────────────────────────────
const AGENT_META = {
  search_movies:    { label: 'Movie Discovery',   color: 'text-blue-400',    dot: 'bg-blue-400'    },
  get_shows:        { label: 'Show Selection',    color: 'text-green-400',   dot: 'bg-green-400'   },
  select_seats:     { label: 'Seat Booking',      color: 'text-yellow-400',  dot: 'bg-yellow-400'  },
  confirm_booking:  { label: 'Booking Confirmed', color: 'text-emerald-400', dot: 'bg-emerald-400' },
  recommend_movies: { label: 'Recommendations',  color: 'text-purple-400',  dot: 'bg-purple-400'  },
  view_bookings:    { label: 'Ticket Agent',      color: 'text-orange-400',  dot: 'bg-orange-400'  },
};

const STATE_LABEL = {
  idle:           'Multi-agent booking assistant',
  searching:      '🔍 Movie Discovery Agent…',
  showing_shows:  '🏟️ Show Selection Agent…',
  seat_selection: '💺 Seat Booking Agent…',
  viewing_tickets:'🎟️ Ticket Agent…',
};

// ═══════════════════════════════════════════════════════════════════════
// NEXT STEP HINT — shown after every assistant card
// Maps result type → actionable hint with icon + label + optional tap action
// ═══════════════════════════════════════════════════════════════════════
const NEXT_STEP_MAP = {
  movies: {
    icon: '👆',
    text: 'Tap a movie above to find showtimes',
    sub:  'Or type the movie name + city for faster results',
  },
  recommendations: {
    icon: '👆',
    text: 'Tap a movie above to find showtimes',
    sub:  'Or ask me for a different genre',
  },
  shows: {
    icon: '🕐',
    text: 'Select number of tickets, then tap a showtime',
    sub:  'I\'ll auto-pick the best available seats for you',
  },
  seats_selected: {
    icon: '✅',
    text: 'Tap "Confirm Booking" above to lock in your seats',
    sub:  'Or type "change seats" to pick different ones',
  },
  bookings: {
    icon: '👆',
    text: 'Tap a booking to view your ticket',
    sub:  'Or tap "Book Again" to re-book the same movie',
  },
  booking_confirmed: {
    icon: '🎉',
    text: 'Your ticket is confirmed! Tap "View Ticket" for your QR code',
    sub:  'Want to book another movie?',
  },
  auth_required: {
    icon: '🔐',
    text: 'Sign in to continue your booking',
    sub:  'Your seat selection will be saved',
  },
};

function NextStepHint({ type, onSend }) {
  const hint = NEXT_STEP_MAP[type];
  if (!hint) return null;

  return (
    <div className="mt-3 border-t border-white/5 pt-2.5">
      <div className="flex items-start gap-2">
        <span className="text-sm shrink-0 mt-0.5">{hint.icon}</span>
        <div>
          <p className="text-[11px] font-semibold text-white/80 leading-snug">{hint.text}</p>
          {hint.sub && (
            <p className="text-[10px] text-white/35 mt-0.5 leading-snug">{hint.sub}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// CARD COMPONENTS
// ═════════════════════════════════════════════════════════════

function AgentBadge({ intent }) {
  const m = AGENT_META[intent];
  if (!m) return null;
  return (
    <p className={`text-[9px] font-bold mb-1 flex items-center gap-1 ${m.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </p>
  );
}

// Agent progress bar
function ProgressBar({ steps }) {
  if (!steps?.length || !steps.some(s => s.done)) return null;
  return (
    <div className="px-4 py-2 border-b border-white/5 bg-black/20 shrink-0">
      <div className="flex items-center gap-1">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center gap-1 flex-1 min-w-0">
            <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${
              step.done ? 'bg-emerald-500' : 'bg-white/10'
            }`}>
              {step.done
                ? <CheckCircle2 className="w-2 h-2 text-white" />
                : <div className="w-1 h-1 rounded-full bg-white/30" />}
            </div>
            <span className={`text-[9px] font-semibold truncate ${step.done ? 'text-emerald-400' : 'text-white/20'}`}>
              {step.label}
            </span>
            {i < steps.length - 1 && (
              <div className={`h-px flex-1 ${step.done ? 'bg-emerald-500/40' : 'bg-white/10'}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Movie cards — horizontal scroll
function MovieCards({ items, onSend }) {
  if (!items?.length) return null;
  return (
    <div className="mt-2 -mx-1">
      <div className="flex gap-2 overflow-x-auto pb-1 px-1" style={{ scrollbarWidth: 'none' }}>
        {items.slice(0, 6).map(m => (
          <button
            key={m.id}
            onClick={() => onSend(`Show times for ${m.title}`)}
            className="flex-shrink-0 w-28 bg-black/30 hover:bg-black/50 border border-white/10 hover:border-indigo-400/40 rounded-xl overflow-hidden transition-all group text-left"
          >
            <div className="w-full h-36 bg-black/40 overflow-hidden">
              {m.poster && (
                <img src={m.poster} alt={m.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={e => e.target.style.display='none'}
                />
              )}
            </div>
            <div className="p-1.5">
              <p className="text-[10px] font-bold text-white leading-tight truncate">{m.title}</p>
              <div className="flex items-center gap-0.5 mt-0.5">
                <Star className="w-2 h-2 text-yellow-400 fill-yellow-400" />
                <span className="text-[9px] text-white/50">{m.rating}</span>
              </div>
              <p className="text-[9px] text-indigo-300 mt-0.5 font-medium">Tap for shows →</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Show cards — grouped by theatre with ticket count selector
function ShowCards({ items, onSend }) {
  const [numTickets, setNumTickets] = useState(2);
  if (!items?.length) return null;

  const grouped = items.reduce((acc, s) => {
    const key = s.theatre_name || 'Unknown';
    if (!acc[key]) acc[key] = { name: s.theatre_name, city: s.city, shows: [] };
    acc[key].shows.push(s);
    return acc;
  }, {});

  return (
    <div className="mt-2 space-y-2">
      {/* Step 1: pick ticket count */}
      <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-3 py-2">
        <span className="text-[10px] font-bold text-indigo-300">Step 1 — Tickets:</span>
        {[1,2,3,4].map(n => (
          <button key={n} onClick={() => setNumTickets(n)}
            className={`w-7 h-7 rounded-lg text-[10px] font-bold transition-colors ${
              numTickets === n ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white/50 hover:bg-white/20'
            }`}>{n}</button>
        ))}
      </div>

      {/* Step 2 label */}
      <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider px-0.5">
        Step 2 — Tap a showtime:
      </p>

      {Object.entries(grouped).slice(0,4).map(([name, data]) => (
        <div key={name} className="bg-black/20 border border-white/10 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <MapPin className="w-3 h-3 text-white/30" />
            <p className="text-[11px] font-semibold text-white/80 truncate">{data.name}</p>
            <span className="text-[10px] text-white/30 shrink-0">· {data.city}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.shows.sort((a,b)=>a.time.localeCompare(b.time)).map(s => (
              <button key={s.id}
                onClick={() => onSend(`Auto-select ${numTickets} ticket${numTickets>1?'s':''} for show ${s.id}`)}
                className="px-2.5 py-1.5 text-[10px] font-bold border border-green-500/40 text-green-300 hover:bg-green-500/20 rounded-lg transition-all active:scale-95"
              >
                {s.time}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Seat Choice Card — user picks category before auto-select ─────────────────
function SeatChoiceCard({ data, onSend, onNavigate }) {
  if (!data) return null;
  const { show, prices = {}, available = {}, show_id, num_tickets } = data;

  const categories = [
    { key:'platinum', label:'Platinum', emoji:'👑', desc:'Best seats, rows A-C', price:prices.platinum||500, avail:available.platinum||0, color:'border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/10' },
    { key:'gold',     label:'Gold',     emoji:'⭐', desc:'Mid section, rows D-G', price:prices.gold||300,     avail:available.gold||0,     color:'border-amber-500/40 text-amber-300 hover:bg-amber-500/10' },
    { key:'silver',   label:'Silver',   emoji:'🎫', desc:'Back rows H-J',         price:prices.silver||150,   avail:available.silver||0,   color:'border-slate-500/40 text-slate-300 hover:bg-slate-500/10' },
  ];

  return (
    <div className="mt-2 bg-black/20 border border-white/10 rounded-xl overflow-hidden">
      {show && (
        <div className="px-3 py-2 border-b border-white/5 flex items-center gap-2">
          {show.movie_poster && <img src={show.movie_poster} alt="" className="w-8 h-11 rounded object-cover" />}
          <div>
            <p className="text-[11px] font-bold text-white">{show.movie_title}</p>
            <p className="text-[10px] text-white/40">{show.theatre_name} · {show.date} {show.time}</p>
          </div>
        </div>
      )}
      <div className="p-3 space-y-2">
        <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-1">
          <Armchair className="w-3 h-3" /> Choose Seat Category — {num_tickets} ticket(s)
        </p>
        {categories.map(cat => (
          <button key={cat.key}
            disabled={cat.avail < num_tickets}
            onClick={() => onSend(`autoselect-seats show_id=${show_id} tickets=${num_tickets} preference=${cat.key}`)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border transition-all ${cat.avail < num_tickets ? 'border-white/5 opacity-40 cursor-not-allowed' : cat.color}`}
          >
            <div className="flex items-center gap-2">
              <span>{cat.emoji}</span>
              <div className="text-left">
                <p className="text-[11px] font-bold">{cat.label}</p>
                <p className="text-[9px] opacity-60">{cat.desc}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] font-bold">Rs. {cat.price} each</p>
              <p className="text-[9px] opacity-60">{cat.avail} avail</p>
            </div>
          </button>
        ))}
        <div className="flex items-center gap-2 py-0.5">
          <div className="flex-1 h-px bg-white/5" /><span className="text-[9px] text-white/30">OR</span><div className="flex-1 h-px bg-white/5" />
        </div>
        <button
          onClick={() => onSend(`autoselect-seats show_id=${show_id} tickets=${num_tickets} preference=any`)}
          className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 rounded-xl text-[11px] font-bold transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" /> Auto-select best available seats
        </button>
        <button
          onClick={() => onNavigate(`/book/${show_id}`)}
          className="w-full flex items-center justify-center gap-2 py-1.5 text-white/30 hover:text-white/50 text-[10px] transition-colors"
        >
          <MapPin className="w-3 h-3" /> Choose seats on the map instead
        </button>
      </div>
    </div>
  );
}

// Manual seat redirect card
function ManualSeatRedirectCard({ data, onNavigate }) {
  if (!data?.show_id) return null;
  return (
    <div className="mt-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-3">
      <p className="text-[11px] text-white/80 mb-2">Open the interactive seat map to pick your own seats.</p>
      <button onClick={() => onNavigate(`/book/${data.show_id}`)}
        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-xl"
      >🗺️ Open Seat Map →</button>
    </div>
  );
}


// Seats card with confirm
function SeatsCard({ data, onConfirm, isConfirming }) {
  if (!data?.seats?.length) return null;
  const catColors = {
    platinum: 'text-yellow-300 bg-yellow-500/10 border-yellow-500/30',
    gold:     'text-amber-300 bg-amber-500/10 border-amber-500/30',
    silver:   'text-slate-300 bg-slate-500/10 border-slate-500/30',
  };
  const grouped = data.seats.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s.id);
    return acc;
  }, {});

  return (
    <div className="mt-2 bg-black/20 border border-white/10 rounded-xl overflow-hidden">
      {data.show && (
        <div className="px-3 py-2 border-b border-white/5 flex items-center gap-2">
          {data.show.movie_poster && (
            <img src={data.show.movie_poster} alt="" className="w-8 h-11 rounded object-cover" />
          )}
          <div>
            <p className="text-[11px] font-bold text-white">{data.show.movie_title}</p>
            <p className="text-[10px] text-white/40">
              {data.show.theatre_name} · {data.show.date} {data.show.time}
            </p>
          </div>
        </div>
      )}
      <div className="p-3 space-y-2">
        <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider flex items-center gap-1">
          <Armchair className="w-3 h-3" /> Auto-Selected Seats
        </p>
        {Object.entries(grouped).map(([cat, seatIds]) => (
          <div key={cat} className="flex items-center gap-2 flex-wrap">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border capitalize ${catColors[cat]||''}`}>{cat}</span>
            {seatIds.map(id => (
              <span key={id} className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded-lg text-white">{id}</span>
            ))}
          </div>
        ))}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <div>
            <p className="text-[10px] text-white/40">{data.seats.length} ticket(s)</p>
            <p className="text-sm font-bold text-white">Rs. {data.total}</p>
          </div>
          <button onClick={onConfirm} disabled={isConfirming}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95"
          >
            {isConfirming
              ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Confirming…</>
              : <><CheckCircle2 className="w-3.5 h-3.5" />Confirm Booking</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// Booking confirmed card
function BookingConfirmedCard({ booking, onNavigate }) {
  if (!booking) return null;
  return (
    <div className="mt-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl overflow-hidden">
      <div className="bg-emerald-500/20 px-3 py-2 flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        <p className="text-xs font-bold text-emerald-300">Booking Confirmed!</p>
      </div>
      <div className="p-3 space-y-1">
        <p className="text-xs font-bold text-white">{booking.movie_title}</p>
        <p className="text-[10px] text-white/50">
          <Calendar className="w-2.5 h-2.5 inline mr-1" />{booking.show_date}
          <Clock className="w-2.5 h-2.5 inline mx-1" />{booking.show_time}
        </p>
        <p className="text-[10px] text-white/50">
          <MapPin className="w-2.5 h-2.5 inline mr-1" />{booking.theatre_name}
        </p>
        <div className="flex flex-wrap gap-1 mt-1">
          {booking.seats?.map(s => (
            <span key={s} className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-lg">{s}</span>
          ))}
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <p className="text-[11px] font-bold text-emerald-300">{booking.ticket_id}</p>
          <button onClick={() => onNavigate(`/ticket/${booking.id}`)}
            className="flex items-center gap-1.5 text-[10px] font-bold bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg"
          >
            <Ticket className="w-3 h-3" /> View Ticket
          </button>
        </div>
      </div>
    </div>
  );
}

// Booking history with re-book
function BookingsCard({ items, onNavigate, onSend }) {
  if (!items?.length) return (
    <p className="text-[11px] text-white/40 mt-1 italic">No bookings yet. Book your first movie! 🎬</p>
  );
  return (
    <div className="space-y-2 mt-2">
      {items.slice(0,4).map(b => (
        <div key={b.id} className="bg-black/20 border border-white/10 rounded-xl overflow-hidden">
          <button onClick={() => onNavigate(`/ticket/${b.id}`)}
            className="w-full text-left p-3 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-start gap-2">
              {b.movie_poster && (
                <img src={b.movie_poster} alt="" className="w-8 h-11 rounded object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-white truncate">{b.movie_title}</p>
                <p className="text-[10px] text-white/40">{b.show_date} · {b.show_time}</p>
                <p className="text-[10px] text-white/40">{b.theatre_name}</p>
                <div className="flex gap-1 mt-1">
                  {b.seats?.slice(0,4).map(s => (
                    <span key={s} className="text-[9px] bg-orange-500/15 text-orange-300 px-1.5 py-0.5 rounded font-bold">{s}</span>
                  ))}
                </div>
                <p className="text-[9px] text-orange-300 mt-0.5">{b.ticket_id}</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-white/20 shrink-0" />
            </div>
          </button>
          <button onClick={() => onSend(`Find shows for ${b.movie_title}`)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 border-t border-white/5 text-[10px] font-bold text-indigo-300 hover:bg-indigo-500/10 transition-colors"
          >
            <RefreshCw className="w-2.5 h-2.5" /> Book Again
          </button>
        </div>
      ))}
    </div>
  );
}

function HelpCard() {
  return (
    <div className="mt-2 space-y-1.5">
      {[
        ['🎬','Search movies by name, genre, or language'],
        ['🏟️','Find showtimes in your city'],
        ['💺','Auto-select best available seats'],
        ['✅','Confirm booking directly in chat'],
        ['✨','Get personalised recommendations'],
        ['🎟️','View bookings + re-book in one tap'],
      ].map(([e,t]) => (
        <div key={t} className="flex items-center gap-2 text-[11px] text-white/60">
          <span>{e}</span><span>{t}</span>
        </div>
      ))}
    </div>
  );
}

function AuthCard({ onNavigate }) {
  return (
    <div className="mt-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-3 flex items-center justify-between">
      <p className="text-[11px] text-white/70">Sign in to book & view history</p>
      <button onClick={() => onNavigate('/auth')}
        className="text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg"
      >Sign In →</button>
    </div>
  );
}

// ── Voice button ──────────────────────────────────────────────────────────────
function VoiceButton({ onTranscript }) {
  const [state, setState] = useState('idle');
  const [live, setLive]   = useState('');
  const recRef = useRef(null);

  const start = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Voice input needs Chrome.'); return; }
    const rec = new SR();
    rec.lang = 'en-IN'; rec.continuous = false; rec.interimResults = true;
    rec.onstart  = () => setState('listening');
    rec.onend    = () => { setState('idle'); setLive(''); };
    rec.onerror  = () => { setState('idle'); setLive(''); };
    rec.onresult = (e) => {
      const t = Array.from(e.results).map(r=>r[0].transcript).join('');
      setLive(t);
      if (e.results[e.results.length-1].isFinal) {
        onTranscript(t);
        setState('done');
        setTimeout(() => { setState('idle'); setLive(''); }, 600);
      }
    };
    rec.start(); recRef.current = rec;
  };

  const stop = () => { recRef.current?.stop(); };

  return (
    <div className="relative shrink-0">
      <button onClick={state==='listening' ? stop : start}
        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
          state==='listening' ? 'bg-red-500 text-white animate-pulse' :
          state==='done'      ? 'bg-emerald-500 text-white' :
                                'bg-white/10 hover:bg-white/20 text-white/60'
        }`}
      >
        {state==='listening' ? <MicOff className="w-4 h-4" /> :
         state==='done'      ? <CheckCircle2 className="w-4 h-4" /> :
                               <Mic className="w-4 h-4" />}
      </button>
      {live && (
        <div className="absolute bottom-12 right-0 bg-black/90 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white/80 w-48 shadow-xl z-10">
          🎤 {live}
        </div>
      )}
    </div>
  );
}

// ── Message content renderer ──────────────────────────────────────────────────
function MessageContent({ msg, onSend, onNavigate, onConfirm, isConfirming }) {
  const data   = msg.data;
  const type   = data?.type;
  const intent = msg.intent;

  return (
    <div className="flex flex-col w-full">
      {msg.role === 'assistant' && <AgentBadge intent={intent} />}
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
      {data && (
        <>
          {(type==='movies' || type==='recommendations') && <MovieCards items={data.items} onSend={onSend} />}
          {type==='shows'               && <ShowCards items={data.items} onSend={onSend} />}
          {type==='seat_choice'         && <SeatChoiceCard data={data} onSend={onSend} onNavigate={onNavigate} />}
          {type==='seats_selected'      && <SeatsCard data={data} onConfirm={onConfirm} isConfirming={isConfirming} />}
          {type==='manual_seat_redirect'&& <ManualSeatRedirectCard data={data} onNavigate={onNavigate} />}
          {type==='booking_confirmed'   && <BookingConfirmedCard booking={data.booking} onNavigate={onNavigate} />}
          {type==='bookings'            && <BookingsCard items={data.items} onNavigate={onNavigate} onSend={onSend} />}
          {type==='help'                && <HelpCard />}
          {type==='auth_required'       && <AuthCard onNavigate={onNavigate} />}

          {/* ── NEXT STEP HINT ── */}
          <NextStepHint type={type} onSend={onSend} />
        </>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// MAIN CHATBOT COMPONENT
// ═════════════════════════════════════════════════════════════
export default function ChatBot({ externalOpen, setExternalOpen }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open    = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = setExternalOpen !== undefined ? setExternalOpen : setInternalOpen;

  const [sessionId]                     = useState(getOrCreateSession);
  const [messages, setMessages]         = useState([
    {
      role:'assistant',
      content:"Hey! I'm ShowSpot AI 🎬\nI can find movies, pick seats, and complete your booking — all right here. What would you like to watch?",
      intent:null, data:null,
    }
  ]);
  const [input, setInput]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [agentState, setAgentState]     = useState('idle');
  const [agentSteps, setAgentSteps]     = useState([]);

  const latestSeatsRef = useRef(null);
  const scrollRef      = useRef(null);
  const inputRef       = useRef(null);
  const navigate       = useNavigate();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const handleNavigate = useCallback((path) => {
    navigate(path); setOpen(false);
  }, [navigate, setOpen]);

  const sendMessage = useCallback(async (text) => {
    const userMsg = (text || input).trim();
    if (!userMsg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role:'user', content:userMsg }]);
    setLoading(true);

    try {
      const res = await api.post('/chat', { message: userMsg, session_id: sessionId });
      const { message: botText, data, intent, state, agent_steps } = res.data;

      setAgentState(state || 'idle');
      if (agent_steps) setAgentSteps(agent_steps);
      if (data?.type === 'seats_selected') latestSeatsRef.current = data;

      setMessages(prev => [...prev, {
        role:'assistant',
        content: botText || "I couldn't process that — try again?",
        data, intent,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role:'assistant', content:'Something went wrong. Please try again 😅'
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, sessionId]);

  const handleConfirmBooking = useCallback(async () => {
    const seatsData = latestSeatsRef.current;
    if (!seatsData) return;
    const token = localStorage.getItem('showspot_token');
    if (!token) {
      setMessages(prev => [...prev, {
        role:'assistant', content:'Please sign in first to confirm your booking 🔐',
        data:{type:'auth_required'}, intent:null,
      }]);
      return;
    }
    setIsConfirming(true);
    try {
      const res = await api.post('/bookings', {
        show_id: seatsData.show_id,
        seats:   seatsData.seat_ids,
      });
      setMessages(prev => [...prev,
        { role:'user', content:'Confirm Booking' },
        {
          role:'assistant',
          content:`🎉 Booking confirmed! Ticket ${res.data.ticket_id} is all yours!`,
          intent:'confirm_booking',
          data:{ type:'booking_confirmed', booking:res.data },
        }
      ]);
      latestSeatsRef.current = null;
      setAgentState('idle');
      setAgentSteps([]);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Booking failed. Please try again.';
      setMessages(prev => [...prev, {
        role:'assistant',
        content: err.response?.status === 401 ? 'Please sign in to confirm bookings.' : `❌ ${msg}`,
        data: err.response?.status === 401 ? {type:'auth_required'} : null,
      }]);
    } finally {
      setIsConfirming(false);
    }
  }, []);

  const stateLabel = STATE_LABEL[agentState] || STATE_LABEL.idle;

  return (
    <div
      data-testid="chatbot-dialog"
      className={`fixed top-20 right-4 bg-[#0f1117] border border-white/10 shadow-2xl rounded-2xl flex flex-col transition-all duration-300 ${
        open
          ? 'translate-x-0 opacity-100 pointer-events-auto'
          : 'translate-x-[120%] opacity-0 pointer-events-none'
      }`}
      style={{ zIndex: 100, width: 380, height: 'calc(100vh - 96px)', maxHeight: 680 }}
    >
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-indigo-700 to-indigo-600 text-white flex justify-between items-center rounded-t-2xl shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-sm">ShowSpot AI</p>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`} />
              <p className="text-[10px] opacity-80 truncate max-w-[200px]">
                {loading ? 'Thinking…' : stateLabel}
              </p>
            </div>
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="hover:bg-white/10 rounded-lg p-1.5 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar */}
      <ProgressBar steps={agentSteps} />

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role==='user' ? 'justify-end' : 'justify-start'} items-start gap-2`}>
            {msg.role==='assistant' && (
              <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-indigo-400" />
              </div>
            )}
            <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm ${
              msg.role==='user'
                ? 'bg-indigo-600 text-white rounded-br-sm'
                : 'bg-white/8 text-white rounded-bl-sm border border-white/5'
            }`}>
              <MessageContent
                msg={msg}
                onSend={sendMessage}
                onNavigate={handleNavigate}
                onConfirm={handleConfirmBooking}
                isConfirming={isConfirming}
              />
            </div>
          </div>
        ))}

        {/* Suggestions */}
        {messages.length === 1 && !loading && (
          <div className="flex flex-col gap-1.5 pl-9">
            {SUGGESTIONS.map(s => (
              <button key={s.text} onClick={() => sendMessage(s.text)}
                className="text-left text-xs px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/40 rounded-xl transition-all text-white/70"
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Typing indicator */}
        {loading && (
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="bg-white/8 border border-white/5 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex items-center gap-1.5">
                {[0,150,300].map(d => (
                  <div key={d} className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                       style={{ animationDelay:`${d}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/10 shrink-0">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            data-testid="chatbot-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key==='Enter') { e.preventDefault(); sendMessage(); } }}
            placeholder="Ask about movies, shows, seats…"
            className="flex-1 text-sm h-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-indigo-500/60"
            disabled={loading}
          />
          <VoiceButton onTranscript={t => { setInput(t); setTimeout(() => sendMessage(t), 100); }} />
          <button
            data-testid="chatbot-send"
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="w-10 h-10 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
