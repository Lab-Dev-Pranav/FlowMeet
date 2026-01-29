const {Schema} = require('mongoose');

const meetingSchema = new Schema({
      user_id :{
            type : String,
      },
      meeting_code :{
            type : String,
            required : true,
            unique : true,
      },
      date :{
            type : Date,
            required : true,
            default : Date.now()
      },
      
})

const Meeting = mongoose.model('Meeting', meetingSchema);

module.exports = {Meeting};