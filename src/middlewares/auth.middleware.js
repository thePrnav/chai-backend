import { ApiError } from "../utils/ApiError.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js"



export const verifyJWT = asyncHandler(async(req, _ , next) => {
       try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
 
         if(!token){
             throw new ApiError(401, "Unauthorized Request")
         }
 
         const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
 
         const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
 
         if(!user){
             // NEXT_POST_TODO: discuss about frontend              (Access and refresh token ka itnahi kaam hai ki user ko
             //                                                                      email & password bar-bar dena na pade)
             throw new ApiError(401, "Invalid Access Token ")
         }
 
         req.user = user
         next()
       } catch (error) {
             throw new ApiError(401,error?.message || "Invalid access Token")
       }

})