const express = require("express");
const app = express();
const hb = require("express-handlebars");
const url = require("url");
const cookieSession = require("cookie-session");
const csurf = require("csurf");
const db = require("./db");
const secrets = require("./secrets");

const {
    requireLoggedOut,
    requireSigned,
    requireLoggedIn,
    notSigned
} = require("./redirects");

// Setting Handlebars as view engine
app.engine("handlebars", hb());
app.set("view engine", "handlebars");

// Middleware
app.use(express.static(__dirname + "/public"));

app.use(require("cookie-parser")());

app.use(
    cookieSession({
        secret: secrets.COOKIE_SECRET,
        maxAge: 1000 * 60 * 60 * 24 * 14
    })
);

app.use(
    require("body-parser").urlencoded({
        extended: false
    })
);

app.use(csurf());

app.use(function(req, res, next) {
    res.setHeader("X-Header-Option", "DENY");
    res.locals.csrfToken = req.csrfToken();
    next();
});

// Routes

app.get("/", (req, res) => {
    res.redirect("/register");
});

app.get("/register", requireLoggedOut, (req, res) => {
    res.render("register", {
        layout: "main",
        home: "home"
    });
});

app.post("/register", requireLoggedOut, (req, res) => {
    db
        .hashPassword(req.body.password)
        .then(function(results) {
            return db.register(
                req.body.first,
                req.body.last,
                req.body.email,
                results
            );
        })
        .then(function(results) {
            req.session.userId = results.id;
            req.session.first = results.firstname;
            req.session.last = results.lastname;
            res.redirect("/profile");
        })
        .catch(function(err) {
            console.log("Error in POST /register: ", err);
            if (err.code == 23502) {
                res.render("register", {
                    layout: "main",
                    home: "home",
                    errorNull: "error"
                });
            } else if (err.code == 23505) {
                res.render("register", {
                    layout: "main",
                    home: "home",
                    errorExists: "error"
                });
            }
        });
});

app.get("/profile", requireLoggedIn, (req, res) => {
    res.render("profile", {
        layout: "main",
        firstname: req.session.first,
        home: "home",
        loggedin: "loggedin"
    });
});

app.post("/profile", requireLoggedIn, (req, res) => {
    if (req.body.age != "" || req.body.city != "" || req.body.city != "") {
        return db
            .addProfile(
                req.session.userId,
                req.body.age,
                req.body.city,
                req.body.url
            )
            .then(function() {
                return res.redirect("/petition");
            })
            .catch(function(err) {
                console.log("Error in POST /profile: ", err);
                res.render("profile", {
                    layout: "main",
                    firstname: req.session.first,
                    home: "home",
                    loggedin: "loggedin",
                    error: "error"
                });
            });
    } else {
        console.log("No profile info inserted");
        return res.redirect("/petition");
    }
});

app.get("/editprofile", requireLoggedIn, (req, res) => {
    return db
        .getProfile(req.session.userId)
        .then(function(results) {
            res.render("edit", {
                layout: "main",
                loggedin: "loggedin",
                home: "home",
                first: results.firstname,
                last: results.lastname,
                email: results.email,
                age: results.age,
                city: results.city,
                url: results.url
            });
        })
        .catch(function(err) {
            console.log("Error in GET /editprofile: ", err);
            res.redirect("/");
        });
});

app.post("/editprofile", requireLoggedIn, (req, res) => {
    if (req.body.password.trim() != "") {
        db.hashPassword(req.body.password.trim()).then(function(hash) {
            Promise.all([
                db.updateUsers(
                    req.body.first,
                    req.body.last,
                    req.body.email,
                    hash,
                    req.session.userId
                ),
                db.updateProfiles(
                    req.session.userId,
                    req.body.age,
                    req.body.city,
                    req.body.url
                )
            ])
                .then(function([userdata, profiledata]) {
                    req.session.first = req.body.first;
                    req.session.last = req.body.last;
                    res.redirect("petition");
                })
                .catch(function(err) {
                    console.log("Error in POST /editprofile: ", err);
                    return db
                        .getProfile(req.session.userId)
                        .then(function(results) {
                            res.render("edit", {
                                layout: "main",
                                loggedin: "loggedin",
                                home: "home",
                                first: results.firstname,
                                last: results.lastname,
                                email: results.email,
                                age: results.age,
                                city: results.city,
                                url: results.url,
                                error: "error"
                            });
                        });
                });
        });
    } else {
        Promise.all([
            db.updateUsers(
                req.body.first,
                req.body.last,
                req.body.email,
                req.body.password.trim(),
                req.session.userId
            ),
            db.updateProfiles(
                req.session.userId,
                req.body.age,
                req.body.city,
                req.body.url
            )
        ])
            .then(function([userdata, profiledata]) {
                req.session.first = req.body.first;
                req.session.last = req.body.last;
                res.redirect("petition");
            })
            .catch(function(err) {
                console.log("Error in POST /editprofile: ", err);
                return db
                    .getProfile(req.session.userId)
                    .then(function(results) {
                        res.render("edit", {
                            layout: "main",
                            loggedin: "loggedin",
                            home: "home",
                            first: results.firstname,
                            last: results.lastname,
                            email: results.email,
                            age: results.age,
                            city: results.city,
                            url: results.url,
                            error: "error"
                        });
                    });
            });
    }
});

