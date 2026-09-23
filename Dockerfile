# Use Node.js 26.0.0 as the base environment for the application.
# This provides Node.js and npm inside the Docker container.
FROM node:26.0.0

# Set /app as the working directory inside the container.
# All commands that follow will run relative to this directory.
WORKDIR /app

# Copy the server's package.json and package-lock.json into /app.
# These files tell npm which dependencies the application needs.
COPY server/package*.json ./

# Install the application's dependencies inside the container.
# This creates the node_modules directory.
RUN npm install

# Copy the entire server directory from the project into /app.
# This includes the TypeScript source code and other server files.
COPY server/ ./

# Compile the TypeScript source code into JavaScript.
# This creates the dist/ directory required by the start script.
RUN npm run build

# Document that the application listens on port 3000 inside the container.
EXPOSE 3000

# Define the default command that runs when the container starts.
# "npm start" executes the start script from package.json,
# which runs: node dist/server.js
CMD ["npm", "start"]