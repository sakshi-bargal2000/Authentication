import { loginSchema, registerSchema } from "../config/zod.js";
import TryCatch from "../middleware/TryCatch.js";
import sanitize from "mongo-sanitize";
import users from "../models/users.js";
import bcrypt from 'bcrypt';
import crypto, { generateKey } from 'crypto';
import { RedisClient } from "redis";
import { getOtpHtml } from "../config/html.js";
import sendMail from "../config/sendMail.js";
import { redisClient } from "../server.js";
import { getVerifyEmailHtml } from "../config/html.js";
import { generateAccessToken, generateToken, revokeRefershToken, verifyrefershToken } from "../config/generateToken.js";
import { constrainedMemory } from "process";
//import sendMail from "../config/sendMail.js";


export const registerUser = TryCatch(async (req, res) => {
    const sanitezedBody = sanitize(req.body);
    const validation = registerSchema.safeParse(sanitezedBody);


    if (!validation.success) {
        const zodError = validation.error;


        let firstErrorMessage = "Validation failed";
        let allErrors = [];

        if (zodError?.issues && Array.isArray(zodError.issues)) {
            allErrors = zodError.issues.map((issue) => ({
                field: issue.path ? issue.path.join(".") : "unknown",
                message: issue.message || "validation Error",
                code: issue.code
            }));

            firstErrorMessage = allErrors[0]?.message || "Validation Error";
        }
        return res.status(400).json({
            message: firstErrorMessage,
            error: allErrors
        });
    }

    const { name, email, password } = validation.data;

    //for save in database

//     const existingUser = await users.findOne({ email });
//     if (existingUser) {
//         return res.status(400).json({
//             message: "User already exists"
//         });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);

//     const user = await users.create({
//         name,
//         email,
//         password: hashedPassword,
//     });

//     res.status(201).json({
//         message: "User registered successfully",
//         user: {
//             _id: user._id,
//             name: user.name,
//             email: user.email
//         }
//     });
//  });   


    // for verify email and redis rate limit
        const rateLimitKey = `register-rate-limit:${req.ip}:${email}`;


        if(await redisClient.get(rateLimitKey)){
            return res.status(429).json({
                message:"Too many request, try again later",
            });
        }
        //console.log(await redisClient.get(rateLimitKey));

        const existingUser = await users.findOne({email});

        if(existingUser){
            return res.status(400).json({
                message:"User already exist"
            });
        }

        const hashPassword = await bcrypt.hash(password,10);

        const verifyToken = crypto.randomBytes(32).toString("hex");


        const verifyKey = `verify:${verifyToken}`;



        const datatoStore = JSON.stringify({
            name,email,password:hashPassword
        });


        await redisClient.set(verifyKey, datatoStore,{EX:300});


        const subject = "Verify your email for account Creation";
    
        const html= getVerifyEmailHtml({email, token:verifyToken});
        

        await sendMail({ email,subject,html});
          

        await redisClient.set(rateLimitKey, "true",{EX:60});
       

    res.json({ message:"If you email is valid, a verfication link has been sent, it will expire in 5 min"});
});

export const verifyUser = TryCatch(async (req, res) => {
    const {token} = req.params;
    

    if (!token) {
        return res.status(400).json({
            message: "verfication token is required",
        });
    }

    const verifyKey = `verify:${token}`;
    

    const userDataJson = await redisClient.get(verifyKey);
    console.log(userDataJson);
    
    if (!userDataJson) {
        return res.status(400).json({
            message: "Varification link expired",
        });
    }

    

    const userData = JSON.parse(userDataJson);
    console.log(userData.email);

    const existingUser = await users.findOne({ email: userData.email });
 
    if (existingUser) {
        return res.status(400).json({
            message: "User already exist"
        });
    }
    console.log("No user");
    

    const newUser = await users.create({
        name: userData.name,
        email: userData.email,
        password:userData.password,
    });
    console.log(newUser);
    await redisClient.del(verifyKey);

    res.status(201).json({
        message:"Email Verified succesfully, your account has been created",
        user: {_id:newUser._id,name:newUser.name,email:newUser.email},
    });



});

export const loginUser = TryCatch(async(req,res)=>{
    
    const sanitezedBody = sanitize(req.body);
    const validation = loginSchema.safeParse(sanitezedBody);


    if (!validation.success) {
        const zodError = validation.error;


        let firstErrorMessage = "Validation failed";
        let allErrors = [];

        if (zodError?.issues && Array.isArray(zodError.issues)) {
            allErrors = zodError.issues.map((issue) => ({
                field: issue.path ? issue.path.join(".") : "unknown",
                message: issue.message || "validation Error",
                code: issue.code
            }));

            firstErrorMessage = allErrors[0]?.message || "Validation Error";
        }
        return res.status(400).json({
            message: firstErrorMessage,
            error: allErrors
        });
    }

    const {  email, password } = validation.data;
    

    const rateLimitKey = `login-rate-limit:${req.ip}:${email}`;
    

    if(await redisClient.get(rateLimitKey)){
        return res.status(429).json({
            message:"too many request, try again later",
        });
    }
    

    const User = await users.findOne({email})
    

    if(!User){
        return res.status(400).json({
            message:"Invalid Credential",
        });
    }

    const comparePassword = await bcrypt.compare(password,User.password);
    

    if(!comparePassword){
        return res.status(400).json({
            message:"Invalid password",
        });
    }

    const otp = Math.floor(100000 + Math.random()*900000).toString();

    const otpKey = `otp:${email}`;

    await redisClient.set(otpKey, JSON.stringify(otp),{EX:300});

    const subject = "otp for verification";

    const html = getOtpHtml({email, otp});
    console.log("7.html");

    await sendMail({email,subject,html});

    await redisClient.set(rateLimitKey,"true",{EX:60});
    console.log("8.redis");

    res.json({
        message:"If your mail is valid, an otp has been sent, it is valid for 5 min "
    });

});

export const verifyOtp = TryCatch(async(req,res)=>{
    const {email,otp}= req.body;
   

    if(!email|| !otp){
        return res.status(400).json({
            message:"Please provide all detials",
        });
    }

    const otpKey = `otp:${email}`;
    

    const storedOtpString = await redisClient.get(otpKey);
    

    if(!storedOtpString){
        return res.status(400).json({
            message:"otp expired",
        });
    }

    const storedOtp = JSON.parse(storedOtpString);
    

    if(storedOtp != otp){
        return res.status(400).json({
            message:"Invalid otp",
        });
    }

    await redisClient.del(otpKey);
    

    let User = await users.findOne({email});
    

    const tokenData = await generateToken(User._id, res);
    

    res.status(200).json({message:`Welcome ${User.name}`, User});
});

export const myProfile = TryCatch(async(req,res)=>{
    const User= req.User;
    

    res.json(User);
});

export const refershToken = TryCatch(async(req,res)=>{

    const refershToken = req.cookies.refershToken;

    if(!refershToken){
        return res.status(401).json({
            message:"Invalid Refersh Token"
        });
    }

    const decode = await verifyrefershToken(refershToken);

    if(!decode){gen
        return res.status(401).json({
            message:"Invalid refesh token"
        });

    }

    generateAccessToken(decode.id,res);

    res.status(200).json({
        message:"Token refreshed"
    });

});

export const logoutUser = TryCatch(async(req,res)=>{
    const userId = req.user._id;

    await revokeRefershToken(userId);

    res.clearCookie("refershToken");
    res.clearCookie("accessToken");

    await redisClient.del(`user:${userId}`);

    res.json({
        message:"Logout successfully"
    });
})