//jshint esversion:6
require('dotenv').config();

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require("mongoose-findorcreate");

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
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String, //when login with Google, our DB can keep the data of googleId
    facebookId: String,
    secret: String
});

//Add the plugin to hash and salt the passpords and to save to the DB
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//Create User model and set up Mongoose to use the userSchema
const User = new mongoose.model("User", userSchema);

//Passport-local configurations
passport.use(User.createStrategy());

//replaced the serialize and deserialize codes by referring to 
//the codes on passport-google-oauth20's doc so it works for all diff strategies
passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/secrets",
        userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
    },
    function (accessToken, refreshToken, profile, cb) {
        // console.log(profile);

        //try to find the googleId or create them on our DB
        User.findOrCreate({
            googleId: profile.id
        }, function (err, user) {
            return cb(err, user);
        });
    }
));

passport.use(new FacebookStrategy({
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: "http://localhost:3000/auth/facebook/secrets"
    },
    function (accessToken, refreshToken, profile, cb) {
        User.findOrCreate({
            facebookId: profile.id
        }, function (err, user) {
            return cb(err, user);
        });
    }
));

//DO SOMETHING (routes)
app.get("/", function (req, res) {
    res.render("home"); //render the page called "home.ejs"
});

//----- ****** GOOGLE LOGIN ****** -----//
//initiate authentication on Google
app.get("/auth/google",
    passport.authenticate(
        "google", {
            scope: ["email"]
        }
    )
);

//when authetication is successful will redirect the user to our website
//NOTE: the callback route below needed to be match the Authorised redirect URIs 
app.get("/auth/google/secrets",
    passport.authenticate("google", {
        failureRedirect: "/login"
    }),
    function (req, res) {
        // Successful authentication, redirect to the secrets
        res.redirect("/secrets");
    }
);

//----- ****** FACEBOOK LOGIN ****** -----//
//initiate authentication on Facebook
app.get("/auth/facebook",
    passport.authenticate("facebook")
);

//when authetication is successful will redirect the user to our website
app.get("/auth/facebook/secrets",
    passport.authenticate("facebook", {
        failureRedirect: "/login"
    }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect("/secrets");
    });


app.get("/login", function (req, res) {
    res.render("login");
});

app.get("/register", function (req, res) {
    res.render("register");
});


app.get("/secrets", function (req, res) {
    //find out all the users which the secret fiel is NOT equal to null
    User.find({"secret": {$ne: null}}, function(err, foundUsers) {
        if (err) {
            console.log(err);
        } else {
            if (foundUsers) {
                res.render("secrets", {usersWithSecrets: foundUsers});
            }
        }
    });
});


app.get("/submit", function (req, res) {
    if (req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});


app.post("/submit", function (req, res) {
    const submittedSecret = req.body.secret;
    // console.log(req.user);

    User.findById(req.user.id, function(err, foundUser){
        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                foundUser.secret = submittedSecret;
                foundUser.save(function(){
                    res.redirect("/secrets");
                });
            }
        }
    });
});


app.get("/logout", function (req, res) {
    req.logout();
    res.redirect("/");
});


app.post("/register", function (req, res) {
    User.register({
            username: req.body.username
        },
        req.body.password,
        function (err, user) {
            if (err) {
                console.log(err);
                res.redirect("/register");
            } else {
                passport.authenticate("local")(req, res, function () {
                    res.redirect("/secrets");
                });
            }
        }
    );
});


app.post("/login", function (req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function (err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            });
        }
    });
});


app.listen(3000, () => {
    console.log("Server started on port 3000");
});