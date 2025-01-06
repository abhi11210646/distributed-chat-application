package main

import (
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

var connections = make(map[string]*websocket.Conn)

func main() {

	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Println(err)
			return
		}
		user_id := r.URL.Query().Get("user")
		connections[user_id] = conn
		log.Println("User connected: ", user_id)
		conn.WriteJSON("Welcome:" + user_id)
		defer func() {
			conn.Close()
			delete(connections, user_id)
			log.Println("User disconnected:", user_id)
		}()
		for {
			t, msg, err := conn.ReadMessage()
			if err != nil {
				break
			}
			log.Println(t, string(msg))
		}
	})

	http.HandleFunc("/users", func(w http.ResponseWriter, r *http.Request) {

	})

	// go func() {
	// 	ticker := time.NewTicker(5 * time.Second)
	// 	defer ticker.Stop()
	// 	for {
	// 		select {
	// 		case <-ticker.C:
	// 			log.Println("Connections: ", len(connections))
	// 		}
	// 	}
	// }()

	http.ListenAndServe(":8080", nil)
	println("Hello, World!")
}
