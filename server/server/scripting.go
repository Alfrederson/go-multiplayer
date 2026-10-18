package server

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/Alfrederson/backend_game/pecas"
	"github.com/Alfrederson/backend_game/scheduler"
	"github.com/arnodel/golua/lib/base"
	"github.com/arnodel/golua/runtime"
)

type ScriptingEngine struct {
	lua_rt *runtime.Runtime
	// nessas tabelas a gente guarda as variáveis de métodos de cada handlers
	lua_scripts_tables map[string]*runtime.Table
	lua_scheduler      *scheduler.Scheduler

	scripts_table *runtime.Table
	global_table  *runtime.Table
}

func (s *ScriptingEngine) load_engine_libraries(sv *Server) {
	event := runtime.NewTable()
	event.Set(
		runtime.StringValue("sleep"),
		runtime.FunctionValue(
			runtime.NewGoFunction(func(t *runtime.Thread, gc *runtime.GoCont) (runtime.Cont, error) {
				seconds, err := gc.FloatArg(0)
				if err != nil {
					return nil, err
				}
				s.lua_scheduler.SleepCurrentCoroutine(seconds)
				return gc.Next(), nil
			}, "event_sleep", 1, false),
		),
	)

	event.Set(
		runtime.StringValue("broadcast_message"),
		runtime.FunctionValue(
			runtime.NewGoFunction(func(t *runtime.Thread, gc *runtime.GoCont) (runtime.Cont, error) {
				txt, err := gc.StringArg(0)
				if err != nil {
					return nil, err
				}
				sv.BroadcastText(txt)
				return gc.Next(), nil
			}, "event_broadcast_message", 1, false),
		),
	)

	event.Set(
		runtime.StringValue("mapcast_message"),
		runtime.FunctionValue(
			runtime.NewGoFunction(func(t *runtime.Thread, gc *runtime.GoCont) (runtime.Cont, error) {
				fmt.Println("mapcast message")
				mapname, err := gc.StringArg(0)
				if err != nil {
					return nil, err
				}
				txt, err := gc.StringArg(1)
				if err != nil {
					return nil, err
				}
				sv.MapcastText(mapname, txt)
				return gc.Next(), nil
			}, "event_mapcast_message", 2, false),
		),
	)

	s.lua_rt.SetEnv(s.lua_rt.GlobalEnv(), "Event", runtime.TableValue(event))
}

func (s *ScriptingEngine) LoadScriptFile(filename string) error {
	script_source, err := os.ReadFile(filepath.Join("../files/scripts", filename))
	if err != nil {
		return err
	}

	// cria uma tabela nova para receber os handlers...
	handler_table := runtime.NewTable()
	// compila o script
	s.scripts_table.Set(runtime.StringValue(filename), runtime.TableValue(handler_table))

	closure, err := s.lua_rt.CompileAndLoadLuaChunk(filename, script_source, runtime.TableValue(s.global_table))
	if err != nil {
		return err
	}

	// a gente faz isso para tudo o que for definido pela closure
	// ir parar dentro da handler_table
	closure.SetUpvalue(0, runtime.TableValue(handler_table))

	_, err = runtime.Call1(s.lua_rt.MainThread(), runtime.FunctionValue(closure))
	if err != nil {
		return err
	}

	// guarda a tabela com os scripts lá no mapa de scripts
	// então pode ser algo como
	// s.lua_scripts["cachorro"] => { function latir() end, function correr() end }

	s.lua_scripts_tables[filename] = handler_table
	// executa ele

	log.Println("=======================")
	log.Println("   ", filename)
	pecas.PrintTable(handler_table)

	s.RunStoredScript(filename, "on_load")
	return nil
}

func (s *ScriptingEngine) InitScripting(sv *Server) {
	log.Println("ligando engine de scripting...")

	s.lua_rt = runtime.New(os.Stdout, runtime.WithReservedGlobal())

	base.Load(s.lua_rt)

	s.lua_scripts_tables = make(map[string]*runtime.Table)
	s.lua_scheduler = scheduler.NewScheduler(s.lua_rt)
	s.lua_scheduler.Start()

	s.load_engine_libraries(sv)

	s.global_table = s.lua_rt.GlobalEnv()

	s.scripts_table = runtime.NewTable()

	s.global_table.Set(runtime.StringValue("scripts"), runtime.TableValue(s.scripts_table))

	// OBS: isso a gente vai fazer processando as pastas dos mapas
	log.Println("carregando scripts...")
	panic_se_der_erro(processar_diretorio("scripts", func(numero int, arquivo os.DirEntry) error {
		if !strings.HasSuffix(arquivo.Name(), ".lua") {
			return nil
		}
		script_name := arquivo.Name()
		log.Println("carregando ", script_name)
		return s.LoadScriptFile(script_name)
	}))

	log.Println("====== O QUE TEM NO SCRIPTS_TABLE ==== ")
	pecas.PrintTable(s.scripts_table.Get(runtime.StringValue("cidade.porco.lua")).AsTable())

}

func (s *ScriptingEngine) RunStoredScript(script string, member string) {
	handler_table, existe := s.lua_scripts_tables[script]
	if !existe {
		fmt.Printf("[WARN] tentando chamar script inexistente %s :: %s\n", script, member)
		return
	}
	if callable, err := get_table_method(runtime.TableValue(handler_table), member, s.global_table); err != nil {
		log.Printf("ups: %v\n", err)
	} else if callable != nil {
		callable.SetUpvalue(0, runtime.TableValue(s.global_table))
		s.lua_scheduler.StartCoroutine(
			fmt.Sprintf("%s.%s", script, member),
			callable,
			handler_table,
		)
	}
}

// chama o membro de uma tabela em uma corrotina
func get_table_method(val runtime.Value, script_name string, global_table *runtime.Table) (*runtime.Closure, error) {
	table, ok := val.TryTable()
	if !ok {
		return nil, fmt.Errorf("tentando chamar %s em um objeto que não é uma tabela", script_name)
	}
	entry := table.Get(runtime.StringValue(script_name))
	if entry.IsNil() {
		return nil, fmt.Errorf("objeto não tem método %s", script_name)
	}
	callable, ok := entry.TryClosure()
	if !ok {
		return nil, fmt.Errorf("%s não é uma função", script_name)
	}

	callable.SetUpvalue(0, runtime.TableValue(global_table))

	return callable, nil
}

// a gente não faz isso!
// a gente carrega os scripts e executa os chunks
func (s *ScriptingEngine) RunScript(script string) {
	if s.lua_rt == nil {
		log.Println("lua_state == nil")
		return
	}
	log.Println(script)
	source := []byte(script)
	chunk, _ := s.lua_rt.CompileAndLoadLuaChunk("f", source, runtime.TableValue(s.lua_rt.GlobalEnv()))
	v, err := runtime.Call1(s.lua_rt.MainThread(), runtime.FunctionValue(chunk))
	log.Println(v)
	log.Println(err)
}
