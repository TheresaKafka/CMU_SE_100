FROM node:20-slim

WORKDIR /app

# Copy dependency specifications
COPY package*.json .npmrc ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy application source code
COPY . .

# Compile application
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/src/main.js"]

