import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { BookingProvider } from "@/contexts/BookingContext";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChatBot from "@/components/ChatBot";
import HomePage from "@/pages/HomePage";
import MoviesPage from "@/pages/MoviesPage";
import MovieDetailPage from "@/pages/MovieDetailPage";
import SeatSelectionPage from "@/pages/SeatSelectionPage";
import PaymentPage from "@/pages/PaymentPage";
import TicketPage from "@/pages/TicketPage";
import AuthPage from "@/pages/AuthPage";
import ProfilePage from "@/pages/ProfilePage";
import EventsPage from "@/pages/EventsPage";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BookingProvider>
          <BrowserRouter>
            <div className="min-h-screen bg-background text-foreground transition-colors duration-300 flex flex-col">
              <Navbar />
              <main className="flex-1">
                <Routes>
                  <Route path="/"               element={<HomePage />} />
                  <Route path="/movies"          element={<MoviesPage />} />
                  <Route path="/movies/:id"      element={<MovieDetailPage />} />
                  <Route path="/book/:showId"    element={<SeatSelectionPage />} />
                  <Route path="/payment"         element={<PaymentPage />} />
                  <Route path="/ticket/:bookingId" element={<TicketPage />} />
                  <Route path="/auth"            element={<AuthPage />} />
                  <Route path="/profile"         element={<ProfilePage />} />
                  <Route path="/events"          element={<EventsPage />} />
                </Routes>
              </main>
              <Footer />
              <Toaster position="top-right" />
            </div>
          </BrowserRouter>
        </BookingProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
