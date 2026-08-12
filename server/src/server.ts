import "dotenv/config";
import { app } from "./app.js";
import {type Request, type Response} from 'express';

const port = Number(process.env.PORT) || 3000;

app.get("/", (req: Request, res: Response) => {
    res.json({ message: "Server is running" });
});

app.listen(port, () => {
    console.log(`http://localhost:${port}`);
});