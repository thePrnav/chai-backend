import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video

    const userId = req.user._id;  // Get the authenticated user's ID

    try {
        // Check if the user has already liked the video
        const existingLike = await Like.findOne(
            {
            video: videoId, 
            likedBy: userId 
        });

        if (existingLike) {
            // If the user has already liked the video, remove the like (unlike the video)
            await Like.findByIdAndDelete(existingLike._id);

            return res.status(200).json(
                new ApiResponse(200, null, "The video has been unliked successfully.")
            );
        } else {
            // If the user has not liked the video, add a new like
            const newLike = new Like({
                video: videoId,
                likedBy: userId,
            });

            await newLike.save();

            return res.status(200).json(
                new ApiResponse(200, null, "The video has been liked successfully.")
            );
        }
    } catch (error) {
        // Handle any errors that occur during the database update
        throw new ApiError(500, error?.message || "Failed to toggle like on the video.");
    }
})

const toggleVideoDislike = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { videoId } = req.params;

    try {
        // Update the video: Add to dislikes and remove from likes
        await Video.findByIdAndUpdate(videoId, {
            $addToSet: { dislikes: userId },  // Add userId to dislikes if not already present
            $pull: { likes: userId },         // Remove userId from likes if it's there
        });

        // Respond with success
        return res
            .status(200)
            .json(new ApiResponse(200, null, "The video has been disliked successfully."));
    } catch (error) {
        // Handle errors
        throw new ApiError(500, error?.message || "Failed to dislike the video.");
    }
});


const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment

//_______________________________________________________________________________________________________

    const userId = req.user.id;        // Get the ID of the currently logged-in user

    try {
        // Check if the user has already liked the comment
        const existingLike = await Like.findOne({
            comment: commentId,
            likedBy: userId
        });

        if (existingLike) {
            // If the user already liked the comment, remove the like (unlike)
            await Like.findByIdAndDelete(existingLike._id);

            return res.status(200).json(
                new ApiResponse(200, null, "Like removed from comment.")
            );
        } else {
            // If the user has not liked the comment, add a new like
            const newLike = new Like({
                comment: commentId,
                likedBy: userId
            });

            await newLike.save();

            return res.status(201).json(
                new ApiResponse(201, newLike, "Comment liked successfully.")
            );
        }
    } catch (error) {
        // Handle errors
        throw new ApiError(500, error?.message || "Failed to toggle like on comment.");
    }

})



//_________________ in project tweet, getLikedVideos not included ________
const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos,
    toggleVideoDislike
}