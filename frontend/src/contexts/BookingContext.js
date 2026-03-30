import { createContext, useContext, useState, useCallback } from 'react';

const BookingContext = createContext();

export function BookingProvider({ children }) {
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [selectedShow, setSelectedShow] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [currentBooking, setCurrentBooking] = useState(null);

  const reset = useCallback(() => {
    setSelectedMovie(null);
    setSelectedShow(null);
    setSelectedSeats([]);
    setTotalPrice(0);
    setCurrentBooking(null);
  }, []);

  return (
    <BookingContext.Provider value={{
      selectedMovie, setSelectedMovie,
      selectedShow, setSelectedShow,
      selectedSeats, setSelectedSeats,
      totalPrice, setTotalPrice,
      currentBooking, setCurrentBooking,
      reset
    }}>
      {children}
    </BookingContext.Provider>
  );
}

export const useBooking = () => useContext(BookingContext);
