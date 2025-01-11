FROM golang:latest AS build

WORKDIR /build

# copy .sum and .mod files to download delendencies
COPY go.mod go.sum  ./
RUN go mod download

# copy remaning files
COPY . ./  

RUN CGO_ENABLED=0 GOOS=linux go build  -o ./backend  ./


FROM alpine:3.14

WORKDIR /app

COPY --from=build  ./build/backend .

# RUN ls 

CMD ["./backend"]