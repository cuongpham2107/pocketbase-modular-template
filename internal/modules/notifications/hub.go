package notifications

import (
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// hub tracks active WebSocket connections per authenticated user ID.
type hub struct {
	mu    sync.RWMutex
	conns map[string]map[* clientConn]struct{}
}

type clientConn struct {
	ws *websocket.Conn
	mu sync.Mutex
}

func (c *clientConn) writeJSON(v any) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	_ = c.ws.SetWriteDeadline(time.Now().Add(5 * time.Second))
	return c.ws.WriteJSON(v)
}

var defaultHub = &hub{
	conns: make(map[string]map[*clientConn]struct{}),
}

func (h *hub) add(userID string, ws *websocket.Conn) *clientConn {
	c := &clientConn{ws: ws}
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.conns[userID] == nil {
		h.conns[userID] = make(map[*clientConn]struct{})
	}
	h.conns[userID][c] = struct{}{}
	return c
}

func (h *hub) remove(userID string, c *clientConn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if set, ok := h.conns[userID]; ok {
		delete(set, c)
		if len(set) == 0 {
			delete(h.conns, userID)
		}
	}
}

// publish sends payload to a specific user, or to all connected users when userID is empty (broadcast).
func (h *hub) publish(userID string, payload any) {
	h.mu.RLock()
	var targets []*clientConn
	if userID == "" {
		for _, set := range h.conns {
			for c := range set {
				targets = append(targets, c)
			}
		}
	} else {
		for c := range h.conns[userID] {
			targets = append(targets, c)
		}
	}
	h.mu.RUnlock()

	for _, c := range targets {
		_ = c.writeJSON(payload)
	}
}

