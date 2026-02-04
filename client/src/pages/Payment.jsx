import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bookingsAPI, paymentsAPI } from '../services/api';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CreditCard, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

const PaymentForm = ({ booking, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState(null);

  useEffect(() => {
    initializePayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking.id]);

  const initializePayment = async () => {
    try {
      const response = await paymentsAPI.createPaymentIntent(
        booking.id,
        'card'
      );
      setPaymentIntentId(response.data.paymentIntentId);
    } catch (error) {
      console.error('[DevHire] Payment init error:', error);
      toast.error('Failed to initialize payment');
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setLoading(true);

    try {
      const cardElement = elements.getElement(CardElement);

      const result = await stripe.confirmCardPayment(
        paymentIntentId,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (result.error) {
        toast.error(result.error.message);
      } else if (result.paymentIntent.status === 'succeeded') {
        // Confirm payment on backend
        await paymentsAPI.confirmPayment(
          booking.id,
          paymentIntentId,
          result.paymentIntent.payment_method
        );

        toast.success('Payment successful!');
        onSuccess();
      }
    } catch (error) {
      console.error('[DevHire] Payment error:', error);
      toast.error('Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handlePayment} className="space-y-4">
      <div className="p-4 bg-gray-50 rounded-lg">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#9e2146',
              },
            },
          }}
        />
      </div>

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
      >
        <CreditCard size={20} />
        {loading ? 'Processing...' : `Pay $${booking.total_amount.toFixed(2)}`}
      </button>
    </form>
  );
};

const PaymentPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('card');

  useEffect(() => {
    fetchBooking();
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

  const handlePaymentSuccess = async () => {
    try {
      // Confirm booking
      await bookingsAPI.confirmBooking(bookingId);
      toast.success('Booking confirmed! Redirecting...');
      navigate(`/booking/${bookingId}`);
    } catch (error) {
      console.error('[DevHire] Confirm booking error:', error);
      toast.error('Failed to confirm booking');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
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

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
          <p className="text-gray-600 mt-2">
            Complete your payment to confirm the booking
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Order Summary */}
          <div className="col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Order Summary
              </h2>

              <div className="space-y-4 pb-4 border-b border-gray-200">
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration</span>
                  <span className="font-medium">
                    {booking.duration_minutes} minutes
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Hourly Rate</span>
                  <span className="font-medium">${booking.hourly_rate}/hr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Scheduled</span>
                  <span className="font-medium">
                    {new Date(booking.scheduled_at).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4">
                <span className="text-lg font-bold">Total</span>
                <span className="text-2xl font-bold text-blue-600">
                  ${booking.total_amount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Payment Method
              </h2>

              <div className="space-y-3 mb-6">
                <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50" 
                       onClick={() => setPaymentMethod('card')}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={() => setPaymentMethod('card')}
                    className="w-4 h-4"
                  />
                  <CreditCard className="ml-3 text-gray-600" size={20} />
                  <span className="ml-3 font-medium text-gray-900">
                    Credit/Debit Card
                  </span>
                </label>

                <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                       onClick={() => setPaymentMethod('crypto')}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="crypto"
                    checked={paymentMethod === 'crypto'}
                    onChange={() => setPaymentMethod('crypto')}
                    className="w-4 h-4"
                  />
                  <Wallet className="ml-3 text-gray-600" size={20} />
                  <span className="ml-3 font-medium text-gray-900">
                    Crypto (USDC/USDT/ETH)
                  </span>
                </label>
              </div>

              {paymentMethod === 'card' && (
                <Elements stripe={stripePromise}>
                  <PaymentForm
                    booking={booking}
                    onSuccess={handlePaymentSuccess}
                  />
                </Elements>
              )}

              {paymentMethod === 'crypto' && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-900 mb-4">
                    Crypto payments are coming soon! Please select credit card for now.
                  </p>
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Switch to Card
                  </button>
                </div>
              )}
            </div>

            {/* Security Notice */}
            <div className="p-4 bg-gray-100 rounded-lg text-sm text-gray-600">
              Your payment information is secure and encrypted. We never store
              your credit card details on our servers.
            </div>
          </div>

          {/* Booking Details Sidebar */}
          <div>
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Booking</h3>

              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-600">Developer</p>
                  <p className="font-medium text-gray-900">
                    {booking.developer_name}
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-200">
                  <p className="text-gray-600">Duration</p>
                  <p className="font-medium text-gray-900">
                    {booking.duration_minutes} minutes
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-200">
                  <p className="text-gray-600">Scheduled Time</p>
                  <p className="font-medium text-gray-900">
                    {new Date(booking.scheduled_at).toLocaleString()}
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-200 bg-blue-50 p-3 rounded">
                  <p className="text-gray-600">Total Amount</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${booking.total_amount.toFixed(2)}
                  </p>
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-4">
                Once payment is confirmed, you'll receive video call details
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
