
import { useState, useEffect, useCallback, useRef } from 'react';

interface UseWebSocketProps {
  url: string;
  onMessage?: (event: MessageEvent) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

interface UseWebSocketResult {
  sendMessage: (message: string | object) => void;
  lastMessage: MessageEvent | null;
  readyState: number;
  connectionStatus: 'connecting' | 'open' | 'closing' | 'closed';
}

export const useWebSocket = ({
  url,
  onMessage,
  reconnectAttempts = 5,
  reconnectInterval = 5000,
}: UseWebSocketProps): UseWebSocketResult => {
  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);
  const [readyState, setReadyState] = useState<number>(WebSocket.CONNECTING);
  
  const socket = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const getConnectionStatus = (): 'connecting' | 'open' | 'closing' | 'closed' => {
    switch (readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'open';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
        return 'closed';
      default:
        return 'closed';
    }
  };

  const connect = useCallback(() => {
    try {
      if (socket.current && (socket.current.readyState === WebSocket.OPEN || socket.current.readyState === WebSocket.CONNECTING)) {
        return;
      }

      socket.current = new WebSocket(url);

      socket.current.onopen = () => {
        console.log('WebSocket connection established');
        setReadyState(WebSocket.OPEN);
        reconnectCount.current = 0;
      };

      socket.current.onmessage = (event: MessageEvent) => {
        setLastMessage(event);
        if (onMessage) {
          onMessage(event);
        }
      };

      socket.current.onclose = (event) => {
        console.log('WebSocket connection closed', event);
        setReadyState(WebSocket.CLOSED);

        // Attempt to reconnect if not a clean close
        if (!event.wasClean && reconnectCount.current < reconnectAttempts) {
          console.log(`Attempting to reconnect (${reconnectCount.current + 1}/${reconnectAttempts})...`);
          reconnectCount.current += 1;
          
          if (reconnectTimeoutRef.current) {
            window.clearTimeout(reconnectTimeoutRef.current);
          }
          
          reconnectTimeoutRef.current = window.setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      socket.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  }, [url, onMessage, reconnectAttempts, reconnectInterval]);

  const sendMessage = useCallback((message: string | object) => {
    if (!socket.current || socket.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      return;
    }

    const messageToSend = typeof message === 'string' ? message : JSON.stringify(message);
    socket.current.send(messageToSend);
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (socket.current) {
        socket.current.close();
      }
    };
  }, [connect]);

  return {
    sendMessage,
    lastMessage,
    readyState,
    connectionStatus: getConnectionStatus(),
  };
};
