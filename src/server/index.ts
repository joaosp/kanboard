import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { authRouter } from './routes/auth';
import { boardsRouter } from './routes/boards';
import { listsRouter } from './routes/lists';
import { cardsRouter } from './routes/cards';
import { errorHandler } from './middleware/errors';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRouter);
app.use('/api/boards', boardsRouter);
app.use('/api/boards', listsRouter);
app.use('/api', listsRouter);
app.use('/api/lists', cardsRouter);
app.use('/api', cardsRouter);
app.use(errorHandler);

app.listen(PORT, () => {
  console.warn(`Server running on port ${PORT}`);
});
