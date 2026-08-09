FROM dorowu/ubuntu-desktop-lxde-vnc:latest

ENV DEBIAN_FRONTEND=noninteractive

# Install system deps and Node.js 18
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates build-essential git wget gnupg2 \
  && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
  && apt-get install -y --no-install-recommends nodejs \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /opt/edexui

# Copy repository files into image (use .dockerignore in repo root to exclude node_modules if present)
COPY . /opt/edexui

# Install deps
RUN npm install --production || true
RUN if [ -d src ]; then (cd src && npm install --production three ws) || true; fi

# Ensure run script is executable
RUN chmod +x /opt/edexui/scripts/run_all.sh || true

# Expose noVNC port (dorowu image uses 6080)
EXPOSE 6080

# Entrypoint: run the helper script which starts ASR demo and app in the container
# Keep the container attached to the desktop session provided by the base image
CMD ["/bin/bash", "-lc", "/opt/edexui/scripts/run_all.sh"]
