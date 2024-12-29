# Use an official Node.js runtime as a parent image
FROM node:16

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install application dependencies
RUN npm install

# Copy the source code to the container
COPY src ./src
COPY .env .env

# Expose the application's port
EXPOSE 3000

# Command to run the application
CMD ["node", "src/app.js"]
