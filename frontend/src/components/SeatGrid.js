const ROWS = 'ABCDEFGHIJ'.split('');
const COLS = Array.from({ length: 15 }, (_, i) => i + 1);

function getCategoryForRow(row) {
  if ('ABC'.includes(row)) return 'platinum';
  if ('DEFG'.includes(row)) return 'gold';
  return 'silver';
}

const categoryColors = {
  platinum: 'text-amber-500',
  gold: 'text-yellow-600',
  silver: 'text-slate-400',
};

export default function SeatGrid({ layout, selectedSeats, onToggleSeat }) {
  if (!layout) return null;

  let lastCategory = '';

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Screen */}
      <div className="w-full max-w-3xl mx-auto mb-12 sm:mb-16 text-center">
        <div className="w-full h-3 bg-gradient-to-r from-transparent via-primary/60 to-transparent rounded-full screen-glow" />
        <p className="text-xs text-muted-foreground mt-3 tracking-[0.2em] uppercase font-bold">Screen This Way</p>
      </div>

      {/* Seat Grid */}
      <div className="space-y-1.5">
        {ROWS.map((row) => {
          const category = getCategoryForRow(row);
          const showLabel = category !== lastCategory;
          lastCategory = category;
          const rowData = layout[row];

          return (
            <div key={row}>
              {showLabel && (
                <div className={`text-xs font-bold tracking-[0.1em] uppercase mb-2 mt-4 ${categoryColors[category]}`}>
                  {category} - Rs. {rowData?.price || 0}
                </div>
              )}
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className="w-6 text-xs font-bold text-muted-foreground text-center">{row}</span>
                <div className="flex gap-1 sm:gap-1.5 flex-1 justify-center">
                  {COLS.map((col) => {
                    const seatId = `${row}${col}`;
                    const seat = rowData?.seats?.find(s => s.id === seatId);
                    const isBooked = seat?.status === 'booked';
                    const isSelected = selectedSeats.includes(seatId);

                    // Add gap in the middle
                    const hasGap = col === 4 || col === 12;

                    return (
                      <div key={col} className={`flex items-center ${hasGap ? 'mr-3' : ''}`}>
                        <button
                          data-testid={`seat-${seatId}`}
                          disabled={isBooked}
                          onClick={() => !isBooked && onToggleSeat(seatId, category)}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-t-lg rounded-b-sm flex items-center justify-center text-[10px] font-semibold transition-all duration-200
                            ${isBooked ? 'seat-booked' : isSelected ? 'seat-selected' : 'seat-available hover:bg-primary/10'}
                          `}
                        >
                          {col}
                        </button>
                      </div>
                    );
                  })}
                </div>
                <span className="w-6 text-xs font-bold text-muted-foreground text-center">{row}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-8">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-t-md rounded-b-sm border-2 border-muted-foreground/30" />
          <span className="text-xs text-muted-foreground">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-t-md rounded-b-sm bg-primary border-2 border-primary" />
          <span className="text-xs text-muted-foreground">Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-t-md rounded-b-sm bg-muted border-2 border-muted opacity-50" />
          <span className="text-xs text-muted-foreground">Booked</span>
        </div>
      </div>
    </div>
  );
}
