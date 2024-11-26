 const {Home} = require("../models/home")
const express = require("express");
const router = express.Router();
const multer = require("multer")
const { User } = require('../models/user');
const fs = require('fs');
const path = require('path');





const FILE_TYPE_MAP = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg'
}

//file upload 
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      const isValid = FILE_TYPE_MAP[file.mimetype];
      let uploadError = new Error('invalid image type');
      if(isValid) {
        uploadError = null
      }
      
      cb(uploadError, 'C:/Users/helmi/Desktop/goswitchhome/Backend/public/uploads')
    }
    , filename: function (req, file, cb) {
      
      const filename = file.originalname.toLowerCase().split(' ').join('-'); 
      const extension = FILE_TYPE_MAP[file.mimetype];
      cb(null, `${filename}-${Date.now()}.${extension}`);
    }
  })
const uploadOptions = multer({ storage: storage }).fields([
    { name: 'image', maxCount: 1 },   // Single image field
    { name: 'images', maxCount: 5 }    // Multiple images (max 5 files)
]);



router.post("/home", uploadOptions, async (req, res) => {
    // Check for file(s) uploaded in the request
    const image = req.files['image'] ? req.files['image'][0] : null;  // Single image
    const images = req.files['images'] ? req.files['images'] : [];    // Multiple images

    // Handle missing image or images fields
    if (!image && images.length === 0) {
        return res.status(400).send('No image or images provided');
    }

    // Prepare the file paths for image(s)
    let imageUrl = '';
    if (image) {
        const filename = image.filename;
        const basePath = `${req.protocol}`;//${req.get('host')}/public/uploads/;
        imageUrl = `${basePath}${filename}`;
    }

    // Prepare image URLs for multiple images
    const imageUrls = images.map(file => {
        const filename = file.filename;
        const basePath = `${req.protocol}`;//${req.get('host')}/public/uploads/;
        return `${basePath}${filename}`;
    });

    // Get the user from the request (assuming authentication is set up)
    const user = req.auth.userId;

    // Create a new home object with provided data
    let home = new Home({
        owner: user,
        location: req.body.location,
        size: req.body.size,
        amenities: req.body.amenities,
        image: imageUrl,  // single image URL
        images: imageUrls,  // multiple images URLs
        availability: req.body.availability,
    });

    // Save the home to the database
    home = await home.save();
    if (!home) return res.status(400).send("Home cannot be created");

    // Respond with the created home object
    res.send(home);
});




router.get("/", async (req, res) => {
    const homeList = await Home.find();
    if (!homeList) {
        return res.status(500).json({ success: false });
    }

    const formattedHomes = homeList.map(home => {
        const filePath = path.join(__dirname, '../public/uploads/', home.image.split('/').pop());
        const imageData = fs.existsSync(filePath)
            ? fs.readFileSync(filePath, { encoding: 'base64' })
            : null;

        return {
            ...home._doc,
            image: imageData ? `data:image/jpeg;base64,${imageData}` : null,
        };
    });

    res.send(formattedHomes);
});

router.get("/:id", async (req, res) => {
  let home = await Home.findById(req.params.id);
  if (!home) {
    return res.status(404).json({ success: false, message: "Home not found" });
  }
  res.send(home);
});

  
router.delete('/:id',  (req , res) => {
  Home.findByIdAndDelete(req.params.id).then(home => { if (home){
    return res.status(200).json({success: true ,  messaage : 'Home successfully removed'})
}else {
     return res.status(404).json({success: false , message : 'Home not found'})
}}).catch(err=>{
  
    return res.status(400).json({success: false , error: err})
})

}
)
 






module.exports = router;