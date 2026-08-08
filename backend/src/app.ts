import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import rateLimit from 'express-rate-limit';
import router from './routes/index';
import { logger } from './utils/logger';

const app = express();

// CORS
app.use(cors({ origin: '*', credentials: true }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  message: { error: 'Too many requests' },
});
app.use('/api', limiter);

// API routes
app.use('/api', router);

// Serve frontend static files
const frontendPath = path.resolve(__dirname, '../../frontend/dist');
const frontendIndexPath = path.resolve(__dirname, '../../frontend/index.html');
const fs = require('fs');

if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendPath, 'index.html'));
    }
  });
} else if (fs.existsSync(frontendIndexPath)) {
  // Serve plain HTML frontend
  app.use(express.static(path.resolve(__dirname, '../../frontend')));
  app.get('/', (req, res) => {
    res.sendFile(frontendIndexPath);
  });
} else {
  app.get('/', (req, res) => {
    res.json({ message: 'TrustDesk API is running', docs: '/api/tickets' });
  });
}

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err });
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
