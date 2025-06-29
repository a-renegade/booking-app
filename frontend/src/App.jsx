import "tailwindcss";
import Navbar from "./components/Navbar";
import { Routes ,Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import { useAuthStore } from "./store/useAuthStore";
import { useEffect } from "react";
import {Loader} from "lucide-react"
import { Toaster } from "react-hot-toast";
import MoviePage from "./pages/MoviePage";
import ShowPage from "./pages/ShowPage";
import BookingPage from "./pages/BookingPage";
import ManageMovie from "./pages/ManageMoviePage";
import ManageTheaterPage from "./pages/ManageTheaterPage";
import ManageShowPage from "./pages/ManageShowPage";
import AutoBookingPage from "./pages/AutoBookingPage";


const App = () => {
  const { authUser , checkAuth ,isCheckingAuth}=useAuthStore();
  useEffect(() => {
    checkAuth();

  }, [checkAuth])
  // console.log(authUser);

  if(isCheckingAuth && !authUser){
    return (
       <div className="flex items-center justify-center h-screen">
        <Loader className="size-10 animate-spin"/>
      </div>
    )
  }


  return (
    <div>
      <Toaster position="top-center" reverseOrder={false} />
      <Navbar />
      <Routes>
        {/* <Route path="/" element={authUser ? <HomePage /> : <Navigate to="/login"/>} /> */}
        <Route path="/" element={authUser ? <MoviePage /> : <Navigate to="/login"/>} />
        <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to="/"/>} />
        <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/"/>} />
        <Route path="/profile" element={authUser ? <ProfilePage /> : <Navigate to="/login"/>} />
        <Route path="/shows/:movieId" element={authUser ? <ShowPage /> : <Navigate to="/login" />} />
        <Route path="/shows/:showId/book" element={authUser ? <BookingPage /> : <Navigate to="/login" />} />
        <Route path="/shows/:showId/book/auto" element={authUser ? <AutoBookingPage /> : <Navigate to="/login" />} />
        <Route path="/manage/movies" element={authUser ? <ManageMovie /> : <Navigate to="/login" />} />
        <Route path="/manage/theaters" element={authUser ? <ManageTheaterPage /> : <Navigate to="/login" />} />
        <Route path="/manage/shows" element={authUser ? <ManageShowPage /> : <Navigate to="/login" />} />

      </Routes>
    </div>
    

  )
}

export default App