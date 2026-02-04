import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import Header from './components/Header';
import PrivateRoute from './components/PrivateRoute';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Developers from './pages/Developers';
import DeveloperDetail from './pages/DeveloperDetail';
import Payment from './pages/Payment';
import BookingDetail from './pages/BookingDetail';

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <main>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Navigate to="/developers" />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/developers" element={<Developers />} />
              <Route path="/developer/:developerId" element={<DeveloperDetail />} />

              {/* Protected Routes */}
              <Route
                path="/booking/:bookingId/payment"
                element={
                  <PrivateRoute>
                    <Payment />
                  </PrivateRoute>
                }
              />
              <Route
                path="/booking/:bookingId"
                element={
                  <PrivateRoute>
                    <BookingDetail />
                  </PrivateRoute>
                }
              />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/developers" />} />
            </Routes>
          </main>
        </div>
        <Toaster position="top-right" />
      </AuthProvider>
    </Router>
  );
};

export default App;
