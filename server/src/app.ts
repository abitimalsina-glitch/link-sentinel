import express, { type Express } from "express";
import router from './routes/routes'

export const app: Express = express();

app.use(express.json());
app.use(router);