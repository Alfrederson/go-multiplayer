package server

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/arnodel/golua/lib/base"
	"github.com/arnodel/golua/runtime"
)

func (s *Server) InitScripting() {
	log.Println("ligando engine de scripting...")

	s.lua_rt = runtime.New(os.Stdout, runtime.WithReservedGlobal())
	s.lua_scripts = make(map[string]*runtime.Table)

	base.Load(s.lua_rt)

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
		// compila o script
		closure, err := s.lua_rt.CompileAndLoadLuaChunk(script_name, script_source, runtime.TableValue(s.lua_rt.GlobalEnv()))
		if err != nil {
			return err
		}
		// chama ele
		val, err := runtime.Call1(s.lua_rt.MainThread(), runtime.FunctionValue(closure))
		if err != nil {
			return err
		}
		// vê se retornou uma tabela
		table, ok := val.TryTable()
		if !ok {
			return fmt.Errorf("script %s não retorna uma tabela", script_name)
		}
		call_handler(s.lua_rt, val, "on_load")
		s.lua_scripts[script_name] = table
		return nil
	}))
}

func call_handler(rt *runtime.Runtime, val runtime.Value, script_name string) error {
	table, ok := val.TryTable()
	if !ok {
		return fmt.Errorf("tentando chamar %s em um objeto que não é uma tabela", script_name)
	}
	entry := table.Get(runtime.StringValue("on_load"))
	if entry.IsNil() {
		return nil
	}
	callable, ok := entry.TryCallable()
	if !ok {
		return fmt.Errorf("%s não é uma função", script_name)
	}
	runtime.Call1(rt.MainThread(), runtime.FunctionValue(callable))
	return nil
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
