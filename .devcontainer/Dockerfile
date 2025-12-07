# Base on Node 20 devcontainer image
FROM mcr.microsoft.com/devcontainers/javascript-node:20

# Install dependencies needed for React Native + Watchman + Android SDK
USER root

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    unzip \
    openjdk-17-jdk \
    python3 \
    python3-pip \
    build-essential \
    libssl-dev \
    zsh \
    && rm -rf /var/lib/apt/lists/*

# Install Watchman (React Native development requirement)
RUN apt-get update && apt-get install -y watchman

# Optional: Install Android command-line tools (SDK manager)
RUN mkdir -p /opt/android-sdk/cmdline-tools && \
    curl -o sdk-tools.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip && \
    unzip sdk-tools.zip -d /opt/android-sdk/cmdline-tools && \
    rm sdk-tools.zip && \
    mv /opt/android-sdk/cmdline-tools/cmdline-tools /opt/android-sdk/cmdline-tools/latest

ENV ANDROID_HOME=/opt/android-sdk
ENV PATH="${PATH}:${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools"

# Accept SDK licenses
RUN yes | sdkmanager --licenses || true

# Install Expo CLI
USER node
RUN npm install -g expo-cli

CMD [ "zsh" ]
