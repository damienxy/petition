DROP TABLE IF EXISTS profiles;

CREATE TABLE profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE,
    age INTEGER,
    city VARCHAR(200),
    url VARCHAR(255)
);
