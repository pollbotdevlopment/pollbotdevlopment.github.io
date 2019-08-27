const express = require("express");
const session = require("express-session");
const passport = require("passport");
const { Strategy } = require("passport-discord");

const { join } = require("path");
const url = require("url");

const config = require("./config");

const app = express();

function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return next();

    res.redirect("/auth/login");
}

function template(templatePath) {
    return join(__dirname, "src", "views", "templates", templatePath);
}

passport.serializeUser((user, done) => { done(null, user); });
passport.deserializeUser((obj, done) => { done(null, obj); });
passport.use(
    new Strategy({ clientID: config.clientID, clientSecret: config.clientSecret, callbackURL: config.redirectUri, scope: ["identify", "guilds"] },
        (accessToken, refreshToken, profile, done) => { process.nextTick(function () { return done(null, profile); }); })
);

app.use(session({ secret: "typicalbot", resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
app.engine("html", require("ejs").renderFile);
app.set("view engine", "html");

app.get("/", (req, res, next) => {
    res.render(template("index.ejs"), {
        user: req.user,
        auth: req.isAuthenticated()
    });
});

app.get("/auth/callback", passport.authenticate("discord", {
    failureRedirect: `/auth/access-denied`
}), (req, res) => {
    if (req.session.backURL) {
        res.redirect(req.session.backURL);
        req.session.backURL = null;
    } else {
        res.redirect("/");
    }
});

app.get("/auth/login", (req, res, next) => {
    if (req.session.backURL) {
        req.session.backURL = req.session.backURL;
    } else if (req.headers.referer) {
        const parsed = url.parse(req.headers.referer);
        if (parsed.hostname === req.app.locals.domain) {
            req.session.backURL = parsed.path;
        }
    } else {
        req.session.backURL = '/';
    }
    next();
}, passport.authenticate("discord"));

app.get("/auth/logout", isAuthenticated, (req, res, next) => {
    req.logout();
    res.redirect("/");
});

app.get("", isAuthenticated, (req, res, next) => {
    
})

app.use(express.static(`${__dirname}/src/views/static`));
app.use((req, res) => res.status(404).render(template("404.ejs"), { user: req.user, auth: req.isAuthenticated() }));
app.listen(config.port, () => console.log(`Express Server Created | Listening on Port :${config.port}`));