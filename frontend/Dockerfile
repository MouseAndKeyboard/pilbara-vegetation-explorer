# frontend/Dockerfile

# --- 1) Build stage ---
FROM node:18-alpine as builder

WORKDIR /app

# Copy package manifests first so we can do a cached install
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy remaining source code
COPY . .

# Build Next.js (outputs .next folder)
RUN npm run build

# --- 2) Production stage ---
FROM node:18-alpine

WORKDIR /app

# Copy only the built production files
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Expose the app on port 3000
EXPOSE 3000

# Start Next.js in production mode
CMD ["npm", "run", "start"]
