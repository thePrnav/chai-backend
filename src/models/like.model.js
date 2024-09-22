import mongoose, {Schema} from "mongoose";

const likeSchema = new Schema(
    {
        video: {
            type: Schema.Types.ObjectId,         // video ko kisne like kiya hai 
            ref: "Video"
        },
        comment: {
            type: Schema.Types.ObjectId,         // Comment ko kisne like kiya hai
            ref: "Comment"
        },
        tweet: {
            type: Schema.Types.ObjectId,         // Tweet ko kisne like kiya hai
            ref: "Tweet"
        },
        likedBy: {
            type: Schema.Types.ObjectId,         // kisne hume like kiya hai
            ref: "User"
        },
    },
    {
        timestamps: true
    }
)

export const Like = mongoose.model("Like", likeSchema)