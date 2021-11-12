//jshint esversion:6
require('dotenv').config();

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const app = express();

app.set("view engine", "ejs");

app.use(express.static("public"));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());


mongoose.connect("mongodb://localhost:27017/userDB", {
    useNewUrlParser: true
});

//turn the schema into a proper Mongoose schema object
const userSchema = {
    email: String,
    password: String
};

const User = new mongoose.model("User", userSchema);


//DO SOMETHING
app.get("/", function (req, res){
    res.render("home"); //render the page called "home.ejs"
});

app.get("/login", function (req, res){
    res.render("login"); 
});

app.get("/register", function (req, res){
    res.render("register"); 
});

app.post("/register", function (req, res){

    bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
        const newUser = new User({
            email: req.body.username,
            password: hash //the password after salting and bcrypt turned into a hash
        });
    
        newUser.save(function(err){
            if (err){
                console.log(err);
            } else {
                res.render("secrets");
            }
        });
    });
});

app.post("/login", function(req, res){
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({email: username}, function(err, foundUser){
        if (err){
            console.log(err);
        } else {
            if (foundUser) {
                bcrypt.compare(password, foundUser.password, function(err, result) {
                    if (result === true) {
                        res.render("secrets");
                    }
                });
            }
        }
    });

});


app.listen(3000, () => {
    console.log("Server started on port 3000");
});