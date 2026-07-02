import jwt from 'jsonwebtoken'
import { redisClient } from '../server.js';
import users from '../models/users.js';

export const isAuth =async(req,res, next)=>{
    try{
        const token = req.cookies.accessToken;
        console.log(token);

        if(!token){
            return res.status(403).json({
                message:"Please Login no token",
            });
        }

        const decodedData =   jwt.verify(token.JWT_SECRET);

        if(!decodedData){
            return res.status(400).json({
                message:"token expired",
            });
        }

        const cacheUser = await redisClient.get(`uswe:${decodedData.id}`);

        if(cacheUser){
            req.user = JSON.parse(cacheUser);
            return next();
        }

        const User = await users.findById(decodedData.id).select("-password");

        redisClient.setEX(`user:${user.id}`,3600, JSON.stringify(User));

        req.User = User;
        next();


    }catch(error){
        res.status(500).json({
            message:error.message,
        })

    }
};



