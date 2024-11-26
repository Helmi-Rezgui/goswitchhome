const { User } = require("../models/user");
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { Home } = require("../models/home");


router.post('/save-post/:homeId', async (req, res) => {
  const userId = req.auth.userId; 
  const homeId = req.params.homeId;

  try {
    // Find the home by its ID
    const home = await Home.findById(homeId);
    if (!home) {
      return res.status(404).send({ message: 'Home not found.' });
    }

    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send({ message: 'User not found.' });
    }
    if (!Array.isArray(user.savedPosts)) {
      user.savedPosts = []; // Initialize if undefined
    }
    
    
    const homeIndex = user.savedPosts.indexOf(homeId);
    if (homeIndex !== -1) {
      // Home already saved, so unsave it
      user.savedPosts.splice(homeIndex, 1);
      await user.save();
      return res.status(200).send({ message: 'Home unsaved successfully.', savedPosts: user.savedPosts });
    } else {
      // Home not saved, so save it
      user.savedPosts.push(homeId);
      await user.save();
      return res.status(200).send({ message: 'Home saved successfully.', savedPosts: user.savedPosts });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Server error.' });
  }
});














router.get("/verify-email", async (req, res) => {
  const token = req.query.token;
  console.log(token);
  
  

  try {
    const decoded = jwt.verify(token, process.env.SECRET);
    const userId = decoded.userId;
 // Check if the token has been used before
    const user = await User.findById(userId);
    if (user.isVerified) {
      return res.status(400).send("Email already verified.");
    }
    
    // Mark user's email as verified
    await User.findByIdAndUpdate(userId, { isVerified: true });
  res.send("Email verified successfully. you can now close this page and log in ")

 
  } catch (error) {
    
      return res.status(400).send("Invalid or expired token.");
  }
});

router.get(`/`, async (req, res) => {
  const userList = await User.find().select('-passwordHash');
  if (!userList) {
    return res.status(500).json({ success: false });
  }
  res.send(userList);
});

router.get("/:id", async (req, res) => {
  let user = await User.findById(req.params.id).select('-passwordHash');
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }
  res.send(user);
});
// creating new user
router.post("/", async (req, res) => {
  let user = new User({
    name: req.body.name,
    lastName: req.body.lastName,
    email: req.body.email,
    passwordHash: bcrypt.hashSync(req.body.password, 10),  //the "10" is a salt of bcrypt
    phone: req.body.phone,
    
  });
  user = await user.save();
  if (!user) return res.status(400).send("user cannot be created");
  res.send(user);
});
const transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

  /**
 * @swagger
 * /users/register:
 *   post:
 *     summary: Register a new user
 *     tags: [users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: First name of the user
 *               lastName:
 *                 type: string
 *                 description: Last name of the user
 *               email:
 *                 type: string
 *                 description: Email address of the user
 *               password:
 *                 type: string
 *                 description: User's password
 *               phone:
 *                 type: string
 *                 description: Phone number of the user
 *             required:
 *               - name
 *               - lastName
 *               - email
 *               - password
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: User registration failed or email already exists
 */
router.post("/register", async (req, res) => {
  
    let existingUser  = await User.findOne({ email: req.body.email });
  if (existingUser ) {
    return   res.status(400).json({
      "success":false , "message":"Email already exists. Please use a different email."
    });
  }


  
    const user = new User({
    name: req.body.name,
    lastName: req.body.lastName,
    email: req.body.email,
    passwordHash: bcrypt.hashSync(req.body.password, 10), //the "10" is a salt of bcrypt
    phone: req.body.phone,
    
    isVerified: false,
  })
  ;
  // Save user to the database
  await user.save();
  try {

    // Send verification email
    const verificationToken = jwt.sign({ userId: user.id }, process.env.SECRET, { expiresIn: '1d' });
    const verificationLink = `http://localhost:3000/api/v1/users/verify-email?token=${verificationToken}`;
    console.log(verificationLink);
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Email Verification",
      html: `Click <a href="${verificationLink}">here</a> to verify your email.`,
    });

    res.status(201).json({"success":true,
    "message":"User registered successfully. Please check your email for verification."
  });
  } catch (error) {
    console.error(error);
    res.status(400).json({success:false,
      "message":"User registration failed."});
  }
});


 

