import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription

    //___________________________________________________________________________________________________________________

// Check if the channelId is provided
if (!channelId) {
    throw new ApiError(400, "Channel ID is missing");
}

const subscriberId = req.user._id; // The ID of the user who is subscribing/unsubscribing

// Check if the subscription already exists
const subscriptionExists = await Subscription.findOne({
    subscriber: subscriberId,
    channel: channelId
});

if (subscriptionExists) {
    // If subscription exists, remove it
    await Subscription.deleteOne(
        { 
            _id: subscriptionExists._id 
        }
    );

    return res
    .status(200)
    .json(
        new ApiResponse(200, null, "Unsubscribed successfully")
    );
} else {
    // If subscription does not exist, create it
    const newSubscription = new Subscription({
        subscriber: subscriberId,
        channel: channelId
    });

    await newSubscription.save();
    return res
    .status(200)
    .json(
        new ApiResponse(200, null, "Subscribed successfully")
    );
}
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    //______________________________________________________________________________________________________

// Check if the channelId is provided
if (!channelId) {
    throw new ApiError(400, "Channel ID is missing");
}

// Retrieve subscribers for the specified channel
const subscribers = await Subscription.aggregate([
    {
        $match: {
            channel: new mongoose.Types.ObjectId(channelId) // Match the channel ID
        }
    },
    {
        $lookup: {
            from: "users", // Lookup from the users collection
            localField: "subscriber",
            foreignField: "_id",
            as: "subscriberDetails" // Get subscriber details
        }
    },
    {
        $unwind: "$subscriberDetails" // Unwind to get individual subscriber documents
    },
    {
        $project: {
            _id: 0, // Exclude the subscription ID
            subscriberId: "$subscriberDetails._id", // Include subscriber ID
            fullname: "$subscriberDetails.fullname", // Include subscriber's fullname
            username: "$subscriberDetails.username", // Include subscriber's username
            avatar: "$subscriberDetails.avatar" // Include subscriber's avatar
        }
    }
]);

// Return the list of subscribers
return res
.status(200)
.json(
    new ApiResponse(200, subscribers, "Subscribers retrieved successfully")
);
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params


//___________________________________________________________________________________________________________________________    
 // Check if the subscriberId is provided
 if (!subscriberId) {
    throw new ApiError(400, "Subscriber ID is missing");
}

// Retrieve the subscribed channels for the specified subscriber
const subscribedChannels = await Subscription.aggregate([
    {
        $match: {
            subscriber: new mongoose.Types.ObjectId(subscriberId) // Match the subscriber ID
        }
    },
    {
        $lookup: {
            from: "users", // Lookup from the users collection
            localField: "channel",
            foreignField: "_id",
            as: "channelDetails" // Get channel details
        }
    },
    {
        $unwind: "$channelDetails" // Unwind to get individual channel documents
    },
    {
        $project: {
            _id: 0, // Exclude the subscription ID
            channelId: "$channelDetails._id", // Include channel ID
            fullname: "$channelDetails.fullname", // Include channel owner's fullname
            username: "$channelDetails.username", // Include channel owner's username
            avatar: "$channelDetails.avatar", // Include channel owner's avatar
            coverImage: "$channelDetails.coverImage" // Include channel cover image
        }
    }
]);

// Return the list of subscribed channels
return res.status(200).json(new ApiResponse(200, subscribedChannels, "Subscribed channels retrieved successfully"));
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}