package server

import (
	"os"
	"path/filepath"
)

func processar_diretorio(diretorio string, processador func(numero int, arquivo os.DirEntry) error) error {
	f, err := os.OpenFile(filepath.Join("../files", diretorio), 0644, os.ModePerm)
	if err != nil {
		return err
	}
	defer f.Close()
	dir, err := f.ReadDir(0)
	if err != nil {
		return err
	}
	for numero, arquivo := range dir {
		if err := processador(numero, arquivo); err != nil {
			return err
		}
	}
	return nil
}

func panic_se_der_erro(err error) {
	if err != nil {
		panic(err)
	}
}
