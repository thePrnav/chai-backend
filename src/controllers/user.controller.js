import { asyncHandler } from "../utils/asyncHandler.js ";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"

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
            $set: {
                refreshToken: undefined
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

     if(incomingRefreshToken){
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

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}