CREATE TABLE Users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL
);

CREATE TABLE Sessions (
    session_id UUID PRIMARY KEY,
    user_id INT REFERENCES Users(id),
    expiration TIMESTAMP NOT NULL
);

CREATE TABLE Logs (
    request_id UUID PRIMARY KEY,
    user_id INT REFERENCES Users(id),
    input_text TEXT NOT NULL,
    output_text TEXT NOT NULL,
    timestamps TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);