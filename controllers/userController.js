import userService from '../services/userService.js';
import tokenService from '../services/tokenService.js';
import videoService from '../services/videoService.js';


// 201 Created: The request has succeeded and a new resource has been created as a result.
// 400 Bad Request: The server could not understand the request due to invalid syntax.
// 404 Not Found: The server can not find the requested resource.
// 500 Internal Server Error: The server encountered an unexpected 
//     condition that prevented it from fulfilling the request.


const createUser = async (req, res) => {
    try {
        const { username, password, gender, displayname, profileImg } = req.body;
        const user = await userService.createUser(username, password,gender, displayname, profileImg);
        if(user){
            res.status(201).json({ message: 'User created successfully'});
        }
    } catch (error) {
        if (error.message === 'Username already taken') {
            return res.status(400).json({ message: error.message });
        }
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Error creating user' });
    }
};

const getUserVideos = async (req, res) => {
    try {
        const userId = req.params.id;
        console.log(userId);
        const videos = await videoService.getVideosByUserId(userId);
        res.json(videos);
    } catch (error) {
        console.error('Failed to fetch videos for user:', error);
        res.status(500).json({ message: 'Server error', error });
    }
};

const getVideoOfUser = async (req, res) => {
    const { id, pid } = req.params;  // id is userId, pid is videoId
    try {
        const video = await videoService.getVideoByUserAndVideoId(id, pid);
        res.json(video);
    } catch (error) {
        console.error('Failed to fetch video:', error.message);
        res.status(500).json({ message: error.message });
    }
};

const updateVideoOfUser = async (req, res) => {
    const { id, pid } = req.params;  // id is userId, pid is videoId
    const updateData = req.body;  // Data to update the video with

    try {
        // First, verify that the video belongs to the user making the request
        const video = await videoService.getVideoByUserAndVideoId(id, pid);
        if (!video) {
            return res.status(404).json({ message: "Video not found" });
        }
        if (video.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ message: "Unauthorized to update this video" });
        }

        const updatedVideo = await videoService.updateVideoByUserAndVideoId(id, pid, updateData);
        res.json(updatedVideo);
    } catch (error) {
        console.error('Failed to update video:', error.message);
        res.status(500).json({ message: error.message });
    }
};


const deleteVideoOfUser = async (req, res) => {
    const { id, pid } = req.params;  // id is userId from URL, pid is videoId

    try {
        // Check if the authenticated user is the same as the user id from URL
        if (req.user.id !== id) {
            return res.status(403).json({ message: "Unauthorized to delete video from another user" });
        }

        // Fetch the video to ensure it belongs to the user
        const video = await videoService.getVideoByUserAndVideoId(id, pid);
        if (!video) {
            return res.status(404).json({ message: "Video not found" });
        }
        if (video.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ message: "Unauthorized to delete this video" });
        }

        const deletedVideo = await videoService.deleteVideoByUserAndVideoId(id, pid);
        res.json({ message: 'Video successfully deleted', videoId: pid });
    } catch (error) {
        console.error('Failed to delete video:', error.message);
        res.status(500).json({ message: error.message });
    }
};



const getUser = async (req, res) => {

    try {
        const userId = req.params.id;
        const user = await userService.getUser(userId);
        if (!user) {
            return res.status(404).send({ message: "User not found" });
        }

        const UserData = {
            displayname: user.displayname,
            profileImg: user.profileImg,
            videoList: user.videoList,
        };

        res.send(UserData); // Send only the selected user data
    } catch (error) {
        console.error("Error finding user:", error);
        res.status(500).send({ message: "Internal server error" });
    }
}

const isExist = async (req, res) => {
    try {
        const { username } = req.query;
       
        if (!username) {
            return res.status(400).json({ message: 'Username query parameter is required.' });
        }
        const isAvailable = await userService.isExist(username);
        res.status(201).json({ exists: isAvailable });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

function isLoggedIn(req, res, next) {
    // If the request has an authorization header
    if (req.headers.authorization) {
        // Extract the token from that header
        const token = req.headers.authorization.split(" ")[1];
        try {
            // Verify the token is valid
            const data = tokenService.verifyJwt(token);
            req.user = data;
            // Token validation was successful. Continue to the actual function (index)
            return next()
        } catch (err) {
            return res.status(401).json("Invalid Token");
        }
    }
    else
        return res.status(403).send('Token required');
}

const updateUser = async (req, res) => {
    try {
        const userId = req.user.id; 
        const { displayname,password, profileImg } = req.body;

        // Prepare the update object based on provided data
        const updateData = {};
        if (displayname) updateData.displayname = displayname;
        if (password) updateData.password = password;
        if (profileImg) updateData.profileImg = profileImg;

        const updatedUser = await userService.updateUser(userId, updateData);

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(201).json({
            message: "User updated successfully",
            user: {
                displayName: updatedUser.displayname,
                password: updatedUser.password,
                profilePic: updatedUser.profilepic,
            }
        });
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const deleteUser = async (req, res) => {
    try {
        const userId = req.user.id; 

       /* not forget to add delete for all the videos the user have !


       */
        const deletedUser = await userService.deleteUser(userId);

        if (!deletedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


async function login(req, res) {
    const user = await userService.login(req.body.username, req.body.password)
    if (user) {
        const token = tokenService.createToken(user._id)
        res.json({ result: 'Success', token: token, user: {
            displayname: user.displayname,
            profileImg: user.profileImg
        } })
    }
    else {
        res.json({ result: 'Failure', reason: 'Invalid username or password' })
    }

}

const createVideo = async (req, res) => {
    // Ensure the user is logged in and the necessary video data is present
    if (!req.body.title || !req.body.videoUrl || !req.body.image) {
        return res.status(400).json({ message: "Missing required video fields" });
    }

    try {
        const videoData = {
            ...req.body,
            createdBy: req.user.id,  // Set the creator of the video to the logged-in user
        };
        const newVideo = await videoService.addVideo(videoData);
        res.status(201).json(newVideo);
    } catch (error) {
        console.error('Error creating video:', error);  // More detailed error logging
        res.status(500).json({ message: 'Failed to create video', error: error.message });
    }
};


export default { 
          getUserVideos,
          createUser,
          getUser,
          isExist ,
          login,
          updateUser,
          isLoggedIn,
          deleteUser, 
          getVideoOfUser,
          updateVideoOfUser,
          deleteVideoOfUser,
          createVideo
        };