package fb

import (
	"context"
	"errors"
	"log"
	"path/filepath"

	"cloud.google.com/go/firestore"
	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"
)

var firebase_app *firebase.App
var auth_client *auth.Client
var fs_client *firestore.Client

type FirebaseInfo struct {
	Identities     map[string][]string `json:"identities"`
	SignInProvider string              `json:"sign_in_provider"`
}

type FirebaseClaims struct {
	AuthTime      float64      `json:"auth_time"`
	Email         string       `json:"email"`
	EmailVerified bool         `json:"email_verified"`
	Name          string       `json:"name"`
	Picture       string       `json:"picture"`
	UserID        string       `json:"user_id"`
	Firebase      FirebaseInfo `json:"firebase"`
}

func init() {
	log.Println("criando cliente do firebase...")
	ctx := context.Background()
	opt := option.WithCredentialsFile(filepath.Join("../conta-fb.json"))

	var err error
	firebase_app, err = firebase.NewApp(ctx, nil, opt)
	if err != nil {
		log.Fatalf("não consegui inicializar o cliente firebase: %v\n", err)
	}

	auth_client, err = firebase_app.Auth(ctx)
	if err != nil {
		log.Fatalf("não consegui inicializar o cliente firebase auth: %v", err)
	}

	fs_client, err = firebase_app.Firestore(ctx)
	if err != nil {
		log.Fatalf("não consegui inicializar o cliente firestore: %v", err)
	}

}

func ValidarToken(token_string string) (*auth.Token, error) {
	if len(token_string) == 0 {
		return nil, errors.New("não autenticado")
	}
	token, err := auth_client.VerifyIDTokenAndCheckRevoked(context.Background(), token_string)
	if err != nil {
		return nil, err
	}
	return token, nil
}
