FROM gcc:15

RUN apt-get update && \
    apt-get install -y libhiredis-dev nlohmann-json3-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY src ./src

RUN g++ -std=c++23 src/main.cpp -lhiredis -o engine

CMD ["./engine", "--allocator-test"]
