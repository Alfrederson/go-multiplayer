import { writable } from "svelte/store";

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

export const user_store = writable({
  logado : false,
  displayName : "",
  token : ""  
})

const firebaseConfig = {
  apiKey: "AIzaSyCnBKi12oL8HP-vQ4H5nZed1eN7t-cet0E",
  authDomain: "colheita-fofinha.firebaseapp.com",
  projectId: "colheita-fofinha",
  storageBucket: "colheita-fofinha.firebasestorage.app",
  messagingSenderId: "908855580412",
  appId: "1:908855580412:web:f4bc0be06993b79b12a979"
};



let busy = false

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app)
const provider = new GoogleAuthProvider()


console.log("já que isso foi importado, isso vai rodar automaticamente.")
onAuthStateChanged(auth, async user =>{
  if(!user){
    user_store.set({
      logado : false,
      displayName : "",
      token : ""
    })
    return
  }
  user_store.update(u => {
    u.logado = true
    return u
  })
  const token = await user?.getIdToken()
  if(!token){
    return
  }
  user_store.update(u =>{ 
    u.displayName = user.displayName ?? "sem nome"
    u.token = token

    return u
  })
},
error =>{
  user_store.set({
    logado : false,
    displayName : "",
    token : ""
  })  
  console.log(error)
})


/**
 * faz login com o firebase authentication.
 * o cliente conecta quando o estado de autenticação muda e
 * o usuário está autenticado.
 */
export async function logar(){

  await signInWithPopup(auth,provider)
}



export function deslogar(){

}