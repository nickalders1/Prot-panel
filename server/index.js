import 'dotenv/config';
import DDosProtectionAPI from './api.js';

// Create and start the API server
const api = new DDosProtectionAPI();
api.start(process.env.PORT || 3001);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  if (api.db) {
    api.db.close();
  }
  process.exit(0);
});