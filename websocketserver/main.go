package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

var connections = make(map[string]*websocket.Conn)
var message struct {
	Type    string `json:"type"`
	Message struct {
		Sender   string `json:"sender"`
		Receiver string `json:"receiver"`
		Text     string `json:"text"`
	} `json:"message"`
}

func main() {

	hostname, err := os.Hostname()
	if err != nil {
		log.Println("Error getting hostname:", err)
	}
	fmt.Println("Hostname:", hostname)

	opt, err := redis.ParseURL(os.Getenv("REDIS_URL"))
	if err != nil {
		panic(err)
	}
	client := redis.NewClient(opt)
	ctx := context.Background()

	go func() {
		pubsub := client.Subscribe(ctx, "hostname:"+hostname)
		_, err = pubsub.Receive(ctx)
		if err != nil {
			panic(err)
		}
		ch := pubsub.Channel()
		for msg := range ch {
			var receivedMessage struct {
				Type    string `json:"type"`
				Message struct {
					Sender   string `json:"sender"`
					Receiver string `json:"receiver"`
					Text     string `json:"text"`
				} `json:"message"`
			}
			if err := json.Unmarshal([]byte(msg.Payload), &receivedMessage); err != nil {
				log.Println("Error unmarshalling message:", err)
				continue
			}
			if receivedMessage.Type == "message" {
				if receiverConn, ok := connections[receivedMessage.Message.Receiver]; ok {
					if err := receiverConn.WriteMessage(websocket.TextMessage, []byte(msg.Payload)); err != nil {
						log.Println("Error sending message to receiver:", err)
					}
				} else {
					log.Println("Receiver not connected:", receivedMessage.Message.Receiver)
				}
			}
		}
	}()

	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Println(err)
			return
		}
		user_id := r.URL.Query().Get("user")
		connections[user_id] = conn // how to keep track of multiple connections of a same user from multiple devices?

		err = client.Set(ctx, "user:"+user_id, hostname, 0).Err()
		if err != nil {
			log.Println("Error setting user:", err)
			return
		}
		log.Printf("User '%s' connected to '%s' ", user_id, hostname)
		// defer func() {
		// 	conn.Close()
		// 	delete(connections, user_id)
		// 	log.Println("User disconnected:", user_id)
		// }()
		for {
			_, msg, err := conn.ReadMessage()
			if err != nil {
				break
			}

			if err := json.Unmarshal(msg, &message); err != nil {
				log.Println("Error unmarshalling message:", err)
				continue
			}
			if message.Type == "message" {
				// if receiverConn, ok := connections[message.Message.Receiver]; ok {
				// 	if err := receiverConn.WriteMessage(websocket.TextMessage, msg); err != nil {
				// 		log.Println("Error sending message to receiver:", err)
				// 	}
				// 	continue
				// }

				host, err := client.Get(ctx, "user:"+message.Message.Receiver).Result()
				if err != nil {
					log.Println("Error getting user:", err)
					continue
				}
				// Publish message to Redis channel
				fmt.Println("Publishing message to:", "hostname:"+host)
				if err = client.Publish(ctx, "hostname:"+host, msg).Err(); err != nil {
					log.Println("Error publishing message:", err)
				} else {
					log.Println("Message published by user:", user_id)
				}
				// } else {
				// 	log.Println("Receiver not connected:", message.Message.Receiver)
				// }
			}
		}
	})
	http.ListenAndServe(":3000", nil)
}
