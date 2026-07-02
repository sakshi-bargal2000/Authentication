import jwt from 'jsonwebtoken'
import { redisClient } from '../server.js';

export const generateToken= async(id,res)=>{
    
     const accessToken = jwt.sign({id}, process.env.JWT_SECRET,{expiresIn:"1m"});
     

     const refreshToken = jwt.sign({id}, process.env.REFRESH_SECRET,{expiresIn:"7d"});
     

     const refershTokenKey = `refersh_token:${id}`;
      

     await redisClient.set(refershTokenKey,7*24*60*60, refreshToken);
 
     res.cookie("accessToken", accessToken,{
        httpOnly:true,
        //secure:true,
        sameSite:"strict",
        maxAge : 1*60*1000
     });
 
      res.cookie("refershToken", refreshToken,{
        httpOnly:true,
        //secure:true,
        //sameSite:"none",
        maxAge : 7*24*60*60*1000
     });
     

     return {accessToken, refreshToken};

};

export const verifyrefershToken= async(refreshToken)=>{
    try{

        const decode = jwt.verify(refreshToken, process.env.REFRESH_TOKEN);

        const storedToken = await redisClient.get(`refreshToken:${decode.id}`);

        if(storedToken == decode){
            return decode
        }
        return null;

    }catch(error){
        null
    }

};

export const generateAccessToken= (id,res)=>{
    const accessToken = jwt.sign({id}, process.env.JWT_SECRET,{EX:"1m"});

     res.cookie("accessToken", accessToken,{
        httpOnly:true,
        //secure:true,
        sameSite:"strict",
        maxAge : 1*60*1000
     });

}

export const revokeRefershToken = async(userId)=>{
   await redisClient.del(`refersh_token: ${userId}`);
}