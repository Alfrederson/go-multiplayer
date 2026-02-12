package pecas

import "errors"

type Array2D[T any] struct {
	width  int
	height int
	array  []T
}

func (a *Array2D[T]) Width() int {
	return a.width
}
func (a *Array2D[T]) Height() int {
	return a.height
}

func (a *Array2D[T]) Set(x int, y int, value T) error {
	if x < 0 || x >= a.width || y < 0 || y >= a.height {
		return errors.New("posicao fora das dimensões")
	}
	a.array[x+y*a.width] = value
	return nil
}

// retorna o 0 do tipo do Array2D se for menor que (0,0) ou maior que (width,height)
func (a *Array2D[T]) Get(x int, y int) T {
	if x < 0 || x >= a.width || y < 0 || y >= a.height {
		var t T
		return t
	}
	return a.array[x+y*a.width]
}

func NewArray2D[T any](width int, height int) *Array2D[T] {
	return &Array2D[T]{
		width:  width,
		height: height,
		array:  make([]T, width*height),
	}
}
