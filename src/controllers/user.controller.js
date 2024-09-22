import { asyncHandler } from "../utils/asyncHandler.js ";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import { Subscription } from "../models/subscription.model.js";
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        user.save({ValidateBeforeSave: false})

        return {accessToken, refreshToken}
        
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token")
    }
}

const registerUser = asyncHandler(async(req,res) => {

//_______________________ Algo ______________________________________________
    
    // Register User :- step by step process (Logic Building) 

    // 1) get user details from frontend
    // 2) validation - not empty
    // 3) check if user already exists:- username , email
    // 4) check for images, check for avatar
    // 5) upload them to cloudinary, avatar
    // 6) create user object - create entry in db
    // 7) remove password and refresh token field  from response
    // 8) check for user creation 
    // 9) return response 

//_______________________________________________________________________________________

// steps :-

// 1)
    const {fullname, email, username, password} = req.body
    //console.log("email:", email);

// 2)
    if(
        [fullname, email, username, password].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400, "All fields are required")
    }

// 3)
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    
    if (existedUser){
        throw new ApiError(409, "User with email or username already exists")
    }

    //console.log(req.files);
    

// 4)
    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;    //scoop issues
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }

// 5)
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400, "Avatar file is required")
    }

// 6)
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

// 7)
    const createdUser = await User.findById(user._id).select("-password -refreshToken")

// 8)
    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user")
    }

// 9)
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

})

const loginUser = asyncHandler(async(req,res) => {

//_______________________ Algo ______________________________________________
    
    // Login User :- step by step process (Logic Building) 

    // 1) req body -> data 
    // 2) username or email 
    // 3) find the user
    // 4) check password
    // 5) access & refresh token
    // 6) send cookie
     
//_______________________________________________________________________________________

   const {username, email , password} = req.body

   if(!username && !email){
          throw new ApiError(400, "username or email is required")
   }

   // Here is an alternative of above code based on logic discussed in video:
    // if (!(username || email)) {
    //     throw new ApiError(400, "username or email is required")
        
    // }

   const user = await User.findOne({
    $or: [{username}, {email}]
   })

   if(!user){
        throw new ApiError(404, "User does not exist")
   }

   const isPasswordvalid = await user.isPasswordCorrect(password)

   if(!isPasswordvalid){
    throw new ApiError(401, "Invalid user credentials")
   }

   const {refreshToken, accessToken} = await generateAccessAndRefreshTokens(user._id)

   const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

   const options = {                     // ye cookies default modifiable hoti hai toh koi bhi access kar sakta hai
    httpOnly: true,                      //  jab (httpOnly : true, secure: true) karte ho tab cookies server se hi modifiable hoti hai
    secure: true
   }

   return res
   .cookie("accessToken", accessToken, options)
   .cookie("refreshToken", refreshToken, options)
   .json(
    new ApiResponse (
        200, 
        {
            user: loggedInUser, accessToken, refreshToken
        },
        "User logged in successfully"
    )
   )

})

const logoutUser = asyncHandler(async(req, res) => {
       await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1  // this remove the field from document
            }
        },
        {
            new: true
        }
       )

       const options = {
        httpOnly: true,
        secure: true
       }

       return res
       .status(200)
       .clearCookie("accessToken", options)
       .clearCookie("refreshToken", options)
       .json(new ApiResponse(200, {}, "User logged out"))
})

const refreshAccessToken = asyncHandler(async(req, res) => {
     const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

     if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request")
     }



     try {
        const decodedToken = jwt.verify(
           incomingRefreshToken,
           process.env.REFRESH_TOKEN_SECRET
        )
   
        const user = await User.findById(decodedToken?._id)
   
        if(!user){
           throw new ApiError(401, "Invalid refresh token")
        }
   
        if(incomingRefreshToken !== user?.refreshToken){
           throw new ApiError(401, "Refresh token is expired or used")
        }
   
        const options = {            // options ko globally declared karenge toh application aur bhi optimize ban sakti hai
           httpOnly: true,
           secure: true
        }
   
       const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
   
       return res 
       .status(200)
       .cookie("accessToken", accessToken, options)
       .cookie("refreshToken", newRefreshToken, options)
       .json(
           new ApiResponse(
               200,
               {accessToken, refreshToken: newRefreshToken },
               "Access token refreshed"
           )
       )
     } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
     }


})


const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body

    // if(!(newPassword === confPassword )){
    //        throw new ApiError()         // if confirm password check karna ho , new = confirm and parameter mai confpassword add karo
    // }

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({ValidateBeforeSave: false})

    return res
    .status(200)
    .json( new ApiResponse(200, {}, "Password is changed successfully"))
})


const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(200, req.user, "Current user fetched successfully")
})


const updateAccountDetails = asyncHandler(async(req, res) => {
    const{fullname, email} = req.body

    if(!fullname || !email){
        throw new ApiError(400, "All fields are required")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email: email         // ye dono style chalte hai , consistency keliye koi bhi ek select kar
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Account details updated successfully")
    )
})



const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400, "Error while uploading on avatar")
    }

    // TODO: delete old image - Assignment

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar image updated successfully")
    )
})


const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400, "Error while uploading on cover image")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover image updated successfully")
    )
})


const getUserChannelProfile = asyncHandler(async(req, res) => {
     const {username} = req.params;
     if(!username?.trim()){
        throw new ApiError(400, "Username is missing")
     }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        }, 
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"              // mere subscriber kitne hai (follower)
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"                      // maine kisko subscribed kar rakha hai (following)
            },
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"               // $subscribers  - field hai isliye " $ " lagaya hai
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"           
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id , "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullname: 1,
                username: 1,               
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1


            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404, "Channel does not exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    )
})

const getWatchHistory = asyncHandler(async(req, res) => {
    // req.user?._id            // interview question :- (req.user?._id ) is maise MongoDB se string milti hai , mongoose behind scene MongoDB se id provide karvata hai

    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetch successfully"
        ) 
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}