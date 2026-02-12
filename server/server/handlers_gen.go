// arquivo gerado. não editar, senão vai ser apagado de qualquer forma
package server
import "github.com/Alfrederson/backend_game/msg"
func (s* Server) AddMessageHandlers(){
    s.SetMessageHandler(msg.PLAYER_STATUS,OnPlayerStatus)
    s.SetMessageHandler(msg.PLAYER_CHAT,OnPlayerChat)
    s.SetMessageHandler(msg.PLAYER_ENTER_MAP,OnPlayerEnterMap)
}
