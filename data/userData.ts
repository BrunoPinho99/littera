
import { UserProfile } from "../types";

// Adicionando a propriedade obrigatória 'user_type' para satisfazer a interface UserProfile
export const currentUser: UserProfile = {
  id: "202300458",
  firstName: "Estudante",
  lastName: "Modelo",
  email: "aluno@tese.com.br",
  photoUrl: "https://picsum.photos/200/200",
  school: "Colégio Aplicação",
  user_type: 'student'
};