router.put("/:id", async (req, res) => {
  let user = await User.findByIdAndUpdate(req.params.id,
  
    {
      name: req.body.name,
      lastName: req.body.lastName,
      email: req.body.email,
      passwordHash: bcrypt.hashSync(req.body.password, 10), //the "10" is a salt of bcrypt
      phone: req.body.phone,
      isAdmin: req.body.isAdmin,
    },
    { new: true }
  );
  if (!user) {
    return res
      .status(404)
      .json({ success: false, message: "invalid user id " });
  }
  res.send(user);
});




//Auth 
/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: Log in a user
 *     tags: [users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: User's email
 *               password:
 *                 type: string
 *                 description: User's password
 *             required:
 *               - email
 *               - password
 *     responses:
 *       200:
 *         description: User logged in successfully with a JWT token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: string
 *                   description: Logged-in user's email
 *                 token:
 *                   type: string
 *                   description: JWT token
 *       400:
 *         description: Invalid email or password
 *       403:
 *         description: Email not verified
 *       404:
 *         description: User not found
 */

router.post('/login', async (req, res) => {
const user = await User.findOne({email: req.body.email})
const secret = process.env.secret
if (!user) {
  return res.status(404).send('User not found')}
if (!user.isVerified) {
  return res.status(403).send('Email not verified. Please verify your email before logging in.')}

  if(user&& bcrypt.compareSync(req.body.password, user.passwordHash)){
    const token = jwt.sign({
       userId: user.id,
       role:user.role
       
    },
    secret,
    {expiresIn:'1d'})
    res.status(200).send({user : user.email , token : token})
  }else{
    res.status(400).send('Invalid email or password')
  }
} )

  
router.delete('/:id',  (req , res) => {
  User.findByIdAndDelete(req.params.id).then(user => { if (user){
    return res.status(200).json({success: true ,  messaage : 'user successfully removed'})
}else {
     return res.status(404).json({success: false , message : 'user not found'})
}}).catch(err=>{
  
    return res.status(400).json({success: false , error: err})
})

}
)
 

/**
 * @swagger
 * /users/forgot-password:
 *   post:
 *     summary: Request a password reset link
 *     tags: [users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: The email address of the user
 *             required:
 *               - email
 *     responses:
 *       200:
 *         description: Password reset link sent to the user's email
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Password reset link sent to your email.
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: User not found.
 *       500:
 *         description: Server error
 */

router.post(`/forgot-password`, async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Generate reset token
    const resetToken = jwt.sign({ userId: user.id }, process.env.RESET_SECRET, {
      expiresIn: "1h", 
    });

    // Send reset password link to user's email
    const resetLink = `http://localhost:3000/api/v1/users/reset-password?token=${resetToken}`;
    console.log(resetLink)
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Password Reset",
      html: `Click <a href="${resetLink}">here</a> to reset your password.`,
    });

    res.status(200).json({ success: true, message: "Password reset link sent to your email." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
});


/**
 * @swagger
 * /users/reset-password:
 *   post:
 *     summary: Reset the user's password
 *     tags: [users]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         description: The reset token sent to the user's email
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newPassword:
 *                 type: string
 *                 description: The new password for the user
 *             required:
 *               - newPassword
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Password reset successfully.
 *       400:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Invalid or expired token.
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: User not found.
 */

// Route for resetting password using reset token
router.post("/reset-password", async (req, res) => {
  
  try {
    let token = req.query.token; // Extract token from query parameters
    if (!token) {
      token = req.body.token; // If not found in query parameters, try to extract from the request body
    }

    if (!token) {
      return res.status(400).json({ success: false, message: "Token not provided" });
    }
    const { newPassword}  = req.body;
    const decoded = jwt.verify(token, process.env.RESET_SECRET);
    const userId = decoded.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Update user's password
    user.passwordHash = bcrypt.hashSync(newPassword, 10);
    await user.save();

    res.status(200).json({ success: true, message: "Password reseted successfully" });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: "Invalid or expired token." });
  }
});






module.exports = router;
