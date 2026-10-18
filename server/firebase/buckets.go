package fb

import (
	"context"
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"

	"cloud.google.com/go/storage"
	"google.golang.org/api/iterator"
)

func DownloadFromStorage(bucket_name string, from_dir string, to_dir string) error {
	if err := os.MkdirAll(to_dir, 0755); err != nil {
		return err
	}
	// my storage client is storage_client
	bucket, err := storage_client.Bucket(bucket_name)
	if err != nil {
		return err
	}
	it := bucket.Objects(context.Background(), &storage.Query{
		Prefix: from_dir,
	})
	for {
		obj, err := it.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return err
		}

		rel := strings.TrimPrefix(obj.Name, from_dir)
		if rel == "/" {
			continue
		}
		local_path := filepath.Join(to_dir, filepath.FromSlash(rel))
		log.Println("baixando ", rel, " para ", local_path)
		if err := os.MkdirAll(filepath.Dir(local_path), 0755); err != nil {
			return err
		}
		r, err := bucket.Object(obj.Name).NewReader(context.Background())
		if err != nil {
			return err
		}
		f, err := os.Create(local_path)
		if err != nil {
			r.Close()
			return err
		}
		_, copy_err := io.Copy(f, r)
		f.Close()
		r.Close()
		if copy_err != nil {
			return copy_err
		}
	}
	return nil
}
