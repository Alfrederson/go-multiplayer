package pecas

// uma lista de PONTEIROS
// não tentar usar para colocar "valores primitivos" porque não vai dar certo
// a ideia é ter uma lista de links pré-alocados e utilizá-los como spots
// para as conexões dos jogadores

type Link[T any] struct {
	prev, next *Link[T]
	list       *List[T]
	Value      *T
}

func (l *Link[T]) Set(val *T) *Link[T] {
	l.Value = val
	return l
}

func (l *Link[T]) Next() *Link[T] {
	return l.next
}

type List[T any] struct {
	head, tail *Link[T]
	size       int
}

func (l *List[T]) Size() int {
	return l.size
}

func (l *List[T]) AddLink(link *Link[T]) {
	l.size++
	link.list = l
	// lista vazia?
	if l.head == nil && l.tail == nil {
		l.head = link
		l.tail = link
		link.prev = nil
		link.next = nil
		return
	}
	link.prev = l.tail
	link.next = nil
	l.tail.next = link
	l.tail = link
}

func (l *List[T]) RemoveLink(link *Link[T]) error {
	if link.list != l {
		panic("elo não pertence a esta lista")
	}
	if l.head == link {
		l.head = link.next
	}
	if l.tail == link {
		l.tail = link.prev
	}

	prev := link.prev
	next := link.next
	link.prev = nil
	link.next = nil
	link.list = nil
	if prev != nil {
		prev.next = next
	}
	if next != nil {
		next.prev = prev
	}
	l.size--
	return nil
}

func (l *List[T]) TakeLink() (*Link[T], error) {
	if l.size == 0 {
		panic("tentando tirar elo de lista vazia")
	}
	link := l.tail
	prev := link.prev

	l.tail = prev
	l.tail.next = nil

	link.prev = nil
	link.next = nil
	link.list = nil

	l.size--

	return link, nil
}

func (l *List[T]) First() *Link[T] {
	return l.head
}

func (l *List[T]) ForEach(f func(*T)) {
	for current := l.head; current != nil; current = current.next {
		f(current.Value)
	}
}

// func (l *List[T]) ForEach(fun func(*T, int)) {
// 	var link *Link[T]
// 	var i int = 0
// 	link = l.head
// 	for {
// 		if link == nil {
// 			break
// 		}
// 		fun(link.Value, i)
// 		if link.next == link {
// 			break
// 		}
// 		link = link.next
// 		i++
// 	}
// }

func NewLink[T any](value *T) *Link[T] {
	return &Link[T]{
		prev:  nil,
		next:  nil,
		Value: value,
	}
}

func NewList[T any]() List[T] {
	return List[T]{}
}