app.get("/login", requireLoggedOut, (req, res) => {
    res.render("login", {
        layout: "main",
        home: "home"
    });
});

app.post("/login", requireLoggedOut, (req, res) => {
    let userId;
    let first;
    let last;
    let sigId;
    return db
        .getUserByEmail(req.body.email)
        .then(function(results) {
            userId = results.user_id;
            first = results.firstname;
            last = results.lastname;
            sigId = results.sig_id;
            return db.checkPassword(req.body.password, results.password);
        })
        .then(function(doesMatch) {
            if (doesMatch) {
                req.session.userId = userId;
                req.session.first = first;
                req.session.last = last;
                req.session.sigId = sigId;
                return res.redirect("/petition");
            } else {
                throw new Error("incorrect password");
            }
        })
        .catch(function(err) {
            console.log("Error in POST /login: ", err);
            res.render("login", {
                layout: "main",
                home: "home",
                error: "error"
            });
        });
});

app.get("/petition", requireLoggedIn, notSigned, (req, res) => {
    res.render("petition", {
        layout: "main",
        loggedin: "loggedin",
        home: "home",
        firstname: req.session.first,
        lastname: req.session.last
    });
});

app.post("/petition", requireLoggedIn, notSigned, (req, res) => {
    db
        .signPetition(req.session.userId, req.body.sign)
        .then(function(results) {
            const sigId = results.id;
            req.session.sigId = sigId;
        })
        .then(function() {
            res.redirect("/thankyou");
        })
        .catch(function(err) {
            console.log("Error in POST /petition: ", err);
            console.log("Missing input, redirecting");
            res.render("petition", {
                layout: "main",
                loggedin: "loggedin",
                home: "home",
                firstname: req.session.first,
                lastname: req.session.last,
                error: "error"
            });
        });
});

app.get("/thankyou", requireLoggedIn, requireSigned, (req, res) => {
    Promise.all([db.numSigners(), db.getSignatureById(req.session.sigId)])
        .then(function([number, sigId]) {
            res.render("thankyou", {
                layout: "main",
                loggedin: "loggedin",
                home: "home",
                number: number,
                signature: sigId,
                firstname: req.session.first,
                delete: "delete"
            });
        })
        .catch(function(err) {
            console.log("Error in GET /thankyou: ", err);
        });
});

app.post("/thankyou", requireLoggedIn, requireSigned, (req, res) => {
    return db
        .deleteSignature(req.session.sigId)
        .then(function(results) {
            delete req.session["sigId"];
            res.redirect("/petition");
        })
        .catch(function(err) {
            console.log("Error in POST /thankyou: ", err);
            res.redirect("/");
        });
});

app.get("/about", requireLoggedIn, requireSigned, (req, res) => {
    Promise.all([db.numSigners(), db.getSignatureById(req.session.sigId)])
        .then(function([number, sigId]) {
            res.render("thankyou", {
                layout: "main",
                loggedin: "loggedin",
                home: "home",
                number: number,
                signature: sigId,
                firstname: req.session.first,
                about: "about"
            });
        })
        .catch(function(err) {
            console.log("Error in GET /about: ", err);
        });
});

app.get("/signers", requireLoggedIn, requireSigned, (req, res) => {
    db
        .showSigners()
        .then(function(results) {
            res.render("signers", {
                layout: "main",
                loggedin: "loggedin",
                home: "home",
                signers: results,
                signersUrl: function(userUrl) {
                    for (var i = 0; i < results.length; i++) {
                        if (url.parse(userUrl).protocol) {
                            return `${userUrl}`;
                        } else {
                            return `http://${userUrl}`;
                        }
                    }
                }
            });
        })
        .catch(function(err) {
            console.log("Error in GET /signers: ", err);
            res.redirect("/");
        });
});

app.get("/signers/:city", requireLoggedIn, requireSigned, (req, res) => {
    return db
        .showSignersCity(req.params.city)
        .then(function(results) {
            res.render("signers_city", {
                layout: "main",
                loggedin: "loggedin",
                home: "home",
                signers: results,
                signersUrl: function(userUrl) {
                    for (var i = 0; i < results.length; i++) {
                        if (url.parse(userUrl).protocol) {
                            return `${userUrl}`;
                        } else {
                            return `http://${userUrl}`;
                        }
                    }
                },
                city: results[0].city
            });
        })
        .catch(function(err) {
            console.log("Error in GET /signers/:city: ", err);
            res.redirect("/signers");
        });
});

app.get("/logout", (req, res) => {
    req.session = null;
    res.redirect("/login");
});

app.get("*", (req, res) => {
    res.redirect("/");
});

// Server port
app.listen(process.env.PORT || 8080, () =>
    console.log("listening on port 8080")
);
