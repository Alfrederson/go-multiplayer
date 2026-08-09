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

func (s *Server) load_engine_libraries() {
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
			}, "sleep", 1, false),
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
				s.BroadcastText(txt)
				return gc.Next(), nil
			}, "sleep", 1, false),
		),
	)

	s.lua_rt.SetEnv(s.lua_rt.GlobalEnv(), "Event", runtime.TableValue(event))
}

func (s *Server) InitScripting() {
	log.Println("ligando engine de scripting...")

	s.lua_rt = runtime.New(os.Stdout, runtime.WithReservedGlobal())

	base.Load(s.lua_rt)

	s.lua_scripts_tables = make(map[string]*runtime.Table)
	s.lua_scheduler = scheduler.NewScheduler(s.lua_rt)
	s.lua_scheduler.Start()

	// cria a metatabela para poder modificar as variáveis locais dos scripts

	// this_metatable := runtime.NewTable()

	// this_metatable.Set(runtime.StringValue("__index"), runtime.FunctionValue(
	// 	runtime.NewGoFunction(
	// 		func(t *runtime.Thread, gc *runtime.GoCont) (runtime.Cont, error) {
	// 			log.Println("metatable ativada!")
	// 			key := gc.Arg(1).AsString()

	// 			log.Println("tentando ler ", key)

	// 			return gc, nil
	// 		},
	// 		"__index",
	// 		2,
	// 		false,
	// 	),
	// ))

	// this_metatable.Set(runtime.StringValue("__newindex"), runtime.FunctionValue(
	// 	runtime.NewGoFunction(
	// 		func(t *runtime.Thread, gc *runtime.GoCont) (runtime.Cont, error) {
	// 			log.Println("metatable ativada!")
	// 			key := gc.Arg(1).AsString()

	// 			log.Println("tentando modificar ", key)

	// 			return gc, nil
	// 		},
	// 		"__newindex",
	// 		2,
	// 		false,
	// 	),
	// ))

	s.load_engine_libraries()

	global_table := s.lua_rt.GlobalEnv()

	scripts_table := runtime.NewTable()

	global_table.Set(runtime.StringValue("scripts"), runtime.TableValue(scripts_table))

	// global_table.SetMetatable(this_metatable)

	log.Println("carregando scripts...")
	panic_se_der_erro(processar_diretorio("scripts", func(numero int, arquivo os.DirEntry) error {
		if !strings.HasSuffix(arquivo.Name(), ".lua") {
			return nil
		}
		script_name := arquivo.Name()
		log.Println("carregando ", script_name)
		script_source, err := os.ReadFile(filepath.Join("../files/scripts", arquivo.Name()))
		if err != nil {
			return err
		}

		// cria uma tabela nova para receber os handlers...
		handler_table := runtime.NewTable()
		// compila o script
		scripts_table.Set(runtime.StringValue(script_name), runtime.TableValue(handler_table))

		closure, err := s.lua_rt.CompileAndLoadLuaChunk(script_name, script_source, runtime.TableValue(global_table))
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

		s.lua_scripts_tables[script_name] = handler_table
		// executa ele

		log.Println("=======================")
		log.Println("   ", script_name)
		pecas.PrintTable(handler_table)

		// global_table.SetMetatable(handler_table)

		if callable, err := get_table_method(runtime.TableValue(handler_table), "on_load", global_table); err != nil {
			log.Printf("ups: %v\n", err)
		} else if callable != nil {
			callable.SetUpvalue(0, runtime.TableValue(global_table))
			s.lua_scheduler.StartCoroutine(
				script_name+".on_load",
				callable,
				handler_table,
			)
		}
		return nil
	}))

	log.Println("====== O QUE TEM NO SCRIPTS_TABLE ==== ")
	pecas.PrintTable(scripts_table.Get(runtime.StringValue("cidade.porco.lua")).AsTable())

}

func (s *Server) RunStoredScript(script string, member string) {

}

// chama o membro de uma tabela em uma corrotina
func get_table_method(val runtime.Value, script_name string, global_table *runtime.Table) (*runtime.Closure, error) {
	table, ok := val.TryTable()
	if !ok {
		return nil, fmt.Errorf("tentando chamar %s em um objeto que não é uma tabela", script_name)
	}
	entry := table.Get(runtime.StringValue("on_load"))
	if entry.IsNil() {
		return nil, nil
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
func (s *Server) RunScript(script string) {
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
