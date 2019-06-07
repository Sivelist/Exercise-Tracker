const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')
var mongo = require('mongodb');
const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' );
mongoose.connect(process.env.MONGO_URI);

app.use(cors())

app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


// Not found middleware
// app.use((req, res, next) => {
//   return next({status: 404, message: 'not found'})
// })

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

// Create Schema
var Schema = mongoose.Schema;
var userSchema = new Schema({
  userName: String,
  userId: Number,
  type: String
});
var User = mongoose.model('User', userSchema);


// Create a new user
app.post("/api/exercise/new-user", function(req,res){
  // console.log(req.body.username);
  
    // Find if user exists on database
  User.find({userName: req.body.username}, function(err,data){
    if (err){
      console.log("error finding user");
      res.json({error: "error finding user"});
    }else if (data.length == 0){        //if user does not exist (length = 0) create user
        User.findOne({type: "username"}).sort("-userId").exec(function (err2,number){        //creating a new ID by increments of 1
          
          if(number == null){        //first user case
            var newUser = new User({
              userName: req.body.username,
              userId: 1,
              type: "username"
            });
          } else{
            var newUser = new User({
              userName: req.body.username,
              userId: number.userId + 1,
              type: "username"
            });
          }
          newUser.save(function(err3,data3){      //save user
            if(err3){
              console.log("error with saving user");
              res.json({error: "error with saving user"});
            }else{
              res.json({Username: req.body.username, "_Id": data3.userId});
            }
          });
          
        });
      
    }else{      //user exist reprint user id
      res.send("username already taken");
    }
    
  });
});
 

// Add exercises

var Schema = mongoose.Schema;
var exerciseSchema = new Schema({
  userId: Number,
  description: String,
  duration: Number,
  date: String,
  type: String
});
var Exercise = mongoose.model('Exercise', exerciseSchema);

var numReg = /^\d+$/;
var dateReg = /\d\d\d\d\-\d\d\-\d\d/;

// Post for add exercises
app.post("/api/exercise/add",function(req,res){
  
  var isCorDate = dateReg.test(req.body.date);
  var isCorDur = numReg.test(req.body.duration);
  
  if (isCorDate == false && isCorDur == false){
    res.send("Duration and Date are in the wrong format");
  }else if (isCorDate == false){
    res.send("Date is in the wrong format");
  }else if (isCorDur == false){
    res.send("Duration is in the wrong format");
  }else{
    //search for user ID
    User.find({userId: req.body.userId}, function(err,data){
      if (err) {
        console.log("error in finding user");
        res.json({error: "error finding user"});
      }else if (data.length == 0){      // if user ID not found
        res.send("User ID does not exist");
      }else{      // user ID found, so create the exercise log
        var newExercise = new Exercise({
          userId: req.body.userId,
          description: req.body.description,
          duration: req.body.duration,
          date: req.body.date,
          type: "Exercise Log"
        });
        newExercise.save(function(err2,data2){
          if (err2){
            console.log("error in trying to save new exercise");
            res.send("error in trying to save new exercise");
          }else{
            console.log(data2);
            var utcDate = new Date(data2.date);
            // console.log(utcDate.toUTCString());
            res.json({username:data[0].userName, description:req.body.description, duration:req.body.duration, "_id":req.body.userId, date:utcDate.toDateString()});
          }
        });
      }
    });
    // res.send("Save exercise")
  }
});

// exercise log queries

app.get("/api/exercise/log", function(req,res){
  var queryUser = req.query.userId;
  var queryFrom = req.query.from;
  var queryTo = req.query.to;
  var queryLimit = req.query.limit;
  
  // Test if optional items are there and are in the correct format
  var isQueryCorFrom = dateReg.test(queryFrom);
  var isQueryCorTo = dateReg.test(queryTo);
  var isQueryCorLimit = numReg.test(queryLimit);
  var queryData2;
  var filtered;
  
  // First find all data and sort from latest to oldest
  Exercise.find({userId: queryUser}).sort("-date").exec(function(err,data){
    if(err){
      console.log("error finding logs");
      res.send("error finding logs");
    }else {
      // console.log(data);
      var queryData = data;
      // console.log(queryData);
      
        // Secondly remove entries before a date if given from
      if (isQueryCorFrom == true){
         queryData2 = queryData.map(function(x){
            if( x.date >= queryFrom){
             return x; 
            }
          });
          filtered = queryData2.filter(function(x){      //cant run map on array with null cells, so filter it after
            return x != null;
          });
        queryData = filtered;
        }
      
      if (isQueryCorTo == true){
         queryData2 = queryData.map(function(x){
            if( x.date <= queryTo){
             return x; 
            }
          });
          filtered = queryData2.filter(function(x){
            return x != null;
          });
        queryData = filtered;
        }
      
      if(isQueryCorLimit == true){
        queryData.splice(queryLimit, queryData.length - queryLimit);
      }
      res.send(queryData);
    }  
  });
  


  
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
