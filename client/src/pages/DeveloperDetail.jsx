import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { developerAPI, bookingsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Star,
  DollarSign,
  Github,
  Globe,
} from 'lucide-react';
import toast from 'react-hot-toast';

const DeveloperDetail = () => {
  const { developerId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [developer, setDeveloper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingForm, setBookingForm] = useState({
    duration_minutes: 30,
    scheduled_at: '',
  });
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    fetchDeveloper();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [developerId]);

  const fetchDeveloper = async () => {
    try {
      setLoading(true);
      const response = await developerAPI.getProfile(developerId);
      setDeveloper(response.data);
    } catch (error) {
      console.error('[DevHire] Fetch developer error:', error);
      toast.error('Failed to load developer profile');
      navigate('/developers');
    } finally {
      setLoading(false);
    }
  };

  const handleBookingChange = (e) => {
    const { name, value } = e.target;
    setBookingForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBooking = async (e) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please login to book');
      navigate('/login');
      return;
    }

    if (user.user_type === 'developer') {
      toast.error('Developers cannot book other developers');
      return;
    }

    if (!bookingForm.scheduled_at) {
      toast.error('Please select a date and time');
      return;
    }

    setBookingLoading(true);

    try {
      const response = await bookingsAPI.createBooking(
        developerId,
        bookingForm.scheduled_at,
        bookingForm.duration_minutes
      );

      toast.success('Booking created! Proceeding to payment...');
      navigate(`/booking/${response.data.booking.id}/payment`);
    } catch (error) {
      console.error('[DevHire] Booking error:', error);
      toast.error(error.response?.data?.error || 'Failed to create booking');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading developer profile...</p>
        </div>
      </div>
    );
  }

  if (!developer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Developer not found</p>
      </div>
    );
  }

  const totalAmount = (developer.hourly_rate / 60) * bookingForm.duration_minutes;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Avatar */}
            {developer.profile_picture_url && (
              <img
                src={developer.profile_picture_url}
                alt={developer.full_name}
                className="w-32 h-32 rounded-lg object-cover flex-shrink-0"
              />
            )}

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {developer.full_name}
              </h1>

              {/* Rating */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={20}
                      className={`${
                        i < Math.round(Number(developer.rating) || 0)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-lg text-gray-600">
                  {(Number(developer.rating) || 0).toFixed(1)} ({developer.total_reviews ?? 0} reviews)
                </span>
              </div>

              {/* Bio */}
              {developer.bio && (
                <p className="text-gray-700 mb-6 text-lg">{developer.bio}</p>
              )}

              {/* Key Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <p className="text-gray-600 text-sm">Hourly Rate</p>
                  <div className="flex items-center gap-1">
                    <DollarSign size={24} className="text-green-600" />
                    <span className="text-2xl font-bold text-gray-900">
                      {developer.hourly_rate}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Hours Worked</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {developer.total_hours_worked}h
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Experience</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {developer.experience_years || 'N/A'} years
                  </p>
                </div>
              </div>

              {/* Links */}
              <div className="flex gap-4">
                {developer.github_url && (
                  <a
                    href={developer.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                  >
                    <Github size={18} />
                    GitHub
                  </a>
                )}
                {developer.portfolio_url && (
                  <a
                    href={developer.portfolio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                  >
                    <Globe size={18} />
                    Portfolio
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8">
          {/* Left Column - Details */}
          <div className="col-span-2 space-y-6">
            {/* Skills */}
            {developer.skills && developer.skills.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Skills</h2>
                <div className="flex flex-wrap gap-3">
                  {developer.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Reviews</h2>
              {developer.reviews && developer.reviews.length > 0 ? (
                <div className="space-y-4">
                  {developer.reviews.map((review) => (
                    <div
                      key={review.id}
                      className="border-b border-gray-200 pb-4 last:border-b-0"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-gray-900">
                          {review.reviewer_name}
                        </p>
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={16}
                              className={`${
                                i < (Number(review.rating) || 0)
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-700">{review.review_text}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(review.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No reviews yet</p>
              )}
            </div>
          </div>

          {/* Right Column - Booking */}
          <div className="col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
              <button
                onClick={() => setShowBookingForm(!showBookingForm)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg mb-4 transition"
              >
                Book Now
              </button>

              {showBookingForm && (
                <form onSubmit={handleBooking} className="space-y-4">
                  {/* Duration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration (minutes)
                    </label>
                    <select
                      name="duration_minutes"
                      value={bookingForm.duration_minutes}
                      onChange={handleBookingChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={60}>1 hour</option>
                      <option value={120}>2 hours</option>
                      <option value={180}>3 hours</option>
                      <option value={480}>8 hours (full day)</option>
                    </select>
                  </div>

                  {/* Date/Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Schedule
                    </label>
                    <input
                      type="datetime-local"
                      name="scheduled_at"
                      value={bookingForm.scheduled_at}
                      onChange={handleBookingChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Total Amount */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600">Duration</span>
                      <span className="font-medium">
                        {bookingForm.duration_minutes} min
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-200">
                      <span className="text-gray-600">Rate</span>
                      <span className="font-medium">
                        ${developer.hourly_rate}/hr
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-900">Total</span>
                      <span className="text-xl font-bold text-blue-600">
                        ${totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={bookingLoading}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 rounded-lg transition"
                  >
                    {bookingLoading ? 'Creating booking...' : 'Continue to Payment'}
                  </button>

                  <p className="text-xs text-gray-500 text-center">
                    You will be charged after payment is confirmed
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperDetail;
