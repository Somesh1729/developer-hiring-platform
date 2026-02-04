import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://developer-hiring-platform-1.onrender.com/api';


const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
const authAPI = {
  register: (email, password, full_name, user_type) =>
    apiClient.post('/auth/register', { email, password, full_name, user_type }),

  login: (email, password) => apiClient.post('/auth/login', { email, password }),

  getMe: () => apiClient.get('/auth/me'),
};

// Developer API
const developerAPI = {
  getAvailable: () => apiClient.get('/developers/available'),

  getProfile: (developerId) => apiClient.get(`/developers/${developerId}`),

  updateProfile: (developerId, data) =>
    apiClient.put(`/developers/${developerId}`, data),

  setAvailabilityStatus: (developerId, status) =>
    apiClient.put(`/developers/${developerId}/availability-status`, { status }),

  getAvailabilitySlots: (developerId) =>
    apiClient.get(`/developers/${developerId}/availability-slots`),

  addAvailabilitySlot: (developerId, start_time, end_time) =>
    apiClient.post(`/developers/${developerId}/availability-slots`, {
      start_time,
      end_time,
    }),
};

// Bookings API
const bookingsAPI = {
  createBooking: (developer_id, scheduled_at, duration_minutes) =>
    apiClient.post('/bookings', { developer_id, scheduled_at, duration_minutes }),

  getUserBookings: (userId) => apiClient.get(`/bookings/user/${userId}`),

  getBooking: (bookingId) => apiClient.get(`/bookings/${bookingId}`),

  confirmBooking: (bookingId) => apiClient.put(`/bookings/${bookingId}/confirm`),

  startCall: (bookingId) => apiClient.put(`/bookings/${bookingId}/start-call`),

  endCall: (bookingId, actual_duration_minutes, quality_stats) =>
    apiClient.put(`/bookings/${bookingId}/end-call`, {
      actual_duration_minutes,
      quality_stats,
    }),

  cancelBooking: (bookingId, reason) =>
    apiClient.put(`/bookings/${bookingId}/cancel`, { reason }),
};

// Payments API
const paymentsAPI = {
  createPaymentIntent: (booking_id, payment_method) =>
    apiClient.post('/payments/create-payment-intent', { booking_id, payment_method }),

  confirmPayment: (booking_id, payment_intent_id, payment_method_id) =>
    apiClient.post('/payments/confirm-payment', {
      booking_id,
      payment_intent_id,
      payment_method_id,
    }),

  getTransactions: () => apiClient.get('/payments/transactions'),

  getTransaction: (transactionId) =>
    apiClient.get(`/payments/transaction/${transactionId}`),

  processRefund: (booking_id, refund_amount) =>
    apiClient.post('/payments/refund', { booking_id, refund_amount }),

  getWalletBalance: () => apiClient.get('/payments/wallet/balance'),

  updateWalletBalance: (amount, currency) =>
    apiClient.put('/payments/wallet/update', { amount, currency }),
};

// Reviews API
const reviewsAPI = {
  createReview: (booking_id, rating, review_text) =>
    apiClient.post('/reviews', { booking_id, rating, review_text }),

  getDeveloperReviews: (developerId) =>
    apiClient.get(`/reviews/developer/${developerId}`),

  getUserReviews: (userId) => apiClient.get(`/reviews/user/${userId}`),

  updateReview: (reviewId, rating, review_text) =>
    apiClient.put(`/reviews/${reviewId}`, { rating, review_text }),

  deleteReview: (reviewId) => apiClient.delete(`/reviews/${reviewId}`),
};

export { authAPI, developerAPI, bookingsAPI, paymentsAPI, reviewsAPI, apiClient };
