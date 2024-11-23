const mongoose = require("mongoose");
const { User } = require("./user");

const homeSchema = mongoose.Schema({
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    location:{ type: String , required: true  },
    size:{ type: String , required: false  },//TODO:
    amenities:{ type: String   },
    image: {type :String,
        required: true},
    images: [{type :String,
        required: false}],
    availability:{ type: Boolean , default: true  },
    
})



homeSchema.virtual("id").get(function () {
    return this._id.toHexString();
  });
  homeSchema.set("toJSON", {
    virtuals: true,
  });
  
  
  
  exports.Home = mongoose.model("home", homeSchema);
  