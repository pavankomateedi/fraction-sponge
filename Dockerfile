# Container image for Fraction Fruit Lab.
# Optional — only needed if you deploy App Runner in "container" mode
# (or any other container host: ECS/Fargate, Fly, Render, etc.).
# The simpler App Runner path uses apprunner.yaml and needs no Docker.
FROM node:18-alpine

WORKDIR /app

# Install production dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the app
COPY . .

ENV NODE_ENV=production
# App Runner / most hosts inject PORT; server.js falls back to 3000.
EXPOSE 3000

CMD ["node", "server.js"]
