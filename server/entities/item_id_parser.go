package entities

import (
	"fmt"
	"reflect"
	"strconv"
	"strings"
	"text/scanner"
)

// Retorna um item concreto a partir de um item id com propriedades ou não
// ex: "maçã" => retorna um Maça{}
// ex: "sanduiche(ingredientes=pao,ovo)" => retorna um Sanduiche{Ingredientes: []{ Pao{}, Ovo{} }}
// ex: "sementes(planta=macieira quantidade=5)" => retorna 5 sementes de macieira
// by CHAT GPT
func (i ItemId) Parse() (any, error) {
	input := string(i)

	// Check if we have parentheses
	open_idx := strings.Index(input, "(")
	close_idx := strings.LastIndex(input, ")")

	var item_name string
	var props_text string

	if open_idx == -1 && close_idx == -1 {
		// no properties, only item name
		item_name = input
		return fabricar_item(item_name)
	}

	// Validate parentheses positions
	if open_idx == -1 || close_idx == -1 || close_idx <= open_idx {
		return "", fmt.Errorf("invalid format: missing or unbalanced parentheses")
	}

	// Extract item name and properties
	item_name = strings.TrimSpace(input[:open_idx])
	props_text = input[open_idx+1 : close_idx]

	output, err := fabricar_item(item_name)
	if err != nil {
		return nil, err
	}

	// Start parsing the properties
	var s scanner.Scanner
	s.Init(strings.NewReader(props_text))
	s.Whitespace ^= 1<<'\n' | 1<<'\t' // Keep newlines and tabs as tokens
	s.Mode = scanner.ScanIdents | scanner.ScanStrings | scanner.ScanInts | scanner.ScanFloats

	v := reflect.ValueOf(output)
	if v.Kind() != reflect.Ptr || v.Elem().Kind() != reflect.Struct {
		return "", fmt.Errorf("output must be a pointer to a struct")
	}
	v = v.Elem()

	for tok := s.Scan(); tok != scanner.EOF; tok = s.Scan() {
		key := s.TokenText()

		// Expect "=" after key
		if s.Scan() != '=' {
			return "", fmt.Errorf("expected '=', got '%s'", s.TokenText())
		}

		// Scan value
		tok = s.Scan()
		valText := s.TokenText()

		field := v.FieldByNameFunc(func(name string) bool {
			return strings.EqualFold(name, key) // case insensitive matching
		})

		if !field.IsValid() || !field.CanSet() {
			// Skip unknown fields
			continue
		}

		switch field.Kind() {
		case reflect.String:
			if tok == scanner.String {
				unquoted, err := strconv.Unquote(valText)
				if err != nil {
					return "", fmt.Errorf("failed to unquote string %q: %w", valText, err)
				}
				field.SetString(unquoted)
			} else {
				field.SetString(valText)
			}
		case reflect.Int, reflect.Int64, reflect.Int32:
			n, err := strconv.ParseInt(valText, 10, 64)
			if err != nil {
				return "", fmt.Errorf("failed to parse int: %w", err)
			}
			field.SetInt(n)
		case reflect.Float32, reflect.Float64:
			n, err := strconv.ParseFloat(valText, 64)
			if err != nil {
				return "", fmt.Errorf("failed to parse float: %w", err)
			}
			field.SetFloat(n)
		case reflect.Bool:
			b, err := strconv.ParseBool(valText)
			if err != nil {
				return "", fmt.Errorf("failed to parse bool: %w", err)
			}
			field.SetBool(b)
		default:
			continue
		}
	}

	return output, nil
}
