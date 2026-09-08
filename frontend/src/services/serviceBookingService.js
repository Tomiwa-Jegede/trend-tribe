// src/services/serviceBookingService.js
import api from "../api/axios";

export const bookService = async (listingId) => {
  const { data } = await api.post(`/services/listings/${listingId}/book`);
  return data;
};
export const confirmServiceBooking = async (bookingId) => {
  const { data } = await api.post(`/services/bookings/${bookingId}/confirm`);
  return data;
};
export const completeServiceBooking = async (bookingId) => {
  const { data } = await api.post(`/services/bookings/${bookingId}/complete`);
  return data;
};
export const disputeServiceBooking = async (bookingId, payload = {}) => {
  const { data } = await api.post(`/services/bookings/${bookingId}/dispute`, payload);
  return data;
};
export const cancelServiceBooking = async (bookingId) => {
  const { data } = await api.post(`/services/bookings/${bookingId}/cancel`);
  return data;
};
export const getServiceBookings = async () => {
  const { data } = await api.get("/services/bookings");
  return data;
};
