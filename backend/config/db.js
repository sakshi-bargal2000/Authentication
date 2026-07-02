import mongoose from "mongoose";

 const connectDB = async()=>{
    try{
        await mongoose.connect(process.env.Mongo_URI);
        console.log("database connected");

    }catch(error){
        console.error(`Error: ${error.message}`);
        

    }
};

export default connectDB;