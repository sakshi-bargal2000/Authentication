import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import  connectDB  from './config/db.js';
import { createClient } from 'redis';
import cookieParser from 'cookie-parser';
import userRoutes from './routes/userRoutes.js';

const app = express();
dotenv.config();
await connectDB();

//redis
const redisUrl = process.env.REDIS_URL

if(!redisUrl){
    console.log("missing redis url");
    process.exit(1);
}

export const redisClient = createClient({
    url :redisUrl,
});

redisClient.connect().then(()=>console.log("Connected to redis")).catch(console.error);





//const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use("/api/v1", userRoutes);




app.listen(5002,()=>{
    console.log("Server Runnning on 5002");
})