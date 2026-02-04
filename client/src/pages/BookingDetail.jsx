import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bookingsAPI } from '../services/api';
import { notifyCallStarted, notifyCallEnded } from '../services/socket';
import VideoCall from '../components/VideoCall';
import { Clock, User, DollarSign, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const BookingDetail = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCall, setShowCall] = useState(false);
  const [reviewData, setReviewData] = useState({
    rating: 5,
    review_text: '',
  });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetchBooking();
    const interval = setInterval(fetchBooking, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const fetchBooking = async () => {
    try {
      const response = await bookingsAPI.getBooking(bookingId);
      setBooking(response.data);
    } catch (error) {
      console.error('[DevHire] Fetch booking error:', error);
      toast.error('Failed to load booking');
      navigate('/bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleStartCall = async () => {
    try {
      if (booking.status !== 'confirmed') {
        toast.error('Booking must be confirmed to start the call');
        return;
      }

      await bookingsAPI.startCall(bookingId);
      notifyCallStarted(
        bookingId,
        booking.agora_channel_name,
        booking.customer_user_id,
        booking.developer_user_id
      );
      setShowCall(true);
      toast.success('Call started');
    } catch (error) {
      console.error('[DevHire] Start call error:', error);
      toast.error('Failed to start call');
    }
  };

  const handleCallEnd = async (actualDurationMinutes) => {
    try {
      await bookingsAPI.endCall(bookingId, actualDurationMinutes, {});
      notifyCallEnded(
        bookingId,
        booking.customer_user_id,
        booking.developer_user_id,
        actualDurationMinutes,
        {}
      );
      setShowCall(false);
      toast.success('Call ended. Please rate your experience.');
      fetchBooking();
    } catch (error) {
      console.error('[DevHire] End call error:', error);
      toast.error('Failed to end call');
    }
  };

  const handleReviewChange = (e) => {
    const { name, value } = e.target;
    setReviewData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading booking...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Booking not found</p>
      </div>
    );
  }

  const statusColor = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Video Call Display */}
        {showCall && booking.agora_channel_name && booking.agora_token && (
          <div className="mb-8 h-96 rounded-lg overflow-hidden shadow-lg">
            <VideoCall
              channelName={booking.agora_channel_name}
              token={booking.agora_token}
              userId={booking.customer_user_id}
              onCallEnd={handleCallEnd}
            />
          </div>
        )}

        {/* Booking Header */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Booking #{bookingId}
              </h1>
              <p className="text-gray-600 mt-2">
                with {booking.developer_name}
              </p>
            </div>
            <span
              className={`px-4 py-2 rounded-full font-semibold ${
                statusColor[booking.status] || statusColor.pending
              }`}
            >
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </span>
          </div>

          {/* Status Checks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {booking.payment_status === 'completed' ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle size={20} />
                <span>Payment Confirmed</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-yellow-600">
                <AlertCircle size={20} />
                <span>Payment Pending</span>
              </div>
            )}

            {booking.status === 'confirmed' && !showCall ? (
              <button
                onClick={handleStartCall}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <span>Start Video Call</span>
              </button>
            ) : null}
          </div>

          {/* Booking Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline mr-2" size={16} />
                Scheduled Time
              </label>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(booking.scheduled_at).toLocaleString()}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="inline mr-2" size={16} />
                Duration
              </label>
              <p className="text-lg font-semibold text-gray-900">
                {booking.duration_minutes} minutes
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline mr-2" size={16} />
                Developer
              </label>
              <p className="text-lg font-semibold text-gray-900">
                {booking.developer_name}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="inline mr-2" size={16} />
                Total Amount
              </label>
              <p className="text-lg font-semibold text-blue-600">
                ${booking.total_amount.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        {booking.status === 'pending' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <p className="text-yellow-800">
              Please complete the payment to confirm the booking.
            </p>
            <button
              onClick={() => navigate(`/booking/${bookingId}/payment`)}
              className="mt-4 px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition"
            >
              Complete Payment
            </button>
          </div>
        )}

        {booking.status === 'in_progress' && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
            <p className="text-purple-800">
              Your call is currently in progress.
            </p>
          </div>
        )}

        {booking.status === 'completed' && !showCall && (
          <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Rate Your Experience
            </h2>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSubmittingReview(true);
                try {
                  // TODO: Submit review
                  toast.success('Review submitted!');
                  fetchBooking();
                } catch (error) {
                  toast.error('Failed to submit review');
                } finally {
                  setSubmittingReview(false);
                }
              }}
              className="space-y-6"
            >
              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Rating
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewData((prev) => ({ ...prev, rating: star }))}
                      className={`text-3xl transition ${
                        star <= reviewData.rating
                          ? 'text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Review Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Review (Optional)
                </label>
                <textarea
                  name="review_text"
                  value={reviewData.review_text}
                  onChange={handleReviewChange}
                  placeholder="Share your experience..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={5}
                />
              </div>

              <button
                type="submit"
                disabled={submittingReview}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition"
              >
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingDetail;
