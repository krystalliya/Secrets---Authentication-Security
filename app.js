//jshint esversion:6
require('dotenv').config();

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.set("view engine", "ejs");

app.use(express.static("public"));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

//Initialized the session with some configuration
app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false,
}));

//Initialized the passport
app.use(passport.initialize());
//to use the passport to setup the session
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {
    useNewUrlParser: true
});

//the schema has to be a proper Mongoose schema object in order to have a plugin
const userSchema = new mongoose.Schema ({
    email: String,
    password: String
});

//Add the plugin to hash and salt the passpords and to save to the DB
userSchema.plugin(passportLocalMongoose); 

//Create User model and set up Mongoose to use the userSchema
const User = new mongoose.model("User", userSchema);

//Passport-local configurations
passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


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


app.get("/secrets", function (req, res){
    if (req.isAuthenticated()){
        res.render("secrets");
    } else {
        res.redirect("/login");
    }
});


app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/");
});


app.post("/register", function (req, res){
    User.register(
        {username: req.body.username}, 
        req.body.password, 
        function(err, user){
            if (err) {
                console.log(err);
                res.redirect("/register");
            } else {
                passport.authenticate("local")(req, res, function(){
                    res.redirect("/secrets");
                });
            }
        }
    );
});


app.post("/login", function(req, res){
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err){
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }
    });
});


app.listen(3000, () => {
    console.log("Server started on port 3000");
});