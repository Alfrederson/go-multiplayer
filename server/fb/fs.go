package fb

import "context"

func SaveDocument(path string, data interface{}) error {
	_, err := fs_client.Doc(path).Set(context.Background(), data)
	return err
}

func ReadDocument[T any](path string, output *T) error {
	doc, err := fs_client.Doc(path).Get(context.Background())
	if err != nil {
		return err
	}
	err = doc.DataTo(output)
	if err != nil {
		return err
	}
	return nil
}
