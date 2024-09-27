import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query = '', sortBy = 'createdAt', sortType = 'desc', userId } = req.query
    //TODO: get all videos based on query, sort, pagination


    //_____________________________________________________________________________________________________________________

    try {
        // Build search criteria (filter by title and optionally by userId)
        const searchCriteria = {
            title: { $regex: query, $options: 'i' },  // Case-insensitive search by title
            ...(userId && { userId })                 // Optional userId filter if provided
            };
    
        // Fetch videos based on the search criteria, sorting, and pagination
        const videos = await Video.find(searchCriteria)
            .sort({ [sortBy]: sortType === 'desc' ? -1 : 1 })  // Dynamic sorting based on the query
            .skip((page - 1) * limit)                           // Skip videos for pagination
            .limit(Number(limit));                              // Limit the number of results per page
    
        // Get the total number of videos matching the search criteria (for pagination info)
        const totalVideos = await Video.countDocuments(searchCriteria);
    
        // Return the videos along with pagination info
        return res.status(200).json(
            new ApiResponse(200, {
                videos,
                totalVideos,
                totalPages: Math.ceil(totalVideos / limit),
                currentPage: Number(page),
                }, "Videos fetched successfully.")
            );
        } catch (error) {
            // Handle potential errors
            throw new ApiError(500, error?.message || "Failed to fetch videos.");
        }
    
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
    //console.log('Request Body:', req.body);

    //____________________________________________________________________________________

    const videoFilePath = req.files?.video[0]?.path; 

    // Ensure video file is present in request
    if (!videoFilePath){
         throw new ApiError(400, "Video file is required")
    }

    
    try {
        // upload video to cloudinary
        const uploadVideoFile = await uploadOnCloudinary(videoFilePath)
    
        if (!uploadVideoFile){
            throw new ApiError(400, "Video file is required")
        }
    
        // Create the video in the database
        const newVideoFile = await Video.create({
            videoFile: uploadVideoFile.url, // cloudinary url
            title,
            description,
            owner: req.user._id,                  // Assuming user is logged in and their ID is available
            thumbnail: uploadVideoFile.url ,           // Optional: Example for thumbnail (can be generated from video)
            isPublished: true,                 // Automatically mark as published
            duration: uploadVideoFile.duration,            // Optional: Cloudinary returns video duration
        });
    
        const savedVideo = await newVideoFile.save()
    
        return res
        .status(201)
        .json(
            new ApiResponse(200 ,savedVideo, "Video uploaded and published successfully" )
        )
    } catch (error) {
        throw new ApiError(500, error?.message || "Video upload failed")
    }


})


const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id

    //____________________________________________________

    //  Check if videoId is provided
    if(!videoId){
        throw new ApiError(400, "Video is required");
    }

    try {
        // Fetch the video from the database by its ID
        const video = await Video.findById(videoId?._id); // Assuming owner is a reference
    

        //  If video does not exist, throw an error
        if(!video){
            throw new ApiError(404, "Video not found");
        }
    
        // Return the video details in the response
        return res
        .status(200)
        .json(
            new ApiResponse(200, video, "Video fetched successfully")
        )
    } catch (error) {
         // Handle potential errors
        throw new ApiError(500, error?.message || "Failed to fetch video")
    }
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

    //_______________________________________________________________________________________________

    const { title, description, thumbnail } = req.body;  // Extract fields to update from request body

    try {
        
        const video = await Video.findById(videoId?._id);

        if (!video){
            throw new ApiError(404, "Video not found!")
        }

        if (req.user._id === video.userId) {
           const updateVideo = await Video.findByIdAndUpdate(
            videoId?._id,
            {
                $set: {
                    ...(title && { title }),           // Update title if provided
                    ...(description && { description }), // Update description if provided
                    ...(thumbnail && { thumbnail })    // Update thumbnail if provided
                }
            },
            { new: true }  // Return the updated document        
           );

           // Return the updated video details in the response
        return res
        .status(200)
        .json(
            new ApiResponse(200, updateVideo, "Video details are updated successfully")
        );
        }
       else{
        throw new ApiError(403, updateVideo, "Video details are required")

       }
    } catch (error) {
        // Handle any errors that may occur
        throw new ApiError(500, error?.message || "Failed to update video");
    }

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video

    //____________________________________________________________________________________________

    try {
        const video = await Video.findById(videoId?._id)

        if(!video){
            throw new ApiError(404, "Video not found")
        }

        if (req.user._id === video.userId) {

            await Video.findByIdAndDelete(videoId?._id);

            return res
            .status(200)
            .json(
                new ApiResponse(200, video, "The video has been deleted.")
            );
          } else {
            throw new ApiError(404 , "You can delete only your video!");
          }

    } catch (error) {
        throw new ApiError(500, error?.message || "Failed to delete video")
    }
})


