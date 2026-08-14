import "dotenv/config";
import { app } from "./app.js";
import {type Request, type Response} from 'express';

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
    console.log(`http://localhost:${port}`);
});