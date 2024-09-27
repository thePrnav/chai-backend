import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    //TODO: create playlist

    //__________________________________________________________________________________

 // Check if name and description are provided
 if (!name || !description) {
    throw new ApiError(400, "Name and description are required");
}

// Create a new playlist
const playlist = new Playlist({
    name,
    description,
    owner: req.user._id // Set the owner to the current user's ID
});

// Save the playlist to the database
await playlist.save();

// Return the created playlist
return res
.status(201)
.json(
    new ApiResponse(201, playlist, "Playlist created successfully")
);
});

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists

    //_______________________________________________________________________________

     // Check if userId is provided
     if (!userId) {
        throw new ApiError(400, "User ID is missing");
    }

    // Retrieve playlists for the specified user
    const playlists = await Playlist.find({ owner: userId })
        .populate('videos', 'title thumbnail') // Optionally populate video details
        .exec();

    // Return the list of playlists
    return res
    .status(200)
    .json(
        new ApiResponse(200, playlists, "Playlists retrieved successfully")
    );

})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id

    //____________________________________________________________________________________________

// Check if playlistId is provided
if (!playlistId) {
    throw new ApiError(400, "Playlist ID is missing");
}

// Retrieve the playlist by its ID
const playlist = await Playlist.findById(playlistId)
    .populate('videos', 'title thumbnail') // Optionally populate video details
    .exec();

// Check if the playlist exists
if (!playlist) {
    throw new ApiError(404, "Playlist not found");
}

// Return the playlist details
return res.status(200).json(new ApiResponse(200, playlist, "Playlist retrieved successfully"));

})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

//_________________________________________________________________________________


// Check if playlistId and videoId are provided
if (!playlistId || !videoId) {
    throw new ApiError(400, "Playlist ID and Video ID are required");
}

// Find the playlist and update it to include the new video
const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    { 
        $addToSet: { 
            videos: videoId 
        } 
    },                                                  // Use $addToSet to avoid duplicate video entries
    { new: true } // Return the updated playlist
).populate('videos', 'title thumbnail'); // Optionally populate video details

// Check if the playlist was found and updated
if (!updatedPlaylist) {
    throw new ApiError(404, "Playlist not found");
}

// Return the updated playlist
return res
.status(200)
.json(
    new ApiResponse(200, updatedPlaylist, "Video added to playlist successfully")
);

})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist

    //______________________________________________________________________________________________
 // Check if playlistId and videoId are provided
 if (!playlistId || !videoId) {
    throw new ApiError(400, "Playlist ID and Video ID are required");
}

// Find the playlist and update it to remove the video
const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    { 
        $pull: { 
            videos: videoId 
        } 
    },                                                  // Use $pull to remove the video from the videos array
    { new: true } // Return the updated playlist
).populate('videos', 'title thumbnail'); // Optionally populate video details

// Check if the playlist was found and updated
if (!updatedPlaylist) {
    throw new ApiError(404, "Playlist not found");
}

// Return the updated playlist
return res
.status(200)
.json(
    new ApiResponse(200, updatedPlaylist, "Video removed from playlist successfully")
);


})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist

    //_____________________________________________________________________________________

// Check if playlistId is provided
if (!playlistId) {
    throw new ApiError(400, "Playlist ID is required");
}

// Find and delete the playlist by its ID
const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId);

// Check if the playlist was found and deleted
if (!deletedPlaylist) {
    throw new ApiError(404, "Playlist not found");
}

// Return a success message
return res.status(200).json(new ApiResponse(200, null, "Playlist deleted successfully"));

})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist

//_____________________________________________________________________________________________________


// Check if playlistId is provided
if (!playlistId) {
    throw new ApiError(400, "Playlist ID is required");
}

// Prepare the update object
const updateData = {};
if (name) updateData.name = name; // Only add name if provided
if (description) updateData.description = description; // Only add description if provided

// Find and update the playlist by its ID
const updatedPlaylist = await Playlist.findByIdAndUpdate(
    req.user?._id,
    {
       $set: {
        playlistId,
        updateData,
       }
    },
    { new: true } // Return the updated playlist
);

// Check if the playlist was found and updated
if (!updatedPlaylist) {
    throw new ApiError(404, "Playlist not found");
}

// Return the updated playlist
return res
.status(200)
.json(
    new ApiResponse(200, updatedPlaylist, "Playlist updated successfully")
);

})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}