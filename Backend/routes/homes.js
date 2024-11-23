const {Home} = require("../models/home")
const express = require("express");
const router = express.Router();
const multer = require("multer")
const { User } = require('../models/user'); 





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
  const uploadOptions = multer({storage: storage})



 
router.post("/home", uploadOptions.single('image') , async (req, res)=>{
    //file upload
   const file = req.file;
   if (!file) return res.status(400).send('No image in the request')

  
 const filename = req.file.filename;
 const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`
  const user= req.auth.userId;
    let home = new Home({
       owner : user,
        location: req.body.location,
        size: req.body.size,
        amenities: req.body.amenities,
        image : `${basePath}${filename}`, //"http://localhost:3000/public/uploads/image-232323"
        images : req.body.images,
        availability: req.body.availability,
    })
    console.log("image")
    home = await home.save();
    if (!home) return res.status(400).send("home cannot be created");
    res.send(home);
}
)



router.get(`/`, async (req, res) => {
  const homeList = await Home.find();
  if (!homeList) {
    return res.status(500).json({ success: false });
  }
  res.send(homeList);
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