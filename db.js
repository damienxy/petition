const spicedPg = require("spiced-pg");
const db = spicedPg(
    process.env.DATABASE_URL ||
        "postgres:postgres:postgres@localhost:5432/petition"
);
const bcrypt = require("bcryptjs");

exports.signPetition = function(userId, sig) {
    const q = `
        INSERT INTO signatures (user_id, signature)
        VALUES ($1, $2) RETURNING id`;
    const params = [userId, sig || null];
    return db.query(q, params).then(function(results) {
        return results.rows[0];
    });
};

exports.showSigners = function() {
    const q = `
    SELECT users.firstname, users.lastname, profiles.age, profiles.city, profiles.url
    FROM signatures
    LEFT JOIN users
    ON signatures.user_id = users.id
    LEFT JOIN profiles
    ON signatures.user_id = profiles.user_id;
    `;
    return db.query(q).then(function(results) {
        return results.rows;
    });
};

exports.showSignersCity = function(city) {
    const q = `
        SELECT users.firstname, users.lastname, profiles.age, profiles.city, profiles.url
        FROM signatures
        LEFT JOIN users
        ON signatures.user_id = users.id
        LEFT JOIN profiles
        ON signatures.user_id = profiles.user_id
        WHERE LOWER(profiles.city) = LOWER($1)
        `;
    const params = [city];
    return db.query(q, params).then(function(results) {
        console.log(results.rows);
        return results.rows;
    });
};

exports.numSigners = function() {
    const q = "SELECT COUNT(*) FROM signatures";
    return db.query(q).then(function(results) {
        return results.rows[0].count;
    });
};

exports.getSignatureById = function(sigId) {
    const q = `SELECT signature FROM signatures WHERE id = $1`;
    const params = [sigId];
    return db.query(q, params).then(function(results) {
        return results.rows[0].signature;
    });
};

exports.register = function(first, last, email, pass) {
    const q = `
    INSERT INTO users (firstname, lastname, email, password)
    VALUES ($1, $2, $3, $4) RETURNING *`;
    const params = [first || null, last || null, email || null, pass || null];
    return db.query(q, params).then(function(results) {
        return results.rows[0];
    });
};

exports.hashPassword = function(plainTextPassword) {
    return new Promise(function(resolve, reject) {
        bcrypt.genSalt(function(err, salt) {
            if (err) {
                return reject(err);
            }
            bcrypt.hash(plainTextPassword, salt, function(err, hash) {
                if (err) {
                    return reject(err);
                }
                resolve(hash);
            });
        });
    });
};

exports.addProfile = function(userId, age, city, url) {
    const q = `
    INSERT INTO profiles (user_id, age, city, url)
    VALUES ($1, $2, $3, $4) RETURNING *
    `;
    const params = [
        userId || null,
        age || null,
        city.trim() || null,
        url || null
    ];
    return db.query(q, params).then(function(results) {
        return results.rows[0];
    });
};

exports.getProfile = function(userId) {
    const q = `
    SELECT users.firstname, users.lastname, users.email, profiles.age, profiles.city, profiles.url
    FROM users
    LEFT JOIN profiles
    ON users.id = profiles.user_id
    WHERE users.id = $1
    `;
    const params = [userId];
    return db.query(q, params).then(function(results) {
        return results.rows[0];
    });
};

exports.updateUsers = function(first, last, email, pass, userId) {
    var q;
    var params;
    if (pass == "") {
        q = `
        UPDATE users
        SET firstname = $1, lastname = $2, email = $3
        WHERE id = $4
        `;
        params = [first || null, last || null, email || null, userId || null];
    } else {
        q = `
        UPDATE users
        SET firstname = $1, lastname = $2, email = $3, password = $4
        WHERE id = $5
        `;
        params = [
            first || null,
            last || null,
            email || null,
            pass || null,
            userId || null
        ];
    }

    return db.query(q, params).then(function(results) {
        return results;
    });
};

exports.updateProfiles = function(userId, age, city, url) {
    const q = `
        INSERT INTO profiles (user_id, age, city, url)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id)
        DO UPDATE SET age = $2, city = $3, url = $4
    `;
    const params = [
        userId || null,
        age || null,
        city.trim() || null,
        url || null
    ];
    return db.query(q, params).then(function(results) {
        return results;
    });
};

exports.deleteSignature = function(sigId) {
    const q = `
    DELETE FROM signatures
    WHERE id = $1
    `;
    const params = [sigId];
    return db.query(q, params).then(function() {
        console.log("deleted signature");
    });
};

exports.getUserByEmail = function(email) {
    const q = `
    SELECT users.id AS user_id, users.firstname, users.lastname, users.email, users.password, signatures.id AS sig_id
    FROM users
    LEFT JOIN signatures
    ON signatures.user_id = users.id
    WHERE email = $1
    `;
    const params = [email];
    return db.query(q, params).then(function(results) {
        return results.rows[0];
    });
};

exports.checkPassword = function(
    textEnteredInLoginForm,
    hashedPasswordFromDatabase
) {
    return new Promise(function(resolve, reject) {
        bcrypt.compare(
            textEnteredInLoginForm,
            hashedPasswordFromDatabase,
            function(err, doesMatch) {
                if (err) {
                    reject(err);
                } else {
                    resolve(doesMatch);
                }
            }
        );
    });
};
