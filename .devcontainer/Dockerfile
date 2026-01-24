FROM node:20

# Build arguments
ARG TZ=America/Los_Angeles
ARG CLAUDE_CODE_VERSION=latest
ARG GIT_DELTA_VERSION=0.18.2
ARG ZSH_IN_DOCKER_VERSION=1.2.0

# Set timezone
ENV TZ=${TZ}

# Install system dependencies including Python 3
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    gh \
    nano \
    vim \
    zsh \
    fzf \
    man-db \
    iptables \
    ipset \
    iproute2 \
    dnsutils \
    sudo \
    procps \
    jq \
    unzip \
    gnupg2 \
    curl \
    ca-certificates \
    aggregate \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Enable corepack and install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Create python symlink for convenience
RUN ln -sf /usr/bin/python3 /usr/bin/python

# Install git-delta for enhanced diff viewing (multi-arch support)
RUN ARCH=$(dpkg --print-architecture) && \
    if [ "$ARCH" = "arm64" ]; then \
        curl -fsSL "https://github.com/dandavison/delta/releases/download/${GIT_DELTA_VERSION}/git-delta_${GIT_DELTA_VERSION}_arm64.deb" -o /tmp/git-delta.deb; \
    else \
        curl -fsSL "https://github.com/dandavison/delta/releases/download/${GIT_DELTA_VERSION}/git-delta_${GIT_DELTA_VERSION}_amd64.deb" -o /tmp/git-delta.deb; \
    fi && \
    dpkg -i /tmp/git-delta.deb && \
    rm /tmp/git-delta.deb

# Install zsh-in-docker for zsh configuration
RUN sh -c "$(curl -fsSL https://github.com/deluan/zsh-in-docker/releases/download/v${ZSH_IN_DOCKER_VERSION}/zsh-in-docker.sh)" -- \
    -t powerlevel10k/powerlevel10k \
    -p git \
    -p fzf

# Configure node user
RUN usermod -s /bin/zsh node \
    && echo "node ALL=(ALL) NOPASSWD: /usr/local/bin/init-firewall.sh" >> /etc/sudoers.d/node-firewall \
    && echo "node ALL=(ALL) NOPASSWD: /usr/bin/mkdir, /usr/bin/ln" >> /etc/sudoers.d/node-firewall \
    && chmod 0440 /etc/sudoers.d/node-firewall

# Set up bash history persistence
RUN mkdir -p /commandhistory \
    && touch /commandhistory/.bash_history \
    && chown -R node:node /commandhistory

# Configure npm global directory for node user
RUN mkdir -p /home/node/.npm-global \
    && chown -R node:node /home/node/.npm-global \
    && npm config set prefix /home/node/.npm-global --global

# Set environment variables
ENV PATH=/home/node/.npm-global/bin:$PATH
ENV HISTFILE=/commandhistory/.bash_history
ENV EDITOR=nano

# Install Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}

# Install Playwright globally and browser dependencies
RUN npm install -g playwright@latest \
    && npx playwright install-deps chromium

# Copy firewall initialization script
COPY init-firewall.sh /usr/local/bin/init-firewall.sh
RUN chmod +x /usr/local/bin/init-firewall.sh

# Copy private domains file if it exists (gitignored, contains company-specific domains)
# Uses wildcard to handle case where file doesn't exist
COPY private-domains.sh* /usr/local/bin/
RUN chmod +x /usr/local/bin/private-domains.sh 2>/dev/null || true

# Set working directory
WORKDIR /InZone-App

# Switch to node user
USER node

# Install Playwright browsers as node user
RUN npx playwright install chromium
