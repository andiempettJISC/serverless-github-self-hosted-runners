FROM myoung34/github-runner:latest

RUN apt update && apt upgrade -y && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y python3-pip libgtk2.0-0 libgtk-3-0 libgbm-dev libnotify-dev libgconf-2-4 libnss3 libxss1 libasound2 libxtst6 xauth xvfb && \
    curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py && \
    python3 get-pip.py && \
    pip3 install --upgrade awscli awslogs
