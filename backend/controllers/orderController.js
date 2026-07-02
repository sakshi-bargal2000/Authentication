export const getOrder = TryCatch(async(req,res)=>{

    console.log("OrderController")

    res.status(200).json({
        message:"Token refreshed"
    });

});