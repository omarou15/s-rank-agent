FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# System packages
RUN apt-get update && apt-get install -y \
    python3 python3-pip python3-venv \
    nodejs npm \
    git curl wget jq htop \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Node.js tools
RUN npm install -g pnpm typescript ts-node

# Python tools
RUN pip3 install --break-system-packages \
    pandas numpy requests beautifulsoup4 \
    flask fastapi uvicorn \
    sqlalchemy psycopg2-binary

# Create agent user and workspace
RUN useradd -m -s /bin/bash agent
RUN mkdir -p /home/agent/projects /home/agent/downloads /home/agent/workspace
RUN chown -R agent:agent /home/agent

USER agent
WORKDIR /home/agent

CMD ["/bin/bash"]
