import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import eventRoutes from './routes/events.js';
import placeRoutes from './routes/places.js';
import bookingRoutes from './routes/bookings.js';
import availabilityRoutes from './routes/availability.js';
import availabilityUnifiedRoutes from './routes/availability-unified.js';
import schedulingIntelligenceRoutes from './routes/scheduling-intelligence.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: true }));
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/user', userRoutes); // Alias for /user/profile
app.use('/me', userRoutes); // Alias for counts
app.use('/events', eventRoutes);
app.use('/places', placeRoutes);
app.use('/bookings', bookingRoutes);
app.use('/availability', availabilityRoutes); // Legacy routes
app.use('/api/availability', availabilityUnifiedRoutes); // Unified availability engine
app.use('/api/scheduling', schedulingIntelligenceRoutes); // Scheduling intelligence

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`oh places API running at http://localhost:${PORT}`);
});