//____________________________________________________ new Features _______________________________________________________________

const addView = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    try {
        // Increment the views of the video by 1
        await Video.findByIdAndUpdate(videoId, {
            $inc: { views: 1 },
        });

        // Return success response
        return res
            .status(200)
            .json(new ApiResponse(200, null, "The view has been increased."));
    } catch (error) {
        // Handle potential errors
        throw new ApiError(500, error?.message || "Failed to increase the view count.");
    }
});


const randomVideo = asyncHandler(async (req, res) => {
    try {
        // Fetch 40 random videos using MongoDB's $sample aggregation stage
        const videos = await Video.aggregate([{ $sample: { size: 40 } }]);

        // Return the random videos in the response
        return res
            .status(200)
            .json(
                new ApiResponse(200, videos, "Random videos fetched successfully.")
            );
    } catch (error) {
        // Handle any potential errors
        throw new ApiError(500, error?.message || "Failed to fetch random videos.");
    }
});


const trendVideo = asyncHandler(async (req, res) => {
    try {
        // Fetch all videos and sort them by 'views' in descending order (trending)
        const videos = await Video.find()
        .sort(
            { views: -1 }
        );

        // Return the sorted videos (trending) in the response
        return res
            .status(200)
            .json(
                new ApiResponse(200, videos, "Trending videos fetched successfully.")
            );

    } catch (error) {
        // Handle any potential errors
        throw new ApiError(500, error?.message || "Failed to fetch trending videos.");
    }
});


const subscribedVideo = asyncHandler(async (req, res) => {
    try {
        // Fetch the user by their ID to get the list of subscribed channels
        const user = await User.findById(req.user.id);
        const subscribedChannels = user.subscribedUsers;

        // Fetch videos from all subscribed channels
        const list = await Promise.all(
            subscribedChannels.map(async (channelId) => {
                return await Video.find({ userId: channelId });
            })
        );

        // Flatten the array of video lists and sort by creation date (newest first)
        const sortedVideos = list
        .flat()
        .sort((a, b) => b.createdAt - a.createdAt);

        // Return the sorted list of videos
        return res
            .status(200)
            .json(
                new ApiResponse(200, sortedVideos, "Subscribed channels videos fetched successfully.")
            );
    } catch (error) {
        // Handle potential errors
        throw new ApiError(500, error?.message || "Failed to fetch videos from subscribed channels.");
    }
});

const videoGetByTag = asyncHandler(async (req, res) => {
    const tags = req.query.tags.split(",");

    try {
        // Find videos that match any of the given tags, limited to 20 results
        const videos = await Video.find(
            { 
                tags: {
                 $in: tags 
                } 
            }).limit(20);

        // Return the matching videos
        return res
            .status(200)

            .json(
                new ApiResponse(200, videos, "Videos fetched by tags successfully.")
            );
    } catch (error) {
        // Handle potential errors
        throw new ApiError(500, error?.message || "Failed to fetch videos by tags.");
    }
});


const searchVideo = asyncHandler(async (req, res) => {
    const query = req.query.q;

    try {
        // Search videos by title using a case-insensitive regex
        const videos = await Video.find({
            title: { $regex: query, $options: "i" },
        }).limit(40);

        // Return the search results
        return res
            .status(200)
            .json(new ApiResponse(200, videos, "Search results fetched successfully."));
    } catch (error) {
        // Handle potential errors
        throw new ApiError(500, error?.message || "Failed to fetch search results.");
    }
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    // TODO :- badmai kabi toh
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
    addView,
    randomVideo,
    trendVideo,
    subscribedVideo,
    videoGetByTag,
    searchVideo
    
}