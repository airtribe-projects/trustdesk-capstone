import 'dotenv/config';
import app from './app';
import { logger } from './utils/logger';

const PORT = parseInt(process.env.PORT || '3000', 10);

app.listen(PORT, () => {
  logger.info(`TrustDesk backend running on http://localhost:${PORT}`);
  logger.info(`API base: http://localhost:${PORT}/api`);
  logger.info(`Demo login: ${process.env.DEMO_USER_EMAIL || 'agent@trustdesk.com'} / ${process.env.DEMO_USER_PASSWORD || 'trustdesk123'}`);
});
