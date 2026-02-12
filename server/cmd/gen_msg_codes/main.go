package main

import (
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"log"
	"os"
	"path/filepath"
	"strings"
)

const (
	file_msg     = "./msg/game_messages.go"
	dir_handlers = "./server"
	file_out     = "./server/handlers_gen.go"
	module       = "server"
)

func detectar_constantes(path string) map[string]int {
	fset := token.NewFileSet()
	file, err := parser.ParseFile(fset, path, nil, 0)
	if err != nil {
		panic(err)
	}
	result := map[string]int{}

	for _, decl := range file.Decls {
		gen, ok := decl.(*ast.GenDecl)
		if !ok || gen.Tok != token.CONST {
			continue
		}
		for num, spec := range gen.Specs {
			vspec := spec.(*ast.ValueSpec)
			for _, name := range vspec.Names {
				fmt.Printf("%s %d\n", name.Name, num+1)
				result[name.Name] = num + 1
			}
		}
	}
	return result
}

func to_snake_case(name string) string {
	var out []rune
	for i, r := range name {
		if i > 0 && r >= 'A' && r <= 'Z' {
			out = append(out, '_')
		}
		out = append(out, r)
	}
	return strings.ToUpper(string(out))
}

func detectar_handlers_no_arquivo(path string, constantes map[string]int) ([]string, error) {
	log.Println("detectando handlers em ", path)
	adicoes := []string{}
	fset := token.NewFileSet()
	file, err := parser.ParseFile(fset, path, nil, 0)
	if err != nil {
		return nil, err
	}

	for _, decl := range file.Decls {
		fn, ok := decl.(*ast.FuncDecl)
		if !ok {
			continue
		}
		name := fn.Name.Name
		if !strings.HasPrefix(name, "On") {
			continue
		}
		event_name := to_snake_case(name[2:])
		// checa se existe a mensagem...
		_, existe := constantes[event_name]
		if !existe {
			return nil, fmt.Errorf("não existe mensagem %s para a função %s", event_name, name)
		}
		adicoes = append(adicoes, fmt.Sprintf("s.SetMessageHandler(msg.%s,%s)", event_name, name))
	}

	return adicoes, nil
}

func detectar_handlers(dir string, mensagens map[string]int) []string {
	adicoes := make([]string, 0)

	entries, err := os.ReadDir(dir)
	if err != nil {
		panic(err)
	}
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		name := e.Name()
		if !strings.HasSuffix(name, ".go") {
			continue
		}
		if !strings.HasPrefix(name, "handler_") {
			continue
		}
		path := filepath.Join(dir, name)
		novas_adicoes, err := detectar_handlers_no_arquivo(path, mensagens)
		if err != nil {
			panic(err)
		}
		for _, val := range novas_adicoes {
			adicoes = append(adicoes, val)
		}
	}

	return adicoes
}

func gerar_arquivo_handlers(adicoes []string) {
	f, err := os.Create(file_out)
	if err != nil {
		panic(err)
	}
	defer f.Close()
	fmt.Fprintln(f, "// arquivo gerado. não editar, senão vai ser apagado de qualquer forma")
	fmt.Fprintln(f, "package server")
	fmt.Fprintln(f, "import \"github.com/Alfrederson/backend_game/msg\"")
	fmt.Fprintln(f, "func (s* Server) AddMessageHandlers(){")
	for _, adicao := range adicoes {
		fmt.Fprintf(f, "    %s\n", adicao)
	}
	fmt.Fprintln(f, "}")
}

func main() {
	constantes := detectar_constantes(file_msg)
	log.Println("detectei ", len(constantes), " constantes de mensagens")
	adicoes := detectar_handlers(dir_handlers, constantes)
	log.Println("detectei ", len(adicoes), " handlers de mensagens")
	gerar_arquivo_handlers(adicoes)
	log.Println("terminei!")
}
