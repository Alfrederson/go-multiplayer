package pecas

import "errors"

type Stack[T any] struct {
	data []T
	top  int
	size int
}

func NewStack[T any](size int) Stack[T] {
	return Stack[T]{
		top:  0,
		data: make([]T, size),
		size: size,
	}
}

func (s *Stack[T]) Push(value T) error {
	if s.top >= s.size {
		return errors.New("pilha cheia")
	}
	s.data[s.top] = value
	s.top++
	return nil
}

func (s *Stack[T]) Empty() bool {
	return s.top == 0
}

func (s *Stack[T]) Pop() (T, error) {
	var zero T
	if s.top == 0 {
		return zero, errors.New("pilha vazia")
	}
	s.top--
	return s.data[s.top], nil
}

func (s *Stack[T]) Count() int {
	return s.top
}
