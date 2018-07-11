exports.requireLoggedOut = requireLoggedOut;
exports.requireSigned = requireSigned;
exports.requireLoggedIn = requireLoggedIn;
exports.notSigned = notSigned;

function requireLoggedOut(req, res, next) {
    if (req.session.userId) {
        res.redirect("/petition");
    } else {
        next();
    }
}

function requireSigned(req, res, next) {
    if (!req.session.sigId) {
        res.redirect("/petition");
    } else {
        next();
    }
}

function requireLoggedIn(req, res, next) {
    if (!req.session.userId) {
        res.redirect("/register");
    } else {
        next();
    }
}

function notSigned(req, res, next) {
    if (req.session.sigId) {
        res.redirect("/thankyou");
    } else {
        next();
    }
}
