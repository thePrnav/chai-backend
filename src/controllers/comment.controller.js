import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    //____________________________________________________________

    try {
        // Fetch comments for the specific video, sorted by creation date (newest first)
        const comments = await Comment.find({ videoId })
            .sort({ createdAt: -1 })              // Sort comments by creation date (descending)
            .skip((page - 1) * limit)             // Skip comments for pagination
            .limit(Number(limit));                // Limit the number of comments per page

        // Get the total number of comments for pagination info
        const totalComments = await Comment.countDocuments({ videoId });

        // Return the comments along with pagination info
        return res.status(200).json(
            new ApiResponse(200, {
                comments,
                totalComments,
                totalPages: Math.ceil(totalComments / limit),
                currentPage: Number(page),
            }, "Comments fetched successfully.")
        );
    } catch (error) {
        // Handle potential errors
        throw new ApiError(500, error?.message || "Failed to fetch comments.");
    }

})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video

    //_______________________________________________________________

        // Create a new comment with the request body and user ID from the authenticated user
        const newComment = new Comment({ 
            ...req.body, 
            userId: req.user.id 
        });
    
        try {
            // Save the comment to the database
            const savedComment = await newComment.save();
    
            // Return the saved comment in the response
            return res
                .status(200)
                .json(
                    new ApiResponse(200, savedComment, "Comment added successfully.")
                );
        } catch (error) {
            // Handle potential errors
            throw new ApiError(500, error?.message || "Failed to add comment.");
        }
    });
    

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment

    //________________________________________________________________________

    try {
        // Find the comment by its ID
        const comment = await Comment.findById(req.params.id);
        if (!comment) {
            throw new ApiError(404, "Comment not found");
        }

        // Find the video associated with the comment
        const video = await Video.findById(comment.videoId); // Assuming comment has a videoId field
        if (!video) {
            throw new ApiError(404, "Video not found");
        }

        // Check if the user owns the comment or the video
        if (req.user.id === comment.userId || req.user.id === video.userId) {
            // Delete the comment
            await Comment.findByIdAndDelete(req.params.id);
            
            // Respond with success message
            return res.status(200).json(
                new ApiResponse(200, null, "The comment has been deleted successfully.")
            );
        } else {
            // User is not authorized to delete the comment
            throw new ApiError(403, "You can only delete your own comment!");
        }
    } catch (error) {
        // Handle potential errors
        throw new ApiError(500, error?.message || "Failed to delete comment.");
    }
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }