package server

type TickContext struct {
	*Server
	*Room
	*ScriptingEngine
}

type GameObject interface {
	Tick(r *TickContext)
}

type NPC struct {
	X          int
	Y          int
	Name       string
	Image      string
	ScriptName string
}

func (n *NPC) Tick(r *TickContext) {
	r.ScriptingEngine.RunStoredScript(n.ScriptName, "on_tick")
}

func AddNPCToRoom(n *NPC, r *Room) {
	var obj GameObject = n
	r.Objects.Add(&obj)
}
