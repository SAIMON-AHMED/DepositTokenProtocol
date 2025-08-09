FROM node:18

# Install Circom dependencies
RUN apt-get update && \
  apt-get install -y build-essential git libgmp-dev cmake && \
  apt-get clean

# Install Rust (for circom)
RUN curl https://sh.rustup.rs -sSf | bash -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Clone and build Circom
RUN git clone https://github.com/iden3/circom.git && \
  cd circom && \
  cargo build --release && \
  cp target/release/circom /usr/local/bin && \
  cd .. && rm -rf circom
