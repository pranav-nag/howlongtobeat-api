import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes';

const app = express();

app.use(cors()); // Allow all origins by default for extension usage
app.use(express.json());

app.use('/api', apiRouter);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'HowLongToBeat Scraper API is running.' });
});

export default app;
