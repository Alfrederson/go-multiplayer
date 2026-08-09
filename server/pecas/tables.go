package pecas

import (
	"fmt"

	"github.com/arnodel/golua/runtime"
)

func PrintTable(tb *runtime.Table) {
	next, _, _ := tb.Next(runtime.NilValue)
	for {
		fmt.Printf("   entrada %v\n", next.AsString())

		next, _, _ = tb.Next(next)
		if next.IsNil() {
			break
		}
	}
}
