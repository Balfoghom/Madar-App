FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json start.mjs ./
COPY dist ./dist
COPY anomaly-detection ./anomaly-detection
RUN mkdir -p /data && chown -R node:node /app /data
ENV HOST=0.0.0.0 PORT=8090 ASSESSMENT_DATA_DIR=/data
USER node
EXPOSE 8090
CMD ["node", "start.mjs"]
